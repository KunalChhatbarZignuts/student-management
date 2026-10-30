import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_current_teacher, get_current_user, get_db
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceBulkCreate,
    AttendanceSessionResponse,
    AttendanceSessionUpdate,
    ClassAttendanceSummaryResponse,
)
from app.services import attendance_service

router = APIRouter(prefix="/teacher/attendance", tags=["Teacher - Attendance"])


@router.post("", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
def mark_class_attendance(
    payload: AttendanceBulkCreate,
    request: Request,
    teacher: Teacher = Depends(get_current_teacher),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk mark attendance for an entire class in one atomic request."""
    ip = get_client_ip(request)
    return attendance_service.create_bulk_attendance(
        payload=payload,
        teacher=teacher,
        actor_user_id=current_user.id,
        ip=ip,
        db=db,
    )


@router.get("", response_model=list[AttendanceSessionResponse])
def get_class_attendance(
    class_id: uuid.UUID = Query(..., description="ID of assigned class"),
    target_date: date | None = Query(None, alias="date", description="Filter by date"),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Retrieve attendance sessions and marked records for an assigned class."""
    return attendance_service.get_teacher_attendance(
        class_id=class_id,
        target_date=target_date,
        teacher=teacher,
        db=db,
    )


@router.patch("/{session_id}", response_model=AttendanceSessionResponse)
def update_attendance_session(
    session_id: uuid.UUID,
    payload: AttendanceSessionUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit attendance session records within the allowed 24h window (or anytime for ADMIN)."""
    ip = get_client_ip(request)
    is_admin = current_user.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)

    # If teacher, fetch teacher profile
    teacher = None
    if current_user.role == UserRole.TEACHER.value:
        from app.models.teacher import Teacher as TeacherModel
        from sqlalchemy import select
        teacher = db.execute(
            select(TeacherModel).where(TeacherModel.user_id == current_user.id)
        ).scalar_one_or_none()

    return attendance_service.update_attendance_session(
        session_id=session_id,
        payload=payload,
        actor_user_id=current_user.id,
        is_admin=is_admin,
        teacher=teacher,
        ip=ip,
        db=db,
    )


@router.get("/summary", response_model=ClassAttendanceSummaryResponse)
def get_class_attendance_summary(
    class_id: uuid.UUID = Query(..., description="ID of assigned class"),
    from_date: date = Query(..., alias="from", description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., alias="to", description="End date (YYYY-MM-DD)"),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Calculate per-student attendance summary and percentage over a date range."""
    return attendance_service.get_class_attendance_summary(
        class_id=class_id,
        from_date=from_date,
        to_date=to_date,
        teacher=teacher,
        db=db,
    )

