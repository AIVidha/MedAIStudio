import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/viewer", tags=["viewer"])

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


@router.get("/nifti/{subject_id}/{filename}")
def serve_nifti(subject_id: str, filename: str):
    """Serves synthetic NIfTI image and ground truth files for the WebGL viewer."""
    # Validate inputs to prevent directory traversal
    if ".." in subject_id or ".." in filename or "/" in subject_id or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid path component.")
    if not filename.endswith((".nii.gz", ".nii")):
        raise HTTPException(status_code=400, detail="Only .nii.gz files are served.")

    file_path = os.path.join(_PROJECT_ROOT, "data", "synthetic", subject_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"NIfTI file not found: {filename}")

    return FileResponse(
        file_path,
        media_type="application/gzip",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )
