import datetime as dt
import uuid
from decimal import Decimal

import pytest
from app.core.security import create_access_token, hash_password
from app.models.academic_structure import (
    AcademicYear,
    EnrollmentStatus,
    Grade,
    Period,
    Section,
    Shift,
    StudentEnrollment,
    TeacherSubject,
    TeacherSubstitution,
    Timetable,
    TimetableEntry,
)
from app.models.attendance import (
    AbsenceNotificationLog,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
)
from app.models.classroom import Class, Subject
from app.models.fee import (
    FeeComponent,
    FeeInstallment,
    FeeStructure,
    FeeStructureItem,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
)
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserStatus
from app.services.fee_receipt_generator import generate_fee_receipt_pdf
from app.schemas.fee_pos import POSPaymentReceiptResponse, POSReceiptItem


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
def operations_setup(db):
    """Setup base academic structure, teachers, subjects, and timetables for operations testing."""
    ay = AcademicYear(
        name=f"AY-OPS-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        status="active",
        is_current=True,
    )
    db.add(ay)
    db.commit()

    shift = Shift(
        name=f"Morning-{uuid.uuid4().hex[:6]}",
        start_time=dt.time(8, 0),
        end_time=dt.time(14, 0),
        status="active",
    )
    db.add(shift)
    db.commit()

    grade = Grade(
        academic_year_id=ay.id,
        name="Grade 8",
        level=8,
        shift_id=shift.id,
    )
    db.add(grade)
    db.commit()

    section = Section(
        academic_year_id=ay.id,
        grade_id=grade.id,
        name="Section A",
        class_capacity=40,
    )
    db.add(section)
    db.commit()

    period1 = Period(
        shift_id=shift.id,
        number=1,
        name="Period 1",
        start_time=dt.time(9, 0),
        end_time=dt.time(9, 45),
    )
    db.add(period1)

    subj_math = Subject(name=f"Math-{uuid.uuid4().hex[:4]}", code=f"MTH-{uuid.uuid4().hex[:4]}", status="active")
    subj_sci = Subject(name=f"Science-{uuid.uuid4().hex[:4]}", code=f"SCI-{uuid.uuid4().hex[:4]}", status="active")
    db.add_all([subj_math, subj_sci])
    db.commit()

    # Teacher 1 (Math teacher)
    u1, _ = _create_user(db, f"t1_{uuid.uuid4().hex[:6]}@school.com", "TEACHER")
    t1 = Teacher(
        user_id=u1.id,
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        first_name="Alan",
        last_name="Turing",
        department="Mathematics",
        phone="+919876543210",
    )
    db.add(t1)

    # Teacher 2 (Science teacher)
    u2, _ = _create_user(db, f"t2_{uuid.uuid4().hex[:6]}@school.com", "TEACHER")
    t2 = Teacher(
        user_id=u2.id,
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        first_name="Marie",
        last_name="Curie",
        department="Science",
        phone="+919876543211",
    )
    db.add(t2)
    db.commit()

    # Timetable for Grade 8 Section A
    tt = Timetable(
        academic_year_id=ay.id,
        grade_id=grade.id,
        section_id=section.id,
        shift_id=shift.id,
        version=1,
        status="published",
    )
    db.add(tt)
    db.commit()

    # Timetable Entry: Day 1 (Monday), Period 1, Alan Turing teaches Math
    entry = TimetableEntry(
        timetable_id=tt.id,
        day_of_week=1,
        period_id=period1.id,
        subject_id=subj_math.id,
        teacher_id=t1.id,
        room_number="Room 101",
    )
    db.add(entry)
    db.commit()

    return {
        "ay": ay,
        "grade": grade,
        "section": section,
        "period1": period1,
        "subj_math": subj_math,
        "subj_sci": subj_sci,
        "t1": t1,
        "t2": t2,
        "entry": entry,
    }


def test_teacher_substitution_lifecycle(db, client, operations_setup):
    """Test absent teacher coverage, candidate recommendation, assignment, and cancellation."""
    admin_u, admin_hdrs = _create_user(db, f"admin_{uuid.uuid4().hex[:6]}@school.com", "ADMIN")
    t1 = operations_setup["t1"]
    t2 = operations_setup["t2"]
    entry = operations_setup["entry"]

    # Target date: 2026-11-09 is a Monday (day_of_week=1)
    target_date = dt.date(2026, 11, 9)

    # 1. Inspect absent teacher coverage
    res = client.get(
        f"/api/v1/substitutions/coverage?teacher_id={t1.id}&date={target_date}",
        headers=admin_hdrs,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_slots_count"] == 1
    assert data["covered_slots_count"] == 0
    assert data["affected_slots"][0]["timetable_entry_id"] == str(entry.id)
    assert data["affected_slots"][0]["current_substitution_id"] is None

    # 2. Get substitute recommendations
    res_rec = client.get(
        f"/api/v1/substitutions/recommendations?timetable_entry_id={entry.id}&date={target_date}",
        headers=admin_hdrs,
    )
    assert res_rec.status_code == 200
    cands = res_rec.json()
    assert len(cands) >= 1
    # Teacher 2 (Marie Curie) should be free and available
    curie_cand = next((c for c in cands if c["teacher_id"] == str(t2.id)), None)
    assert curie_cand is not None
    assert curie_cand["is_available"] is True

    # 3. Assign Marie Curie as substitute
    payload = {
        "date": str(target_date),
        "timetable_entry_id": str(entry.id),
        "substitute_teacher_id": str(t2.id),
        "reason": "Teacher on sick leave",
        "notes": "Covering Chapter 4 Algebra",
    }
    res_assign = client.post("/api/v1/substitutions", json=payload, headers=admin_hdrs)
    assert res_assign.status_code == 201
    sub_data = res_assign.json()
    assert sub_data["status"] == "ASSIGNED"
    assert sub_data["substitute_teacher_id"] == str(t2.id)
    sub_id = sub_data["id"]

    # 4. Coverage endpoint now shows slot as covered
    res_cov2 = client.get(
        f"/api/v1/substitutions/coverage?teacher_id={t1.id}&date={target_date}",
        headers=admin_hdrs,
    )
    assert res_cov2.json()["covered_slots_count"] == 1
    assert res_cov2.json()["affected_slots"][0]["current_substitute_name"] == f"{t2.first_name} {t2.last_name}"

    # 5. Prevent duplicate substitution assignment for the same slot and date
    res_dup = client.post("/api/v1/substitutions", json=payload, headers=admin_hdrs)
    assert res_dup.status_code == 400

    # 6. Cancel substitution
    res_cancel = client.post(
        f"/api/v1/substitutions/{sub_id}/cancel",
        json={"reason": "Original teacher returned early"},
        headers=admin_hdrs,
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED"


def test_fee_counter_pos_and_pdf(db, client, operations_setup):
    """Test cashier student lookup, payment collection with auto-FIFO, manual override, and PDF receipt generation."""
    admin_u, admin_hdrs = _create_user(db, f"cashier_{uuid.uuid4().hex[:6]}@school.com", "ADMIN")
    ay = operations_setup["ay"]
    grade = operations_setup["grade"]
    section = operations_setup["section"]

    # Setup student
    su, _ = _create_user(db, f"stu_{uuid.uuid4().hex[:6]}@school.com", "STUDENT")
    student = Student(
        user_id=su.id,
        student_code=f"STU-{uuid.uuid4().hex[:6]}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6]}",
        first_name="Rohan",
        last_name="Sharma",
        dob=dt.date(2010, 5, 15),
        class_name="Grade 8",
        section="Section A",
        current_grade_id=grade.id,
        current_section_id=section.id,
        department="General",
        phone="+919876500001",
        admission_date=dt.date(2026, 4, 1),
    )
    db.add(student)
    db.commit()

    # Setup Fee Component and Structure
    comp = FeeComponent(
        name="Tuition Fee",
        code=f"TUI-{uuid.uuid4().hex[:4]}",
        fee_type="tuition",
        payment_frequency="annual",
        is_mandatory=True,
    )
    db.add(comp)
    db.commit()

    fs = FeeStructure(
        academic_year_id=ay.id,
        grade_id=grade.id,
        name="Grade 8 Standard Fee",
        total_amount=Decimal("15000.00"),
        effective_date=dt.date(2026, 4, 1),
        status="active",
    )
    db.add(fs)
    db.commit()

    # Fee Assignment with 2 Installments: ₹8,000 and ₹7,000
    assignment = StudentFeeAssignment(
        student_id=student.id,
        academic_year_id=ay.id,
        grade_id=grade.id,
        fee_structure_id=fs.id,
        base_amount=Decimal("15000.00"),
        final_payable_amount=Decimal("15000.00"),
        status="active",
        assigned_date=dt.date.today(),
        created_by_user_id=admin_u.id,
    )
    db.add(assignment)
    db.commit()

    inst1 = FeeInstallment(
        assignment_id=assignment.id,
        installment_number=1,
        installment_name="Term 1 Installment",
        due_date=dt.date(2026, 6, 1),
        amount=Decimal("8000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("8000.00"),
        status="pending",
    )
    inst2 = FeeInstallment(
        assignment_id=assignment.id,
        installment_number=2,
        installment_name="Term 2 Installment",
        due_date=dt.date(2026, 10, 1),
        amount=Decimal("7000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("7000.00"),
        status="pending",
    )
    db.add_all([inst1, inst2])
    db.commit()

    # 1. Search student on POS counter
    res_search = client.get(f"/api/v1/pos/students?query=Rohan", headers=admin_hdrs)
    assert res_search.status_code == 200
    results = res_search.json()
    assert len(results) >= 1
    assert results[0]["name"] == "Rohan Sharma"
    assert Decimal(str(results[0]["total_outstanding"])) == Decimal("15000.00")

    # 2. Get student ledger details
    res_ledger = client.get(f"/api/v1/pos/students/{student.id}/details", headers=admin_hdrs)
    assert res_ledger.status_code == 200
    ledger = res_ledger.json()
    assert len(ledger["installments"]) == 2

    # 3. Collect payment via auto-FIFO: ₹10,000 (settles Term 1 fully for ₹8,000 + Term 2 partially for ₹2,000)
    pay_payload = {
        "student_id": str(student.id),
        "total_amount": 10000.00,
        "payment_method": "cash",
        "cash_tendered": 10000.00,
        "remarks": "Counter Cash Payment",
    }
    res_pay = client.post("/api/v1/pos/collect", json=pay_payload, headers=admin_hdrs)
    assert res_pay.status_code == 201
    receipt = res_pay.json()
    assert Decimal(str(receipt["amount_paid"])) == Decimal("10000.00")
    assert len(receipt["items"]) == 2
    assert Decimal(str(receipt["items"][0]["amount_paid"])) == Decimal("8000.00")
    assert Decimal(str(receipt["items"][1]["amount_paid"])) == Decimal("2000.00")
    assert Decimal(str(receipt["total_remaining_balance"])) == Decimal("5000.00")
    receipt_no = receipt["receipt_number"]

    # 4. Stream PDF receipt
    res_pdf = client.get(f"/api/v1/pos/receipts/{receipt_no}/pdf", headers=admin_hdrs)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF-")


def test_absence_notification_dispatch(db, client, operations_setup):
    """Test automated absence notification trigger, parent resolution, and audit logs."""
    admin_u, admin_hdrs = _create_user(db, f"admin_{uuid.uuid4().hex[:6]}@school.com", "ADMIN")
    ay = operations_setup["ay"]
    grade = operations_setup["grade"]
    section = operations_setup["section"]

    # Student and Parent Link
    su, _ = _create_user(db, f"stu_{uuid.uuid4().hex[:6]}@school.com", "STUDENT")
    student = Student(
        user_id=su.id,
        student_code=f"STU-{uuid.uuid4().hex[:6]}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6]}",
        first_name="Ananya",
        last_name="Iyer",
        dob=dt.date(2011, 2, 20),
        class_name="Grade 8",
        section="Section A",
        current_grade_id=grade.id,
        current_section_id=section.id,
        department="General",
        admission_date=dt.date(2026, 4, 1),
    )
    db.add(student)
    db.commit()

    pu, _ = _create_user(db, f"parent_{uuid.uuid4().hex[:6]}@school.com", "PARENT")
    parent = Parent(
        user_id=pu.id,
        first_name="Sunil",
        last_name="Iyer",
        phone="+919876543299",
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

    # Attendance Session with student marked ABSENT
    session = AttendanceSession(
        academic_year_id=ay.id,
        grade_id=grade.id,
        section_id=section.id,
        date=dt.date(2026, 11, 9),
        period=1,
        submission_status="submitted",
        marked_by_user_id=admin_u.id,
    )
    db.add(session)
    db.commit()

    rec = AttendanceRecord(
        session_id=session.id,
        student_id=student.id,
        status=AttendanceStatus.ABSENT,
        date=session.date,
    )
    db.add(rec)
    db.commit()

    # Dispatch alerts for this session
    res_dispatch = client.post(
        f"/api/v1/absence-notifications/sessions/{session.id}/dispatch",
        headers=admin_hdrs,
    )
    assert res_dispatch.status_code == 200
    summary = res_dispatch.json()
    assert summary["sent_count"] == 1
    assert summary["logs"][0]["status"] == "SENT"
    assert summary["logs"][0]["recipient"] == "+919876543299"
    assert "Ananya Iyer" in summary["logs"][0]["message"]

    # Verify query audit logs
    res_logs = client.get(
        f"/api/v1/absence-notifications?student_id={student.id}",
        headers=admin_hdrs,
    )
    assert res_logs.status_code == 200
    assert len(res_logs.json()) >= 1


def test_academic_year_rollover(db, client):
    """Test preview and execution of academic year rollover with student progression and fee initialization."""
    admin_u, admin_hdrs = _create_user(db, f"admin_{uuid.uuid4().hex[:6]}@school.com", "ADMIN")

    # Source Year
    ay_src = AcademicYear(
        name=f"AY-SRC-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        status="active",
        is_current=True,
    )
    # Target Year
    ay_tgt = AcademicYear(
        name=f"AY-TGT-{uuid.uuid4().hex[:6]}",
        start_date=dt.date(2027, 4, 1),
        end_date=dt.date(2028, 3, 31),
        status="active",
        is_current=False,
    )
    db.add_all([ay_src, ay_tgt])
    db.commit()

    # Source Grade 1
    g1_src = Grade(academic_year_id=ay_src.id, name="Grade 1", level=1)
    db.add(g1_src)
    db.commit()
    sec1_src = Section(academic_year_id=ay_src.id, grade_id=g1_src.id, name="Section A", class_capacity=30)
    db.add(sec1_src)
    db.commit()

    # Target Grade 1 and Grade 2
    g1_tgt = Grade(academic_year_id=ay_tgt.id, name="Grade 1", level=1)
    g2_tgt = Grade(academic_year_id=ay_tgt.id, name="Grade 2", level=2)
    db.add_all([g1_tgt, g2_tgt])
    db.commit()
    sec1_tgt = Section(academic_year_id=ay_tgt.id, grade_id=g1_tgt.id, name="Section A", class_capacity=30)
    sec2_tgt = Section(academic_year_id=ay_tgt.id, grade_id=g2_tgt.id, name="Section A", class_capacity=30)
    db.add_all([sec1_tgt, sec2_tgt])
    db.commit()

    # Target Grade 2 Fee Structure
    fs_tgt = FeeStructure(
        academic_year_id=ay_tgt.id,
        grade_id=g2_tgt.id,
        name="Grade 2 Fee Structure",
        total_amount=Decimal("20000.00"),
        effective_date=dt.date(2027, 4, 1),
        status="active",
    )
    db.add(fs_tgt)
    db.commit()

    # Student in Source Grade 1
    su, _ = _create_user(db, f"stu_{uuid.uuid4().hex[:6]}@school.com", "STUDENT")
    student = Student(
        user_id=su.id,
        student_code=f"STU-{uuid.uuid4().hex[:6]}",
        enrollment_number=f"ENR-{uuid.uuid4().hex[:6]}",
        first_name="Aarav",
        last_name="Patel",
        dob=dt.date(2018, 1, 10),
        class_name="Grade 1",
        section="Section A",
        current_grade_id=g1_src.id,
        current_section_id=sec1_src.id,
        department="Primary",
        admission_date=dt.date(2026, 4, 1),
    )
    db.add(student)
    db.commit()

    enr = StudentEnrollment(
        student_id=student.id,
        academic_year_id=ay_src.id,
        grade_id=g1_src.id,
        section_id=sec1_src.id,
        enrollment_date=dt.date(2026, 4, 1),
        status=EnrollmentStatus.ACTIVE,
    )
    db.add(enr)
    db.commit()

    # 1. Preview Rollover
    res_prev = client.get(
        f"/api/v1/rollover/preview?source_year_id={ay_src.id}&target_year_id={ay_tgt.id}",
        headers=admin_hdrs,
    )
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["total_active_students"] == 1
    assert prev_data["cohort_mappings"][0]["target_grade_name"] == "Grade 2"

    # 2. Execute Rollover
    exec_payload = {
        "source_year_id": str(ay_src.id),
        "target_year_id": str(ay_tgt.id),
        "grade_mappings": [
            {
                "source_grade_id": str(g1_src.id),
                "target_grade_id": str(g2_tgt.id),
                "default_target_section_id": str(sec2_tgt.id),
            }
        ],
        "auto_assign_base_fees": True,
    }
    res_exec = client.post("/api/v1/rollover/execute", json=exec_payload, headers=admin_hdrs)
    assert res_exec.status_code == 200
    exec_data = res_exec.json()
    assert exec_data["promoted_count"] == 1
    assert exec_data["fee_assignments_created_count"] == 1

    # Verify student is now enrolled in Target Year Grade 2
    db.refresh(enr)
    assert enr.status == EnrollmentStatus.LEFT
    assert enr.reason == "ACADEMIC_YEAR_ROLLOVER_PROMOTED"

    db.refresh(student)
    assert student.current_grade_id == g2_tgt.id
    assert student.current_section_id == sec2_tgt.id
