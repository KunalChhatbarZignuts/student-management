import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.attendance import AttendanceAuditHistory, AttendanceRecord, AttendanceSession, AttendanceStatus
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

    # 3. Rule: cannot mark on a holiday or non-working day
    ay_record = db.execute(select(AcademicYear).where(AcademicYear.is_current.is_(True))).scalars().first()
    if ay_record:
        from app.services.calendar_service import check_date_working_status
        status_info = check_date_working_status(
            target_date=payload.date,
            academic_year_id=ay_record.id,
            grade_id=None,
            section_id=None,
            db=db,
        )
        if not status_info.is_working_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark attendance on a non-working day or holiday ({status_info.reason})",
            )

    # 4. Rule: cannot mark a future date
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
        now_utc = datetime.now(timezone.utc)
        s_created = s.created_at if s.created_at.tzinfo else s.created_at.replace(tzinfo=timezone.utc)
        rem_secs = max(0, int((s_created + timedelta(minutes=settings.TEACHER_ATTENDANCE_GRACE_MINUTES) - now_utc).total_seconds()))
        can_edit = s.locked_at is None and rem_secs > 0

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
                can_teacher_edit=can_edit,
                edit_window_remaining_seconds=rem_secs,
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

    # Check edit window (30-minute grace window for teachers; settings.ATTENDANCE_EDIT_WINDOW_HOURS for admins)
    now = datetime.now(timezone.utc)
    created_at = session.created_at if session.created_at.tzinfo else session.created_at.replace(tzinfo=timezone.utc)
    
    if not is_admin:
        grace_window = timedelta(minutes=settings.TEACHER_ATTENDANCE_GRACE_MINUTES)
        if now - created_at > grace_window or session.locked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Attendance edit window ({settings.TEACHER_ATTENDANCE_GRACE_MINUTES}m) has expired. Only administrators can modify locked records.",
            )
    elif session.locked_at is not None and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attendance session is locked and cannot be modified.",
        )

    classroom = db.get(Class, session.class_id)
    subject = db.get(Subject, session.subject_id)

    # Map existing records by student_id
    existing_records = {r.student_id: r for r in session.records}

    # Verify mandatory correction remark for teachers when amending statuses
    if not is_admin:
        has_status_change = False
        for item in payload.records:
            rec = existing_records.get(item.student_id)
            status_val = item.status.value if isinstance(item.status, AttendanceStatus) else item.status
            if not rec or rec.status != status_val:
                has_status_change = True
                break

        if has_status_change:
            effective_remark = (payload.correction_remark or "").strip()
            if not effective_remark:
                has_item_remark = any(
                    bool(item.remark and item.remark.strip())
                    for item in payload.records
                    if not existing_records.get(item.student_id)
                    or existing_records[item.student_id].status != (item.status.value if isinstance(item.status, AttendanceStatus) else item.status)
                )
                if not has_item_remark:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="A non-empty correction remark is mandatory when amending roll call within the grace window.",
                    )

    # Update or insert, writing audit log for changes
    for item in payload.records:
        rec = existing_records.get(item.student_id)
        status_val = item.status.value if isinstance(item.status, AttendanceStatus) else item.status
        reason = (payload.correction_remark or item.remark or ("Teacher self-correction within grace window" if not is_admin else "Admin amendment")).strip()
        if rec:
            if rec.status != status_val:
                audit = AttendanceAuditHistory(
                    record_id=rec.id,
                    session_id=session.id,
                    student_id=rec.student_id,
                    previous_status=rec.status,
                    new_status=status_val,
                    reason=reason,
                    modified_by_user_id=actor_user_id,
                )
                db.add(audit)
            rec.status = status_val
            rec.remark = item.remark or rec.remark
        else:
            new_rec = AttendanceRecord(
                session_id=session.id,
                student_id=item.student_id,
                status=status_val,
                remark=item.remark or payload.correction_remark,
                date=session.date,
            )
            db.add(new_rec)
            db.flush()
            audit = AttendanceAuditHistory(
                record_id=new_rec.id,
                session_id=session.id,
                student_id=item.student_id,
                previous_status="UNRECORDED",
                new_status=status_val,
                reason=reason,
                modified_by_user_id=actor_user_id,
            )
            db.add(audit)

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

    rem_secs = max(0, int((created_at + timedelta(minutes=settings.TEACHER_ATTENDANCE_GRACE_MINUTES) - now).total_seconds()))
    can_teacher_edit = session.locked_at is None and rem_secs > 0

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
        can_teacher_edit=can_teacher_edit,
        edit_window_remaining_seconds=rem_secs,
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


