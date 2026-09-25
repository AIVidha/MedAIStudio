from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import InferenceRun

router = APIRouter(prefix="/inference", tags=["inference"])

@router.get("/runs")
def list_inference_runs(db: Session = Depends(get_db)):
    return db.query(InferenceRun).all()
