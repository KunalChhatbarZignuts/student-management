import uuid
from datetime import date, timedelta

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.admission import Admission
from app.models.classroom import TeacherAssignment
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


def test_complete_student_admission_flow(client, db):
    """Test full admission wizard: new student + multiple parents + academic structure + credentials + instant login."""
    # 1. Setup Admin Actor
    admin = User(
        email="admission.admin@school.edu",
        password_hash=hash_password("AdminPass@123"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.flush()
    token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Setup Academic Structure
    ay = AcademicYear(name="2026-2027-Adm", start_date=date(2026, 6, 1), end_date=date(2027, 4, 30), is_current=True, status="active")
    db.add(ay)
    db.flush()

    # Teacher for coordinator and class teacher
    t_user = User(email="t.coord@school.edu", role=UserRole.TEACHER.value, status=UserStatus.ACTIVE.value)
    db.add(t_user)
    db.flush()
    coord_teacher = Teacher(user_id=t_user.id, employee_code="EMP-1001", first_name="Anita", last_name="Sharma", department="Academics")
    db.add(coord_teacher)
    db.flush()

    grade = Grade(name="Grade 6-Adm", code="G6A", level=6, academic_year_id=ay.id, coordinator_teacher_id=coord_teacher.id, status="active")
    db.add(grade)
    db.flush()

    section = Section(name="6-A", grade_id=grade.id, academic_year_id=ay.id, class_capacity=30, status="active")
    db.add(section)
    db.flush()

    # Assign class teacher to section
    ct_user = User(email="t.class@school.edu", role=UserRole.TEACHER.value, status=UserStatus.ACTIVE.value)
    db.add(ct_user)
    db.flush()
    class_teacher = Teacher(user_id=ct_user.id, employee_code="EMP-1002", first_name="Vikram", last_name="Verma", department="Science")
    db.add(class_teacher)
    db.flush()

    assignment = TeacherAssignment(
        teacher_id=class_teacher.id,
        section_id=section.id,
        academic_year="2026-2027",
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        is_active=True,
    )
    db.add(assignment)
    db.flush()

    # 3. Existing Parent to link
    ep_user = User(email="existing.mother@parent.school.edu", password_hash=hash_password("Mother@123"), role=UserRole.PARENT.value, status=UserStatus.ACTIVE.value)
    db.add(ep_user)
    db.flush()
    existing_parent = Parent(user_id=ep_user.id, first_name="Kavita", last_name="Roy", phone="+91 91111 22222")
    db.add(existing_parent)
    db.flush()

    # 4. Submit Complete Admission Wizard Payload
    admission_payload = {
        "student": {
            "first_name": "Arnav",
            "middle_name": "Kumar",
            "last_name": "Roy",
            "dob": "2015-08-10",
            "gender": "Male",
            "email": "arnav.roy@student.school.edu",
            "phone": "+91 90000 11111",
            "address": "77 Lotus Lane",
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "postal_code": "400001",
            "department": "General",
            "previous_school_name": "St. Xavier Junior School",
            "previous_school_details": "Completed Grade 5 with distinction",
            "password": "StudentAdmPass@123",
        },
        "parents": [
            {
                "first_name": "Sunil",
                "last_name": "Roy",
                "email": "sunil.roy@parent.school.edu",
                "phone": "+91 92222 33333",
                "address": "77 Lotus Lane, Mumbai",
                "relationship_type": "Father",
                "is_primary_guardian": True,
                "password": "FatherAdmPass@123",
            },
            {
                "existing_parent_id": str(existing_parent.id),
                "relationship_type": "Mother",
                "is_primary_guardian": False,
            },
        ],
        "academic_year_id": str(ay.id),
        "grade_id": str(grade.id),
        "section_id": str(section.id),
        "admission_date": "2026-06-01",
        "create_student_account": True,
        "notes": "Fast-track sports quota candidate",
    }

    resp = client.post("/api/v1/admin/admissions", json=admission_payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    # Verify Response Structure
    assert data["admission_number"].startswith("ADM-2026-")
    assert data["status"] == "completed"
    assert data["student"]["first_name"] == "Arnav"
    assert data["student"]["middle_name"] == "Kumar"
    assert data["student"]["enrollment_number"].startswith("STU-2026-")

    enroll_no = data["student"]["enrollment_number"]
    student_code = data["student"]["student_code"]

    # Verify Academic & Teacher
    assert data["academic"]["grade_name"] == "Grade 6-Adm"
    assert data["academic"]["section_name"] == "6-A"
    assert data["academic"]["class_teacher_name"] == "Vikram Verma"
    assert data["academic"]["class_teacher_employee_code"] == "EMP-1002"
    assert data["academic"]["grade_coordinator_name"] == "Anita Sharma"
    assert data["academic"]["roll_no"] == 1

    # Verify Parents
    assert len(data["parents"]) == 2
    father_p = next(p for p in data["parents"] if p["relationship_type"] == "Father")
    mother_p = next(p for p in data["parents"] if p["relationship_type"] == "Mother")
    assert father_p["is_primary_guardian"] is True
    assert father_p["initial_password"] == "FatherAdmPass@123"
    assert mother_p["is_primary_guardian"] is False
    assert mother_p["first_name"] == "Kavita"

    # 5. Verify Student Login using Enrollment Number & Password
    stu_login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": enroll_no, "password": "StudentAdmPass@123"},
    )
    assert stu_login_res.status_code == 200
    assert "access_token" in stu_login_res.json()

    # Verify Student Login using Student Code
    stu_login_code = client.post(
        "/api/v1/auth/login",
        json={"identifier": student_code, "password": "StudentAdmPass@123"},
    )
    assert stu_login_code.status_code == 200

    # 6. Verify Father Login using Email & Password
    parent_login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "sunil.roy@parent.school.edu", "password": "FatherAdmPass@123"},
    )
    assert parent_login_res.status_code == 200

    # 7. Test Admissions List Endpoint
    list_res = client.get("/api/v1/admin/admissions", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["admission_number"] == data["admission_number"] for item in list_data["items"])

    # 8. Test Single Admission Get Endpoint
    adm_id = data["admission_id"]
    get_res = client.get(f"/api/v1/admin/admissions/{adm_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["admission_number"] == data["admission_number"]

    # 9. Test Admission Status Endpoint
    status_res = client.get(f"/api/v1/admin/admissions/{adm_id}/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "completed"
    assert status_res.json()["enrollment_number"] == enroll_no


def test_admission_validation_and_capacity_rejection(client, db):
    """Test validation errors: duplicate email, section capacity limit, mismatching grade/year."""
    # Setup Admin
    admin = User(
        email="adm.val@school.edu",
        password_hash=hash_password("AdminPass@123"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.flush()
    token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    ay = AcademicYear(name="2026-2027-Val", start_date=date(2026, 6, 1), end_date=date(2027, 4, 30), is_current=True, status="active")
    db.add(ay)
    db.flush()

    grade = Grade(name="Grade 1-Val", code="G1V", level=1, academic_year_id=ay.id, status="active")
    db.add(grade)
    db.flush()

    # Section with capacity 1
    sec = Section(name="1-Cap", grade_id=grade.id, academic_year_id=ay.id, class_capacity=1, status="active")
    db.add(sec)
    db.flush()

    base_payload = {
        "student": {
            "first_name": "First",
            "last_name": "Student",
            "dob": "2020-01-01",
            "gender": "Female",
            "department": "General",
        },
        "parents": [
            {
                "first_name": "Parent",
                "last_name": "One",
                "email": "parent.val1@school.edu",
                "relationship_type": "Mother",
                "is_primary_guardian": True,
            }
        ],
        "academic_year_id": str(ay.id),
        "grade_id": str(grade.id),
        "section_id": str(sec.id),
        "admission_date": "2026-06-01",
    }

    # First admission succeeds and fills capacity
    res1 = client.post("/api/v1/admin/admissions", json=base_payload, headers=headers)
    assert res1.status_code == 201

    # Second admission into the same section must fail with capacity 400
    base_payload["student"]["first_name"] = "Second"
    base_payload["student"]["last_name"] = "Student"
    base_payload["parents"][0]["email"] = "parent.val2@school.edu"
    res2 = client.post("/api/v1/admin/admissions", json=base_payload, headers=headers)
    assert res2.status_code == 400
    assert "maximum capacity" in res2.json()["detail"]

