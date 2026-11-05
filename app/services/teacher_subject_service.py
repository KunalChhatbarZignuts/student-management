import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Section,
    StudentEnrollment,
    TeacherSubject,
)
from app.models.classroom import Subject, TeacherAssignment
from app.models.teacher import Teacher
from app.models.user import User, UserStatus
from app.schemas.teacher_subject import (
    TeacherProfileAssignedSection,
    TeacherProfileWithSubjectsResponse,
    TeacherSubjectBulkCreate,
    TeacherSubjectResponse,
    TeacherSubjectTeacherItem,
    TeacherSubjectUpdate,
)
from app.services.audit_service import log_action


def _get_active_academic_year(db: Session) -> AcademicYear:
    ay = db.execute(select(AcademicYear).where(AcademicYear.is_current.is_(True))).scalars().first()
    if not ay:
        ay = db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc())).scalars().first()
    if not ay:
        raise HTTPException(status_code=404, detail="No active academic year found")
    return ay


def _build_response_item(ts: TeacherSubject) -> TeacherSubjectResponse:
    teacher = ts.teacher
    user = teacher.user if teacher else None
    subject = ts.subject
    ay = ts.academic_year
    grade = ts.grade
    sec = ts.section

    return TeacherSubjectResponse(
        id=ts.id,
        teacher_id=ts.teacher_id,
        teacher_name=f"{teacher.first_name} {teacher.last_name}" if teacher else "Unknown",
        employee_code=teacher.employee_code if teacher else "",
        teacher_email=user.email if user else None,
        department=teacher.department if teacher else None,
        subject_id=ts.subject_id,
        subject_name=subject.name if subject else "Unknown",
        subject_code=subject.code if subject else "",
        academic_year_id=ts.academic_year_id,
        academic_year_name=ay.name if ay else None,
        grade_id=ts.grade_id,
        grade_name=grade.name if grade else None,
        section_id=ts.section_id,
        section_name=sec.name if sec else None,
        status=ts.status,
        created_at=ts.created_at,
        updated_at=ts.updated_at,
    )


def assign_teacher_subjects(
    payload: TeacherSubjectBulkCreate,
    actor_user_id: uuid.UUID | None,
    ip: str | None,
    db: Session,
) -> list[TeacherSubjectResponse]:
    # 1. Verify Teacher exists and is active
    teacher = db.get(Teacher, payload.teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_user = db.get(User, teacher.user_id)
    if not teacher_user or teacher_user.status != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Cannot assign subjects to an inactive teacher user")

    # 2. Determine Academic Year
    ay_id = payload.academic_year_id
    if not ay_id:
        ay = _get_active_academic_year(db)
        ay_id = ay.id
    else:
        ay = db.get(AcademicYear, ay_id)
        if not ay:
            raise HTTPException(status_code=404, detail="Academic year not found")

    results: list[TeacherSubject] = []

    for item in payload.assignments:
        # Validate Subject
        subject = db.get(Subject, item.subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail=f"Subject not found: {item.subject_id}")
        if subject.status != "active":
            raise HTTPException(status_code=400, detail=f"Subject '{subject.name}' is inactive")

        # Validate Grade (if specified)
        grade = None
        if item.grade_id:
            grade = db.get(Grade, item.grade_id)
            if not grade:
                raise HTTPException(status_code=404, detail=f"Grade not found: {item.grade_id}")

        # Validate Section (if specified)
        sec = None
        if item.section_id:
            sec = db.get(Section, item.section_id)
            if not sec:
                raise HTTPException(status_code=404, detail=f"Section not found: {item.section_id}")
            if item.grade_id and sec.grade_id != item.grade_id:
                raise HTTPException(status_code=400, detail=f"Section '{sec.name}' does not belong to selected Grade")

        # Check duplicate assignment
        existing = db.execute(
            select(TeacherSubject).where(
                TeacherSubject.teacher_id == teacher.id,
                TeacherSubject.subject_id == subject.id,
                TeacherSubject.academic_year_id == ay_id,
                TeacherSubject.grade_id == item.grade_id,
                TeacherSubject.section_id == item.section_id,
            )
        ).scalar_one_or_none()

        if existing:
            if existing.status == "active":
                grade_label = f" Grade {grade.name}" if grade else ""
                sec_label = f" Section {sec.name}" if sec else ""
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Teacher {teacher.first_name} {teacher.last_name} is already assigned to {subject.name}{grade_label}{sec_label} for {ay.name}",
                )
            else:
                # Reactivate inactive assignment
                existing.status = "active"
                db.flush()
                results.append(existing)
                continue

        # Create new TeacherSubject assignment
        new_ts = TeacherSubject(
            teacher_id=teacher.id,
            subject_id=subject.id,
            academic_year_id=ay_id,
            grade_id=item.grade_id,
            section_id=item.section_id,
            status="active",
        )
        db.add(new_ts)
        db.flush()
        results.append(new_ts)

    db.commit()

    # Audit logging
    if actor_user_id:
        log_action(
            db,
            actor_user_id=actor_user_id,
            action="teacher_subjects_assigned",
            entity_type="teacher_subject",
            entity_id=str(teacher.id),
            metadata={
                "teacher_id": str(teacher.id),
                "academic_year_id": str(ay_id),
                "assignments_count": len(results),
            },
            ip=ip,
        )

    for r in results:
        db.refresh(r)

    return [_build_response_item(r) for r in results]


def get_teacher_subject_assignments(
    teacher_id: uuid.UUID,
    academic_year_id: uuid.UUID | None,
    status_filter: str | None,
    db: Session,
) -> list[TeacherSubjectResponse]:
    query = select(TeacherSubject).where(TeacherSubject.teacher_id == teacher_id)
    if academic_year_id:
        query = query.where(TeacherSubject.academic_year_id == academic_year_id)
    if status_filter:
        query = query.where(TeacherSubject.status == status_filter)

    query = query.order_by(TeacherSubject.created_at.desc())
    records = db.execute(query).scalars().all()
    return [_build_response_item(r) for r in records]


def list_subject_assignments_overview(
    academic_year_id: uuid.UUID | None,
    teacher_id: uuid.UUID | None,
    subject_id: uuid.UUID | None,
    grade_id: uuid.UUID | None,
    section_id: uuid.UUID | None,
    status_filter: str | None,
    db: Session,
) -> list[TeacherSubjectResponse]:
    query = select(TeacherSubject)
    if academic_year_id:
        query = query.where(TeacherSubject.academic_year_id == academic_year_id)
    if teacher_id:
        query = query.where(TeacherSubject.teacher_id == teacher_id)
    if subject_id:
        query = query.where(TeacherSubject.subject_id == subject_id)
    if grade_id:
        query = query.where(TeacherSubject.grade_id == grade_id)
    if section_id:
        query = query.where(TeacherSubject.section_id == section_id)
    if status_filter:
        query = query.where(TeacherSubject.status == status_filter)

    query = query.order_by(TeacherSubject.created_at.desc())
    records = db.execute(query).scalars().all()
    return [_build_response_item(r) for r in records]


def get_teachers_for_subject(
    subject_id: uuid.UUID,
    academic_year_id: uuid.UUID | None,
    db: Session,
) -> list[TeacherSubjectTeacherItem]:
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    query = select(TeacherSubject).where(
        TeacherSubject.subject_id == subject_id,
        TeacherSubject.status == "active",
    )
    if academic_year_id:
        query = query.where(TeacherSubject.academic_year_id == academic_year_id)

    records = db.execute(query).scalars().all()
    results: list[TeacherSubjectTeacherItem] = []
    for r in records:
        t = r.teacher
        u = t.user if t else None
        results.append(
            TeacherSubjectTeacherItem(
                assignment_id=r.id,
                teacher_id=r.teacher_id,
                teacher_name=f"{t.first_name} {t.last_name}" if t else "Unknown",
                employee_code=t.employee_code if t else "",
                teacher_email=u.email if u else None,
                department=t.department if t else "",
                grade_id=r.grade_id,
                grade_name=r.grade.name if r.grade else None,
                section_id=r.section_id,
                section_name=r.section.name if r.section else None,
                academic_year_name=r.academic_year.name if r.academic_year else None,
                status=r.status,
            )
        )
    return results


