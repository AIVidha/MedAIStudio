from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Experiment

router = APIRouter(prefix="/experiments", tags=["experiments"])

@router.get("")
def list_experiments(db: Session = Depends(get_db)):
    return db.query(Experiment).all()
