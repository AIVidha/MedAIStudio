"""
Seed real ACDC (Kaggle) patients into the MedAI Studio database.
Reads from data/acdc/ and registers subjects + dataset metadata.
Run from repo root: python scripts/seed_acdc.py
"""
import sys
import os

_BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
_PROJECT_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
os.chdir(_BACKEND_DIR)
sys.path.insert(0, _BACKEND_DIR)

import nibabel as nib
import numpy as np
from app.db.session import SessionLocal, init_db
from app.db.models import Project, Dataset, DatasetVersion, Subject, Study, Series, BenchmarkResult, ModelVersion

ACDC_DIR = os.path.join(_PROJECT_ROOT, "data", "acdc")


def parse_info_cfg(path: str) -> dict:
    cfg = {}
    for line in open(path):
        if ":" in line:
            k, v = line.split(":", 1)
            cfg[k.strip()] = v.strip()
    return cfg


def seed():
    if not os.path.isdir(ACDC_DIR):
        print(f"ACDC data directory not found: {ACDC_DIR}")
        return

    init_db()
    db = SessionLocal()

    # Find or create project
    project = db.query(Project).filter(Project.name == "Cardiac MRI AI Demo").first()
    if not project:
        project = Project(
            name="Cardiac MRI AI Demo",
            description="Short-axis cine MRI segmentation (LV, RV, myocardium).",
            vertical_id="cardiac_mri",
            anatomy="Heart",
            modality="Short-axis Cine MRI",
            task="Multi-Structure Segmentation",
        )
        db.add(project)
        db.flush()

    # Create ACDC dataset entry
    acdc_dataset = db.query(Dataset).filter(Dataset.name == "ACDC Testing Set (Kaggle)").first()
    if not acdc_dataset:
        acdc_dataset = Dataset(
            project_id=project.id,
            name="ACDC Testing Set (Kaggle)",
            description=(
                "Real cardiac MRI data from the Automated Cardiac Diagnosis Challenge (ACDC), "
                "MICCAI 2017. De-identified data. Source: Bernard O. et al. IEEE TMI 37(11):2514-2525, 2018. "
                "License: Apache 2.0 (Kaggle re-upload). NOT synthetic."
            ),
            is_synthetic=False,
        )
        db.add(acdc_dataset)
        db.flush()
        print(f"Created dataset: {acdc_dataset.name}")
    else:
        print(f"Dataset already exists: {acdc_dataset.name}")

    # Dataset version
    dv = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == acdc_dataset.id).first()
    if not dv:
        dv = DatasetVersion(
            dataset_id=acdc_dataset.id,
            version_tag="v1.0-kaggle",
            changelog="Initial import from Kaggle (samdazel/automated-cardiac-diagnosis-challenge-miccai17).",
            num_subjects=0,
        )
        db.add(dv)
        db.flush()

    # Register each patient
    patients = sorted([
        d for d in os.listdir(ACDC_DIR)
        if os.path.isdir(os.path.join(ACDC_DIR, d)) and d.startswith("patient")
    ])

    n_new = 0
    for patient_id in patients:
        existing = db.query(Subject).filter(Subject.pseudonym_id == patient_id).first()
        if existing:
            continue

        patient_dir = os.path.join(ACDC_DIR, patient_id)
        cfg_path = os.path.join(patient_dir, "Info.cfg")
        if not os.path.exists(cfg_path):
            continue
        cfg = parse_info_cfg(cfg_path)

        ed_idx = int(cfg.get("ED", 1))
        es_idx = int(cfg.get("ES", 1))
        group = cfg.get("Group", "UNK")

        try:
            height = float(cfg.get("Height", 0)) or None
            weight = float(cfg.get("Weight", 0)) or None
        except ValueError:
            height = weight = None

        subj = Subject(
            dataset_id=acdc_dataset.id,
            pseudonym_id=patient_id,
            research_group=group,
            height_cm=height,
            weight_kg=weight,
            meta_info={
                "ed_frame": ed_idx,
                "es_frame": es_idx,
                "nb_frames": int(cfg.get("NbFrame", 0)),
                "source": "acdc_kaggle",
                "citation": "Bernard O. et al. IEEE TMI 37(11):2514-2525, 2018",
            },
        )
        db.add(subj)
        db.flush()

        # Register a Study and Series for the 4D volume
        nii_4d = os.path.join(patient_dir, f"{patient_id}_4d.nii")
        if os.path.exists(nii_4d):
            nii_obj = nib.load(nii_4d)
            shape = list(nii_obj.shape)  # [H, W, slices, frames]
            zooms = list(float(z) for z in nii_obj.header.get_zooms()[:3])

            study = Study(
                subject_id=subj.id,
                study_uid=f"{patient_id}_study",
                description=f"ACDC cine MRI — {group}",
            )
            db.add(study)
            db.flush()

            series = Series(
                study_id=study.id,
                series_uid=f"{patient_id}_4d",
                modality="MR",
                file_path=nii_4d,
                dimensions=shape,
                spacing=zooms,
                frame_info={"ED": ed_idx, "ES": es_idx},
                is_4d=True,
            )
            db.add(series)

        n_new += 1
        print(f"  Registered {patient_id} — group={group} ED={ed_idx} ES={es_idx}")

    total = db.query(Subject).filter(Subject.dataset_id == acdc_dataset.id).count()
    dv.num_subjects = total
    db.commit()
    db.close()
    print(f"\nDone. Registered {n_new} new subjects. Total ACDC subjects: {total}")


if __name__ == "__main__":
    seed()
