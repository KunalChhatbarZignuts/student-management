import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.academics.classroom_models import Subject, TeacherAssignment
from app.modules.academics.structure_models import AcademicYear, Grade, Section, TeacherSubject
from app.modules.students.models import Student
from app.modules.teachers.models import Teacher
from app.modules.academics.classroom_schemas import (
    ClassCreate,
    ClassListResponse,
    ClassResponse,
    ClassRosterResponse,
    StudentRosterItem,
    SubjectCreate,
    SubjectListResponse,
    SubjectResponse,
    TeacherAssignmentCreate,
    TeacherAssignmentResponse,
)
from app.modules.audit.service import log_action


def create_class(
    payload: ClassCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> ClassResponse:
    # 1. Resolve or create Grade
    grade_name = payload.name.strip()
    grade = db.execute(select(Grade).where(Grade.name.ilike(grade_name))).scalars().first()
    ay = db.execute(select(AcademicYear).where(AcademicYear.is_current.is_(True))).scalars().first()
    if not ay:
        ay = db.execute(select(AcademicYear)).scalars().first()

    if not grade:
        grade = Grade(
            name=grade_name,
            level=10 if "10" in grade_name else 1,
            academic_year_id=ay.id if ay else uuid.uuid4(),
            code=grade_name[:10].upper(),
            status="active",
        )
        db.add(grade)
        db.flush()

    # 2. Check if section already exists under this grade
    sec_name = payload.section.strip()
    existing_sec = db.execute(
        select(Section).where(
            Section.grade_id == grade.id,
            Section.name == sec_name,
            Section.status == "active",
        )
    ).scalars().first()
    if existing_sec:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Class '{payload.name}-{payload.section}' already exists for year '{payload.academic_year}'",
        )

    section = Section(
        grade_id=grade.id,
        name=sec_name,
        code=f"SEC-{sec_name}",
        academic_year_id=ay.id if ay else grade.academic_year_id,
        status="active",
    )
    db.add(section)
    db.commit()
    db.refresh(section)

    log_action(
        db,
        action="class_created",
        entity_type="class",
        actor_user_id=actor_user_id,
        entity_id=str(section.id),
        metadata={"name": grade.name, "section": section.name, "year": ay.name if ay else payload.academic_year},
        ip=ip,
    )
    return ClassResponse(
        id=section.id,
        name=grade.name,
        section=section.name,
        academic_year=ay.name if ay else payload.academic_year,
        department=payload.department,
        status=section.status,
        created_at=section.created_at,
    )


