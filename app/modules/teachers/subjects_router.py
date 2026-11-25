import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_teacher, get_db
from app.modules.teachers.models import Teacher
from app.modules.teachers.subject_schemas import (
    TeacherProfileWithSubjectsResponse,
    TeacherSubjectResponse,
)
from app.modules.teachers import subject_service as teacher_subject_service

router = APIRouter(prefix="/teacher", tags=["Teacher - Subjects & Profile"])


@router.get("/my-subjects", response_model=list[TeacherSubjectResponse])
def get_my_subjects(
    academic_year_id: uuid.UUID | None = None,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Teacher endpoint to retrieve subjects assigned to the logged-in teacher.
    
    Strictly scoped to the teacher's authenticated identity.
    """
    return teacher_subject_service.get_teacher_subject_assignments(
        teacher_id=teacher.id,
        academic_year_id=academic_year_id,
        status_filter="active",
        db=db,
    )


@router.get("/my-profile", response_model=TeacherProfileWithSubjectsResponse)
def get_my_profile(
    academic_year_id: uuid.UUID | None = None,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Teacher profile endpoint displaying personal details, assigned classes, and assigned subjects."""
    return teacher_subject_service.get_teacher_profile_with_subjects(
        teacher_id=teacher.id,
        academic_year_id=academic_year_id,
        db=db,
    )

