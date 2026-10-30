import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.classroom import (
    ClassCreate,
    ClassListResponse,
    ClassResponse,
    SubjectCreate,
    SubjectListResponse,
    SubjectResponse,
    TeacherAssignmentCreate,
    TeacherAssignmentResponse,
)
from app.services import assignment_service

router = APIRouter(prefix="/admin", tags=["Admin - Classes & Assignments"])


@router.post("/classes", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class_endpoint(
    request: Request,
    payload: ClassCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    return assignment_service.create_class(payload, current_user.id, ip, db)


@router.get("/classes", response_model=ClassListResponse)
def list_classes_endpoint(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    department: str | None = Query(None),
    academic_year: str | None = Query(None),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    return assignment_service.list_classes(db, page, size, department, academic_year)


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject_endpoint(
    request: Request,
    payload: SubjectCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    return assignment_service.create_subject(payload, current_user.id, ip, db)


@router.get("/subjects", response_model=SubjectListResponse)
def list_subjects_endpoint(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    return assignment_service.list_subjects(db, page, size)


@router.post("/teacher-assignments", response_model=TeacherAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_teacher_endpoint(
    request: Request,
    payload: TeacherAssignmentCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    return assignment_service.assign_teacher_to_class(payload, current_user.id, ip, db)


@router.delete("/teacher-assignments/{assignment_id}")
def unassign_teacher_endpoint(
    assignment_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    ip = get_client_ip(request)
    return assignment_service.unassign_teacher(assignment_id, current_user.id, ip, db)

