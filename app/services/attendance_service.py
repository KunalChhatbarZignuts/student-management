import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.models.classroom import Class, Subject, TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.attendance import (
    AttendanceBulkCreate,
    AttendanceRecordResponse,
    AttendanceSessionResponse,
    AttendanceSessionUpdate,
    ClassAttendanceSummaryResponse,
    StudentAttendanceSummaryItem,
    StudentMeAttendanceRecord,
    StudentMeAttendanceResponse,
)
from app.services.audit_service import log_action


def _verify_teacher_class_access(teacher_id: uuid.UUID, class_id: uuid.UUID, db: Session) -> Class:
    """Verifies teacher assignment to class. Returns 404 if not assigned or class inactive."""
    assignment = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.class_id == class_id,
            TeacherAssignment.status == "active",
        )
    ).scalars().first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or not assigned to teacher",
        )
    classroom = db.get(Class, class_id)
    if not classroom or classroom.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or inactive",
        )
    return classroom


def create_bulk_attendance(
    payload: AttendanceBulkCreate,
    teacher: Teacher,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> AttendanceSessionResponse:
    # 1. Enforce ownership: teacher must be assigned to this class
    classroom = _verify_teacher_class_access(teacher.id, payload.class_id, db)

    # 2. Verify subject exists
    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.status != "active":
        raise HTTPException(status_code=404, detail="Subject not found or inactive")

    # 3. Rule: cannot mark a future date
    today = datetime.now(timezone.utc).date()
    if payload.date > today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark attendance for a future date",
        )

    # 4. Rule: cannot mark twice for the same period (return 409)
    existing_session = db.execute(
        select(AttendanceSession).where(
            AttendanceSession.class_id == payload.class_id,
            AttendanceSession.subject_id == payload.subject_id,
            AttendanceSession.date == payload.date,
            AttendanceSession.period == payload.period,
        )
    ).scalar_one_or_none()
    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance session already exists for date {payload.date} and period {payload.period}",
        )

    # 5. Rule: all students in the payload must belong to that class and be active
    class_students = db.execute(
        select(Student).where(
            Student.class_name == classroom.name,
            Student.section == classroom.section,
            Student.status == "active",
        )
    ).scalars().all()
    valid_student_ids = {s.id for s in class_students}
    student_map = {s.id: s for s in class_students}

    payload_student_ids = set()
    for item in payload.records:
        if item.student_id not in valid_student_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student {item.student_id} does not belong to class {classroom.name}-{classroom.section} or is not active",
            )
        if item.student_id in payload_student_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate student record in attendance submission: {item.student_id}",
            )
        payload_student_ids.add(item.student_id)

    # 6. Atomic write: create session and records in one transaction
    session = AttendanceSession(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        date=payload.date,
        period=payload.period,
        taken_by_teacher_id=teacher.id,
    )
    db.add(session)
    db.flush()  # generates session.id

    records: list[AttendanceRecord] = []
    record_responses: list[AttendanceRecordResponse] = []
    for item in payload.records:
        rec = AttendanceRecord(
            session_id=session.id,
            student_id=item.student_id,
            status=item.status.value if isinstance(item.status, AttendanceStatus) else item.status,
            remark=item.remark,
            date=payload.date,
        )
        db.add(rec)
        records.append(rec)

    db.commit()
    db.refresh(session)

    # Build response with student names
    for rec in session.records:
        st = student_map.get(rec.student_id)
        record_responses.append(
            AttendanceRecordResponse(
                id=rec.id,
                session_id=rec.session_id,
                student_id=rec.student_id,
                status=rec.status,
                remark=rec.remark,
                student_name=f"{st.first_name} {st.last_name}" if st else None,
                student_code=st.student_code if st else None,
            )
        )

    log_action(
        db,
        action="attendance_marked",
        entity_type="attendance_session",
        actor_user_id=actor_user_id,
        entity_id=str(session.id),
        metadata={
            "class_id": str(payload.class_id),
            "subject_id": str(payload.subject_id),
            "date": str(payload.date),
            "period": payload.period,
            "total_marked": len(payload.records),
        },
        ip=ip,
    )

    return AttendanceSessionResponse(
        id=session.id,
        class_id=session.class_id,
        subject_id=session.subject_id,
        date=session.date,
        period=session.period,
        taken_by_teacher_id=session.taken_by_teacher_id,
        locked_at=session.locked_at,
        created_at=session.created_at,
        updated_at=session.updated_at,
        class_name=classroom.name,
        section=classroom.section,
        subject_name=subject.name,
        records=record_responses,
    )


