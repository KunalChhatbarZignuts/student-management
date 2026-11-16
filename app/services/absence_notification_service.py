import datetime as dt
import uuid
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.academic_structure import AcademicYear, Grade, Section
from app.models.attendance import (
    AbsenceNotificationLog,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
)
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.schemas.absence_notification import (
    AbsenceNotificationLogItem,
    AbsenceNotificationSummary,
)
from app.services.calendar_service import check_date_working_status


def dispatch_absence_notifications_for_session(
    db: Session,
    session_id: uuid.UUID,
) -> AbsenceNotificationSummary:
    """Evaluate and dispatch automated absence alerts for all absent students in an attendance session."""
    session = db.get(AttendanceSession, session_id)
    if not session:
        return AbsenceNotificationSummary(
            total_triggered=0,
            sent_count=0,
            suppressed_holiday_count=0,
            suppressed_no_contact_count=0,
            failed_count=0,
            logs=[],
        )

    grade = session.grade
    section = session.section
    grade_name = grade.name if grade else "Grade"
    section_name = section.name if section else "Section"

    # Check holiday suppression
    is_holiday = False
    holiday_reason = None
    if session.academic_year_id:
        try:
            working_status = check_date_working_status(
                target_date=session.date,
                academic_year_id=session.academic_year_id,
                grade_id=session.grade_id,
                section_id=session.section_id,
                db=db,
            )
            if not working_status.is_working_day:
                is_holiday = True
                holiday_reason = working_status.reason or working_status.holiday_name or "Official Holiday / Weekend"
        except Exception:
            is_holiday = False

    # Get all absent records for this session
    records = db.scalars(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.status == AttendanceStatus.ABSENT,
        )
        .options(
            joinedload(AttendanceRecord.student),
        )
    ).all()

    created_logs: list[AbsenceNotificationLog] = []

    for r in records:
        student = r.student
        if not student:
            continue

        # Prevent duplicate alert logs for the same record
        existing_log = db.scalars(
            select(AbsenceNotificationLog).where(
                AbsenceNotificationLog.attendance_record_id == r.id
            )
        ).first()
        if existing_log:
            created_logs.append(existing_log)
            continue

        student_name = f"{student.first_name} {student.last_name}".strip()

        if is_holiday:
            log = AbsenceNotificationLog(
                student_id=student.id,
                parent_id=None,
                attendance_record_id=r.id,
                session_id=session.id,
                date=session.date,
                channel="IN_APP",
                recipient=None,
                status="SUPPRESSED_HOLIDAY",
                message=f"Attendance marked absent on declared non-working day ({holiday_reason}). Alert suppressed.",
                error_message=holiday_reason,
            )
            db.add(log)
            created_logs.append(log)
            continue

        # Resolve Parent contact
        # Check parent-student links
        links = db.scalars(
            select(ParentStudentLink)
            .where(ParentStudentLink.student_id == student.id)
            .options(
                joinedload(ParentStudentLink.parent).joinedload(Parent.user)
            )
        ).all()

        parent: Optional[Parent] = None
        recipient: Optional[str] = None

        if links:
            # Sort primary guardian first
            sorted_links = sorted(links, key=lambda l: not l.is_primary_guardian)
            best_link = sorted_links[0]
            parent = best_link.parent
            if parent:
                recipient = parent.phone or (parent.user.email if parent.user else None)

        if not recipient:
            # Fall back to student guardian contact details
            recipient = student.guardian_phone or getattr(student, "guardian_email", None) or student.phone

        if not recipient:
            # No reachable contact
            log = AbsenceNotificationLog(
                student_id=student.id,
                parent_id=parent.id if parent else None,
                attendance_record_id=r.id,
                session_id=session.id,
                date=session.date,
                channel="IN_APP",
                recipient=None,
                status="SUPPRESSED_NO_CONTACT",
                message=f"No parent or guardian contact information found for student {student_name}. Alert suppressed.",
                error_message="Missing phone and email contact",
            )
            db.add(log)
            created_logs.append(log)
            continue

        # Valid contact found -> Dispatch alert
        alert_msg = (
            f"Dear Parent/Guardian, your child {student_name} was marked ABSENT today "
            f"({session.date.strftime('%d-%b-%Y')}) for Period {session.period} ({grade_name} - {section_name}). "
            f"If this was unexpected, please contact the school administration."
        )

        log = AbsenceNotificationLog(
            student_id=student.id,
            parent_id=parent.id if parent else None,
            attendance_record_id=r.id,
            session_id=session.id,
            date=session.date,
            channel="IN_APP",
            recipient=recipient,
            status="SENT",
            message=alert_msg,
            error_message=None,
        )
        db.add(log)
        created_logs.append(log)

    db.commit()

    sent_count = sum(1 for l in created_logs if l.status == "SENT")
    suppressed_holiday = sum(1 for l in created_logs if l.status == "SUPPRESSED_HOLIDAY")
    suppressed_no_contact = sum(1 for l in created_logs if l.status == "SUPPRESSED_NO_CONTACT")
    failed_count = sum(1 for l in created_logs if l.status == "FAILED")

    log_items: list[AbsenceNotificationLogItem] = []
    for l in created_logs:
        st = db.get(Student, l.student_id)
        pt = db.get(Parent, l.parent_id) if l.parent_id else None
        log_items.append(
            AbsenceNotificationLogItem(
                id=l.id,
                student_id=l.student_id,
                student_name=f"{st.first_name} {st.last_name}" if st else "Student",
                admission_number=(st.enrollment_number or st.student_code) if st else "",
                grade_name=grade_name,
                section_name=section_name,
                parent_id=l.parent_id,
                parent_name=f"{pt.first_name} {pt.last_name}" if pt else None,
                date=l.date,
                period=session.period,
                channel=l.channel,
                recipient=l.recipient,
                status=l.status,
                message=l.message,
                error_message=l.error_message,
                sent_at=l.sent_at,
            )
        )

    return AbsenceNotificationSummary(
        total_triggered=len(created_logs),
        sent_count=sent_count,
        suppressed_holiday_count=suppressed_holiday,
        suppressed_no_contact_count=suppressed_no_contact,
        failed_count=failed_count,
        logs=log_items,
    )


