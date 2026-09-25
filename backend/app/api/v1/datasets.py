import os
import json
import nibabel as nib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.session import get_db
from app.db.models import Dataset, DatasetVersion, Subject, Study, Series, Split, Project

router = APIRouter(prefix="/datasets", tags=["datasets"])

# Data lives at the project root (one level above backend/)
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).all()
    results = []
    for ds in datasets:
        version = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == ds.id).first()
        results.append({
            "id": ds.id,
            "name": ds.name,
            "description": ds.description,
            "is_synthetic": ds.is_synthetic,
            "project_id": ds.project_id,
            "num_subjects": version.num_subjects if version else 0,
            "num_studies": version.num_studies if version else 0,
            "version_tag": version.version_tag if version else "v1.0"
        })
    return results

@router.post("/scan-local")
def scan_local_datasets():
    """
    Scans local storage paths for raw ACDC and synthetic dataset directories.
    """
    found = []
    
    # Check synthetic dataset path (project root / data/synthetic)
    synthetic_path = os.path.join(_PROJECT_ROOT, "data", "synthetic")
    if os.path.exists(synthetic_path):
        meta_path = os.path.join(synthetic_path, "metadata.json")
        pat_dirs = [d for d in os.listdir(synthetic_path) if os.path.isdir(os.path.join(synthetic_path, d))]
        found.append({
            "type": "synthetic",
            "name": "Synthetic Cardiac MRI Fallback",
            "path": synthetic_path,
            "num_patients": len(pat_dirs),
            "disclaimer": "SYNTHETIC — not real anatomy",
            "status": "ready_for_import"
        })
        
    # Check ACDC raw dataset path (project root / data/raw/acdc)
    acdc_path = os.path.join(_PROJECT_ROOT, "data", "raw", "acdc")
    if os.path.exists(acdc_path):
        train_path = os.path.join(acdc_path, "training")
        test_path = os.path.join(acdc_path, "testing")
        train_pats = [d for d in os.listdir(train_path) if os.path.isdir(os.path.join(train_path, d))] if os.path.exists(train_path) else []
        test_pats = [d for d in os.listdir(test_path) if os.path.isdir(os.path.join(test_path, d))] if os.path.exists(test_path) else []
        found.append({
            "type": "acdc",
            "name": "ACDC Challenge Dataset (CC BY-NC-SA 4.0)",
            "path": acdc_path,
            "num_patients": len(train_pats) + len(test_pats),
            "train_patients": len(train_pats),
            "test_patients": len(test_pats),
            "status": "ready_for_import"
        })
        
    return {"available_datasets": found}

@router.post("/import/{dataset_type}")
def import_dataset(dataset_type: str, db: Session = Depends(get_db)):
    """
    Imports scanned dataset (acdc or synthetic) into database entities.
    Enforces strict patient-level split separation.
    """
    project = db.query(Project).first()
    if not project:
        raise HTTPException(status_code=400, detail="No active project found to associate dataset.")
        
    if dataset_type == "synthetic":
        syn_path = os.path.join(_PROJECT_ROOT, "data", "synthetic")
        if not os.path.exists(syn_path):
            raise HTTPException(status_code=404, detail="Synthetic dataset directory not found. Run make_synthetic.py first.")
            
        existing = db.query(Dataset).filter(Dataset.name == "Synthetic Cardiac MRI Fallback").first()
        if existing:
            return {"message": "Synthetic dataset already imported.", "dataset_id": existing.id}
            
        ds = Dataset(
            project_id=project.id,
            name="Synthetic Cardiac MRI Fallback",
            description="Synthetic short-axis cine MRI dataset (SYNTHETIC — not real anatomy).",
            is_synthetic=True
        )
        db.add(ds)
        db.flush()
        
        pat_dirs = sorted([d for d in os.listdir(syn_path) if os.path.isdir(os.path.join(syn_path, d))])
        
        # Zero data leakage patient split
        num_pats = len(pat_dirs)
        train_count = int(num_pats * 0.6)
        val_count = int(num_pats * 0.2)
        
        train_pats = pat_dirs[:train_count]
        val_pats = pat_dirs[train_count:train_count+val_count]
        test_pats = pat_dirs[train_count+val_count:]
        
        for pat_id in pat_dirs:
            pat_dir = os.path.join(syn_path, pat_id)
            subj = Subject(
                dataset_id=ds.id,
                pseudonym_id=pat_id,
                research_group="NOR",
                height_cm=175.0,
                weight_kg=70.0,
                meta_info={"is_synthetic": True}
            )
            db.add(subj)
            db.flush()
            
            study = Study(
                subject_id=subj.id,
                study_uid=f"STUDY_{pat_id}",
                description="Synthetic Cardiac MRI Short-Axis Study"
            )
            db.add(study)
            db.flush()
            
            # Register Series for ED frame
            ed_file = os.path.join(pat_dir, f"{pat_id}_frame01.nii.gz")
            if os.path.exists(ed_file):
                series_ed = Series(
                    study_id=study.id,
                    series_uid=f"SERIES_{pat_id}_ED",
                    modality="MR",
                    file_path=ed_file,
                    dimensions=[160, 160, 8],
                    spacing=[1.25, 1.25, 10.0],
                    frame_info={"frame_name": "ED", "frame_index": 1}
                )
                db.add(series_ed)
                
        version = DatasetVersion(
            dataset_id=ds.id,
            version_tag="v1.0-synthetic",
            changelog="Initial synthetic fallback import.",
            num_subjects=num_pats,
            num_studies=num_pats,
            num_series=num_pats
        )
        db.add(version)
        db.flush()
        
        # Add splits with zero data leakage
        db.add(Split(dataset_version_id=version.id, split_type="train", patient_ids=train_pats))
        db.add(Split(dataset_version_id=version.id, split_type="val", patient_ids=val_pats))
        db.add(Split(dataset_version_id=version.id, split_type="test", patient_ids=test_pats))
        
        db.commit()
        return {"message": "Synthetic dataset imported successfully.", "dataset_id": ds.id, "num_subjects": num_pats}
        
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported dataset type: {dataset_type}")