def get_teacher_attendance(
    class_id: uuid.UUID,
    target_date: date | None,
    teacher: Teacher,
    db: Session,
) -> list[AttendanceSessionResponse]:
    # Enforce ownership: 404 if class not assigned to teacher
    classroom = _verify_teacher_class_access(teacher.id, class_id, db)

    query = (
        select(AttendanceSession)
        .where(AttendanceSession.class_id == class_id)
        .order_by(AttendanceSession.date.desc(), AttendanceSession.period.asc())
    )
    if target_date:
        query = query.where(AttendanceSession.date == target_date)

    sessions = db.execute(query).scalars().all()

    results: list[AttendanceSessionResponse] = []
    for s in sessions:
        sub = db.get(Subject, s.subject_id)
        records_resp = []
        for r in s.records:
            st = db.get(Student, r.student_id)
            records_resp.append(
                AttendanceRecordResponse(
                    id=r.id,
                    session_id=r.session_id,
                    student_id=r.student_id,
                    status=r.status,
                    remark=r.remark,
                    student_name=f"{st.first_name} {st.last_name}" if st else None,
                    student_code=st.student_code if st else None,
                )
            )
        results.append(
            AttendanceSessionResponse(
                id=s.id,
                class_id=s.class_id,
                subject_id=s.subject_id,
                date=s.date,
                period=s.period,
                taken_by_teacher_id=s.taken_by_teacher_id,
                locked_at=s.locked_at,
                created_at=s.created_at,
                updated_at=s.updated_at,
                class_name=classroom.name,
                section=classroom.section,
                subject_name=sub.name if sub else None,
                records=records_resp,
            )
        )
    return results


