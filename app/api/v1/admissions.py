import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.admission import (
    AdmissionCreateRequest,
    AdmissionResponse,
    PaginatedAdmissionsResponse,
)
from app.services import admission_service

router = APIRouter(prefix="/admin/admissions", tags=["Admin - Admissions"])


@router.post("", response_model=AdmissionResponse, status_code=status.HTTP_201_CREATED)
def create_admission(
    request: Request,
    payload: AdmissionCreateRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Execute complete student admission wizard workflow in a single transaction."""
    ip = get_client_ip(request)
    return admission_service.process_student_admission(
        payload=payload,
        actor_user_id=current_user.id,
        ip=ip,
        db=db,
    )


@router.get("", response_model=PaginatedAdmissionsResponse)
def list_admissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    grade_id: uuid.UUID | None = None,
    status: str | None = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """List historical student admission records with filtering and pagination."""
    return admission_service.list_admissions(
        skip=skip,
        limit=limit,
        search=search,
        grade_id=grade_id,
        status_filter=status,
        db=db,
    )


@router.get("/{admission_id}", response_model=AdmissionResponse)
def get_admission(
    admission_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Retrieve full details of an admission record."""
    return admission_service.get_admission_by_id(admission_id, db)


@router.get("/{admission_id}/status")
def get_admission_status(
    admission_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Quick lookup of admission status and enrollment number."""
    adm = admission_service.get_admission_by_id(admission_id, db)
    return {
        "admission_id": adm.admission_id,
        "admission_number": adm.admission_number,
        "enrollment_number": adm.student.enrollment_number,
        "status": adm.status,
        "admission_date": adm.admission_date,
    }

