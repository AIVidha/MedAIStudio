"""
Real training loop for the MONAI 2-D cardiac U-Net on ACDC data.
Designed to run in a background thread and stream progress via a shared state dict.
"""
import os
import threading
import time
from typing import Callable

import numpy as np
import torch
import torch.nn.functional as F
from monai.losses import DiceCELoss

from app.ml.cardiac_model import (
    CHECKPOINT_PATH,
    MODEL_DIR,
    build_model,
    _model,
    reload_model,
)
from app.ml.data_utils import iter_slices, list_patients
from app.ml.infer import dice_coefficient

# Global training state — read by SSE endpoint
_train_state: dict = {
    "status": "idle",    # idle | running | completed | failed
    "experiment_id": None,
    "epoch": 0,
    "total_epochs": 0,
    "train_loss": None,
    "val_dice_lv": None,
    "val_dice_rv": None,
    "val_dice_myo": None,
    "val_mean_dice": None,
    "best_val_dice": None,
    "best_epoch": None,
    "error": None,
    "log": [],
}
_train_lock = threading.Lock()
_train_thread: threading.Thread | None = None


def get_state() -> dict:
    with _train_lock:
        return dict(_train_state)


def _update_state(**kwargs):
    with _train_lock:
        _train_state.update(kwargs)


def _append_log(msg: str):
    with _train_lock:
        _train_state["log"].append(msg)
        if len(_train_state["log"]) > 200:
            _train_state["log"] = _train_state["log"][-200:]


def _dice_from_logits(logits: torch.Tensor, targets: torch.Tensor) -> dict[str, float]:
    pred = logits.argmax(dim=1).cpu().numpy()
    gt = targets.cpu().numpy()
    dices = {}
    for cls_id, cls_name in [(1, "RV"), (2, "MYO"), (3, "LV")]:
        dices[cls_name] = round(float(np.mean([
            dice_coefficient(pred[b], gt[b], cls_id)
            for b in range(pred.shape[0])
        ])), 4)
    dices["Mean"] = round(sum(dices.values()) / 3, 4)
    return dices


def _collect_dataset(patients: list[str]) -> list[tuple[torch.Tensor, torch.Tensor]]:
    """Pre-load all slices into RAM for fast epoch iteration."""
    data = []
    for img, msk, _ in iter_slices():
        pid = _.split("_")[0]  # meta_tag is "patientXXX_frameYY_zN"
        if pid in patients:
            data.append((img, msk))
    return data


def start_training(
    experiment_id: str,
    epochs: int = 30,
    lr: float = 1e-3,
    batch_size: int = 8,
    val_fraction: float = 0.2,
    on_epoch_end: Callable[[dict], None] | None = None,
    device: str = "cpu",
):
    """Kick off training in a background thread. Returns immediately."""
    global _train_thread

    with _train_lock:
        if _train_state["status"] == "running":
            return False  # already running

    _update_state(
        status="running",
        experiment_id=experiment_id,
        epoch=0,
        total_epochs=epochs,
        train_loss=None,
        val_dice_lv=None,
        val_dice_rv=None,
        val_dice_myo=None,
        val_mean_dice=None,
        best_val_dice=None,
        best_epoch=None,
        error=None,
        log=[],
    )

    _train_thread = threading.Thread(
        target=_train_loop,
        args=(experiment_id, epochs, lr, batch_size, val_fraction, on_epoch_end, device),
        daemon=True,
    )
    _train_thread.start()
    return True


