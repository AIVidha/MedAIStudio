"""
Seed synthetic completed experiments + epoch metrics for Experiment Tracking demo.
Run from repo root: python scripts/seed_experiments.py
"""
import sys
import os
import math
import random

_BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
os.chdir(_BACKEND_DIR)
sys.path.insert(0, _BACKEND_DIR)

from app.db.session import SessionLocal, init_db
from app.db.models import (
    ModelArchitecture, ModelVersion, Dataset, DatasetVersion,
    Experiment, EpochMetric
)

def synthetic_curves(epochs: int, final_val_dice: float, arch_name: str):
    """Generate realistic-looking training curves for demo."""
    rng = random.Random(hash(arch_name))
    curves = []
    for ep in range(1, epochs + 1):
        frac = ep / epochs
        # Loss: exponential decay from ~0.65 to ~0.08 with noise
        train_loss = 0.65 * math.exp(-3.5 * frac) + 0.08 + rng.gauss(0, 0.012)
        val_loss = 0.70 * math.exp(-3.2 * frac) + 0.09 + rng.gauss(0, 0.015)
        # Dice: sigmoid-like rise to final_val_dice with noise
        val_dice = final_val_dice * (1 / (1 + math.exp(-8 * (frac - 0.35)))) + rng.gauss(0, 0.008)
        val_iou = val_dice * 0.87 + rng.gauss(0, 0.005)
        curves.append({
            "epoch": ep,
            "train_loss": max(0.05, round(train_loss, 4)),
            "val_loss": max(0.06, round(val_loss, 4)),
            "val_dice": max(0.0, min(0.999, round(val_dice, 4))),
            "val_iou": max(0.0, min(0.999, round(val_iou, 4))),
        })
    return curves


def seed():
    init_db()
    db = SessionLocal()

    # Fetch architectures
    archs = {a.name: a for a in db.query(ModelArchitecture).all()}
    if not archs:
        print("No architectures found — run seed_demo.py first.")
        db.close()
        return

    # Ensure ModelVersions exist
    def get_or_create_version(arch_name: str, tag: str):
        arch = archs.get(arch_name)
        if not arch:
            return None
        mv = db.query(ModelVersion).filter(
            ModelVersion.architecture_id == arch.id,
            ModelVersion.version_tag == tag
        ).first()
        if not mv:
            mv = ModelVersion(
                architecture_id=arch.id,
                version_tag=tag,
                status="validated",
            )
            db.add(mv)
            db.flush()
        return mv

    # Ensure a DatasetVersion exists
    dataset = db.query(Dataset).first()
    if not dataset:
        print("No datasets found — run seed_demo.py and seed_benchmarks first.")
        db.close()
        return
    dv = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset.id).first()
    if not dv:
        dv = DatasetVersion(dataset_id=dataset.id, version_tag="v1.0", num_subjects=5)
        db.add(dv)
        db.flush()

    # Experiments to seed
    exp_specs = [
        ("UNet Baseline — 100ep", "UNet", "v1.0-baseline", 100, 0.924),
        ("UNet++ Dense Skip — 80ep", "BasicUNetPlusPlus", "v1.0-dense", 80, 0.941),
        ("Efficient-UNet Compact — 60ep", "EfficientUNet", "v1.0-compact", 60, 0.897),
    ]

    for exp_name, arch_name, vtag, total_epochs, final_dice in exp_specs:
        mv = get_or_create_version(arch_name, vtag)
        if not mv:
            continue

        existing = db.query(Experiment).filter(Experiment.name == exp_name).first()
        if existing:
            print(f"  Experiment already exists: {exp_name}")
            continue

        curves = synthetic_curves(total_epochs, final_dice, arch_name)
        best_epoch = max(curves, key=lambda c: c["val_dice"])

        exp = Experiment(
            name=exp_name,
            model_version_id=mv.id,
            dataset_version_id=dv.id,
            training_profile="full",
            epochs=total_epochs,
            best_epoch=best_epoch["epoch"],
            best_val_dice=best_epoch["val_dice"],
            best_val_iou=best_epoch["val_iou"],
            hardware="CPU (research demo)",
            config={
                "loss": "DiceCELoss",
                "optimizer": "AdamW",
                "lr": 1e-4,
                "batch_size": 8,
                "augmentation": "flip+rotation+jitter",
            },
        )
        db.add(exp)
        db.flush()

        for c in curves:
            db.add(EpochMetric(
                experiment_id=exp.id,
                epoch=c["epoch"],
                train_loss=c["train_loss"],
                val_loss=c["val_loss"],
                val_dice=c["val_dice"],
                val_iou=c["val_iou"],
            ))

        print(f"  Seeded: {exp_name}  best_dice={best_epoch['val_dice']:.3f} @ epoch {best_epoch['epoch']}")

    db.commit()
    db.close()
    print("Experiment seeding complete.")


if __name__ == "__main__":
    seed()
