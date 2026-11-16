import datetime as dt
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.main import app
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.classroom import TeacherAssignment
from app.models.leave import LeaveStatus, LeaveSubmissionRole, StudentLeaveApplication
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services import attendance_service


@pytest.fixture
def leave_setup(db: Session):
    uid = uuid.uuid4().hex[:6]

    # 1. Academic Structure
    ay = AcademicYear(name=f"AY-{uid}", start_date=dt.date(2026, 6, 1), end_date=dt.date(2027, 5, 31), status="active")
    db.add(ay)
    db.flush()

    grade = Grade(name=f"Grade-L{uid}", academic_year_id=ay.id, status="active")
    db.add(grade)
    db.flush()

    sec1 = Section(name="A", grade_id=grade.id, academic_year_id=ay.id, status="active")
    sec2 = Section(name="B", grade_id=grade.id, academic_year_id=ay.id, status="active")
    db.add_all([sec1, sec2])
    db.flush()

    # 2. Users & Roles
    # Class Teacher for Sec 1
    u_ct1 = User(email=f"ct1_{uid}@school.local", password_hash="dummy", role=UserRole.TEACHER.value, status=UserStatus.ACTIVE.value)
    # Class Teacher for Sec 2
    u_ct2 = User(email=f"ct2_{uid}@school.local", password_hash="dummy", role=UserRole.TEACHER.value, status=UserStatus.ACTIVE.value)
    # Subject Teacher (not class teacher)
    u_sub = User(email=f"sub_{uid}@school.local", password_hash="dummy", role=UserRole.TEACHER.value, status=UserStatus.ACTIVE.value)
    # Admin User
    u_admin = User(email=f"adm_{uid}@school.local", password_hash="dummy", role=UserRole.ADMIN.value, status=UserStatus.ACTIVE.value)
    # Student User 1
    u_stu1 = User(email=f"stu1_{uid}@school.local", password_hash="dummy", role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    # Student User 2 (unrelated)
    u_stu2 = User(email=f"stu2_{uid}@school.local", password_hash="dummy", role=UserRole.STUDENT.value, status=UserStatus.ACTIVE.value)
    # Parent User
    u_parent = User(email=f"par_{uid}@school.local", password_hash="dummy", role=UserRole.PARENT.value, status=UserStatus.ACTIVE.value)

    db.add_all([u_ct1, u_ct2, u_sub, u_admin, u_stu1, u_stu2, u_parent])
    db.flush()

    # 3. Teacher Profiles
    t_ct1 = Teacher(user_id=u_ct1.id, employee_code=f"EMP-CT1-{uid}", first_name="Alice", last_name="ClassTeacher", department="General")
    t_ct2 = Teacher(user_id=u_ct2.id, employee_code=f"EMP-CT2-{uid}", first_name="Bob", last_name="ClassTeacher2", department="General")
    t_sub = Teacher(user_id=u_sub.id, employee_code=f"EMP-SUB-{uid}", first_name="Sam", last_name="SubjectTeacher", department="General")
    db.add_all([t_ct1, t_ct2, t_sub])
    db.flush()

    # 4. Class Teacher Assignments
    ta1 = TeacherAssignment(
        teacher_id=t_ct1.id,
        section_id=sec1.id,
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        academic_year=ay.name,
        is_active=True,
        status="active",
    )
    ta2 = TeacherAssignment(
        teacher_id=t_ct2.id,
        section_id=sec2.id,
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        academic_year=ay.name,
        is_active=True,
        status="active",
    )
    db.add_all([ta1, ta2])
    db.flush()

    # 5. Students
    stu1 = Student(
        user_id=u_stu1.id,
        student_code=f"STU1-{uid}",
        enrollment_number=f"ENR1-{uid}",
        first_name="Rohan",
        last_name="Sharma",
        dob=dt.date(2012, 1, 1),
        admission_date=dt.date(2026, 6, 1),
        class_name=grade.name,
        section=sec1.name,
        department="General",
        status="active",
    )
    stu2 = Student(
        user_id=u_stu2.id,
        student_code=f"STU2-{uid}",
        enrollment_number=f"ENR2-{uid}",
        first_name="Pooja",
        last_name="Verma",
        dob=dt.date(2012, 2, 2),
        admission_date=dt.date(2026, 6, 1),
        class_name=grade.name,
        section=sec2.name,
        department="General",
        status="active",
    )
    db.add_all([stu1, stu2])
    db.flush()

    # Enrollments
    enr1 = StudentEnrollment(
        student_id=stu1.id,
        academic_year_id=ay.id,
        grade_id=grade.id,
        section_id=sec1.id,
        roll_no=1,
        status="ACTIVE",
    )
    enr2 = StudentEnrollment(
        student_id=stu2.id,
        academic_year_id=ay.id,
        grade_id=grade.id,
        section_id=sec2.id,
        roll_no=2,
        status="ACTIVE",
    )
    db.add_all([enr1, enr2])
    db.flush()

    # 6. Parent Profile and Link (linked to stu1 only)
    parent = Parent(
        user_id=u_parent.id,
        first_name="Sunita",
        last_name="Sharma",
        phone="9876543210",
    )
    db.add(parent)
    db.flush()

    plink = ParentStudentLink(
        parent_id=parent.id,
        student_id=stu1.id,
        relationship_type="Mother",
        is_primary_guardian=True,
    )
    db.add(plink)
    db.commit()

    # Auth tokens
    tokens = {
        "ct1": create_access_token(u_ct1.id, u_ct1.role),
        "ct2": create_access_token(u_ct2.id, u_ct2.role),
        "sub": create_access_token(u_sub.id, u_sub.role),
        "admin": create_access_token(u_admin.id, u_admin.role),
        "stu1": create_access_token(u_stu1.id, u_stu1.role),
        "stu2": create_access_token(u_stu2.id, u_stu2.role),
        "parent": create_access_token(u_parent.id, u_parent.role),
    }

    return {
        "tokens": tokens,
        "users": {"u_ct1": u_ct1, "u_ct2": u_ct2, "u_sub": u_sub, "u_admin": u_admin, "u_stu1": u_stu1, "u_stu2": u_stu2, "u_parent": u_parent},
        "teachers": {"t_ct1": t_ct1, "t_ct2": t_ct2, "t_sub": t_sub},
        "students": {"stu1": stu1, "stu2": stu2},
        "sections": {"sec1": sec1, "sec2": sec2},
        "grade": grade,
        "ay": ay,
        "parent": parent,
    }


def test_student_leave_full_lifecycle(client: TestClient, db: Session, leave_setup: dict):
    tokens = leave_setup["tokens"]
    stu1 = leave_setup["students"]["stu1"]
    stu2 = leave_setup["students"]["stu2"]
    sec1 = leave_setup["sections"]["sec1"]
    t_ct1 = leave_setup["teachers"]["t_ct1"]

    headers_stu1 = {"Authorization": f"Bearer {tokens['stu1']}"}
    headers_parent = {"Authorization": f"Bearer {tokens['parent']}"}
    headers_ct1 = {"Authorization": f"Bearer {tokens['ct1']}"}
    headers_ct2 = {"Authorization": f"Bearer {tokens['ct2']}"}
    headers_sub = {"Authorization": f"Bearer {tokens['sub']}"}
    headers_admin = {"Authorization": f"Bearer {tokens['admin']}"}

    today = dt.date.today()
    start_d = today + dt.timedelta(days=1)
    end_d = today + dt.timedelta(days=3)

    # ------------------------------------------------------------------------
    # 1. Student submits a leave application
    # ------------------------------------------------------------------------
    res_apply = client.post(
        "/api/v1/leaves/student/apply",
        json={
            "start_date": start_d.isoformat(),
            "end_date": end_d.isoformat(),
            "reason": "Family wedding out of town",
        },
        headers=headers_stu1,
    )
    assert res_apply.status_code == 201, res_apply.text
    data_app1 = res_apply.json()
    app1_id = data_app1["id"]
    assert data_app1["status"] == "pending"
    assert data_app1["student_id"] == str(stu1.id)
    assert data_app1["submission_role"] == "student"
    assert data_app1["days_count"] == 3
    assert data_app1["class_teacher_id"] == str(t_ct1.id)

    # ------------------------------------------------------------------------
    # 2. Parent submits an application for linked child
    # ------------------------------------------------------------------------
    par_start = today + dt.timedelta(days=10)
    par_end = today + dt.timedelta(days=11)
    res_par_apply = client.post(
        "/api/v1/leaves/parent/apply",
        json={
            "student_id": str(stu1.id),
            "start_date": par_start.isoformat(),
            "end_date": par_end.isoformat(),
            "reason": "Dental surgery appointment",
        },
        headers=headers_parent,
    )
    assert res_par_apply.status_code == 201
    data_par_app = res_par_apply.json()
    assert data_par_app["submission_role"] == "parent"
    assert data_par_app["student_id"] == str(stu1.id)

    # ------------------------------------------------------------------------
    # 3. Parent cannot submit for an unrelated student (stu2) -> 403 Forbidden
    # ------------------------------------------------------------------------
    res_unlinked = client.post(
        "/api/v1/leaves/parent/apply",
        json={
            "student_id": str(stu2.id),
            "start_date": par_start.isoformat(),
            "end_date": par_end.isoformat(),
            "reason": "Hacking attempt",
        },
        headers=headers_parent,
    )
    assert res_unlinked.status_code == 403

    # ------------------------------------------------------------------------
    # 4. Correct Class Teacher receives the applications
    # ------------------------------------------------------------------------
    res_ct1_list = client.get("/api/v1/leaves/teacher/assigned", headers=headers_ct1)
    assert res_ct1_list.status_code == 200
    ct1_items = res_ct1_list.json()["items"]
    ct1_ids = [item["id"] for item in ct1_items]
    assert app1_id in ct1_ids
    assert data_par_app["id"] in ct1_ids

    # ------------------------------------------------------------------------
    # 5. Other Class Teacher (CT2) and Subject Teacher (SUB) do not see these
    # ------------------------------------------------------------------------
    res_ct2_list = client.get("/api/v1/leaves/teacher/assigned", headers=headers_ct2)
    assert res_ct2_list.status_code == 200
    ct2_ids = [item["id"] for item in res_ct2_list.json()["items"]]
    assert app1_id not in ct2_ids

    res_sub_list = client.get("/api/v1/leaves/teacher/assigned", headers=headers_sub)
    assert res_sub_list.status_code == 200
    assert len(res_sub_list.json()["items"]) == 0

    # ------------------------------------------------------------------------
    # 6. Unauthorized teachers CANNOT approve or reject -> 403 Forbidden
    # ------------------------------------------------------------------------
    res_unauth_app = client.post(
        f"/api/v1/leaves/teacher/{app1_id}/approve",
        json={"remarks": "Illegal approval"},
        headers=headers_ct2,
    )
    assert res_unauth_app.status_code == 403

    res_sub_rej = client.post(
        f"/api/v1/leaves/teacher/{app1_id}/reject",
        json={"remarks": "Illegal rejection"},
        headers=headers_sub,
    )
    assert res_sub_rej.status_code == 403

    # ------------------------------------------------------------------------
    # 7. Admin CANNOT approve or reject -> 403 Forbidden
    # ------------------------------------------------------------------------
    res_admin_app = client.post(
        f"/api/v1/leaves/teacher/{app1_id}/approve",
        json={"remarks": "Admin override attempt"},
        headers=headers_admin,
    )
    assert res_admin_app.status_code == 403

    res_admin_rej = client.post(
        f"/api/v1/leaves/teacher/{app1_id}/reject",
        json={"remarks": "Admin override attempt"},
        headers=headers_admin,
    )
    assert res_admin_rej.status_code == 403

    # ------------------------------------------------------------------------
    # 8. Admin CAN monitor all applications
    # ------------------------------------------------------------------------
    res_monitor = client.get("/api/v1/leaves/admin/monitoring", headers=headers_admin)
    assert res_monitor.status_code == 200
    mon_items = res_monitor.json()["items"]
    mon_ids = [item["id"] for item in mon_items]
    assert app1_id in mon_ids
    assert data_par_app["id"] in mon_ids

    # ------------------------------------------------------------------------
    # 9. Assigned Class Teacher approves app1
    # ------------------------------------------------------------------------
    res_approve = client.post(
        f"/api/v1/leaves/teacher/{app1_id}/approve",
        json={"remarks": "Approved by Class Teacher. Please catch up on homework."},
        headers=headers_ct1,
    )
    assert res_approve.status_code == 200
    approved_data = res_approve.json()
    assert approved_data["status"] == "approved"
    assert approved_data["teacher_remarks"] == "Approved by Class Teacher. Please catch up on homework."
    assert approved_data["decided_by_teacher_id"] == str(t_ct1.id)

    # Repeated decision on decided application must fail with 400
    res_repeat = client.post(
        f"/api/v1/leaves/teacher/{app1_id}/approve",
        json={"remarks": "Second approve"},
        headers=headers_ct1,
    )
    assert res_repeat.status_code == 400

    # ------------------------------------------------------------------------
    # 10. Assigned Class Teacher rejects parent application
    # ------------------------------------------------------------------------
    par_app_id = data_par_app["id"]
    res_reject = client.post(
        f"/api/v1/leaves/teacher/{par_app_id}/reject",
        json={"remarks": "Exam week. Please reschedule appointment."},
        headers=headers_ct1,
    )
    assert res_reject.status_code == 200
    rejected_data = res_reject.json()
    assert rejected_data["status"] == "rejected"
    assert rejected_data["teacher_remarks"] == "Exam week. Please reschedule appointment."

    # ------------------------------------------------------------------------
    # 11. Student views own applications & status
    # ------------------------------------------------------------------------
    res_stu_view = client.get("/api/v1/leaves/student/my-applications", headers=headers_stu1)
    assert res_stu_view.status_code == 200
    stu_items = res_stu_view.json()
    stu_app1 = next(item for item in stu_items if item["id"] == app1_id)
    assert stu_app1["status"] == "approved"
    assert stu_app1["teacher_remarks"] is not None

    # Student 2 cannot see Student 1's applications
    res_stu2_view = client.get("/api/v1/leaves/student/my-applications", headers={"Authorization": f"Bearer {tokens['stu2']}"})
    assert res_stu2_view.status_code == 200
    assert not any(item["id"] == app1_id for item in res_stu2_view.json())

    # ------------------------------------------------------------------------
    # 12. Parent views child applications & status
    # ------------------------------------------------------------------------
    res_par_view = client.get(f"/api/v1/leaves/parent/child-applications?student_id={stu1.id}", headers=headers_parent)
    assert res_par_view.status_code == 200
    par_items = res_par_view.json()
    par_rej = next(item for item in par_items if item["id"] == par_app_id)
    assert par_rej["status"] == "rejected"
    assert par_rej["teacher_remarks"] == "Exam week. Please reschedule appointment."

    # ------------------------------------------------------------------------
    # 13. Attendance Integration
    # Approved leave date shows has_approved_leave=True and default_status="EXCUSED"
    # Pending / rejected date does not mark approved
    # ------------------------------------------------------------------------
    roster_approved_date = attendance_service.get_section_roster(sec1.id, db, target_date=start_d)
    stu1_roster_entry = next(r for r in roster_approved_date if r["student_id"] == stu1.id)
    assert stu1_roster_entry["has_approved_leave"] is True
    assert stu1_roster_entry["default_status"] == "EXCUSED"
    assert "wedding" in stu1_roster_entry["default_remark"].lower()

    # Rejected leave date shows has_approved_leave=False
    roster_rej_date = attendance_service.get_section_roster(sec1.id, db, target_date=par_start)
    stu1_rej_roster = next(r for r in roster_rej_date if r["student_id"] == stu1.id)
    assert stu1_rej_roster["has_approved_leave"] is False
    assert stu1_rej_roster["default_status"] == "PRESENT"

    # ------------------------------------------------------------------------
    # 14. Duplicate Pending Submission Prevention (409 Conflict)
    # ------------------------------------------------------------------------
    res_dup = client.post(
        "/api/v1/leaves/student/apply",
        json={
            "start_date": (today + dt.timedelta(days=20)).isoformat(),
            "end_date": (today + dt.timedelta(days=22)).isoformat(),
            "reason": "Trip 1",
        },
        headers=headers_stu1,
    )
    assert res_dup.status_code == 201

    res_dup_fail = client.post(
        "/api/v1/leaves/student/apply",
        json={
            "start_date": (today + dt.timedelta(days=21)).isoformat(),
            "end_date": (today + dt.timedelta(days=25)).isoformat(),
            "reason": "Overlapping Trip",
        },
        headers=headers_stu1,
    )
    assert res_dup_fail.status_code == 409


def test_student_without_class_teacher_handled_safely(client: TestClient, db: Session, leave_setup: dict):
    """Students without an assigned Class Teacher submit leave safely and show up in Admin Monitoring."""
    tokens = leave_setup["tokens"]
    headers_stu2 = {"Authorization": f"Bearer {tokens['stu2']}"}
    headers_admin = {"Authorization": f"Bearer {tokens['admin']}"}
    sec2 = leave_setup["sections"]["sec2"]

    # Remove active class teacher from sec2
    db.query(TeacherAssignment).filter(
        TeacherAssignment.section_id == sec2.id,
        TeacherAssignment.assignment_type == "CLASS_TEACHER",
    ).update({"is_active": False})
    db.commit()

    today = dt.date.today()
    res = client.post(
        "/api/v1/leaves/student/apply",
        json={
            "start_date": (today + dt.timedelta(days=5)).isoformat(),
            "end_date": (today + dt.timedelta(days=6)).isoformat(),
            "reason": "Personal family emergency",
        },
        headers=headers_stu2,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["class_teacher_id"] is None
    assert data["class_teacher_name"] is None

    # Appears in Admin monitoring
    res_mon = client.get("/api/v1/leaves/admin/monitoring", headers=headers_admin)
    assert res_mon.status_code == 200
    found = any(item["id"] == data["id"] and item["class_teacher_id"] is None for item in res_mon.json()["items"])
    assert found is True
