import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.core.security import generate_secure_token, hash_password, hash_token
from app.models.invite import Invite
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus


def test_login_success_and_me(client, db):
    pw = "CorrectHorseBatteryStaple#2026"
    user = User(
        email="student.login@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    student = Student(
        student_code="2026-CS-0002",
        user_id=user.id,
        first_name="Alice",
        last_name="Smith",
        dob=datetime.now().date(),
        class_name="12",
        section="B",
        department="CS",
        admission_date=datetime.now().date(),
    )
    db.add(student)
    db.commit()

    # 1. Login with email
    resp1 = client.post("/api/v1/auth/login", json={"identifier": "student.login@school.edu", "password": pw})
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    assert "access_token" in data1
    assert "refresh_token" in resp1.cookies

    # 2. Login with student code
    resp2 = client.post("/api/v1/auth/login", json={"identifier": "2026-CS-0002", "password": pw})
    assert resp2.status_code == 200

    # 3. Call /auth/me with access token
    headers = {"Authorization": f"Bearer {data1['access_token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "student.login@school.edu"
    assert me_data["student"]["student_code"] == "2026-CS-0002"


def test_login_invalid_credentials_and_lockout(client, db):
    user = User(
        email="test.lock@school.edu",
        password_hash=hash_password("RealPassword#1234"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.commit()

    # 4 bad attempts
    for _ in range(4):
        r = client.post("/api/v1/auth/login", json={"identifier": "test.lock@school.edu", "password": "WrongPassword"})
        assert r.status_code == 401
        assert r.json()["detail"] == "Invalid credentials"

    # 5th bad attempt -> triggers lock
    r5 = client.post("/api/v1/auth/login", json={"identifier": "test.lock@school.edu", "password": "WrongPassword"})
    assert r5.status_code == 401

    # 6th attempt (even with right password) is rejected with locked status
    r6 = client.post("/api/v1/auth/login", json={"identifier": "test.lock@school.edu", "password": "RealPassword#1234"})
    assert r6.status_code == 403
    assert "locked" in r6.json()["detail"].lower()


def test_must_change_password_flow(client, db):
    pw = "InitialTempPass#123"
    user = User(
        email="newuser@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        must_change_password=True,
    )
    db.add(user)
    db.commit()

    # Login returns restricted token
    resp = client.post("/api/v1/auth/login", json={"identifier": "newuser@school.edu", "password": pw})
    assert resp.status_code == 200
    data = resp.json()
    assert data["must_change_password"] is True
    temp_token = data["temp_token"]

    # Changing password with temp token
    headers = {"Authorization": f"Bearer {temp_token}"}
    new_pw = "BrandNewSuperSecure#2026"
    change_resp = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": pw, "new_password": new_pw},
        headers=headers,
    )
    assert change_resp.status_code == 200

    # Normal login now works with new password
    login_resp = client.post("/api/v1/auth/login", json={"identifier": "newuser@school.edu", "password": new_pw})
    assert login_resp.status_code == 200
    assert login_resp.json()["must_change_password"] is False


def test_accept_invite_flow(client, db):
    user = User(
        email="invited@school.edu",
        password_hash=None,
        role=UserRole.TEACHER.value,
        status=UserStatus.INVITED.value,
    )
    db.add(user)
    db.flush()

    raw_token = generate_secure_token()
    invite = Invite(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
    )
    db.add(invite)
    db.commit()

    new_pw = "TeacherActivated#2026"
    accept_resp = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": raw_token, "new_password": new_pw},
    )
    assert accept_resp.status_code == 200

    # Token cannot be reused
    re_resp = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": raw_token, "new_password": new_pw},
    )
    assert re_resp.status_code == 400

    # User can now login
    login_resp = client.post("/api/v1/auth/login", json={"identifier": "invited@school.edu", "password": new_pw})
    assert login_resp.status_code == 200


def test_forgot_and_reset_password_flow(client, db):
    user = User(
        email="reset.me@school.edu",
        password_hash=hash_password("OldPassword#1234"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.commit()

    # Forgot password returns generic 200
    resp = client.post("/api/v1/auth/forgot-password", json={"email": "reset.me@school.edu"})
    assert resp.status_code == 200

    # Unknown email returns same generic 200
    resp_anon = client.post("/api/v1/auth/forgot-password", json={"email": "unknown@school.edu"})
    assert resp_anon.status_code == 200
    assert resp.json()["message"] == resp_anon.json()["message"]


def test_refresh_token_cookie_rotation(client, db):
    pw = "PasswordForCookie#2026"
    user = User(
        email="cookie.user@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.commit()

    login_res = client.post("/api/v1/auth/login", json={"identifier": "cookie.user@school.edu", "password": pw})
    assert login_res.status_code == 200
    cookie_val = login_res.cookies.get("refresh_token")
    assert cookie_val is not None

    # Refresh endpoint using cookie
    refresh_res = client.post("/api/v1/auth/refresh", cookies={"refresh_token": cookie_val})
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()
    new_cookie_val = refresh_res.cookies.get("refresh_token")
    assert new_cookie_val is not None
    assert new_cookie_val != cookie_val
