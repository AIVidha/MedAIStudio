from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("")
def list_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).all()