# ==========================================
# Grade & Section-Wise Attendance Services
# ==========================================

from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.attendance import AttendanceAuditHistory
from app.schemas.attendance import (
    AdminAttendanceOverviewResponse,
    AdminAttendanceRecordUpdate,
    AssignedSectionItem,
    AttendanceAuditItemResponse,
    SectionAttendanceCreate,
    SectionDailyOverviewItem,
    StudentAttendanceHistoryRecord,
    StudentAttendanceHistoryResponse,
)


def get_teacher_assigned_sections(teacher_id: uuid.UUID, db: Session) -> list[AssignedSectionItem]:
    """Retrieve all sections where this teacher is assigned (or is grade coordinator)."""
    assignments = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.is_active == True,
        )
    ).scalars().all()

    section_roles: dict[uuid.UUID, str] = {}
    for a in assignments:
        section_roles[a.section_id] = a.assignment_type or "Class Teacher"

    coords = db.execute(
        select(Grade).where(Grade.coordinator_teacher_id == teacher_id, Grade.status == "active")
    ).scalars().all()
    for g in coords:
        for s in g.sections:
            if s.status == "active" and s.id not in section_roles:
                section_roles[s.id] = "Grade Coordinator"

    section_ids = list(section_roles.keys())
    if not section_ids:
        return []

    sections = db.execute(
        select(Section).where(Section.id.in_(section_ids), Section.status == "active")
    ).scalars().all()

    results: list[AssignedSectionItem] = []
    for sec in sections:
        stu_count = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == sec.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()

        results.append(
            AssignedSectionItem(
                section_id=sec.id,
                section_name=sec.name,
                grade_id=sec.grade_id,
                grade_name=sec.grade.name if sec.grade else "Grade",
                academic_year_id=sec.academic_year_id,
                role=section_roles.get(sec.id, "Teacher"),
                enrolled_students_count=stu_count,
            )
        )
    results.sort(key=lambda x: (x.grade_name, x.section_name))
    return results


def verify_teacher_section_access(teacher_id: uuid.UUID, section_id: uuid.UUID, db: Session) -> Section:
    """Verifies that the teacher is actively assigned to this section or is its Grade Coordinator."""
    section = db.get(Section, section_id)
    if not section or section.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found or inactive")

    assignment = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.section_id == section.id,
            TeacherAssignment.is_active == True,
        )
    ).scalars().first()

    grade = db.get(Grade, section.grade_id)
    is_coord = grade and grade.coordinator_teacher_id == teacher_id

    if not assignment and not is_coord:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation forbidden: you are not assigned as a teacher for this section",
        )
    return section


