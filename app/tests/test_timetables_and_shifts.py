import datetime as dt
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Period,
    Section,
    Shift,
    StudentEnrollment,
    Timetable,
    TimetableEntry,
)
from app.models.classroom import Subject, TeacherAssignment
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


@pytest.fixture
def timetable_fixture(db: Session):
    uid = uuid.uuid4().hex[:6]

    # 1. Academic Year
    ay = AcademicYear(
        name=f"2026-2027-{uid}",
        start_date=dt.date(2026, 9, 1),
        end_date=dt.date(2027, 6, 30),
        is_current=True,
        status="active",
    )
    db.add(ay)

    # 2. Users
    admin_u = User(
        email=f"admin_tt_{uid}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    teacher_u = User(
        email=f"teacher_tt_{uid}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    teacher2_u = User(
        email=f"teacher2_tt_{uid}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    student_u = User(
        email=f"student_tt_{uid}@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    parent_u = User(
        email=f"parent_tt_{uid}@school.edu",
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    db.add_all([admin_u, teacher_u, teacher2_u, student_u, parent_u])
    db.flush()

    # 3. Teacher profiles
    t1 = Teacher(
        user_id=teacher_u.id,
        first_name="Anita",
        last_name="Desai",
        employee_code=f"EMP-T1-{uid}",
        department="Mathematics",
    )
    t2 = Teacher(
        user_id=teacher2_u.id,
        first_name="Vikram",
        last_name="Mehta",
        employee_code=f"EMP-T2-{uid}",
        department="Science",
    )
    db.add_all([t1, t2])
    db.flush()

    # 4. Subjects
    math_sub = Subject(name=f"Mathematics {uid}", code=f"MTH-{uid}")
    sci_sub = Subject(name=f"Science {uid}", code=f"SCI-{uid}")
    db.add_all([math_sub, sci_sub])
    db.flush()

    # 5. Shift & Periods
    shift = Shift(
        name=f"Morning Shift {uid}",
        start_time=dt.time(7, 0),
        end_time=dt.time(12, 0),
        working_days="Monday,Tuesday,Wednesday,Thursday,Friday",
        status="active",
    )
    db.add(shift)
    db.flush()

    p1 = Period(
        shift_id=shift.id,
        number=1,
        name="Period 1",
        start_time=dt.time(7, 0),
        end_time=dt.time(7, 45),
        is_break=False,
    )
    p2 = Period(
        shift_id=shift.id,
        number=2,
        name="Period 2",
        start_time=dt.time(7, 45),
        end_time=dt.time(8, 30),
        is_break=False,
    )
    p_brk = Period(
        shift_id=shift.id,
        number=3,
        name="Morning Recess",
        start_time=dt.time(8, 30),
        end_time=dt.time(8, 45),
        is_break=True,
    )
    db.add_all([p1, p2, p_brk])
    db.flush()

    # 6. Grade and Sections sharing this Shift
    grade_10 = Grade(
        name=f"Grade 10 {uid}",
        code=f"G10-{uid}",
        level=10,
        shift_id=shift.id,
        academic_year_id=ay.id,
        status="active",
    )
    db.add(grade_10)
    db.flush()

    sec_a = Section(
        grade_id=grade_10.id,
        name="Section A",
        academic_year_id=ay.id,
        status="active",
    )
    sec_b = Section(
        grade_id=grade_10.id,
        name="Section B",
        academic_year_id=ay.id,
        status="active",
    )
    db.add_all([sec_a, sec_b])
    db.flush()

    # 7. Student and Parent
    stu = Student(
        user_id=student_u.id,
        student_code=f"STU-{uid}",
        first_name="Kavita",
        last_name="Rao",
        enrollment_number=f"ENR-{uid}",
        admission_date=dt.date.today(),
        dob=dt.date(2010, 5, 12),
        gender="female",
        class_name=grade_10.name,
        section=sec_a.name,
        department="General",
        status="active",
    )
    db.add(stu)
    db.flush()

    enr = StudentEnrollment(
        student_id=stu.id,
        grade_id=grade_10.id,
        section_id=sec_a.id,
        academic_year_id=ay.id,
        roll_no=1,
        status="ACTIVE",
    )
    db.add(enr)

    parent_profile = Parent(
        user_id=parent_u.id,
        first_name="Suresh",
        last_name="Rao",
        phone="9876543210",
    )
    db.add(parent_profile)
    db.flush()

    link = ParentStudentLink(
        parent_id=parent_profile.id,
        student_id=stu.id,
        relationship_type="father",
        is_primary_guardian=True,
        status="active",
    )
    db.add(link)
    db.commit()

    admin_token = create_access_token(admin_u.id, admin_u.role)
    teacher_token = create_access_token(teacher_u.id, teacher_u.role)
    student_token = create_access_token(student_u.id, student_u.role)
    parent_token = create_access_token(parent_u.id, parent_u.role)

    return {
        "academic_year": ay,
        "shift": shift,
        "periods": [p1, p2, p_brk],
        "grade": grade_10,
        "sec_a": sec_a,
        "sec_b": sec_b,
        "math_sub": math_sub,
        "sci_sub": sci_sub,
        "teacher": t1,
        "teacher2": t2,
        "student": stu,
        "admin_token": admin_token,
        "teacher_token": teacher_token,
        "student_token": student_token,
        "parent_token": parent_token,
    }


def test_shift_period_configuration_and_validations(client: TestClient, timetable_fixture, db: Session):
    admin_token = timetable_fixture["admin_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin creates Afternoon Shift
    shift_res = client.post(
        "/api/v1/admin/shifts",
        json={
            "name": f"Afternoon Shift {uuid.uuid4().hex[:4]}",
            "start_time": "12:30",
            "end_time": "17:30",
            "working_days": "Monday,Tuesday,Wednesday,Thursday,Friday",
        },
        headers=headers,
    )
    assert shift_res.status_code == 201
    shift_data = shift_res.json()
    new_shift_id = shift_data["id"]
    assert shift_data["start_time"] == "12:30"
    assert shift_data["end_time"] == "17:30"

    # 2. Add valid period
    p_res = client.post(
        f"/api/v1/admin/shifts/{new_shift_id}/periods",
        json={
            "number": 1,
            "name": "Period 1",
            "start_time": "12:30",
            "end_time": "13:15",
            "is_break": False,
        },
        headers=headers,
    )
    assert p_res.status_code == 201

    # 3. Reject period outside shift window (starts at 11:30 before 12:30)
    bad_bounds = client.post(
        f"/api/v1/admin/shifts/{new_shift_id}/periods",
        json={
            "number": 2,
            "name": "Early Period",
            "start_time": "11:30",
            "end_time": "12:15",
            "is_break": False,
        },
        headers=headers,
    )
    assert bad_bounds.status_code == 400
    assert "must fall within shift timings" in bad_bounds.json()["detail"]

    # 4. Reject overlapping period (overlaps with 12:30 - 13:15)
    overlap = client.post(
        f"/api/v1/admin/shifts/{new_shift_id}/periods",
        json={
            "number": 2,
            "name": "Clashing Period",
            "start_time": "13:00",
            "end_time": "13:45",
            "is_break": False,
        },
        headers=headers,
    )
    assert overlap.status_code == 409
    assert "overlaps" in overlap.json()["detail"]


def test_timetable_draft_clash_detection_and_publish(client: TestClient, timetable_fixture, db: Session):
    admin_token = timetable_fixture["admin_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    ay = timetable_fixture["academic_year"]
    grade = timetable_fixture["grade"]
    sec_a = timetable_fixture["sec_a"]
    sec_b = timetable_fixture["sec_b"]
    p1 = timetable_fixture["periods"][0]
    p2 = timetable_fixture["periods"][1]
    math_sub = timetable_fixture["math_sub"]
    sci_sub = timetable_fixture["sci_sub"]
    teacher1 = timetable_fixture["teacher"]

    # 1. Save draft timetable for Section A (Monday Period 1: Math with Teacher 1)
    draft_a = client.post(
        "/api/v1/admin/timetables/save-draft",
        json={
            "academic_year_id": str(ay.id),
            "grade_id": str(grade.id),
            "section_id": str(sec_a.id),
            "entries": [
                {
                    "day_of_week": 1,  # Monday
                    "period_id": str(p1.id),
                    "subject_id": str(math_sub.id),
                    "teacher_id": str(teacher1.id),
                    "room_number": "Room 101",
                },
                {
                    "day_of_week": 1,
                    "period_id": str(p2.id),
                    "subject_id": str(sci_sub.id),
                    "teacher_id": str(teacher1.id),
                    "room_number": "Lab 1",
                },
            ],
        },
        headers=headers,
    )
    assert draft_a.status_code == 200
    tt_a_data = draft_a.json()
    assert tt_a_data["status"] == "draft"
    tt_a_id = tt_a_data["id"]

    # 2. Publish Section A timetable
    pub_a = client.post(
        f"/api/v1/admin/timetables/{tt_a_id}/publish",
        headers=headers,
    )
    assert pub_a.status_code == 200
    assert pub_a.json()["status"] == "published"

    # 3. Attempt to assign Teacher 1 in Section B at the same time (Monday Period 1) -> Clashes!
    clash_check = client.post(
        f"/api/v1/admin/timetables/validate-clashes?academic_year_id={ay.id}&section_id={sec_b.id}",
        json=[
            {
                "day_of_week": 1,
                "period_id": str(p1.id),
                "subject_id": str(math_sub.id),
                "teacher_id": str(teacher1.id),
                "room_number": "Room 202",
            }
        ],
        headers=headers,
    )
    assert clash_check.status_code == 200
    assert clash_check.json()["is_valid"] is False
    assert len(clash_check.json()["clashes"]) > 0
    assert "already booked" in clash_check.json()["clashes"][0]


def test_teacher_portal_both_views_and_highlighting(client: TestClient, timetable_fixture, db: Session):
    teacher_token = timetable_fixture["teacher_token"]
    headers = {"Authorization": f"Bearer {teacher_token}"}
    ay = timetable_fixture["academic_year"]
    sec_a = timetable_fixture["sec_a"]
    p1 = timetable_fixture["periods"][0]
    p2 = timetable_fixture["periods"][1]
    math_sub = timetable_fixture["math_sub"]
    sci_sub = timetable_fixture["sci_sub"]
    teacher1 = timetable_fixture["teacher"]
    teacher2 = timetable_fixture["teacher2"]

    # Setup published timetable: Monday P1 with Teacher 1, Monday P2 with Teacher 2
    admin_headers = {"Authorization": f"Bearer {timetable_fixture['admin_token']}"}
    draft = client.post(
        "/api/v1/admin/timetables/save-draft",
        json={
            "academic_year_id": str(ay.id),
            "grade_id": str(timetable_fixture["grade"].id),
            "section_id": str(sec_a.id),
            "entries": [
                {
                    "day_of_week": 1,
                    "period_id": str(p1.id),
                    "subject_id": str(math_sub.id),
                    "teacher_id": str(teacher1.id),
                    "room_number": "Room 101",
                },
                {
                    "day_of_week": 1,
                    "period_id": str(p2.id),
                    "subject_id": str(sci_sub.id),
                    "teacher_id": str(teacher2.id),
                    "room_number": "Science Lab",
                },
            ],
        },
        headers=admin_headers,
    )
    tt_id = draft.json()["id"]
    client.post(f"/api/v1/admin/timetables/{tt_id}/publish", headers=admin_headers)

    # View 1: Teacher Personal Timetable
    t1_personal = client.get("/api/v1/teacher/timetable/me", headers=headers)
    assert t1_personal.status_code == 200
    t1_slots = t1_personal.json()["slots"]
    # Teacher 1 only sees their Period 1 slot, not Teacher 2's Period 2 slot
    assert len(t1_slots) == 1
    assert t1_slots[0]["period_number"] == 1
    assert t1_slots[0]["subject_name"] == math_sub.name

    # View 2: Complete Grade-wise Timetable with highlighting
    grade_tt = client.get(
        f"/api/v1/teacher/timetable/grade-wise?section_id={sec_a.id}",
        headers=headers,
    )
    assert grade_tt.status_code == 200
    entries = grade_tt.json()["entries"]
    assert len(entries) == 2

    # Check that slot 1 (Teacher 1) has is_current_teacher=True, slot 2 (Teacher 2) has False
    p1_entry = next(e for e in entries if e["period_id"] == str(p1.id))
    p2_entry = next(e for e in entries if e["period_id"] == str(p2.id))
    assert p1_entry["is_current_teacher"] is True
    assert p2_entry["is_current_teacher"] is False


def test_student_and_parent_timetable_access(client: TestClient, timetable_fixture, db: Session):
    student_token = timetable_fixture["student_token"]
    parent_token = timetable_fixture["parent_token"]
    student_id = timetable_fixture["student"].id
    ay = timetable_fixture["academic_year"]
    sec_a = timetable_fixture["sec_a"]
    p1 = timetable_fixture["periods"][0]
    math_sub = timetable_fixture["math_sub"]
    teacher1 = timetable_fixture["teacher"]
    admin_headers = {"Authorization": f"Bearer {timetable_fixture['admin_token']}"}

    # Publish timetable
    draft = client.post(
        "/api/v1/admin/timetables/save-draft",
        json={
            "academic_year_id": str(ay.id),
            "grade_id": str(timetable_fixture["grade"].id),
            "section_id": str(sec_a.id),
            "entries": [
                {
                    "day_of_week": 1,
                    "period_id": str(p1.id),
                    "subject_id": str(math_sub.id),
                    "teacher_id": str(teacher1.id),
                    "room_number": "Room 101",
                }
            ],
        },
        headers=admin_headers,
    )
    client.post(f"/api/v1/admin/timetables/{draft.json()['id']}/publish", headers=admin_headers)

    # 1. Student views their class timetable
    stu_res = client.get(
        "/api/v1/student/timetable/me",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert stu_res.status_code == 200
    assert len(stu_res.json()["entries"]) == 1
    assert stu_res.json()["entries"][0]["subject_name"] == math_sub.name

    # 2. Parent views child's timetable
    parent_res = client.get(
        f"/api/v1/parent/children/{student_id}/timetable",
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert parent_res.status_code == 200
    assert parent_res.json()["entries"][0]["subject_name"] == math_sub.name

    # 3. Unlinked child access by parent returns 403 Forbidden
    fake_child_id = uuid.uuid4()
    bad_parent_res = client.get(
        f"/api/v1/parent/children/{fake_child_id}/timetable",
        headers={"Authorization": f"Bearer {parent_token}"},
    )
    assert bad_parent_res.status_code == 403


def test_shift_assignment_to_grades(client: TestClient, timetable_fixture: dict):
    admin_token = timetable_fixture["admin_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    grade = timetable_fixture["grade"]
    shift = timetable_fixture["shift"]

    # 1. Assign shift to grade via PUT /admin/grades/{grade_id}/shift
    res = client.put(
        f"/api/v1/admin/grades/{grade.id}/shift",
        json={"shift_id": str(shift.id)},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["shift_id"] == str(shift.id)

    # 2. Check shifts list reflects the assigned grade
    shifts_res = client.get("/api/v1/admin/shifts", headers=admin_headers)
    assert shifts_res.status_code == 200
    matched_shift = next((s for s in shifts_res.json() if s["id"] == str(shift.id)), None)
    assert matched_shift is not None
    assert str(grade.id) in matched_shift["assigned_grade_ids"]
    assert grade.name in matched_shift["assigned_grade_names"]

    # 3. Assign multiple grades via POST /admin/shifts/{shift_id}/assign-grades
    assign_multi_res = client.post(
        f"/api/v1/admin/shifts/{shift.id}/assign-grades",
        json={"grade_ids": [str(grade.id)]},
        headers=admin_headers,
    )
    assert assign_multi_res.status_code == 200
    assert str(grade.id) in assign_multi_res.json()["assigned_grade_ids"]

    # 4. Unlink shift
    unlink_res = client.put(
        f"/api/v1/admin/grades/{grade.id}/shift",
        json={"shift_id": None},
        headers=admin_headers,
    )
    assert unlink_res.status_code == 200
    assert unlink_res.json()["shift_id"] is None
