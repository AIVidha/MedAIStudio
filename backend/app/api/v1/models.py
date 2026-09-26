from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ModelArchitecture, ModelVersion

router = APIRouter(prefix="/models", tags=["models"])

@router.get("/architectures")
def list_architectures(db: Session = Depends(get_db)):
    archs = db.query(ModelArchitecture).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "display_name": a.display_name,
            "summary": a.summary,
            "num_parameters": a.num_parameters,
            "flops": a.flops,
            "supported_inputs": a.supported_inputs,
        }
        for a in archs
    ]

@router.get("/versions")
def list_model_versions(db: Session = Depends(get_db)):
    versions = db.query(ModelVersion).all()
    return [
        {
            "id": v.id,
            "architecture_id": v.architecture_id,
            "version_tag": v.version_tag,
            "status": v.status,
        }
        for v in versions
    ]
