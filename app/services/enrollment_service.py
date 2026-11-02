import uuid
from datetime import date
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.student import Student
from app.schemas.grade_section import (
    EnrolledStudentItem,
    SectionStudentsResponse,
    StudentEnrollmentHistoryItem,
    StudentEnrollPayload,
    StudentPromotePayload,
    StudentTransferPayload,
)
from app.services.audit_service import log_action


def enroll_student(
    student_id: uuid.UUID,
    payload: StudentEnrollPayload,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> StudentEnrollmentHistoryItem:
    # 1. Verify student exists
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.status != "active":
        raise HTTPException(status_code=400, detail="Cannot enroll an inactive student")

    # 2. Verify Grade and Section
    grade = db.get(Grade, payload.grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    if grade.status != "active":
        raise HTTPException(status_code=400, detail=f"Grade '{grade.name}' is inactive")

    section = db.get(Section, payload.section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if section.status != "active":
        raise HTTPException(status_code=400, detail=f"Section '{section.name}' is inactive")

    # Rule: Section must belong to the selected Grade
    if section.grade_id != grade.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section '{section.name}' does not belong to grade '{grade.name}'",
        )

    # 3. Verify Academic Year
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.status != "active":
        raise HTTPException(status_code=404, detail="Academic year not found or inactive")

    # 4. Check Section Capacity if configured
    if section.class_capacity is not None:
        current_enrolled = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == section.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        if current_enrolled >= section.class_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Section '{section.name}' has reached its maximum capacity of {section.class_capacity} students",
            )

    # 5. Rule: Student can have only ONE active enrollment per academic year
    active_enrollment = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.academic_year_id == payload.academic_year_id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one_or_none()
    if active_enrollment:
        old_sec = db.get(Section, active_enrollment.section_id) if active_enrollment.section_id else None
        sec_name = old_sec.name if old_sec else "a section"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student is already actively enrolled in {sec_name} for academic year {year.name}",
        )

    # 6. Auto-calculate next sequential roll number if not provided
    roll_no = payload.roll_no or 1
    if not payload.roll_no:
        max_roll = db.execute(
            select(func.max(StudentEnrollment.roll_no)).where(
                StudentEnrollment.section_id == section.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        roll_no = (max_roll or 0) + 1

    enrollment = StudentEnrollment(
        student_id=student.id,
        grade_id=grade.id,
        section_id=section.id,
        academic_year_id=payload.academic_year_id,
        roll_no=roll_no,
        status="ACTIVE",
        enrollment_date=payload.enrollment_date or date.today(),
        joined_on=payload.enrollment_date or date.today(),
    )
    db.add(enrollment)

    # Synchronize student.class_name and student.section for backward compatibility
    student.class_name = grade.name
    student.section = section.name

    db.commit()
    db.refresh(enrollment)

    log_action(
        db,
        action="student_enrolled",
        entity_type="student_enrollment",
        actor_user_id=actor_user_id,
        entity_id=str(enrollment.id),
        metadata={
            "student_id": str(student.id),
            "grade_id": str(grade.id),
            "section_id": str(section.id),
            "roll_no": roll_no,
        },
        ip=ip,
    )

    return _build_enrollment_item(enrollment, db)


def transfer_student(
    student_id: uuid.UUID,
    payload: StudentTransferPayload,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> StudentEnrollmentHistoryItem:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    target_section = db.get(Section, payload.target_section_id)
    if not target_section:
        raise HTTPException(status_code=404, detail="Target section not found")
    if target_section.status != "active":
        raise HTTPException(status_code=400, detail=f"Target section '{target_section.name}' is inactive")

    target_grade = db.get(Grade, target_section.grade_id)
    if not target_grade or target_grade.status != "active":
        raise HTTPException(status_code=400, detail="Target grade is inactive or not found")

    # Find student's current active enrollment
    active_enrollment = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        ).order_by(StudentEnrollment.created_at.desc())
    ).scalars().first()

    if not active_enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student does not have an active enrollment to transfer from",
        )

    if active_enrollment.section_id == target_section.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already enrolled in the target section",
        )

    # Check capacity of target section
    if target_section.class_capacity is not None:
        target_count = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == target_section.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        if target_count >= target_section.class_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target section '{target_section.name}' is full (capacity {target_section.class_capacity})",
            )

    transfer_date = payload.transfer_date or date.today()

    # 1. Close old enrollment - preserve history
    active_enrollment.status = "TRANSFERRED"
    active_enrollment.left_on = transfer_date

    # 2. Compute next roll number in target section
    max_roll = db.execute(
        select(func.max(StudentEnrollment.roll_no)).where(
            StudentEnrollment.section_id == target_section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()
    new_roll = (max_roll or 0) + 1

    # 3. Create new active enrollment
    new_enrollment = StudentEnrollment(
        student_id=student.id,
        grade_id=target_grade.id,
        section_id=target_section.id,
        academic_year_id=active_enrollment.academic_year_id,
        roll_no=new_roll,
        status="ACTIVE",
        enrollment_date=transfer_date,
        joined_on=transfer_date,
    )
    db.add(new_enrollment)

    # Sync student record
    student.class_name = target_grade.name
    student.section = target_section.name

    db.commit()
    db.refresh(new_enrollment)

    log_action(
        db,
        action="student_transferred",
        entity_type="student_enrollment",
        actor_user_id=actor_user_id,
        entity_id=str(new_enrollment.id),
        metadata={
            "student_id": str(student.id),
            "from_section_id": str(active_enrollment.section_id),
            "to_section_id": str(target_section.id),
            "reason": payload.reason,
        },
        ip=ip,
    )

    return _build_enrollment_item(new_enrollment, db)


def promote_student(
    student_id: uuid.UUID,
    payload: StudentPromotePayload,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> StudentEnrollmentHistoryItem:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    target_grade = db.get(Grade, payload.target_grade_id)
    target_section = db.get(Section, payload.target_section_id)
    target_year = db.get(AcademicYear, payload.target_academic_year_id)

    if not target_grade or target_grade.status != "active":
        raise HTTPException(status_code=400, detail="Target grade inactive or not found")
    if not target_section or target_section.status != "active":
        raise HTTPException(status_code=400, detail="Target section inactive or not found")
    if not target_year or target_year.status != "active":
        raise HTTPException(status_code=400, detail="Target academic year inactive or not found")

    if target_section.grade_id != target_grade.id:
        raise HTTPException(status_code=400, detail="Target section does not belong to target grade")

    effective_date = payload.effective_date or date.today()

    # Close previous active enrollment if in past year
    old_active = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalars().first()
    if old_active:
        old_active.left_on = effective_date
        old_active.status = "PROMOTED"

    max_roll = db.execute(
        select(func.max(StudentEnrollment.roll_no)).where(
            StudentEnrollment.section_id == target_section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()
    new_roll = (max_roll or 0) + 1

    new_enrollment = StudentEnrollment(
        student_id=student.id,
        grade_id=target_grade.id,
        section_id=target_section.id,
        academic_year_id=target_year.id,
        roll_no=new_roll,
        status="ACTIVE",
        enrollment_date=effective_date,
        joined_on=effective_date,
    )
    db.add(new_enrollment)

    student.class_name = target_grade.name
    student.section = target_section.name

    db.commit()
    db.refresh(new_enrollment)

    log_action(
        db,
        action="student_promoted",
        entity_type="student_enrollment",
        actor_user_id=actor_user_id,
        entity_id=str(new_enrollment.id),
        metadata={
            "student_id": str(student.id),
            "target_grade_id": str(target_grade.id),
            "target_section_id": str(target_section.id),
        },
        ip=ip,
    )

    return _build_enrollment_item(new_enrollment, db)


def get_section_students(section_id: uuid.UUID, db: Session) -> SectionStudentsResponse:
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    grade = db.get(Grade, section.grade_id)

    enrollments = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        ).order_by(StudentEnrollment.roll_no.asc())
    ).scalars().all()

    items: list[EnrolledStudentItem] = []
    for e in enrollments:
        st = db.get(Student, e.student_id)
        if st:
            items.append(
                EnrolledStudentItem(
                    enrollment_id=e.id,
                    student_id=st.id,
                    student_code=st.student_code,
                    first_name=st.first_name,
                    last_name=st.last_name,
                    roll_no=e.roll_no,
                    status=e.status,
                    enrollment_date=e.enrollment_date,
                    left_on=e.left_on,
                )
            )

    return SectionStudentsResponse(
        section_id=section.id,
        section_name=section.name,
        grade_name=grade.name if grade else "Grade",
        total_students=len(items),
        capacity=section.class_capacity,
        items=items,
    )


def get_grade_students(grade_id: uuid.UUID, db: Session) -> list[EnrolledStudentItem]:
    grade = db.get(Grade, grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    enrollments = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.grade_id == grade.id,
            StudentEnrollment.status == "ACTIVE",
        ).order_by(StudentEnrollment.roll_no.asc())
    ).scalars().all()

    items: list[EnrolledStudentItem] = []
    for e in enrollments:
        st = db.get(Student, e.student_id)
        if st:
            items.append(
                EnrolledStudentItem(
                    enrollment_id=e.id,
                    student_id=st.id,
                    student_code=st.student_code,
                    first_name=st.first_name,
                    last_name=st.last_name,
                    roll_no=e.roll_no,
                    status=e.status,
                    enrollment_date=e.enrollment_date,
                    left_on=e.left_on,
                )
            )
    return items


def get_student_enrollments(student_id: uuid.UUID, db: Session) -> list[StudentEnrollmentHistoryItem]:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollments = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
        ).order_by(StudentEnrollment.enrollment_date.desc(), StudentEnrollment.created_at.desc())
    ).scalars().all()

    return [_build_enrollment_item(e, db) for e in enrollments]


def _build_enrollment_item(e: StudentEnrollment, db: Session) -> StudentEnrollmentHistoryItem:
    grade = db.get(Grade, e.grade_id) if e.grade_id else None
    sec = db.get(Section, e.section_id) if e.section_id else None
    year = db.get(AcademicYear, e.academic_year_id) if e.academic_year_id else None

    return StudentEnrollmentHistoryItem(
        id=e.id,
        student_id=e.student_id,
        grade_id=e.grade_id,
        grade_name=grade.name if grade else None,
        section_id=e.section_id,
        section_name=sec.name if sec else None,
        academic_year_id=e.academic_year_id,
        academic_year_name=year.name if year else None,
        roll_no=e.roll_no,
        status=e.status,
        enrollment_date=e.enrollment_date,
        left_on=e.left_on,
        created_at=e.created_at,
    )

