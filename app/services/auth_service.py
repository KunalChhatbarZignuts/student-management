import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_restricted_token,
    generate_secure_token,
    hash_password,
    hash_token,
    validate_password_strength,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services.audit_service import log_action

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


def find_user_by_identifier(db: Session, identifier: str) -> User | None:
    """Find a user by email, student_code, or employee_code."""
    ident = identifier.strip()

    # 1. Try finding by email (case-insensitive)
    user = db.execute(
        select(User).where(func.lower(User.email) == ident.lower())
    ).scalar_one_or_none()
    if user:
        return user

    # 2. Try finding by student_code
    student = db.execute(
        select(Student).where(Student.student_code == ident)
    ).scalar_one_or_none()
    if student:
        return db.get(User, student.user_id)

    # 3. Try finding by employee_code
    teacher = db.execute(
        select(Teacher).where(Teacher.employee_code == ident)
    ).scalar_one_or_none()
    if teacher:
        return db.get(User, teacher.user_id)

    return None


def handle_failed_login(db: Session, user: User | None, ip: str | None = None) -> None:
    """Increment failed login counter and apply 15-minute lockout if threshold reached."""
    if not user:
        return

    now = datetime.now(timezone.utc)
    user.failed_login_count += 1

    if user.failed_login_count >= MAX_FAILED_ATTEMPTS:
        user.locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        user.status = UserStatus.LOCKED.value
        log_action(
            db,
            actor_user_id=user.id,
            action="account_locked",
            entity_type="user",
            entity_id=str(user.id),
            metadata={"reason": "too_many_failed_attempts", "attempts": user.failed_login_count},
            ip=ip,
        )

    db.commit()


def reset_failed_login(db: Session, user: User, ip: str | None = None) -> None:
    """Reset failed login count and update last_login_at timestamp on successful login."""
    user.failed_login_count = 0
    user.locked_until = None
    if user.status == UserStatus.LOCKED.value:
        user.status = UserStatus.ACTIVE.value
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()


def create_refresh_token_session(
    db: Session,
    user_id: uuid.UUID,
    family_id: uuid.UUID | None = None,
    user_agent: str | None = None,
    ip: str | None = None,
) -> tuple[str, RefreshToken]:
    """Create and persist a new refresh token in the given or new token family."""
    raw_token = generate_secure_token()
    token_h = hash_token(raw_token)
    fam_id = family_id or uuid.uuid4()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_DAYS)

    db_token = RefreshToken(
        user_id=user_id,
        token_hash=token_h,
        family_id=fam_id,
        expires_at=expires_at,
        user_agent=user_agent[:512] if user_agent else None,
        ip=ip[:45] if ip else None,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return raw_token, db_token


def rotate_refresh_token(
    db: Session,
    raw_refresh_token: str,
    user_agent: str | None = None,
    ip: str | None = None,
) -> tuple[str, str]:
    """Rotate refresh token. Detect reuse of revoked tokens and invalidate entire family."""
    token_h = hash_token(raw_refresh_token)
    now = datetime.now(timezone.utc)

    db_token = db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_h)
    ).scalar_one_or_none()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # REUSE DETECTION: If this token was already revoked, someone is replaying it!
    if db_token.revoked_at is not None:
        revoke_token_family(db, db_token.family_id)
        log_action(
            db,
            actor_user_id=db_token.user_id,
            action="token_reuse_detected",
            entity_type="refresh_token",
            entity_id=str(db_token.id),
            metadata={"family_id": str(db_token.family_id)},
            ip=ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token reuse detected. All sessions in this chain have been revoked.",
        )

    # Check expiration
    if db_token.expires_at < now:
        db_token.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    # Check user status
    user = db.get(User, db_token.user_id)
    if not user or user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or disabled",
        )

    # Issue new token in the SAME family and rotate
    new_raw_token, new_db_token = create_refresh_token_session(
        db,
        user_id=user.id,
        family_id=db_token.family_id,
        user_agent=user_agent,
        ip=ip,
    )

    # Invalidate old token with pointer to replacement
    db_token.revoked_at = now
    db_token.replaced_by = new_db_token.id
    db.commit()

    # Issue new short-lived access JWT
    new_access_token = create_access_token(user.id, user.role)
    return new_access_token, new_raw_token


def revoke_token(db: Session, raw_refresh_token: str) -> None:
    """Revoke a single refresh token session."""
    token_h = hash_token(raw_refresh_token)
    db_token = db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_h)
    ).scalar_one_or_none()
    if db_token and db_token.revoked_at is None:
        db_token.revoked_at = datetime.now(timezone.utc)
        db.commit()


def revoke_token_family(db: Session, family_id: uuid.UUID) -> None:
    """Revoke all tokens belonging to a specific family."""
    now = datetime.now(timezone.utc)
    tokens = db.execute(
        select(RefreshToken).where(
            RefreshToken.family_id == family_id,
            RefreshToken.revoked_at.is_(None),
        )
    ).scalars().all()
    for t in tokens:
        t.revoked_at = now
    db.commit()


def revoke_all_user_tokens(db: Session, user_id: uuid.UUID) -> None:
    """Revoke all active refresh tokens for a user (e.g. password change, logout-all)."""
    now = datetime.now(timezone.utc)
    tokens = db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    ).scalars().all()
    for t in tokens:
        t.revoked_at = now
    db.commit()

