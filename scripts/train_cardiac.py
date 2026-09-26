#!/usr/bin/env python3
"""
Standalone MONAI U-Net training script.
Run once from the repo root to create storage/models/cardiac_unet.pt.

Usage:
    python scripts/train_cardiac.py [--epochs 30] [--lr 0.001] [--batch 8]
"""
import sys
import argparse
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs",  type=int,   default=30)
    parser.add_argument("--lr",      type=float, default=1e-3)
    parser.add_argument("--batch",   type=int,   default=8)
    args = parser.parse_args()

    print(f"Training MONAI 2-D U-Net on ACDC data: {args.epochs} epochs, lr={args.lr}, batch={args.batch}")

    from app.ml.train import start_training, get_state
    import time

    def on_epoch(state):
        ep = state["epoch"]
        tot = state["total_epochs"]
        loss = state["train_loss"]
        dice = state["val_mean_dice"]
        best = state["best_val_dice"]
        print(f"  Epoch {ep:3d}/{tot}  loss={loss:.5f}  val_mean_dice={dice:.4f}  best={best:.4f}")

    start_training(
        experiment_id="cli-run",
        epochs=args.epochs,
        lr=args.lr,
        batch_size=args.batch,
        on_epoch_end=on_epoch,
    )

    # Wait for completion
    while True:
        state = get_state()
        if state["status"] in ("completed", "failed"):
            break
        time.sleep(2)

    state = get_state()
    if state["status"] == "completed":
        print(f"\nTraining complete. Best epoch {state['best_epoch']}, mean Dice {state['best_val_dice']:.4f}")
        from app.ml.cardiac_model import CHECKPOINT_PATH
        print(f"Checkpoint saved to: {CHECKPOINT_PATH}")
    else:
        print(f"\nTraining FAILED: {state['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main()
