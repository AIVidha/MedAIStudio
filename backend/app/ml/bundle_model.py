"""
MONAI Model Zoo pre-trained cardiac segmentation bundle.

Bundle: ventricular_short_axis_3label (MIT License)
  - 2D short-axis cardiac MRI segmentation
  - Trained on short-axis MRI (KCL + ACDC-like data)
  - Input: single 2D slice, 256×256 grayscale
  - Bundle output classes: 0=BG, 1=LV pool, 2=LV myocardium, 3=RV pool
  - ACDC convention:       0=BG, 1=RV,       2=MYO,           3=LV

Label remap: bundle→ACDC: 1→3 (LV), 2→2 (MYO), 3→1 (RV)
"""
import os
import logging
import numpy as np
import torch

logger = logging.getLogger(__name__)

BUNDLE_NAME   = "ventricular_short_axis_3label"
BUNDLE_DIR    = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage", "bundles")
)
BUNDLE_PATH   = os.path.join(BUNDLE_DIR, BUNDLE_NAME)
TARGET_SIZE   = 256  # bundle expects 256×256

# Bundle label → ACDC label
_REMAP = {0: 0, 1: 3, 2: 2, 3: 1}
_REMAP_LUT = np.array([_REMAP[i] for i in range(4)], dtype=np.uint8)


def download_bundle() -> bool:
    """Download the MONAI bundle if not already present. Returns True on success."""
    os.makedirs(BUNDLE_DIR, exist_ok=True)
    if os.path.isdir(BUNDLE_PATH):
        logger.info("Bundle already present at %s", BUNDLE_PATH)
        return True
    try:
        from monai.bundle import download as bundle_download
        logger.info("Downloading MONAI bundle '%s' …", BUNDLE_NAME)
        bundle_download(name=BUNDLE_NAME, bundle_dir=BUNDLE_DIR)
        logger.info("Bundle downloaded to %s", BUNDLE_PATH)
        return True
    except Exception as exc:
        logger.error("Bundle download failed: %s", exc)
        return False


_bundle_model: torch.nn.Module | None = None
_bundle_available = False


def get_bundle_model(device: str = "cpu") -> tuple[torch.nn.Module | None, bool]:
    """
    Load the pre-trained bundle model (downloads on first call if absent).
    Returns (model, available).
    """
    global _bundle_model, _bundle_available

    if _bundle_model is not None:
        return _bundle_model, _bundle_available

    if not os.path.isdir(BUNDLE_PATH):
        ok = download_bundle()
        if not ok:
            return None, False

    try:
        from monai.bundle import load as bundle_load
        logger.info("Loading pre-trained bundle model …")
        _bundle_model = bundle_load(
            name=BUNDLE_NAME,
            bundle_dir=BUNDLE_DIR,
            source="local",
        ).to(device)
        _bundle_model.eval()
        _bundle_available = True
        logger.info("Pre-trained bundle model loaded successfully.")
    except Exception as exc:
        logger.error("Bundle model load failed: %s", exc)
        _bundle_available = False

    return _bundle_model, _bundle_available


def remap_labels(pred: np.ndarray) -> np.ndarray:
    """Convert bundle output labels → ACDC convention (in-place safe)."""
    return _REMAP_LUT[pred.astype(np.uint8)]


def preprocess_slice(sl: np.ndarray) -> torch.Tensor:
    """
    Normalise and resize a raw 2D slice to 256×256 for the bundle.
    sl: (H, W) float32 numpy array.
    Returns: (1, 1, 256, 256) float32 tensor.
    """
    import torch.nn.functional as F

    lo, hi = np.percentile(sl, 1), np.percentile(sl, 99)
    if hi > lo:
        sl = np.clip(sl, lo, hi)
        sl = (sl - lo) / (hi - lo)
    else:
        sl = np.zeros_like(sl)

    t = torch.from_numpy(sl.astype(np.float32)).unsqueeze(0).unsqueeze(0)  # (1,1,H,W)
    if t.shape[-2] != TARGET_SIZE or t.shape[-1] != TARGET_SIZE:
        t = F.interpolate(t, size=(TARGET_SIZE, TARGET_SIZE),
                          mode="bilinear", align_corners=False)
    return t
