import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.classroom import Class, Subject, TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.classroom import (
    ClassCreate,
    ClassListResponse,
    ClassResponse,
    ClassRosterResponse,
    StudentRosterItem,
    SubjectCreate,
    SubjectListResponse,
    SubjectResponse,
    TeacherAssignmentCreate,
    TeacherAssignmentListResponse,
    TeacherAssignmentResponse,
)
from app.services.audit_service import log_action


def create_class(
    payload: ClassCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> ClassResponse:
    existing = db.execute(
        select(Class).where(
            Class.name == payload.name.strip(),
            Class.section == payload.section.strip(),
            Class.academic_year == payload.academic_year.strip(),
            Class.status == "active",
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Class '{payload.name}-{payload.section}' already exists for year '{payload.academic_year}'",
        )

    classroom = Class(
        name=payload.name.strip(),
        section=payload.section.strip(),
        academic_year=payload.academic_year.strip(),
        department=payload.department.strip(),
        status="active",
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    log_action(
        db,
        action="class_created",
        entity_type="class",
        actor_user_id=actor_user_id,
        entity_id=str(classroom.id),
        metadata={"name": classroom.name, "section": classroom.section, "year": classroom.academic_year},
        ip=ip,
    )
    return ClassResponse.model_validate(classroom)


def list_classes(
    db: Session,
    page: int = 1,
    size: int = 20,
    department: str | None = None,
    academic_year: str | None = None,
) -> ClassListResponse:
    query = select(Class).where(Class.status == "active")
    if department:
        query = query.where(Class.department == department)
    if academic_year:
        query = query.where(Class.academic_year == academic_year)

    total_query = select(func.count()).select_from(query.subquery())
    total = db.execute(total_query).scalar_one()

    offset = (page - 1) * size
    items = (
        db.execute(query.order_by(Class.name.asc(), Class.section.asc()).offset(offset).limit(size))
        .scalars()
        .all()
    )

    return ClassListResponse(
        items=[ClassResponse.model_validate(c) for c in items],
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
        metadata={"name": subject.name, "code": subject.code},
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


def assign_teacher_to_class(
    payload: TeacherAssignmentCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> TeacherAssignmentResponse:
    teacher = db.get(Teacher, payload.teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    classroom = db.get(Class, payload.class_id)
    if not classroom or classroom.status != "active":
        raise HTTPException(status_code=404, detail="Class not found or inactive")

    subject = db.get(Subject, payload.subject_id)
    if not subject or subject.status != "active":
        raise HTTPException(status_code=404, detail="Subject not found or inactive")

    existing = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == payload.teacher_id,
            TeacherAssignment.class_id == payload.class_id,
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
        class_id=payload.class_id,
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
    res.class_name = classroom.name
    res.section = classroom.section
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
        metadata={"class_id": str(assignment.class_id), "teacher_id": str(assignment.teacher_id)},
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
        cls = db.get(Class, a.class_id)
        sub = db.get(Subject, a.subject_id)
        item = TeacherAssignmentResponse.model_validate(a)
        if cls:
            item.class_name = cls.name
            item.section = cls.section
        if sub:
            item.subject_name = sub.name
            item.subject_code = sub.code
        results.append(item)
    return results


def get_class_roster(
    classroom: Class,
    page: int = 1,
    size: int = 20,
    search: str | None = None,
    db: Session = None,
) -> ClassRosterResponse:
    # Only active students appear per rule
    query = select(Student).where(
        Student.class_name == classroom.name,
        Student.section == classroom.section,
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
        class_name=classroom.name,
        section=classroom.section,
        items=items,
        total=total,
        page=page,
        size=size,
    )
