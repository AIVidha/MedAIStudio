from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Study

router = APIRouter(prefix="/studies", tags=["studies"])

@router.get("")
def list_studies(db: Session = Depends(get_db)):
    return db.query(Study).all()