def _train_loop(
    experiment_id: str,
    epochs: int,
    lr: float,
    batch_size: int,
    val_fraction: float,
    on_epoch_end: Callable | None,
    device: str,
):
    try:
        _append_log("Collecting ACDC data...")
        all_patients = list_patients()
        if not all_patients:
            raise RuntimeError("No ACDC patients found in data/acdc/")

        rng = np.random.default_rng(42)
        n_val = max(1, int(len(all_patients) * val_fraction))
        val_ids = set(rng.choice(all_patients, n_val, replace=False).tolist())
        train_ids = [p for p in all_patients if p not in val_ids]

        _append_log(f"Train patients: {len(train_ids)}, Val patients: {len(val_ids)}")

        # Pre-load slices
        train_slices, val_slices = [], []
        for img, msk, meta in iter_slices():
            pid = meta.split("_")[0]
            if pid in train_ids:
                train_slices.append((img, msk))
            elif pid in val_ids:
                val_slices.append((img, msk))

        _append_log(f"Train slices: {len(train_slices)}, Val slices: {len(val_slices)}")

        model = build_model().to(device)
        optimizer = torch.optim.Adam(model.parameters(), lr=lr)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
        criterion = DiceCELoss(
            to_onehot_y=True,
            softmax=True,
            include_background=False,
        )

        os.makedirs(MODEL_DIR, exist_ok=True)
        best_dice = 0.0
        best_epoch = 0

        for epoch in range(1, epochs + 1):
            model.train()
            rng_epoch = np.random.default_rng(epoch)
            order = rng_epoch.permutation(len(train_slices)).tolist()

            epoch_losses = []
            for i in range(0, len(order), batch_size):
                batch_idx = order[i: i + batch_size]
                imgs = torch.stack([train_slices[j][0] for j in batch_idx]).to(device)  # (B,1,H,W)
                msks = torch.stack([train_slices[j][1] for j in batch_idx]).unsqueeze(1).to(device)  # (B,1,H,W)

                optimizer.zero_grad()
                logits = model(imgs)
                loss = criterion(logits, msks.long())
                loss.backward()
                optimizer.step()
                epoch_losses.append(loss.item())

            scheduler.step()
            train_loss = round(float(np.mean(epoch_losses)), 5)

            # Validation
            model.eval()
            val_logits_list, val_mask_list = [], []
            with torch.no_grad():
                for img, msk in val_slices:
                    logits = model(img.unsqueeze(0).to(device))
                    val_logits_list.append(logits.cpu())
                    val_mask_list.append(msk.cpu())

            all_logits = torch.cat(val_logits_list, dim=0)  # (N, 4, H, W)
            all_masks = torch.stack(val_mask_list, dim=0)   # (N, H, W)

            pred_np = all_logits.argmax(dim=1).numpy()
            gt_np = all_masks.numpy()

            rv_dice = round(float(np.mean([dice_coefficient(pred_np[j], gt_np[j], 1) for j in range(len(pred_np))])), 4)
            myo_dice = round(float(np.mean([dice_coefficient(pred_np[j], gt_np[j], 2) for j in range(len(pred_np))])), 4)
            lv_dice = round(float(np.mean([dice_coefficient(pred_np[j], gt_np[j], 3) for j in range(len(pred_np))])), 4)
            mean_dice = round((rv_dice + myo_dice + lv_dice) / 3, 4)

            if mean_dice > best_dice:
                best_dice = mean_dice
                best_epoch = epoch
                torch.save(model.state_dict(), CHECKPOINT_PATH)
                _append_log(f"  ★ New best checkpoint saved (mean Dice={best_dice:.4f})")

            _update_state(
                epoch=epoch,
                train_loss=train_loss,
                val_dice_rv=rv_dice,
                val_dice_myo=myo_dice,
                val_dice_lv=lv_dice,
                val_mean_dice=mean_dice,
                best_val_dice=best_dice,
                best_epoch=best_epoch,
            )

            msg = (f"Epoch {epoch}/{epochs} — loss={train_loss:.5f}  "
                   f"RV={rv_dice:.4f}  MYO={myo_dice:.4f}  LV={lv_dice:.4f}  mean={mean_dice:.4f}")
            _append_log(msg)

            if on_epoch_end:
                on_epoch_end(get_state())

        # Reload the global model singleton so future inference picks up new weights
        reload_model(device)

        _update_state(status="completed")
        _append_log(f"Training complete. Best epoch {best_epoch}, mean Dice {best_dice:.4f}.")

    except Exception as exc:
        import traceback
        _update_state(status="failed", error=str(exc))
        _append_log(f"ERROR: {exc}")
        _append_log(traceback.format_exc())
