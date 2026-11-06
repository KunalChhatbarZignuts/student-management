import datetime as dt
import uuid

import pytest
from app.core.security import create_access_token, hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.calendar import HolidayCategory, SchoolHoliday
from app.models.classroom import Subject, TeacherAssignment
from app.models.examination import (
    ExamStatus,
    ExamType,
    Examination,
    ExaminationSchedule,
    GradingScale,
    MarksStatus,
    StudentExamMark,
    StudentExamResult,
)
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services.examination_service import ensure_default_grading_scale


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
def exam_setup(db):
    """Fixture providing full academic and exam hierarchy."""
    ensure_default_grading_scale(db)

    # 1. Academic Year
    ay = AcademicYear(
        name=f"AY-EXAM-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        status="active",
        is_current=True,
    )
    db.add(ay)
    db.commit()

    # 2. Grade & Section
    grade5 = Grade(name="Grade 5", code="G5", academic_year_id=ay.id, status="active", level=5)
    db.add(grade5)
    db.commit()

    sec_a = Section(name="5-A", code="5A", grade_id=grade5.id, academic_year_id=ay.id, status="active")
    db.add(sec_a)
    db.commit()

    # 3. Subject
    math_subj = Subject(name="Mathematics", code=f"MTH-{uuid.uuid4().hex[:4]}", department="Math", status="active")
    db.add(math_subj)
    db.commit()

    # 4. Class Teacher
    t_user, t_headers = _create_user(db, f"teacher.exam.{uuid.uuid4().hex[:6]}@school.edu", UserRole.TEACHER.value)
    teacher = Teacher(
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        user_id=t_user.id,
        first_name="Sunita",
        last_name="Sharma",
        department="Primary",
        phone="+91 9876543211",
    )
    db.add(teacher)
    db.commit()

    assignment = TeacherAssignment(
        teacher_id=teacher.id,
        section_id=sec_a.id,
        is_class_teacher=True,
        is_active=True,
        academic_year=ay.name,
    )
    db.add(assignment)
    db.commit()

    # 5. Non-Class Teacher
    other_u, other_headers = _create_user(db, f"other.teacher.{uuid.uuid4().hex[:6]}@school.edu", UserRole.TEACHER.value)
    other_teacher = Teacher(
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        user_id=other_u.id,
        first_name="Rohan",
        last_name="Verma",
        department="Secondary",
        phone="+91 9876543212",
    )
    db.add(other_teacher)
    db.commit()

    # 6. Student
    s_user, s_headers = _create_user(db, f"student.exam.{uuid.uuid4().hex[:6]}@school.edu", UserRole.STUDENT.value)
    student = Student(
        user_id=s_user.id,
        first_name="Arjun",
        last_name="Kapoor",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6]}",
        student_code=f"STU-{uuid.uuid4().hex[:6]}",
        dob=dt.date(2015, 8, 15),
        gender="male",
        admission_date=dt.date(2026, 4, 1),
        department="Primary",
        current_grade_id=grade5.id,
        current_section_id=sec_a.id,
        class_name="Grade 5",
        section="5-A",
    )
    db.add(student)
    db.commit()

    enrollment = StudentEnrollment(
        student_id=student.id,
        grade_id=grade5.id,
        section_id=sec_a.id,
        academic_year_id=ay.id,
        roll_no=1,
        status="ACTIVE",
    )
    db.add(enrollment)
    db.commit()

    # 7. Parent
    p_user, p_headers = _create_user(db, f"parent.exam.{uuid.uuid4().hex[:6]}@school.edu", UserRole.PARENT.value)
    parent = Parent(
        user_id=p_user.id,
        first_name="Rajesh",
        last_name="Kapoor",
        phone="+91 9876543210",
        address="123 Park Street",
    )
    db.add(parent)
    db.commit()

    link = ParentStudentLink(
        parent_id=parent.id,
        student_id=student.id,
        relationship_type="Father",
        is_primary_guardian=True,
    )
    db.add(link)
    db.commit()

    # 8. Admin User
    admin_u, admin_headers = _create_user(db, f"admin.exam.{uuid.uuid4().hex[:6]}@school.edu", UserRole.ADMIN.value)

    return {
        "academic_year": ay,
        "grade": grade5,
        "section": sec_a,
        "subject": math_subj,
        "teacher": teacher,
        "teacher_headers": t_headers,
        "other_teacher_headers": other_headers,
        "student": student,
        "student_headers": s_headers,
        "parent": parent,
        "parent_headers": p_headers,
        "admin_headers": admin_headers,
        "admin_user": admin_u,
    }


