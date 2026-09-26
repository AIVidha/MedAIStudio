"""
MONAI 2-D cardiac segmentation U-Net.
4 output classes: 0=background, 1=RV, 2=MYO, 3=LV  (ACDC convention).
"""
import os
import torch
from monai.networks.nets import UNet

MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage", "models")
)
CHECKPOINT_PATH = os.path.join(MODEL_DIR, "cardiac_unet.pt")

_IN_CH = 1
_OUT_CH = 4
_CHANNELS = (32, 64, 128, 256)
_STRIDES = (2, 2, 2)


def build_model() -> UNet:
    return UNet(
        spatial_dims=2,
        in_channels=_IN_CH,
        out_channels=_OUT_CH,
        channels=_CHANNELS,
        strides=_STRIDES,
        num_res_units=2,
        norm="BATCH",
    )


_model: UNet | None = None
_model_loaded = False


def get_model(device: str = "cpu") -> tuple[UNet, bool]:
    """
    Returns (model, weights_available).
    Loads from disk once; returns untrained weights on first call if checkpoint absent.
    """
    global _model, _model_loaded
    if _model is None:
        _model = build_model().to(device)
        if os.path.isfile(CHECKPOINT_PATH):
            state = torch.load(CHECKPOINT_PATH, map_location=device, weights_only=True)
            _model.load_state_dict(state)
            _model_loaded = True
        else:
            _model_loaded = False
        _model.eval()
    return _model, _model_loaded


def reload_model(device: str = "cpu") -> bool:
    """Force-reload checkpoint from disk. Returns True if weights file found."""
    global _model, _model_loaded
    _model = None
    _model_loaded = False
    _, loaded = get_model(device)
    return loaded
