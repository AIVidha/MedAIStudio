"""
Real slice-by-slice inference on a NIfTI cardiac MRI volume.
Computes Dice vs ground truth when GT mask is available.

Model priority:
  1. MONAI pre-trained bundle (ventricular_short_axis_3label) — if downloaded
  2. Custom trained UNet checkpoint (storage/models/cardiac_unet.pt) — if trained
  3. Random-weight UNet — fallback for demo purposes
"""
import os
import time
from typing import Optional

import numpy as np
import torch

from app.ml.cardiac_model import get_model
from app.ml.bundle_model import get_bundle_model, preprocess_slice, remap_labels
from app.ml.data_utils import load_volume_normalized

_CLASSES = {1: "RV", 2: "MYO", 3: "LV"}


def dice_coefficient(pred: np.ndarray, gt: np.ndarray, cls: int) -> float:
    p = (pred == cls).astype(np.float32)
    g = (gt == cls).astype(np.float32)
    inter = (p * g).sum()
    denom = p.sum() + g.sum()
    if denom == 0:
        return 1.0  # both empty → perfect
    return float(2 * inter / denom)


def run_inference(
    patient_id: str,
    frame: int,
    device: str = "cpu",
) -> dict:
    """
    Run inference on every axial slice of the given frame.
    Uses MONAI pre-trained bundle if available, otherwise custom UNet.
    Returns per-class Dice scores (vs GT) and processing time.
    """
    # Try pre-trained bundle first
    bundle_model, bundle_ok = get_bundle_model(device)

    import nibabel as nib
    from app.ml.data_utils import ACDC_DIR
    from pathlib import Path

    t0 = time.perf_counter()
    weights_loaded: bool
    model_source: str

    if bundle_ok and bundle_model is not None:
        # --- Pre-trained MONAI bundle path ---
        model_source = "MONAI pre-trained bundle (ventricular_short_axis_3label)"
        weights_loaded = True

        p = Path(ACDC_DIR) / patient_id
        nii_path = None
        for ext in (".nii", ".nii.gz"):
            candidate = p / f"{patient_id}_frame{frame:02d}{ext}"
            if candidate.exists():
                nii_path = candidate
                break
        if nii_path is None:
            # fallback: synthetic data
            syn_dir = os.path.join(os.path.dirname(ACDC_DIR), "synthetic", patient_id)
            for ext in (".nii", ".nii.gz"):
                candidate = os.path.join(syn_dir, f"{patient_id}_frame{frame:02d}{ext}")
                if os.path.exists(candidate):
                    nii_path = candidate
                    break

        if nii_path is None:
            raise FileNotFoundError(f"NIfTI not found for {patient_id} frame {frame:02d}")

        nii = nib.load(str(nii_path))
        data = nii.get_fdata(dtype=np.float32)  # (X, Y, Z)
        n_slices = data.shape[2]
        pred_slices = []

        bundle_model.eval()
        with torch.no_grad():
            for z in range(n_slices):
                sl = data[:, :, z]                           # (X, Y)
                inp = preprocess_slice(sl).to(device)        # (1,1,256,256)
                logits = bundle_model(inp)                   # (1,4,256,256)
                pred_raw = logits.argmax(dim=1).squeeze(0).cpu().numpy()  # (256,256)
                pred_acdc = remap_labels(pred_raw)           # label remap → ACDC convention
                pred_slices.append(pred_acdc)

        # Load GT for Dice
        gt_vol_np = None
        for ext in (".nii", ".nii.gz"):
            gt_path = p / f"{patient_id}_frame{frame:02d}_gt{ext}"
            if gt_path.exists():
                gt_data = nib.load(str(gt_path)).get_fdata().astype(np.int32)
                gt_vol_np = gt_data  # (X, Y, Z)
                break

        pred_vol = np.stack(pred_slices, axis=0)  # (Z, 256, 256)

        metrics: dict[str, float] = {}
        if gt_vol_np is not None:
            import torch.nn.functional as F
            # Resize GT slices to 256×256 to match predictions
            gt_resized = []
            for z in range(n_slices):
                gt_sl = torch.from_numpy(gt_vol_np[:, :, z].astype(np.float32)).unsqueeze(0).unsqueeze(0)
                gt_r = F.interpolate(gt_sl, size=(256, 256), mode="nearest").squeeze().numpy().astype(np.int32)
                gt_resized.append(gt_r)
            gt_np = np.stack(gt_resized, axis=0)
            for cls_id, cls_name in _CLASSES.items():
                metrics[f"{cls_name}_Dice"] = round(dice_coefficient(pred_vol, gt_np, cls_id), 4)
            dices = list(metrics.values())
            metrics["Mean_Dice"] = round(sum(dices) / len(dices), 4)
        else:
            for cls_name in _CLASSES.values():
                metrics[f"{cls_name}_Dice"] = None
            metrics["Mean_Dice"] = None

    else:
        # --- Custom UNet fallback ---
        model_source = "Custom UNet (random weights — not trained)"
        model, weights_loaded = get_model(device)
        if weights_loaded:
            model_source = "Custom UNet (trained checkpoint)"

        image_vol, gt_vol = load_volume_normalized(patient_id, frame)
        n_slices = image_vol.shape[1]
        pred_slices = []

        model.eval()
        with torch.no_grad():
            for z in range(n_slices):
                inp = image_vol[:, z, :, :].unsqueeze(0).to(device)
                logits = model(inp)
                pred = logits.argmax(dim=1).squeeze(0).cpu().numpy()
                pred_slices.append(pred)

        pred_vol = np.stack(pred_slices, axis=0)

        metrics = {}
        if gt_vol is not None:
            gt_np = gt_vol.numpy()
            for cls_id, cls_name in _CLASSES.items():
                metrics[f"{cls_name}_Dice"] = round(dice_coefficient(pred_vol, gt_np, cls_id), 4)
            dices = list(metrics.values())
            metrics["Mean_Dice"] = round(sum(dices) / len(dices), 4)
        else:
            for cls_name in _CLASSES.values():
                metrics[f"{cls_name}_Dice"] = None
            metrics["Mean_Dice"] = None

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "patient_id": patient_id,
        "frame": frame,
        "n_slices_processed": n_slices,
        "processing_time_ms": elapsed_ms,
        "weights_loaded": weights_loaded,
        "model_source": model_source,
        "segmentation_metrics": metrics,
        "pred_vol_shape": list(pred_vol.shape),
    }


