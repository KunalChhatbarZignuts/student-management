import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import HTTPException, status

from app.core.config import settings

# Argon2 password hasher instance
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

# Dummy hash computed at module load to prevent timing attacks during user lookup failure
DUMMY_PASSWORD_HASH = ph.hash("TimingSafetyDummyPassword#123456")

# Common weak passwords list to reject
COMMON_PASSWORDS = {
    "password", "password123", "1234567890", "qwertyuiop", "admin12345",
    "letmein123", "welcome123", "changeme123", "student123", "teacher123",
    "school1234", "password@1", "admin@1234", "administrator", "iloveyou123"
}


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Verify password against argon2 hash with constant-time dummy fallthrough."""
    target_hash = hashed_password if hashed_password else DUMMY_PASSWORD_HASH
    try:
        ph.verify(target_hash, plain_password)
        return hashed_password is not None
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def validate_password_strength(password: str) -> None:
    """Enforce password rules: minimum 10 chars, rejection of common passwords."""
    if len(password) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 10 characters long.",
        )
    if password.lower() in COMMON_PASSWORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too common. Please choose a more secure password.",
        )


def generate_secure_token() -> str:
    """Generate a cryptographically secure 32-byte URL-safe string."""
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """Compute SHA-256 hexadecimal digest of raw token for safe DB storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: uuid.UUID,
    role: str,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Generate a short-lived access JWT (default 15 minutes)."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_MINUTES))
    jti = str(uuid.uuid4())

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "jti": jti,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def create_restricted_token(user_id: uuid.UUID, role: str, token_type: str = "must_change_password") -> str:
    """Generate a restricted JWT (e.g. forced password change or 2FA pending)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=15)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "jti": str(uuid.uuid4()),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate signature and expiry of a JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

