import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    *,
    action: str,
    entity_type: str,
    actor_user_id: uuid.UUID | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip: str | None = None,
) -> AuditLog:
    """Record an immutable security and operational event in audit_logs table."""
    audit_entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        metadata_=metadata or {},
        ip=ip,
    )
    db.add(audit_entry)
    db.commit()
    return audit_entry

