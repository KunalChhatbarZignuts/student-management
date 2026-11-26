import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.models
from app.db.base import Base
from app.core.deps import get_db, get_current_user
from app.main import app
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.auth.invite_models import Invite
from app.core.security import hash_password, create_access_token


@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def super_admin_user(test_db):
    user = User(
        id=uuid.uuid4(),
        email="super_admin_test@school.internal",
        password_hash=hash_password("SuperSecret123!"),
        role=UserRole.SUPER_ADMIN.value,
        status=UserStatus.ACTIVE.value,
        must_change_password=False,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture(scope="function")
def regular_admin_user(test_db):
    user = User(
        id=uuid.uuid4(),
        email="regular_admin_test@school.internal",
        password_hash=hash_password("AdminSecret123!"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        must_change_password=False,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture(scope="function")
def super_admin_client(test_db, super_admin_user):
    def override_get_db():
        yield test_db

    def override_get_current_user():
        return super_admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def regular_admin_client(test_db, regular_admin_user):
    def override_get_db():
        yield test_db

    def override_get_current_user():
        return regular_admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_super_admin_create_admin_success(super_admin_client, test_db):
    """Super Admin can provision a new Administrator account with specific permissions."""
    admin_email = f"new_admin_{uuid.uuid4().hex[:6]}@school.internal"
    response = super_admin_client.post(
        "/api/v1/admin/users/create-admin",
        json={
            "email": admin_email,
            "first_name": "Fee",
            "last_name": "Desk",
            "permissions": ["fees"],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == admin_email
    assert data["role"] == UserRole.ADMIN.value
    assert data["status"] == UserStatus.INVITED.value
    assert data["admin_permissions"] == ["fees"]

    # Verify Invite record generated
    created_user = test_db.execute(select(User).where(User.email == admin_email)).scalar_one()
    invite = test_db.execute(select(Invite).where(Invite.user_id == created_user.id)).scalar_one_or_none()
    assert invite is not None


def test_super_admin_update_admin_permissions(super_admin_client, test_db):
    """Super Admin can update granular module permissions for an Admin."""
    target_admin = User(
        id=uuid.uuid4(),
        email=f"target_admin_{uuid.uuid4().hex[:6]}@school.internal",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        admin_permissions=["admissions"],
    )
    test_db.add(target_admin)
    test_db.commit()

    # Update permissions
    res = super_admin_client.patch(
        f"/api/v1/admin/users/{target_admin.id}/permissions",
        json={"permissions": ["fees", "attendance"]},
    )
    assert res.status_code == 200
    assert res.json()["admin_permissions"] == ["fees", "attendance"]


def test_scoped_admin_permission_guard(test_db):
    """Admin lacking specific permission gets HTTP 403 when invoking require_admin_permission."""
    from app.core.deps import require_admin_permission
    from fastapi import Request

    scoped_admin = User(
        id=uuid.uuid4(),
        email=f"scoped_admin_{uuid.uuid4().hex[:6]}@school.internal",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        admin_permissions=["fees"],
    )

    class DummyRequest:
        url = type("URL", (), {"path": "/api/v1/students"})()

    fees_guard = require_admin_permission("fees")
    students_guard = require_admin_permission("students")

    # Allowed for 'fees'
    assert fees_guard(DummyRequest(), current_user=scoped_admin) == scoped_admin

    # Denied for 'students'
    with pytest.raises(Exception) as exc:
        students_guard(DummyRequest(), current_user=scoped_admin)
    assert exc.value.status_code == 403
    assert "students" in exc.value.detail


def test_regular_admin_cannot_create_admin(regular_admin_client):
    """Regular Admin must receive HTTP 403 when attempting to provision an Admin."""
    response = regular_admin_client.post(
        "/api/v1/admin/users/create-admin",
        json={"email": "hacked_admin@school.internal"},
    )
    assert response.status_code == 403


def test_regular_admin_cannot_suspend_super_admin_or_admin(regular_admin_client, super_admin_user, test_db):
    """Regular Admin cannot suspend Super Admin or another Admin."""
    # Attempt on Super Admin
    res1 = regular_admin_client.patch(
        f"/api/v1/admin/users/{super_admin_user.id}/suspend",
    )
    assert res1.status_code == 403

    # Create target admin
    target_admin = User(
        id=uuid.uuid4(),
        email=f"target_admin_{uuid.uuid4().hex[:6]}@school.internal",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    test_db.add(target_admin)
    test_db.commit()

    # Attempt on another Admin by regular admin
    res2 = regular_admin_client.patch(
        f"/api/v1/admin/users/{target_admin.id}/suspend",
    )
    assert res2.status_code == 403


def test_super_admin_can_suspend_and_activate_admin(super_admin_client, test_db):
    """Super Admin can suspend and reactivate Administrator accounts."""
    target_admin = User(
        id=uuid.uuid4(),
        email=f"target_admin_{uuid.uuid4().hex[:6]}@school.internal",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    test_db.add(target_admin)
    test_db.commit()

    # Suspend
    res_suspend = super_admin_client.patch(
        f"/api/v1/admin/users/{target_admin.id}/suspend",
    )
    assert res_suspend.status_code == 200
    assert res_suspend.json()["status"] == UserStatus.SUSPENDED.value

    # Activate
    res_activate = super_admin_client.patch(
        f"/api/v1/admin/users/{target_admin.id}/activate",
    )
    assert res_activate.status_code == 200
    assert res_activate.json()["status"] == UserStatus.ACTIVE.value


def test_super_admin_system_overview(super_admin_client):
    """Super Admin can fetch system statistics and platform overview."""
    response = super_admin_client.get(
        "/api/v1/admin/users/system-overview",
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_admins" in data
    assert "total_users" in data
    assert data["system_status"] == "healthy"


def test_super_admin_create_admin_with_direct_password(super_admin_client, test_db):
    """Super Admin can provision an admin with direct password setting."""
    email = f"direct_pass_admin_{uuid.uuid4().hex[:6]}@school.internal"
    direct_pass = "DirectPassword123!"

    response = super_admin_client.post(
        "/api/v1/admin/users/create-admin",
        json={
            "email": email,
            "first_name": "Direct",
            "last_name": "Admin",
            "permissions": ["students", "academics"],
            "password": direct_pass,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email
    assert data["status"] == UserStatus.ACTIVE.value

    # Check user record in database
    created_user = test_db.execute(select(User).where(User.email == email)).scalar_one()
    assert created_user.password_hash is not None
    assert created_user.status == UserStatus.ACTIVE.value
    assert created_user.admin_permissions == ["students", "academics"]

    # No invite token should be created since password was set directly
    invite = test_db.execute(select(Invite).where(Invite.user_id == created_user.id)).scalar_one_or_none()
    assert invite is None


def test_super_admin_create_admin_with_weak_password_fails(super_admin_client):
    """Super Admin provisioning fails if provided password is weak or too short."""
    email = f"weak_pass_admin_{uuid.uuid4().hex[:6]}@school.internal"
    response = super_admin_client.post(
        "/api/v1/admin/users/create-admin",
        json={
            "email": email,
            "password": "short",
        },
    )
    assert response.status_code == 400
    assert "at least 10 characters" in response.json()["detail"]