def update_teacher_subject(
    assignment_id: uuid.UUID,
    payload: TeacherSubjectUpdate,
    actor_user_id: uuid.UUID | None,
    ip: str | None,
    db: Session,
) -> TeacherSubjectResponse:
    ts = db.get(TeacherSubject, assignment_id)
    if not ts:
        raise HTTPException(status_code=404, detail="Teacher subject assignment not found")

    new_grade_id = payload.grade_id if payload.grade_id is not None else ts.grade_id
    new_section_id = payload.section_id if payload.section_id is not None else ts.section_id

    # If grade or section changed, check for conflict
    if new_grade_id != ts.grade_id or new_section_id != ts.section_id:
        existing = db.execute(
            select(TeacherSubject).where(
                TeacherSubject.teacher_id == ts.teacher_id,
                TeacherSubject.subject_id == ts.subject_id,
                TeacherSubject.academic_year_id == ts.academic_year_id,
                TeacherSubject.grade_id == new_grade_id,
                TeacherSubject.section_id == new_section_id,
                TeacherSubject.id != ts.id,
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A conflicting subject assignment already exists for this teacher with these class parameters",
            )

    if payload.grade_id is not None:
        ts.grade_id = payload.grade_id
    if payload.section_id is not None:
        ts.section_id = payload.section_id
    if payload.status is not None:
        ts.status = payload.status

    db.commit()
    db.refresh(ts)

    if actor_user_id:
        log_action(
            db,
            actor_user_id=actor_user_id,
            action="teacher_subject_updated",
            entity_type="teacher_subject",
            entity_id=str(ts.id),
            metadata={"status": ts.status, "grade_id": str(ts.grade_id), "section_id": str(ts.section_id)},
            ip=ip,
        )

    return _build_response_item(ts)


def deactivate_or_remove_teacher_subject(
    assignment_id: uuid.UUID,
    hard_delete: bool,
    actor_user_id: uuid.UUID | None,
    ip: str | None,
    db: Session,
) -> dict[str, str]:
    ts = db.get(TeacherSubject, assignment_id)
    if not ts:
        raise HTTPException(status_code=404, detail="Teacher subject assignment not found")

    if hard_delete:
        db.delete(ts)
        action_name = "teacher_subject_deleted"
        msg = "Subject assignment permanently deleted"
    else:
        ts.status = "inactive"
        action_name = "teacher_subject_deactivated"
        msg = "Subject assignment deactivated"

    db.commit()

    if actor_user_id:
        log_action(
            db,
            actor_user_id=actor_user_id,
            action=action_name,
            entity_type="teacher_subject",
            entity_id=str(assignment_id),
            metadata={"hard_delete": hard_delete},
            ip=ip,
        )

    return {"message": msg}


def get_teacher_profile_with_subjects(
    teacher_id: uuid.UUID,
    academic_year_id: uuid.UUID | None = None,
    db: Session = None,
) -> TeacherProfileWithSubjectsResponse:
    teacher = db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    user = db.get(User, teacher.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found for teacher")

    # 1. Fetch assigned classes (Class Teacher / Coordinator)
    assigned_sections: list[TeacherProfileAssignedSection] = []
    class_assignments = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.section_id.isnot(None),
        )
    ).scalars().all()

    for ca in class_assignments:
        sec = db.get(Section, ca.section_id)
        if sec:
            g = db.get(Grade, sec.grade_id)
            ay = db.get(AcademicYear, sec.academic_year_id)
            stu_count = db.execute(
                select(func.count(StudentEnrollment.id)).where(
                    StudentEnrollment.section_id == sec.id,
                    StudentEnrollment.status == "ACTIVE",
                )
            ).scalar_one()

            assigned_sections.append(
                TeacherProfileAssignedSection(
                    section_id=sec.id,
                    section_name=sec.name,
                    grade_name=g.name if g else "Grade",
                    academic_year=ay.name if ay else ca.academic_year,
                    role="Class Teacher",
                    total_students=stu_count,
                )
            )

    # 2. Fetch assigned subjects
    subj_query = select(TeacherSubject).where(
        TeacherSubject.teacher_id == teacher.id,
    )
    if academic_year_id:
        subj_query = subj_query.where(TeacherSubject.academic_year_id == academic_year_id)

    subj_records = db.execute(subj_query.order_by(TeacherSubject.created_at.desc())).scalars().all()
    assigned_subjects = [_build_response_item(r) for r in subj_records]

    return TeacherProfileWithSubjectsResponse(
        teacher_id=teacher.id,
        user_id=teacher.user_id,
        employee_code=teacher.employee_code,
        first_name=teacher.first_name,
        last_name=teacher.last_name,
        department=teacher.department,
        phone=teacher.phone,
        email=user.email,
        status=user.status,
        assigned_sections=assigned_sections,
        assigned_subjects=assigned_subjects,
    )

