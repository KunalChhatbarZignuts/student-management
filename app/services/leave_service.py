import datetime as dt
import logging
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.email import get_email_backend
from app.models.academic_structure import Grade, Section, StudentEnrollment
from app.models.classroom import TeacherAssignment
from app.models.leave import LeaveStatus, LeaveSubmissionRole, StudentLeaveApplication
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.leave import (
    LeaveApplicationResponse,
    LeaveListResponse,
    ParentLeaveApplyRequest,
    StudentLeaveApplyRequest,
    TeacherLeaveDecisionRequest,
    TeacherLeaveRejectRequest,
)
from app.services.audit_service import log_action

logger = logging.getLogger(__name__)


def _build_leave_response(app: StudentLeaveApplication, db: Session) -> LeaveApplicationResponse:
    student_name = f"{app.student.first_name} {app.student.last_name}" if app.student else "Unknown Student"
    student_code = app.student.student_code if app.student else ""
    enrollment_number = app.student.enrollment_number if app.student else None

    submitted_by_name = "User"
    if app.submitted_by:
        submitted_by_name = app.submitted_by.email

    academic_year_name = app.academic_year.name if app.academic_year else None
    grade_name = app.grade.name if app.grade else None
    section_name = app.section.name if app.section else None

    class_teacher_name = None
    if app.class_teacher:
        class_teacher_name = f"{app.class_teacher.first_name} {app.class_teacher.last_name}"

    decided_by_teacher_name = None
    if app.decided_by_teacher:
        decided_by_teacher_name = f"{app.decided_by_teacher.first_name} {app.decided_by_teacher.last_name}"

    return LeaveApplicationResponse(
        id=app.id,
        student_id=app.student_id,
        student_name=student_name,
        student_code=student_code,
        enrollment_number=enrollment_number,
        submitted_by_user_id=app.submitted_by_user_id,
        submission_role=app.submission_role,
        submitted_by_name=submitted_by_name,
        academic_year_id=app.academic_year_id,
        academic_year_name=academic_year_name,
        grade_id=app.grade_id,
        grade_name=grade_name,
        section_id=app.section_id,
        section_name=section_name,
        class_teacher_id=app.class_teacher_id,
        class_teacher_name=class_teacher_name,
        start_date=app.start_date,
        end_date=app.end_date,
        days_count=app.days_count,
        reason=app.reason,
        status=app.status,
        teacher_remarks=app.teacher_remarks,
        decided_by_teacher_id=app.decided_by_teacher_id,
        decided_by_teacher_name=decided_by_teacher_name,
        decided_at=app.decided_at,
        created_at=app.created_at,
        updated_at=app.updated_at,
    )


def _resolve_student_class_context(
    student: Student, db: Session
) -> tuple[uuid.UUID | None, uuid.UUID | None, uuid.UUID | None, uuid.UUID | None]:
    """Finds the student's active academic_year_id, grade_id, section_id, and class_teacher_id."""
    enrollment = db.execute(
        select(StudentEnrollment)
        .where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        )
        .order_by(StudentEnrollment.created_at.desc())
    ).scalars().first()

    academic_year_id = None
    grade_id = None
    section_id = None
    class_teacher_id = None

    if enrollment:
        academic_year_id = enrollment.academic_year_id
        grade_id = enrollment.grade_id
        section_id = enrollment.section_id

    # Fallback to section resolution by name if needed
    if not section_id and student.class_name and student.section:
        sec = db.execute(
            select(Section)
            .join(Grade, Grade.id == Section.grade_id)
            .where(
                func.lower(Grade.name) == student.class_name.lower(),
                func.lower(Section.name) == student.section.lower(),
            )
        ).scalars().first()
        if sec:
            section_id = sec.id
            grade_id = sec.grade_id
            academic_year_id = sec.academic_year_id

    if section_id:
        # Find active class teacher assigned to this section
        ct_assignment = db.execute(
            select(TeacherAssignment)
            .where(
                TeacherAssignment.section_id == section_id,
                TeacherAssignment.is_active == True,
                TeacherAssignment.assignment_type == "CLASS_TEACHER",
            )
        ).scalars().first()
        if ct_assignment:
            class_teacher_id = ct_assignment.teacher_id

    return academic_year_id, grade_id, section_id, class_teacher_id


def _send_leave_notification(
    recipient_email: str | None,
    subject: str,
    text_body: str,
) -> None:
    if not recipient_email:
        return
    try:
        get_email_backend().send_email(
            to_email=recipient_email,
            subject=subject,
            text_body=text_body,
        )
    except Exception as e:
        logger.warning(f"Failed to send email notification to {recipient_email}: {e}")


def submit_student_leave(
    payload: StudentLeaveApplyRequest,
    current_user: User,
    ip: str | None,
    db: Session,
) -> LeaveApplicationResponse:
    student = db.execute(
        select(Student).where(Student.user_id == current_user.id)
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found for this user account.")

    # Check duplicate pending application for overlapping dates
    overlap = db.execute(
        select(StudentLeaveApplication).where(
            StudentLeaveApplication.student_id == student.id,
            StudentLeaveApplication.status == LeaveStatus.PENDING.value,
            StudentLeaveApplication.start_date <= payload.end_date,
            StudentLeaveApplication.end_date >= payload.start_date,
        )
    ).scalars().first()
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending leave application already exists covering these dates.",
        )

    ay_id, g_id, sec_id, ct_id = _resolve_student_class_context(student, db)
    days_count = (payload.end_date - payload.start_date).days + 1

    app_entry = StudentLeaveApplication(
        student_id=student.id,
        submitted_by_user_id=current_user.id,
        submission_role=LeaveSubmissionRole.STUDENT.value,
        academic_year_id=ay_id,
        grade_id=g_id,
        section_id=sec_id,
        class_teacher_id=ct_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_count=days_count,
        reason=payload.reason,
        status=LeaveStatus.PENDING.value,
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    log_action(
        db,
        action="leave_application_submitted",
        entity_type="student_leave_application",
        actor_user_id=current_user.id,
        entity_id=str(app_entry.id),
        metadata={
            "student_id": str(student.id),
            "start_date": payload.start_date.isoformat(),
            "end_date": payload.end_date.isoformat(),
            "class_teacher_id": str(ct_id) if ct_id else None,
        },
        ip=ip,
    )

    # Notify Class Teacher
    if ct_id:
        ct = db.get(Teacher, ct_id)
        if ct and ct.user and ct.user.email:
            _send_leave_notification(
                ct.user.email,
                f"New Leave Application: {student.first_name} {student.last_name}",
                f"Hello {ct.first_name},\n\nA new leave application has been submitted by student {student.first_name} {student.last_name} for the period {payload.start_date} to {payload.end_date}.\nReason: {payload.reason}\n\nPlease review and take action in your Teacher Portal.",
            )

    return _build_leave_response(app_entry, db)


def submit_parent_leave(
    payload: ParentLeaveApplyRequest,
    current_user: User,
    ip: str | None,
    db: Session,
) -> LeaveApplicationResponse:
    parent = db.execute(
        select(Parent).where(Parent.user_id == current_user.id)
    ).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found for this user account.")

    # Validate parent is linked to this student
    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.student_id == payload.student_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to submit a leave application for this student.",
        )

    student = db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Check duplicate pending application for overlapping dates
    overlap = db.execute(
        select(StudentLeaveApplication).where(
            StudentLeaveApplication.student_id == student.id,
            StudentLeaveApplication.status == LeaveStatus.PENDING.value,
            StudentLeaveApplication.start_date <= payload.end_date,
            StudentLeaveApplication.end_date >= payload.start_date,
        )
    ).scalars().first()
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending leave application already exists covering these dates.",
        )

    ay_id, g_id, sec_id, ct_id = _resolve_student_class_context(student, db)
    days_count = (payload.end_date - payload.start_date).days + 1

    app_entry = StudentLeaveApplication(
        student_id=student.id,
        submitted_by_user_id=current_user.id,
        submission_role=LeaveSubmissionRole.PARENT.value,
        academic_year_id=ay_id,
        grade_id=g_id,
        section_id=sec_id,
        class_teacher_id=ct_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_count=days_count,
        reason=payload.reason,
        status=LeaveStatus.PENDING.value,
    )
    db.add(app_entry)
    db.commit()
    db.refresh(app_entry)

    log_action(
        db,
        action="leave_application_submitted",
        entity_type="student_leave_application",
        actor_user_id=current_user.id,
        entity_id=str(app_entry.id),
        metadata={
            "student_id": str(student.id),
            "parent_id": str(parent.id),
            "start_date": payload.start_date.isoformat(),
            "end_date": payload.end_date.isoformat(),
            "class_teacher_id": str(ct_id) if ct_id else None,
        },
        ip=ip,
    )

    # Notify Class Teacher
    if ct_id:
        ct = db.get(Teacher, ct_id)
        if ct and ct.user and ct.user.email:
            _send_leave_notification(
                ct.user.email,
                f"New Leave Application (Parent Submitted): {student.first_name} {student.last_name}",
                f"Hello {ct.first_name},\n\nA new leave application has been submitted by parent {parent.first_name} {parent.last_name} on behalf of {student.first_name} {student.last_name} for the period {payload.start_date} to {payload.end_date}.\nReason: {payload.reason}\n\nPlease review and take action in your Teacher Portal.",
            )

    return _build_leave_response(app_entry, db)


