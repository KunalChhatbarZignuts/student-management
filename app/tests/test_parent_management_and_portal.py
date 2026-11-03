import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models.academic import AttendanceRecord, FeeInvoice, StudentMark
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.invite import Invite
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus


def test_parent_crud_and_status_management(client, db):
    """Test Admin parent account creation, listing with filters, updating, status changes, and invite resending."""
    admin = User(
        email="parent.admin.crud@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.flush()
    admin_token = create_access_token(admin.id, admin.role)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create parent
    create_payload = {
        "email": "sarah.connor@school.edu",
        "first_name": "Sarah",
        "last_name": "Connor",
        "phone": "+1-555-0199",
        "address": "404 Resilience Way",
    }
    create_res = client.post("/api/v1/admin/parents", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    created_parent = create_res.json()
    assert created_parent["email"] == "sarah.connor@school.edu"
    assert created_parent["user_status"] == "invited"
    parent_id = created_parent["id"]

    # 2. Duplicate email rejection
    dup_res = client.post("/api/v1/admin/parents", json=create_payload, headers=headers)
    assert dup_res.status_code == 409

    # 3. List parents with search filter
    list_res = client.get("/api/v1/admin/parents?search=Connor", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    found = [p for p in list_data["items"] if p["id"] == parent_id]
    assert len(found) == 1
    assert found[0]["first_name"] == "Sarah"

    # 4. Get parent details
    get_res = client.get(f"/api/v1/admin/parents/{parent_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["address"] == "404 Resilience Way"

    # 5. Update parent details
    update_res = client.put(
        f"/api/v1/admin/parents/{parent_id}",
        json={"first_name": "Sarah Jane", "phone": "+1-555-9999"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["first_name"] == "Sarah Jane"
    assert update_res.json()["phone"] == "+1-555-9999"

    # 6. Update parent status to suspended then active
    status_res = client.patch(
        f"/api/v1/admin/parents/{parent_id}/status",
        json={"status": "suspended"},
        headers=headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["user_status"] == "suspended"

    # 7. Resend invitation
    resend_res = client.post(f"/api/v1/admin/parents/{parent_id}/resend-invite", headers=headers)
    assert resend_res.status_code == 200
    assert "successfully resent" in resend_res.json()["message"]


def test_parent_student_relationship_management(client, db):
    """Test linking multiple children, duplicate link rejection, updating metadata, soft-unlinking, and reverse lookup."""
    admin = User(email="rel.admin@school.edu", role=UserRole.ADMIN.value, status=UserStatus.ACTIVE.value)
    db.add(admin)
    db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(admin.id, admin.role)}"}

    # Academic Structure
    year = AcademicYear(name="2026-RelYear", start_date=date(2026, 6, 1), end_date=date(2027, 4, 30), is_current=True)
    db.add(year)
    db.flush()
    grade = Grade(name="Grade 6", code="G6", level=6, academic_year_id=year.id)
    db.add(grade)
    db.flush()
    sec = Section(grade_id=grade.id, name="6-A", academic_year_id=year.id)
    db.add(sec)
    db.flush()

    # Create 2 Students
    s1_u = User(email="stu1.rel@school.edu", role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    s2_u = User(email="stu2.rel@school.edu", role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    db.add_all([s1_u, s2_u])
    db.flush()

    s1 = Student(
        user_id=s1_u.id, student_code="STU-REL-01", first_name="Leo", last_name="Miller",
        dob=date(2013, 2, 1), class_name="Grade 6", section="6-A", department="General", admission_date=date(2026, 6, 1)
    )
    s2 = Student(
        user_id=s2_u.id, student_code="STU-REL-02", first_name="Maya", last_name="Miller",
        dob=date(2014, 5, 12), class_name="Grade 6", section="6-A", department="General", admission_date=date(2026, 6, 1)
    )
    db.add_all([s1, s2])
    db.flush()

    enr1 = StudentEnrollment(student_id=s1.id, grade_id=grade.id, section_id=sec.id, academic_year_id=year.id, status="ACTIVE", roll_no=1)
    enr2 = StudentEnrollment(student_id=s2.id, grade_id=grade.id, section_id=sec.id, academic_year_id=year.id, status="ACTIVE", roll_no=2)
    db.add_all([enr1, enr2])
    db.flush()

    # Create 2 Parents (Mother and Father)
    p1_u = User(email="father.miller@school.edu", role=UserRole.PARENT.value, status=UserStatus.ACTIVE.value)
    p2_u = User(email="mother.miller@school.edu", role=UserRole.PARENT.value, status=UserStatus.ACTIVE.value)
    db.add_all([p1_u, p2_u])
    db.flush()

    p1 = Parent(user_id=p1_u.id, first_name="David", last_name="Miller", phone="+1-555-1111")
    p2 = Parent(user_id=p2_u.id, first_name="Emma", last_name="Miller", phone="+1-555-2222")
    db.add_all([p1, p2])
    db.commit()

    # 1. Link Father to Leo (as Primary Guardian)
    link1_res = client.post(
        f"/api/v1/admin/parents/{p1.id}/children",
        json={"student_id": str(s1.id), "relationship_type": "Father", "is_primary_guardian": True},
        headers=headers,
    )
    assert link1_res.status_code == 200
    assert link1_res.json()["relationship_type"] == "Father"
    assert link1_res.json()["is_primary_guardian"] is True

    # 2. Duplicate active link rejected (409)
    dup_link = client.post(
        f"/api/v1/admin/parents/{p1.id}/children",
        json={"student_id": str(s1.id), "relationship_type": "Father"},
        headers=headers,
    )
    assert dup_link.status_code == 409

    # 3. Link Father to second child Maya (One Parent -> Multiple Children)
    link2_res = client.post(
        f"/api/v1/admin/parents/{p1.id}/children",
        json={"student_id": str(s2.id), "relationship_type": "Father", "is_primary_guardian": True},
        headers=headers,
    )
    assert link2_res.status_code == 200

    # 4. Attempt to link Mother to Leo as well -> Rejected (409 Conflict: One Student -> One Parent Profile Rule)
    link3_res = client.post(
        f"/api/v1/admin/parents/{p2.id}/children",
        json={"student_id": str(s1.id), "relationship_type": "Mother", "is_primary_guardian": False},
        headers=headers,
    )
    assert link3_res.status_code == 409
    assert "already actively linked" in link3_res.json()["detail"]

    # 5. Check Available Students API (Leo and Maya are linked, so they should not appear)
    avail_res = client.get("/api/v1/admin/parents/available-students", headers=headers)
    assert avail_res.status_code == 200
    avail_ids = [s["id"] for s in avail_res.json()]
    assert str(s1.id) not in avail_ids
    assert str(s2.id) not in avail_ids

    # 6. Check Leo's parents list
    leo_parents_res = client.get(f"/api/v1/admin/students/{s1.id}/parents", headers=headers)
    assert leo_parents_res.status_code == 200
    leo_parents = leo_parents_res.json()
    assert len(leo_parents) == 1
    assert leo_parents[0]["relationship_type"] == "Father"

    # 7. Check Father's children list
    p1_children_res = client.get(f"/api/v1/admin/parents/{p1.id}/children", headers=headers)
    assert p1_children_res.status_code == 200
    p1_children = p1_children_res.json()
    assert len(p1_children) == 2

    # 8. Update relationship metadata
    update_rel = client.put(
        f"/api/v1/admin/parents/{p1.id}/children/{s1.id}",
        json={"relationship_type": "Legal Father", "is_primary_guardian": True},
        headers=headers,
    )
    assert update_rel.status_code == 200
    assert update_rel.json()["relationship_type"] == "Legal Father"

    # 9. Soft-unlink Maya from Father
    unlink_res = client.delete(f"/api/v1/admin/parents/{p1.id}/children/{s2.id}", headers=headers)
    assert unlink_res.status_code == 200

    # Father should now only have 1 active linked child
    p1_children_after = client.get(f"/api/v1/admin/parents/{p1.id}/children", headers=headers).json()
    assert len(p1_children_after) == 1
    assert p1_children_after[0]["student_id"] == str(s1.id)

    # Now that Maya is unlinked, Maya can be linked to Mother
    link_maya_mother = client.post(
        f"/api/v1/admin/parents/{p2.id}/children",
        json={"student_id": str(s2.id), "relationship_type": "Mother", "is_primary_guardian": True},
        headers=headers,
    )
    assert link_maya_mother.status_code == 200


def test_parent_portal_authenticated_access_and_security(client, db):
    """Test Parent Portal APIs: /parent/me, child academic details, and strict 403 on unlinked student access."""
    # Parent User & Profile
    pw = "ParentPortalSecret#2026"
    p_user = User(
        email="portal.parent@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(p_user)
    db.flush()
    parent = Parent(user_id=p_user.id, first_name="Robert", last_name="Taylor", phone="+1-555-8888")
    db.add(parent)
    db.flush()

    # Linked Child
    s_user = User(email="portal.child@school.edu", role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    db.add(s_user)
    db.flush()
    child = Student(
        user_id=s_user.id, student_code="STU-PORT-01", first_name="Alice", last_name="Taylor",
        dob=date(2012, 4, 15), class_name="Grade 7", section="7-A", department="Science", admission_date=date(2026, 6, 1)
    )
    db.add(child)
    db.flush()

    link = ParentStudentLink(
        parent_id=parent.id, student_id=child.id, relationship_type="Father",
        is_primary_guardian=True, status="active", verification_status="verified",
    )
    db.add(link)

    # Attendance, Mark, Fee for Child
    att = AttendanceRecord(student_id=child.id, date=date.today(), status="PRESENT")
    mark = StudentMark(student_id=child.id, subject="Mathematics", code="MATH101", max_score=100, obtained_score=94, grade="A+", status="Pass")
    invoice = FeeInvoice(student_id=child.id, invoice_number=f"INV-P-{uuid.uuid4().hex[:6]}", description="Term 1 Tuition", amount=1200.0, due_date=date(2026, 12, 15), status="Pending")
    db.add_all([att, mark, invoice])

    # Unlinked Student (to verify 403 isolation)
    other_u = User(email="other.student@school.edu", role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    db.add(other_u)
    db.flush()
    other_student = Student(
        user_id=other_u.id, student_code="STU-OTHER-99", first_name="Stranger", last_name="Danger",
        dob=date(2012, 1, 1), class_name="Grade 7", section="7-B", department="Science", admission_date=date(2026, 6, 1)
    )
    db.add(other_student)
    db.commit()

    # Authenticate Parent
    login_res = client.post("/api/v1/auth/login", json={"identifier": "portal.parent@school.edu", "password": pw})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    p_headers = {"Authorization": f"Bearer {token}"}

    # 1. /parent/me
    me_res = client.get("/api/v1/parent/me", headers=p_headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["first_name"] == "Robert"
    assert me_data["children_count"] == 1
    assert me_data["children"][0]["first_name"] == "Alice"

    # 2. Update own profile
    update_res = client.put(
        "/api/v1/parent/profile",
        json={"first_name": "Robert B.", "last_name": "Taylor", "phone": "+1-555-7777"},
        headers=p_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["first_name"] == "Robert B."

    # 3. Read linked child details
    child_res = client.get(f"/api/v1/parent/children/{child.id}", headers=p_headers)
    assert child_res.status_code == 200
    assert child_res.json()["first_name"] == "Alice"

    # 4. Read child attendance
    att_res = client.get(f"/api/v1/parent/children/{child.id}/attendance", headers=p_headers)
    assert att_res.status_code == 200
    assert att_res.json()["total_classes"] >= 1

    # 5. Read child academics/marks
    marks_res = client.get(f"/api/v1/parent/children/{child.id}/academics", headers=p_headers)
    assert marks_res.status_code == 200
    assert len(marks_res.json()) >= 1
    assert marks_res.json()[0]["subject"] == "Mathematics"

    # 6. Read child fees
    fees_res = client.get(f"/api/v1/parent/children/{child.id}/fees", headers=p_headers)
    assert fees_res.status_code == 200
    assert len(fees_res.json()) >= 1

    # 7. Read child timetable and assignments
    tt_res = client.get(f"/api/v1/parent/children/{child.id}/timetable", headers=p_headers)
    assert tt_res.status_code == 200

    asgn_res = client.get(f"/api/v1/parent/children/{child.id}/assignments", headers=p_headers)
    assert asgn_res.status_code == 200

    # 8. Notifications
    notif_res = client.get("/api/v1/parent/notifications", headers=p_headers)
    assert notif_res.status_code == 200
    assert len(notif_res.json()) >= 1

    # 9. SECURITY ISOLATION: Attempting to access unlinked student must return 403 Forbidden!
    forbidden_child = client.get(f"/api/v1/parent/children/{other_student.id}", headers=p_headers)
    assert forbidden_child.status_code == 403

    forbidden_att = client.get(f"/api/v1/parent/children/{other_student.id}/attendance", headers=p_headers)
    assert forbidden_att.status_code == 403

    forbidden_marks = client.get(f"/api/v1/parent/children/{other_student.id}/academics", headers=p_headers)
    assert forbidden_marks.status_code == 403

    forbidden_fees = client.get(f"/api/v1/parent/children/{other_student.id}/fees", headers=p_headers)
    assert forbidden_fees.status_code == 403


def test_student_and_parent_creation_with_direct_credentials_and_login(client, db):
    """Test provisioning student & parent with direct credentials, and verifying login with enrollment number, student code, email, and phone."""
    # Setup Admin
    admin_u = User(
        email="superadmin.creds@school.edu",
        password_hash=hash_password("AdminSecure#123"),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin_u)
    db.flush()
    admin_token = create_access_token(admin_u.id, admin_u.role)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup Academic Structure
    ay = AcademicYear(name="2026-2027-Creds", start_date=date(2026, 6, 1), end_date=date(2027, 4, 30), is_current=True, status="active")
    db.add(ay)
    db.flush()
    grade = Grade(name="Grade 8-Creds", code="G8C", level=8, academic_year_id=ay.id, status="active")
    db.add(grade)
    db.flush()
    sec = Section(name="8-A", grade_id=grade.id, academic_year_id=ay.id, class_capacity=35, status="active")
    db.add(sec)
    db.flush()

    # 1. Admin creates student with direct password
    stu_payload = {
        "email": "leo.messi@student.school.edu",
        "first_name": "Leo",
        "last_name": "Messi",
        "dob": "2012-06-24",
        "department": "Sports",
        "admission_date": "2026-06-01",
        "academic_year_id": str(ay.id),
        "grade_id": str(grade.id),
        "section_id": str(sec.id),
        "password": "StudentPass@123",
    }
    stu_res = client.post("/api/v1/admin/students", json=stu_payload, headers=admin_headers)
    assert stu_res.status_code == 201
    stu_data = stu_res.json()
    enroll_num = stu_data["enrollment_number"]
    stu_code = stu_data["student"]["student_code"]
    assert stu_data["user_status"] == "active"
    assert stu_data["initial_password"] == "StudentPass@123"

    # 2. Student logs in using Enrollment Number
    login_by_enroll = client.post(
        "/api/v1/auth/login",
        json={"identifier": enroll_num, "password": "StudentPass@123"},
    )
    assert login_by_enroll.status_code == 200
    assert "access_token" in login_by_enroll.json()

    # 3. Student logs in using Student Code
    login_by_code = client.post(
        "/api/v1/auth/login",
        json={"identifier": stu_code, "password": "StudentPass@123"},
    )
    assert login_by_code.status_code == 200
    assert "access_token" in login_by_code.json()

    # 4. Student logs in using Email
    login_by_email = client.post(
        "/api/v1/auth/login",
        json={"identifier": "leo.messi@student.school.edu", "password": "StudentPass@123"},
    )
    assert login_by_email.status_code == 200

    # 5. Admin creates parent with direct password
    parent_payload = {
        "email": "jorge.messi@parent.school.edu",
        "first_name": "Jorge",
        "last_name": "Messi",
        "phone": "+1-999-001122",
        "address": "Rosario, Argentina",
        "password": "ParentPass@123",
    }
    parent_res = client.post("/api/v1/admin/parents", json=parent_payload, headers=admin_headers)
    assert parent_res.status_code == 201
    parent_data = parent_res.json()
    assert parent_data["user_status"] == "active"
    assert parent_data["initial_password"] == "ParentPass@123"

    # 6. Parent logs in using Email
    parent_login_email = client.post(
        "/api/v1/auth/login",
        json={"identifier": "jorge.messi@parent.school.edu", "password": "ParentPass@123"},
    )
    assert parent_login_email.status_code == 200
    assert "access_token" in parent_login_email.json()

    # 7. Parent logs in using Phone Number
    parent_login_phone = client.post(
        "/api/v1/auth/login",
        json={"identifier": "+1-999-001122", "password": "ParentPass@123"},
    )
    assert parent_login_phone.status_code == 200
    assert "access_token" in parent_login_phone.json()

