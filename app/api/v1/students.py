from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.student import StudentResponse

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me", response_model=StudentResponse)
def get_student_profile(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student endpoint: strictly returns only the authenticated student's own record."""
    student = db.execute(
        select(Student).where(Student.user_id == current_user.id)
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile record not found",
        )

    return StudentResponse.model_validate(student)
