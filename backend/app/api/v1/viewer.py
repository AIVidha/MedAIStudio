import os
import configparser
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/viewer", tags=["viewer"])

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
_SYNTHETIC_DIR = os.path.join(_PROJECT_ROOT, "data", "synthetic")
_ACDC_DIR = os.path.join(_PROJECT_ROOT, "data", "acdc")


def _resolve_data_dir(subject_id: str) -> str | None:
    """Return the data directory for a subject_id, checking synthetic then ACDC."""
    syn = os.path.join(_SYNTHETIC_DIR, subject_id)
    if os.path.isdir(syn):
        return syn
    acdc = os.path.join(_ACDC_DIR, subject_id)
    if os.path.isdir(acdc):
        return acdc
    return None


@router.get("/nifti/{subject_id}/{filename}")
def serve_nifti(subject_id: str, filename: str):
    """Serves NIfTI image and ground truth files for the WebGL viewer."""
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
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@router.get("/subjects")
def list_viewer_subjects():
    """Returns all subjects available in the viewer (synthetic + real ACDC)."""
    subjects = []

    # Synthetic subjects
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

    # Real ACDC subjects
    if os.path.isdir(_ACDC_DIR):
        for name in sorted(os.listdir(_ACDC_DIR)):
            subj_dir = os.path.join(_ACDC_DIR, name)
            if not os.path.isdir(subj_dir) or not name.startswith("patient"):
                continue
            cfg_path = os.path.join(subj_dir, "Info.cfg")
            ed_frame = "frame01"
            es_frame = "frame01"
            group = None
            height = None
            weight = None
            if os.path.exists(cfg_path):
                cfg = {}
                for line in open(cfg_path):
                    if ":" in line:
                        k, v = line.split(":", 1)
                        cfg[k.strip()] = v.strip()
                ed_idx = int(cfg.get("ED", 1))
                es_idx = int(cfg.get("ES", 1))
                ed_frame = f"frame{ed_idx:02d}"
                es_frame = f"frame{es_idx:02d}"
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
