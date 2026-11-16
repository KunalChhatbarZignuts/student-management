import datetime as dt
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.models.classroom import TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


def _create_token(user: User) -> str:
    return create_access_token(user.id, user.role)


@pytest.fixture
def class_attendance_fixture(db: Session):
    # Admin User
    admin = User(
        email=f"admin_att_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Admin@123"),
    )
    # Teacher 1 (Assigned)
    t1_user = User(
        email=f"t1_att_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Teacher@123"),
    )
    # Teacher 2 (Unassigned)
    t2_user = User(
        email=f"t2_att_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Teacher@123"),
    )
    db.add_all([admin, t1_user, t2_user])
    db.flush()

    teacher_1 = Teacher(
        user_id=t1_user.id,
        first_name="Alice",
        last_name="Johnson",
        employee_code=f"TCH-{uuid.uuid4().hex[:4]}",
        phone="9876543210",
        department="Elementary",
    )
    teacher_2 = Teacher(
        user_id=t2_user.id,
        first_name="Bob",
        last_name="Smith",
        employee_code=f"TCH-{uuid.uuid4().hex[:4]}",
        phone="9876543211",
        department="Science",
    )
    db.add_all([teacher_1, teacher_2])
    db.flush()

    # Academic Year
    ay = AcademicYear(
        name=f"AY-ATT-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        is_current=True,
        status="active",
    )
    db.add(ay)
    db.flush()

    # Grade 2
    grade_2 = Grade(
        name=f"Grade 2-{uuid.uuid4().hex[:4]}",
        code=f"G2-{uuid.uuid4().hex[:4]}",
        level=2,
        academic_year_id=ay.id,
        status="active",
    )
    db.add(grade_2)
    db.flush()

    # Section 2-A
    sec_2a = Section(
        name="Section A",
        code=f"G2-A-{uuid.uuid4().hex[:4]}",
        grade_id=grade_2.id,
        academic_year_id=ay.id,
        class_capacity=30,
        status="active",
    )
    # Section 2-B
    sec_2b = Section(
        name="Section B",
        code=f"G2-B-{uuid.uuid4().hex[:4]}",
        grade_id=grade_2.id,
        academic_year_id=ay.id,
        class_capacity=30,
        status="active",
    )
    db.add_all([sec_2a, sec_2b])
    db.flush()

    # Assign Teacher 1 to Section 2-A
    assignment = TeacherAssignment(
        teacher_id=teacher_1.id,
        section_id=sec_2a.id,
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        is_active=True,
        status="active",
    )
    db.add(assignment)
    db.flush()

    # Students for Section 2-A
    students = []
    enrollments = []
    for i in range(1, 4):
        s_user = User(
            email=f"stu_att_{uuid.uuid4().hex[:6]}@school.edu",
            role=UserRole.STUDENT.value,
            status=UserStatus.ACTIVE.value,
            password_hash=hash_password("Student@123"),
        )
        db.add(s_user)
        db.flush()

        stu = Student(
            user_id=s_user.id,
            first_name=f"Student{i}",
            last_name="Test",
            student_code=f"STU-ATT-{uuid.uuid4().hex[:6]}",
            enrollment_number=f"ENR-2026-{uuid.uuid4().hex[:4]}",
            dob=dt.date(2018, 5, 10),
            gender="MALE" if i % 2 == 1 else "FEMALE",
            class_name="Grade 2",
            section="Section A",
            department="Elementary",
            admission_date=dt.date(2026, 4, 1),
            status="active",
        )
        db.add(stu)
        db.flush()
        students.append(stu)

        enr = StudentEnrollment(
            student_id=stu.id,
            academic_year_id=ay.id,
            grade_id=grade_2.id,
            section_id=sec_2a.id,
            roll_no=i,
            status="ACTIVE",
            enrollment_date=dt.date(2026, 4, 1),
        )
        db.add(enr)
        db.flush()
        enrollments.append(enr)

    db.commit()

    return {
        "admin": admin,
        "teacher_1": teacher_1,
        "teacher_1_user": t1_user,
        "teacher_2": teacher_2,
        "teacher_2_user": t2_user,
        "academic_year": ay,
        "grade_2": grade_2,
        "sec_2a": sec_2a,
        "sec_2b": sec_2b,
        "students": students,
        "enrollments": enrollments,
    }


