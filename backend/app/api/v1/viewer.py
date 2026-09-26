import io
import os
import configparser
import numpy as np
import nibabel as nib
from PIL import Image
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response

router = APIRouter(prefix="/viewer", tags=["viewer"])

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
_SYNTHETIC_DIR = os.path.join(_PROJECT_ROOT, "data", "synthetic")
_ACDC_DIR = os.path.join(_PROJECT_ROOT, "data", "acdc")


def _resolve_data_dir(subject_id: str) -> str | None:
    syn = os.path.join(_SYNTHETIC_DIR, subject_id)
    if os.path.isdir(syn):
        return syn
    acdc = os.path.join(_ACDC_DIR, subject_id)
    if os.path.isdir(acdc):
        return acdc
    return None


def _find_nifti(subject_id: str, frame: str, gt: bool = False) -> str | None:
    """Find the NIfTI file for a subject/frame, trying both ACDC and synthetic paths."""
    data_dir = _resolve_data_dir(subject_id)
    if not data_dir:
        return None
    suffix = "_gt" if gt else ""
    for ext in (".nii", ".nii.gz"):
        p = os.path.join(data_dir, f"{subject_id}_{frame}{suffix}{ext}")
        if os.path.exists(p):
            return p
    return None


def _extract_slice(data: np.ndarray, axis: str, idx: int) -> np.ndarray:
    ax_map = {"axial": 2, "coronal": 1, "sagittal": 0}
    ax = ax_map.get(axis, 2)
    if ax == 2:
        sl = data[:, :, idx]
    elif ax == 1:
        sl = data[:, idx, :]
    else:
        sl = data[idx, :, :]
    return np.rot90(sl)


def _normalize_u8(sl: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(sl, 1), np.percentile(sl, 99)
    if hi == lo:
        return np.zeros_like(sl, dtype=np.uint8)
    sl = np.clip(sl, lo, hi)
    return ((sl - lo) / (hi - lo) * 255).astype(np.uint8)


# ACDC label colours: 0=bg (transparent), 1=RV (cyan), 2=MYO (yellow), 3=LV (red)
_GT_COLORS = {
    1: (34,  211, 238, 180),   # RV  — cyan
    2: (250, 204,  21, 180),   # MYO — yellow
    3: (239,  68,  68, 180),   # LV  — red
}


@router.get("/nifti/{subject_id}/{filename}")
def serve_nifti(subject_id: str, filename: str):
    if ".." in subject_id or ".." in filename or "/" in subject_id or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid path component.")
    if not filename.endswith((".nii.gz", ".nii")):
        raise HTTPException(status_code=400, detail="Only .nii / .nii.gz files are served.")
    data_dir = _resolve_data_dir(subject_id)
    if not data_dir:
        raise HTTPException(status_code=404, detail=f"Subject data not found: {subject_id}")
    file_path = os.path.join(data_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"NIfTI file not found: {filename}")
    media_type = "application/gzip" if filename.endswith(".nii.gz") else "application/octet-stream"
    return FileResponse(file_path, media_type=media_type,
                        headers={"Content-Disposition": f"inline; filename={filename}"})


def _physical_resize(img: Image.Image, axis: str, vox: np.ndarray) -> Image.Image:
    """Stretch coronal/sagittal slices to physical mm dimensions so they look correct."""
    if axis == "axial":
        return img
    W, H = img.size  # PIL: (width, height)
    # After rot90: rows=Z, cols=X (coronal) or cols=Y (sagittal)
    # vox[0]=x_mm, vox[1]=y_mm, vox[2]=z_mm (slice thickness, usually 8-10mm)
    in_plane_mm = vox[0] if axis == "coronal" else vox[1]
    slice_mm    = vox[2]
    new_H = max(1, round(H * slice_mm / in_plane_mm))
    resample = Image.LANCZOS if hasattr(Image, "LANCZOS") else Image.ANTIALIAS
    return img.resize((W, new_H), resample)


@router.get("/slice/{subject_id}/{frame}/{axis}/{slice_idx}")
def get_slice_png(subject_id: str, frame: str, axis: str, slice_idx: int):
    """Serve one 2-D slice as a grayscale PNG, stretched to physical mm aspect ratio."""
    if ".." in subject_id or ".." in frame:
        raise HTTPException(status_code=400, detail="Invalid path.")
    path = _find_nifti(subject_id, frame, gt=False)
    if not path:
        raise HTTPException(status_code=404, detail=f"NIfTI not found: {subject_id}/{frame}")
    nii  = nib.load(path)
    data = nii.get_fdata(dtype=np.float32)
    vox  = np.array(nii.header.get_zooms()[:3], dtype=float)
    n    = data.shape[{"axial": 2, "coronal": 1, "sagittal": 0}.get(axis, 2)]
    idx  = max(0, min(n - 1, slice_idx))
    sl   = _extract_slice(data, axis, idx)
    img  = _physical_resize(Image.fromarray(_normalize_u8(sl), mode="L"), axis, vox).convert("RGB")
    buf  = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png",
                    headers={"Cache-Control": "max-age=60"})


