from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db.models import Dataset

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).all()
