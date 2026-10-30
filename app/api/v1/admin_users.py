import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import send_invite_email, send_password_reset_email
from app.core.security import generate_secure_token, hash_token
from app.models.invite import Invite
from app.models.password_reset import PasswordReset
from app.models.user import User, UserRole, UserStatus
from app.schemas.admin import (
    PaginatedUsersResponse,
    ResendInviteResponse,
    TriggerPasswordResetResponse,
    UserStatusUpdateResponse,
)
from app.schemas.user import UserRead
from app.services.audit_service import log_action
from app.services.auth_service import revoke_all_user_tokens

router = APIRouter(prefix="/admin/users", tags=["Admin - User Management"])


@router.get("", response_model=PaginatedUsersResponse)
def list_users(
    role: str | None = Query(None, description="Filter by user role"),
    status: str | None = Query(None, description="Filter by account status"),
    search: str | None = Query(None, description="Search by email substring"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """List users with filtering and pagination."""
    query = select(User)

    if role:
        query = query.where(User.role == role.lower())
    if status:
        query = query.where(User.status == status.lower())
    if search:
        query = query.where(User.email.ilike(f"%{search.strip()}%"))

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0

    # Paginated results
    users = db.execute(
        query.order_by(User.created_at.desc()).offset(skip).limit(limit)
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

    if user.role == UserRole.SUPER_ADMIN.value and current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Cannot suspend a super admin")

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
