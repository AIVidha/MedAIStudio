from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Annotation

router = APIRouter(prefix="/annotations", tags=["annotations"])

@router.get("")
def list_annotations(db: Session = Depends(get_db)):
    return db.query(Annotation).all()