def list_student_applications(
    current_user: User, db: Session
) -> list[LeaveApplicationResponse]:
    student = db.execute(
        select(Student).where(Student.user_id == current_user.id)
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    apps = db.execute(
        select(StudentLeaveApplication)
        .where(StudentLeaveApplication.student_id == student.id)
        .order_by(StudentLeaveApplication.created_at.desc())
    ).scalars().all()

    return [_build_leave_response(a, db) for a in apps]


def list_parent_child_applications(
    student_id: uuid.UUID | None,
    current_user: User,
    db: Session,
) -> list[LeaveApplicationResponse]:
    parent = db.execute(
        select(Parent).where(Parent.user_id == current_user.id)
    ).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found.")

    linked_students = db.execute(
        select(ParentStudentLink.student_id).where(ParentStudentLink.parent_id == parent.id)
    ).scalars().all()

    if not linked_students:
        return []

    if student_id:
        if student_id not in linked_students:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to leave applications for this student.",
            )
        target_ids = [student_id]
    else:
        target_ids = list(linked_students)

    apps = db.execute(
        select(StudentLeaveApplication)
        .where(StudentLeaveApplication.student_id.in_(target_ids))
        .order_by(StudentLeaveApplication.created_at.desc())
    ).scalars().all()

    return [_build_leave_response(a, db) for a in apps]


def _get_active_class_teacher_sections(teacher_id: uuid.UUID, db: Session) -> list[uuid.UUID]:
    return list(
        db.execute(
            select(TeacherAssignment.section_id)
            .where(
                TeacherAssignment.teacher_id == teacher_id,
                TeacherAssignment.is_active == True,
                TeacherAssignment.assignment_type == "CLASS_TEACHER",
            )
        ).scalars().all()
    )