def test_admin_create_examination_and_schedule(client, exam_setup, db):
    """Test full administrative creation, conflict checks, and schedule slot generation."""
    headers = exam_setup["admin_headers"]
    ay = exam_setup["academic_year"]
    grade = exam_setup["grade"]
    sec = exam_setup["section"]
    subj = exam_setup["subject"]

    # 1. Create Examination
    exam_payload = {
        "name": "Unit Test 1 (Term 1)",
        "exam_type": "UNIT_TEST",
        "academic_year_id": str(ay.id),
        "term": "Term 1",
        "description": "First periodic unit test",
        "start_date": "2026-11-15",
        "end_date": "2026-11-25",
        "grading_scale_name": "Default 10-Point Scale",
    }
    res = client.post("/api/v1/admin/examinations", json=exam_payload, headers=headers)
    assert res.status_code == 201, res.text
    exam_data = res.json()
    exam_id = exam_data["id"]
    assert exam_data["name"] == "Unit Test 1 (Term 1)"

    # 2. Add declared holiday to test holiday conflict validation
    cat = HolidayCategory(name="Religious", code=f"REL-{uuid.uuid4().hex[:4]}", is_system=False)
    db.add(cat)
    db.commit()

    holiday = SchoolHoliday(
        name="Festival Holiday",
        category_id=cat.id,
        academic_year_id=ay.id,
        start_date=dt.date(2026, 11, 16),
        end_date=dt.date(2026, 11, 16),
        status="active",
    )
    db.add(holiday)
    db.commit()

    # Attempt to schedule on holiday -> must return 409
    holiday_sched_payload = {
        "examination_id": exam_id,
        "grade_id": str(grade.id),
        "section_id": str(sec.id),
        "subject_id": str(subj.id),
        "exam_date": "2026-11-16",
        "start_time": "09:00:00",
        "end_time": "11:00:00",
        "max_marks": 50.0,
        "pass_marks": 17.5,
    }
    h_res = client.post(f"/api/v1/admin/examinations/{exam_id}/schedules", json=holiday_sched_payload, headers=headers)
    assert h_res.status_code == 409
    assert "Official School Holiday declared" in h_res.json()["detail"]

    # 3. Schedule on valid working day
    valid_sched_payload = {
        "examination_id": exam_id,
        "grade_id": str(grade.id),
        "section_id": str(sec.id),
        "subject_id": str(subj.id),
        "exam_date": "2026-11-17",
        "start_time": "09:00:00",
        "end_time": "11:00:00",
        "max_marks": 50.0,
        "pass_marks": 17.5,
        "room_number": "Room 101",
        "instructions": "Bring geometry box and black pen.",
    }
    s_res = client.post(f"/api/v1/admin/examinations/{exam_id}/schedules", json=valid_sched_payload, headers=headers)
    assert s_res.status_code == 201, s_res.text
    sched_data = s_res.json()
    assert sched_data["max_marks"] == 50.0

    # 4. Attempt overlapping schedule for same section -> must return 409
    overlap_payload = {
        "examination_id": exam_id,
        "grade_id": str(grade.id),
        "section_id": str(sec.id),
        "subject_id": str(subj.id),
        "exam_date": "2026-11-17",
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "max_marks": 50.0,
        "pass_marks": 17.5,
    }
    o_res = client.post(f"/api/v1/admin/examinations/{exam_id}/schedules", json=overlap_payload, headers=headers)
    assert o_res.status_code == 409


