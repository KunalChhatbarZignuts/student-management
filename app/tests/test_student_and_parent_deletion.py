import uuid
from datetime import date, datetime

import pytest

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus


@pytest.fixture
def deletion_setup(db):
    """Setup academic structure, an admin, a parent, and a student with linked association."""
    pw = "SecureTestPass#123"
    
    # 1. Admin
    admin = User(
        email="admin.del@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin)
    db.flush()

    # 2. Academic structure
    ay = AcademicYear(name="2026-2027", start_date=date(2026, 4, 1), end_date=date(2027, 3, 31), is_current=True, status="active")
    db.add(ay)
    db.flush()

    gr = Grade(name="Grade 8", academic_year_id=ay.id, level=8)
    db.add(gr)
    db.flush()

    sec = Section(name="A", grade_id=gr.id, academic_year_id=ay.id, class_capacity=40)
    db.add(sec)
    db.flush()

    # 3. Student user & record
    stu_user = User(
        email="student.del@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(stu_user)
    db.flush()

    student = Student(
        user_id=stu_user.id,
        student_code="STU-DEL-001",
        enrollment_number="ENR-DEL-001",
        first_name="Alice",
        last_name="Johnson",
        dob=date(2012, 5, 14),
        class_name="Grade 8",
        section="A",
        current_grade_id=gr.id,
        current_section_id=sec.id,
        department="General",
        admission_date=date(2026, 4, 1),
        status="active",
    )
    db.add(student)
    db.flush()

    enr = StudentEnrollment(
        student_id=student.id,
        academic_year_id=ay.id,
        grade_id=gr.id,
        section_id=sec.id,
        enrollment_date=date(2026, 4, 1),
        status="ACTIVE",
    )
    db.add(enr)
    db.flush()

    # 4. Parent user, profile & link
    par_user = User(
        email="parent.del@school.edu",
        password_hash=hash_password(pw),
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(par_user)
    db.flush()

    parent = Parent(
        user_id=par_user.id,
        first_name="Robert",
        last_name="Johnson",
        phone="9876543210",
    )
    db.add(parent)
    db.flush()

    link = ParentStudentLink(
        parent_id=parent.id,
        student_id=student.id,
        relationship_type="Father",
        is_primary_guardian=True,
        status="active",
    )
    db.add(link)
    db.commit()

    return {
        "admin": admin,
        "student": student,
        "stu_user": stu_user,
        "parent": parent,
        "par_user": par_user,
        "link": link,
        "enrollment": enr,
    }


def test_delete_student_cascade_portal_revocation(client, db, deletion_setup):
    """Deleting a student deactivates their student profile, user account, enrollments, and revokes portal access."""
    admin = deletion_setup["admin"]
    student = deletion_setup["student"]
    stu_user = deletion_setup["stu_user"]
    parent = deletion_setup["parent"]
    par_user = deletion_setup["par_user"]

    admin_token = create_access_token(admin.id, admin.role)
    student_token = create_access_token(stu_user.id, stu_user.role)
    parent_token = create_access_token(par_user.id, par_user.role)

    # 1. Verify before deletion: Parent sees 1 child
    par_res_before = client.get(
        "/api/v1/parent/children",
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert par_res_before.status_code == 200
    children_before = par_res_before.json()
    assert len(children_before) == 1
    assert children_before[0]["student_code"] == "STU-DEL-001"

    # 2. Admin deletes student
    del_res = client.delete(
        f"/api/v1/admin/students/{student.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["status"] == "deleted"
    assert "deleted successfully" in del_data["message"]

    # 3. Verify in DB
    db.expire_all()
    s_db = db.get(Student, student.id)
    u_db = db.get(User, stu_user.id)
    assert s_db.status == "deleted"
    assert u_db.status == UserStatus.DEACTIVATED.value

    # 4. Verify Student Portal: student token is immediately rejected with 403 Forbidden
    stu_portal_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert stu_portal_res.status_code == 403
    assert "Account is deactivated" in stu_portal_res.json()["detail"]

    # 5. Verify Parent Portal: deleted student is filtered out from children list
    par_res_after = client.get(
        "/api/v1/parent/children",
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert par_res_after.status_code == 200
    children_after = par_res_after.json()
    assert len(children_after) == 0

    # 6. Verify direct access to deleted child is blocked (403 or 404)
    child_detail_res = client.get(
        f"/api/v1/parent/children/{student.id}",
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert child_detail_res.status_code in (403, 404)
    detail = child_detail_res.json()["detail"].lower()
    assert "access denied" in detail or "not found" in detail


def test_delete_parent_cascade_revocation(client, db, deletion_setup):
    """Deleting a parent deactivates their user account, revokes portal tokens, and unlinks students."""
    admin = deletion_setup["admin"]
    parent = deletion_setup["parent"]
    par_user = deletion_setup["par_user"]
    link = deletion_setup["link"]

    admin_token = create_access_token(admin.id, admin.role)
    parent_token = create_access_token(par_user.id, par_user.role)

    # 1. Admin deletes parent
    del_res = client.delete(
        f"/api/v1/admin/parents/{parent.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["status"] == "deactivated"
    assert "deleted successfully" in del_data["message"]

    # 2. Verify in DB
    db.expire_all()
    u_db = db.get(User, par_user.id)
    l_db = db.get(ParentStudentLink, link.id)
    assert u_db.status == UserStatus.DEACTIVATED.value
    assert l_db.status == "inactive"

    # 3. Verify Parent Portal access is rejected with 403 Forbidden
    par_portal_res = client.get(
        "/api/v1/parent/children",
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert par_portal_res.status_code == 403
    assert "Account is deactivated" in par_portal_res.json()["detail"]
