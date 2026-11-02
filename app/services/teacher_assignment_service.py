import uuid
from datetime import date
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.classroom import TeacherAssignment
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.schemas.grade_section import (
    TeacherAssignmentItem,
    TeacherMySectionsResponse,
    TeacherSectionItem,
)
from app.services.audit_service import log_action


def assign_class_teacher(
    section_id: uuid.UUID,
    teacher_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> TeacherAssignmentItem:
    # 1. Verify section exists and is active
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if section.status != "active":
        raise HTTPException(status_code=400, detail="Cannot assign teacher to an inactive section")

    # 2. Verify teacher exists, has role TEACHER, and is ACTIVE
    teacher = db.get(Teacher, teacher_id)
    if not teacher:
        teacher = db.execute(
            select(Teacher).where(Teacher.user_id == teacher_id)
        ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_user = db.get(User, teacher.user_id)
    if not teacher_user:
        raise HTTPException(status_code=404, detail="Teacher user account not found")

    if teacher_user.role != UserRole.TEACHER.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User is not a teacher (role: {teacher_user.role})",
        )

    if teacher_user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive teacher",
        )

    year = db.get(AcademicYear, section.academic_year_id)
    year_name = year.name if year else "2026-2027"

    # 3. Find current active class teacher assignment for this section
    current_active = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.section_id == section.id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.assignment_type == "CLASS_TEACHER",
        )
    ).scalars().first()

    old_teacher_id = None
    if current_active:
        # Check if already assigned to this teacher
        if current_active.teacher_id == teacher.id:
            return _build_assignment_item(current_active, db)

        # Deactivate old assignment and set end_date
        old_teacher_id = str(current_active.teacher_id)
        current_active.is_active = False
        current_active.end_date = date.today()

    # 4. Create new active assignment
    new_assignment = TeacherAssignment(
        teacher_id=teacher.id,
        section_id=section.id,
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        academic_year=year_name,
        start_date=date.today(),
        is_active=True,
        status="active",
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    log_action(
        db,
        action="class_teacher_assigned",
        entity_type="teacher_assignment",
        actor_user_id=actor_user_id,
        entity_id=str(new_assignment.id),
        metadata={
            "section_id": str(section.id),
            "new_teacher_id": str(teacher.id),
            "previous_teacher_id": old_teacher_id,
        },
        ip=ip,
    )

    return _build_assignment_item(new_assignment, db)


def remove_class_teacher(
    section_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> dict[str, str]:
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    current_active = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.section_id == section.id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.assignment_type == "CLASS_TEACHER",
        )
    ).scalars().first()

    if not current_active:
        raise HTTPException(status_code=404, detail="No active class teacher assigned to this section")

    current_active.is_active = False
    current_active.end_date = date.today()
    db.commit()

    log_action(
        db,
        action="class_teacher_removed",
        entity_type="teacher_assignment",
        actor_user_id=actor_user_id,
        entity_id=str(current_active.id),
        metadata={
            "section_id": str(section.id),
            "removed_teacher_id": str(current_active.teacher_id),
        },
        ip=ip,
    )

    return {"message": "Class teacher unassigned successfully"}


def get_section_teacher(section_id: uuid.UUID, db: Session) -> TeacherAssignmentItem | None:
    active_assignment = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.section_id == section_id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.assignment_type == "CLASS_TEACHER",
        )
    ).scalars().first()

    if not active_assignment:
        return None

    return _build_assignment_item(active_assignment, db)


def get_teacher_assigned_sections(teacher_id: uuid.UUID, db: Session) -> TeacherMySectionsResponse:
    teacher = db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # 1. Sections where teacher is Class Teacher
    class_teacher_assignments = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.section_id.isnot(None),
        )
    ).scalars().all()

    # 2. Grades where teacher is Coordinator
    coordinator_grades = db.execute(
        select(Grade).where(
            Grade.coordinator_teacher_id == teacher.id,
            Grade.status == "active",
        )
    ).scalars().all()

    coord_grade_ids = {g.id for g in coordinator_grades}

    items: list[TeacherSectionItem] = []
    seen_sections: set[uuid.UUID] = set()

    for a in class_teacher_assignments:
        sec = db.get(Section, a.section_id)
        if sec and sec.status == "active":
            grade = db.get(Grade, sec.grade_id)
            year = db.get(AcademicYear, sec.academic_year_id)
            student_count = db.execute(
                select(func.count(StudentEnrollment.id)).where(
                    StudentEnrollment.section_id == sec.id,
                    StudentEnrollment.status == "ACTIVE",
                )
            ).scalar_one()

            seen_sections.add(sec.id)
            items.append(
                TeacherSectionItem(
                    section_id=sec.id,
                    section_name=sec.name,
                    section_code=sec.code,
                    grade_id=sec.grade_id,
                    grade_name=grade.name if grade else "Grade",
                    academic_year=year.name if year else a.academic_year,
                    total_students=student_count,
                    role="CLASS_TEACHER",
                )
            )

    # Add sections under coordinated grades
    if coord_grade_ids:
        coord_sections = db.execute(
            select(Section).where(
                Section.grade_id.in_(coord_grade_ids),
                Section.status == "active",
            )
        ).scalars().all()

        for sec in coord_sections:
            if sec.id not in seen_sections:
                grade = db.get(Grade, sec.grade_id)
                year = db.get(AcademicYear, sec.academic_year_id)
                student_count = db.execute(
                    select(func.count(StudentEnrollment.id)).where(
                        StudentEnrollment.section_id == sec.id,
                        StudentEnrollment.status == "ACTIVE",
                    )
                ).scalar_one()

                items.append(
                    TeacherSectionItem(
                        section_id=sec.id,
                        section_name=sec.name,
                        section_code=sec.code,
                        grade_id=sec.grade_id,
                        grade_name=grade.name if grade else "Grade",
                        academic_year=year.name if year else "2026-2027",
                        total_students=student_count,
                        role="GRADE_COORDINATOR",
                    )
                )

    return TeacherMySectionsResponse(
        teacher_id=teacher.id,
        teacher_name=f"{teacher.first_name} {teacher.last_name}",
        sections=items,
    )


def _build_assignment_item(assignment: TeacherAssignment, db: Session) -> TeacherAssignmentItem:
    sec = db.get(Section, assignment.section_id) if assignment.section_id else None
    grade = db.get(Grade, sec.grade_id) if sec else None
    teacher = db.get(Teacher, assignment.teacher_id)

    return TeacherAssignmentItem(
        id=assignment.id,
        section_id=assignment.section_id,
        section_name=sec.name if sec else None,
        grade_name=grade.name if grade else None,
        teacher_id=assignment.teacher_id,
        teacher_name=f"{teacher.first_name} {teacher.last_name}" if teacher else None,
        employee_code=teacher.employee_code if teacher else None,
        assignment_type=assignment.assignment_type,
        start_date=assignment.start_date,
        end_date=assignment.end_date,
        is_active=assignment.is_active,
        status=assignment.status,
        created_at=assignment.created_at,
    )

