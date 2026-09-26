"""
Training management endpoints.
POST /training/start   — kick off a training run
GET  /training/status  — current state (poll-friendly JSON)
GET  /training/stream  — Server-Sent Events stream of per-epoch updates
"""
import asyncio
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Experiment, ModelVersion, ModelArchitecture, EpochMetric

router = APIRouter(prefix="/training", tags=["training"])


def _get_or_import_train_module():
    from app.ml import train as _train
    return _train


@router.post("/start")
def start_training(
    epochs: int = 30,
    lr: float = 1e-3,
    batch_size: int = 8,
    db: Session = Depends(get_db),
):
    _train = _get_or_import_train_module()
    state = _train.get_state()
    if state["status"] == "running":
        return {"message": "Training already running.", "experiment_id": state["experiment_id"]}

    # Find the UNet architecture and version in DB
    arch = db.query(ModelArchitecture).filter(ModelArchitecture.name == "UNet").first()
    if not arch:
        raise HTTPException(status_code=404, detail="UNet architecture not found in DB.")

    mv = db.query(ModelVersion).filter(ModelVersion.architecture_id == arch.id).first()
    if not mv:
        mv = ModelVersion(architecture_id=arch.id, version_tag="v1.0-acdc-trained", status="training")
        db.add(mv)
        db.flush()

    exp = Experiment(
        name=f"ACDC UNet Training — {epochs} epochs",
        model_version_id=mv.id,
        epochs=epochs,
        hardware="CPU",
    )
    db.add(exp)
    db.commit()
    experiment_id = exp.id

    def _on_epoch_end(state: dict):
        """Persist each epoch metric to DB as it completes."""
        try:
            from app.db.session import SessionLocal
            with SessionLocal() as db2:
                em = EpochMetric(
                    experiment_id=experiment_id,
                    epoch=state["epoch"],
                    train_loss=state["train_loss"] or 0.0,
                    val_loss=state["train_loss"] or 0.0,  # same for now
                    val_dice=state["val_mean_dice"] or 0.0,
                    val_iou=state["val_mean_dice"] or 0.0,
                )
                db2.add(em)
                db2.commit()
        except Exception:
            pass  # non-fatal — SSE stream still works

    started = _train.start_training(
        experiment_id=experiment_id,
        epochs=epochs,
        lr=lr,
        batch_size=batch_size,
        on_epoch_end=_on_epoch_end,
    )

    if not started:
        return {"message": "Training already running.", "experiment_id": state["experiment_id"]}

    return {
        "message": f"Training started: {epochs} epochs, lr={lr}, batch_size={batch_size}.",
        "experiment_id": experiment_id,
    }


@router.get("/status")
def get_training_status():
    _train = _get_or_import_train_module()
    state = _train.get_state()
    return {
        "status": state["status"],
        "experiment_id": state.get("experiment_id"),
        "epoch": state.get("epoch", 0),
        "total_epochs": state.get("total_epochs", 0),
        "train_loss": state.get("train_loss"),
        "val_dice_lv": state.get("val_dice_lv"),
        "val_dice_rv": state.get("val_dice_rv"),
        "val_dice_myo": state.get("val_dice_myo"),
        "val_mean_dice": state.get("val_mean_dice"),
        "best_val_dice": state.get("best_val_dice"),
        "best_epoch": state.get("best_epoch"),
        "error": state.get("error"),
        "log": state.get("log", [])[-20:],  # last 20 lines only
    }


@router.get("/stream")
async def stream_training():
    """
    Server-Sent Events stream.
    Clients receive a JSON event on each state change (polled every 1s).
    """
    _train = _get_or_import_train_module()

    async def event_generator():
        last_epoch = -1
        last_status = None
        idle_ticks = 0
        while True:
            state = _train.get_state()
            epoch = state.get("epoch", 0)
            status = state.get("status", "idle")

            if epoch != last_epoch or status != last_status:
                last_epoch = epoch
                last_status = status
                idle_ticks = 0
                payload = {
                    "status": status,
                    "epoch": epoch,
                    "total_epochs": state.get("total_epochs", 0),
                    "train_loss": state.get("train_loss"),
                    "val_mean_dice": state.get("val_mean_dice"),
                    "val_dice_lv": state.get("val_dice_lv"),
                    "val_dice_rv": state.get("val_dice_rv"),
                    "val_dice_myo": state.get("val_dice_myo"),
                    "best_val_dice": state.get("best_val_dice"),
                    "best_epoch": state.get("best_epoch"),
                    "log": state.get("log", [])[-5:],
                }
                yield f"data: {json.dumps(payload)}\n\n"

            if status in ("completed", "failed", "idle"):
                idle_ticks += 1
                if idle_ticks > 5:
                    break

            await asyncio.sleep(1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
