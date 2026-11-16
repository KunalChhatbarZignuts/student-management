import uuid
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.academic_structure import AcademicYear, Grade, Section, Shift, StudentEnrollment
from app.models.teacher import Teacher
from app.models.user import User, UserStatus
from app.schemas.grade_section import (
    GradeCreate,
    GradeDetailResponse,
    GradeListResponse,
    GradeResponse,
    GradeUpdate,
)
from app.services.audit_service import log_action


def create_grade(
    payload: GradeCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> GradeResponse:
    # 1. Verify academic year exists
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Academic year not found or inactive",
        )

    # 2. Check duplicate name in same academic year
    existing_name = db.execute(
        select(Grade).where(
            Grade.academic_year_id == payload.academic_year_id,
            Grade.name.ilike(payload.name.strip()),
        )
    ).scalar_one_or_none()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Grade with name '{payload.name}' already exists in this academic year",
        )

    # 3. Check duplicate code if provided
    if payload.code:
        existing_code = db.execute(
            select(Grade).where(
                Grade.academic_year_id == payload.academic_year_id,
                Grade.code.ilike(payload.code.strip()),
            )
        ).scalar_one_or_none()
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Grade with code '{payload.code}' already exists in this academic year",
            )

    # 4. Verify coordinator teacher if provided
    coord_id = None
    if payload.coordinator_teacher_id:
        teacher = db.get(Teacher, payload.coordinator_teacher_id)
        if not teacher:
            teacher = db.execute(
                select(Teacher).where(Teacher.user_id == payload.coordinator_teacher_id)
            ).scalar_one_or_none()
        if not teacher:
            raise HTTPException(status_code=404, detail="Coordinator teacher not found")
        # Check teacher user status
        teacher_user = db.get(User, teacher.user_id)
        if not teacher_user or teacher_user.status != UserStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coordinator teacher must be an active user account",
            )
        coord_id = teacher.id

    # 5. Verify shift if provided
    shift_name = None
    if payload.shift_id:
        shift = db.get(Shift, payload.shift_id)
        if shift:
            shift_name = shift.name

    grade = Grade(
        name=payload.name.strip(),
        code=payload.code.strip() if payload.code else None,
        description=payload.description.strip() if payload.description else None,
        level=payload.level,
        academic_year_id=payload.academic_year_id,
        shift_id=payload.shift_id,
        coordinator_teacher_id=coord_id,
        status="active",
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)

    log_action(
        db,
        action="grade_created",
        entity_type="grade",
        actor_user_id=actor_user_id,
        entity_id=str(grade.id),
        metadata={"name": grade.name, "code": grade.code, "academic_year_id": str(grade.academic_year_id)},
        ip=ip,
    )

    coord_name = None
    if grade.coordinator:
        coord_name = f"{grade.coordinator.first_name} {grade.coordinator.last_name}"

    return GradeResponse(
        id=grade.id,
        name=grade.name,
        code=grade.code,
        description=grade.description,
        level=grade.level,
        academic_year_id=grade.academic_year_id,
        academic_year_name=year.name,
        coordinator_teacher_id=grade.coordinator_teacher_id,
        coordinator_name=coord_name,
        shift_id=grade.shift_id,
        shift_name=shift_name,
        status=grade.status,
        total_sections=0,
        total_students=0,
        created_at=grade.created_at,
        updated_at=grade.updated_at,
    )