@router.get("/gt-slice/{subject_id}/{frame}/{axis}/{slice_idx}")
def get_gt_slice_png(subject_id: str, frame: str, axis: str, slice_idx: int):
    """
    Serve ground-truth segmentation mask for one slice as a colorized RGBA PNG.
    Classes: 0=bg (transparent), 1=RV cyan, 2=MYO yellow, 3=LV red.
    Returns a 1×1 transparent PNG if no GT file exists.
    """
    if ".." in subject_id or ".." in frame:
        raise HTTPException(status_code=400, detail="Invalid path.")

    nii_path = _find_nifti(subject_id, frame, gt=False)
    vox = np.array([1.0, 1.0, 1.0])
    if nii_path:
        vox = np.array(nib.load(nii_path).header.get_zooms()[:3], dtype=float)

    path = _find_nifti(subject_id, frame, gt=True)
    if not path:
        buf = io.BytesIO()
        Image.new("RGBA", (1, 1), (0, 0, 0, 0)).save(buf, format="PNG")
        return Response(content=buf.getvalue(), media_type="image/png")

    data = nib.load(path).get_fdata().astype(np.int32)
    n    = data.shape[{"axial": 2, "coronal": 1, "sagittal": 0}.get(axis, 2)]
    idx  = max(0, min(n - 1, slice_idx))
    sl   = _extract_slice(data, axis, idx).astype(np.int32)

    H, W = sl.shape
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    for cls_id, color in _GT_COLORS.items():
        rgba[sl == cls_id] = color

    img = _physical_resize(Image.fromarray(rgba, mode="RGBA"), axis, vox)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png",
                    headers={"Cache-Control": "max-age=60"})


@router.get("/slice-info/{subject_id}/{frame}")
def get_slice_info(subject_id: str, frame: str):
    if ".." in subject_id or ".." in frame:
        raise HTTPException(status_code=400, detail="Invalid path.")
    path = _find_nifti(subject_id, frame, gt=False)
    if not path:
        raise HTTPException(status_code=404, detail=f"NIfTI not found: {subject_id}/{frame}")
    shape = nib.load(path).header.get_data_shape()[:3]
    return {
        "subject_id": subject_id,
        "frame": frame,
        "shape": list(shape),
        "n_sagittal": int(shape[0]),
        "n_coronal":  int(shape[1]),
        "n_axial":    int(shape[2]),
    }


@router.get("/subjects")
def list_viewer_subjects():
    subjects = []

    if os.path.isdir(_SYNTHETIC_DIR):
        for name in sorted(os.listdir(_SYNTHETIC_DIR)):
            if os.path.isdir(os.path.join(_SYNTHETIC_DIR, name)) and name.startswith("patient"):
                subjects.append({
                    "subject_id": name,
                    "source": "synthetic",
                    "label": "SYNTHETIC — not real anatomy",
                    "ed_frame": "frame01",
                    "es_frame": "frame08",
                    "group": None,
                    "height_cm": None,
                    "weight_kg": None,
                })

    if os.path.isdir(_ACDC_DIR):
        for name in sorted(os.listdir(_ACDC_DIR)):
            subj_dir = os.path.join(_ACDC_DIR, name)
            if not os.path.isdir(subj_dir) or not name.startswith("patient"):
                continue
            cfg_path = os.path.join(subj_dir, "Info.cfg")
            ed_frame, es_frame, group, height, weight = "frame01", "frame01", None, None, None
            if os.path.exists(cfg_path):
                cfg: dict[str, str] = {}
                for line in open(cfg_path):
                    if ":" in line:
                        k, v = line.split(":", 1)
                        cfg[k.strip()] = v.strip()
                ed_frame = f"frame{int(cfg.get('ED', 1)):02d}"
                es_frame = f"frame{int(cfg.get('ES', 1)):02d}"
                group = cfg.get("Group")
                try:
                    height = float(cfg.get("Height", 0)) or None
                    weight = float(cfg.get("Weight", 0)) or None
                except ValueError:
                    pass
            subjects.append({
                "subject_id": name,
                "source": "acdc",
                "label": "ACDC (Bernard et al. 2018) — de-identified research data",
                "ed_frame": ed_frame,
                "es_frame": es_frame,
                "group": group,
                "height_cm": height,
                "weight_kg": weight,
            })

    return subjects
