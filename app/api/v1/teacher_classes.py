import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_teacher, get_db, require_class_access
from app.models.classroom import Class
from app.models.teacher import Teacher
from app.schemas.classroom import ClassRosterResponse, TeacherAssignmentResponse
from app.services import assignment_service

router = APIRouter(prefix="/teacher", tags=["Teacher - Classes & Rosters"])


@router.get("/classes", response_model=list[TeacherAssignmentResponse])
def get_my_assigned_classes(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Retrieve all classes and subjects assigned to the logged-in teacher."""
    return assignment_service.get_teacher_classes(teacher.id, db)


@router.get("/classes/{class_id}/students", response_model=ClassRosterResponse)
def get_assigned_class_students(
    class_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Search by student name or code"),
    classroom: Class = Depends(require_class_access),
    db: Session = Depends(get_db),
):
    """Retrieve student roster for a class assigned to the teacher.

    Enforces ownership: returns 404 if the teacher is not assigned to this class.
    Only active students appear.
    """
    return assignment_service.get_class_roster(
        classroom=classroom,
        page=page,
        size=size,
        search=search,
        db=db,
    )

