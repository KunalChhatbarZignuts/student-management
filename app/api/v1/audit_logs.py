from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.admin import AuditLogListResponse, AuditLogRead

router = APIRouter(prefix="/admin/audit-logs", tags=["Admin - Audit Logs"])


@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: str | None = Query(None, description="Filter by event action"),
    actor_email: str | None = Query(None, description="Search by actor user email"),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Retrieve immutable security and admin action audit logs."""
    query = select(AuditLog).outerjoin(User, AuditLog.actor_user_id == User.id)

    if action:
        query = query.where(AuditLog.action == action)
    if actor_email:
        query = query.where(User.email.ilike(f"%{actor_email.strip()}%"))

    total_query = select(func.count()).select_from(query.subquery())
    total = db.execute(total_query).scalar_one()

    logs = (
        db.execute(query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit))
        .scalars()
        .all()
    )

    items = [
        AuditLogRead(
            id=log.id,
            actor_email=log.actor.email if log.actor else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            ip=log.ip,
            metadata=log.metadata_,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return AuditLogListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )
