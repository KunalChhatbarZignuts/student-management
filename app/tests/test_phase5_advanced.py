import io
import uuid
from datetime import date, datetime

import pyotp
import pytest

from app.core.security import create_access_token, hash_password
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


def test_2fa_setup_login_and_disable(client, db):
    pw = "AdminStrongPass#2026"
    admin = User(
        email="totp.admin@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()

    token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Setup 2FA
    setup_res = client.post("/api/v1/auth/2fa/setup", headers=headers)
    assert setup_res.status_code == 200, setup_res.text
    data = setup_res.json()
    secret = data["secret"]
    assert secret is not None
    assert "otpauth://" in data["otpauth_url"]

    # 2. Verify with valid code to activate
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()
    verify_res = client.post("/api/v1/auth/2fa/verify", json={"code": valid_code}, headers=headers)
    assert verify_res.status_code == 200

    # 3. Next login will require 2FA
    login_res = client.post("/api/v1/auth/login", json={"identifier": "totp.admin@school.edu", "password": pw})
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["requires_2fa"] is True
    temp_token = login_data["temp_token"]

    # 4. Bad 2FA code fails
    bad_verify = client.post("/api/v1/auth/2fa/verify", json={"code": "000000", "temp_token": temp_token})
    assert bad_verify.status_code == 400

    # 5. Good 2FA code completes login
    good_code = totp.now()
    good_verify = client.post("/api/v1/auth/2fa/verify", json={"code": good_code, "temp_token": temp_token})
    assert good_verify.status_code == 200
    assert "access_token" in good_verify.json()

    # 6. Disable 2FA
    new_token = good_verify.json()["access_token"]
    disable_res = client.post(
        "/api/v1/auth/2fa/disable",
        json={"code": totp.now(), "password": pw},
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert disable_res.status_code == 200


def test_bulk_csv_import_dry_run_and_confirm(client, db):
    admin = User(
        email="bulk.admin@school.edu",
        password_hash=hash_password("AdminPass#1234"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()

    token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    csv_data = """type,email,first_name,last_name,department,dob,class_name,section,admission_date,phone
student,import.stu1@school.edu,Sam,Altman,CS,2006-01-01,11,A,2026-08-01,
teacher,import.tea1@school.edu,Linus,Torvalds,Kernel,,,,,+1234567890
student,invalid.stu@school.edu,,,,,,,,
"""

    # 1. Dry run
    file_payload = {"file": ("students.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    dry_resp = client.post("/api/v1/admin/users/bulk-import?dry_run=true", files=file_payload, headers=headers)
    assert dry_resp.status_code == 200, dry_resp.text
    dry_data = dry_resp.json()
    assert dry_data["dry_run"] is True
    assert dry_data["valid_rows"] == 2
    assert dry_data["invalid_rows"] == 1

    # Ensure no users were created in dry run
    assert db.query(User).filter_by(email="import.stu1@school.edu").first() is None

    # 2. Confirm import
    file_payload2 = {"file": ("students.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    confirm_resp = client.post("/api/v1/admin/users/bulk-import?dry_run=false", files=file_payload2, headers=headers)
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["dry_run"] is False
    assert confirm_data["valid_rows"] == 2

    # Verify user created in DB
    created_stu = db.query(User).filter_by(email="import.stu1@school.edu").first()
    assert created_stu is not None
    assert created_stu.status == UserStatus.INVITED.value


def test_parent_linking_and_ownership(client, db):
    admin = User(
        email="parent.admin@school.edu",
        password_hash=hash_password("AdminPass#1234"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()

    admin_headers = {"Authorization": f"Bearer {create_access_token(admin.id, admin.role)}"}

    # 1. Admin creates parent
    parent_resp = client.post(
        "/api/v1/admin/parents",
        json={"email": "mom@school.edu", "first_name": "Mary", "last_name": "Watson"},
        headers=admin_headers,
    )
    assert parent_resp.status_code == 201
    parent_id = parent_resp.json()["id"]

    # 2. Create two students (one will be linked, one will not)
    s1_resp = client.post(
        "/api/v1/admin/students",
        json={
            "email": "child1@school.edu",
            "first_name": "ChildOne",
            "last_name": "Watson",
            "dob": "2010-01-01",
            "class_name": "8",
            "section": "A",
            "department": "Science",
            "admission_date": "2026-08-01",
        },
        headers=admin_headers,
    )
    assert s1_resp.status_code == 201
    student1_id = s1_resp.json()["student"]["id"]

    s2_resp = client.post(
        "/api/v1/admin/students",
        json={
            "email": "child2.unlinked@school.edu",
            "first_name": "OtherChild",
            "last_name": "Brown",
            "dob": "2010-01-01",
            "class_name": "8",
            "section": "B",
            "department": "Science",
            "admission_date": "2026-08-01",
        },
        headers=admin_headers,
    )
    assert s2_resp.status_code == 201

    # 3. Link parent to child1 only
    link_resp = client.post(
        f"/api/v1/admin/parents/{parent_id}/link-student/{student1_id}",
        headers=admin_headers,
    )
    assert link_resp.status_code == 200

    # 4. Activate parent user
    parent_user = db.query(User).filter_by(email="mom@school.edu").first()
    parent_user.status = UserStatus.ACTIVE.value
    db.commit()

    # 5. Parent calls /parents/me/children
    parent_token = create_access_token(parent_user.id, UserRole.PARENT.value)
    children_resp = client.get("/api/v1/parents/me/children", headers={"Authorization": f"Bearer {parent_token}"})
    assert children_resp.status_code == 200
    children = children_resp.json()
    assert len(children) == 1
    assert children[0]["first_name"] == "ChildOne"


def test_student_and_teacher_ownership(client, db):
    # Setup Student
    stu_user = User(
        email="own.student@school.edu",
        password_hash=hash_password("Pass#1234"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(stu_user)
    db.flush()

    student = Student(
        student_code="2026-PHY-0001",
        user_id=stu_user.id,
        first_name="Albert",
        last_name="Einstein",
        dob=date(2005, 3, 14),
        class_name="12",
        section="A",
        department="Physics",
        admission_date=date(2026, 8, 1),
    )
    db.add(student)

    # Setup Teacher in Physics
    tea_user = User(
        email="prof.physics@school.edu",
        password_hash=hash_password("Pass#1234"),
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(tea_user)
    db.flush()

    teacher = Teacher(
        employee_code="EMP-0099",
        user_id=tea_user.id,
        first_name="Max",
        last_name="Planck",
        department="Physics",
    )
    db.add(teacher)
    db.commit()

    # 1. Student accesses /students/me -> sees own record
    stu_headers = {"Authorization": f"Bearer {create_access_token(stu_user.id, stu_user.role)}"}
    me_res = client.get("/api/v1/students/me", headers=stu_headers)
    assert me_res.status_code == 200
    assert me_res.json()["student_code"] == "2026-PHY-0001"

    # 2. Teacher calls /teachers/me/classes -> sees Albert Einstein in Physics
    tea_headers = {"Authorization": f"Bearer {create_access_token(tea_user.id, tea_user.role)}"}
    classes_res = client.get("/api/v1/teachers/me/classes", headers=tea_headers)
    assert classes_res.status_code == 200
    assert classes_res.json()["department"] == "Physics"
    assert len(classes_res.json()["students"]) >= 1

    # 3. Teacher reports missing student
    report_res = client.post(
        "/api/v1/teachers/missing-student-request",
        json={"student_name": "Niels Bohr", "class_name": "12", "section": "A", "notes": "Not on roster"},
        headers=tea_headers,
    )
    assert report_res.status_code == 200
    assert "submitted successfully" in report_res.json()["message"]
