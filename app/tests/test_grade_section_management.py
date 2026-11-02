import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.classroom import TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


@pytest.fixture
def grade_section_fixtures(db: Session):
    unique = uuid.uuid4().hex[:6]

    # Academic Year
    year = AcademicYear(
        name=f"2026-2027-{unique}",
        start_date=date(2026, 9, 1),
        end_date=date(2027, 6, 30),
        is_current=True,
        status="active",
    )
    db.add(year)

    # Admin User
    admin_user = User(
        email=f"admin_gs_{unique}@example.com",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(admin_user)

    # Teacher 1 (Active)
    t1_user = User(
        email=f"teacher1_gs_{unique}@example.com",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(t1_user)
    db.flush()

    teacher1 = Teacher(
        user_id=t1_user.id,
        employee_code=f"EMP-GS1-{unique}",
        first_name="Amit",
        last_name="Sharma",
        department="Mathematics",
    )
    db.add(teacher1)

    # Teacher 2 (Active)
    t2_user = User(
        email=f"teacher2_gs_{unique}@example.com",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(t2_user)
    db.flush()

    teacher2 = Teacher(
        user_id=t2_user.id,
        employee_code=f"EMP-GS2-{unique}",
        first_name="Priya",
        last_name="Verma",
        department="Science",
    )
    db.add(teacher2)

    # Inactive/Deactivated Teacher
    tinactive_user = User(
        email=f"teacher_inact_{unique}@example.com",
        role=UserRole.TEACHER.value,
        status=UserStatus.DEACTIVATED.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(tinactive_user)
    db.flush()

    teacher_inactive = Teacher(
        user_id=tinactive_user.id,
        employee_code=f"EMP-INACT-{unique}",
        first_name="Inactive",
        last_name="Teacher",
        department="English",
    )
    db.add(teacher_inactive)

    # Student 1
    s1_user = User(
        email=f"student1_gs_{unique}@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s1_user)
    db.flush()

    student1 = Student(
        user_id=s1_user.id,
        student_code=f"STU-GS1-{unique}",
        first_name="Rohan",
        last_name="Gupta",
        dob=date(2008, 5, 10),
        admission_date=date(2025, 9, 1),
        class_name="Pending",
        section="Pending",
        department="General",
        status="active",
    )
    db.add(student1)

    # Student 2
    s2_user = User(
        email=f"student2_gs_{unique}@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s2_user)
    db.flush()

    student2 = Student(
        user_id=s2_user.id,
        student_code=f"STU-GS2-{unique}",
        first_name="Sneha",
        last_name="Patel",
        dob=date(2008, 6, 15),
        admission_date=date(2025, 9, 1),
        class_name="Pending",
        section="Pending",
        department="General",
        status="active",
    )
    db.add(student2)

    db.commit()

    return {
        "year": year,
        "admin_user": admin_user,
        "teacher1": teacher1,
        "t1_user": t1_user,
        "teacher2": teacher2,
        "t2_user": t2_user,
        "teacher_inactive": teacher_inactive,
        "student1": student1,
        "student2": student2,
        "unique": unique,
    }


def test_grade_crud_and_duplicate_validation(client: TestClient, grade_section_fixtures: dict):
    data = grade_section_fixtures
    token = create_access_token(data["admin_user"].id, role=UserRole.ADMIN.value)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Grade 10
    payload = {
        "name": f"Grade 10-{data['unique']}",
        "code": f"G10-{data['unique']}"[:15],
        "description": "Secondary level",
        "level": 10,
        "academic_year_id": str(data["year"].id),
        "coordinator_teacher_id": str(data["teacher1"].id),
    }
    res = client.post("/api/v1/admin/grades", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    grade = res.json()
    assert grade["name"] == payload["name"]
    assert grade["coordinator_name"] == "Amit Sharma"

    # 2. Duplicate grade name in same year rejected (409)
    res_dup = client.post("/api/v1/admin/grades", json=payload, headers=headers)
    assert res_dup.status_code == 409

    # 3. List grades
    res_list = client.get("/api/v1/admin/grades", headers=headers)
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 1


def test_section_crud_and_teacher_assignment(client: TestClient, grade_section_fixtures: dict):
    data = grade_section_fixtures
    token = create_access_token(data["admin_user"].id, role=UserRole.ADMIN.value)
    headers = {"Authorization": f"Bearer {token}"}

    # Create Grade
    g_res = client.post(
        "/api/v1/admin/grades",
        json={
            "name": f"Grade 9-{data['unique']}",
            "academic_year_id": str(data["year"].id),
            "level": 9,
        },
        headers=headers,
    )
    grade_id = g_res.json()["id"]

    # 1. Create Section 9-A with Teacher 1
    sec_payload = {
        "grade_id": grade_id,
        "name": "9-A",
        "code": "SEC-9A",
        "academic_year_id": str(data["year"].id),
        "class_capacity": 2,
        "assigned_teacher_id": str(data["teacher1"].id),
    }
    sec_res = client.post("/api/v1/admin/sections", json=sec_payload, headers=headers)
    assert sec_res.status_code == 201
    section = sec_res.json()
    assert section["assigned_teacher_name"] == "Amit Sharma"
    sec_id = section["id"]

    # 2. Duplicate section name in same grade rejected (409)
    sec_dup = client.post("/api/v1/admin/sections", json=sec_payload, headers=headers)
    assert sec_dup.status_code == 409

    # 3. Reassign Class Teacher to Teacher 2
    reassign_res = client.post(
        f"/api/v1/admin/sections/{sec_id}/assign-teacher",
        json={"teacher_id": str(data["teacher2"].id)},
        headers=headers,
    )
    assert reassign_res.status_code == 200
    assert reassign_res.json()["teacher_name"] == "Priya Verma"

    # 4. Inactive teacher assignment rejected (400)
    inact_res = client.post(
        f"/api/v1/admin/sections/{sec_id}/assign-teacher",
        json={"teacher_id": str(data["teacher_inactive"].id)},
        headers=headers,
    )
    assert inact_res.status_code == 400


def test_student_enrollment_and_transfer(client: TestClient, grade_section_fixtures: dict):
    data = grade_section_fixtures
    token = create_access_token(data["admin_user"].id, role=UserRole.ADMIN.value)
    headers = {"Authorization": f"Bearer {token}"}

    # Create Grade and 2 Sections
    g_res = client.post(
        "/api/v1/admin/grades",
        json={"name": f"Grade 8-{data['unique']}", "academic_year_id": str(data["year"].id), "level": 8},
        headers=headers,
    )
    grade_id = g_res.json()["id"]

    s1_res = client.post(
        "/api/v1/admin/sections",
        json={"grade_id": grade_id, "name": "8-A", "academic_year_id": str(data["year"].id), "class_capacity": 1},
        headers=headers,
    )
    sec1_id = s1_res.json()["id"]

    s2_res = client.post(
        "/api/v1/admin/sections",
        json={"grade_id": grade_id, "name": "8-B", "academic_year_id": str(data["year"].id), "class_capacity": 10},
        headers=headers,
    )
    sec2_id = s2_res.json()["id"]

    # 1. Enroll Student 1 in Section 8-A
    enroll_payload = {
        "grade_id": grade_id,
        "section_id": sec1_id,
        "academic_year_id": str(data["year"].id),
    }
    en_res = client.post(
        f"/api/v1/admin/students/{data['student1'].id}/enroll",
        json=enroll_payload,
        headers=headers,
    )
    assert en_res.status_code == 200
    enrollment = en_res.json()
    assert enrollment["section_name"] == "8-A"
    assert enrollment["status"] == "ACTIVE"

    # 2. Capacity overflow check: Section 8-A has capacity 1, student 2 enrollment must fail
    en_res2 = client.post(
        f"/api/v1/admin/students/{data['student2'].id}/enroll",
        json=enroll_payload,
        headers=headers,
    )
    assert en_res2.status_code == 400
    assert "maximum capacity" in en_res2.json()["detail"].lower()

    # 3. Double active enrollment in same year for Student 1 rejected
    en_res_dup = client.post(
        f"/api/v1/admin/students/{data['student1'].id}/enroll",
        json={"grade_id": grade_id, "section_id": sec2_id, "academic_year_id": str(data["year"].id)},
        headers=headers,
    )
    assert en_res_dup.status_code == 400
    assert "already actively enrolled" in en_res_dup.json()["detail"].lower()

    # 4. Transfer Student 1 from 8-A to 8-B
    transfer_payload = {
        "target_section_id": sec2_id,
        "reason": "Section rebalancing",
    }
    tr_res = client.post(
        f"/api/v1/admin/students/{data['student1'].id}/transfer",
        json=transfer_payload,
        headers=headers,
    )
    assert tr_res.status_code == 200
    assert tr_res.json()["section_name"] == "8-B"

    # 5. Check enrollment history (must contain 2 records: TRANSFERRED and ACTIVE)
    hist_res = client.get(f"/api/v1/admin/students/{data['student1'].id}/enrollments", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 2
    statuses = [h["status"] for h in history]
    assert "ACTIVE" in statuses
    assert "TRANSFERRED" in statuses


def test_teacher_section_access_and_authorization(client: TestClient, grade_section_fixtures: dict):
    data = grade_section_fixtures
    admin_token = create_access_token(data["admin_user"].id, role=UserRole.ADMIN.value)
    t1_token = create_access_token(data["t1_user"].id, role=UserRole.TEACHER.value)
    t2_token = create_access_token(data["t2_user"].id, role=UserRole.TEACHER.value)

    # Admin creates Grade and Section, assigns Teacher 1
    g_res = client.post(
        "/api/v1/admin/grades",
        json={"name": f"Grade 7-{data['unique']}", "academic_year_id": str(data["year"].id), "level": 7},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    grade_id = g_res.json()["id"]

    s_res = client.post(
        "/api/v1/admin/sections",
        json={
            "grade_id": grade_id,
            "name": "7-A",
            "academic_year_id": str(data["year"].id),
            "assigned_teacher_id": str(data["teacher1"].id),
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    sec_id = s_res.json()["id"]

    # 1. Non-admin cannot create Grade (403)
    forbidden_res = client.post(
        "/api/v1/admin/grades",
        json={"name": "Grade Hack", "academic_year_id": str(data["year"].id), "level": 1},
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert forbidden_res.status_code == 403

    # 2. Teacher 1 sees 7-A in /teacher/my-sections
    my_sec_res = client.get("/api/v1/teacher/my-sections", headers={"Authorization": f"Bearer {t1_token}"})
    assert my_sec_res.status_code == 200
    my_sections = my_sec_res.json()["sections"]
    sec_ids = [s["section_id"] for s in my_sections]
    assert sec_id in sec_ids

    # 3. Teacher 1 can access student roster of 7-A
    t1_roster = client.get(f"/api/v1/teacher/sections/{sec_id}/students", headers={"Authorization": f"Bearer {t1_token}"})
    assert t1_roster.status_code == 200

    # 4. Teacher 2 (unassigned) requesting 7-A gets 404 (ownership security rule)
    t2_roster = client.get(f"/api/v1/teacher/sections/{sec_id}/students", headers={"Authorization": f"Bearer {t2_token}"})
    assert t2_roster.status_code == 404


def test_list_academic_years_endpoint(client, db, grade_section_fixtures):
    """Verify GET /api/v1/admin/academic-years returns list of active academic years."""
    admin_token = create_access_token(grade_section_fixtures["admin_user"].id, grade_section_fixtures["admin_user"].role)
    res = client.get(
        "/api/v1/admin/academic-years",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    item = data[0]
    assert "id" in item
    assert "name" in item
    assert "is_current" in item
    assert item["status"] == "active"