def list_classes(
    db: Session,
    page: int = 1,
    size: int = 20,
    department: str | None = None,
    academic_year: str | None = None,
) -> ClassListResponse:
    """Dynamically computes classes from sections and grades without redundant table storage."""
    query = (
        select(
            Section.id,
            Grade.name.label("name"),
            Section.name.label("section"),
            AcademicYear.name.label("academic_year"),
            func.coalesce(Grade.code, "GENERAL").label("department"),
            Section.status,
            Section.created_at,
        )
        .join(Grade, Section.grade_id == Grade.id)
        .join(AcademicYear, Section.academic_year_id == AcademicYear.id)
        .where(Section.status == "active")
    )
    if department:
        query = query.where(Grade.code.ilike(f"%{department.strip()}%"))
    if academic_year:
        query = query.where(AcademicYear.name.ilike(f"%{academic_year.strip()}%"))

    total_query = select(func.count()).select_from(query.subquery())
    total = db.execute(total_query).scalar_one()

    offset = (page - 1) * size
    rows = (
        db.execute(query.order_by(Grade.level.asc(), Section.name.asc()).offset(offset).limit(size))
        .mappings()
        .all()
    )

    items = [
        ClassResponse(
            id=r["id"],
            name=r["name"],
            section=r["section"],
            academic_year=r["academic_year"],
            department=r["department"],
            status=r["status"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    return ClassListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


def create_subject(
    payload: SubjectCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> SubjectResponse:
    existing = db.execute(
        select(Subject).where(Subject.code == payload.code.strip())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subject with code '{payload.code}' already exists",
        )

    subject = Subject(
        name=payload.name.strip(),
        code=payload.code.strip(),
        department=payload.department.strip() if payload.department else None,
        status="active",
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)

    log_action(
        db,
        action="subject_created",
        entity_type="subject",
        actor_user_id=actor_user_id,
        entity_id=str(subject.id),
        metadata={
            "name": subject.name,
            "code": subject.code,
            "department": subject.department,
        },
        ip=ip,
    )
    return SubjectResponse.model_validate(subject)


def list_subjects(
    db: Session,
    page: int = 1,
    size: int = 20,
) -> SubjectListResponse:
    query = select(Subject).where(Subject.status == "active")
    total_query = select(func.count()).select_from(query.subquery())
    total = db.execute(total_query).scalar_one()

    offset = (page - 1) * size
    items = (
        db.execute(query.order_by(Subject.name.asc()).offset(offset).limit(size))
        .scalars()
        .all()
    )

    return SubjectListResponse(
        items=[SubjectResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        size=size,
    )


def delete_subject(
    subject_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> dict:
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )

    # Deactivate active TeacherSubject assignments
    active_ts = db.execute(
        select(TeacherSubject).where(
            TeacherSubject.subject_id == subject_id,
            TeacherSubject.status == "active",
        )
    ).scalars().all()
    for ts in active_ts:
        ts.status = "inactive"

    # Deactivate active TeacherAssignment records
    active_ta = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.subject_id == subject_id,
            TeacherAssignment.is_active.is_(True),
        )
    ).scalars().all()
    for ta in active_ta:
        ta.is_active = False
        ta.status = "inactive"

    # Soft deactivate subject
    subject.status = "inactive"
    db.commit()

    log_action(
        db,
        action="subject_deactivated",
        entity_type="subject",
        actor_user_id=actor_user_id,
        entity_id=str(subject.id),
        metadata={
            "name": subject.name,
            "code": subject.code,
            "deactivated_teacher_subjects_count": len(active_ts),
            "deactivated_teacher_assignments_count": len(active_ta),
        },
        ip=ip,
    )

    return {
        "message": f"Subject '{subject.name}' ({subject.code}) has been deactivated successfully",
        "id": str(subject.id),
    }


def assign_teacher_to_class(
    payload: TeacherAssignmentCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> TeacherAssignmentResponse:
    teacher = db.get(Teacher, payload.teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    section = db.get(Section, payload.class_id)
    if not section or section.status != "active":
        raise HTTPException(status_code=404, detail="Class not found or inactive")
    grade = db.get(Grade, section.grade_id) if section else None

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.status != "active":
        raise HTTPException(status_code=404, detail="Subject not found or inactive")

    existing = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == payload.teacher_id,
            TeacherAssignment.section_id == payload.class_id,
            TeacherAssignment.subject_id == payload.subject_id,
            TeacherAssignment.academic_year == payload.academic_year,
            TeacherAssignment.status == "active",
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Teacher is already assigned to this class and subject for the given academic year",
        )

    assignment = TeacherAssignment(
        teacher_id=payload.teacher_id,
        section_id=payload.class_id,
        subject_id=payload.subject_id,
        is_class_teacher=payload.is_class_teacher,
        academic_year=payload.academic_year,
        status="active",
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    log_action(
        db,
        action="teacher_assigned",
        entity_type="teacher_assignment",
        actor_user_id=actor_user_id,
        entity_id=str(assignment.id),
        metadata={
            "teacher_id": str(payload.teacher_id),
            "class_id": str(payload.class_id),
            "subject_id": str(payload.subject_id),
            "is_class_teacher": payload.is_class_teacher,
        },
        ip=ip,
    )

    res = TeacherAssignmentResponse.model_validate(assignment)
    res.class_id = section.id
    res.class_name = grade.name if grade else ""
    res.section = section.name
    res.subject_name = subject.name
    res.subject_code = subject.code
    return res


def unassign_teacher(
    assignment_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> dict[str, str]:
    assignment = db.get(TeacherAssignment, assignment_id)
    if not assignment or assignment.status != "active":
        raise HTTPException(status_code=404, detail="Teacher assignment not found or already unassigned")

    # Soft delete per specification
    assignment.status = "inactive"
    db.commit()

    log_action(
        db,
        action="teacher_unassigned",
        entity_type="teacher_assignment",
        actor_user_id=actor_user_id,
        entity_id=str(assignment.id),
        metadata={"class_id": str(assignment.section_id), "teacher_id": str(assignment.teacher_id)},
        ip=ip,
    )
    return {"message": "Teacher successfully unassigned from class"}


def get_teacher_classes(
    teacher_id: uuid.UUID,
    db: Session,
) -> list[TeacherAssignmentResponse]:
    assignments = (
        db.execute(
            select(TeacherAssignment)
            .where(
                TeacherAssignment.teacher_id == teacher_id,
                TeacherAssignment.status == "active",
            )
            .order_by(TeacherAssignment.created_at.desc())
        )
        .scalars()
        .all()
    )

    results = []
    for a in assignments:
        sec = db.get(Section, a.section_id) if a.section_id else None
        grade = db.get(Grade, sec.grade_id) if sec else None
        sub = db.get(Subject, a.subject_id)
        item = TeacherAssignmentResponse.model_validate(a)
        item.class_id = a.section_id
        if sec and grade:
            item.class_name = grade.name
            item.section = sec.name
        if sub:
            item.subject_name = sub.name
            item.subject_code = sub.code
        results.append(item)
    return results


def get_class_roster(
    classroom: Section,
    page: int = 1,
    size: int = 20,
    search: str | None = None,
    db: Session = None,
) -> ClassRosterResponse:
    grade = db.get(Grade, classroom.grade_id) if classroom.grade_id else None
    grade_name = grade.name if grade else ""

    # Query active students in this section or matching class/section
    query = select(Student).where(
        or_(
            Student.current_section_id == classroom.id,
            and_(
                Student.class_name == grade_name,
                Student.section == classroom.name,
            ),
        ),
        Student.status == "active",
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.first_name.ilike(s),
                Student.last_name.ilike(s),
                Student.student_code.ilike(s),
            )
        )

    total_query = select(func.count()).select_from(query.subquery())
    total = db.execute(total_query).scalar_one()

    offset = (page - 1) * size
    students = (
        db.execute(query.order_by(Student.last_name.asc(), Student.first_name.asc()).offset(offset).limit(size))
        .scalars()
        .all()
    )

    items = [
        StudentRosterItem(
            id=s.id,
            student_code=s.student_code,
            name=f"{s.first_name} {s.last_name}",
            status=s.status,
        )
        for s in students
    ]

    return ClassRosterResponse(
        class_id=classroom.id,
        class_name=grade_name,
        section=classroom.name,
        items=items,
        total=total,
        page=page,
        size=size,
    )
