import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.classroom import Class, Subject, TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


@pytest.fixture
def attendance_fixtures(db: Session):
    # Unique suffix to prevent test clashes
    unique = uuid.uuid4().hex[:6]

    # Admin User
    admin_user = User(
        email=f"admin_att_{unique}@example.com",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(admin_user)

    # Teacher 1 (assigned)
    t1_user = User(
        email=f"t1_att_{unique}@example.com",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(t1_user)
    db.flush()

    teacher1 = Teacher(
        user_id=t1_user.id,
        employee_code=f"TCH-{unique}-1",
        first_name="Alan",
        last_name="Turing",
        department="Computer Science",
    )
    db.add(teacher1)

    # Teacher 2 (unassigned)
    t2_user = User(
        email=f"t2_att_{unique}@example.com",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(t2_user)
    db.flush()

    teacher2 = Teacher(
        user_id=t2_user.id,
        employee_code=f"TCH-{unique}-2",
        first_name="Ada",
        last_name="Lovelace",
        department="Mathematics",
    )
    db.add(teacher2)

    # Classroom
    classroom = Class(
        name=f"CS-101-{unique}",
        section="A",
        academic_year="2026-2027",
        department="Computer Science",
        status="active",
    )
    db.add(classroom)

    # Other Class (unassigned)
    other_class = Class(
        name=f"MATH-201-{unique}",
        section="B",
        academic_year="2026-2027",
        department="Mathematics",
        status="active",
    )
    db.add(other_class)

    # Subject
    subject = Subject(
        name=f"Data Structures {unique}",
        code=f"DS-{unique}".upper()[:15],
        status="active",
    )
    db.add(subject)
    db.flush()

    # Assign Teacher 1 to Classroom
    assignment = TeacherAssignment(
        teacher_id=teacher1.id,
        class_id=classroom.id,
        subject_id=subject.id,
        is_class_teacher=True,
        academic_year="2026-2027",
        status="active",
    )
    db.add(assignment)

    # Student 1 in class
    s1_user = User(
        email=f"s1_att_{unique}@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s1_user)
    db.flush()

    student1 = Student(
        user_id=s1_user.id,
        student_code=f"STU-{unique}-1",
        first_name="Alice",
        last_name="Smith",
        dob=date(2008, 1, 1),
        admission_date=date(2025, 9, 1),
        class_name=classroom.name,
        section=classroom.section,
        department="Computer Science",
        status="active",
    )
    db.add(student1)

    # Student 2 in class
    s2_user = User(
        email=f"s2_att_{unique}@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s2_user)
    db.flush()

    student2 = Student(
        user_id=s2_user.id,
        student_code=f"STU-{unique}-2",
        first_name="Bob",
        last_name="Jones",
        dob=date(2008, 2, 2),
        admission_date=date(2025, 9, 1),
        class_name=classroom.name,
        section=classroom.section,
        department="Computer Science",
        status="active",
    )
    db.add(student2)

    # Foreign student in another class
    s_foreign_user = User(
        email=f"sforeign_att_{unique}@example.com",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Password123!"),
    )
    db.add(s_foreign_user)
    db.flush()

    foreign_student = Student(
        user_id=s_foreign_user.id,
        student_code=f"STU-{unique}-F",
        first_name="Foreign",
        last_name="Student",
        dob=date(2008, 3, 3),
        admission_date=date(2025, 9, 1),
        class_name=other_class.name,
        section=other_class.section,
        department="Mathematics",
        status="active",
    )
    db.add(foreign_student)

    db.commit()

    return {
        "admin_user": admin_user,
        "teacher1": teacher1,
        "t1_user": t1_user,
        "teacher2": teacher2,
        "t2_user": t2_user,
        "classroom": classroom,
        "other_class": other_class,
        "subject": subject,
        "student1": student1,
        "s1_user": s1_user,
        "student2": student2,
        "s2_user": s2_user,
        "foreign_student": foreign_student,
    }


def test_bulk_mark_attendance_success(client: TestClient, attendance_fixtures: dict):
    data = attendance_fixtures
    token = create_access_token(data["t1_user"].id, role=UserRole.TEACHER.value)
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.now(timezone.utc).date()
    payload = {
        "class_id": str(data["classroom"].id),
        "subject_id": str(data["subject"].id),
        "date": str(today),
        "period": 1,
        "records": [
            {"student_id": str(data["student1"].id), "status": "PRESENT", "remark": "On time"},
            {"student_id": str(data["student2"].id), "status": "ABSENT", "remark": "Sick note"},
        ],
    }

    res = client.post("/api/v1/teacher/attendance", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["period"] == 1
    assert len(body["records"]) == 2
    statuses = {r["student_id"]: r["status"] for r in body["records"]}
    assert statuses[str(data["student1"].id)] == "PRESENT"
    assert statuses[str(data["student2"].id)] == "ABSENT"


def test_validation_future_date_rejected(client: TestClient, attendance_fixtures: dict):
    data = attendance_fixtures
    token = create_access_token(data["t1_user"].id, role=UserRole.TEACHER.value)
    headers = {"Authorization": f"Bearer {token}"}

    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    payload = {
        "class_id": str(data["classroom"].id),
        "subject_id": str(data["subject"].id),
        "date": str(tomorrow),
        "period": 2,
        "records": [
            {"student_id": str(data["student1"].id), "status": "PRESENT"},
        ],
    }

    res = client.post("/api/v1/teacher/attendance", json=payload, headers=headers)
    assert res.status_code == 400
    assert "future date" in res.json()["detail"].lower()


def test_duplicate_period_returns_409(client: TestClient, attendance_fixtures: dict):
    data = attendance_fixtures
    token = create_access_token(data["t1_user"].id, role=UserRole.TEACHER.value)
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.now(timezone.utc).date()
    payload = {
        "class_id": str(data["classroom"].id),
        "subject_id": str(data["subject"].id),
        "date": str(today),
        "period": 3,
        "records": [
            {"student_id": str(data["student1"].id), "status": "PRESENT"},
        ],
    }

    res1 = client.post("/api/v1/teacher/attendance", json=payload, headers=headers)
    assert res1.status_code == 201

    # Second mark on same slot must return 409 Conflict
    res2 = client.post("/api/v1/teacher/attendance", json=payload, headers=headers)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"].lower()


def test_foreign_student_rejected_atomic_rollback(client: TestClient, attendance_fixtures: dict):
    data = attendance_fixtures
    token = create_access_token(data["t1_user"].id, role=UserRole.TEACHER.value)
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.now(timezone.utc).date()
    payload = {
        "class_id": str(data["classroom"].id),
        "subject_id": str(data["subject"].id),
        "date": str(today),
        "period": 4,
        "records": [
            {"student_id": str(data["student1"].id), "status": "PRESENT"},
            {"student_id": str(data["foreign_student"].id), "status": "PRESENT"},
        ],
    }

    res = client.post("/api/v1/teacher/attendance", json=payload, headers=headers)
    assert res.status_code == 400
    assert "does not belong" in res.json()["detail"].lower()


def test_teacher_unassigned_class_ownership_returns_404(client: TestClient, attendance_fixtures: dict):
    data = attendance_fixtures
    # Teacher 2 is NOT assigned to Classroom
    token = create_access_token(data["t2_user"].id, role=UserRole.TEACHER.value)
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.now(timezone.utc).date()
    payload = {
        "class_id": str(data["classroom"].id),
        "subject_id": str(data["subject"].id),
        "date": str(today),
        "period": 5,
        "records": [
            {"student_id": str(data["student1"].id), "status": "PRESENT"},
        ],
    }

    res = client.post("/api/v1/teacher/attendance", json=payload, headers=headers)
    assert res.status_code == 404
    assert "not assigned" in res.json()["detail"].lower()


def test_edit_window_and_admin_override(client: TestClient, attendance_fixtures: dict, db: Session):
    data = attendance_fixtures
    t1_token = create_access_token(data["t1_user"].id, role=UserRole.TEACHER.value)
    admin_token = create_access_token(data["admin_user"].id, role=UserRole.ADMIN.value)

    # 1. Create a session 25 hours in the past
    past_session = AttendanceSession(
        class_id=data["classroom"].id,
        subject_id=data["subject"].id,
        date=datetime.now(timezone.utc).date() - timedelta(days=2),
        period=1,
        taken_by_teacher_id=data["teacher1"].id,
        created_at=datetime.now(timezone.utc) - timedelta(hours=25),
    )
    db.add(past_session)
    db.flush()

    rec = AttendanceRecord(
        session_id=past_session.id,
        student_id=data["student1"].id,
        status="ABSENT",
    )
    db.add(rec)
    db.commit()

    # 2. Teacher tries to edit expired session -> 403 Forbidden
    patch_payload = {
        "records": [
            {"student_id": str(data["student1"].id), "status": "PRESENT", "remark": "Late arrival excused"}
        ]
    }
    res_teacher = client.patch(
        f"/api/v1/teacher/attendance/{past_session.id}",
        json=patch_payload,
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert res_teacher.status_code == 403
    assert "expired" in res_teacher.json()["detail"].lower()

    # 3. Admin edits expired session -> Success (200)
    res_admin = client.patch(
        f"/api/v1/teacher/attendance/{past_session.id}",
        json=patch_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["records"][0]["status"] == "PRESENT"


def test_attendance_summary_and_student_self_view(client: TestClient, attendance_fixtures: dict):
    data = attendance_fixtures
    t1_token = create_access_token(data["t1_user"].id, role=UserRole.TEACHER.value)
    s1_token = create_access_token(data["s1_user"].id, role=UserRole.STUDENT.value)

    today = datetime.now(timezone.utc).date()

    # Teacher requests class summary
    res_sum = client.get(
        "/api/v1/teacher/attendance/summary",
        params={
            "class_id": str(data["classroom"].id),
            "from": str(today - timedelta(days=7)),
            "to": str(today),
        },
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert res_sum.status_code == 200
    summary = res_sum.json()
    assert summary["class_name"] == data["classroom"].name
    assert len(summary["items"]) >= 2

    # Student requests self attendance
    res_stu = client.get("/api/v1/students/me/attendance", headers={"Authorization": f"Bearer {s1_token}"})
    assert res_stu.status_code == 200
    stu_body = res_stu.json()
    assert "percentage" in stu_body
    assert "total_classes" in stu_body
