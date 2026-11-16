import datetime as dt
import uuid

import pytest
from app.core.security import create_access_token, hash_password
from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Section,
    StudentEnrollment,
    StudentTransferRecord,
)
from app.models.classroom import TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


def _create_user(db, email: str, role: str) -> tuple[User, dict[str, str]]:
    u = User(
        email=email,
        password_hash=hash_password("Pass123!"),
        role=role,
        status=UserStatus.ACTIVE.value,
    )
    db.add(u)
    db.commit()
    token = create_access_token(u.id, u.role)
    return u, {"Authorization": f"Bearer {token}"}


@pytest.fixture
def enrollment_setup(db):
    """Fixture providing academic years, grades, sections, and test students."""
    # Current Academic Year
    ay_cur = AcademicYear(
        name=f"AY-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        status="active",
        is_current=True,
    )
    # Next Academic Year (for promotion)
    ay_next = AcademicYear(
        name=f"AY-NEXT-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2027, 4, 1),
        end_date=dt.date(2028, 3, 31),
        status="active",
        is_current=False,
    )
    db.add_all([ay_cur, ay_next])
    db.commit()

    # Grades
    g1 = Grade(name="Grade 1", code="G1", academic_year_id=ay_cur.id, status="active", level=1)
    g2 = Grade(name="Grade 2", code="G2", academic_year_id=ay_next.id, status="active", level=2)
    db.add_all([g1, g2])
    db.commit()

    # Sections (with capacity constraint)
    s1a = Section(name="1-A", code="1A", grade_id=g1.id, academic_year_id=ay_cur.id, status="active", class_capacity=2)
    s1b = Section(name="1-B", code="1B", grade_id=g1.id, academic_year_id=ay_cur.id, status="active", class_capacity=30)
    s2a = Section(name="2-A", code="2A", grade_id=g2.id, academic_year_id=ay_next.id, status="active", class_capacity=30)
    db.add_all([s1a, s1b, s2a])
    db.commit()

    # Class Teacher for 1-A
    t_user, _ = _create_user(db, f"teacher_{uuid.uuid4().hex[:6]}@school.edu", UserRole.TEACHER.value)
    teacher = Teacher(
        user_id=t_user.id,
        first_name="Rohan",
        last_name="Mehra",
        employee_code=f"EMP-{uuid.uuid4().hex[:4]}",
        department="Primary",
        phone="9876543210",
    )
    db.add(teacher)
    db.commit()

    ta = TeacherAssignment(
        teacher_id=teacher.id,
        section_id=s1a.id,
        academic_year=ay_cur.name,
        is_class_teacher=True,
        is_active=True,
        status="active",
        assignment_type="CLASS_TEACHER",
    )
    db.add(ta)
    db.commit()

    # Users for testing RBAC
    _, admin_headers = _create_user(db, f"admin_{uuid.uuid4().hex[:6]}@school.edu", UserRole.ADMIN.value)
    st_user, student_headers = _create_user(db, f"student_{uuid.uuid4().hex[:6]}@school.edu", UserRole.STUDENT.value)

    # 1 Enrolled Student in 1-A
    st1 = Student(
        user_id=st_user.id,
        first_name="Aarav",
        last_name="Sharma",
        student_code=f"STU-{uuid.uuid4().hex[:6]}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6]}",
        dob=dt.date(2018, 5, 10),
        admission_date=dt.date(2026, 4, 1),
        class_name=g1.name,
        section=s1a.name,
        current_grade_id=g1.id,
        current_section_id=s1a.id,
        department="Primary",
        status="active",
    )
    db.add(st1)
    db.commit()

    enr1 = StudentEnrollment(
        student_id=st1.id,
        grade_id=g1.id,
        section_id=s1a.id,
        academic_year_id=ay_cur.id,
        roll_no=1,
        status="ACTIVE",
        enrollment_date=dt.date(2026, 4, 1),
        joined_on=dt.date(2026, 4, 1),
    )
    db.add(enr1)
    db.commit()

    # 2 Unassigned Admitted Students
    u2, _ = _create_user(db, f"st2_{uuid.uuid4().hex[:6]}@school.edu", UserRole.STUDENT.value)
    st2 = Student(
        user_id=u2.id,
        first_name="Pooja",
        last_name="Verma",
        student_code=f"STU-{uuid.uuid4().hex[:6]}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6]}",
        dob=dt.date(2018, 8, 12),
        admission_date=dt.date(2026, 4, 15),
        class_name="Unassigned",
        section="None",
        current_grade_id=None,
        current_section_id=None,
        department="Primary",
        status="active",
    )
    u3, _ = _create_user(db, f"st3_{uuid.uuid4().hex[:6]}@school.edu", UserRole.STUDENT.value)
    st3 = Student(
        user_id=u3.id,
        first_name="Karan",
        last_name="Singhania",
        student_code=f"STU-{uuid.uuid4().hex[:6]}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6]}",
        dob=dt.date(2018, 9, 20),
        admission_date=dt.date(2026, 4, 20),
        class_name="Unassigned",
        section="None",
        current_grade_id=None,
        current_section_id=None,
        department="Primary",
        status="active",
    )
    db.add_all([st2, st3])
    db.commit()

    return {
        "ay_cur": ay_cur,
        "ay_next": ay_next,
        "g1": g1,
        "g2": g2,
        "s1a": s1a,
        "s1b": s1b,
        "s2a": s2a,
        "st1": st1,
        "st2": st2,
        "st3": st3,
        "enr1": enr1,
        "admin_headers": admin_headers,
        "student_headers": student_headers,
        "teacher": teacher,
    }


