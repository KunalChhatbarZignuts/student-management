import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Period,
    Section,
    TeacherSubject,
    Timetable,
    TimetableEntry,
)
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.classroom import Subject, TeacherAssignment
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.teacher_detail import (
    ComprehensiveTeacherDetailResponse,
    TeacherAttendanceSessionLog,
    TeacherClassRole,
    TeacherProfileDetails,
    TeacherSubjectAllocation,
    TeacherTimetableSlot,
    TeacherWorkloadMetrics,
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


def get_teacher_comprehensive_details(
    teacher_id: uuid.UUID, db: Session
) -> ComprehensiveTeacherDetailResponse:
    """Aggregates teacher profile, class teacher assignment, subject allocations,

    weekly teaching timetable, and roll-call session activity.
    """
    # 1. Fetch Teacher & linked User
    teacher = db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID '{teacher_id}' not found",
        )

    user = db.get(User, teacher.user_id) if teacher.user_id else None

    # 2. Build Profile
    profile = TeacherProfileDetails(
        employee_code=teacher.employee_code,
        first_name=teacher.first_name,
        last_name=teacher.last_name,
        department=teacher.department or "General Faculty",
        phone=teacher.phone,
        email=user.email if user else None,
        is_active=user.status == "active" if user else True,
        created_at=teacher.created_at,
        user_id=teacher.user_id,
        user_status=user.status if user else None,
        must_change_password=user.must_change_password if user else False,
    )

    # 3. Class Teacher Role
    class_role: TeacherClassRole | None = None
    ct_stmt = (
        select(TeacherAssignment, Section, Grade, AcademicYear)
        .join(Section, TeacherAssignment.section_id == Section.id)
        .join(Grade, Section.grade_id == Grade.id)
        .outerjoin(AcademicYear, Grade.academic_year_id == AcademicYear.id)
        .where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.is_active == True,
        )
    )
    ct_row = db.execute(ct_stmt).first()
    if ct_row:
        assignment, section, grade, year = ct_row
        class_role = TeacherClassRole(
            grade_name=grade.name,
            section_name=section.name,
            academic_year_name=year.name if year else None,
            role=assignment.role.replace("_", " ").title() if assignment.role else "Class Teacher",
            assigned_at=assignment.created_at,
        )

    # 4. Subject Allocations
    allocations_stmt = (
        select(TeacherSubject, Subject, Section, Grade)
        .join(Subject, TeacherSubject.subject_id == Subject.id)
        .join(Section, TeacherSubject.section_id == Section.id)
        .join(Grade, Section.grade_id == Grade.id)
        .where(
            TeacherSubject.teacher_id == teacher.id,
            TeacherSubject.status == "active",
        )
    )
    allocations_rows = db.execute(allocations_stmt).all()

    subject_allocations: list[TeacherSubjectAllocation] = []
    assigned_sections_set = set()

    for ts, subj, sec, grd in allocations_rows:
        assigned_sections_set.add(sec.id)

        subject_allocations.append(
            TeacherSubjectAllocation(
                id=ts.id,
                subject_id=subj.id,
                subject_name=subj.name,
                subject_code=subj.code,
                grade_name=grd.name,
                section_name=sec.name,
                periods_per_week=0,
                status=ts.status,
            )
        )

    # 5. Weekly Teaching Timetable
    timetable_stmt = (
        select(TimetableEntry, Period, Subject, Grade, Section)
        .join(Period, TimetableEntry.period_id == Period.id)
        .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
        .join(Section, Timetable.section_id == Section.id)
        .join(Grade, Timetable.grade_id == Grade.id)
        .outerjoin(Subject, TimetableEntry.subject_id == Subject.id)
        .where(
            TimetableEntry.teacher_id == teacher.id,
            Timetable.status == "published",
        )
        .order_by(TimetableEntry.day_of_week, Period.number)
    )
    tt_rows = db.execute(timetable_stmt).all()

    timetable_slots: list[TeacherTimetableSlot] = []
    for entry, period, subj, grd, sec in tt_rows:
        timetable_slots.append(
            TeacherTimetableSlot(
                day_of_week=format_day_of_week(entry.day_of_week),
                period_name=period.name,
                start_time=period.start_time.strftime("%H:%M") if hasattr(period.start_time, "strftime") else str(period.start_time),
                end_time=period.end_time.strftime("%H:%M") if hasattr(period.end_time, "strftime") else str(period.end_time),
                grade_name=grd.name,
                section_name=sec.name,
                subject_name=subj.name if subj else "General Class",
                subject_code=subj.code if subj else None,
                room_number=entry.room_number,
            )
        )

    workload = TeacherWorkloadMetrics(
        total_assigned_subjects=len(subject_allocations),
        total_weekly_periods=len(timetable_slots),
        total_assigned_sections=len(assigned_sections_set),
        has_class_teacher_role=class_role is not None,
    )

    # 6. Student Attendance Sessions Marked by Teacher
    sessions_stmt = (
        select(AttendanceSession, Section, Grade, Subject)
        .join(Section, AttendanceSession.section_id == Section.id)
        .join(Grade, AttendanceSession.grade_id == Grade.id)
        .outerjoin(Subject, AttendanceSession.subject_id == Subject.id)
        .where(AttendanceSession.taken_by_teacher_id == teacher.id)
        .order_by(AttendanceSession.date.desc())
        .limit(30)
    )
    session_rows = db.execute(sessions_stmt).all()

    attendance_activity: list[TeacherAttendanceSessionLog] = []
    for sess, sec, grd, subj in session_rows:
        # Count total records and present records for this session
        recs = (
            db.execute(
                select(AttendanceRecord.status)
                .where(AttendanceRecord.session_id == sess.id)
            )
            .scalars()
            .all()
        )
        tot_count = len(recs)
        pres_count = sum(1 for st in recs if st.upper() in ("PRESENT", "P", "LATE", "L"))

        attendance_activity.append(
            TeacherAttendanceSessionLog(
                id=sess.id,
                date=sess.date,
                grade_name=grd.name,
                section_name=sec.name,
                subject_name=subj.name if subj else None,
                total_students=tot_count,
                present_count=pres_count,
                recorded_at=sess.created_at,
            )
        )

    return ComprehensiveTeacherDetailResponse(
        teacher_id=teacher.id,
        employee_code=teacher.employee_code,
        profile=profile,
        class_teacher_role=class_role,
        workload=workload,
        subject_allocations=subject_allocations,
        timetable=timetable_slots,
        attendance_activity=attendance_activity,
        hr_notice="Staff biometric HR clock-in and staff leave applications are maintained externally.",
    )

