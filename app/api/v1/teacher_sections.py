import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_teacher, get_db
from app.models.academic_structure import Grade, Section
from app.models.classroom import TeacherAssignment
from app.models.teacher import Teacher
from app.schemas.grade_section import (
    SectionStudentsResponse,
    TeacherMySectionsResponse,
)
from app.services import enrollment_service, teacher_assignment_service
from sqlalchemy import select

router = APIRouter(prefix="/teacher", tags=["Teacher - Sections & Rosters"])


@router.get("/my-sections", response_model=TeacherMySectionsResponse)
def get_my_sections(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Retrieve all sections assigned to the logged-in teacher (Class Teacher or Grade Coordinator)."""
    return teacher_assignment_service.get_teacher_assigned_sections(teacher.id, db)


@router.get("/sections/{section_id}/students", response_model=SectionStudentsResponse)
def get_my_section_students(
    section_id: uuid.UUID,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Retrieve enrolled student roster for an authorized section.
    
    Enforces ownership: returns 404 if teacher is not Class Teacher of this section 
    or Grade Coordinator of its grade.
    """
    section = db.get(Section, section_id)
    if not section or section.status != "active":
        raise HTTPException(status_code=404, detail="Section not found or inactive")

    # Check authorization:
    # 1. Is active class teacher?
    is_class_teacher = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.section_id == section.id,
            TeacherAssignment.is_active == True,
        )
    ).scalars().first()

    # 2. Is grade coordinator?
    grade = db.get(Grade, section.grade_id)
    is_coordinator = grade and grade.coordinator_teacher_id == teacher.id

    if not is_class_teacher and not is_coordinator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found or not assigned to teacher",
        )

    return enrollment_service.get_section_students(section_id, db)

