import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.academic_structure import (
    Period,
    Section,
    StudentEnrollment,
    TeacherSubject,
    Timetable,
    TimetableEntry,
)
from app.models.admission import Admission
from app.models.attendance import AttendanceRecord
from app.models.classroom import Subject, TeacherAssignment
from app.models.fee import (
    FeeInstallment,
    FeePayment,
    StudentFeeAssignment,
)
from app.models.leave import StudentLeaveApplication
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.student_detail import (
    ComprehensiveStudentDetailResponse,
    StudentAcademicDetails,
    StudentAdmissionDetails,
    StudentAttendanceSummary,
    StudentDailyAttendanceItem,
    StudentEnrollmentHistoryItem,
    StudentFeeInstallmentItem,
    StudentFeeSummary,
    StudentLeaveApplicationItem,
    StudentParentItem,
    StudentPaymentTransactionItem,
    StudentPersonalDetails,
    StudentSubjectItem,
    StudentTimetableSlotItem,
)


DAYS_OF_WEEK_MAP = {
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
    7: "SUNDAY",
}


def format_day_of_week(val: int | str) -> str:
    if isinstance(val, int):
        return DAYS_OF_WEEK_MAP.get(val, f"DAY {val}")
    try:
        ival = int(val)
        return DAYS_OF_WEEK_MAP.get(ival, f"DAY {ival}")
    except (ValueError, TypeError):
        return str(val).upper()