def list_teacher_assigned_applications(
    status_filter: str | None,
    current_user: User,
    db: Session,
) -> LeaveListResponse:
    teacher = db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found.")

    assigned_section_ids = _get_active_class_teacher_sections(teacher.id, db)

    # Teacher can see applications where they are assigned as class_teacher_id OR belongs to their current section
    query = select(StudentLeaveApplication).where(
        or_(
            StudentLeaveApplication.class_teacher_id == teacher.id,
            StudentLeaveApplication.section_id.in_(assigned_section_ids),
        )
    )

    if status_filter:
        query = query.where(StudentLeaveApplication.status == status_filter.lower())

    apps = db.execute(
        query.order_by(StudentLeaveApplication.created_at.desc())
    ).scalars().all()

    all_assigned = db.execute(
        select(StudentLeaveApplication).where(
            or_(
                StudentLeaveApplication.class_teacher_id == teacher.id,
                StudentLeaveApplication.section_id.in_(assigned_section_ids),
            )
        )
    ).scalars().all()

    pending_count = sum(1 for a in all_assigned if a.status == LeaveStatus.PENDING.value)
    approved_count = sum(1 for a in all_assigned if a.status == LeaveStatus.APPROVED.value)
    rejected_count = sum(1 for a in all_assigned if a.status == LeaveStatus.REJECTED.value)

    items = [_build_leave_response(a, db) for a in apps]
    return LeaveListResponse(
        items=items,
        total=len(items),
        pending_count=pending_count,
        approved_count=approved_count,
        rejected_count=rejected_count,
    )


def _verify_class_teacher_authority(
    app_entry: StudentLeaveApplication, teacher: Teacher, db: Session
) -> None:
    """Strict authorization check: ONLY the assigned Class Teacher for this student/section can approve/reject."""
    # Check 1: Explicit class_teacher_id matches
    if app_entry.class_teacher_id == teacher.id:
        return

    # Check 2: Active TeacherAssignment for this section matches
    if app_entry.section_id:
        is_ct = db.execute(
            select(TeacherAssignment).where(
                TeacherAssignment.section_id == app_entry.section_id,
                TeacherAssignment.teacher_id == teacher.id,
                TeacherAssignment.is_active == True,
                TeacherAssignment.assignment_type == "CLASS_TEACHER",
            )
        ).scalars().first()
        if is_ct:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the assigned Class Teacher for this section can approve or reject this leave application.",
    )


def approve_leave_application(
    application_id: uuid.UUID,
    payload: TeacherLeaveDecisionRequest,
    current_user: User,
    ip: str | None,
    db: Session,
) -> LeaveApplicationResponse:
    teacher = db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found.")

    app_entry = db.get(StudentLeaveApplication, application_id)
    if not app_entry:
        raise HTTPException(status_code=404, detail="Leave application not found.")

    _verify_class_teacher_authority(app_entry, teacher, db)

    if app_entry.status != LeaveStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve application that is already '{app_entry.status}'.",
        )

    app_entry.status = LeaveStatus.APPROVED.value
    app_entry.teacher_remarks = payload.remarks
    app_entry.decided_by_teacher_id = teacher.id
    app_entry.decided_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(app_entry)

    log_action(
        db,
        action="leave_application_approved",
        entity_type="student_leave_application",
        actor_user_id=current_user.id,
        entity_id=str(app_entry.id),
        metadata={
            "student_id": str(app_entry.student_id),
            "teacher_id": str(teacher.id),
            "remarks": payload.remarks,
        },
        ip=ip,
    )

    # Notify Student & Parent
    _notify_student_and_parents_of_decision(app_entry, "Approved", payload.remarks, db)

    return _build_leave_response(app_entry, db)


def reject_leave_application(
    application_id: uuid.UUID,
    payload: TeacherLeaveRejectRequest,
    current_user: User,
    ip: str | None,
    db: Session,
) -> LeaveApplicationResponse:
    teacher = db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found.")

    app_entry = db.get(StudentLeaveApplication, application_id)
    if not app_entry:
        raise HTTPException(status_code=404, detail="Leave application not found.")

    _verify_class_teacher_authority(app_entry, teacher, db)

    if app_entry.status != LeaveStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject application that is already '{app_entry.status}'.",
        )

    app_entry.status = LeaveStatus.REJECTED.value
    app_entry.teacher_remarks = payload.remarks
    app_entry.decided_by_teacher_id = teacher.id
    app_entry.decided_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(app_entry)

    log_action(
        db,
        action="leave_application_rejected",
        entity_type="student_leave_application",
        actor_user_id=current_user.id,
        entity_id=str(app_entry.id),
        metadata={
            "student_id": str(app_entry.student_id),
            "teacher_id": str(teacher.id),
            "remarks": payload.remarks,
        },
        ip=ip,
    )

    # Notify Student & Parent
    _notify_student_and_parents_of_decision(app_entry, "Rejected", payload.remarks, db)

    return _build_leave_response(app_entry, db)