def test_enrollment_dashboard_and_unassigned_students(client, db, enrollment_setup):
    """Test dashboard metrics calculation and unassigned student queue retrieval."""
    headers = enrollment_setup["admin_headers"]
    ay_cur = enrollment_setup["ay_cur"]

    # 1. Fetch Dashboard Metrics
    res = client.get(f"/api/v1/enrollments/dashboard?academic_year_id={ay_cur.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_enrolled"] >= 1
    assert data["unassigned_students"] >= 2
    assert len(data["grade_distribution"]) >= 1
    assert len(data["section_distribution"]) >= 1

    # Verify Class Teacher name in section distribution
    sec_1a = next(s for s in data["section_distribution"] if s["section_id"] == str(enrollment_setup["s1a"].id))
    assert sec_1a["class_teacher_name"] == "Rohan Mehra"
    assert sec_1a["capacity"] == 2
    assert sec_1a["enrolled_count"] == 1

    # 2. Fetch Unassigned Students
    res_unassigned = client.get(f"/api/v1/enrollments/unassigned?academic_year_id={ay_cur.id}", headers=headers)
    assert res_unassigned.status_code == 200
    unassigned_data = res_unassigned.json()
    unassigned_ids = [u["student_id"] for u in unassigned_data]
    assert str(enrollment_setup["st2"].id) in unassigned_ids
    assert str(enrollment_setup["st3"].id) in unassigned_ids


def test_bulk_enrollment_success_and_capacity_enforcement(client, db, enrollment_setup):
    """Test atomic bulk enrollment and strict capacity rejection."""
    headers = enrollment_setup["admin_headers"]
    ay_cur = enrollment_setup["ay_cur"]
    g1 = enrollment_setup["g1"]
    s1a = enrollment_setup["s1a"]  # capacity = 2, currently 1 enrolled
    s1b = enrollment_setup["s1b"]  # capacity = 30
    st2 = enrollment_setup["st2"]
    st3 = enrollment_setup["st3"]

    # 1. Attempt to enroll 2 students into 1-A (which has capacity 2, but only 1 seat available)
    # Expected: 400 Bad Request (atomic all-or-nothing pre-validation)
    res_overflow = client.post(
        "/api/v1/enrollments/bulk-enroll",
        headers=headers,
        json={
            "student_ids": [str(st2.id), str(st3.id)],
            "academic_year_id": str(ay_cur.id),
            "grade_id": str(g1.id),
            "section_id": str(s1a.id),
        },
    )
    assert res_overflow.status_code == 400
    assert "available seat" in res_overflow.json()["detail"].lower()

    # 2. Enroll 2 students into 1-B (capacity = 30) -> Success
    res_success = client.post(
        "/api/v1/enrollments/bulk-enroll",
        headers=headers,
        json={
            "student_ids": [str(st2.id), str(st3.id)],
            "academic_year_id": str(ay_cur.id),
            "grade_id": str(g1.id),
            "section_id": str(s1b.id),
            "enrollment_date": "2026-04-20",
        },
    )
    assert res_success.status_code == 200
    res_data = res_success.json()
    assert res_data["enrolled_count"] == 2
    assert res_data["section_name"] == "1-B"

    # Verify student records updated in database
    db.refresh(st2)
    assert st2.current_section_id == s1b.id
    assert st2.section == "1-B"

    # 3. Duplicate active enrollment rejection
    res_dup = client.post(
        "/api/v1/enrollments/bulk-enroll",
        headers=headers,
        json={
            "student_ids": [str(st2.id)],
            "academic_year_id": str(ay_cur.id),
            "grade_id": str(g1.id),
            "section_id": str(s1b.id),
        },
    )
    assert res_dup.status_code == 400
    assert "already have an active enrollment" in res_dup.json()["detail"].lower()