def segment_single_slice(
    patient_id: str,
    frame: int,
    axis: str,
    slice_idx: int,
    device: str = "cpu",
) -> np.ndarray:
    """
    Run model on one 2-D slice; return (H, W) int label map {0,1,2,3}.
    Used by the AI Segment annotation endpoint.
    """
    from app.ml.data_utils import ACDC_DIR, TARGET_SIZE, _normalize, _resize_tensor, _resize_mask
    from pathlib import Path
    import nibabel as nib
    import torch.nn.functional as F

    p = Path(ACDC_DIR) / patient_id
    img_path = p / f"{patient_id}_frame{frame:02d}.nii"
    img_data = nib.load(str(img_path)).get_fdata(dtype=np.float32)

    ax_map = {"axial": 2, "coronal": 1, "sagittal": 0}
    ax = ax_map.get(axis, 2)

    if ax == 2:
        sl = img_data[:, :, slice_idx]
    elif ax == 1:
        sl = img_data[:, slice_idx, :]
    else:
        sl = img_data[slice_idx, :, :]

    sl = _normalize(sl)
    img_t = _resize_tensor(torch.from_numpy(sl), TARGET_SIZE).unsqueeze(0).unsqueeze(0)  # (1,1,H,W)

    model, _ = get_model(device)
    model.eval()
    with torch.no_grad():
        logits = model(img_t.to(device))
    pred = logits.argmax(dim=1).squeeze(0).cpu().numpy()  # (H, W)
    return pred
