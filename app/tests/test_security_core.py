import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.core.email import send_invite_email, send_password_reset_email
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
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services.audit_service import log_action
from app.services.auth_service import (
    MAX_FAILED_ATTEMPTS,
    create_refresh_token_session,
    find_user_by_identifier,
    handle_failed_login,
    reset_failed_login,
    revoke_all_user_tokens,
    rotate_refresh_token,
)


def test_password_hashing():
    pw = "SuperSecure#Password2026"
    h = hash_password(pw)
    assert h.startswith("$argon2")
    assert verify_password(pw, h) is True
    assert verify_password("WrongPassword123", h) is False
    # Dummy timing safety when hashed_password is None
    assert verify_password("AnyPassword", None) is False


def test_password_strength():
    # Too short
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("Short1")
    assert exc.value.status_code == 400

    # Common password
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("password123")
    assert exc.value.status_code == 400

    # Valid
    validate_password_strength("StrongComplexPassword#999")


def test_tokens_and_jwt():
    raw_token = generate_secure_token()
    assert len(raw_token) > 20
    h1 = hash_token(raw_token)
    h2 = hash_token(raw_token)
    assert h1 == h2

    # JWT Access Token
    user_id = uuid.uuid4()
    jwt_str = create_access_token(user_id, UserRole.ADMIN.value)
    payload = decode_token(jwt_str)
    assert payload["sub"] == str(user_id)
    assert payload["role"] == UserRole.ADMIN.value
    assert payload["type"] == "access"

    # Restricted token
    rest_jwt = create_restricted_token(user_id, UserRole.SUPER_ADMIN.value)
    r_payload = decode_token(rest_jwt)
    assert r_payload["type"] == "must_change_password"

    # Expired token
    expired_jwt = create_access_token(user_id, UserRole.TEACHER.value, expires_delta=timedelta(seconds=-10))
    with pytest.raises(HTTPException) as exc:
        decode_token(expired_jwt)
    assert exc.value.status_code == 401


def test_audit_log(db):
    user_id = uuid.uuid4()
    entry = log_action(
        db,
        action="test_action",
        entity_type="test_entity",
        actor_user_id=None,
        entity_id=str(user_id),
        metadata={"key": "value"},
        ip="192.168.1.1",
    )
    assert entry.id is not None
    assert entry.action == "test_action"
    assert entry.metadata_ == {"key": "value"}


def test_email_console(capsys):
    send_invite_email("test@school.local", "dummy-invite-token")
    captured = capsys.readouterr()
    assert "DEV EMAIL CONSOLE" in captured.out
    assert "test@school.local" in captured.out
    assert "dummy-invite-token" in captured.out

    send_password_reset_email("test@school.local", "dummy-reset-token")
    captured = capsys.readouterr()
    assert "dummy-reset-token" in captured.out


def test_find_user_by_multiple_identifiers(db):
    # Create user
    user = User(
        email="john.doe@school.local",
        password_hash=hash_password("Password#1234"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    student = Student(
        student_code="2026-CS-0001",
        user_id=user.id,
        first_name="John",
        last_name="Doe",
        dob=datetime.now().date(),
        class_name="10",
        section="A",
        department="CS",
        admission_date=datetime.now().date(),
    )
    db.add(student)
    db.commit()

    # Find by email (case-insensitive)
    found_by_email = find_user_by_identifier(db, "JOHN.DOE@SCHOOL.LOCAL")
    assert found_by_email is not None
    assert found_by_email.id == user.id

    # Find by student code
    found_by_code = find_user_by_identifier(db, "2026-CS-0001")
    assert found_by_code is not None
    assert found_by_code.id == user.id

    # Non-existent
    assert find_user_by_identifier(db, "nobody@nowhere.com") is None


def test_account_lockout_and_reset(db):
    user = User(
        email="victim@school.local",
        password_hash=hash_password("Password#1234"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.commit()

    # Fail login 4 times
    for _ in range(MAX_FAILED_ATTEMPTS - 1):
        handle_failed_login(db, user)
        assert user.status == UserStatus.ACTIVE.value

    # 5th failure -> Lock
    handle_failed_login(db, user)
    assert user.status == UserStatus.LOCKED.value
    assert user.locked_until is not None

    # Successful login resets
    reset_failed_login(db, user)
    assert user.status == UserStatus.ACTIVE.value
    assert user.failed_login_count == 0
    assert user.locked_until is None


def test_refresh_token_rotation_and_reuse_detection(db):
    user = User(
        email="rotate@school.local",
        password_hash=hash_password("Password#1234"),
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.commit()

    # 1. Create first session
    raw_token_1, db_token_1 = create_refresh_token_session(db, user.id)
    assert db_token_1.family_id is not None

    # 2. Legitimate rotation: rotate token_1 -> token_2
    new_access_token, raw_token_2 = rotate_refresh_token(db, raw_token_1)
    assert new_access_token is not None
    assert raw_token_2 != raw_token_1

    # 3. REUSE ATTACK: attacker uses token_1 again!
    with pytest.raises(HTTPException) as exc:
        rotate_refresh_token(db, raw_token_1)
    assert exc.value.status_code == 401
    assert "Token reuse detected" in exc.value.detail

    # 4. Token 2 should now also be invalidated because family was revoked!
    with pytest.raises(HTTPException) as exc2:
        rotate_refresh_token(db, raw_token_2)
    assert exc2.value.status_code == 401

