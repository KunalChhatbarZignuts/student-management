from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import send_invite_email
from app.core.security import generate_secure_token, hash_token
from app.models.invite import Invite
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.schemas.student import StudentCreate, StudentCreateResponse, StudentResponse
from app.services.audit_service import log_action
from app.services.id_generator import generate_student_code

router = APIRouter(prefix="/admin/students", tags=["Admin - Students"])


@router.post("", response_model=StudentCreateResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    request: Request,
    payload: StudentCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates a student. Generates immutable student_code, creates invited user, sends invite."""
    # Check email duplicate
    existing = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Generate sequential student code (e.g. 2026-CS-0001)
    year = payload.admission_date.year
    student_code = generate_student_code(db, year, payload.department)

    # Create User record in invited state
    user = User(
        email=payload.email.lower(),
        role=UserRole.STUDENT.value,
        status=UserStatus.INVITED.value,
        password_hash=None,
    )
    db.add(user)
    db.flush()

    # Create Student person record linked to User
    student = Student(
        student_code=student_code,
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        dob=payload.dob,
        class_name=payload.class_name,
        section=payload.section,
        department=payload.department,
        admission_date=payload.admission_date,
        guardian_name=payload.guardian_name,
        guardian_phone=payload.guardian_phone,
        guardian_email=payload.guardian_email,
        status="active",
    )
    db.add(student)
    db.flush()

    # Generate single-use 48h invite token
    raw_invite_token = generate_secure_token()
    invite_expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS)

    invite = Invite(
        user_id=user.id,
        token_hash=hash_token(raw_invite_token),
        expires_at=invite_expires_at,
    )
    db.add(invite)
    db.commit()

    # Send invite email
    send_invite_email(user.email, raw_invite_token)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="user_created",
        entity_type="student",
        entity_id=str(student.id),
        metadata={"student_code": student_code, "email": user.email},
        ip=ip,
    )

    return StudentCreateResponse(
        student=StudentResponse.model_validate(student),
        user_status=user.status,
        invite_expires_at=invite_expires_at,
        invite_token=raw_invite_token,
    )