def update_attendance_session(
    session_id: uuid.UUID,
    payload: AttendanceSessionUpdate,
    actor_user_id: uuid.UUID,
    is_admin: bool,
    teacher: Teacher | None,
    ip: str | None,
    db: Session,
) -> AttendanceSessionResponse:
    session = db.get(AttendanceSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    # Enforce teacher ownership if not admin
    if not is_admin:
        if not teacher:
            raise HTTPException(status_code=403, detail="Forbidden")
        _verify_teacher_class_access(teacher.id, session.class_id, db)

    # Check edit window (default 24h)
    edit_window = timedelta(hours=settings.ATTENDANCE_EDIT_WINDOW_HOURS)
    now = datetime.now(timezone.utc)
    # Ensure session.created_at is tz-aware for comparison
    created_at = session.created_at if session.created_at.tzinfo else session.created_at.replace(tzinfo=timezone.utc)
    if not is_admin and (now - created_at > edit_window or session.locked_at is not None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Attendance edit window ({settings.ATTENDANCE_EDIT_WINDOW_HOURS}h) has expired. Only administrators can modify locked records.",
        )

    classroom = db.get(Class, session.class_id)
    subject = db.get(Subject, session.subject_id)

    # Map existing records by student_id
    existing_records = {r.student_id: r for r in session.records}

    # Update or insert
    for item in payload.records:
        rec = existing_records.get(item.student_id)
        status_val = item.status.value if isinstance(item.status, AttendanceStatus) else item.status
        if rec:
            rec.status = status_val
            rec.remark = item.remark
        else:
            new_rec = AttendanceRecord(
                session_id=session.id,
                student_id=item.student_id,
                status=status_val,
                remark=item.remark,
                date=session.date,
            )
            db.add(new_rec)

    db.commit()
    db.refresh(session)

    log_action(
        db,
        action="attendance_updated",
        entity_type="attendance_session",
        actor_user_id=actor_user_id,
        entity_id=str(session.id),
        metadata={
            "session_id": str(session.id),
            "updated_by_admin": is_admin,
            "records_updated": len(payload.records),
        },
        ip=ip,
    )

    records_resp = []
    for r in session.records:
        st = db.get(Student, r.student_id)
        records_resp.append(
            AttendanceRecordResponse(
                id=r.id,
                session_id=r.session_id,
                student_id=r.student_id,
                status=r.status,
                remark=r.remark,
                student_name=f"{st.first_name} {st.last_name}" if st else None,
                student_code=st.student_code if st else None,
            )
        )

    return AttendanceSessionResponse(
        id=session.id,
        class_id=session.class_id,
        subject_id=session.subject_id,
        date=session.date,
        period=session.period,
        taken_by_teacher_id=session.taken_by_teacher_id,
        locked_at=session.locked_at,
        created_at=session.created_at,
        updated_at=session.updated_at,
        class_name=classroom.name if classroom else None,
        section=classroom.section if classroom else None,
        subject_name=subject.name if subject else None,
        records=records_resp,
    )


def get_class_attendance_summary(
    class_id: uuid.UUID,
    from_date: date,
    to_date: date,
    teacher: Teacher,
    db: Session,
) -> ClassAttendanceSummaryResponse:
    # Enforce ownership: 404 if not assigned
    classroom = _verify_teacher_class_access(teacher.id, class_id, db)

    if from_date > to_date:
        raise HTTPException(status_code=400, detail="from_date must not be greater than to_date")

    # Fetch all sessions in range
    sessions = db.execute(
        select(AttendanceSession).where(
            AttendanceSession.class_id == class_id,
            AttendanceSession.date >= from_date,
            AttendanceSession.date <= to_date,
        )
    ).scalars().all()
    session_ids = [s.id for s in sessions]
    total_sessions = len(session_ids)

    # Fetch all active students in class
    students = db.execute(
        select(Student).where(
            Student.class_name == classroom.name,
            Student.section == classroom.section,
            Student.status == "active",
        ).order_by(Student.student_code.asc())
    ).scalars().all()

    # Query attendance records for these sessions
    records = []
    if session_ids:
        records = db.execute(
            select(AttendanceRecord).where(AttendanceRecord.session_id.in_(session_ids))
        ).scalars().all()

    # Aggregate by student
    student_stats: dict[uuid.UUID, dict[str, int]] = {
        s.id: {"present": 0, "absent": 0, "late": 0, "excused": 0, "total": 0}
        for s in students
    }

    for r in records:
        if r.student_id in student_stats:
            stats = student_stats[r.student_id]
            stats["total"] += 1
            st_lower = r.status.lower()
            if st_lower == "present":
                stats["present"] += 1
            elif st_lower == "absent":
                stats["absent"] += 1
            elif st_lower == "late":
                stats["late"] += 1
            elif st_lower == "excused":
                stats["excused"] += 1

    items: list[StudentAttendanceSummaryItem] = []
    for s in students:
        stats = student_stats[s.id]
        attended = stats["present"] + stats["late"] + stats["excused"]
        tot = total_sessions if total_sessions > 0 else stats["total"]
        pct = round((attended / tot * 100), 1) if tot > 0 else 100.0
        items.append(
            StudentAttendanceSummaryItem(
                student_id=s.id,
                student_code=s.student_code,
                name=f"{s.first_name} {s.last_name}",
                total_sessions=tot,
                present_count=stats["present"],
                absent_count=stats["absent"],
                late_count=stats["late"],
                excused_count=stats["excused"],
                percentage=pct,
            )
        )

    return ClassAttendanceSummaryResponse(
        class_id=classroom.id,
        class_name=classroom.name,
        section=classroom.section,
        from_date=from_date,
        to_date=to_date,
        total_sessions=total_sessions,
        items=items,
    )


def get_student_self_attendance(
    student_id: uuid.UUID,
    db: Session,
) -> StudentMeAttendanceResponse:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    records = db.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.student_id == student_id)
        .order_by(AttendanceRecord.created_at.desc())
    ).scalars().all()

    me_records: list[StudentMeAttendanceRecord] = []
    attended_count = 0
    excused_count = 0

    for r in records:
        r_date = r.date
        period = None
        subject_name = None
        if r.session_id:
            session = db.get(AttendanceSession, r.session_id)
            if session:
                r_date = session.date
                period = session.period
                sub = db.get(Subject, session.subject_id)
                if sub:
                    subject_name = sub.name

        st_lower = r.status.lower()
        if st_lower in ("present", "late", "excused"):
            attended_count += 1
        if st_lower == "excused":
            excused_count += 1

        me_records.append(
            StudentMeAttendanceRecord(
                id=r.id,
                date=r_date or datetime.now(timezone.utc).date(),
                period=period,
                subject_name=subject_name,
                status=r.status.upper(),
                remark=r.remark or r.notes,
            )
        )

    total = len(me_records)
    pct = round((attended_count / total * 100), 1) if total > 0 else 100.0

    return StudentMeAttendanceResponse(
        student_id=student.id,
        student_code=student.student_code,
        total_classes=total,
        attended_classes=attended_count,
        percentage=pct,
        excused_absences=excused_count,
        records=me_records,
    )

