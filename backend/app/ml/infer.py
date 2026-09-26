"""
Real slice-by-slice inference on a NIfTI cardiac MRI volume.
Computes Dice vs ground truth when GT mask is available.
"""
import time
from typing import Optional

import numpy as np
import torch

from app.ml.cardiac_model import get_model
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
    Run the MONAI U-Net on every axial slice of the given frame.
    Returns per-class Dice scores (vs GT) and processing time.
    """
    model, weights_loaded = get_model(device)
    t0 = time.perf_counter()

    image_vol, gt_vol = load_volume_normalized(patient_id, frame)
    # image_vol: (1, Z, H, W), gt_vol: (Z, H, W) or None

    n_slices = image_vol.shape[1]
    pred_slices = []

    model.eval()
    with torch.no_grad():
        for z in range(n_slices):
            inp = image_vol[:, z, :, :].unsqueeze(0).to(device)  # (1,1,H,W)
            logits = model(inp)                                    # (1,4,H,W)
            pred = logits.argmax(dim=1).squeeze(0).cpu().numpy()  # (H,W)
            pred_slices.append(pred)

    pred_vol = np.stack(pred_slices, axis=0)  # (Z, H, W)
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    metrics: dict[str, float] = {}
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

    return {
        "patient_id": patient_id,
        "frame": frame,
        "n_slices_processed": n_slices,
        "processing_time_ms": elapsed_ms,
        "weights_loaded": weights_loaded,
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
