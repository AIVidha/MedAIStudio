import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import BenchmarkResult, ModelVersion, ModelArchitecture, CardiacMeasurement, Subject

router = APIRouter(prefix="/reports", tags=["reports"])

ACDC_CITATION = (
    "Bernard O. et al. (2018). Deep Learning Techniques for Automatic MRI Cardiac Multi-structures "
    "Segmentation and Diagnosis. IEEE TMI 37(11):2514-2525. DOI:10.1109/TMI.2018.2837502"
)


def _get_benchmark_rows(db: Session):
    rows = []
    for r in db.query(BenchmarkResult).all():
        mv = db.query(ModelVersion).filter(ModelVersion.id == r.model_version_id).first()
        arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first() if mv else None
        rows.append({
            "architecture": arch.display_name if arch else "Unknown",
            "version": mv.version_tag if mv else "—",
            "mean_dice": r.mean_dice,
            "lv_dice": r.lv_dice,
            "rv_dice": r.rv_dice,
            "myo_dice": r.myo_dice,
            "mean_iou": r.mean_iou,
            "num_parameters_M": round(r.num_parameters / 1e6, 2),
            "flops_GFLOPs": r.flops,
            "model_size_mb": r.model_size_mb,
            "latency_median_ms": r.latency_median_ms,
            "latency_p95_ms": r.latency_p95_ms,
            "hardware": r.hardware,
            "is_precomputed": r.is_precomputed,
            "split": r.split_name,
        })
    return rows


@router.get("/benchmark-summary")
def benchmark_summary_json(db: Session = Depends(get_db)):
    rows = _get_benchmark_rows(db)
    return {
        "disclaimer": "Research / AI-derived quantitative measurements — not clinical diagnosis.",
        "acdc_citation": ACDC_CITATION,
        "note": "Precomputed research benchmarks on synthetic cardiac MRI data.",
        "results": rows,
    }


@router.get("/benchmark-summary.csv")
def benchmark_summary_csv(db: Session = Depends(get_db)):
    rows = _get_benchmark_rows(db)
    if not rows:
        return JSONResponse({"detail": "No benchmark results available."}, status_code=404)

    output = io.StringIO()
    output.write(f"# MedAI Studio — Benchmark Report\n")
    output.write(f"# Disclaimer: Research / AI-derived quantitative measurements — not clinical diagnosis.\n")
    output.write(f"# ACDC Citation: {ACDC_CITATION}\n")

    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=medai_benchmark_report.csv"},
    )


@router.get("/cardiac-summary")
def cardiac_summary_json(db: Session = Depends(get_db)):
    measurements = db.query(CardiacMeasurement).all()
    rows = []
    for m in measurements:
        subj = db.query(Subject).filter(Subject.id == m.subject_id).first()
        rows.append({
            "subject": subj.pseudonym_id if subj else m.subject_id,
            "research_group": subj.research_group if subj else "—",
            "source": m.source,
            "lv_edv_ml": m.lv_edv_ml,
            "lv_esv_ml": m.lv_esv_ml,
            "lv_sv_ml": m.lv_sv_ml,
            "lv_ef_percent": m.lv_ef_percent,
            "rv_edv_ml": m.rv_edv_ml,
            "rv_esv_ml": m.rv_esv_ml,
            "rv_sv_ml": m.rv_sv_ml,
            "rv_ef_percent": m.rv_ef_percent,
            "myo_mass_g": m.myo_mass_g,
        })
    return {
        "disclaimer": "Research / AI-derived quantitative measurements — not clinical diagnosis.",
        "note": "SYNTHETIC data only — not real anatomy.",
        "measurements": rows,
    }


@router.get("/cardiac-summary.csv")
def cardiac_summary_csv(db: Session = Depends(get_db)):
    resp = cardiac_summary_json(db=db)
    rows = resp["measurements"]
    if not rows:
        return JSONResponse({"detail": "No cardiac measurements available."}, status_code=404)

    output = io.StringIO()
    output.write("# MedAI Studio — Cardiac Quantification Report\n")
    output.write("# Disclaimer: Research / AI-derived quantitative measurements — not clinical diagnosis.\n")
    output.write("# Data: SYNTHETIC — not real anatomy.\n")

    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=medai_cardiac_report.csv"},
    )
