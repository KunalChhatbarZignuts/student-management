import datetime as dt
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.calendar import HolidayCategory, SchoolHoliday
from app.models.classroom import TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


def _create_token(user: User) -> str:
    return create_access_token(user.id, user.role)


@pytest.fixture
def calendar_fixture(db):
    uid = uuid.uuid4().hex[:6]
    admin = User(
        email=f"admin_cal_{uid}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash="fakehash",
    )
    t_user = User(
        email=f"teacher_cal_{uid}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash="fakehash",
    )
    db.add_all([admin, t_user])
    db.flush()

    teacher = Teacher(
        user_id=t_user.id,
        first_name="Priya",
        last_name="Sharma",
        employee_code=f"EMP-CAL-{uid[:4]}",
        department="Academics",
        phone="9876543210",
    )
    db.add(teacher)
    db.flush()

    ay = AcademicYear(
        name=f"AY-CAL-{uid}",
        start_date=dt.date(2026, 6, 1),
        end_date=dt.date(2027, 5, 31),
        is_current=True,
        status="active",
    )
    db.add(ay)
    db.flush()

    g = Grade(
        name=f"Grade-CAL-{uid}",
        code=f"GCAL{uid[:3]}",
        academic_year_id=ay.id,
        level=1,
    )
    db.add(g)
    db.flush()

    sec = Section(
        name="Section A",
        code=f"SEC-CAL-{uid[:3]}",
        grade_id=g.id,
        academic_year_id=ay.id,
        class_capacity=40,
        status="active",
    )
    db.add(sec)
    db.flush()

    # Assign teacher to section
    assignment = TeacherAssignment(
        teacher_id=teacher.id,
        section_id=sec.id,
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        is_active=True,
        status="active",
    )
    db.add(assignment)
    db.flush()

    # Add 2 students
    students = []
    for i in range(2):
        s_user = User(
            email=f"stu_cal_{uid}_{i}@school.edu",
            role=UserRole.STUDENT.value,
            status=UserStatus.ACTIVE.value,
            password_hash="fakehash",
        )
        db.add(s_user)
        db.flush()

        s = Student(
            user_id=s_user.id,
            first_name=f"Student{i}",
            last_name="Test",
            student_code=f"STU-CAL-{uid[:4]}-{i}",
            enrollment_number=f"ENR-CAL-{uid[:4]}-{i}",
            dob=dt.date(2018, 5, 10),
            gender="MALE",
            class_name="Grade 1",
            section="A",
            department="Elementary",
            admission_date=dt.date(2026, 4, 1),
            status="active",
        )
        db.add(s)
        db.flush()
        enr = StudentEnrollment(
            student_id=s.id,
            academic_year_id=ay.id,
            grade_id=g.id,
            section_id=sec.id,
            roll_no=i + 1,
            enrollment_date=dt.date(2026, 4, 1),
            status="ACTIVE",
        )
        db.add(enr)
        students.append(s)

    db.commit()

    return {
        "admin": admin,
        "teacher_user": t_user,
        "teacher": teacher,
        "academic_year": ay,
        "grade": g,
        "section": sec,
        "students": students,
    }


def test_holiday_categories_and_creation(client: TestClient, calendar_fixture, db):
    fix = calendar_fixture
    admin_token = _create_token(fix["admin"])
    t_token = _create_token(fix["teacher_user"])

    # 1. Fetch categories
    cat_resp = client.get(
        "/api/v1/admin/calendar/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cat_resp.status_code == 200
    categories = cat_resp.json()
    assert len(categories) >= 8
    cat_names = [c["name"] for c in categories]
    assert "Public Holiday" in cat_names
    assert "Diwali Vacation" in cat_names

    # 2. Teacher cannot manage holidays
    forbidden_resp = client.post(
        "/api/v1/admin/calendar/holidays",
        json={"name": "Test Holiday"},
        headers={"Authorization": f"Bearer {t_token}"},
    )
    assert forbidden_resp.status_code == 403

    # 3. Admin creates a multi-day holiday (Diwali Vacation: Nov 5 - Nov 12, 2026)
    diwali_cat = next(c for c in categories if c["code"] == "diwali_vacation")
    holiday_payload = {
        "name": "Diwali Vacation",
        "category_id": diwali_cat["id"],
        "academic_year_id": str(fix["academic_year"].id),
        "start_date": "2026-11-05",
        "end_date": "2026-11-12",
        "description": "Annual Diwali Festival Break",
        "grade_ids": [],
        "section_ids": [],
    }
    create_resp = client.post(
        "/api/v1/admin/calendar/holidays",
        json=holiday_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_resp.status_code == 201
    h_data = create_resp.json()
    assert h_data["name"] == "Diwali Vacation"
    assert h_data["is_school_wide"] is True
    holiday_id = h_data["id"]

    # 4. Teacher checks calendar/holidays (Read-only)
    t_holidays_resp = client.get(
        f"/api/v1/teacher/calendar/holidays?academic_year_id={fix['academic_year'].id}",
        headers={"Authorization": f"Bearer {t_token}"},
    )
    assert t_holidays_resp.status_code == 200
    assert len(t_holidays_resp.json()) >= 1

    # 5. Admin updates holiday description
    upd_resp = client.put(
        f"/api/v1/admin/calendar/holidays/{holiday_id}",
        json={"description": "Extended Festival Break", "reason": "Administrative extension"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["description"] == "Extended Festival Break"


def test_attendance_blocked_on_holiday_and_weekly_off(client: TestClient, calendar_fixture):
    fix = calendar_fixture
    admin_token = _create_token(fix["admin"])
    t_token = _create_token(fix["teacher_user"])

    # 1. Create a holiday on 2026-11-06 (Friday)
    cat_resp = client.get(
        "/api/v1/admin/calendar/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    cat_id = cat_resp.json()[0]["id"]
    client.post(
        "/api/v1/admin/calendar/holidays",
        json={
            "name": "Festival Day",
            "category_id": cat_id,
            "academic_year_id": str(fix["academic_year"].id),
            "start_date": "2026-11-06",
            "end_date": "2026-11-06",
            "description": "Special holiday",
            "grade_ids": [],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # 2. Check date status on 2026-11-06
    status_resp = client.get(
        f"/api/v1/teacher/calendar/check-date?date=2026-11-06&academic_year_id={fix['academic_year'].id}",
        headers={"Authorization": f"Bearer {t_token}"},
    )
    assert status_resp.status_code == 200
    s_data = status_resp.json()
    assert s_data["is_working_day"] is False
    assert s_data["can_mark_attendance"] is False
    assert "Festival Day" in s_data["holiday_name"]

    # 3. Teacher attempts to mark attendance on 2026-11-06 -> MUST BE REJECTED (400)
    att_payload = {
        "date": "2026-11-06",
        "period": 1,
        "records": [
            {"student_id": str(fix["students"][0].id), "status": "PRESENT"},
            {"student_id": str(fix["students"][1].id), "status": "PRESENT"},
        ],
    }
    fail_resp = client.post(
        f"/api/v1/teacher/attendance/sections/{fix['section'].id}",
        json=att_payload,
        headers={"Authorization": f"Bearer {t_token}"},
    )
    assert fail_resp.status_code == 400
    assert "holiday" in fail_resp.json()["detail"].lower()

    # 4. Check Sunday (2026-11-08) -> Weekly Off
    sun_status = client.get(
        f"/api/v1/teacher/calendar/check-date?date=2026-11-08&academic_year_id={fix['academic_year'].id}",
        headers={"Authorization": f"Bearer {t_token}"},
    )
    assert sun_status.json()["is_working_day"] is False
    assert sun_status.json()["day_type"] == "weekly_off"

    # Attempt marking attendance on Sunday -> 400 Bad Request
    sun_payload = {
        "date": "2026-11-08",
        "period": 1,
        "records": [
            {"student_id": str(fix["students"][0].id), "status": "PRESENT"},
        ],
    }
    sun_fail = client.post(
        f"/api/v1/teacher/attendance/sections/{fix['section'].id}",
        json=sun_payload,
        headers={"Authorization": f"Bearer {t_token}"},
    )
    assert sun_fail.status_code == 400
    assert "weekly off" in sun_fail.json()["detail"].lower()


def test_special_compensatory_working_day_override(client: TestClient, calendar_fixture):
    fix = calendar_fixture
    admin_token = _create_token(fix["admin"])
    t_token = _create_token(fix["teacher_user"])

    # 1. By default, 2026-11-08 (Sunday) is weekly off
    # Admin marks 2026-11-08 as a compensatory working day
    comp_resp = client.post(
        "/api/v1/admin/calendar/special-working-days",
        json={
            "academic_year_id": str(fix["academic_year"].id),
            "date": "2026-11-08",
            "reason": "Compensatory working day for Friday flood holiday",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert comp_resp.status_code == 201

    # 2. Check date status on that Sunday: now is_working_day == True!
    check_resp = client.get(
        f"/api/v1/admin/calendar/check-date?date=2026-11-08&academic_year_id={fix['academic_year'].id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert check_resp.status_code == 200
    assert check_resp.json()["is_working_day"] is True
    assert check_resp.json()["can_mark_attendance"] is True
    assert check_resp.json()["day_type"] == "special_working_day"


def test_monthly_calendar_counts(client: TestClient, calendar_fixture):
    fix = calendar_fixture
    admin_token = _create_token(fix["admin"])

    # Fetch November 2026 calendar
    m_resp = client.get(
        f"/api/v1/admin/calendar/monthly?year=2026&month=11&academic_year_id={fix['academic_year'].id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert m_resp.status_code == 200
    m_data = m_resp.json()
    assert m_data["year"] == 2026
    assert m_data["month"] == 11
    assert m_data["total_days"] == 30
    assert len(m_data["days"]) == 30
    assert m_data["working_days"] > 0
    assert m_data["weekly_offs"] >= 4
