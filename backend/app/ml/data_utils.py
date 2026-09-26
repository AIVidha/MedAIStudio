"""
ACDC NIfTI data utilities.

Each ACDC patient has:
  patient{N}_frame{ED:02d}.nii        MRI volume at end-diastole
  patient{N}_frame{ED:02d}_gt.nii     segmentation mask at ED  (1=RV, 2=MYO, 3=LV)
  patient{N}_frame{ES:02d}.nii        MRI volume at end-systole
  patient{N}_frame{ES:02d}_gt.nii     segmentation mask at ES
  Info.cfg                             ED/ES frame numbers

Slices are extracted axially; each 2-D slice becomes one training sample.
Intensity normalization: clip [1st, 99th percentile] then rescale to [0,1].
"""
import configparser
import os
from pathlib import Path
from typing import Generator

import nibabel as nib
import numpy as np
import torch
import torch.nn.functional as F

ACDC_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "acdc")
)
TARGET_SIZE = (160, 160)


def _load_cfg(patient_dir: Path) -> dict[str, int]:
    cfg_path = patient_dir / "Info.cfg"
    cp = configparser.RawConfigParser()
    with open(cfg_path) as f:
        cp.read_string("[root]\n" + f.read())
    return {"ed": int(cp["root"]["ed"]), "es": int(cp["root"]["es"])}


def _normalize(arr: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(arr, 1), np.percentile(arr, 99)
    if hi == lo:
        return np.zeros_like(arr, dtype=np.float32)
    arr = np.clip(arr, lo, hi)
    return ((arr - lo) / (hi - lo)).astype(np.float32)


def _resize_tensor(t: torch.Tensor, size: tuple[int, int]) -> torch.Tensor:
    """t: (H, W)  →  (size[0], size[1])"""
    return F.interpolate(
        t.unsqueeze(0).unsqueeze(0).float(),
        size=size,
        mode="bilinear",
        align_corners=False,
    ).squeeze()


def _resize_mask(m: torch.Tensor, size: tuple[int, int]) -> torch.Tensor:
    """m: (H, W) long  →  (size[0], size[1]) long"""
    return F.interpolate(
        m.unsqueeze(0).unsqueeze(0).float(),
        size=size,
        mode="nearest",
    ).squeeze().long()


def iter_slices(
    patient_id: str | None = None,
    frames: str = "both",   # "ed" | "es" | "both"
) -> Generator[tuple[torch.Tensor, torch.Tensor, str], None, None]:
    """
    Yields (image_slice, mask_slice, meta_tag).
    image_slice: (1, H, W) float32 in [0,1]
    mask_slice:  (H, W)    long {0,1,2,3}
    meta_tag:    e.g. "patient101_frame01_z5"
    """
    acdc = Path(ACDC_DIR)
    patients = sorted(acdc.iterdir()) if patient_id is None else [acdc / patient_id]

    for p in patients:
        if not p.is_dir():
            continue
        cfg_file = p / "Info.cfg"
        if not cfg_file.exists():
            continue
        cfg = _load_cfg(p)
        pid = p.name

        frame_nums: list[int] = []
        if frames in ("ed", "both"):
            frame_nums.append(cfg["ed"])
        if frames in ("es", "both"):
            frame_nums.append(cfg["es"])

        for frame in frame_nums:
            img_path = p / f"{pid}_frame{frame:02d}.nii"
            gt_path = p / f"{pid}_frame{frame:02d}_gt.nii"
            if not img_path.exists() or not gt_path.exists():
                continue

            img_data = nib.load(str(img_path)).get_fdata(dtype=np.float32)
            gt_data = nib.load(str(gt_path)).get_fdata().astype(np.int64)

            n_slices = img_data.shape[2]
            for z in range(n_slices):
                sl = _normalize(img_data[:, :, z])
                gt_sl = gt_data[:, :, z]

                # skip near-empty slices (>95% background)
                if (gt_sl > 0).mean() < 0.001:
                    continue

                img_t = _resize_tensor(torch.from_numpy(sl), TARGET_SIZE).unsqueeze(0)
                msk_t = _resize_mask(torch.from_numpy(gt_sl), TARGET_SIZE)

                yield img_t, msk_t, f"{pid}_frame{frame:02d}_z{z}"


def list_patients() -> list[str]:
    return sorted(
        p.name for p in Path(ACDC_DIR).iterdir()
        if p.is_dir() and (p / "Info.cfg").exists()
    )


def load_volume_normalized(
    patient_id: str,
    frame: int,
    size: tuple[int, int] = TARGET_SIZE,
) -> tuple[torch.Tensor, torch.Tensor | None]:
    """
    Returns (image_volume, gt_volume) tensors:
      image: (1, n_slices, H, W)   float32
      gt:    (n_slices, H, W)      long  (None if GT file absent)
    """
    p = Path(ACDC_DIR) / patient_id
    img_path = p / f"{patient_id}_frame{frame:02d}.nii"
    gt_path = p / f"{patient_id}_frame{frame:02d}_gt.nii"

    img_data = nib.load(str(img_path)).get_fdata(dtype=np.float32)
    gt_data = None
    if gt_path.exists():
        gt_data = nib.load(str(gt_path)).get_fdata().astype(np.int64)

    n_slices = img_data.shape[2]
    imgs, gts = [], []
    for z in range(n_slices):
        sl = _normalize(img_data[:, :, z])
        img_t = _resize_tensor(torch.from_numpy(sl), size).unsqueeze(0)
        imgs.append(img_t)
        if gt_data is not None:
            msk_t = _resize_mask(torch.from_numpy(gt_data[:, :, z]), size)
            gts.append(msk_t)

    image_vol = torch.stack(imgs, dim=1)   # (1, Z, H, W)
    gt_vol = torch.stack(gts, dim=0) if gts else None  # (Z, H, W)
    return image_vol, gt_vol
