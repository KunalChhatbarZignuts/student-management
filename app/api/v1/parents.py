import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_current_user, get_db, require_roles
from app.core.email import send_invite_email
from app.core.security import generate_secure_token, hash_token
from app.models.invite import Invite
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.schemas.parent import ParentCreate, ParentLinkResponse, ParentResponse
from app.schemas.student import StudentResponse
from app.services.audit_service import log_action

router = APIRouter(tags=["Parents"])


@router.post("/admin/parents", response_model=ParentResponse, status_code=status.HTTP_201_CREATED)
def create_parent(
    request: Request,
    payload: ParentCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates a parent account with an invited status and dispatches an invite."""
    existing = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    user = User(
        email=payload.email.lower(),
        role=UserRole.PARENT.value,
        status=UserStatus.INVITED.value,
        password_hash=None,
    )
    db.add(user)
    db.flush()

    parent = Parent(
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
    )
    db.add(parent)
    db.flush()

    raw_token = generate_secure_token()
    invite = Invite(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
    )
    db.add(invite)
    db.commit()

    send_invite_email(user.email, raw_token)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_created",
        entity_type="parent",
        entity_id=str(parent.id),
        ip=ip,
    )

    return ParentResponse.model_validate(parent)


@router.post("/admin/parents/{parent_id}/link-student/{student_id}", response_model=ParentLinkResponse)
def link_parent_to_student(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin links a parent to a student."""
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    existing_link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
        )
    ).scalar_one_or_none()
    if existing_link:
        raise HTTPException(status_code=409, detail="Student is already linked to this parent")

    link = ParentStudentLink(parent_id=parent_id, student_id=student_id)
    db.add(link)
    db.commit()

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_student_linked",
        entity_type="parent_student_link",
        metadata={"parent_id": str(parent_id), "student_id": str(student_id)},
        ip=ip,
    )

    return ParentLinkResponse(
        message="Student linked to parent successfully",
        parent_id=parent_id,
        student_id=student_id,
    )


@router.get("/parents/me/children", response_model=list[StudentResponse])
def get_my_children(
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent endpoint: strictly returns only the students linked to this parent."""
    parent = db.execute(
        select(Parent).where(Parent.user_id == current_user.id)
    ).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    links = db.execute(
        select(ParentStudentLink).where(ParentStudentLink.parent_id == parent.id)
    ).scalars().all()

    students = [db.get(Student, l.student_id) for l in links if l.student_id]
    return [StudentResponse.model_validate(s) for s in students if s is not None]