def _notify_student_and_parents_of_decision(
    app_entry: StudentLeaveApplication, decision: str, remarks: str | None, db: Session
) -> None:
    student = app_entry.student
    if student and student.user and student.user.email:
        _send_leave_notification(
            student.user.email,
            f"Leave Application {decision}: {app_entry.start_date} to {app_entry.end_date}",
            f"Hello {student.first_name},\n\nYour leave application for {app_entry.start_date} to {app_entry.end_date} has been {decision.lower()} by your Class Teacher.\nTeacher Remarks: {remarks or 'None'}\n\nPlease check your Student Portal for details.",
        )

    # Notify parents
    if student:
        parents = db.execute(
            select(Parent)
            .join(ParentStudentLink, ParentStudentLink.parent_id == Parent.id)
            .where(ParentStudentLink.student_id == student.id)
        ).scalars().all()
        for p in parents:
            if p.user and p.user.email:
                _send_leave_notification(
                    p.user.email,
                    f"Leave Application {decision} for {student.first_name}",
                    f"Hello {p.first_name},\n\nThe leave application for {student.first_name} {student.last_name} ({app_entry.start_date} to {app_entry.end_date}) has been {decision.lower()} by the Class Teacher.\nTeacher Remarks: {remarks or 'None'}\n\nPlease check your Parent Portal for details.",
                )


def list_all_leave_applications(
    academic_year_id: uuid.UUID | None,
    grade_id: uuid.UUID | None,
    section_id: uuid.UUID | None,
    class_teacher_id: uuid.UUID | None,
    status_filter: str | None,
    start_date: dt.date | None,
    end_date: dt.date | None,
    query: str | None,
    db: Session,
) -> LeaveListResponse:
    stmt = select(StudentLeaveApplication)

    if academic_year_id:
        stmt = stmt.where(StudentLeaveApplication.academic_year_id == academic_year_id)
    if grade_id:
        stmt = stmt.where(StudentLeaveApplication.grade_id == grade_id)
    if section_id:
        stmt = stmt.where(StudentLeaveApplication.section_id == section_id)
    if class_teacher_id:
        stmt = stmt.where(StudentLeaveApplication.class_teacher_id == class_teacher_id)
    if status_filter:
        stmt = stmt.where(StudentLeaveApplication.status == status_filter.lower())
    if start_date:
        stmt = stmt.where(StudentLeaveApplication.end_date >= start_date)
    if end_date:
        stmt = stmt.where(StudentLeaveApplication.start_date <= end_date)

    if query:
        term = f"%{query.strip().lower()}%"
        stmt = stmt.join(Student, Student.id == StudentLeaveApplication.student_id).where(
            or_(
                func.lower(Student.first_name).ilike(term),
                func.lower(Student.last_name).ilike(term),
                func.lower(Student.student_code).ilike(term),
                func.lower(Student.enrollment_number).ilike(term),
            )
        )

    apps = db.execute(
        stmt.order_by(StudentLeaveApplication.created_at.desc())
    ).scalars().all()

    all_apps = db.execute(select(StudentLeaveApplication)).scalars().all()
    pending_count = sum(1 for a in all_apps if a.status == LeaveStatus.PENDING.value)
    approved_count = sum(1 for a in all_apps if a.status == LeaveStatus.APPROVED.value)
    rejected_count = sum(1 for a in all_apps if a.status == LeaveStatus.REJECTED.value)

    items = [_build_leave_response(a, db) for a in apps]
    return LeaveListResponse(
        items=items,
        total=len(items),
        pending_count=pending_count,
        approved_count=approved_count,
        rejected_count=rejected_count,
    )

