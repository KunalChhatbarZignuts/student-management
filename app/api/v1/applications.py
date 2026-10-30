import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import get_email_backend, send_invite_email
from app.core.rate_limit import limiter
from app.core.security import generate_secure_token, hash_token
from app.models.application import Application, ApplicationStatus
from app.models.invite import Invite
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.schemas.application import ApplicationApproveResponse, ApplicationCreate, ApplicationResponse
from app.schemas.auth import MessageResponse
from app.services.audit_service import log_action
from app.services.id_generator import generate_student_code

router = APIRouter(tags=["Applications"])


def _check_applications_enabled():
    if not settings.ENABLE_ONLINE_APPLICATIONS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Online applications are currently disabled",
        )


@router.post("/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def submit_application(
    request: Request,
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
):
    """Public endpoint for prospective student application (feature-flagged)."""
    _check_applications_enabled()

    # Check duplicate application with same email while pending
    existing = db.execute(
        select(Application).where(
            Application.email == payload.email.lower(),
            Application.status == ApplicationStatus.PENDING.value,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An application with this email is already under review",
        )

    app_entry = Application(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email.lower(),
        phone=payload.phone,
        department=payload.department,
        message=payload.message,
        email_verified=False,
        status=ApplicationStatus.PENDING.value,
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    # Dispatch email verification
    verify_token = generate_secure_token()
    # In dev, send notification
    verify_link = f"{settings.FRONTEND_URL}/applications/verify-email?id={app_entry.id}&token={verify_token}"
    get_email_backend().send_email(
        to_email=app_entry.email,
        subject="Verify your student application",
        text_body=f"Click here to verify your application email: {verify_link}",
    )

    ip = get_client_ip(request)
    log_action(
        db,
        action="application_submitted",
        entity_type="application",
        entity_id=str(app_entry.id),
        metadata={"email": app_entry.email, "department": app_entry.department},
        ip=ip,
    )

    return ApplicationResponse.model_validate(app_entry)


@router.get("/applications/{application_id}/verify-email", response_model=MessageResponse)
def verify_application_email(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Public endpoint to verify applicant's email address."""
    _check_applications_enabled()

    app_entry = db.get(Application, application_id)
    if not app_entry:
        raise HTTPException(status_code=404, detail="Application not found")

    app_entry.email_verified = True
    db.commit()

    return MessageResponse(message="Email verified successfully. Your application is now in queue for review.")


@router.get("/admin/applications", response_model=list[ApplicationResponse])
def list_applications(
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all applications, optionally filtering by status."""
    query = select(Application)
    if status_filter:
        query = query.where(Application.status == status_filter.lower())

    apps = db.execute(query.order_by(Application.created_at.desc())).scalars().all()
    return [ApplicationResponse.model_validate(a) for a in apps]


@router.post("/admin/applications/{application_id}/approve", response_model=ApplicationApproveResponse)
def approve_application(
    application_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin approves application: triggers Flow A (generates student_code, creates user, sends invite)."""
    app_entry = db.get(Application, application_id)
    if not app_entry:
        raise HTTPException(status_code=404, detail="Application not found")

    if app_entry.status != ApplicationStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application cannot be approved: status is already '{app_entry.status}'",
        )

    if not app_entry.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve application: applicant email is not yet verified",
        )

    # Check if a user with this email already exists
    existing_user = db.execute(
        select(User).where(User.email == app_entry.email)
    ).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=409, detail="A user account with this email already exists")

    # Generate student code
    admission_year = datetime.now().year
    student_code = generate_student_code(db, admission_year, app_entry.department)

    # Create User
    user = User(
        email=app_entry.email,
        role=UserRole.STUDENT.value,
        status=UserStatus.INVITED.value,
        password_hash=None,
    )
    db.add(user)
    db.flush()

    # Create Student
    student = Student(
        student_code=student_code,
        user_id=user.id,
        first_name=app_entry.first_name,
        last_name=app_entry.last_name,
        dob=date(2005, 1, 1),  # Default or provided
        class_name="1",
        section="A",
        department=app_entry.department,
        admission_date=datetime.now().date(),
        guardian_phone=app_entry.phone,
    )
    db.add(student)
    db.flush()

    # Create 48h invite
    raw_invite_token = generate_secure_token()
    invite_expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS)
    invite = Invite(
        user_id=user.id,
        token_hash=hash_token(raw_invite_token),
        expires_at=invite_expires_at,
    )
    db.add(invite)

    # Update application
    app_entry.status = ApplicationStatus.APPROVED.value
    app_entry.reviewed_by = current_user.id
    db.commit()

    # Send invite email
    send_invite_email(user.email, raw_invite_token)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="application_approved",
        entity_type="application",
        entity_id=str(app_entry.id),
        metadata={"student_code": student_code, "user_id": str(user.id)},
        ip=ip,
    )

    return ApplicationApproveResponse(
        message="Application approved. Student record created and invitation sent.",
        application_id=app_entry.id,
        student_code=student_code,
        invite_expires_at=invite_expires_at,
        invite_token=raw_invite_token,
    )


@router.post("/admin/applications/{application_id}/reject", response_model=MessageResponse)
def reject_application(
    application_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin rejects an application."""
    app_entry = db.get(Application, application_id)
    if not app_entry:
        raise HTTPException(status_code=404, detail="Application not found")

    if app_entry.status != ApplicationStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application cannot be rejected: status is already '{app_entry.status}'",
        )

    app_entry.status = ApplicationStatus.REJECTED.value
    app_entry.reviewed_by = current_user.id
    db.commit()

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="application_rejected",
        entity_type="application",
        entity_id=str(app_entry.id),
        ip=ip,
    )

    return MessageResponse(message="Application rejected successfully.")
