import datetime as dt
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.academic_structure import AcademicYear, Grade, Section, TeacherSubject
from app.models.classroom import Subject, TeacherAssignment
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


def _create_token(user: User) -> str:
    return create_access_token(user.id, user.role)


@pytest.fixture
def teacher_subject_fixture(db: Session):
    uid = uuid.uuid4().hex[:6]

    # Admin User
    admin = User(
        email=f"admin_ts_{uid}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash="fakehash",
    )

    # Teacher 1 (Rahul Sharma)
    t1_user = User(
        email=f"rahul_{uid}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash="fakehash",
    )

    # Teacher 2 (Priya Patel)
    t2_user = User(
        email=f"priya_{uid}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash="fakehash",
    )

    db.add_all([admin, t1_user, t2_user])
    db.flush()

    teacher_1 = Teacher(
        user_id=t1_user.id,
        first_name="Rahul",
        last_name="Sharma",
        employee_code=f"EMP-TS-{uid[:4]}-1",
        department="Mathematics & Science",
        phone="9876543211",
    )
    teacher_2 = Teacher(
        user_id=t2_user.id,
        first_name="Priya",
        last_name="Patel",
        employee_code=f"EMP-TS-{uid[:4]}-2",
        department="Science",
        phone="9876543212",
    )
    db.add_all([teacher_1, teacher_2])
    db.flush()

    # Academic Year
    ay = AcademicYear(
        name=f"AY-TS-{uid}",
        start_date=dt.date(2026, 6, 1),
        end_date=dt.date(2027, 5, 31),
        is_current=True,
        status="active",
    )
    db.add(ay)
    db.flush()

    # Grades & Sections
    g2 = Grade(name=f"Grade 2-{uid}", code=f"G2{uid[:3]}", academic_year_id=ay.id, level=2)
    g3 = Grade(name=f"Grade 3-{uid}", code=f"G3{uid[:3]}", academic_year_id=ay.id, level=3)
    db.add_all([g2, g3])
    db.flush()

    sec_2a = Section(name="Section A", code=f"2A-{uid[:3]}", grade_id=g2.id, academic_year_id=ay.id, class_capacity=30, status="active")
    sec_3b = Section(name="Section B", code=f"3B-{uid[:3]}", grade_id=g3.id, academic_year_id=ay.id, class_capacity=30, status="active")
    db.add_all([sec_2a, sec_3b])
    db.flush()

    # Subjects: Mathematics, Science, English
    math = Subject(name="Mathematics", code=f"MATH-{uid[:3]}", status="active")
    science = Subject(name="Science", code=f"SCI-{uid[:3]}", status="active")
    english = Subject(name="English", code=f"ENG-{uid[:3]}", status="active")
    db.add_all([math, science, english])
    db.flush()

    # Assign Teacher 1 as Class Teacher only for Section 2-A
    assign = TeacherAssignment(
        teacher_id=teacher_1.id,
        section_id=sec_2a.id,
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        academic_year=ay.name,
        start_date=dt.date.today(),
        is_active=True,
        status="active",
    )
    db.add(assign)
    db.commit()

    return {
        "admin": admin,
        "teacher_1_user": t1_user,
        "teacher_1": teacher_1,
        "teacher_2_user": t2_user,
        "teacher_2": teacher_2,
        "academic_year": ay,
        "grade_2": g2,
        "grade_3": g3,
        "section_2a": sec_2a,
        "section_3b": sec_3b,
        "subject_math": math,
        "subject_science": science,
        "subject_english": english,
    }