def test_teacher_assigned_sections(client: TestClient, class_attendance_fixture):
    fix = class_attendance_fixture
    t1_token = _create_token(fix["teacher_1_user"])
    t2_token = _create_token(fix["teacher_2_user"])

    # Teacher 1 should see Section 2-A
    resp = client.get(
        "/api/v1/teacher/attendance/sections",
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    sec_ids = [d["section_id"] for d in data]
    assert str(fix["sec_2a"].id) in sec_ids
    sec_data = next(d for d in data if d["section_id"] == str(fix["sec_2a"].id))
    assert sec_data["enrolled_students_count"] == 3

    # Teacher 2 (unassigned) should see 0 sections
    resp2 = client.get(
        "/api/v1/teacher/attendance/sections",
        headers={"Authorization": f"Bearer {t2_token}"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert not any(d["section_id"] == str(fix["sec_2a"].id) for d in data2)


def test_section_roster_access(client: TestClient, class_attendance_fixture):
    fix = class_attendance_fixture
    t1_token = _create_token(fix["teacher_1_user"])
    t2_token = _create_token(fix["teacher_2_user"])

    # Teacher 1 gets roster
    resp = client.get(
        f"/api/v1/teacher/attendance/sections/{fix['sec_2a'].id}/roster",
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert resp.status_code == 200
    roster = resp.json()
    assert len(roster) == 3
    assert roster[0]["roll_no"] == 1

    # Teacher 2 gets 403 Forbidden for Section 2-A
    resp2 = client.get(
        f"/api/v1/teacher/attendance/sections/{fix['sec_2a'].id}/roster",
        headers={"Authorization": f"Bearer {t2_token}"},
    )
    assert resp2.status_code == 403


def test_mark_and_retrieve_section_attendance(client: TestClient, class_attendance_fixture):
    fix = class_attendance_fixture
    t1_token = _create_token(fix["teacher_1_user"])
    students = fix["students"]

    target_date = dt.date.today().isoformat()

    payload = {
        "date": target_date,
        "period": 1,
        "records": [
            {"student_id": str(students[0].id), "status": "PRESENT", "remark": None},
            {"student_id": str(students[1].id), "status": "ABSENT", "remark": "Sick note"},
            {"student_id": str(students[2].id), "status": "LATE", "remark": "Traffic"},
        ],
    }

    # Submit attendance
    resp = client.post(
        f"/api/v1/teacher/attendance/sections/{fix['sec_2a'].id}",
        json=payload,
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert resp.status_code == 201
    created = resp.json()
    assert created["present_count"] == 1
    assert created["absent_count"] == 1
    assert created["late_count"] == 1
    assert created["total_students"] == 3

    # Duplicate submission on same date/period should return 409 Conflict
    dup_resp = client.post(
        f"/api/v1/teacher/attendance/sections/{fix['sec_2a'].id}",
        json=payload,
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert dup_resp.status_code == 409

    # Retrieve submitted session
    get_resp = client.get(
        f"/api/v1/teacher/attendance/sections/{fix['sec_2a'].id}?date={target_date}&period=1",
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert get_resp.status_code == 200
    retrieved = get_resp.json()
    assert retrieved is not None
    assert retrieved["id"] == created["id"]
    assert len(retrieved["records"]) == 3


def test_future_date_attendance_rejected(client: TestClient, class_attendance_fixture):
    fix = class_attendance_fixture
    t1_token = _create_token(fix["teacher_1_user"])
    future_dt = dt.date.today() + dt.timedelta(days=1)
    while future_dt.weekday() in (5, 6):  # ensure working day (not Sunday/Saturday)
        future_dt += dt.timedelta(days=1)
    future_date = future_dt.isoformat()

    payload = {
        "date": future_date,
        "period": 1,
        "records": [
            {"student_id": str(fix["students"][0].id), "status": "PRESENT"},
        ],
    }

    resp = client.post(
        f"/api/v1/teacher/attendance/sections/{fix['sec_2a'].id}",
        json=payload,
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert resp.status_code == 400
    assert "future date" in resp.json()["detail"].lower()


def test_admin_overview_and_edit_with_audit(client: TestClient, class_attendance_fixture):
    fix = class_attendance_fixture
    admin_token = _create_token(fix["admin"])
    t1_token = _create_token(fix["teacher_1_user"])
    target_dt = dt.date.today()
    while target_dt.weekday() in (5, 6):  # ensure working day (not Sunday/Saturday)
        target_dt -= dt.timedelta(days=1)
    target_date = target_dt.isoformat()

    # Teacher marks yesterday's attendance
    payload = {
        "date": target_date,
        "period": 1,
        "records": [
            {"student_id": str(fix["students"][0].id), "status": "PRESENT"},
            {"student_id": str(fix["students"][1].id), "status": "ABSENT"},
            {"student_id": str(fix["students"][2].id), "status": "PRESENT"},
        ],
    }
    create_resp = client.post(
        f"/api/v1/teacher/attendance/sections/{fix['sec_2a'].id}",
        json=payload,
        headers={"Authorization": f"Bearer {t1_token}"},
    )
    assert create_resp.status_code == 201
    session_data = create_resp.json()
    absent_rec = next(r for r in session_data["records"] if r["student_id"] == str(fix["students"][1].id))

    # Admin checks overview
    ov_resp = client.get(
        f"/api/v1/admin/attendance/overview?date={target_date}&academic_year_id={fix['academic_year'].id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert ov_resp.status_code == 200
    overview = ov_resp.json()
    assert overview["total_sections"] >= 2
    assert overview["marked_sections"] >= 1
    assert overview["total_present"] >= 2
    assert overview["total_absent"] >= 1

    # Admin edits absent record to EXCUSED with mandatory reason
    edit_payload = {
        "status": "EXCUSED",
        "reason": "Parent submitted formal medical certificate",
        "remark": "Medical leave approved",
    }
    edit_resp = client.put(
        f"/api/v1/admin/attendance/records/{absent_rec['id']}",
        json=edit_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert edit_resp.status_code == 200
    edited = edit_resp.json()
    assert edited["status"] == "EXCUSED"

    # Check student attendance history
    stu_hist = client.get(
        f"/api/v1/admin/attendance/students/{fix['students'][1].id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert stu_hist.status_code == 200
    sh_data = stu_hist.json()
    assert sh_data["student_id"] == str(fix["students"][1].id)
    assert sh_data["excused_days"] >= 1

    # Check audit history
    audit_resp = client.get(
        f"/api/v1/admin/attendance/audit-history?section_id={fix['sec_2a'].id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert audit_resp.status_code == 200
    audits = audit_resp.json()
    assert len(audits) >= 1
    matching_audit = next(a for a in audits if a["record_id"] == absent_rec["id"])
    assert matching_audit["previous_status"] == "ABSENT"
    assert matching_audit["new_status"] == "EXCUSED"
    assert "medical certificate" in matching_audit["reason"].lower()
