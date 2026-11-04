import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_current_user, get_db, require_roles
from app.models.academic_structure import AcademicYear
from app.models.user import User, UserRole
from app.schemas.grade_section import (
    AcademicYearResponse,
    EnrolledStudentItem,
    GradeCreate,
    GradeDetailResponse,
    GradeListResponse,
    GradeResponse,
    GradeStatusUpdate,
    GradeUpdate,
    SectionListResponse,
)
from app.services import enrollment_service, grade_service, section_service

router = APIRouter(prefix="/admin", tags=["Admin - Grades & Academic Structure"])


@router.get("/academic-years", response_model=list[AcademicYearResponse])
def list_academic_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value, UserRole.TEACHER.value)),
):
    """List all active academic years for selection dropdowns."""
    from datetime import date
    years = db.execute(
        select(AcademicYear).where(AcademicYear.status == "active").order_by(AcademicYear.start_date.desc())
    ).scalars().all()
    if not years:
        default_year = AcademicYear(
            name="2026-2027",
            start_date=date(2026, 9, 1),
            end_date=date(2027, 6, 30),
            is_current=True,
            status="active",
        )
        db.add(default_year)
        db.commit()
        db.refresh(default_year)
        years = [default_year]
    return [AcademicYearResponse.model_validate(y) for y in years]


@router.post("/grades", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create_grade(
    request: Request,
    payload: GradeCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates an academic grade (e.g. Grade 10, Nursery)."""
    ip = get_client_ip(request)
    return grade_service.create_grade(payload, current_user.id, ip, db)


@router.get("/grades", response_model=GradeListResponse)
def list_grades(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Search by grade name or code"),
    academic_year_id: uuid.UUID | None = Query(None, description="Filter by academic year"),
    status: str | None = Query(None, description="Filter by status (active/inactive)"),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value, UserRole.TEACHER.value)),
    db: Session = Depends(get_db),
):
    """List grades with section and student counts."""
    return grade_service.list_grades(
        db=db,
        page=page,
        size=size,
        search=search,
        academic_year_id=academic_year_id,
        status_filter=status,
    )


@router.get("/grades/{grade_id}", response_model=GradeDetailResponse)
def get_grade_detail(
    grade_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value, UserRole.TEACHER.value)),
    db: Session = Depends(get_db),
):
    """Get grade details including all sections and coordinator."""
    return grade_service.get_grade_detail(grade_id, db)


@router.put("/grades/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: uuid.UUID,
    payload: GradeUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Update grade metadata or assign grade coordinator."""
    ip = get_client_ip(request)
    return grade_service.update_grade(grade_id, payload, current_user.id, ip, db)


@router.patch("/grades/{grade_id}/status", response_model=GradeResponse)
def update_grade_status(
    grade_id: uuid.UUID,
    payload: GradeStatusUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Activate or deactivate grade. Cannot deactivate if active sections or enrollments exist."""
    ip = get_client_ip(request)
    return grade_service.update_grade_status(grade_id, payload.status, current_user.id, ip, db)


@router.get("/grades/{grade_id}/sections", response_model=SectionListResponse)
def get_grade_sections(
    grade_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """List sections under a specific grade."""
    return section_service.list_sections(db=db, grade_id=grade_id, page=page, size=size)


@router.get("/grades/{grade_id}/students", response_model=list[EnrolledStudentItem])
def get_grade_students(
    grade_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """List all actively enrolled students under a specific grade."""
    return enrollment_service.get_grade_students(grade_id, db)
