import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import (
    get_client_ip,
    get_current_restricted_user,
    get_current_user,
    get_db,
)
from app.core.email import send_password_reset_email
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_restricted_token,
    decode_token,
    generate_secure_token,
    hash_password,
    hash_token,
    validate_password_strength,
    verify_password,
)
from app.models.invite import Invite
from app.models.password_reset import PasswordReset
from app.models.user import User, UserRole, UserStatus
import pyotp
from app.schemas.auth import (
    AcceptInviteRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    TwoFactorDisableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
)
from app.schemas.user import UserRead
from app.services.audit_service import log_action
from app.services.auth_service import (
    create_refresh_token_session,
    find_user_by_identifier,
    handle_failed_login,
    reset_failed_login,
    revoke_all_user_tokens,
    revoke_token,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Helper to set refresh token in httpOnly SameSite=Strict cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_DAYS * 24 * 3600,
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Helper to clear refresh token cookie."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/api/v1/auth",
        httponly=True,
        samesite="strict",
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate with identifier (email/student_code/employee_code) + password."""
    ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    user = find_user_by_identifier(db, payload.identifier)

    # Timing-safe password verification
    is_valid = verify_password(payload.password, user.password_hash if user else None)

    if not user or not is_valid:
        if user:
            handle_failed_login(db, user, ip=ip)
        log_action(
            db,
            action="login_failure",
            entity_type="user",
            entity_id=str(user.id) if user else None,
            metadata={"identifier": payload.identifier},
            ip=ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Check status
    if user.status != UserStatus.ACTIVE.value:
        log_action(
            db,
            actor_user_id=user.id,
            action="login_blocked_inactive",
            entity_type="user",
            entity_id=str(user.id),
            metadata={"status": user.status},
            ip=ip,
        )
        if user.status == UserStatus.LOCKED.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is locked. Please try again after 15 minutes.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}. Please contact an administrator.",
        )

    # Check must_change_password
    if user.must_change_password:
        temp_token = create_restricted_token(user.id, user.role, token_type="must_change_password")
        return TokenResponse(
            access_token=temp_token,
            must_change_password=True,
            temp_token=temp_token,
        )

    # Check 2FA requirement for Admin / Super Admin
    if user.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value) and user.totp_enabled:
        temp_token = create_restricted_token(user.id, user.role, token_type="2fa_pending")
        return TokenResponse(
            access_token="",
            requires_2fa=True,
            temp_token=temp_token,
        )

    # Full active login
    reset_failed_login(db, user, ip=ip)
    access_token = create_access_token(user.id, user.role)
    raw_refresh_token, _ = create_refresh_token_session(
        db,
        user_id=user.id,
        user_agent=user_agent,
        ip=ip,
    )

    _set_refresh_cookie(response, raw_refresh_token)

    log_action(
        db,
        actor_user_id=user.id,
        action="login_success",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        must_change_password=False,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(
    request: Request,
    response: Response,
    body: RefreshTokenRequest | None = None,
    cookie_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
):
    """Rotate refresh token. Accepts token from httpOnly cookie (preferred) or request body."""
    raw_token = cookie_token or (body.refresh_token if body else None)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    new_access_token, new_raw_refresh = rotate_refresh_token(
        db,
        raw_refresh_token=raw_token,
        user_agent=user_agent,
        ip=ip,
    )

    _set_refresh_cookie(response, new_raw_refresh)

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    body: RefreshTokenRequest | None = None,
    cookie_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
):
    """Log out current session and revoke refresh token."""
    raw_token = cookie_token or (body.refresh_token if body else None)
    if raw_token:
        revoke_token(db, raw_token)

    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out successfully")


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke all refresh sessions for the authenticated user."""
    revoke_all_user_tokens(db, current_user.id)
    _clear_refresh_cookie(response)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="logout_all_sessions",
        entity_type="user",
        entity_id=str(current_user.id),
    )
    return MessageResponse(message="All sessions revoked successfully")


