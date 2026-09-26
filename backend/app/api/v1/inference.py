import os
import time
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import InferenceRun, ModelVersion, ModelArchitecture

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
_ACDC_DIR = os.path.join(_PROJECT_ROOT, "data", "acdc")

router = APIRouter(prefix="/inference", tags=["inference"])


@router.get("/runs")
def list_inference_runs(db: Session = Depends(get_db)):
    runs = db.query(InferenceRun).all()
    result = []
    for r in runs:
        mv = db.query(ModelVersion).filter(ModelVersion.id == r.model_version_id).first()
        arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first() if mv else None
        result.append({
            "id": r.id,
            "model_version_id": r.model_version_id,
            "architecture": arch.display_name if arch else "Unknown",
            "subject_id": r.dataset_version_id,
            "status": r.status,
            "processing_time_ms": r.processing_time_ms,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


def _find_acdc_frame(patient_id: str) -> int | None:
    """Return the ED frame number from Info.cfg, or None."""
    import configparser
    cfg_path = os.path.join(_ACDC_DIR, patient_id, "Info.cfg")
    if not os.path.isfile(cfg_path):
        return None
    cp = configparser.RawConfigParser()
    with open(cfg_path) as f:
        cp.read_string("[root]\n" + f.read())
    try:
        return int(cp["root"]["ed"])
    except Exception:
        return None


@router.post("/run")
def run_inference(
    model_version_id: str = Body(...),
    subject_id: str = Body(...),
    db: Session = Depends(get_db),
):
    """
    Runs real MONAI U-Net inference on the subject's ED frame.
    Computes actual Dice vs GT NIfTI mask when available.
    Falls back to random-weight predictions (and notes this) if no checkpoint exists.
    """
    mv = db.query(ModelVersion).filter(ModelVersion.id == model_version_id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Model version not found.")

    arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first()
    if not arch:
        raise HTTPException(status_code=404, detail="Architecture not found.")

    # Resolve patient data — prefer ACDC, fall back to synthetic
    acdc_patient_dir = os.path.join(_ACDC_DIR, subject_id)
    if os.path.isdir(acdc_patient_dir):
        data_source = "acdc"
        patient_id = subject_id
        frame = _find_acdc_frame(patient_id) or 1
    else:
        syn_dir = os.path.join(_PROJECT_ROOT, "data", "synthetic", subject_id)
        if not os.path.isdir(syn_dir):
            raise HTTPException(status_code=404, detail=f"No data found for subject '{subject_id}'.")
        data_source = "synthetic"
        patient_id = subject_id
        frame = 1

    try:
        from app.ml.infer import run_inference as _run
        result = _run(patient_id=patient_id, frame=frame)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}")

    elapsed_ms = result["processing_time_ms"]
    metrics = result["segmentation_metrics"]
    weights_loaded = result["weights_loaded"]

    lv = metrics.get("LV_Dice") or 0.0
    rv = metrics.get("RV_Dice") or 0.0
    myo = metrics.get("MYO_Dice") or 0.0
    mean_dice = metrics.get("Mean_Dice") or 0.0

    run = InferenceRun(
        model_version_id=model_version_id,
        dataset_version_id=subject_id,
        status="completed",
        processing_time_ms=elapsed_ms,
    )
    db.add(run)
    db.commit()

    if weights_loaded:
        note = (
            "Real MONAI U-Net inference — Dice computed vs ground-truth NIfTI mask. "
            "Research / AI-derived quantitative measurements — not clinical diagnosis."
        )
    else:
        note = (
            "Random-weight U-Net (no trained checkpoint found). "
            "Run Training to generate storage/models/cardiac_unet.pt. "
            "Research / AI-derived quantitative measurements — not clinical diagnosis."
        )

    return {
        "run_id": run.id,
        "subject_id": subject_id,
        "architecture": arch.display_name,
        "model_version": mv.version_tag,
        "status": "completed",
        "processing_time_ms": elapsed_ms,
        "data_source": data_source,
        "weights_loaded": weights_loaded,
        "n_slices_processed": result["n_slices_processed"],
        "segmentation_metrics": {
            "LV_Dice": lv,
            "RV_Dice": rv,
            "MYO_Dice": myo,
            "Mean_Dice": mean_dice,
        },
        "disclaimer": "Research / AI-derived quantitative measurements — not clinical diagnosis.",
        "note": note,
    }