def get_section_roster(
    section_id: uuid.UUID,
    db: Session,
    target_date: date | None = None,
) -> list[dict]:
    """Retrieve enrolled student roster for a section, annotated with approved leave status."""
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    enrollments = db.execute(
        select(StudentEnrollment)
        .options(joinedload(StudentEnrollment.student))
        .where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        )
        .order_by(StudentEnrollment.roll_no.asc())
    ).scalars().all()

    # Query approved leaves for target date
    check_dt = target_date or date.today()
    from app.models.leave import LeaveStatus, StudentLeaveApplication
    approved_leaves = db.execute(
        select(StudentLeaveApplication).where(
            StudentLeaveApplication.section_id == section.id,
            StudentLeaveApplication.status == LeaveStatus.APPROVED.value,
            StudentLeaveApplication.start_date <= check_dt,
            StudentLeaveApplication.end_date >= check_dt,
        )
    ).scalars().all()
    leave_map = {l.student_id: l for l in approved_leaves}

    roster = []
    for enr in enrollments:
        stu = enr.student
        if not stu:
            continue
        leave_app = leave_map.get(stu.id)
        has_leave = leave_app is not None
        roster.append({
            "student_id": stu.id,
            "enrollment_id": enr.id,
            "roll_no": enr.roll_no,
            "first_name": stu.first_name,
            "last_name": stu.last_name,
            "student_name": f"{stu.first_name} {stu.last_name}",
            "student_code": stu.student_code,
            "enrollment_number": stu.enrollment_number or stu.student_code,
            "gender": stu.gender,
            "has_approved_leave": has_leave,
            "leave_reason": leave_app.reason if leave_app else None,
            "default_status": "EXCUSED" if has_leave else "PRESENT",
            "default_remark": f"Approved Leave: {leave_app.reason}" if leave_app else None,
        })
    return roster


