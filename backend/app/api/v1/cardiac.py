from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import CardiacMeasurement

router = APIRouter(prefix="/cardiac", tags=["cardiac"])

@router.get("/measurements")
def get_cardiac_measurements(db: Session = Depends(get_db)):
    return db.query(CardiacMeasurement).all()
