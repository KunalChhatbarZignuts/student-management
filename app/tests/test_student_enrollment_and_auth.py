import uuid
import pytest
from datetime import date
from sqlalchemy import select

from app.core.security import hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.services.id_generator import generate_enrollment_number


def test_automatic_enrollment_number_generation(db):
    """Verify enrollment number format is STU-YYYY-XXXXX and increments monotonically."""
    num1 = generate_enrollment_number(db, 2026)
    num2 = generate_enrollment_number(db, 2026)

    assert num1.startswith("STU-2026-")
    assert num2.startswith("STU-2026-")
    assert num1 != num2

    seq1 = int(num1.split("-")[-1])
    seq2 = int(num2.split("-")[-1])
    assert seq2 == seq1 + 1


def test_student_creation_endpoint_generates_enrollment_number_and_enrollment(client, db):
    """Test POST /api/v1/admin/students generates enrollment number and creates initial enrollment atomically."""
    from app.core.security import create_access_token
    # Create an admin user and generate a valid access token
    admin_user = User(
        email="admin.creator@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin_user)
    db.flush()
    admin_token = create_access_token(admin_user.id, admin_user.role)

    # Ensure academic year, grade, section exist
    year = AcademicYear(name="2026-2027-Test", start_date=date(2026, 6, 1), end_date=date(2027, 4, 30), is_current=True)
    db.add(year)
    db.flush()

    grade = Grade(name="Grade 10 Test", code="G10T", level=10, academic_year_id=year.id)
    db.add(grade)
    db.flush()

    sec = Section(grade_id=grade.id, name="10-A-Test", academic_year_id=year.id)
    db.add(sec)
    db.flush()

    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "email": "auto.enroll.test@student.school.edu",
        "first_name": "Rohan",
        "last_name": "Kapoor",
        "dob": "2010-05-15",
        "class_name": "Grade 10 Test",
        "section": "10-A-Test",
        "department": "Science",
        "admission_date": "2026-06-01",
        "academic_year_id": str(year.id),
        "grade_id": str(grade.id),
        "section_id": str(sec.id),
    }

    res = client.post("/api/v1/admin/students", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()

    assert "enrollment_number" in data
    assert data["enrollment_number"].startswith("STU-2026-")
    assert data["student"]["enrollment_number"] == data["enrollment_number"]

    # Verify initial StudentEnrollment record was created atomically
    st_id = uuid.UUID(data["student"]["id"])
    enrollment = db.execute(
        select(StudentEnrollment).where(StudentEnrollment.student_id == st_id)
    ).scalar_one_or_none()
    assert enrollment is not None
    assert enrollment.section_id == sec.id
    assert enrollment.status == "ACTIVE"


def test_student_login_via_enrollment_number(client, db):
    """Verify students can authenticate using their enrollment number instead of email."""
    # Create student with known password
    password = "StudentSecret@1234"
    u = User(
        email="enroll.login.test@school.edu",
        password_hash=hash_password(password),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(u)
    db.flush()

    enrollment_num = generate_enrollment_number(db, 2026)
    st = Student(
        student_code="2026-TEST-9999",
        enrollment_number=enrollment_num,
        user_id=u.id,
        first_name="Priya",
        last_name="Rao",
        dob=date(2011, 3, 10),
        class_name="Grade 9",
        section="A",
        department="General",
        admission_date=date(2026, 6, 1),
        status="active",
    )
    db.add(st)
    db.commit()

    # 1. Login using enrollment_number
    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": enrollment_num, "password": password},
    )
    assert res.status_code == 200, res.text
    token_data = res.json()
    assert "access_token" in token_data
    access_token = token_data["access_token"]

    # 2. Access student portal me & profile endpoints using this token
    st_headers = {"Authorization": f"Bearer {access_token}"}
    me_res = client.get("/api/v1/students/me", headers=st_headers)
    assert me_res.status_code == 200
    assert me_res.json()["enrollment_number"] == enrollment_num

    profile_res = client.get("/api/v1/student/profile", headers=st_headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["enrollment_number"] == enrollment_num


def test_student_login_rejects_inactive_or_wrong_password(client, db):
    """Verify inactive students and incorrect passwords are rejected."""
    password = "StudentSecret@1234"
    u = User(
        email="inactive.student@school.edu",
        password_hash=hash_password(password),
        role=UserRole.STUDENT.value,
        status=UserStatus.SUSPENDED.value,
    )
    db.add(u)
    db.flush()

    enrollment_num = generate_enrollment_number(db, 2026)
    st = Student(
        student_code="2026-TEST-8888",
        enrollment_number=enrollment_num,
        user_id=u.id,
        first_name="Inactive",
        last_name="User",
        dob=date(2011, 3, 10),
        class_name="Grade 9",
        section="A",
        department="General",
        admission_date=date(2026, 6, 1),
        status="active",
    )
    db.add(st)
    db.commit()

    # Attempt login on suspended account
    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": enrollment_num, "password": password},
    )
    assert res.status_code == 403

    # Attempt login with wrong password
    res_wrong_pw = client.post(
        "/api/v1/auth/login",
        json={"identifier": enrollment_num, "password": "WrongPassword@123"},
    )
    assert res_wrong_pw.status_code == 401


def test_student_cannot_access_other_students_data(client, db):
    """Verify student identity is strictly verified from token, not client input."""
    # Student 1
    u1 = User(email="s1@school.edu", password_hash=hash_password("Pass1@1234"), role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    db.add(u1)
    db.flush()
    s1 = Student(student_code="S1-0001", enrollment_number=generate_enrollment_number(db, 2026), user_id=u1.id, first_name="S1", last_name="User", dob=date(2010, 1, 1), class_name="G10", section="A", department="Gen", admission_date=date(2026, 6, 1))
    db.add(s1)

    # Student 2
    u2 = User(email="s2@school.edu", password_hash=hash_password("Pass2@1234"), role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    db.add(u2)
    db.flush()
    s2 = Student(student_code="S2-0002", enrollment_number=generate_enrollment_number(db, 2026), user_id=u2.id, first_name="S2", last_name="User", dob=date(2010, 1, 1), class_name="G10", section="B", department="Gen", admission_date=date(2026, 6, 1))
    db.add(s2)
    db.commit()

    login1 = client.post("/api/v1/auth/login", json={"identifier": s1.enrollment_number, "password": "Pass1@1234"})
    token1 = login1.json()["access_token"]

    # Student 1 fetches /me and /profile: must return Student 1's profile only
    headers = {"Authorization": f"Bearer {token1}"}
    res = client.get("/api/v1/students/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["enrollment_number"] == s1.enrollment_number
    assert res.json()["enrollment_number"] != s2.enrollment_number


def test_student_creation_validation_rules(client, db):
    """Verify backend enforces mandatory academic_year_id, grade_id, section_id, and section-grade hierarchy."""
    from app.core.security import create_access_token
    admin_user = User(
        email="admin.validator@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin_user)
    db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(admin_user.id, admin_user.role)}"}

    year1 = AcademicYear(name="2026-Year1", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True)
    year2 = AcademicYear(name="2027-Year2", start_date=date(2027, 1, 1), end_date=date(2027, 12, 31), is_current=False)
    db.add_all([year1, year2])
    db.flush()

    grade1 = Grade(name="Grade 8", code="G8", level=8, academic_year_id=year1.id)
    grade2 = Grade(name="Grade 9", code="G9", level=9, academic_year_id=year2.id)
    db.add_all([grade1, grade2])
    db.flush()

    sec1 = Section(grade_id=grade1.id, name="8-A", academic_year_id=year1.id)
    db.add(sec1)
    db.flush()

    base_payload = {
        "email": "invalid.student@school.edu",
        "first_name": "Test",
        "last_name": "Validation",
        "dob": "2012-01-01",
        "class_name": "Grade 8",
        "section": "8-A",
        "department": "General",
        "admission_date": "2026-06-01",
    }

    # 1. Missing academic_year_id / grade_id / section_id -> 422
    res_missing = client.post("/api/v1/admin/students", json=base_payload, headers=headers)
    assert res_missing.status_code == 422

    # 2. Grade belongs to year2, but payload specifies year1 -> 400
    year_mismatch_payload = {
        **base_payload,
        "academic_year_id": str(year1.id),
        "grade_id": str(grade2.id),
        "section_id": str(sec1.id),
    }
    res_year_mismatch = client.post("/api/v1/admin/students", json=year_mismatch_payload, headers=headers)
    assert res_year_mismatch.status_code == 400
    assert "does not belong to Academic Year" in res_year_mismatch.json()["detail"]

    # 3. Grade belongs to year1, but section belongs to grade1 while payload sends another grade in year1 -> 400
    grade1_alt = Grade(name="Grade 8 Alt", code="G8A", level=8, academic_year_id=year1.id)
    db.add(grade1_alt)
    db.flush()

    sec_mismatch_payload = {
        **base_payload,
        "academic_year_id": str(year1.id),
        "grade_id": str(grade1_alt.id),
        "section_id": str(sec1.id),
    }
    res_sec_mismatch = client.post("/api/v1/admin/students", json=sec_mismatch_payload, headers=headers)
    assert res_sec_mismatch.status_code == 400
    assert "does not belong to Grade" in res_sec_mismatch.json()["detail"]


def test_student_update_and_transfer_preserves_history(client, db):
    """Verify editing a student updates info and transferring sections preserves previous enrollment history."""
    from app.core.security import create_access_token
    admin_user = User(
        email="admin.transfer@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin_user)
    db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(admin_user.id, admin_user.role)}"}

    year = AcademicYear(name="2026-Transfer-Year", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True)
    db.add(year)
    db.flush()

    grade_a = Grade(name="Grade 11 Science", code="G11S", level=11, academic_year_id=year.id)
    grade_b = Grade(name="Grade 11 Commerce", code="G11C", level=11, academic_year_id=year.id)
    db.add_all([grade_a, grade_b])
    db.flush()

    sec_a = Section(grade_id=grade_a.id, name="11-A", academic_year_id=year.id)
    sec_b = Section(grade_id=grade_b.id, name="11-B", academic_year_id=year.id)
    db.add_all([sec_a, sec_b])
    db.flush()

    # Create initial student
    create_payload = {
        "email": "transfer.test@school.edu",
        "first_name": "Aarav",
        "last_name": "Mehta",
        "dob": "2009-08-12",
        "class_name": "Grade 11 Science",
        "section": "11-A",
        "department": "Science",
        "admission_date": "2026-06-01",
        "academic_year_id": str(year.id),
        "grade_id": str(grade_a.id),
        "section_id": str(sec_a.id),
    }
    create_res = client.post("/api/v1/admin/students", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    student_id = create_res.json()["student"]["id"]

    # 1. Update personal details without transfer
    update_res = client.patch(
        f"/api/v1/admin/students/{student_id}",
        json={"first_name": "Aarav Updated", "guardian_name": "Rajesh Mehta"},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["first_name"] == "Aarav Updated"
    assert updated_data["guardian_name"] == "Rajesh Mehta"

    # 2. Transfer student to Section 11-B in Grade 11 Commerce
    transfer_res = client.patch(
        f"/api/v1/admin/students/{student_id}",
        json={
            "target_grade_id": str(grade_b.id),
            "target_section_id": str(sec_b.id),
            "target_academic_year_id": str(year.id),
            "transfer_reason": "Switched stream from Science to Commerce",
        },
        headers=headers,
    )
    assert transfer_res.status_code == 200
    transfer_data = transfer_res.json()
    assert transfer_data["current_grade"] == "Grade 11 Commerce"
    assert transfer_data["current_section"] == "11-B"

    # 3. Check enrollment history in database: should have 2 records (1 TRANSFERRED, 1 ACTIVE)
    st_uuid = uuid.UUID(student_id)
    enrollments = db.execute(
        select(StudentEnrollment).where(StudentEnrollment.student_id == st_uuid).order_by(StudentEnrollment.created_at.asc())
    ).scalars().all()

    assert len(enrollments) == 2
    old_enr, new_enr = enrollments[0], enrollments[1]

    # Old enrollment is preserved with TRANSFERRED status and left_on date set
    assert old_enr.section_id == sec_a.id
    assert old_enr.status == "TRANSFERRED"
    assert old_enr.left_on is not None

    # New enrollment is ACTIVE
    assert new_enr.section_id == sec_b.id
    assert new_enr.status == "ACTIVE"
    assert new_enr.left_on is None