def record_section_attendance(
    section_id: uuid.UUID,
    payload: SectionAttendanceCreate,
    actor_user_id: uuid.UUID,
    teacher: Teacher | None,
    ip: str | None,
    db: Session,
) -> AttendanceSessionResponse:
    # 1. Permission check
    section = db.get(Section, section_id)
    if not section or section.status != "active":
        raise HTTPException(status_code=404, detail="Section not found or inactive")

    if teacher:
        verify_teacher_section_access(teacher.id, section_id, db)

    # 2. Rule: Cannot mark attendance on a holiday or non-working day
    ay_id = section.academic_year_id
    if not ay_id:
        ay_record = db.execute(select(AcademicYear).where(AcademicYear.is_current.is_(True))).scalars().first()
        if ay_record:
            ay_id = ay_record.id

    if ay_id:
        from app.services.calendar_service import check_date_working_status
        status_info = check_date_working_status(
            target_date=payload.date,
            academic_year_id=ay_id,
            grade_id=section.grade_id,
            section_id=section.id,
            db=db,
        )
        if not status_info.is_working_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark attendance on a non-working day or holiday ({status_info.reason})",
            )

    # 3. Prevent future date
    today = datetime.now(timezone.utc).date()
    if payload.date > today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark attendance for a future date",
        )

    # 4. Strictly Daily Attendance: Prevent duplicate session for same section and date
    existing = db.execute(
        select(AttendanceSession).where(
            AttendanceSession.section_id == section.id,
            AttendanceSession.date == payload.date,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Daily attendance session already exists for Section {section.name} on {payload.date}",
        )

    # 4. Fetch enrolled students
    enrollments = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalars().all()

    enrollment_map = {e.student_id: e for e in enrollments}

    # 5. Create Attendance Session
    session = AttendanceSession(
        academic_year_id=section.academic_year_id,
        grade_id=section.grade_id,
        section_id=section.id,
        date=payload.date,
        period=payload.period,
        submission_status="submitted",
        taken_by_teacher_id=teacher.id if teacher else None,
        marked_by_user_id=actor_user_id,
        locked_at=None,
    )
    db.add(session)
    db.flush()

    present_count = 0
    absent_count = 0
    late_count = 0
    excused_count = 0
    records_out = []

    for item in payload.records:
        if item.student_id not in enrollment_map:
            continue

        enr = enrollment_map[item.student_id]
        stu = enr.student

        st_val = item.status.value.upper()
        if st_val == "PRESENT":
            present_count += 1
        elif st_val == "ABSENT":
            absent_count += 1
        elif st_val == "LATE":
            late_count += 1
        elif st_val == "EXCUSED":
            excused_count += 1

        rec = AttendanceRecord(
            session_id=session.id,
            student_id=item.student_id,
            enrollment_id=enr.id,
            status=st_val,
            remark=item.remark.strip() if item.remark else None,
            marked_by_user_id=actor_user_id,
            date=payload.date,
        )
        db.add(rec)
        db.flush()

        records_out.append(
            AttendanceRecordResponse(
                id=rec.id,
                session_id=session.id,
                student_id=item.student_id,
                enrollment_id=enr.id,
                status=st_val,
                remark=rec.remark,
                student_name=f"{stu.first_name} {stu.last_name}" if stu else None,
                student_code=stu.student_code if stu else None,
                enrollment_number=stu.enrollment_number if stu else None,
                roll_no=enr.roll_no,
            )
        )

    db.commit()
    db.refresh(session)

    # Log action
    log_action(
        db,
        actor_user_id=actor_user_id,
        action="section_attendance_marked",
        entity_type="attendance_session",
        entity_id=str(session.id),
        metadata={
            "section_id": str(section.id),
            "date": str(payload.date),
            "total_marked": len(records_out),
            "present": present_count,
            "absent": absent_count,
        },
        ip=ip,
    )

    grade = db.get(Grade, section.grade_id)
    return AttendanceSessionResponse(
        id=session.id,
        academic_year_id=session.academic_year_id,
        grade_id=session.grade_id,
        grade_name=grade.name if grade else None,
        section_id=session.section_id,
        section_name=section.name,
        date=session.date,
        period=session.period,
        submission_status=session.submission_status,
        taken_by_teacher_id=session.taken_by_teacher_id,
        teacher_name=f"{teacher.first_name} {teacher.last_name}" if teacher else None,
        total_students=len(records_out),
        present_count=present_count,
        absent_count=absent_count,
        late_count=late_count,
        excused_count=excused_count,
        created_at=session.created_at,
        updated_at=session.updated_at,
        records=records_out,
    )


def get_section_attendance(
    section_id: uuid.UUID,
    target_date: date,
    period: int,
    db: Session,
) -> AttendanceSessionResponse | None:
    session = db.execute(
        select(AttendanceSession).where(
            AttendanceSession.section_id == section_id,
            AttendanceSession.date == target_date,
            AttendanceSession.period == period,
        )
    ).scalar_one_or_none()

    if not session:
        return None

    section = db.get(Section, session.section_id)
    grade = db.get(Grade, session.grade_id)
    teacher = db.get(Teacher, session.taken_by_teacher_id) if session.taken_by_teacher_id else None

    records_out = []
    p_cnt = a_cnt = l_cnt = e_cnt = 0

    for rec in session.records:
        stu = rec.student
        enr = rec.enrollment
        st_val = rec.status.upper()
        if st_val == "PRESENT":
            p_cnt += 1
        elif st_val == "ABSENT":
            a_cnt += 1
        elif st_val == "LATE":
            l_cnt += 1
        elif st_val == "EXCUSED":
            e_cnt += 1

        records_out.append(
            AttendanceRecordResponse(
                id=rec.id,
                session_id=session.id,
                student_id=rec.student_id,
                enrollment_id=rec.enrollment_id,
                status=st_val,
                remark=rec.remark,
                student_name=f"{stu.first_name} {stu.last_name}" if stu else None,
                student_code=stu.student_code if stu else None,
                enrollment_number=stu.enrollment_number if stu else None,
                roll_no=enr.roll_no if enr else None,
            )
        )

    now_utc = datetime.now(timezone.utc)
    s_created = session.created_at if session.created_at.tzinfo else session.created_at.replace(tzinfo=timezone.utc)
    rem_secs = max(0, int((s_created + timedelta(minutes=settings.TEACHER_ATTENDANCE_GRACE_MINUTES) - now_utc).total_seconds()))
    can_edit = session.locked_at is None and rem_secs > 0

    return AttendanceSessionResponse(
        id=session.id,
        academic_year_id=session.academic_year_id,
        grade_id=session.grade_id,
        grade_name=grade.name if grade else None,
        section_id=session.section_id,
        section_name=section.name if section else None,
        date=session.date,
        period=session.period,
        submission_status=session.submission_status,
        taken_by_teacher_id=session.taken_by_teacher_id,
        teacher_name=f"{teacher.first_name} {teacher.last_name}" if teacher else None,
        total_students=len(records_out),
        present_count=p_cnt,
        absent_count=a_cnt,
        late_count=l_cnt,
        excused_count=e_cnt,
        can_teacher_edit=can_edit,
        edit_window_remaining_seconds=rem_secs,
        created_at=session.created_at,
        updated_at=session.updated_at,
        records=records_out,
    )


def get_section_attendance_history(
    section_id: uuid.UUID,
    limit: int = 30,
    db: Session = None,
) -> list[AttendanceSessionResponse]:
    sessions = db.execute(
        select(AttendanceSession)
        .where(AttendanceSession.section_id == section_id)
        .order_by(AttendanceSession.date.desc(), AttendanceSession.period.desc())
        .limit(limit)
    ).scalars().all()

    results = []
    for s in sessions:
        sec = s.section
        grd = s.grade
        tch = s.teacher
        p = a = l = e = 0
        records_out = []
        for r in s.records:
            st = r.status.upper()
            if st == "PRESENT":
                p += 1
            elif st == "ABSENT":
                a += 1
            elif st == "LATE":
                l += 1
            elif st == "EXCUSED":
                e += 1
            stu = r.student
            enr = r.enrollment
            records_out.append(
                AttendanceRecordResponse(
                    id=r.id,
                    session_id=s.id,
                    student_id=r.student_id,
                    enrollment_id=r.enrollment_id,
                    status=st,
                    remark=r.remark,
                    student_name=f"{stu.first_name} {stu.last_name}" if stu else None,
                    student_code=stu.student_code if stu else None,
                    enrollment_number=stu.enrollment_number if stu else None,
                    roll_no=enr.roll_no if enr else None,
                )
            )
        results.append(
            AttendanceSessionResponse(
                id=s.id,
                academic_year_id=s.academic_year_id,
                grade_id=s.grade_id,
                grade_name=grd.name if grd else None,
                section_id=s.section_id,
                section_name=sec.name if sec else None,
                date=s.date,
                period=s.period,
                submission_status=s.submission_status,
                taken_by_teacher_id=s.taken_by_teacher_id,
                teacher_name=f"{tch.first_name} {tch.last_name}" if tch else None,
                total_students=len(records_out),
                present_count=p,
                absent_count=a,
                late_count=l,
                excused_count=e,
                created_at=s.created_at,
                updated_at=s.updated_at,
                records=records_out,
            )
        )
    return results


def edit_attendance_record(
    record_id: uuid.UUID,
    payload: AdminAttendanceRecordUpdate,
    actor_user_id: uuid.UUID,
    is_admin: bool,
    teacher: Teacher | None,
    ip: str | None,
    db: Session,
) -> AttendanceRecordResponse:
    rec = db.get(AttendanceRecord, record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    session = rec.session
    if not session:
        raise HTTPException(status_code=400, detail="Orphaned attendance record")

    # If teacher, verify authorization to section and 24h window
    if not is_admin:
        if not teacher:
            raise HTTPException(status_code=403, detail="Not authorized")
        verify_teacher_section_access(teacher.id, session.section_id, db)
        session_dt = datetime.combine(session.date, datetime.min.time(), tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if (now - session_dt) > timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teachers can only edit attendance within 24 hours of the session. Contact admin for older records.",
            )

    prev_status = rec.status
    new_status = payload.status.value.upper()

    if prev_status != new_status or payload.remark is not None:
        # Create audit entry
        audit_entry = AttendanceAuditHistory(
            record_id=rec.id,
            session_id=session.id,
            student_id=rec.student_id,
            previous_status=prev_status,
            new_status=new_status,
            reason=payload.reason.strip(),
            modified_by_user_id=actor_user_id,
        )
        db.add(audit_entry)

        rec.status = new_status
        if payload.remark is not None:
            rec.remark = payload.remark.strip() if payload.remark else None

        db.commit()
        db.refresh(rec)

        log_action(
            db,
            actor_user_id=actor_user_id,
            action="attendance_record_corrected",
            entity_type="attendance_record",
            entity_id=str(rec.id),
            metadata={
                "previous_status": prev_status,
                "new_status": new_status,
                "reason": payload.reason,
            },
            ip=ip,
        )

    stu = rec.student
    enr = rec.enrollment
    return AttendanceRecordResponse(
        id=rec.id,
        session_id=session.id,
        student_id=rec.student_id,
        enrollment_id=rec.enrollment_id,
        status=rec.status,
        remark=rec.remark,
        student_name=f"{stu.first_name} {stu.last_name}" if stu else None,
        student_code=stu.student_code if stu else None,
        enrollment_number=stu.enrollment_number if stu else None,
        roll_no=enr.roll_no if enr else None,
    )


def get_admin_attendance_overview(
    target_date: date,
    academic_year_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    search: str | None = None,
    db: Session = None,
) -> AdminAttendanceOverviewResponse:
    """Institutional overview across all grades and sections for a specific date."""
    # Find active academic year if not provided
    if not academic_year_id:
        ay = db.execute(select(AcademicYear).where(AcademicYear.is_current == True)).scalars().first()
        academic_year_id = ay.id if ay else None

    sec_stmt = select(Section).join(Grade, Section.grade_id == Grade.id)
    if academic_year_id:
        sec_stmt = sec_stmt.where(Section.academic_year_id == academic_year_id)
    if grade_id:
        sec_stmt = sec_stmt.where(Section.grade_id == grade_id)
    if search:
        pattern = f"%{search.strip()}%"
        sec_stmt = sec_stmt.where(or_(Grade.name.ilike(pattern), Section.name.ilike(pattern)))

    sections = db.execute(sec_stmt.order_by(Grade.level.asc(), Section.name.asc())).scalars().all()

    section_items: list[SectionDailyOverviewItem] = []
    tot_students = 0
    tot_p = tot_a = tot_l = tot_e = 0
    marked_sections_count = 0

    for sec in sections:
        stu_count = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == sec.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()

        tot_students += stu_count

        session = db.execute(
            select(AttendanceSession).where(
                AttendanceSession.section_id == sec.id,
                AttendanceSession.date == target_date,
            )
        ).scalars().first()

        p = a = l = e = 0
        marked_by_name = None
        marked_at = None
        status_label = "Unmarked"

        if session:
            status_label = "Marked"
            marked_sections_count += 1
            marked_at = session.created_at
            if session.teacher:
                marked_by_name = f"{session.teacher.first_name} {session.teacher.last_name}"
            elif session.marked_by:
                marked_by_name = session.marked_by.email

            for r in session.records:
                st = r.status.upper()
                if st == "PRESENT":
                    p += 1
                elif st == "ABSENT":
                    a += 1
                elif st == "LATE":
                    l += 1
                elif st == "EXCUSED":
                    e += 1

            tot_p += p
            tot_a += a
            tot_l += l
            tot_e += e

        denom = max(1, p + a + l)
        pct = round(((p + l) / denom * 100), 1) if session else 0.0

        section_items.append(
            SectionDailyOverviewItem(
                grade_id=sec.grade_id,
                grade_name=sec.grade.name if sec.grade else "Grade",
                section_id=sec.id,
                section_name=sec.name,
                session_id=session.id if session else None,
                status=status_label,
                total_students=stu_count,
                present=p,
                absent=a,
                late=l,
                excused=e,
                attendance_percentage=pct,
                marked_by=marked_by_name,
                marked_at=marked_at,
            )
        )

    overall_denom = max(1, tot_p + tot_a + tot_l)
    overall_pct = round(((tot_p + tot_l) / overall_denom * 100), 1) if marked_sections_count > 0 else 0.0

    return AdminAttendanceOverviewResponse(
        date=target_date,
        total_sections=len(sections),
        marked_sections=marked_sections_count,
        total_students=tot_students,
        total_present=tot_p,
        total_absent=tot_a,
        total_late=tot_l,
        total_excused=tot_e,
        overall_percentage=overall_pct,
        sections=section_items,
    )


def get_student_attendance_history(
    student_id: uuid.UUID,
    academic_year_id: uuid.UUID | None,
    db: Session,
) -> StudentAttendanceHistoryResponse:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollment = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalars().first()

    stmt = select(AttendanceRecord).where(AttendanceRecord.student_id == student.id)
    records = db.execute(stmt.order_by(AttendanceRecord.created_at.desc())).scalars().all()

    present_days = 0
    absent_days = 0
    late_days = 0
    excused_days = 0
    rec_items = []

    for r in records:
        st_val = r.status.upper()
        if st_val == "PRESENT":
            present_days += 1
        elif st_val == "ABSENT":
            absent_days += 1
        elif st_val == "LATE":
            late_days += 1
        elif st_val == "EXCUSED":
            excused_days += 1

        r_date = r.date
        period = 1
        g_name = student.class_name
        s_name = student.section
        marked_by = None

        if r.session:
            r_date = r.session.date
            period = r.session.period
            if r.session.grade:
                g_name = r.session.grade.name
            if r.session.section:
                s_name = r.session.section.name
            if r.session.teacher:
                marked_by = f"{r.session.teacher.first_name} {r.session.teacher.last_name}"

        rec_items.append(
            StudentAttendanceHistoryRecord(
                date=r_date or datetime.now(timezone.utc).date(),
                period=period,
                status=st_val,
                remark=r.remark or r.notes,
                grade_name=g_name,
                section_name=s_name,
                marked_by=marked_by,
            )
        )

    working_days = len(rec_items)
    effective_working = max(1, working_days - excused_days)
    pct = round(((present_days + late_days) / effective_working * 100), 1) if working_days > 0 else 100.0

    return StudentAttendanceHistoryResponse(
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        enrollment_number=student.enrollment_number,
        student_code=student.student_code,
        grade_name=enrollment.grade.name if (enrollment and enrollment.grade) else student.class_name,
        section_name=enrollment.section.name if (enrollment and enrollment.section) else student.section,
        total_working_days=working_days,
        present_days=present_days,
        absent_days=absent_days,
        late_days=late_days,
        excused_days=excused_days,
        attendance_percentage=pct,
        records=rec_items,
    )


def get_attendance_audit_history(
    section_id: uuid.UUID | None,
    target_date: date | None,
    db: Session,
) -> list[AttendanceAuditItemResponse]:
    stmt = (
        select(AttendanceAuditHistory)
        .outerjoin(AttendanceSession, AttendanceAuditHistory.session_id == AttendanceSession.id)
    )
    if section_id:
        stmt = stmt.where(AttendanceSession.section_id == section_id)
    if target_date:
        stmt = stmt.where(AttendanceSession.date == target_date)

    audits = db.execute(stmt.order_by(AttendanceAuditHistory.created_at.desc()).limit(100)).scalars().all()

    results = []
    for a in audits:
        stu = a.student
        results.append(
            AttendanceAuditItemResponse(
                id=a.id,
                record_id=a.record_id,
                session_id=a.session_id,
                student_id=a.student_id,
                student_name=f"{stu.first_name} {stu.last_name}" if stu else "Student",
                enrollment_number=stu.enrollment_number if stu else None,
                previous_status=a.previous_status,
                new_status=a.new_status,
                reason=a.reason,
                modified_by_name=a.modified_by.email if a.modified_by else None,
                created_at=a.created_at,
            )
        )
    return results

