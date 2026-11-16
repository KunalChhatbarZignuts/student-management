import uuid
from datetime import date

import pytest
from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus


def _create_admin_and_token(db, email="admin.test.transfer@school.edu"):
    admin = User(
        email=email,
        password_hash=hash_password("AdminPass123!"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.commit()
    token = create_access_token(admin.id, admin.role)
    return admin, {"Authorization": f"Bearer {token}"}


def test_section_transfer_endpoint_and_audit(client, db):
    """Test POST /api/v1/admin/students/{id}/transfer-section endpoint updates relational keys and preserves enrollment history."""
    admin, headers = _create_admin_and_token(db)

    # Academic year, grades, and sections
    ay = AcademicYear(name="AY 2026-2027", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31), status="active")
    db.add(ay)
    db.commit()

    grade10 = Grade(name="Grade 10", code="G10", academic_year_id=ay.id, status="active")
    db.add(grade10)
    db.commit()

    sec_a = Section(name="10-A", grade_id=grade10.id, academic_year_id=ay.id, status="active")
    sec_b = Section(name="10-B", grade_id=grade10.id, academic_year_id=ay.id, status="active")
    db.add_all([sec_a, sec_b])
    db.commit()

    # Create student
    stu_user = User(
        email="student.transfer1@school.edu",
        password_hash=hash_password("StudentPass123!"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(stu_user)
    db.commit()

    student = Student(
        user_id=stu_user.id,
        student_code="STU-TRANSFER-01",
        enrollment_number="ENR-2026-001",
        first_name="Ada",
        last_name="Lovelace",
        dob=date(2010, 12, 10),
        class_name=grade10.name,
        section=sec_a.name,
        current_grade_id=grade10.id,
        current_section_id=sec_a.id,
        department="Science",
        admission_date=date(2026, 4, 1),
        status="active",
    )
    db.add(student)
    db.commit()

    # Initial enrollment in 10-A
    initial_enr = StudentEnrollment(
        student_id=student.id,
        grade_id=grade10.id,
        section_id=sec_a.id,
        academic_year_id=ay.id,
        roll_no=1,
        status="ACTIVE",
        enrollment_date=date(2026, 4, 1),
    )
    db.add(initial_enr)
    db.commit()

    # Perform section transfer via /transfer-section endpoint
    payload = {
        "target_section_id": str(sec_b.id),
        "target_grade_id": str(grade10.id),
        "transfer_date": "2026-05-15",
        "reason": "Request for section change due to shift schedule",
    }
    res = client.post(f"/api/v1/admin/students/{student.id}/transfer-section", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["section_name"] == "10-B"
    assert data["status"] == "ACTIVE"

    # Refresh DB objects and verify
    db.refresh(student)
    assert student.current_section_id == sec_b.id
    assert student.current_grade_id == grade10.id
    assert student.section == "10-B"

    # Verify previous enrollment is marked TRANSFERRED
    db.refresh(initial_enr)
    assert initial_enr.status == "TRANSFERRED"
    assert initial_enr.left_on == date(2026, 5, 15)

    # Check enrollment history endpoint
    hist_res = client.get(f"/api/v1/admin/students/{student.id}/enrollments", headers=headers)
    assert hist_res.status_code == 200
    enrollments = hist_res.json()
    assert len(enrollments) == 2


def test_student_medical_and_emergency_details_update_and_read(client, db):
    """Test updating and reading student medical details, blood group, allergies, and authorized pickups."""
    admin, headers = _create_admin_and_token(db, email="admin.medical@school.edu")

    ay = AcademicYear(name="AY 2026-2027 Medical", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31), status="active")
    db.add(ay)
    db.commit()

    grade9 = Grade(name="Grade 9", code="G9", academic_year_id=ay.id, status="active")
    db.add(grade9)
    db.commit()

    sec_a = Section(name="9-A", grade_id=grade9.id, academic_year_id=ay.id, status="active")
    db.add(sec_a)
    db.commit()

    stu_user = User(
        email="student.medical@school.edu",
        password_hash=hash_password("StudentPass123!"),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(stu_user)
    db.commit()

    student = Student(
        user_id=stu_user.id,
        student_code="STU-MED-01",
        enrollment_number="ENR-2026-002",
        first_name="Charles",
        last_name="Babbage",
        dob=date(2011, 5, 20),
        class_name=grade9.name,
        section=sec_a.name,
        current_grade_id=grade9.id,
        current_section_id=sec_a.id,
        department="Science",
        admission_date=date(2026, 4, 1),
        status="active",
    )
    db.add(student)
    db.commit()

    # Update medical fields via PATCH /api/v1/admin/students/{id}
    med_payload = {
        "blood_group": "O+",
        "allergies": "Peanuts, Dust mites",
        "medical_conditions": "Mild asthma, requires inhaler before sports",
        "emergency_contact_name": "Mary Babbage",
        "emergency_contact_phone": "+1-555-0199",
        "authorized_pickup_info": "Mother (Mary Babbage) and Grandfather (Benjamin)",
    }
    patch_res = client.patch(f"/api/v1/admin/students/{student.id}", json=med_payload, headers=headers)
    assert patch_res.status_code == 200, patch_res.text
    patch_data = patch_res.json()
    assert patch_data["blood_group"] == "O+"
    assert patch_data["allergies"] == "Peanuts, Dust mites"
    assert patch_data["medical_conditions"] == "Mild asthma, requires inhaler before sports"
    assert patch_data["emergency_contact_name"] == "Mary Babbage"
    assert patch_data["emergency_contact_phone"] == "+1-555-0199"
    assert patch_data["authorized_pickup_info"] == "Mother (Mary Babbage) and Grandfather (Benjamin)"

    # Verify Comprehensive Details endpoint /details returns these fields
    details_res = client.get(f"/api/v1/admin/students/{student.id}/details", headers=headers)
    assert details_res.status_code == 200, details_res.text
    details = details_res.json()
    personal = details["personal_details"]
    assert personal["blood_group"] == "O+"
    assert personal["allergies"] == "Peanuts, Dust mites"
    assert personal["medical_conditions"] == "Mild asthma, requires inhaler before sports"
    assert personal["emergency_contact_name"] == "Mary Babbage"
    assert personal["emergency_contact_phone"] == "+1-555-0199"
    assert personal["authorized_pickup_info"] == "Mother (Mary Babbage) and Grandfather (Benjamin)"

    # Verify academic details has relational IDs
    academic = details["academic_details"]
    assert academic["grade_id"] == str(grade9.id)
    assert academic["section_id"] == str(sec_a.id)
