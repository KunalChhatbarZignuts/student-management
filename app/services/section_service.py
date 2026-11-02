import uuid
from typing import Any
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.classroom import TeacherAssignment
from app.models.teacher import Teacher
from app.models.user import User, UserStatus
from app.schemas.grade_section import (
    SectionCreate,
    SectionListResponse,
    SectionResponse,
    SectionUpdate,
)
from app.services.audit_service import log_action


def create_section(
    payload: SectionCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> SectionResponse:
    # 1. Verify Grade exists and is active
    grade = db.get(Grade, payload.grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    if grade.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add section to inactive grade '{grade.name}'",
        )

    # 2. Verify Academic Year
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.status != "active":
        raise HTTPException(status_code=404, detail="Academic year not found or inactive")

    # 3. Check duplicate section name in same grade and year
    existing = db.execute(
        select(Section).where(
            Section.grade_id == payload.grade_id,
            Section.academic_year_id == payload.academic_year_id,
            Section.name.ilike(payload.name.strip()),
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Section '{payload.name}' already exists in {grade.name} for this academic year",
        )

    # 4. Check teacher if provided
    assigned_teacher_rec_id = None
    if payload.assigned_teacher_id:
        teacher = db.get(Teacher, payload.assigned_teacher_id)
        if not teacher:
            teacher = db.execute(
                select(Teacher).where(Teacher.user_id == payload.assigned_teacher_id)
            ).scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=404, detail="Assigned teacher not found")
        teacher_user = db.get(User, teacher.user_id)
        if not teacher_user or teacher_user.status != UserStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned teacher must be an active account",
            )
        assigned_teacher_rec_id = teacher.id

    section = Section(
        grade_id=payload.grade_id,
        name=payload.name.strip(),
        code=payload.code.strip() if payload.code else None,
        academic_year_id=payload.academic_year_id,
        class_capacity=payload.class_capacity or 30,
        status="active",
    )
    db.add(section)
    db.flush()

    # If teacher assigned, create teacher_assignment record
    if assigned_teacher_rec_id:
        assignment = TeacherAssignment(
            teacher_id=assigned_teacher_rec_id,
            section_id=section.id,
            assignment_type="CLASS_TEACHER",
            is_class_teacher=True,
            is_active=True,
            academic_year=year.name,
            start_date=date.today(),
            status="active",
        )
        db.add(assignment)

    db.commit()
    db.refresh(section)

    log_action(
        db,
        action="section_created",
        entity_type="section",
        actor_user_id=actor_user_id,
        entity_id=str(section.id),
        metadata={"name": section.name, "grade_id": str(section.grade_id)},
        ip=ip,
    )

    return get_section_response(section, db)


def update_section(
    section_id: uuid.UUID,
    payload: SectionUpdate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> SectionResponse:
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    old_data = {"name": section.name, "capacity": section.class_capacity}

    if payload.name and payload.name.strip() != section.name:
        existing = db.execute(
            select(Section).where(
                Section.grade_id == section.grade_id,
                Section.academic_year_id == section.academic_year_id,
                Section.name.ilike(payload.name.strip()),
                Section.id != section.id,
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Section '{payload.name}' already exists in this grade",
            )
        section.name = payload.name.strip()

    if payload.code is not None:
        section.code = payload.code.strip() if payload.code else None

    if payload.class_capacity is not None:
        # Check if new capacity is lower than current enrolled students
        enrolled = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == section.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        if payload.class_capacity < enrolled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Capacity ({payload.class_capacity}) cannot be lower than currently enrolled students ({enrolled})",
            )
        section.class_capacity = payload.class_capacity

    db.commit()
    db.refresh(section)

    log_action(
        db,
        action="section_updated",
        entity_type="section",
        actor_user_id=actor_user_id,
        entity_id=str(section.id),
        metadata={"old": old_data, "new": {"name": section.name, "capacity": section.class_capacity}},
        ip=ip,
    )

    return get_section_response(section, db)


def update_section_status(
    section_id: uuid.UUID,
    status_val: str,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> SectionResponse:
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if status_val == "inactive":
        enrolled = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == section.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        if enrolled > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot deactivate section '{section.name}' with {enrolled} active students",
            )

    section.status = status_val
    db.commit()
    db.refresh(section)

    log_action(
        db,
        action="section_status_updated",
        entity_type="section",
        actor_user_id=actor_user_id,
        entity_id=str(section.id),
        metadata={"new_status": status_val},
        ip=ip,
    )

    return get_section_response(section, db)


def get_section_response(section: Section, db: Session) -> SectionResponse:
    grade = db.get(Grade, section.grade_id)
    year = db.get(AcademicYear, section.academic_year_id)

    # Active class teacher lookup
    active_assignment = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.section_id == section.id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.assignment_type == "CLASS_TEACHER",
        )
    ).scalars().first()

    teacher_id = None
    teacher_name = None
    if active_assignment and active_assignment.teacher:
        teacher_id = active_assignment.teacher_id
        t = active_assignment.teacher
        teacher_name = f"{t.first_name} {t.last_name}"

    total_students = db.execute(
        select(func.count(StudentEnrollment.id)).where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()

    return SectionResponse(
        id=section.id,
        grade_id=section.grade_id,
        grade_name=grade.name if grade else None,
        name=section.name,
        code=section.code,
        academic_year_id=section.academic_year_id,
        academic_year_name=year.name if year else None,
        class_capacity=section.class_capacity,
        status=section.status,
        assigned_teacher_id=teacher_id,
        assigned_teacher_name=teacher_name,
        total_students=total_students,
        created_at=section.created_at,
        updated_at=section.updated_at,
    )


def list_sections(
    db: Session,
    grade_id: uuid.UUID | None = None,
    academic_year_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    page: int = 1,
    size: int = 20,
    search: str | None = None,
) -> SectionListResponse:
    query = select(Section)

    if grade_id:
        query = query.where(Section.grade_id == grade_id)
    if academic_year_id:
        query = query.where(Section.academic_year_id == academic_year_id)
    if status_filter:
        query = query.where(Section.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(or_(Section.name.ilike(s), Section.code.ilike(s)))

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()

    sections = db.execute(
        query.order_by(Section.name.asc())
        .offset((page - 1) * size)
        .limit(size)
    ).scalars().all()

    items = [get_section_response(s, db) for s in sections]

    return SectionListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )

