from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Experiment, EpochMetric, ModelVersion, ModelArchitecture

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("")
def list_experiments(db: Session = Depends(get_db)):
    exps = db.query(Experiment).all()
    result = []
    for e in exps:
        mv = db.query(ModelVersion).filter(ModelVersion.id == e.model_version_id).first()
        arch = db.query(ModelArchitecture).filter(ModelArchitecture.id == mv.architecture_id).first() if mv else None
        result.append({
            "id": e.id,
            "name": e.name,
            "architecture": arch.display_name if arch else "Unknown",
            "architecture_name": arch.name if arch else "unknown",
            "model_version": mv.version_tag if mv else "—",
            "status": "completed" if e.best_val_dice else "queued",
            "epochs_total": e.epochs,
            "best_epoch": e.best_epoch,
            "best_val_dice": e.best_val_dice,
            "best_val_iou": e.best_val_iou,
            "hardware": e.hardware,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })
    return result


@router.get("/{experiment_id}/epochs")
def get_epoch_metrics(experiment_id: str, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    metrics = db.query(EpochMetric).filter(
        EpochMetric.experiment_id == experiment_id
    ).order_by(EpochMetric.epoch).all()
    return [
        {
            "epoch": m.epoch,
            "train_loss": round(m.train_loss, 4),
            "val_loss": round(m.val_loss, 4),
            "val_dice": round(m.val_dice, 4),
            "val_iou": round(m.val_iou, 4),
        }
        for m in metrics
    ]
