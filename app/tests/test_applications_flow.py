import uuid
import pytest

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models.application import Application, ApplicationStatus
from app.models.user import User, UserRole, UserStatus


def test_online_applications_feature_flag_disabled(client):
    settings.ENABLE_ONLINE_APPLICATIONS = False

    resp = client.post(
        "/api/v1/applications",
        json={
            "first_name": "Test",
            "last_name": "Applicant",
            "email": "applicant@school.edu",
            "department": "CS",
        },
    )
    assert resp.status_code == 503
    assert "disabled" in resp.json()["detail"].lower()


def test_online_applications_full_lifecycle(client, db):
    settings.ENABLE_ONLINE_APPLICATIONS = True

    # 1. Submit application
    app_payload = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada@school.edu",
        "phone": "+1234567890",
        "department": "CS",
        "message": "Excited to study computer science!",
    }
    submit_res = client.post("/api/v1/applications", json=app_payload)
    assert submit_res.status_code == 201, submit_res.text
    app_data = submit_res.json()
    app_id = app_data["id"]
    assert app_data["email_verified"] is False
    assert app_data["status"] == ApplicationStatus.PENDING.value

    # 2. Verify email
    verify_res = client.get(f"/api/v1/applications/{app_id}/verify-email")
    assert verify_res.status_code == 200

    # 3. Admin views pending applications
    admin = User(
        email="app.admin@school.edu",
        password_hash=hash_password("AdminPass#1234"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()

    admin_headers = {"Authorization": f"Bearer {create_access_token(admin.id, admin.role)}"}
    list_res = client.get("/api/v1/admin/applications?status=pending", headers=admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Admin approves application -> triggers Flow A
    approve_res = client.post(f"/api/v1/admin/applications/{app_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200, approve_res.text
    approve_data = approve_res.json()
    assert approve_data["student_code"].startswith("2026-CS-")
    assert approve_data["invite_token"] is not None

    # Check student and user were created
    created_user = db.query(User).filter_by(email="ada@school.edu").first()
    assert created_user is not None
    assert created_user.status == UserStatus.INVITED.value
    assert created_user.student is not None
    assert created_user.student.student_code == approve_data["student_code"]


def test_online_application_rejection(client, db):
    settings.ENABLE_ONLINE_APPLICATIONS = True

    submit_res = client.post(
        "/api/v1/applications",
        json={
            "first_name": "Reject",
            "last_name": "Candidate",
            "email": "reject.candidate@school.edu",
            "department": "Art",
        },
    )
    app_id = submit_res.json()["id"]

    admin = User(
        email="reviewer@school.edu",
        password_hash=hash_password("Pass#1234"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()

    admin_headers = {"Authorization": f"Bearer {create_access_token(admin.id, admin.role)}"}
    reject_res = client.post(f"/api/v1/admin/applications/{app_id}/reject", headers=admin_headers)
    assert reject_res.status_code == 200
    assert "rejected" in reject_res.json()["message"].lower()

    app_record = db.get(Application, uuid.UUID(app_id))
    assert app_record.status == ApplicationStatus.REJECTED.value
