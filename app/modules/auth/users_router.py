import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import send_invite_email, send_password_reset_email
from app.core.security import (
    generate_secure_token,
    hash_password,
    hash_token,
    validate_password_strength,
)
from app.modules.auth.invite_models import Invite
from app.modules.auth.password_reset_models import PasswordReset
from app.modules.students.parent_models import Parent
from app.modules.students.models import Student
from app.modules.teachers.models import Teacher
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.auth.admin_schemas import (
    CreateAdminRequest,
    PaginatedUsersResponse,
    ResendInviteResponse,
    SystemOverviewResponse,
    TriggerPasswordResetResponse,
    UpdateAdminPermissionsRequest,
    UserStatusUpdateResponse,
)
from app.modules.auth.user_schemas import UserRead
from app.modules.audit.service import log_action
from app.modules.auth.service import revoke_all_user_tokens

router = APIRouter(prefix="/admin/users", tags=["Admin - User Management"])


@router.get("/system-overview", response_model=SystemOverviewResponse)
def get_system_overview(
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Super-Admin only: System-wide user statistics and platform status."""
    total_admins = db.scalar(select(func.count(User.id)).where(User.role == UserRole.ADMIN.value)) or 0
    active_admins = db.scalar(select(func.count(User.id)).where(User.role == UserRole.ADMIN.value, User.status == UserStatus.ACTIVE.value)) or 0
    invited_admins = db.scalar(select(func.count(User.id)).where(User.role == UserRole.ADMIN.value, User.status == UserStatus.INVITED.value)) or 0
    total_teachers = db.scalar(select(func.count(User.id)).where(User.role == UserRole.TEACHER.value)) or 0
    total_students = db.scalar(select(func.count(User.id)).where(User.role == UserRole.STUDENT.value)) or 0
    total_parents = db.scalar(select(func.count(User.id)).where(User.role == UserRole.PARENT.value)) or 0
    total_users = db.scalar(select(func.count(User.id))) or 0

    return SystemOverviewResponse(
        total_admins=total_admins,
        active_admins=active_admins,
        invited_admins=invited_admins,
        total_teachers=total_teachers,
        total_students=total_students,
        total_parents=total_parents,
        total_users=total_users,
        system_status="healthy",
    )


@router.post("/create-admin", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_admin(
    payload: CreateAdminRequest,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Super-Admin only: Provision a new school Administrator and send an invitation."""
    email_clean = payload.email.strip().lower()

    existing = db.execute(select(User).where(func.lower(User.email) == email_clean)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{payload.email}' already exists in the system.",
        )

    # Create new administrator account with granular permissions
    now = datetime.now(timezone.utc)
    
    password_hash = None
    admin_status = UserStatus.INVITED.value
    if payload.password:
        validate_password_strength(payload.password)
        password_hash = hash_password(payload.password)
        admin_status = UserStatus.ACTIVE.value

    new_admin = User(
        id=uuid.uuid4(),
        email=email_clean,
        password_hash=password_hash,
        role=UserRole.ADMIN.value,
        status=admin_status,
        admin_permissions=payload.permissions or [],
        must_change_password=True,
        failed_login_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(new_admin)
    db.flush()

    raw_token = None
    if not payload.password:
        # Generate secure 48-hour invitation token if no direct password was set
        raw_token = generate_secure_token()
        invite = Invite(
            user_id=new_admin.id,
            token_hash=hash_token(raw_token),
            expires_at=now + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
        )
        db.add(invite)

    # Audit log
    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="admin_provisioned",
        entity_type="user",
        entity_id=str(new_admin.id),
        metadata={
            "admin_email": email_clean,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "permissions": payload.permissions or [],
            "direct_password_set": bool(payload.password),
        },
        ip=ip,
    )
    db.commit()
    db.refresh(new_admin)

    # Dispatch invite email only if token was generated
    if raw_token:
        try:
            send_invite_email(new_admin.email, raw_token)
        except Exception:
            # Non-blocking for email delivery failure in offline dev environments
            pass

    return UserRead.model_validate(new_admin)


@router.patch("/{user_id}/permissions", response_model=UserRead)
def update_admin_permissions(
    user_id: uuid.UUID,
    payload: UpdateAdminPermissionsRequest,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Super-Admin only: Update an Administrator's allowed module access permissions."""
    admin_user = db.get(User, user_id)
    if not admin_user:
        raise HTTPException(status_code=404, detail="User not found")

    if admin_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Granular module permissions can only be configured for Administrator accounts.",
        )

    admin_user.admin_permissions = payload.permissions
    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="admin_permissions_updated",
        entity_type="user",
        entity_id=str(admin_user.id),
        metadata={"permissions": payload.permissions},
        ip=ip,
    )
    db.commit()
    db.refresh(admin_user)
    return UserRead.model_validate(admin_user)


