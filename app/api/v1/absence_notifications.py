import datetime as dt
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.absence_notification import (
    AbsenceNotificationLogItem,
    AbsenceNotificationSummary,
)
from app.services.absence_notification_service import (
    dispatch_absence_notifications_for_session,
    list_absence_notification_logs,
)

router = APIRouter(prefix="/absence-notifications", tags=["Automated Absence Notifications"])


@router.get("", response_model=list[AbsenceNotificationLogItem])
def get_absence_logs(
    target_date: Optional[dt.date] = Query(None, alias="date"),
    student_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN", "TEACHER"])),
):
    """Retrieve history of automated student absence notification dispatches."""
    return list_absence_notification_logs(
        db,
        target_date=target_date,
        student_id=student_id,
        status_filter=status_filter,
        limit=limit,
    )


@router.post("/sessions/{session_id}/dispatch", response_model=AbsenceNotificationSummary)
def trigger_session_absence_alerts(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN", "TEACHER"])),
):
    """Manually evaluate and trigger absence notification dispatches for an attendance session."""
    return dispatch_absence_notifications_for_session(db, session_id=session_id)