@router.post("/accept-invite", response_model=MessageResponse)
@limiter.limit("5/minute")
def accept_invite(
    request: Request,
    payload: AcceptInviteRequest,
    db: Session = Depends(get_db),
):
    """Activate account using single-use 48h invite token."""
    validate_password_strength(payload.new_password)

    token_h = hash_token(payload.token)
    now = datetime.now(timezone.utc)

    invite = db.execute(
        select(Invite).where(Invite.token_hash == token_h)
    ).scalar_one_or_none()

    if not invite or invite.used_at is not None or invite.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation token",
        )

    user = db.get(User, invite.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    user.status = UserStatus.ACTIVE.value
    user.must_change_password = False
    invite.used_at = now

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=user.id,
        action="invite_accepted",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )
    db.commit()

    return MessageResponse(message="Account activated successfully. You may now log in.")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Send single-use 30 min reset link. Returns same generic response to prevent user enumeration."""
    generic_msg = "If your email is registered, you will receive a password reset link shortly."
    ip = get_client_ip(request)

    user = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()

    if user and user.status == UserStatus.ACTIVE.value:
        raw_token = generate_secure_token()
        token_h = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_EXPIRE_MINUTES)

        reset_entry = PasswordReset(
            user_id=user.id,
            token_hash=token_h,
            expires_at=expires_at,
        )
        db.add(reset_entry)
        db.commit()

        send_password_reset_email(user.email, raw_token)
        log_action(
            db,
            actor_user_id=user.id,
            action="password_reset_requested",
            entity_type="user",
            entity_id=str(user.id),
            ip=ip,
        )

    return MessageResponse(message=generic_msg)


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Complete password reset using single-use token. Revokes all refresh sessions."""
    validate_password_strength(payload.new_password)

    token_h = hash_token(payload.token)
    now = datetime.now(timezone.utc)

    reset_entry = db.execute(
        select(PasswordReset).where(PasswordReset.token_hash == token_h)
    ).scalar_one_or_none()

    if not reset_entry or reset_entry.used_at is not None or reset_entry.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token",
        )

    user = db.get(User, reset_entry.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    reset_entry.used_at = now

    # Revoke all active sessions upon password reset
    revoke_all_user_tokens(db, user.id)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=user.id,
        action="password_reset_completed",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )
    db.commit()

    return MessageResponse(message="Password reset successfully. Please log in with your new password.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_restricted_user),
    db: Session = Depends(get_db),
):
    """Change password (for authenticated user or user with must_change_password)."""
    # Verify old password if one was set
    if current_user.password_hash is not None and payload.old_password is not None:
        if not verify_password(payload.old_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )

    validate_password_strength(payload.new_password)

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False

    # Invalidate other sessions
    revoke_all_user_tokens(db, current_user.id)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="password_changed",
        entity_type="user",
        entity_id=str(current_user.id),
        ip=ip,
    )
    db.commit()

    return MessageResponse(message="Password changed successfully")


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile of current authenticated user, including linked person profile."""
    return current_user


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate TOTP secret and provisioning URL for Admin/SuperAdmin."""
    if current_user.role not in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="2FA is only available for administrative accounts",
        )

    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    db.commit()

    totp = pyotp.TOTP(secret)
    provisioning_url = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="StudentManagementSMS",
    )

    return TwoFactorSetupResponse(
        secret=secret,
        otpauth_url=provisioning_url,
    )


@router.post("/2fa/verify", response_model=TokenResponse)
def verify_2fa(
    request: Request,
    response: Response,
    payload: TwoFactorVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify TOTP code during login (using temp_token) or during initial setup."""
    user = None
    ip = get_client_ip(request)

    # If temp_token provided (login flow)
    if payload.temp_token:
        claims = decode_token(payload.temp_token)
        if claims.get("type") != "2fa_pending":
            raise HTTPException(status_code=401, detail="Invalid 2FA token type")
        user = db.get(User, uuid.UUID(claims["sub"]))
    else:
        # Initial 2FA activation flow with active session
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        claims = decode_token(auth_header.split(" ")[1])
        user = db.get(User, uuid.UUID(claims["sub"]))

    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not configured for this user")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(payload.code, valid_window=1):
        log_action(
            db,
            actor_user_id=user.id,
            action="2fa_failed",
            entity_type="user",
            entity_id=str(user.id),
            ip=ip,
        )
        raise HTTPException(status_code=400, detail="Invalid 2FA verification code")

    # Mark 2FA enabled and reset any failed counters
    user.totp_enabled = True
    reset_failed_login(db, user, ip=ip)

    # Issue full session
    access_token = create_access_token(user.id, user.role)
    raw_refresh_token, _ = create_refresh_token_session(
        db,
        user_id=user.id,
        user_agent=request.headers.get("user-agent"),
        ip=ip,
    )
    _set_refresh_cookie(response, raw_refresh_token)

    log_action(
        db,
        actor_user_id=user.id,
        action="2fa_verified",
        entity_type="user",
        entity_id=str(user.id),
        ip=ip,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        must_change_password=False,
    )


@router.post("/2fa/disable", response_model=MessageResponse)
def disable_2fa(
    payload: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable TOTP 2FA. Requires valid current TOTP code and account password."""
    if not current_user.totp_enabled or not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid account password")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid 2FA verification code")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()

    log_action(
        db,
        actor_user_id=current_user.id,
        action="2fa_disabled",
        entity_type="user",
        entity_id=str(current_user.id),
    )

    return MessageResponse(message="2FA has been disabled successfully")