def test_admin_assign_multiple_subjects_and_grades(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])

    # Admin assigns Rahul Sharma:
    # 1. Mathematics -> Grade 2, Section A
    # 2. Science -> Grade 2, Section A
    # 3. Mathematics -> Grade 3, Section B
    payload = {
        "teacher_id": str(fix["teacher_1"].id),
        "academic_year_id": str(fix["academic_year"].id),
        "assignments": [
            {
                "subject_id": str(fix["subject_math"].id),
                "grade_id": str(fix["grade_2"].id),
                "section_id": str(fix["section_2a"].id),
            },
            {
                "subject_id": str(fix["subject_science"].id),
                "grade_id": str(fix["grade_2"].id),
                "section_id": str(fix["section_2a"].id),
            },
            {
                "subject_id": str(fix["subject_math"].id),
                "grade_id": str(fix["grade_3"].id),
                "section_id": str(fix["section_3b"].id),
            },
        ],
    }

    resp = client.post(
        "/api/v1/admin/teacher-subjects",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert len(data) == 3

    # Verify assignments returned
    subjs = [item["subject_name"] for item in data]
    assert "Mathematics" in subjs
    assert "Science" in subjs

    grades = [item["grade_name"] for item in data]
    assert fix["grade_2"].name in grades
    assert fix["grade_3"].name in grades


def test_duplicate_subject_assignment_rejected(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])

    # 1. First assignment: Math to Grade 2 Section A
    payload = {
        "teacher_id": str(fix["teacher_1"].id),
        "academic_year_id": str(fix["academic_year"].id),
        "assignments": [
            {
                "subject_id": str(fix["subject_math"].id),
                "grade_id": str(fix["grade_2"].id),
                "section_id": str(fix["section_2a"].id),
            }
        ],
    }
    resp1 = client.post(
        "/api/v1/admin/teacher-subjects",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp1.status_code == 201

    # 2. Attempt assigning the exact same subject, grade, section, year to same teacher -> 409 CONFLICT
    resp2 = client.post(
        "/api/v1/admin/teacher-subjects",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp2.status_code == 409
    assert "already assigned" in resp2.json()["detail"].lower()


def test_view_teachers_by_subject(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])

    # Assign Math to Teacher 1 (Grade 2-A) and Teacher 2 (Grade 3-B)
    client.post(
        "/api/v1/admin/teacher-subjects",
        json={
            "teacher_id": str(fix["teacher_1"].id),
            "academic_year_id": str(fix["academic_year"].id),
            "assignments": [{"subject_id": str(fix["subject_math"].id), "grade_id": str(fix["grade_2"].id)}],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    client.post(
        "/api/v1/admin/teacher-subjects",
        json={
            "teacher_id": str(fix["teacher_2"].id),
            "academic_year_id": str(fix["academic_year"].id),
            "assignments": [{"subject_id": str(fix["subject_math"].id), "grade_id": str(fix["grade_3"].id)}],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Admin queries teachers assigned to Mathematics
    resp = client.get(
        f"/api/v1/admin/teacher-subjects/subject/{fix['subject_math'].id}/teachers",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    teachers = resp.json()
    assert len(teachers) == 2
    names = [t["teacher_name"] for t in teachers]
    assert "Rahul Sharma" in names
    assert "Priya Patel" in names


def test_teacher_self_service_isolation(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])
    t1_token = _create_token(fix["teacher_1_user"])
    t2_token = _create_token(fix["teacher_2_user"])

    # Assign Teacher 1 Mathematics, Teacher 2 Science
    client.post(
        "/api/v1/admin/teacher-subjects",
        json={
            "teacher_id": str(fix["teacher_1"].id),
            "academic_year_id": str(fix["academic_year"].id),
            "assignments": [{"subject_id": str(fix["subject_math"].id)}],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    client.post(
        "/api/v1/admin/teacher-subjects",
        json={
            "teacher_id": str(fix["teacher_2"].id),
            "academic_year_id": str(fix["academic_year"].id),
            "assignments": [{"subject_id": str(fix["subject_science"].id)}],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Teacher 1 views own subjects
    t1_resp = client.get(
        "/api/v1/teacher/my-subjects",
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert t1_resp.status_code == 200
    t1_subjects = t1_resp.json()
    assert len(t1_subjects) == 1
    assert t1_subjects[0]["subject_name"] == "Mathematics"

    # Teacher 2 views own subjects
    t2_resp = client.get(
        "/api/v1/teacher/my-subjects",
        headers={"Authorization": f"Bearer {t2_token}"},
    )
    assert t2_resp.status_code == 200
    t2_subjects = t2_resp.json()
    assert len(t2_subjects) == 1
    assert t2_subjects[0]["subject_name"] == "Science"

    # Teacher cannot access admin endpoints
    forbidden_resp = client.post(
        "/api/v1/admin/teacher-subjects",
        json={"teacher_id": str(fix["teacher_1"].id), "assignments": []},
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert forbidden_resp.status_code == 403


def test_attendance_isolation_preserved(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])
    t1_token = _create_token(fix["teacher_1_user"])

    # Teacher 1 is Class Teacher for Section 2-A, BUT only a subject teacher for Section 3-B
    client.post(
        "/api/v1/admin/teacher-subjects",
        json={
            "teacher_id": str(fix["teacher_1"].id),
            "academic_year_id": str(fix["academic_year"].id),
            "assignments": [
                {
                    "subject_id": str(fix["subject_math"].id),
                    "grade_id": str(fix["grade_3"].id),
                    "section_id": str(fix["section_3b"].id),
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Teacher 1 attempts to take daily attendance for Section 3-B -> MUST BE REJECTED (404/403)
    target_dt = dt.date.today()
    while target_dt.weekday() in (5, 6):
        target_dt -= dt.timedelta(days=1)

    fail_resp = client.post(
        f"/api/v1/teacher/attendance/sections/{fix['section_3b'].id}",
        json={
            "date": target_dt.isoformat(),
            "period": 1,
            "records": [{"student_id": "00000000-0000-0000-0000-000000000001", "status": "PRESENT"}],
        },
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert fail_resp.status_code in (403, 404)
    print("PASS: Subject assignment alone correctly does NOT grant attendance marking permissions.")


def test_delete_subject_deactivates_assignments(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])

    # First assign math to teacher 1
    assign_resp = client.post(
        "/api/v1/admin/teacher-subjects",
        json={
            "teacher_id": str(fix["teacher_1"].id),
            "academic_year_id": str(fix["academic_year"].id),
            "assignments": [
                {
                    "subject_id": str(fix["subject_math"].id),
                    "grade_id": str(fix["grade_2"].id),
                    "section_id": str(fix["section_2a"].id),
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert assign_resp.status_code == 201

    # Delete subject
    del_resp = client.delete(
        f"/api/v1/admin/subjects/{fix['subject_math'].id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 200
    assert "deactivated successfully" in del_resp.json()["message"]

    # Verify subject is no longer in active list
    list_resp = client.get(
        "/api/v1/admin/subjects",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_resp.status_code == 200
    sub_ids = [s["id"] for s in list_resp.json()["items"]]
    assert str(fix["subject_math"].id) not in sub_ids


def test_delete_teacher_deactivates_teacher_and_assignments(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])

    # Assign science to teacher 2
    client.post(
        "/api/v1/admin/teacher-subjects",
        json={
            "teacher_id": str(fix["teacher_2"].id),
            "academic_year_id": str(fix["academic_year"].id),
            "assignments": [
                {
                    "subject_id": str(fix["subject_science"].id),
                    "grade_id": str(fix["grade_3"].id),
                    "section_id": str(fix["section_3b"].id),
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Deactivate teacher 2
    del_resp = client.delete(
        f"/api/v1/admin/teachers/{fix['teacher_2'].id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 200
    assert "deactivated successfully" in del_resp.json()["message"]

    # Verify teacher 2's user account is suspended
    user_resp = client.get(
        f"/api/v1/admin/users?search={fix['teacher_2_user'].email}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert user_resp.status_code == 200
    items = user_resp.json()["items"]
    assert len(items) > 0
    assert items[0]["status"] == "suspended"


def test_teacher_profile_with_assigned_sections(client: TestClient, teacher_subject_fixture):
    fix = teacher_subject_fixture
    admin_token = _create_token(fix["admin"])

    # Teacher 1 has class teacher assignment for section 2a in fixture
    profile_resp = client.get(
        f"/api/v1/admin/teacher-subjects/teachers/{fix['teacher_1'].id}/profile",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert profile_resp.status_code == 200
    data = profile_resp.json()
    assert data["teacher_id"] == str(fix["teacher_1"].id)
    assert data["full_name"] == "Rahul Sharma"
    assert len(data["assigned_sections"]) >= 1
    assert data["assigned_sections"][0]["role"] == "Class Teacher"



