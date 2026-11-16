import uuid
import pytest
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole, UserStatus
from app.models.student import Student
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.core.security import create_access_token


@pytest.fixture
def directory_setup(db: Session):
    # 1. Admin user
    admin = User(
        email=f"admin_dir_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    # Teacher user
    teacher = User(
        email=f"teacher_dir_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    # Student user
    student_user = User(
        email=f"student_dir_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    # Parent user
    parent_user = User(
        email=f"parent_dir_{uuid.uuid4().hex[:6]}@school.edu",
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add_all([admin, teacher, student_user, parent_user])
    db.flush()

    # Academic Structure
    ay = AcademicYear(name=f"AY-DIR-{uuid.uuid4().hex[:4]}", start_date="2026-04-01", end_date="2027-03-31", is_current=True)
    db.add(ay)
    db.flush()

    gr = Grade(name="Grade 9", code=f"G9-{uuid.uuid4().hex[:4]}", level=9, academic_year_id=ay.id)
    db.add(gr)
    db.flush()

    sec = Section(name="A", code=f"G9A-{uuid.uuid4().hex[:4]}", grade_id=gr.id, academic_year_id=ay.id, class_capacity=30)
    db.add(sec)
    db.flush()

    # Create 3 distinct students with linked user accounts
    st_users = []
    students = []
    names = [
        ("Aarav", "Sharma", "active"),
        ("Rohan", "Verma", "suspended"),
        ("Ananya", "Deshmukh", "invited"),
    ]

    for first, last, user_st in names:
        u = User(
            email=f"{first.lower()}.{last.lower()}_{uuid.uuid4().hex[:4]}@student.school.edu",
            role=UserRole.STUDENT.value,
            status=user_st,
        )
        db.add(u)
        db.flush()

        code = f"STU-{uuid.uuid4().hex[:6].upper()}"
        enr_no = f"ENR-2026-{uuid.uuid4().hex[:5].upper()}"
        st = Student(
            user_id=u.id,
            student_code=code,
            enrollment_number=enr_no,
            first_name=first,
            last_name=last,
            dob="2010-05-15",
            gender="Male" if first != "Ananya" else "Female",
            class_name="Grade 9",
            section="A",
            department="Secondary",
            admission_date="2026-04-01",
            current_grade_id=gr.id,
            current_section_id=sec.id,
            status=user_st,
        )
        db.add(st)
        db.flush()

        enr = StudentEnrollment(
            student_id=st.id,
            academic_year_id=ay.id,
            grade_id=gr.id,
            section_id=sec.id,
            roll_no=1,
            status="ACTIVE" if user_st == "active" else "INACTIVE",
        )
        db.add(enr)
        st_users.append(u)
        students.append(st)

    db.commit()

    return {
        "admin": admin,
        "admin_token": create_access_token(admin.id, admin.role),
        "teacher_token": create_access_token(teacher.id, teacher.role),
        "student_token": create_access_token(student_user.id, student_user.role),
        "parent_token": create_access_token(parent_user.id, parent_user.role),
        "students": students,
        "st_users": st_users,
    }


def test_students_directory_search_by_full_name(client: TestClient, directory_setup: dict):
    headers = {"Authorization": f"Bearer {directory_setup['admin_token']}"}
    target_student = directory_setup["students"][0]  # Aarav Sharma

    # Search with full name "Aarav Sharma"
    res = client.get("/api/v1/admin/users?role=student&search=Aarav Sharma", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    found = any(item.get("student") and item["student"]["first_name"] == "Aarav" for item in data["items"])
    assert found is True


def test_students_directory_search_by_student_code(client: TestClient, directory_setup: dict):
    headers = {"Authorization": f"Bearer {directory_setup['admin_token']}"}
    target_student = directory_setup["students"][1]  # Rohan Verma

    res = client.get(f"/api/v1/admin/users?role=student&search={target_student.student_code}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["student"]["student_code"] == target_student.student_code
    assert item["student"]["last_name"] == "Verma"


def test_students_directory_search_by_enrollment_number(client: TestClient, directory_setup: dict):
    headers = {"Authorization": f"Bearer {directory_setup['admin_token']}"}
    target_student = directory_setup["students"][2]  # Ananya Deshmukh

    res = client.get(f"/api/v1/admin/users?role=student&search={target_student.enrollment_number}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["student"]["enrollment_number"] == target_student.enrollment_number
    assert item["student"]["first_name"] == "Ananya"


def test_students_directory_search_by_email(client: TestClient, directory_setup: dict):
    headers = {"Authorization": f"Bearer {directory_setup['admin_token']}"}
    target_user = directory_setup["st_users"][0]

    email_prefix = target_user.email.split("@")[0]
    res = client.get(f"/api/v1/admin/users?role=student&search={email_prefix}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    found = any(item["email"] == target_user.email for item in data["items"])
    assert found is True


def test_students_directory_status_filter(client: TestClient, directory_setup: dict):
    headers = {"Authorization": f"Bearer {directory_setup['admin_token']}"}

    # Filter suspended
    res_susp = client.get("/api/v1/admin/users?role=student&status=suspended", headers=headers)
    assert res_susp.status_code == 200
    data_susp = res_susp.json()
    assert data_susp["total"] >= 1
    assert all(item["status"] == "suspended" for item in data_susp["items"])


def test_students_directory_pagination(client: TestClient, directory_setup: dict):
    headers = {"Authorization": f"Bearer {directory_setup['admin_token']}"}

    # Page 1, limit 2
    res_p1 = client.get("/api/v1/admin/users?role=student&skip=0&limit=2", headers=headers)
    assert res_p1.status_code == 200
    d1 = res_p1.json()
    assert d1["limit"] == 2
    assert d1["skip"] == 0
    assert len(d1["items"]) <= 2

    # Page 2, skip 2, limit 2
    res_p2 = client.get("/api/v1/admin/users?role=student&skip=2&limit=2", headers=headers)
    assert res_p2.status_code == 200
    d2 = res_p2.json()
    assert d2["skip"] == 2


def test_students_directory_rbac_guard(client: TestClient, directory_setup: dict):
    # Teacher -> 403
    res_teacher = client.get(
        "/api/v1/admin/users?role=student",
        headers={"Authorization": f"Bearer {directory_setup['teacher_token']}"},
    )
    assert res_teacher.status_code == 403

    # Student -> 403
    res_student = client.get(
        "/api/v1/admin/users?role=student",
        headers={"Authorization": f"Bearer {directory_setup['student_token']}"},
    )
    assert res_student.status_code == 403

    # Parent -> 403
    res_parent = client.get(
        "/api/v1/admin/users?role=student",
        headers={"Authorization": f"Bearer {directory_setup['parent_token']}"},
    )
    assert res_parent.status_code == 403

    # Unauthenticated -> 401
    res_anon = client.get("/api/v1/admin/users?role=student")
    assert res_anon.status_code == 401
