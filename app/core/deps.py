import logging
import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.modules.auth.models import User, UserRole, UserStatus

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


def get_client_ip(request: Request) -> str:
    """Extract client IP address, checking X-Forwarded-For header first."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate request via Bearer access token and return the active User."""
    ip = get_client_ip(request)
    if not token:
        logger.warning("Auth failure: missing Bearer token", extra={"ip": ip, "path": request.url.path, "method": request.method})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if payload.get("type") != "access":
        logger.warning("Auth failure: invalid token type", extra={"ip": ip, "type": payload.get("type"), "path": request.url.path})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for this operation",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not sub:
        logger.warning("Auth failure: missing sub in token", extra={"ip": ip, "path": request.url.path})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )

    try:
        user_uuid = uuid.UUID(sub)
    except ValueError:
        logger.warning("Auth failure: invalid UUID sub in token", extra={"ip": ip, "sub": sub, "path": request.url.path})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject in token",
        )

    user = db.get(User, user_uuid)
    if not user:
        logger.warning("Auth failure: user not found", extra={"ip": ip, "user_id": str(user_uuid), "path": request.url.path})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Check for temporary lock expiration
    now = datetime.now(timezone.utc)
    if user.status == UserStatus.LOCKED.value:
        if user.locked_until and user.locked_until <= now:
            user.status = UserStatus.ACTIVE.value
            user.locked_until = None
            user.failed_login_count = 0
            db.commit()
        else:
            logger.warning("Auth forbidden: account temporarily locked", extra={"user_id": str(user.id), "path": request.url.path})
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is temporarily locked due to failed login attempts",
            )

    if user.status != UserStatus.ACTIVE.value:
        logger.warning("Auth forbidden: account inactive", extra={"user_id": str(user.id), "status": user.status, "path": request.url.path})
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}",
        )

    return user


def get_current_restricted_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency for /auth/change-password when user has must_change_password=True."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_token(token)
    if payload.get("type") not in ("access", "must_change_password"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    sub = payload.get("sub")
    try:
        user_uuid = uuid.UUID(sub)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    user = db.get(User, user_uuid)
    if not user or user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not active",
        )
    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory checking if current user has one of the allowed roles."""
    if len(allowed_roles) == 1 and isinstance(allowed_roles[0], (list, tuple, set)):
        roles_set = {str(r).lower() for r in allowed_roles[0]}
        roles_display = ", ".join(str(r) for r in allowed_roles[0])
    else:
        roles_set = {str(r).lower() for r in allowed_roles}
        roles_display = ", ".join(str(r) for r in allowed_roles)

    def role_checker(request: Request, current_user: User = Depends(get_current_user)) -> User:
        user_role_str = str(current_user.role).lower()
        if user_role_str not in roles_set:
            logger.warning(
                "Access forbidden: role mismatch",
                extra={
                    "user_id": str(current_user.id),
                    "user_role": user_role_str,
                    "required_roles": roles_display,
                    "path": request.url.path,
                    "method": request.method,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {roles_display}",
            )
        return current_user

    return role_checker


def require_admin_permission(permission_key: str) -> Callable[[User], User]:
    """
    Dependency factory enforcing granular module access on Admin users.
    Super Admins always bypass.
    Admins must have '*' or specific permission in admin_permissions list.
    """
    perm_key_clean = permission_key.strip().lower()

    def permission_checker(request: Request, current_user: User = Depends(get_current_user)) -> User:
        user_role_str = str(current_user.role).lower()
        if user_role_str == UserRole.SUPER_ADMIN.value:
            return current_user

        if user_role_str == UserRole.ADMIN.value:
            perms = [str(p).lower() for p in (current_user.admin_permissions or [])]
            if "*" in perms or perm_key_clean in perms:
                return current_user

            logger.warning(
                "Access forbidden: admin permission missing",
                extra={
                    "user_id": str(current_user.id),
                    "required_permission": perm_key_clean,
                    "granted_permissions": perms,
                    "path": request.url.path,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Account lacks '{perm_key_clean}' administrative access.",
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires administrative privileges.",
        )

    return permission_checker


def get_current_teacher(
    current_user: User = Depends(require_roles(UserRole.TEACHER.value)),
    db: Session = Depends(get_db),
) -> "Teacher":
    from app.modules.teachers.models import Teacher
    teacher = db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile record not found",
        )
    return teacher


def require_class_access(
    class_id: uuid.UUID,
    teacher: "Teacher" = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> "Section":
    from app.modules.academics.classroom_models import TeacherAssignment
    from app.modules.academics.models import Section
    assignment = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.section_id == class_id,
            TeacherAssignment.status == "active",
        )
    ).scalars().first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or not assigned to teacher",
        )
    section = db.get(Section, class_id)
    if not section or section.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or inactive",
        )
    return section

