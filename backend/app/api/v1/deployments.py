from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Deployment

router = APIRouter(prefix="/deployments", tags=["deployments"])

@router.get("")
def list_deployments(db: Session = Depends(get_db)):
    return db.query(Deployment).all()
