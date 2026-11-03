import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.teacher_subject import (
    TeacherProfileWithSubjectsResponse,
    TeacherSubjectBulkCreate,
    TeacherSubjectResponse,
    TeacherSubjectTeacherItem,
    TeacherSubjectUpdate,
)
from app.services import teacher_subject_service

router = APIRouter(prefix="/admin/teacher-subjects", tags=["Admin - Teacher Subjects"])

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)


@router.get("", response_model=list[TeacherSubjectResponse], dependencies=[Depends(admin_only)])
def list_teacher_subjects(
    academic_year_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    section_id: uuid.UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """Admin endpoint to list and filter teacher subject assignments across the institution."""
    return teacher_subject_service.list_subject_assignments_overview(
        academic_year_id=academic_year_id,
        teacher_id=teacher_id,
        subject_id=subject_id,
        grade_id=grade_id,
        section_id=section_id,
        status_filter=status,
        db=db,
    )


@router.post("", response_model=list[TeacherSubjectResponse], status_code=status.HTTP_201_CREATED)
def assign_subjects(
    request: Request,
    payload: TeacherSubjectBulkCreate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin assigns one or more subjects (optionally with Grade & Section) to a teacher."""
    ip = get_client_ip(request)
    return teacher_subject_service.assign_teacher_subjects(
        payload=payload,
        actor_user_id=current_user.id,
        ip=ip,
        db=db,
    )


@router.get("/teachers/{teacher_id}", response_model=list[TeacherSubjectResponse], dependencies=[Depends(admin_only)])
@router.get("/teacher/{teacher_id}", response_model=list[TeacherSubjectResponse], dependencies=[Depends(admin_only)])
def get_teacher_assignments(
    teacher_id: uuid.UUID,
    academic_year_id: uuid.UUID | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """Get all subject assignments for a specific teacher."""
    return teacher_subject_service.get_teacher_subject_assignments(
        teacher_id=teacher_id,
        academic_year_id=academic_year_id,
        status_filter=status,
        db=db,
    )


@router.get(
    "/teachers/{teacher_id}/profile",
    response_model=TeacherProfileWithSubjectsResponse,
    dependencies=[Depends(admin_only)],
)
@router.get(
    "/teacher/{teacher_id}/profile",
    response_model=TeacherProfileWithSubjectsResponse,
    dependencies=[Depends(admin_only)],
)
def get_teacher_profile(
    teacher_id: uuid.UUID,
    academic_year_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    """Comprehensive teacher profile displaying info, assigned grades & sections, and assigned subjects."""
    return teacher_subject_service.get_teacher_profile_with_subjects(
        teacher_id=teacher_id,
        academic_year_id=academic_year_id,
        db=db,
    )


@router.get("/subjects/{subject_id}/teachers", response_model=list[TeacherSubjectTeacherItem], dependencies=[Depends(admin_only)])
@router.get("/subject/{subject_id}/teachers", response_model=list[TeacherSubjectTeacherItem], dependencies=[Depends(admin_only)])
def get_teachers_by_subject(
    subject_id: uuid.UUID,
    academic_year_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    """View all teachers assigned to teach a specific subject."""
    return teacher_subject_service.get_teachers_for_subject(
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        db=db,
    )


@router.put("/{assignment_id}", response_model=TeacherSubjectResponse)
def update_assignment(
    request: Request,
    assignment_id: uuid.UUID,
    payload: TeacherSubjectUpdate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin updates class scope (grade/section) or active status for a subject assignment."""
    ip = get_client_ip(request)
    return teacher_subject_service.update_teacher_subject(
        assignment_id=assignment_id,
        payload=payload,
        actor_user_id=current_user.id,
        ip=ip,
        db=db,
    )


@router.delete("/{assignment_id}")
def remove_or_deactivate_assignment(
    request: Request,
    assignment_id: uuid.UUID,
    hard_delete: bool = Query(False, description="True for permanent removal, False for soft-deactivation"),
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin deactivates or removes a teacher subject assignment."""
    ip = get_client_ip(request)
    return teacher_subject_service.deactivate_or_remove_teacher_subject(
        assignment_id=assignment_id,
        hard_delete=hard_delete,
        actor_user_id=current_user.id,
        ip=ip,
        db=db,
    )

