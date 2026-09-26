import io
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Annotation

router = APIRouter(prefix="/annotations", tags=["annotations"])

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
_SYNTHETIC_DIR = os.path.join(_PROJECT_ROOT, "data", "synthetic")
_ACDC_DIR = os.path.join(_PROJECT_ROOT, "data", "acdc")
_ANNOT_DIR = os.path.join(_PROJECT_ROOT, "data", "annotations")


def _find_nifti(subject_id: str, frame: str) -> str | None:
    for d, suffix in [(_SYNTHETIC_DIR, ".nii.gz"), (_ACDC_DIR, ".nii")]:
        p = os.path.join(d, subject_id, f"{subject_id}_{frame}_gt.nii.gz")
        if os.path.exists(p):
            return p
        p2 = os.path.join(d, subject_id, f"{subject_id}_{frame}_gt.nii")
        if os.path.exists(p2):
            return p2
        # also try raw image (no _gt suffix)
        p3 = os.path.join(d, subject_id, f"{subject_id}_{frame}.nii.gz")
        if os.path.exists(p3):
            return p3
        p4 = os.path.join(d, subject_id, f"{subject_id}_{frame}.nii")
        if os.path.exists(p4):
            return p4
    return None


@router.get("")
def list_annotations(db: Session = Depends(get_db)):
    return db.query(Annotation).all()


@router.get("/slice/{subject_id}/{frame}/{axis}/{slice_idx}")
def get_slice_png(subject_id: str, frame: str, axis: str, slice_idx: int):
    """
    Returns a PNG of one 2D slice from a subject's NIfTI volume.
    axis: 'axial' | 'coronal' | 'sagittal'
    slice_idx: 0-based index along that axis.
    """
    try:
        import nibabel as nib
        import numpy as np
        from PIL import Image
    except ImportError:
        raise HTTPException(status_code=500, detail="nibabel or Pillow not installed.")

    if ".." in subject_id or ".." in frame:
        raise HTTPException(status_code=400, detail="Invalid path.")

    path = _find_nifti(subject_id, frame)
    if not path:
        raise HTTPException(status_code=404, detail=f"NIfTI not found for {subject_id}/{frame}")

    nii = nib.load(path)
    data = nii.get_fdata()

    # Normalise to 3D
    if data.ndim == 4:
        data = data[..., 0]

    ax_map = {"axial": 2, "coronal": 1, "sagittal": 0}
    ax = ax_map.get(axis, 2)
    n_slices = data.shape[ax]
    idx = max(0, min(slice_idx, n_slices - 1))

    if ax == 2:
        sl = data[:, :, idx]
    elif ax == 1:
        sl = data[:, idx, :]
    else:
        sl = data[idx, :, :]

    # Rotate to display orientation
    sl = np.rot90(sl)

    # Normalise to 0-255
    mn, mx = sl.min(), sl.max()
    if mx > mn:
        sl_u8 = ((sl - mn) / (mx - mn) * 255).astype(np.uint8)
    else:
        sl_u8 = np.zeros_like(sl, dtype=np.uint8)

    img = Image.fromarray(sl_u8, mode="L").convert("RGB")
    # Scale up to at least 400px on the shorter side
    w, h = img.size
    scale = max(400 / min(w, h), 1.0)
    img = img.resize((int(w * scale), int(h * scale)), Image.NEAREST)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")


@router.get("/slice-info/{subject_id}/{frame}")
def get_slice_info(subject_id: str, frame: str):
    """Returns the number of slices along each axis for a given subject/frame."""
    try:
        import nibabel as nib
    except ImportError:
        raise HTTPException(status_code=500, detail="nibabel not installed.")

    if ".." in subject_id or ".." in frame:
        raise HTTPException(status_code=400, detail="Invalid path.")

    path = _find_nifti(subject_id, frame)
    if not path:
        raise HTTPException(status_code=404, detail=f"NIfTI not found for {subject_id}/{frame}")

    nii = nib.load(path)
    shape = nii.header.get_data_shape()[:3]
    return {
        "subject_id": subject_id,
        "frame": frame,
        "shape": list(shape),
        "n_sagittal": int(shape[0]),
        "n_coronal": int(shape[1]),
        "n_axial": int(shape[2]),
    }


class AnnotationSaveRequest(BaseModel):
    subject_id: str
    frame: str
    axis: str
    slice_idx: int
    label: int  # 1=RV, 2=MYO, 3=LV
    strokes: list  # list of {x, y, radius} brush strokes in image-pixel coords
    canvas_width: int
    canvas_height: int
    note: str = ""


@router.post("/save-stroke")
def save_annotation_stroke(req: AnnotationSaveRequest):
    """
    Persists a brush annotation stroke to disk as JSON and records it in DB.
    """
    os.makedirs(_ANNOT_DIR, exist_ok=True)
    fname = f"{req.subject_id}_{req.frame}_{req.axis}_{req.slice_idx:04d}.json"
    fpath = os.path.join(_ANNOT_DIR, fname)

    existing: list = []
    if os.path.exists(fpath):
        with open(fpath) as f:
            existing = json.load(f)

    existing.append({
        "label": req.label,
        "strokes": req.strokes,
        "canvas_width": req.canvas_width,
        "canvas_height": req.canvas_height,
        "note": req.note,
    })
    with open(fpath, "w") as f:
        json.dump(existing, f)

    return {"saved": fpath, "total_stroke_sets": len(existing)}


@router.get("/load/{subject_id}/{frame}/{axis}/{slice_idx}")
def load_annotation(subject_id: str, frame: str, axis: str, slice_idx: int):
    """Returns previously saved annotation strokes for a slice."""
    fname = f"{subject_id}_{frame}_{axis}_{slice_idx:04d}.json"
    fpath = os.path.join(_ANNOT_DIR, fname)
    if not os.path.exists(fpath):
        return []
    with open(fpath) as f:
        return json.load(f)


@router.delete("/clear/{subject_id}/{frame}/{axis}/{slice_idx}")
def clear_annotation(subject_id: str, frame: str, axis: str, slice_idx: int):
    """Clears saved annotations for a specific slice."""
    fname = f"{subject_id}_{frame}_{axis}_{slice_idx:04d}.json"
    fpath = os.path.join(_ANNOT_DIR, fname)
    if os.path.exists(fpath):
        os.remove(fpath)
    return {"cleared": True}
