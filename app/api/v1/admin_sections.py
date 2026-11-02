import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.grade_section import (
    AssignTeacherPayload,
    SectionCreate,
    SectionListResponse,
    SectionResponse,
    SectionStatusUpdate,
    SectionStudentsResponse,
    SectionUpdate,
    TeacherAssignmentItem,
    TeacherMySectionsResponse,
)
from app.services import enrollment_service, section_service, teacher_assignment_service

router = APIRouter(tags=["Admin - Sections & Teacher Assignments"])


@router.post("/admin/sections", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
def create_section(
    request: Request,
    payload: SectionCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates a section under a grade."""
    ip = get_client_ip(request)
    return section_service.create_section(payload, current_user.id, ip, db)


@router.get("/admin/sections", response_model=SectionListResponse)
def list_sections(
    grade_id: uuid.UUID | None = Query(None, description="Filter by grade"),
    academic_year_id: uuid.UUID | None = Query(None, description="Filter by academic year"),
    status: str | None = Query(None, description="Filter by status (active/inactive)"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Search by section name or code"),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """List sections with grade, assigned teacher, and enrolled student count."""
    return section_service.list_sections(
        db=db,
        grade_id=grade_id,
        academic_year_id=academic_year_id,
        status_filter=status,
        page=page,
        size=size,
        search=search,
    )


@router.get("/admin/sections/{section_id}", response_model=SectionResponse)
def get_section(
    section_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Get section details with assigned class teacher and student count."""
    from app.models.academic_structure import Section
    from fastapi import HTTPException
    sec = db.get(Section, section_id)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    return section_service.get_section_response(sec, db)


@router.put("/admin/sections/{section_id}", response_model=SectionResponse)
def update_section(
    section_id: uuid.UUID,
    payload: SectionUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Update section name, code, or maximum capacity."""
    ip = get_client_ip(request)
    return section_service.update_section(section_id, payload, current_user.id, ip, db)


@router.patch("/admin/sections/{section_id}/status", response_model=SectionResponse)
def update_section_status(
    section_id: uuid.UUID,
    payload: SectionStatusUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Activate or deactivate section."""
    ip = get_client_ip(request)
    return section_service.update_section_status(section_id, payload.status, current_user.id, ip, db)


# ==========================================
# Teacher Assignment Endpoints
# ==========================================

@router.post("/admin/sections/{section_id}/assign-teacher", response_model=TeacherAssignmentItem)
def assign_class_teacher(
    section_id: uuid.UUID,
    payload: AssignTeacherPayload,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Assign or replace Class Teacher for a section. Preserves historical assignment records."""
    ip = get_client_ip(request)
    return teacher_assignment_service.assign_class_teacher(
        section_id=section_id,
        teacher_id=payload.teacher_id,
        actor_user_id=current_user.id,
        ip=ip,
        db=db,
    )


@router.get("/admin/sections/{section_id}/teacher", response_model=TeacherAssignmentItem | None)
def get_section_teacher(
    section_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Get active class teacher assignment for section."""
    return teacher_assignment_service.get_section_teacher(section_id, db)


@router.delete("/admin/sections/{section_id}/teacher")
def remove_class_teacher(
    section_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Remove active class teacher assignment (closes with end_date)."""
    ip = get_client_ip(request)
    return teacher_assignment_service.remove_class_teacher(section_id, current_user.id, ip, db)


@router.get("/admin/teachers/{teacher_id}/sections", response_model=TeacherMySectionsResponse)
def get_teacher_sections(
    teacher_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """View all sections assigned to a teacher (as Class Teacher or Grade Coordinator)."""
    return teacher_assignment_service.get_teacher_assigned_sections(teacher_id, db)


# ==========================================
# Section Student Roster
# ==========================================

@router.get("/admin/sections/{section_id}/students", response_model=SectionStudentsResponse)
def get_section_students(
    section_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """View all actively enrolled students in a section with roll numbers."""
    return enrollment_service.get_section_students(section_id, db)