def test_class_teacher_rbac_and_marks_lifecycle(client, exam_setup, db):
    """Test that ONLY the assigned Class Teacher can access roster and enter marks, with validation and publication flow."""
    admin_headers = exam_setup["admin_headers"]
    teacher_headers = exam_setup["teacher_headers"]
    other_headers = exam_setup["other_teacher_headers"]
    student_headers = exam_setup["student_headers"]
    parent_headers = exam_setup["parent_headers"]
    student = exam_setup["student"]
    ay = exam_setup["academic_year"]
    grade = exam_setup["grade"]
    sec = exam_setup["section"]
    subj = exam_setup["subject"]

    # 1. Admin creates Exam and Schedule
    exam = Examination(
        name="Mid-Term Exam 2026",
        exam_type="MID_TERM",
        academic_year_id=ay.id,
        term="Term 1",
        start_date=dt.date(2026, 11, 10),
        end_date=dt.date(2026, 11, 20),
        status="SCHEDULED",
    )
    db.add(exam)
    db.commit()

    sched = ExaminationSchedule(
        examination_id=exam.id,
        grade_id=grade.id,
        section_id=sec.id,
        subject_id=subj.id,
        exam_date=dt.date(2026, 11, 12),
        start_time=dt.time(9, 30),
        end_time=dt.time(11, 30),
        max_marks=100.0,
        pass_marks=35.0,
        status="SCHEDULED",
    )
    db.add(sched)
    db.commit()

    # 2. Non-Class Teacher attempts roster access -> must be 403 Forbidden
    other_res = client.get(f"/api/v1/teacher/examinations/schedules/{sched.id}/roster", headers=other_headers)
    assert other_res.status_code == 403
    assert "Only the assigned Class Teacher" in other_res.json()["detail"]

    # 3. Assigned Class Teacher retrieves roster
    t_res = client.get(f"/api/v1/teacher/examinations/schedules/{sched.id}/roster", headers=teacher_headers)
    assert t_res.status_code == 200, t_res.text
    roster = t_res.json()
    assert len(roster["students"]) >= 1
    assert roster["students"][0]["student_name"] == "Arjun Kapoor"

    # 4. Bounds check: marks > max_marks -> 422
    invalid_marks = {
        "marks": [
            {"student_id": str(student.id), "marks_obtained": 105.0, "is_absent": False}
        ]
    }
    inv_res = client.post(
        f"/api/v1/teacher/examinations/schedules/{sched.id}/marks/draft",
        json=invalid_marks,
        headers=teacher_headers,
    )
    assert inv_res.status_code == 422

    # 5. Save Draft Marks: 88.0 out of 100 -> A grade
    valid_draft = {
        "marks": [
            {"student_id": str(student.id), "marks_obtained": 88.0, "is_absent": False, "remarks": "Very thorough work"}
        ]
    }
    draft_res = client.post(
        f"/api/v1/teacher/examinations/schedules/{sched.id}/marks/draft",
        json=valid_draft,
        headers=teacher_headers,
    )
    assert draft_res.status_code == 200
    st_mark = draft_res.json()["students"][0]
    assert st_mark["marks_obtained"] == 88.0
    assert st_mark["grade"] == "A"
    assert st_mark["is_passed"] is True
    assert st_mark["status"] == "DRAFT"

    # 6. Student & Parent check: Must NOT see draft/unpublished results
    stu_res = client.get("/api/v1/students/me/examinations/results", headers=student_headers)
    assert stu_res.status_code == 200
    assert len(stu_res.json()) == 0  # Draft results are strictly hidden

    p_res = client.get(f"/api/v1/parent/children/{student.id}/examinations/results", headers=parent_headers)
    assert p_res.status_code == 200
    assert len(p_res.json()) == 0

    # 7. Teacher submits marks for the section
    submit_payload = {
        "marks": [
            {"student_id": str(student.id), "marks_obtained": 92.5, "is_absent": False, "remarks": "Outstanding exam"}
        ],
        "teacher_remarks": "Class demonstrated exceptional performance in Mathematics.",
    }
    sub_res = client.post(
        f"/api/v1/teacher/examinations/schedules/{sched.id}/marks/submit",
        json=submit_payload,
        headers=teacher_headers,
    )
    assert sub_res.status_code == 200
    assert sub_res.json()["students"][0]["status"] == "SUBMITTED"
    assert sub_res.json()["students"][0]["grade"] == "A+"

    # 8. Admin reviews & Publishes results
    pub_res = client.post(
        f"/api/v1/admin/examinations/{exam.id}/publish-results",
        json={"section_id": str(sec.id)},
        headers=admin_headers,
    )
    assert pub_res.status_code == 200
    assert pub_res.json()["published_count"] >= 1

    # 9. Student now sees published results
    stu_pub_res = client.get("/api/v1/students/me/examinations/results", headers=student_headers)
    assert stu_pub_res.status_code == 200
    results_list = stu_pub_res.json()
    assert len(results_list) == 1
    assert results_list[0]["overall_grade"] == "A+"
    assert results_list[0]["percentage"] == 92.5
    assert results_list[0]["overall_result"] == "PASS"

    # 10. Student downloads Official Report Card PDF
    pdf_res = client.get(f"/api/v1/students/me/examinations/{exam.id}/report-card/pdf", headers=student_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")

    # 11. Parent downloads child's Official Report Card PDF
    p_pdf_res = client.get(
        f"/api/v1/parent/children/{student.id}/examinations/{exam.id}/report-card/pdf", headers=parent_headers
    )
    assert p_pdf_res.status_code == 200
    assert p_pdf_res.headers["content-type"] == "application/pdf"
    assert p_pdf_res.content.startswith(b"%PDF")


def test_absentee_student_marks_and_report_card(client, exam_setup, db):
    """Test absent student handling: is_absent=True -> 'AB' grade, 0 score, and proper report card generation."""
    teacher_headers = exam_setup["teacher_headers"]
    admin_headers = exam_setup["admin_headers"]
    student_headers = exam_setup["student_headers"]
    student = exam_setup["student"]
    ay = exam_setup["academic_year"]
    grade = exam_setup["grade"]
    sec = exam_setup["section"]
    subj = exam_setup["subject"]

    exam = Examination(
        name="Unit Test Absentee Test",
        exam_type="UNIT_TEST",
        academic_year_id=ay.id,
        term="Term 1",
        start_date=dt.date(2026, 11, 20),
        end_date=dt.date(2026, 11, 25),
        status="SCHEDULED",
    )
    db.add(exam)
    db.commit()

    sched = ExaminationSchedule(
        examination_id=exam.id,
        grade_id=grade.id,
        section_id=sec.id,
        subject_id=subj.id,
        exam_date=dt.date(2026, 11, 21),
        start_time=dt.time(10, 0),
        end_time=dt.time(11, 30),
        max_marks=50.0,
        pass_marks=17.5,
        status="SCHEDULED",
    )
    db.add(sched)
    db.commit()

    # Teacher submits student as absent
    submit_payload = {
        "marks": [
            {"student_id": str(student.id), "marks_obtained": None, "is_absent": True, "remarks": "Medical leave during exam"}
        ],
        "teacher_remarks": "Absent due to medical emergency.",
    }
    sub_res = client.post(
        f"/api/v1/teacher/examinations/schedules/{sched.id}/marks/submit",
        json=submit_payload,
        headers=teacher_headers,
    )
    assert sub_res.status_code == 200
    st_mark = sub_res.json()["students"][0]
    assert st_mark["is_absent"] is True
    assert st_mark["grade"] == "AB"
    assert st_mark["marks_obtained"] == 0.0

    # Publish
    client.post(
        f"/api/v1/admin/examinations/{exam.id}/publish-results",
        json={"section_id": str(sec.id)},
        headers=admin_headers,
    )

    # Student downloads report card reflecting absence
    res = client.get("/api/v1/students/me/examinations/results", headers=student_headers)
    assert res.status_code == 200
    student_res = res.json()[0]
    assert student_res["overall_result"] == "ABSENT"
    assert student_res["overall_grade"] == "F"

    # PDF generates without crashing
    pdf_res = client.get(f"/api/v1/students/me/examinations/{exam.id}/report-card/pdf", headers=student_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"


def test_unlinked_parent_forbidden(client, exam_setup, db):
    """Test parent data isolation: Parent cannot access examination data for unlinked children."""
    student = exam_setup["student"]

    # Create unlinked parent
    other_p_user, other_p_headers = _create_user(db, f"unlinked.parent.{uuid.uuid4().hex[:6]}@school.edu", UserRole.PARENT.value)
    unlinked_parent = Parent(
        user_id=other_p_user.id,
        first_name="Sunil",
        last_name="Deshmukh",
        phone="+91 9123456789",
    )
    db.add(unlinked_parent)
    db.commit()

    res = client.get(f"/api/v1/parent/children/{student.id}/examinations/upcoming", headers=other_p_headers)
    assert res.status_code == 403
    assert "not authorized" in res.json()["detail"]


def test_admin_dashboard_metrics(client, exam_setup):
    """Test GET /api/v1/admin/examinations/dashboard-metrics returns counters."""
    headers = exam_setup["admin_headers"]
    res = client.get("/api/v1/admin/examinations/dashboard-metrics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_examinations" in data
    assert "upcoming_examinations" in data
    assert "published_results" in data
    assert "total_participating_students" in data