@router.get("", response_model=PaginatedUsersResponse)
def list_users(
    role: str | None = Query(None, description="Filter by user role"),
    status: str | None = Query(None, description="Filter by account status"),
    search: str | None = Query(None, description="Search by email, name, student ID, or enrollment number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """List users with filtering, eager profile loading, and comprehensive search."""
    query = select(User)

    if role:
        query = query.where(User.role == role.lower())
    if status:
        query = query.where(User.status == status.lower())

    # Eager-load role-specific profile models to avoid N+1 queries
    query = query.options(
        joinedload(User.student),
        joinedload(User.teacher),
        joinedload(User.parent),
    )

    if search:
        s = f"%{search.strip().lower()}%"
        query = (
            query
            .outerjoin(Student, User.id == Student.user_id)
            .outerjoin(Teacher, User.id == Teacher.user_id)
            .outerjoin(Parent, User.id == Parent.user_id)
            .where(
                or_(
                    User.email.ilike(s),
                    Student.first_name.ilike(s),
                    Student.last_name.ilike(s),
                    func.concat(Student.first_name, " ", Student.last_name).ilike(s),
                    Student.student_code.ilike(s),
                    Student.enrollment_number.ilike(s),
                    Teacher.first_name.ilike(s),
                    Teacher.last_name.ilike(s),
                    func.concat(Teacher.first_name, " ", Teacher.last_name).ilike(s),
                    Parent.first_name.ilike(s),
                    Parent.last_name.ilike(s),
                    func.concat(Parent.first_name, " ", Parent.last_name).ilike(s),
                )
            )
        )

    # Total count
    count_query = select(func.count()).select_from(query.distinct().subquery())
    total = db.scalar(count_query) or 0

    # Paginated results
    users = db.execute(
        query.distinct().order_by(User.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    return PaginatedUsersResponse(
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.patch("/{user_id}/suspend", response_model=UserStatusUpdateResponse)
def suspend_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Suspend a user account and immediately revoke all their active sessions."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Super Admin protection: Cannot suspend a Super Admin
    if user.role == UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Super-admin account cannot be suspended")

    # Regular Admin protection: Only Super Admin can suspend Admin accounts
    if user.role == UserRole.ADMIN.value and current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super-Admin can suspend an Administrator account")

    user.status = UserStatus.SUSPENDED.value
    revoke_all_user_tokens(db, user.id)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="user_suspended",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )
    db.commit()

    return UserStatusUpdateResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        message="User account suspended successfully",
    )


@router.patch("/{user_id}/activate", response_model=UserStatusUpdateResponse)
def activate_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Activate a suspended or locked user account."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Regular Admin protection: Only Super Admin can activate Admin accounts
    if user.role == UserRole.ADMIN.value and current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super-Admin can activate an Administrator account")

    user.status = UserStatus.ACTIVE.value
    user.failed_login_count = 0
    user.locked_until = None

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="user_activated",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )
    db.commit()

    return UserStatusUpdateResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        message="User account activated successfully",
    )


@router.patch("/{user_id}/deactivate", response_model=UserStatusUpdateResponse)
def deactivate_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Deactivate a user account (never hard-delete). Revokes all active sessions."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Super-admin account cannot be deactivated")

    # Regular Admin protection: Only Super Admin can deactivate Admin accounts
    if user.role == UserRole.ADMIN.value and current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super-Admin can deactivate an Administrator account")

    user.status = UserStatus.DEACTIVATED.value
    revoke_all_user_tokens(db, user.id)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="user_deactivated",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )
    db.commit()

    return UserStatusUpdateResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        message="User account deactivated successfully",
    )


@router.post("/{user_id}/resend-invite", response_model=ResendInviteResponse)
def resend_invite(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Generate and dispatch a new 48-hour invitation link for a pending/invited user."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.status not in (UserStatus.INVITED.value, UserStatus.PENDING.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resend invite: user status is '{user.status}'",
        )

    # Invalidate older invites
    now = datetime.now(timezone.utc)
    old_invites = db.execute(
        select(Invite).where(Invite.user_id == user.id, Invite.used_at.is_(None))
    ).scalars().all()
    for inv in old_invites:
        inv.used_at = now

    raw_token = generate_secure_token()
    expires_at = now + timedelta(hours=settings.INVITE_EXPIRE_HOURS)

    new_invite = Invite(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=expires_at,
    )
    db.add(new_invite)
    user.status = UserStatus.INVITED.value
    db.commit()

    send_invite_email(user.email, raw_token)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="invite_resent",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )

    return ResendInviteResponse(
        message="New invitation email dispatched successfully",
        invite_token=raw_token,
        expires_at=expires_at,
    )


@router.post("/{user_id}/trigger-password-reset", response_model=TriggerPasswordResetResponse)
def trigger_password_reset(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin triggers a password reset email for a user. Admin never sees or sets password."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    raw_token = generate_secure_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_EXPIRE_MINUTES)

    reset_entry = PasswordReset(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=expires_at,
    )
    db.add(reset_entry)
    db.commit()

    send_password_reset_email(user.email, raw_token)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="admin_triggered_password_reset",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )

    return TriggerPasswordResetResponse(
        message="Password reset link sent to user email",
    )
