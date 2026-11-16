import datetime as dt
import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)
teacher_only = require_roles(UserRole.TEACHER.value)
from app.schemas.leave import (
    LeaveApplicationResponse,
    LeaveListResponse,
    ParentLeaveApplyRequest,
    StudentLeaveApplyRequest,
    TeacherLeaveDecisionRequest,
    TeacherLeaveRejectRequest,
)
from app.services import leave_service

router = APIRouter(prefix="/leaves", tags=["Student Leave Management"])


# ============================================================================
# 1. Student Portal Endpoints
# ============================================================================

@router.post(
    "/student/apply",
    response_model=LeaveApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.STUDENT.value))],
)
def apply_student_leave(
    payload: StudentLeaveApplyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student Portal: submit a leave application for the authenticated student."""
    ip = request.client.host if request.client else None
    return leave_service.submit_student_leave(payload, current_user, ip, db)


@router.get(
    "/student/my-applications",
    response_model=list[LeaveApplicationResponse],
    dependencies=[Depends(require_roles(UserRole.STUDENT.value))],
)
def get_my_leave_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student Portal: list all leave applications submitted by or for the student."""
    return leave_service.list_student_applications(current_user, db)


# ============================================================================
# 2. Parent Portal Endpoints
# ============================================================================

@router.post(
    "/parent/apply",
    response_model=LeaveApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.PARENT.value))],
)
def apply_parent_leave(
    payload: ParentLeaveApplyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parent Portal: submit a leave application on behalf of a linked child."""
    ip = request.client.host if request.client else None
    return leave_service.submit_parent_leave(payload, current_user, ip, db)


@router.get(
    "/parent/child-applications",
    response_model=list[LeaveApplicationResponse],
    dependencies=[Depends(require_roles(UserRole.PARENT.value))],
)
def get_parent_child_leave_applications(
    student_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parent Portal: view leave applications for linked children."""
    return leave_service.list_parent_child_applications(student_id, current_user, db)


# ============================================================================
# 3. Teacher Portal Endpoints (Class Teacher Approval)
# ============================================================================

@router.get(
    "/teacher/assigned",
    response_model=LeaveListResponse,
    dependencies=[Depends(teacher_only)],
)
def get_teacher_assigned_leaves(
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher Portal: list leave applications assigned to the logged-in Class Teacher."""
    return leave_service.list_teacher_assigned_applications(status_filter, current_user, db)


@router.post(
    "/teacher/{application_id}/approve",
    response_model=LeaveApplicationResponse,
    dependencies=[Depends(teacher_only)],
)
def approve_leave(
    application_id: uuid.UUID,
    payload: TeacherLeaveDecisionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher Portal: approve leave application (strictly restricted to assigned Class Teacher)."""
    ip = request.client.host if request.client else None
    return leave_service.approve_leave_application(application_id, payload, current_user, ip, db)


@router.post(
    "/teacher/{application_id}/reject",
    response_model=LeaveApplicationResponse,
    dependencies=[Depends(teacher_only)],
)
def reject_leave(
    application_id: uuid.UUID,
    payload: TeacherLeaveRejectRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher Portal: reject leave application with remarks (strictly restricted to assigned Class Teacher)."""
    ip = request.client.host if request.client else None
    return leave_service.reject_leave_application(application_id, payload, current_user, ip, db)


# ============================================================================
# 4. Admin Portal Endpoints (Monitoring & Oversight Only)
# ============================================================================

@router.get(
    "/admin/monitoring",
    response_model=LeaveListResponse,
    dependencies=[Depends(admin_only)],
)
def get_all_leaves_for_monitoring(
    academic_year_id: uuid.UUID | None = Query(None),
    grade_id: uuid.UUID | None = Query(None),
    section_id: uuid.UUID | None = Query(None),
    class_teacher_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    start_date: dt.date | None = Query(None),
    end_date: dt.date | None = Query(None),
    query: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Admin Portal: read-only monitoring oversight for all leave applications across the school."""
    return leave_service.list_all_leave_applications(
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        section_id=section_id,
        class_teacher_id=class_teacher_id,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
        query=query,
        db=db,
    )