def update_grade(
    grade_id: uuid.UUID,
    payload: GradeUpdate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> GradeResponse:
    grade = db.get(Grade, grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    old_values: dict[str, Any] = {"name": grade.name, "code": grade.code, "coordinator": str(grade.coordinator_teacher_id)}

    if payload.name and payload.name.strip() != grade.name:
        existing = db.execute(
            select(Grade).where(
                Grade.academic_year_id == grade.academic_year_id,
                Grade.name.ilike(payload.name.strip()),
                Grade.id != grade.id,
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail=f"Grade with name '{payload.name}' already exists in this year")
        grade.name = payload.name.strip()

    if payload.code is not None:
        if payload.code.strip():
            existing = db.execute(
                select(Grade).where(
                    Grade.academic_year_id == grade.academic_year_id,
                    Grade.code.ilike(payload.code.strip()),
                    Grade.id != grade.id,
                )
            ).scalar_one_or_none()
            if existing:
                raise HTTPException(status_code=409, detail=f"Grade with code '{payload.code}' already exists")
            grade.code = payload.code.strip()
        else:
            grade.code = None

    if payload.description is not None:
        grade.description = payload.description.strip() if payload.description else None

    if payload.level is not None:
        grade.level = payload.level

    if payload.shift_id is not None:
        grade.shift_id = payload.shift_id

    if payload.coordinator_teacher_id is not None:
        if payload.coordinator_teacher_id:
            teacher = db.get(Teacher, payload.coordinator_teacher_id)
            if not teacher:
                teacher = db.execute(
                    select(Teacher).where(Teacher.user_id == payload.coordinator_teacher_id)
                ).scalar_one_or_none()
            if not teacher:
                raise HTTPException(status_code=404, detail="Teacher not found")
            teacher_user = db.get(User, teacher.user_id)
            if not teacher_user or teacher_user.status != UserStatus.ACTIVE.value:
                raise HTTPException(status_code=400, detail="Coordinator teacher must be an active account")
            grade.coordinator_teacher_id = teacher.id
        else:
            grade.coordinator_teacher_id = None

    db.commit()
    db.refresh(grade)

    log_action(
        db,
        action="grade_updated",
        entity_type="grade",
        actor_user_id=actor_user_id,
        entity_id=str(grade.id),
        metadata={"old": old_values, "new": {"name": grade.name, "code": grade.code, "coordinator": str(grade.coordinator_teacher_id)}},
        ip=ip,
    )

    return get_grade_response(grade, db)


def update_grade_status(
    grade_id: uuid.UUID,
    status_val: str,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> GradeResponse:
    grade = db.get(Grade, grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    if status_val == "inactive":
        # Rule: cannot deactivate if active sections or active student enrollments exist
        active_sections_count = db.execute(
            select(func.count(Section.id)).where(
                Section.grade_id == grade.id,
                Section.status == "active",
            )
        ).scalar_one()
        if active_sections_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot deactivate grade '{grade.name}' with {active_sections_count} active sections",
            )

        active_enrollments = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.grade_id == grade.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        if active_enrollments > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot deactivate grade '{grade.name}' with {active_enrollments} active student enrollments",
            )

    grade.status = status_val
    db.commit()
    db.refresh(grade)

    log_action(
        db,
        action="grade_status_updated",
        entity_type="grade",
        actor_user_id=actor_user_id,
        entity_id=str(grade.id),
        metadata={"new_status": status_val},
        ip=ip,
    )

    return get_grade_response(grade, db)


def get_grade_detail(grade_id: uuid.UUID, db: Session) -> GradeDetailResponse:
    grade = db.get(Grade, grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    base_resp = get_grade_response(grade, db)

    # Get sections under this grade
    sections = db.execute(
        select(Section)
        .where(Section.grade_id == grade.id)
        .order_by(Section.name.asc())
    ).scalars().all()

    from app.services.section_service import get_section_response
    section_responses = [get_section_response(s, db) for s in sections]

    return GradeDetailResponse(
        **base_resp.model_dump(),
        sections=section_responses,
    )


def list_grades(
    db: Session,
    page: int = 1,
    size: int = 20,
    search: str | None = None,
    academic_year_id: uuid.UUID | None = None,
    status_filter: str | None = None,
) -> GradeListResponse:
    query = select(Grade)

    if academic_year_id:
        query = query.where(Grade.academic_year_id == academic_year_id)
    if status_filter:
        query = query.where(Grade.status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(or_(Grade.name.ilike(s), Grade.code.ilike(s)))

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()

    grades = db.execute(
        query.order_by(Grade.level.asc(), Grade.name.asc())
        .offset((page - 1) * size)
        .limit(size)
    ).scalars().all()

    items = [get_grade_response(g, db) for g in grades]

    return GradeListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


def get_grade_response(grade: Grade, db: Session) -> GradeResponse:
    year = db.get(AcademicYear, grade.academic_year_id)
    shift = db.get(Shift, grade.shift_id) if grade.shift_id else None

    coord_name = None
    if grade.coordinator:
        coord_name = f"{grade.coordinator.first_name} {grade.coordinator.last_name}"

    total_sections = db.execute(
        select(func.count(Section.id)).where(Section.grade_id == grade.id)
    ).scalar_one()

    total_students = db.execute(
        select(func.count(StudentEnrollment.id)).where(
            StudentEnrollment.grade_id == grade.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()

    return GradeResponse(
        id=grade.id,
        name=grade.name,
        code=grade.code,
        description=grade.description,
        level=grade.level,
        academic_year_id=grade.academic_year_id,
        academic_year_name=year.name if year else None,
        coordinator_teacher_id=grade.coordinator_teacher_id,
        coordinator_name=coord_name,
        shift_id=grade.shift_id,
        shift_name=shift.name if shift else None,
        status=grade.status,
        total_sections=total_sections,
        total_students=total_students,
        created_at=grade.created_at,
        updated_at=grade.updated_at,
    )

