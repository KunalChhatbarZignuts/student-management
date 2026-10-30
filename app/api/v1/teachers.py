import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_db, require_roles
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.schemas.student import StudentResponse
from app.schemas.teacher_ext import MissingStudentRequest, MissingStudentResponse, TeacherClassesResponse
from app.services.audit_service import log_action

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.post("/missing-student-request", response_model=MissingStudentResponse)
def submit_missing_student_request(
    request: Request,
    payload: MissingStudentRequest,
    current_user: User = Depends(require_roles(UserRole.TEACHER.value)),
    db: Session = Depends(get_db),
):
    """Teacher submits a request to admins for a student missing from their roster."""
    req_id = uuid.uuid4()
    ip = get_client_ip(request)

    log_action(
        db,
        actor_user_id=current_user.id,
        action="missing_student_reported",
        entity_type="missing_student_request",
        entity_id=str(req_id),
        metadata={
            "student_name": payload.student_name,
            "class_name": payload.class_name,
            "section": payload.section,
            "notes": payload.notes,
        },
        ip=ip,
    )

    return MissingStudentResponse(
        message="Missing student request submitted successfully to administrators.",
        request_id=req_id,
    )


@router.get("/me/classes", response_model=TeacherClassesResponse)
def get_my_classes(
    current_user: User = Depends(require_roles(UserRole.TEACHER.value)),
    db: Session = Depends(get_db),
):
    """Teacher endpoint: strictly scoped to students in the teacher's department."""
    teacher = db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    students = db.execute(
        select(Student).where(Student.department == teacher.department)
    ).scalars().all()

    return TeacherClassesResponse(
        department=teacher.department,
        students=[StudentResponse.model_validate(s) for s in students],
    )
