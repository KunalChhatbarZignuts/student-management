import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AdminAttendanceOverviewResponse,
    AdminAttendanceRecordUpdate,
    AttendanceAuditItemResponse,
    AttendanceRecordResponse,
    AttendanceSessionResponse,
    SectionAttendanceCreate,
    SectionRosterStudentItem,
    StudentAttendanceHistoryResponse,
)
from app.services import attendance_service

router = APIRouter(prefix="/admin/attendance", tags=["Admin - Attendance"])

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)


@router.get(
    "/overview",
    response_model=AdminAttendanceOverviewResponse,
    dependencies=[Depends(admin_only)],
)
def get_daily_overview(
    target_date: date = Query(..., alias="date", description="Date to retrieve overview for"),
    academic_year_id: uuid.UUID | None = Query(None, description="Optional academic year filter"),
    grade_id: uuid.UUID | None = Query(None, description="Optional grade filter"),
    search: str | None = Query(None, description="Optional search query for grade or section name"),
    db: Session = Depends(get_db),
):
    """Retrieve institutional daily attendance overview across all grades and sections."""
    return attendance_service.get_admin_attendance_overview(
        target_date=target_date,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        search=search,
        db=db,
    )


@router.get(
    "/sections/{section_id}/roster",
    response_model=list[SectionRosterStudentItem],
    dependencies=[Depends(admin_only)],
)
def get_admin_section_roster(
    section_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Retrieve student roster for a section."""
    return attendance_service.get_section_roster(section_id, db)


@router.get(
    "/sections/{section_id}",
    response_model=AttendanceSessionResponse | None,
    dependencies=[Depends(admin_only)],
)
def get_admin_section_attendance(
    section_id: uuid.UUID,
    target_date: date = Query(..., alias="date"),
    period: int = Query(default=1, ge=1, le=15),
    db: Session = Depends(get_db),
):
    """Retrieve attendance session and records for a section on a given date."""
    return attendance_service.get_section_attendance(section_id, target_date, period, db)


@router.post(
    "/sections/{section_id}",
    response_model=AttendanceSessionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def mark_admin_section_attendance(
    section_id: uuid.UUID,
    payload: SectionAttendanceCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin record/override daily attendance for a section."""
    ip = get_client_ip(request)
    return attendance_service.record_section_attendance(
        section_id=section_id,
        payload=payload,
        actor_user_id=current_user.id,
        teacher=None,
        ip=ip,
        db=db,
    )


@router.get(
    "/sections/{section_id}/history",
    response_model=list[AttendanceSessionResponse],
    dependencies=[Depends(admin_only)],
)
def get_admin_section_history(
    section_id: uuid.UUID,
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve recent attendance sessions history for a section."""
    return attendance_service.get_section_attendance_history(section_id, limit, db)


@router.get(
    "/students/{student_id}",
    response_model=StudentAttendanceHistoryResponse,
    dependencies=[Depends(admin_only)],
)
def get_student_attendance(
    student_id: uuid.UUID,
    academic_year_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    """Retrieve complete attendance history and percentage metrics for a student."""
    return attendance_service.get_student_attendance_history(student_id, academic_year_id, db)


@router.put(
    "/records/{record_id}",
    response_model=AttendanceRecordResponse,
    dependencies=[Depends(admin_only)],
)
def edit_attendance_record(
    record_id: uuid.UUID,
    payload: AdminAttendanceRecordUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit an attendance record with mandatory audit trail reason."""
    ip = get_client_ip(request)
    return attendance_service.edit_attendance_record(
        record_id=record_id,
        payload=payload,
        actor_user_id=current_user.id,
        is_admin=True,
        teacher=None,
        ip=ip,
        db=db,
    )


@router.get(
    "/audit-history",
    response_model=list[AttendanceAuditItemResponse],
    dependencies=[Depends(admin_only)],
)
def get_audit_history(
    section_id: uuid.UUID | None = Query(None),
    target_date: date | None = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    """Retrieve immutable audit logs of attendance record corrections."""
    return attendance_service.get_attendance_audit_history(section_id, target_date, db)