def get_student_comprehensive_details(
    student_id: uuid.UUID, db: Session
) -> ComprehensiveStudentDetailResponse:
    """Aggregates all personal, academic, admission, parent, attendance, leave, fee,

    and timetable records for a student into a single unified response.
    """
    # 1. Fetch Student and linked User
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    user = db.get(User, student.user_id) if student.user_id else None

    # 2. Build Personal Details
    personal_details = StudentPersonalDetails(
        first_name=student.first_name,
        middle_name=student.middle_name,
        last_name=student.last_name,
        dob=student.dob,
        gender=student.gender,
        blood_group=student.blood_group,
        allergies=student.allergies,
        medical_conditions=student.medical_conditions,
        emergency_contact_name=student.emergency_contact_name,
        emergency_contact_phone=student.emergency_contact_phone,
        authorized_pickup_info=student.authorized_pickup_info,
        phone=student.phone,
        alternate_phone=student.alternate_phone,
        email=user.email if user else None,
        address=student.address,
        city=student.city,
        state=student.state,
        country=student.country,
        postal_code=student.postal_code,
        profile_photo=student.profile_photo,
        department=student.department,
        status=student.status,
        admission_date=student.admission_date,
        created_at=student.created_at,
        user_id=student.user_id,
        user_status=user.status if user else None,
        must_change_password=user.must_change_password if user else False,
    )

    # 3. Academic Progression & Current Enrollment
    enrollments = (
        db.execute(
            select(StudentEnrollment)
            .options(
                joinedload(StudentEnrollment.grade),
                joinedload(StudentEnrollment.section),
                joinedload(StudentEnrollment.academic_year),
            )
            .where(StudentEnrollment.student_id == student_id)
            .order_by(StudentEnrollment.created_at.desc())
        )
        .scalars()
        .all()
    )

    enrollment_history: list[StudentEnrollmentHistoryItem] = []
    active_enrollment: StudentEnrollment | None = None

    for enr in enrollments:
        if not active_enrollment and enr.status.lower() in ("active", "enrolled"):
            active_enrollment = enr

        # Find Class Teacher for this section
        ct_stmt = (
            select(Teacher)
            .join(TeacherAssignment, TeacherAssignment.teacher_id == Teacher.id)
            .where(
                TeacherAssignment.section_id == enr.section_id,
                TeacherAssignment.is_active == True,
            )
        )
        ct = db.execute(ct_stmt).scalars().first()
        ct_name = f"{ct.first_name} {ct.last_name}" if ct else None

        roll_str = str(enr.roll_no) if enr.roll_no is not None else None
        enrollment_history.append(
            StudentEnrollmentHistoryItem(
                id=enr.id,
                enrollment_number=student.enrollment_number,
                roll_number=roll_str,
                academic_year_name=enr.academic_year.name if enr.academic_year else "N/A",
                grade_name=enr.grade.name if enr.grade else student.class_name,
                section_name=enr.section.name if enr.section else student.section,
                status=enr.status,
                class_teacher_name=ct_name,
                enrolled_at=enr.created_at,
            )
        )

    # Fallback to the latest enrollment if no active one found
    if not active_enrollment and enrollments:
        active_enrollment = enrollments[0]

    current_year_name = active_enrollment.academic_year.name if active_enrollment and active_enrollment.academic_year else None
    current_grade_name = active_enrollment.grade.name if active_enrollment and active_enrollment.grade else student.class_name
    current_section_name = active_enrollment.section.name if active_enrollment and active_enrollment.section else student.section
    current_roll = str(active_enrollment.roll_no) if active_enrollment and active_enrollment.roll_no is not None else None
    current_enr_num = student.enrollment_number

    # Current Section Class Teacher
    current_ct_name = None
    if active_enrollment and active_enrollment.section_id:
        ct_stmt = (
            select(Teacher)
            .join(TeacherAssignment, TeacherAssignment.teacher_id == Teacher.id)
            .where(
                TeacherAssignment.section_id == active_enrollment.section_id,
                TeacherAssignment.is_active == True,
            )
        )
        ct = db.execute(ct_stmt).scalars().first()
        if ct:
            current_ct_name = f"{ct.first_name} {ct.last_name}"

    # Active Subjects for Current Section
    active_subjects: list[StudentSubjectItem] = []
    if active_enrollment and active_enrollment.section_id:
        ts_stmt = (
            select(TeacherSubject, Subject, Teacher)
            .join(Subject, TeacherSubject.subject_id == Subject.id)
            .outerjoin(Teacher, TeacherSubject.teacher_id == Teacher.id)
            .where(
                TeacherSubject.section_id == active_enrollment.section_id,
                TeacherSubject.status == "active",
            )
        )
        ts_rows = db.execute(ts_stmt).all()
        for ts, s, sub_teacher in ts_rows:
            teacher_display = f"{sub_teacher.first_name} {sub_teacher.last_name}" if sub_teacher else None
            active_subjects.append(
                StudentSubjectItem(
                    id=s.id,
                    name=s.name,
                    code=s.code,
                    department=s.department,
                    teacher_name=teacher_display,
                )
            )

    academic_details = StudentAcademicDetails(
        current_academic_year=current_year_name,
        current_grade=current_grade_name,
        current_section=current_section_name,
        grade_id=active_enrollment.grade_id if active_enrollment else student.current_grade_id,
        section_id=active_enrollment.section_id if active_enrollment else student.current_section_id,
        current_roll_number=current_roll,
        current_enrollment_number=current_enr_num,
        class_teacher_name=current_ct_name,
        active_subjects=active_subjects,
        enrollment_history=enrollment_history,
    )

    # 4. Parents & Guardians
    parents_query = (
        select(ParentStudentLink, Parent, User)
        .join(Parent, ParentStudentLink.parent_id == Parent.id)
        .outerjoin(User, Parent.user_id == User.id)
        .where(ParentStudentLink.student_id == student_id)
    )
    parent_results = db.execute(parents_query).all()

    parents_list: list[StudentParentItem] = []
    for link, parent, p_user in parent_results:
        parents_list.append(
            StudentParentItem(
                id=parent.id,
                first_name=parent.first_name,
                last_name=parent.last_name,
                relationship=link.relationship_type,
                phone=parent.phone,
                email=p_user.email if p_user else None,
                is_primary_contact=link.is_primary_guardian,
                is_emergency_contact=False,
                can_pickup=True,
                user_status=p_user.status if p_user else None,
            )
        )

    # If no linked Parent records exist, fallback to Student's direct guardian info
    if not parents_list and student.guardian_name:
        parts = student.guardian_name.strip().split(" ", 1)
        g_first = parts[0]
        g_last = parts[1] if len(parts) > 1 else ""
        parents_list.append(
            StudentParentItem(
                id=uuid.uuid4(),
                first_name=g_first,
                last_name=g_last,
                relationship="GUARDIAN",
                phone=student.guardian_phone or "N/A",
                email=student.guardian_email,
                is_primary_contact=True,
                is_emergency_contact=True,
                can_pickup=True,
                user_status=None,
            )
        )

    # 5. Admission Details
    adm_stmt = (
        select(Admission)
        .options(joinedload(Admission.academic_year))
        .where(Admission.student_id == student_id)
        .order_by(Admission.created_at.desc())
    )
    admission = db.execute(adm_stmt).scalars().first()

    admission_details = StudentAdmissionDetails(
        application_number=admission.admission_number if admission else None,
        status=admission.status if admission else student.status,
        admission_date=student.admission_date,
        submitted_at=admission.created_at if admission else None,
        reviewed_at=None,
        approved_at=None,
        academic_year_name=admission.academic_year.name if admission and admission.academic_year else current_year_name,
        previous_school_name=student.previous_school_name,
        previous_school_details=student.previous_school_details,
    )

    # 6. Attendance Analytics & History
    records = (
        db.execute(
            select(AttendanceRecord)
            .options(joinedload(AttendanceRecord.session))
            .where(AttendanceRecord.student_id == student_id)
            .order_by(AttendanceRecord.date.desc())
        )
        .scalars()
        .all()
    )

    total_days = len(records)
    present_days = sum(1 for r in records if r.status.upper() in ("PRESENT", "P"))
    absent_days = sum(1 for r in records if r.status.upper() in ("ABSENT", "A"))
    late_days = sum(1 for r in records if r.status.upper() in ("LATE", "L"))
    excused_days = sum(1 for r in records if r.status.upper() in ("EXCUSED", "HALF_DAY", "E"))

    rate = round(((present_days + late_days) / total_days * 100), 1) if total_days > 0 else 0.0

    recent_attendance: list[StudentDailyAttendanceItem] = []
    for r in records[:30]:
        sub_name = None
        tch_name = None
        slot_display = None
        if r.session:
            slot_display = f"Period {r.session.period}" if r.session.period else "Daily Session"
            if r.session.subject_id:
                sub = db.get(Subject, r.session.subject_id)
                sub_name = sub.name if sub else None
            if r.session.taken_by_teacher_id:
                tch = db.get(Teacher, r.session.taken_by_teacher_id)
                tch_name = f"{tch.first_name} {tch.last_name}" if tch else None

        recent_attendance.append(
            StudentDailyAttendanceItem(
                date=r.date,
                status=r.status.upper(),
                period_slot=slot_display,
                subject_name=sub_name,
                teacher_name=tch_name,
                remarks=r.remark or r.notes,
            )
        )

    attendance_summary = StudentAttendanceSummary(
        total_days=total_days,
        present_days=present_days,
        absent_days=absent_days,
        late_days=late_days,
        excused_days=excused_days,
        attendance_rate_percentage=rate,
        recent_history=recent_attendance,
    )

    # 7. Student Leave Applications
    leaves = (
        db.execute(
            select(StudentLeaveApplication)
            .where(StudentLeaveApplication.student_id == student_id)
            .order_by(StudentLeaveApplication.created_at.desc())
        )
        .scalars()
        .all()
    )

    leave_items: list[StudentLeaveApplicationItem] = []
    for lv in leaves:
        rev_name = None
        if lv.decided_by_teacher_id:
            rev_teacher = db.get(Teacher, lv.decided_by_teacher_id)
            if rev_teacher:
                rev_name = f"{rev_teacher.first_name} {rev_teacher.last_name}"

        leave_items.append(
            StudentLeaveApplicationItem(
                id=lv.id,
                start_date=lv.start_date,
                end_date=lv.end_date,
                days_count=lv.days_count,
                leave_type="Standard Leave",
                submission_role=lv.submission_role,
                reason=lv.reason,
                status=lv.status.upper(),
                reviewed_by_teacher_name=rev_name,
                reviewed_at=lv.decided_at,
                rejection_reason=lv.teacher_remarks,
                created_at=lv.created_at,
            )
        )

    # 8. Fees & Ledger Summary
    fee_assignment = (
        db.execute(
            select(StudentFeeAssignment)
            .options(
                joinedload(StudentFeeAssignment.fee_structure),
                joinedload(StudentFeeAssignment.academic_year),
                joinedload(StudentFeeAssignment.installments),
            )
            .where(StudentFeeAssignment.student_id == student_id)
            .order_by(StudentFeeAssignment.created_at.desc())
        )
        .scalars()
        .first()
    )

    fee_summary = StudentFeeSummary()
    if fee_assignment:
        # Calculate paid and outstanding
        paid_amt = sum(inst.paid_amount for inst in fee_assignment.installments)
        out_amt = sum(inst.outstanding_amount for inst in fee_assignment.installments)

        inst_items: list[StudentFeeInstallmentItem] = []
        for inst in sorted(fee_assignment.installments, key=lambda x: x.installment_number):
            inst_items.append(
                StudentFeeInstallmentItem(
                    id=inst.id,
                    installment_number=inst.installment_number,
                    installment_name=inst.installment_name,
                    due_date=inst.due_date,
                    amount=inst.amount,
                    paid_amount=inst.paid_amount,
                    balance=inst.outstanding_amount,
                    status=inst.status.upper(),
                )
            )

        # Payments
        payments = (
            db.execute(
                select(FeePayment)
                .where(FeePayment.assignment_id == fee_assignment.id)
                .order_by(FeePayment.payment_date.desc())
            )
            .scalars()
            .all()
        )

        payment_items: list[StudentPaymentTransactionItem] = [
            StudentPaymentTransactionItem(
                id=p.id,
                receipt_number=p.receipt_number,
                payment_method=p.payment_method,
                amount=p.amount,
                payment_date=p.payment_date,
                status=p.status.upper(),
                reference_note=p.reference_note,
            )
            for p in payments
        ]

        fee_summary = StudentFeeSummary(
            has_fee_assignment=True,
            fee_structure_name=fee_assignment.fee_structure.name if fee_assignment.fee_structure else "Standard Fee Plan",
            academic_year_name=fee_assignment.academic_year.name if fee_assignment.academic_year else current_year_name,
            currency=fee_assignment.currency or "USD",
            total_amount=fee_assignment.base_amount + fee_assignment.total_additional,
            discount_amount=fee_assignment.total_discount,
            net_amount=fee_assignment.final_payable_amount,
            paid_amount=paid_amt,
            outstanding_balance=out_amt,
            status=fee_assignment.status.upper(),
            installments=inst_items,
            payments=payment_items,
        )

    # 9. Class Timetable
    timetable_slots: list[StudentTimetableSlotItem] = []
    if active_enrollment and active_enrollment.section_id:
        tt = (
            db.execute(
                select(Timetable)
                .where(
                    Timetable.section_id == active_enrollment.section_id,
                    Timetable.status == "published",
                )
                .order_by(Timetable.version.desc())
            )
            .scalars()
            .first()
        )

        if tt:
            entries = (
                db.execute(
                    select(TimetableEntry, Period, Subject, Teacher)
                    .join(Period, TimetableEntry.period_id == Period.id)
                    .outerjoin(Subject, TimetableEntry.subject_id == Subject.id)
                    .outerjoin(Teacher, TimetableEntry.teacher_id == Teacher.id)
                    .where(TimetableEntry.timetable_id == tt.id)
                    .order_by(TimetableEntry.day_of_week, Period.number)
                )
                .all()
            )

            for entry, period, subject, teacher in entries:
                t_name = f"{teacher.first_name} {teacher.last_name}" if teacher else None
                timetable_slots.append(
                    StudentTimetableSlotItem(
                        day_of_week=format_day_of_week(entry.day_of_week),
                        period_name=period.name,
                        start_time=period.start_time.strftime("%H:%M") if hasattr(period.start_time, "strftime") else str(period.start_time),
                        end_time=period.end_time.strftime("%H:%M") if hasattr(period.end_time, "strftime") else str(period.end_time),
                        subject_name=subject.name if subject else "General Period",
                        subject_code=subject.code if subject else None,
                        teacher_name=t_name,
                        room_number=entry.room_number,
                    )
                )

    return ComprehensiveStudentDetailResponse(
        student_id=student.id,
        student_code=student.student_code,
        enrollment_number=current_enr_num,
        personal_details=personal_details,
        academic_details=academic_details,
        parents=parents_list,
        admission_details=admission_details,
        attendance_summary=attendance_summary,
        leave_applications=leave_items,
        fees=fee_summary,
        timetable=timetable_slots,
    )

