from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ModelArchitecture, ModelVersion

router = APIRouter(prefix="/models", tags=["models"])

@router.get("/architectures")
def list_architectures(db: Session = Depends(get_db)):
    return db.query(ModelArchitecture).all()

@router.get("/versions")
def list_model_versions(db: Session = Depends(get_db)):
    return db.query(ModelVersion).all()
