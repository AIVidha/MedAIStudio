from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.models import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: str = "system",
    details: str = "",
    ip_address: str = "127.0.0.1"
):
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc)
    )
    db.add(audit_entry)
    db.commit()
