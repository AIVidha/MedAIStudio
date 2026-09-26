import os
import random
import time
import numpy as np
import nibabel as nib
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.db.models import InferenceRun, ModelVersion, ModelArchitecture, BenchmarkResult, Subject

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

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
            "subject_id": r.dataset_version_id,  # repurposed field for subject
            "status": r.status,
            "processing_time_ms": r.processing_time_ms,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@router.post("/run")
def run_inference(
    model_version_id: str = Body(...),
    subject_id: str = Body(...),
    db: Session = Depends(get_db),
):
    """
    Simulated inference: applies benchmark Dice ± small gaussian noise per-structure.
    No real model weights are loaded in this research demo.
    """
    mv = db.query(ModelVersion).filter(ModelVersion.id == model_version_id).first()
    if not mv:
        raise HTTPException(status_code=404, detail="Model version not found.")

    arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first()
    if not arch:
        raise HTTPException(status_code=404, detail="Architecture not found.")

    # Check synthetic data exists
    syn_dir = os.path.join(_PROJECT_ROOT, "data", "synthetic", subject_id)
    if not os.path.exists(syn_dir):
        raise HTTPException(status_code=404, detail=f"Synthetic data for {subject_id} not found.")

    # Look up precomputed benchmark for this model as reference point
    bench = db.query(BenchmarkResult).filter(
        BenchmarkResult.model_version_id == model_version_id
    ).first()

    # Simulate per-slice inference latency
    t_start = time.perf_counter()
    time.sleep(0.05)  # simulate ~50ms
    elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)

    # Simulate per-structure Dice with gaussian noise around benchmark value
    rng = random.Random(hash(f"{model_version_id}{subject_id}"))
    def jitter(base: float, std: float = 0.015) -> float:
        return round(min(0.999, max(0.0, base + rng.gauss(0, std))), 3)

    if bench:
        lv = jitter(bench.lv_dice)
        rv = jitter(bench.rv_dice)
        myo = jitter(bench.myo_dice)
        mean_dice = round((lv + rv + myo) / 3, 3)
    else:
        lv = jitter(0.920)
        rv = jitter(0.880)
        myo = jitter(0.840)
        mean_dice = round((lv + rv + myo) / 3, 3)

    # Store run record
    run = InferenceRun(
        model_version_id=model_version_id,
        dataset_version_id=subject_id,  # repurposed field
        status="completed",
        processing_time_ms=elapsed_ms,
    )
    db.add(run)
    db.commit()

    return {
        "run_id": run.id,
        "subject_id": subject_id,
        "architecture": arch.display_name,
        "model_version": mv.version_tag,
        "status": "completed",
        "processing_time_ms": elapsed_ms,
        "segmentation_metrics": {
            "LV_Dice": lv,
            "RV_Dice": rv,
            "MYO_Dice": myo,
            "Mean_Dice": mean_dice,
        },
        "disclaimer": "Research / AI-derived quantitative measurements — not clinical diagnosis.",
        "note": "Simulated inference using precomputed benchmark Dice ± gaussian noise. No model weights loaded in this research demo.",
    }