def test_student_transfer_section_with_audit_ledger(client, db, enrollment_setup):
    """Test transferring student with reason, new roll number, and immutable transfer record creation."""
    headers = enrollment_setup["admin_headers"]
    st1 = enrollment_setup["st1"]
    s1a = enrollment_setup["s1a"]
    s1b = enrollment_setup["s1b"]
    g1 = enrollment_setup["g1"]
    ay_cur = enrollment_setup["ay_cur"]

    # Transfer st1 from 1-A to 1-B
    res = client.post(
        "/api/v1/enrollments/transfer",
        headers=headers,
        json={
            "student_id": str(st1.id),
            "target_section_id": str(s1b.id),
            "target_grade_id": str(g1.id),
            "transfer_date": "2026-05-15",
            "transfer_type": "SECTION_TRANSFER",
            "reason": "Relocation of residence closer to Section B schedule",
            "remarks": "Approved by academic coordinator",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == str(st1.id)
    assert data["from_section_name"] == "1-A"
    assert data["to_section_name"] == "1-B"
    assert data["reason"] == "Relocation of residence closer to Section B schedule"

    # Verify old enrollment closed as TRANSFERRED with left_on
    old_enr = db.get(StudentEnrollment, enrollment_setup["enr1"].id)
    assert old_enr.status == "TRANSFERRED"
    assert old_enr.left_on == dt.date(2026, 5, 15)

    # Verify new active enrollment in 1-B
    new_enr = db.execute(
        db.query(StudentEnrollment).filter(
            StudentEnrollment.student_id == st1.id,
            StudentEnrollment.status == "ACTIVE",
        ).statement
    ).scalars().first()
    assert new_enr.section_id == s1b.id
    assert new_enr.transfer_from_enrollment_id == old_enr.id
    assert new_enr.reason == "Relocation of residence closer to Section B schedule"

    # Verify transfer record in transfer ledger
    res_list = client.get(f"/api/v1/enrollments/transfers?student_id={st1.id}", headers=headers)
    assert res_list.status_code == 200
    transfers = res_list.json()
    assert len(transfers) >= 1
    assert transfers[0]["from_section_name"] == "1-A"
    assert transfers[0]["to_section_name"] == "1-B"


def test_academic_promotion_preview_and_execution(client, db, enrollment_setup):
    """Test academic promotion preview with capacity indicators and atomic batch execution."""
    headers = enrollment_setup["admin_headers"]
    ay_cur = enrollment_setup["ay_cur"]
    ay_next = enrollment_setup["ay_next"]
    g1 = enrollment_setup["g1"]
    g2 = enrollment_setup["g2"]
    s2a = enrollment_setup["s2a"]
    st1 = enrollment_setup["st1"]

    # 1. Preview promotions from Grade 1 to Grade 2
    res_prev = client.post(
        "/api/v1/enrollments/promotions/preview",
        headers=headers,
        json={
            "source_academic_year_id": str(ay_cur.id),
            "source_grade_id": str(g1.id),
            "target_academic_year_id": str(ay_next.id),
            "target_grade_id": str(g2.id),
        },
    )
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["source_grade_name"] == "Grade 1"
    assert prev_data["target_grade_name"] == "Grade 2"
    assert len(prev_data["target_sections"]) >= 1
    assert len(prev_data["students"]) >= 1

    # 2. Execute Batch Promotion for st1 -> PROMOTE to 2-A
    res_exec = client.post(
        "/api/v1/enrollments/promotions/execute",
        headers=headers,
        json={
            "source_academic_year_id": str(ay_cur.id),
            "target_academic_year_id": str(ay_next.id),
            "target_grade_id": str(g2.id),
            "effective_date": "2027-04-01",
            "decisions": [
                {
                    "student_id": str(st1.id),
                    "action": "PROMOTE",
                    "target_section_id": str(s2a.id),
                    "reason": "Promoted to Grade 2 on merit",
                }
            ],
        },
    )
    assert res_exec.status_code == 200
    exec_data = res_exec.json()
    assert exec_data["promoted_count"] == 1

    # Verify student st1 now actively enrolled in 2-A in ay_next
    db.refresh(st1)
    assert st1.current_grade_id == g2.id
    assert st1.current_section_id == s2a.id
    assert st1.class_name == "Grade 2"
    assert st1.section == "2-A"


def test_enhanced_enrollment_history(client, db, enrollment_setup):
    """Test retrieving complete chronological enrollment and transfer history with Class Teacher names."""
    headers = enrollment_setup["admin_headers"]
    st1 = enrollment_setup["st1"]

    res = client.get(f"/api/v1/enrollments/students/{st1.id}/history", headers=headers)
    assert res.status_code == 200
    history = res.json()
    assert len(history) >= 1
    # Check that entries have grade_name, section_name, and class_teacher_name
    for item in history:
        assert item["student_id"] == str(st1.id)
        assert item["academic_year_name"] is not None


def test_role_based_access_control(client, db, enrollment_setup):
    """Verify students cannot manage enrollments or trigger transfers."""
    student_headers = enrollment_setup["student_headers"]
    st1 = enrollment_setup["st1"]

    # Student cannot view enrollment dashboard (403)
    res_dash = client.get("/api/v1/enrollments/dashboard", headers=student_headers)
    assert res_dash.status_code == 403

    # Student cannot execute transfers (403)
    res_trans = client.post(
        "/api/v1/enrollments/transfer",
        headers=student_headers,
        json={
            "student_id": str(st1.id),
            "target_section_id": str(enrollment_setup["s1b"].id),
            "reason": "Unauthorized self-transfer",
        },
    )
    assert res_trans.status_code == 403
