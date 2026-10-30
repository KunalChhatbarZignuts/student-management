import uuid
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.classroom import Class, Subject, TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


@pytest.fixture
def test_setup_data(db: Session):
    # 1. Admin user
    admin_user = User(
        email="admin_assign@example.com",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(admin_user)

    # 2. Teacher 1 (assigned)
    t1_user = User(
        email="teacher_one@example.com",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(t1_user)
    db.flush()

    teacher1 = Teacher(
        user_id=t1_user.id,
        employee_code="EMP-TEST-001",
        first_name="Grace",
        last_name="Hopper",
        department="Computer Science",
    )
    db.add(teacher1)

    # 3. Teacher 2 (unassigned)
    t2_user = User(
        email="teacher_two@example.com",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(t2_user)
    db.flush()

    teacher2 = Teacher(
        user_id=t2_user.id,
        employee_code="EMP-TEST-002",
        first_name="Margaret",
        last_name="Hamilton",
        department="Mathematics",
    )
    db.add(teacher2)

    # 4. Student user
    s_user = User(
        email="student_assign@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s_user)

    # 5. Class and Subject
    cls1 = Class(
        name="Grade 11",
        section="A",
        academic_year="2026-2027",
        department="Computer Science",
        status="active",
    )
    db.add(cls1)

    subj1 = Subject(
        name="Algorithms",
        code="ALG-201",
        status="active",
    )
    db.add(subj1)
    db.flush()

    # 6. Active Student in Grade 11-A
    s1_user = User(
        email="student_active@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s1_user)
    db.flush()
    student_active = Student(
        user_id=s1_user.id,
        student_code="2026-CS-0099",
        first_name="Linus",
        last_name="Torvalds",
        dob=date(2007, 5, 20),
        class_name="Grade 11",
        section="A",
        department="Computer Science",
        admission_date=date(2026, 9, 1),
        status="active",
    )
    db.add(student_active)

    # 7. Inactive / Suspended Student in Grade 11-A (should NOT appear in active roster)
    s2_user = User(
        email="student_suspended@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.SUSPENDED.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s2_user)
    db.flush()
    student_suspended = Student(
        user_id=s2_user.id,
        student_code="2026-CS-0098",
        first_name="Suspended",
        last_name="User",
        dob=date(2007, 6, 15),
        class_name="Grade 11",
        section="A",
        department="Computer Science",
        admission_date=date(2026, 9, 1),
        status="suspended",
    )
    db.add(student_suspended)

    db.commit()

    return {
        "admin_user": admin_user,
        "t1_user": t1_user,
        "teacher1": teacher1,
        "t2_user": t2_user,
        "teacher2": teacher2,
        "s_user": s_user,
        "class1": cls1,
        "subject1": subj1,
        "student_active": student_active,
        "student_suspended": student_suspended,
    }


def test_admin_create_class_and_subject(client: TestClient, test_setup_data):
    admin = test_setup_data["admin_user"]
    token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Success: Create Class
    res = client.post(
        "/api/v1/admin/classes",
        json={
            "name": "Grade 12",
            "section": "B",
            "academic_year": "2026-2027",
            "department": "Science",
        },
        headers=headers,
    )
    assert res.status_code == 201
    class_id = res.json()["id"]

    # Conflict: Duplicate Class in same year
    res_dup = client.post(
        "/api/v1/admin/classes",
        json={
            "name": "Grade 12",
            "section": "B",
            "academic_year": "2026-2027",
            "department": "Science",
        },
        headers=headers,
    )
    assert res_dup.status_code == 409

    # Success: Create Subject
    res_subj = client.post(
        "/api/v1/admin/subjects",
        json={"name": "Discrete Mathematics", "code": "MATH-202"},
        headers=headers,
    )
    assert res_subj.status_code == 201
    assert res_subj.json()["code"] == "MATH-202"

    # Conflict: Duplicate Subject code
    res_subj_dup = client.post(
        "/api/v1/admin/subjects",
        json={"name": "Another Discrete Math", "code": "MATH-202"},
        headers=headers,
    )
    assert res_subj_dup.status_code == 409


def test_admin_assign_and_unassign_teacher(client: TestClient, test_setup_data):
    admin = test_setup_data["admin_user"]
    t1 = test_setup_data["teacher1"]
    cls1 = test_setup_data["class1"]
    subj1 = test_setup_data["subject1"]

    token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Assign Teacher to Class
    res = client.post(
        "/api/v1/admin/teacher-assignments",
        json={
            "teacher_id": str(t1.id),
            "class_id": str(cls1.id),
            "subject_id": str(subj1.id),
            "is_class_teacher": True,
            "academic_year": "2026-2027",
        },
        headers=headers,
    )
    assert res.status_code == 201
    assignment_id = res.json()["id"]
    assert res.json()["is_class_teacher"] is True

    # Duplicate Assignment Conflict
    res_dup = client.post(
        "/api/v1/admin/teacher-assignments",
        json={
            "teacher_id": str(t1.id),
            "class_id": str(cls1.id),
            "subject_id": str(subj1.id),
            "is_class_teacher": True,
            "academic_year": "2026-2027",
        },
        headers=headers,
    )
    assert res_dup.status_code == 409

    # Unassign Teacher (Soft delete)
    res_unassign = client.delete(
        f"/api/v1/admin/teacher-assignments/{assignment_id}",
        headers=headers,
    )
    assert res_unassign.status_code == 200
    assert "successfully unassigned" in res_unassign.json()["message"]


def test_teacher_roster_and_ownership_404(client: TestClient, test_setup_data):
    admin = test_setup_data["admin_user"]
    t1_user = test_setup_data["t1_user"]
    t1 = test_setup_data["teacher1"]
    t2_user = test_setup_data["t2_user"]
    cls1 = test_setup_data["class1"]
    subj1 = test_setup_data["subject1"]

    admin_token = create_access_token(admin.id, admin.role)
    client.post(
        "/api/v1/admin/teacher-assignments",
        json={
            "teacher_id": str(t1.id),
            "class_id": str(cls1.id),
            "subject_id": str(subj1.id),
            "is_class_teacher": True,
            "academic_year": "2026-2027",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # 1. Teacher 1 checks their assigned classes
    t1_token = create_access_token(t1_user.id, t1_user.role)
    t1_headers = {"Authorization": f"Bearer {t1_token}"}

    res_classes = client.get("/api/v1/teacher/classes", headers=t1_headers)
    assert res_classes.status_code == 200
    assert len(res_classes.json()) >= 1
    assert res_classes.json()[0]["class_id"] == str(cls1.id)

    # 2. Teacher 1 views roster: only active students appear
    res_roster = client.get(f"/api/v1/teacher/classes/{cls1.id}/students", headers=t1_headers)
    assert res_roster.status_code == 200
    data = res_roster.json()
    assert data["total"] == 1
    assert data["items"][0]["student_code"] == "2026-CS-0099"
    assert data["items"][0]["name"] == "Linus Torvalds"
    # Suspended student does NOT appear
    assert all(item["student_code"] != "2026-CS-0098" for item in data["items"])

    # 3. Ownership Enforcement: Teacher 2 (unassigned) requests Class 1
    # MUST return 404 per requirement: "a teacher requesting an unassigned class gets 404"
    t2_token = create_access_token(t2_user.id, t2_user.role)
    t2_headers = {"Authorization": f"Bearer {t2_token}"}

    res_forbidden = client.get(f"/api/v1/teacher/classes/{cls1.id}/students", headers=t2_headers)
    assert res_forbidden.status_code == 404
    assert "not found or not assigned" in res_forbidden.json()["detail"].lower()


def test_wrong_role_access(client: TestClient, test_setup_data):
    s_user = test_setup_data["s_user"]
    token = create_access_token(s_user.id, s_user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Student cannot create classes (403)
    res_admin = client.post(
        "/api/v1/admin/classes",
        json={"name": "Grade 9", "section": "C", "academic_year": "2026-2027", "department": "Science"},
        headers=headers,
    )
    assert res_admin.status_code == 403

    # Student cannot call teacher endpoints (403)
    res_teacher = client.get("/api/v1/teacher/classes", headers=headers)
    assert res_teacher.status_code == 403