def list_absence_notification_logs(
    db: Session,
    target_date: Optional[dt.date] = None,
    student_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
) -> list[AbsenceNotificationLogItem]:
    """Retrieve history of absence notification dispatch logs."""
    stmt = (
        select(AbsenceNotificationLog)
        .options(
            joinedload(AbsenceNotificationLog.student).joinedload(Student.current_grade),
            joinedload(AbsenceNotificationLog.student).joinedload(Student.current_section),
            joinedload(AbsenceNotificationLog.parent),
            joinedload(AbsenceNotificationLog.session),
        )
    )

    if target_date:
        stmt = stmt.where(AbsenceNotificationLog.date == target_date)
    if student_id:
        stmt = stmt.where(AbsenceNotificationLog.student_id == student_id)
    if status_filter:
        stmt = stmt.where(AbsenceNotificationLog.status == status_filter)

    logs = db.scalars(stmt.order_by(AbsenceNotificationLog.sent_at.desc()).limit(limit)).all()
    results: list[AbsenceNotificationLogItem] = []

    for l in logs:
        st = l.student
        pt = l.parent
        ses = l.session
        grade = st.current_grade if st else None
        section = st.current_section if st else None

        results.append(
            AbsenceNotificationLogItem(
                id=l.id,
                student_id=l.student_id,
                student_name=f"{st.first_name} {st.last_name}".strip() if st else "Student",
                admission_number=(st.enrollment_number or st.student_code) if st else "",
                grade_name=grade.name if grade else "N/A",
                section_name=section.name if section else "N/A",
                parent_id=l.parent_id,
                parent_name=f"{pt.first_name} {pt.last_name}".strip() if pt else None,
                date=l.date,
                period=ses.period if ses else 1,
                channel=l.channel,
                recipient=l.recipient,
                status=l.status,
                message=l.message,
                error_message=l.error_message,
                sent_at=l.sent_at,
            )
        )

    return results
