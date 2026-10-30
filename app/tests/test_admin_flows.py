import concurrent.futures
import uuid
from datetime import date, datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models.id_counter import IdCounter
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services.id_generator import generate_employee_code, generate_student_code


def test_concurrent_id_generation(db):
    """Verify that multiple concurrent threads generate strictly unique IDs."""
    test_db_url = settings.DATABASE_URL.replace("student_mgmt", "student_mgmt_test")
    test_engine = create_engine(test_db_url, pool_size=10, max_overflow=5)
    SessionClass = sessionmaker(bind=test_engine)

    def worker_student_code(dept: str):
        session = SessionClass()
        try:
            code = generate_student_code(session, 2026, dept)
            session.commit()
            return code
        finally:
            session.close()

    # Generate 20 IDs concurrently in "CS" department
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(worker_student_code, "CS") for _ in range(20)]
        codes = [f.result() for f in futures]

    assert len(codes) == 20
    assert len(set(codes)) == 20  # All unique!
    # All start with 2026-CS-
    for c in codes:
        assert c.startswith("2026-CS-")


def test_admin_create_student_flow(client, db):
    # Setup admin user and token
    admin = User(
        email="admin.creator@school.edu",
        password_hash=hash_password("AdminPass#1234"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()

    admin_token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {admin_token}"}

    payload = {
        "email": "new.student@school.edu",
        "first_name": "Bob",
        "last_name": "Marley",
        "dob": "2008-05-15",
        "class_name": "10",
        "section": "A",
        "department": "ENG",
        "admission_date": "2026-08-01",
        "guardian_name": "Rita Marley",
        "guardian_phone": "1234567890",
        "guardian_email": "rita@school.edu",
    }

    resp = client.post("/api/v1/admin/students", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["student"]["first_name"] == "Bob"
    assert data["student"]["student_code"].startswith("2026-ENG-")
    assert data["user_status"] == UserStatus.INVITED.value
    assert data["invite_token"] is not None

    # Check duplicate email rejection
    dup_resp = client.post("/api/v1/admin/students", json=payload, headers=headers)
    assert dup_resp.status_code == 409


def test_role_enforcement_student_forbidden(client, db):
    # Setup regular student
    student_user = User(
        email="regular.student@school.edu",
        password_hash=hash_password("StudentPass#1234"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.commit()

    token = create_access_token(student_user.id, student_user.role)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "email": "hacked@school.edu",
        "first_name": "Bad",
        "last_name": "Actor",
        "dob": "2008-01-01",
        "class_name": "10",
        "section": "A",
        "department": "CS",
        "admission_date": "2026-01-01",
    }
    resp = client.post("/api/v1/admin/students", json=payload, headers=headers)
    assert resp.status_code == 403


def test_admin_create_teacher_flow(client, db):
    admin = User(
        email="super.admin.creator@school.edu",
        password_hash=hash_password("SuperAdminPass#1234"),
        role=UserRole.SUPER_ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()

    token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "email": "professor.x@school.edu",
        "first_name": "Charles",
        "last_name": "Xavier",
        "department": "Genetics",
        "phone": "+1987654321",
    }

    resp = client.post("/api/v1/admin/teachers", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["teacher"]["first_name"] == "Charles"
    assert data["teacher"]["employee_code"].startswith("EMP-")
    assert data["user_status"] == UserStatus.INVITED.value


def test_admin_user_status_management(client, db):
    admin = User(
        email="manager@school.edu",
        password_hash=hash_password("ManagerPass#1234"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    target = User(
        email="target.user@school.edu",
        password_hash=hash_password("TargetPass#1234"),
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add_all([admin, target])
    db.commit()

    headers = {"Authorization": f"Bearer {create_access_token(admin.id, admin.role)}"}

    # 1. List users
    list_resp = client.get("/api/v1/admin/users?role=teacher", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # 2. Suspend target user
    susp_resp = client.patch(f"/api/v1/admin/users/{target.id}/suspend", headers=headers)
    assert susp_resp.status_code == 200
    assert susp_resp.json()["status"] == UserStatus.SUSPENDED.value

    # 3. Activate target user
    act_resp = client.patch(f"/api/v1/admin/users/{target.id}/activate", headers=headers)
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == UserStatus.ACTIVE.value

    # 4. Deactivate target user
    deact_resp = client.patch(f"/api/v1/admin/users/{target.id}/deactivate", headers=headers)
    assert deact_resp.status_code == 200
    assert deact_resp.json()["status"] == UserStatus.DEACTIVATED.value

    # 5. Trigger password reset
    reset_resp = client.post(f"/api/v1/admin/users/{target.id}/trigger-password-reset", headers=headers)
    assert reset_resp.status_code == 200
    assert "Password reset link sent" in reset_resp.json()["message"]
