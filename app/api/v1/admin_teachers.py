from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import send_invite_email
from app.core.security import generate_secure_token, hash_token
from app.models.invite import Invite
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.schemas.teacher import TeacherCreate, TeacherCreateResponse, TeacherResponse
from app.services.audit_service import log_action
from app.services.id_generator import generate_employee_code

router = APIRouter(prefix="/admin/teachers", tags=["Admin - Teachers"])


@router.post("", response_model=TeacherCreateResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    request: Request,
    payload: TeacherCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates a teacher. Generates immutable employee_code, creates invited user, sends invite."""
    # Check email duplicate
    existing = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Generate sequential employee code (e.g. EMP-0001)
    employee_code = generate_employee_code(db)

    # Create User record in invited state
    user = User(
        email=payload.email.lower(),
        role=UserRole.TEACHER.value,
        status=UserStatus.INVITED.value,
        password_hash=None,
    )
    db.add(user)
    db.flush()

    # Create Teacher person record linked to User
    teacher = Teacher(
        employee_code=employee_code,
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        department=payload.department,
        phone=payload.phone,
    )
    db.add(teacher)
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
        entity_type="teacher",
        entity_id=str(teacher.id),
        metadata={"employee_code": employee_code, "email": user.email},
        ip=ip,
    )

    return TeacherCreateResponse(
        teacher=TeacherResponse.model_validate(teacher),
        user_status=user.status,
        invite_expires_at=invite_expires_at,
        invite_token=raw_invite_token,
    )
