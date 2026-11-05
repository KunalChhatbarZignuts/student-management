import uuid
from datetime import date, datetime, timezone
import pytest

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


@pytest.fixture
def admin_auth(db):
    admin = User(
        email=f"admin.details.{uuid.uuid4().hex[:6]}@school.edu",
        password_hash=hash_password("AdminPass#1234"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()
    token = create_access_token(admin.id, admin.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def student_auth(db):
    student_user = User(
        email=f"student.user.{uuid.uuid4().hex[:6]}@school.edu",
        password_hash=hash_password("StudentPass#1234"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.commit()
    token = create_access_token(student_user.id, student_user.role)
    return {"Authorization": f"Bearer {token}"}


def test_get_student_details_success(client, db, admin_auth):
    # Setup Academic Year, Grade, Section
    year = AcademicYear(name=f"AY-{uuid.uuid4().hex[:4]}", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True)
    db.add(year)
    db.flush()

    grade = Grade(academic_year_id=year.id, name="Grade 10", code="G10", level=10, status="active")
    db.add(grade)
    db.flush()

    section = Section(grade_id=grade.id, academic_year_id=year.id, name="Section A", code="A", class_capacity=30, status="active")
    db.add(section)
    db.flush()

    user = User(
        email=f"detail.test.{uuid.uuid4().hex[:6]}@school.edu",
        password_hash=hash_password("StudentPass#123"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    student = Student(
        student_code=f"2026-TEST-{uuid.uuid4().hex[:4].upper()}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6].upper()}",
        user_id=user.id,
        first_name="Jane",
        last_name="Doe",
        dob=date(2010, 5, 14),
        gender="Female",
        address="123 Academic Way",
        city="Metropolis",
        state="State",
        postal_code="12345",
        department="Science",
        class_name="Grade 10",
        section="A",
        guardian_name="John Doe",
        guardian_phone="+1234567890",
        guardian_email="guardian@example.com",
        status="active",
        admission_date=date(2026, 1, 10),
    )
    db.add(student)
    db.flush()

    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_year_id=year.id,
        grade_id=grade.id,
        section_id=section.id,
        roll_no="101",
        status="active",
    )
    db.add(enrollment)
    db.commit()

    # Call endpoint
    res = client.get(f"/api/v1/admin/students/{student.id}/details", headers=admin_auth)
    assert res.status_code == 200
    data = res.json()

    assert data["student_id"] == str(student.id)
    assert data["personal_details"]["first_name"] == "Jane"
    assert data["personal_details"]["last_name"] == "Doe"
    assert data["personal_details"]["gender"] == "Female"
    assert data["personal_details"]["email"] == user.email

    assert data["academic_details"]["current_grade"] == "Grade 10"
    assert data["academic_details"]["current_section"] == "Section A"
    assert data["academic_details"]["current_roll_number"] == "101"
    assert len(data["academic_details"]["enrollment_history"]) >= 1

    # Check fallback guardian
    assert len(data["parents"]) >= 1
    assert data["parents"][0]["relationship"] == "GUARDIAN"
    assert data["parents"][0]["phone"] == "+1234567890"

    assert "attendance_summary" in data
    assert "leave_applications" in data
    assert "fees" in data
    assert "timetable" in data


def test_get_student_details_not_found(client, admin_auth):
    fake_id = uuid.uuid4()
    res = client.get(f"/api/v1/admin/students/{fake_id}/details", headers=admin_auth)
    assert res.status_code == 404


def test_get_student_details_unauthorized(client, student_auth):
    fake_id = uuid.uuid4()
    # Student role should be forbidden from accessing admin 360 endpoint
    res = client.get(f"/api/v1/admin/students/{fake_id}/details", headers=student_auth)
    assert res.status_code == 403


def test_get_teacher_details_success(client, db, admin_auth):
    user = User(
        email=f"teacher.detail.{uuid.uuid4().hex[:6]}@school.edu",
        password_hash=hash_password("TeacherPass#123"),
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    teacher = Teacher(
        employee_code=f"EMP-{uuid.uuid4().hex[:4].upper()}",
        user_id=user.id,
        first_name="Albert",
        last_name="Einstein",
        department="Physics",
        phone="+1987654321",
    )
    db.add(teacher)
    db.commit()

    res = client.get(f"/api/v1/admin/teachers/{teacher.id}/details", headers=admin_auth)
    assert res.status_code == 200
    data = res.json()

    assert data["teacher_id"] == str(teacher.id)
    assert data["employee_code"] == teacher.employee_code
    assert data["profile"]["first_name"] == "Albert"
    assert data["profile"]["last_name"] == "Einstein"
    assert data["profile"]["department"] == "Physics"
    assert data["profile"]["email"] == user.email

    assert "workload" in data
    assert data["workload"]["total_assigned_subjects"] == 0
    assert "subject_allocations" in data
    assert "timetable" in data
    assert "attendance_activity" in data
    assert "hr_notice" in data


def test_get_teacher_details_not_found(client, admin_auth):
    fake_id = uuid.uuid4()
    res = client.get(f"/api/v1/admin/teachers/{fake_id}/details", headers=admin_auth)
    assert res.status_code == 404


def test_get_teacher_details_unauthorized(client, student_auth):
    fake_id = uuid.uuid4()
    res = client.get(f"/api/v1/admin/teachers/{fake_id}/details", headers=student_auth)
    assert res.status_code == 403


def test_update_student_comprehensive_fields(client, db, admin_auth):
    # Setup test student
    year = AcademicYear(name=f"AY-Upd-{uuid.uuid4().hex[:4]}", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True)
    db.add(year)
    db.flush()

    grade = Grade(academic_year_id=year.id, name="Grade 8", code="G8", level=8, status="active")
    db.add(grade)
    db.flush()

    section = Section(grade_id=grade.id, academic_year_id=year.id, name="Section B", code="B", class_capacity=30, status="active")
    db.add(section)
    db.flush()

    user = User(
        email=f"student.upd.{uuid.uuid4().hex[:6]}@school.edu",
        password_hash=hash_password("StudentPass#123"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    student = Student(
        student_code=f"2026-UPD-{uuid.uuid4().hex[:4].upper()}",
        enrollment_number=f"ENR-UPD-{uuid.uuid4().hex[:4].upper()}",
        user_id=user.id,
        first_name="InitialFirst",
        last_name="InitialLast",
        dob=date(2011, 4, 15),
        gender="Male",
        class_name="Grade 8",
        section="B",
        department="General",
        status="active",
        admission_date=date(2026, 1, 1),
    )
    db.add(student)
    db.flush()

    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_year_id=year.id,
        grade_id=grade.id,
        section_id=section.id,
        roll_no="205",
        status="active",
    )
    db.add(enrollment)
    db.commit()

    # Perform comprehensive update
    update_payload = {
        "first_name": "UpdatedFirst",
        "middle_name": "UpdatedMiddle",
        "last_name": "UpdatedLast",
        "gender": "Female",
        "phone": "+1 555-987-6543",
        "alternate_phone": "+1 555-123-4567",
        "department": "Science",
        "address": "456 Innovation Blvd",
        "city": "Silicon Valley",
        "state": "California",
        "country": "USA",
        "postal_code": "94025",
        "previous_school_name": "St. Jude Academy",
        "previous_school_details": "Transferred with straight A honors",
        "guardian_name": "Mary Jane",
        "guardian_phone": "+1 555-444-3333",
        "guardian_email": "mary.jane@example.com",
        "status": "active",
    }

    patch_res = client.patch(f"/api/v1/admin/students/{student.id}", json=update_payload, headers=admin_auth)
    assert patch_res.status_code == 200

    # Verify through details endpoint
    get_res = client.get(f"/api/v1/admin/students/{student.id}/details", headers=admin_auth)
    assert get_res.status_code == 200
    details = get_res.json()

    p = details["personal_details"]
    assert p["first_name"] == "UpdatedFirst"
    assert p["middle_name"] == "UpdatedMiddle"
    assert p["last_name"] == "UpdatedLast"
    assert p["gender"] == "Female"
    assert p["phone"] == "+1 555-987-6543"
    assert p["alternate_phone"] == "+1 555-123-4567"
    assert p["department"] == "Science"
    assert p["address"] == "456 Innovation Blvd"
    assert p["city"] == "Silicon Valley"
    assert p["state"] == "California"
    assert p["country"] == "USA"
    assert p["postal_code"] == "94025"

    adm = details["admission_details"]
    assert adm["previous_school_name"] == "St. Jude Academy"
    assert adm["previous_school_details"] == "Transferred with straight A honors"


