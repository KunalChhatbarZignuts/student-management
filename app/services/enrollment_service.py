import uuid
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Section,
    StudentEnrollment,
    StudentTransferRecord,
)
from app.models.classroom import TeacherAssignment
from app.models.examination import StudentExamResult
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.enrollment import (
    BulkEnrollmentRequest,
    BulkEnrollmentResponse,
    EnhancedEnrollmentHistoryItem,
    EnrollmentDashboardMetrics,
    GradeDistributionItem,
    PromotionExecuteRequest,
    PromotionExecuteResponse,
    PromotionPreviewRequest,
    PromotionPreviewResponse,
    PromotionStudentPreviewItem,
    SectionDistributionItem,
    StudentTransferCreate,
    StudentTransferRecordResponse,
    TargetSectionCapacityItem,
    UnassignedStudentItem,
)
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
    student.current_grade_id = grade.id
    student.current_section_id = section.id

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
    student.current_grade_id = target_grade.id
    student.current_section_id = target_section.id

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
    student.current_grade_id = target_grade.id
    student.current_section_id = target_section.id

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


# ===========================================================================
# Advanced Academic Enrollment, Bulk Assignment, Transfer & Promotion Services
# ===========================================================================

def get_enrollment_dashboard_metrics(
    academic_year_id: uuid.UUID | None, db: Session
) -> EnrollmentDashboardMetrics:
    """Retrieve comprehensive enrollment KPI counters and grade/section distributions."""
    if not academic_year_id:
        cur_year = db.execute(
            select(AcademicYear).where(AcademicYear.is_current == True)
        ).scalars().first()
        if not cur_year:
            cur_year = db.execute(
                select(AcademicYear).where(AcademicYear.status == "active")
            ).scalars().first()
        target_year_id = cur_year.id if cur_year else None
    else:
        target_year_id = academic_year_id

    # 1. Total Enrolled
    total_enrolled = 0
    if target_year_id:
        total_enrolled = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.academic_year_id == target_year_id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()

    # 2. Unassigned Active Students
    if target_year_id:
        enrolled_subq = select(StudentEnrollment.student_id).where(
            StudentEnrollment.academic_year_id == target_year_id,
            StudentEnrollment.status == "ACTIVE",
        )
        unassigned_count = db.execute(
            select(func.count(Student.id)).where(
                Student.status == "active",
                Student.id.not_in(enrolled_subq),
            )
        ).scalar_one()
    else:
        unassigned_count = db.execute(
            select(func.count(Student.id)).where(
                Student.status == "active",
                Student.current_grade_id.is_(None),
            )
        ).scalar_one()

    # 3. Transferred Count
    if target_year_id:
        transferred_count = db.execute(
            select(func.count(StudentTransferRecord.id)).where(
                (StudentTransferRecord.from_academic_year_id == target_year_id)
                | (StudentTransferRecord.to_academic_year_id == target_year_id)
            )
        ).scalar_one()
    else:
        transferred_count = db.execute(select(func.count(StudentTransferRecord.id))).scalar_one()

    # 4. Promoted Count
    if target_year_id:
        promoted_count = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.academic_year_id == target_year_id,
                StudentEnrollment.status == "PROMOTED",
            )
        ).scalar_one()
    else:
        promoted_count = db.execute(
            select(func.count(StudentEnrollment.id)).where(StudentEnrollment.status == "PROMOTED")
        ).scalar_one()

    # 5. Inactive Students
    inactive_count = db.execute(
        select(func.count(Student.id)).where(Student.status != "active")
    ).scalar_one()

    # 6. Grade Distribution
    grade_query = select(Grade).where(Grade.status == "active")
    if target_year_id:
        grade_query = grade_query.where(Grade.academic_year_id == target_year_id)
    grades = db.execute(grade_query.order_by(Grade.level.asc(), Grade.name.asc())).scalars().all()

    grade_distribution: list[GradeDistributionItem] = []
    for g in grades:
        enrolled = 0
        if target_year_id:
            enrolled = db.execute(
                select(func.count(StudentEnrollment.id)).where(
                    StudentEnrollment.grade_id == g.id,
                    StudentEnrollment.academic_year_id == target_year_id,
                    StudentEnrollment.status == "ACTIVE",
                )
            ).scalar_one()
        sec_count = len(g.sections)
        grade_distribution.append(
            GradeDistributionItem(
                grade_id=g.id,
                grade_name=g.name,
                level=g.level,
                enrolled_count=enrolled,
                sections_count=sec_count,
            )
        )

    # 7. Section Distribution
    sec_query = select(Section).where(Section.status == "active")
    if target_year_id:
        sec_query = sec_query.where(Section.academic_year_id == target_year_id)
    sections = db.execute(sec_query.order_by(Section.name.asc())).scalars().all()

    section_distribution: list[SectionDistributionItem] = []
    for s in sections:
        g = db.get(Grade, s.grade_id)
        enrolled = 0
        if target_year_id:
            enrolled = db.execute(
                select(func.count(StudentEnrollment.id)).where(
                    StudentEnrollment.section_id == s.id,
                    StudentEnrollment.academic_year_id == target_year_id,
                    StudentEnrollment.status == "ACTIVE",
                )
            ).scalar_one()

        # Class teacher lookup
        ct_name = None
        ct_assign = db.execute(
            select(TeacherAssignment).where(
                TeacherAssignment.section_id == s.id,
                TeacherAssignment.is_class_teacher == True,
                TeacherAssignment.is_active == True,
            )
        ).scalars().first()
        if ct_assign:
            t = db.get(Teacher, ct_assign.teacher_id)
            if t:
                ct_name = f"{t.first_name} {t.last_name}"

        section_distribution.append(
            SectionDistributionItem(
                section_id=s.id,
                section_name=s.name,
                grade_name=g.name if g else "Grade",
                enrolled_count=enrolled,
                capacity=s.class_capacity,
                class_teacher_name=ct_name,
            )
        )

    return EnrollmentDashboardMetrics(
        total_enrolled=total_enrolled,
        unassigned_students=unassigned_count,
        transferred_students=transferred_count,
        promoted_students=promoted_count,
        inactive_students=inactive_count,
        grade_distribution=grade_distribution,
        section_distribution=section_distribution,
    )


def get_unassigned_students(
    academic_year_id: uuid.UUID | None, db: Session
) -> list[UnassignedStudentItem]:
    """Retrieve admitted active students not yet assigned to an active section."""
    if not academic_year_id:
        cur_year = db.execute(
            select(AcademicYear).where(AcademicYear.is_current == True)
        ).scalars().first()
        if not cur_year:
            cur_year = db.execute(
                select(AcademicYear).where(AcademicYear.status == "active")
            ).scalars().first()
        target_year_id = cur_year.id if cur_year else None
    else:
        target_year_id = academic_year_id

    query = select(Student).where(Student.status == "active")
    if target_year_id:
        enrolled_subq = select(StudentEnrollment.student_id).where(
            StudentEnrollment.academic_year_id == target_year_id,
            StudentEnrollment.status == "ACTIVE",
        )
        query = query.where(Student.id.not_in(enrolled_subq))
    else:
        query = query.where(Student.current_grade_id.is_(None))

    students = db.execute(
        query.order_by(Student.admission_date.desc(), Student.first_name.asc())
    ).scalars().all()

    return [
        UnassignedStudentItem(
            student_id=st.id,
            student_code=st.student_code,
            enrollment_number=st.enrollment_number,
            first_name=st.first_name,
            last_name=st.last_name,
            gender=st.gender,
            admission_date=st.admission_date,
            department=st.department,
        )
        for st in students
    ]


def bulk_enroll_students(
    payload: BulkEnrollmentRequest,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> BulkEnrollmentResponse:
    """Assign multiple students to grade and section atomically with capacity check."""
    # 1. Verify Grade, Section and Academic Year
    grade = db.get(Grade, payload.grade_id)
    if not grade or grade.status != "active":
        raise HTTPException(status_code=400, detail="Target grade not found or inactive")

    section = db.get(Section, payload.section_id)
    if not section or section.status != "active":
        raise HTTPException(status_code=400, detail="Target section not found or inactive")

    if section.grade_id != grade.id:
        raise HTTPException(status_code=400, detail=f"Section '{section.name}' does not belong to grade '{grade.name}'")

    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.status != "active":
        raise HTTPException(status_code=400, detail="Academic year not found or inactive")

    # 2. Capacity Check (Atomic All-or-Nothing)
    if section.class_capacity is not None:
        current_enrolled = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == section.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        available_seats = section.class_capacity - current_enrolled
        if len(payload.student_ids) > available_seats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot enroll {len(payload.student_ids)} students. Section '{section.name}' has only {available_seats} available seat(s) (capacity: {section.class_capacity}, current: {current_enrolled}).",
            )

    # 3. Duplicate Active Enrollment Check
    conflicts = db.execute(
        select(Student.first_name, Student.last_name, Student.student_code).join(
            StudentEnrollment, StudentEnrollment.student_id == Student.id
        ).where(
            Student.id.in_(payload.student_ids),
            StudentEnrollment.academic_year_id == payload.academic_year_id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).all()
    if conflicts:
        names = ", ".join(f"{c[0]} {c[1]} ({c[2]})" for c in conflicts[:3])
        more = f" and {len(conflicts) - 3} others" if len(conflicts) > 3 else ""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The following student(s) already have an active enrollment for {year.name}: {names}{more}",
        )

    # 4. Sequential roll number start
    max_roll = db.execute(
        select(func.max(StudentEnrollment.roll_no)).where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()
    current_roll = (max_roll or 0)

    enrolled_ids: list[uuid.UUID] = []
    enrollment_date = payload.enrollment_date or date.today()

    for st_id in payload.student_ids:
        st = db.get(Student, st_id)
        if not st or st.status != "active":
            raise HTTPException(status_code=400, detail=f"Student ID {st_id} is invalid or inactive")

        current_roll += 1
        enrollment = StudentEnrollment(
            student_id=st.id,
            grade_id=grade.id,
            section_id=section.id,
            academic_year_id=year.id,
            roll_no=current_roll,
            status="ACTIVE",
            enrollment_date=enrollment_date,
            joined_on=enrollment_date,
            enrolled_by_user_id=actor_user_id,
        )
        db.add(enrollment)

        st.class_name = grade.name
        st.section = section.name
        st.current_grade_id = grade.id
        st.current_section_id = section.id
        enrolled_ids.append(st.id)

    db.commit()

    log_action(
        db,
        action="bulk_student_enrolled",
        entity_type="student_enrollment",
        actor_user_id=actor_user_id,
        metadata={
            "grade_id": str(grade.id),
            "section_id": str(section.id),
            "count": len(enrolled_ids),
        },
        ip=ip,
    )

    return BulkEnrollmentResponse(
        enrolled_count=len(enrolled_ids),
        section_id=section.id,
        section_name=section.name,
        grade_name=grade.name,
        enrolled_student_ids=enrolled_ids,
    )


def execute_student_transfer(
    payload: StudentTransferCreate,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> StudentTransferRecordResponse:
    """Transfer student between sections or grades, creating an immutable audit record."""
    student = db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    target_section = db.get(Section, payload.target_section_id)
    if not target_section or target_section.status != "active":
        raise HTTPException(status_code=400, detail="Target section not found or inactive")

    target_grade = db.get(Grade, payload.target_grade_id or target_section.grade_id)
    if not target_grade or target_grade.status != "active":
        raise HTTPException(status_code=400, detail="Target grade not found or inactive")

    if target_section.grade_id != target_grade.id:
        raise HTTPException(status_code=400, detail=f"Target section '{target_section.name}' does not belong to grade '{target_grade.name}'")

    # Locate current active enrollment
    active_enrollment = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        ).order_by(StudentEnrollment.created_at.desc())
    ).scalars().first()

    if not active_enrollment:
        raise HTTPException(status_code=400, detail="Student does not have an active enrollment to transfer from")

    if active_enrollment.section_id == target_section.id:
        raise HTTPException(status_code=400, detail="Student is already actively enrolled in this section")

    # Check target capacity
    if target_section.class_capacity is not None:
        target_count = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == target_section.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        if target_count >= target_section.class_capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Target section '{target_section.name}' is full (capacity: {target_section.class_capacity})",
            )

    transfer_date = payload.transfer_date or date.today()
    target_year_id = payload.target_academic_year_id or active_enrollment.academic_year_id

    # 1. Close old active enrollment
    active_enrollment.status = "TRANSFERRED"
    active_enrollment.left_on = transfer_date

    # 2. Calculate next roll_no in target section
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
        academic_year_id=target_year_id,
        roll_no=new_roll,
        status="ACTIVE",
        enrollment_date=transfer_date,
        joined_on=transfer_date,
        reason=payload.reason,
        remarks=payload.remarks,
        transfer_from_enrollment_id=active_enrollment.id,
        enrolled_by_user_id=actor_user_id,
    )
    db.add(new_enrollment)

    # 4. Synchronize student relational keys
    student.class_name = target_grade.name
    student.section = target_section.name
    student.current_grade_id = target_grade.id
    student.current_section_id = target_section.id

    # 5. Create immutable transfer record
    transfer_rec = StudentTransferRecord(
        student_id=student.id,
        from_academic_year_id=active_enrollment.academic_year_id,
        to_academic_year_id=target_year_id,
        from_grade_id=active_enrollment.grade_id,
        to_grade_id=target_grade.id,
        from_section_id=active_enrollment.section_id,
        to_section_id=target_section.id,
        from_enrollment_id=active_enrollment.id,
        to_enrollment_id=new_enrollment.id,
        transfer_date=transfer_date,
        transfer_type=payload.transfer_type,
        reason=payload.reason,
        remarks=payload.remarks,
        performed_by_user_id=actor_user_id,
    )
    db.add(transfer_rec)

    db.commit()
    db.refresh(transfer_rec)

    actor_user = db.get(User, actor_user_id) if actor_user_id else None
    from_year = db.get(AcademicYear, active_enrollment.academic_year_id)
    to_year = db.get(AcademicYear, target_year_id)
    from_grade = db.get(Grade, active_enrollment.grade_id) if active_enrollment.grade_id else None
    from_sec = db.get(Section, active_enrollment.section_id) if active_enrollment.section_id else None

    log_action(
        db,
        action="student_transferred",
        entity_type="student_transfer_records",
        actor_user_id=actor_user_id,
        entity_id=str(transfer_rec.id),
        metadata={
            "student_id": str(student.id),
            "from_section_id": str(active_enrollment.section_id),
            "to_section_id": str(target_section.id),
            "transfer_type": payload.transfer_type,
            "reason": payload.reason,
        },
        ip=ip,
    )

    return StudentTransferRecordResponse(
        id=transfer_rec.id,
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        student_code=student.student_code,
        from_academic_year_name=from_year.name if from_year else "Year",
        to_academic_year_name=to_year.name if to_year else "Year",
        from_grade_name=from_grade.name if from_grade else None,
        to_grade_name=target_grade.name,
        from_section_name=from_sec.name if from_sec else None,
        to_section_name=target_section.name,
        transfer_date=transfer_rec.transfer_date,
        transfer_type=transfer_rec.transfer_type,
        reason=transfer_rec.reason,
        remarks=transfer_rec.remarks,
        performed_by_name=actor_user.email if actor_user else "Admin",
        created_at=transfer_rec.created_at,
    )


def list_transfer_records(
    academic_year_id: uuid.UUID | None,
    student_id: uuid.UUID | None,
    db: Session,
) -> list[StudentTransferRecordResponse]:
    """Retrieve institution-wide student transfer records."""
    query = select(StudentTransferRecord)
    if student_id:
        query = query.where(StudentTransferRecord.student_id == student_id)
    if academic_year_id:
        query = query.where(
            (StudentTransferRecord.from_academic_year_id == academic_year_id)
            | (StudentTransferRecord.to_academic_year_id == academic_year_id)
        )
    records = db.execute(
        query.order_by(StudentTransferRecord.transfer_date.desc(), StudentTransferRecord.created_at.desc())
    ).scalars().all()

    items: list[StudentTransferRecordResponse] = []
    for r in records:
        st = db.get(Student, r.student_id)
        from_y = db.get(AcademicYear, r.from_academic_year_id)
        to_y = db.get(AcademicYear, r.to_academic_year_id)
        from_g = db.get(Grade, r.from_grade_id) if r.from_grade_id else None
        to_g = db.get(Grade, r.to_grade_id) if r.to_grade_id else None
        from_s = db.get(Section, r.from_section_id) if r.from_section_id else None
        to_s = db.get(Section, r.to_section_id) if r.to_section_id else None
        actor = db.get(User, r.performed_by_user_id) if r.performed_by_user_id else None

        items.append(
            StudentTransferRecordResponse(
                id=r.id,
                student_id=r.student_id,
                student_name=f"{st.first_name} {st.last_name}" if st else "Student",
                student_code=st.student_code if st else "STU-0000",
                from_academic_year_name=from_y.name if from_y else "Year",
                to_academic_year_name=to_y.name if to_y else "Year",
                from_grade_name=from_g.name if from_g else None,
                to_grade_name=to_g.name if to_g else None,
                from_section_name=from_s.name if from_s else None,
                to_section_name=to_s.name if to_s else None,
                transfer_date=r.transfer_date,
                transfer_type=r.transfer_type,
                reason=r.reason,
                remarks=r.remarks,
                performed_by_name=actor.email if actor else "Admin",
                created_at=r.created_at,
            )
        )
    return items


def preview_academic_promotions(
    payload: PromotionPreviewRequest, db: Session
) -> PromotionPreviewResponse:
    """Preview students eligible for promotion across academic years with exam result indicators."""
    source_grade = db.get(Grade, payload.source_grade_id)
    if not source_grade:
        raise HTTPException(status_code=404, detail="Source grade not found")

    target_grade = db.get(Grade, payload.target_grade_id)
    if not target_grade:
        raise HTTPException(status_code=404, detail="Target grade not found")

    source_year = db.get(AcademicYear, payload.source_academic_year_id)
    target_year = db.get(AcademicYear, payload.target_academic_year_id)

    # Target Sections & Capacities
    target_sections_db = db.execute(
        select(Section).where(
            Section.grade_id == target_grade.id,
            Section.status == "active",
        )
    ).scalars().all()

    target_sections: list[TargetSectionCapacityItem] = []
    for s in target_sections_db:
        enrolled = db.execute(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.section_id == s.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one()
        avail = (s.class_capacity - enrolled) if s.class_capacity is not None else None
        target_sections.append(
            TargetSectionCapacityItem(
                section_id=s.id,
                section_name=s.name,
                capacity=s.class_capacity,
                current_enrolled=enrolled,
                available_seats=avail,
            )
        )

    # Find active students in source grade/section
    student_query = select(StudentEnrollment).where(
        StudentEnrollment.grade_id == source_grade.id,
        StudentEnrollment.academic_year_id == source_year.id,
        StudentEnrollment.status == "ACTIVE",
    )
    if payload.source_section_id:
        student_query = student_query.where(StudentEnrollment.section_id == payload.source_section_id)

    enrollments = db.execute(
        student_query.order_by(StudentEnrollment.roll_no.asc())
    ).scalars().all()

    preview_students: list[PromotionStudentPreviewItem] = []
    for e in enrollments:
        st = db.get(Student, e.student_id)
        if not st:
            continue
        sec = db.get(Section, e.section_id) if e.section_id else None

        # Check examination result indicator (if any)
        exam_res = db.execute(
            select(StudentExamResult).where(
                StudentExamResult.student_id == st.id
            ).order_by(StudentExamResult.created_at.desc())
        ).scalars().first()

        exam_status = "NONE"
        pct = None
        is_eligible = True
        suggested = "PROMOTE"

        if exam_res:
            exam_status = exam_res.result_status  # PASS or FAIL
            pct = exam_res.percentage
            if exam_res.result_status == "FAIL":
                is_eligible = False
                suggested = "REPEAT"

        preview_students.append(
            PromotionStudentPreviewItem(
                student_id=st.id,
                student_code=st.student_code,
                first_name=st.first_name,
                last_name=st.last_name,
                current_roll_no=e.roll_no,
                current_grade_id=source_grade.id,
                current_grade_name=source_grade.name,
                current_section_id=sec.id if sec else None,
                current_section_name=sec.name if sec else None,
                exam_result=exam_status,
                exam_percentage=pct,
                suggested_action=suggested,
                is_eligible=is_eligible,
            )
        )

    return PromotionPreviewResponse(
        source_grade_name=source_grade.name,
        target_grade_name=target_grade.name,
        source_year_name=source_year.name if source_year else "Source Year",
        target_year_name=target_year.name if target_year else "Target Year",
        target_sections=target_sections,
        students=preview_students,
    )


def execute_academic_promotions(
    payload: PromotionExecuteRequest,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> PromotionExecuteResponse:
    """Execute batch academic year promotions, retentions, or withdrawals."""
    target_grade = db.get(Grade, payload.target_grade_id)
    if not target_grade:
        raise HTTPException(status_code=404, detail="Target grade not found")

    target_year = db.get(AcademicYear, payload.target_academic_year_id)
    if not target_year or target_year.status != "active":
        raise HTTPException(status_code=400, detail="Target academic year not found or inactive")

    effective_date = payload.effective_date or date.today()
    promoted_count = 0
    repeated_count = 0
    left_count = 0

    for dec in payload.decisions:
        st = db.get(Student, dec.student_id)
        if not st:
            continue

        # Close current active enrollment
        active_enrollment = db.execute(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == st.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalars().first()

        if dec.action == "PROMOTE":
            if not dec.target_section_id:
                raise HTTPException(status_code=400, detail=f"Target section must be specified for student {st.student_code}")
            sec = db.get(Section, dec.target_section_id)
            if not sec or sec.status != "active":
                raise HTTPException(status_code=400, detail=f"Target section not found for student {st.student_code}")

            if active_enrollment:
                active_enrollment.status = "PROMOTED"
                active_enrollment.left_on = effective_date

            max_roll = db.execute(
                select(func.max(StudentEnrollment.roll_no)).where(
                    StudentEnrollment.section_id == sec.id,
                    StudentEnrollment.status == "ACTIVE",
                )
            ).scalar_one()
            new_roll = (max_roll or 0) + 1

            new_enr = StudentEnrollment(
                student_id=st.id,
                grade_id=target_grade.id,
                section_id=sec.id,
                academic_year_id=target_year.id,
                roll_no=new_roll,
                status="ACTIVE",
                enrollment_date=effective_date,
                joined_on=effective_date,
                reason=dec.reason or "Academic promotion to next grade",
                transfer_from_enrollment_id=active_enrollment.id if active_enrollment else None,
                enrolled_by_user_id=actor_user_id,
            )
            db.add(new_enr)

            st.class_name = target_grade.name
            st.section = sec.name
            st.current_grade_id = target_grade.id
            st.current_section_id = sec.id

            if active_enrollment:
                transfer_rec = StudentTransferRecord(
                    student_id=st.id,
                    from_academic_year_id=active_enrollment.academic_year_id,
                    to_academic_year_id=target_year.id,
                    from_grade_id=active_enrollment.grade_id,
                    to_grade_id=target_grade.id,
                    from_section_id=active_enrollment.section_id,
                    to_section_id=sec.id,
                    from_enrollment_id=active_enrollment.id,
                    to_enrollment_id=new_enr.id,
                    transfer_date=effective_date,
                    transfer_type="YEAR_TRANSITION",
                    reason=dec.reason or "Academic promotion",
                    performed_by_user_id=actor_user_id,
                )
                db.add(transfer_rec)

            promoted_count += 1

        elif dec.action == "REPEAT":
            if active_enrollment:
                active_enrollment.status = "REPEATED"
                active_enrollment.left_on = effective_date
                rep_grade_id = active_enrollment.grade_id or target_grade.id
                rep_sec_id = dec.target_section_id or active_enrollment.section_id
            else:
                rep_grade_id = target_grade.id
                rep_sec_id = dec.target_section_id

            if not rep_sec_id:
                raise HTTPException(status_code=400, detail=f"Target section must be specified for repeating student {st.student_code}")

            sec = db.get(Section, rep_sec_id)
            rep_grade = db.get(Grade, rep_grade_id)

            max_roll = db.execute(
                select(func.max(StudentEnrollment.roll_no)).where(
                    StudentEnrollment.section_id == sec.id,
                    StudentEnrollment.status == "ACTIVE",
                )
            ).scalar_one()
            new_roll = (max_roll or 0) + 1

            new_enr = StudentEnrollment(
                student_id=st.id,
                grade_id=rep_grade_id,
                section_id=sec.id,
                academic_year_id=target_year.id,
                roll_no=new_roll,
                status="ACTIVE",
                enrollment_date=effective_date,
                joined_on=effective_date,
                reason=dec.reason or "Repeating grade level",
                transfer_from_enrollment_id=active_enrollment.id if active_enrollment else None,
                enrolled_by_user_id=actor_user_id,
            )
            db.add(new_enr)

            st.class_name = rep_grade.name if rep_grade else st.class_name
            st.section = sec.name
            st.current_grade_id = rep_grade_id
            st.current_section_id = sec.id

            repeated_count += 1

        elif dec.action == "LEFT":
            if active_enrollment:
                active_enrollment.status = "LEFT"
                active_enrollment.left_on = effective_date
                active_enrollment.reason = dec.reason or "Withdrawn / left institution"
            st.status = "inactive"
            left_count += 1

    db.commit()

    log_action(
        db,
        action="batch_academic_promotions",
        entity_type="student_enrollment",
        actor_user_id=actor_user_id,
        metadata={
            "promoted_count": promoted_count,
            "repeated_count": repeated_count,
            "left_count": left_count,
            "target_year_id": str(target_year.id),
        },
        ip=ip,
    )

    return PromotionExecuteResponse(
        promoted_count=promoted_count,
        repeated_count=repeated_count,
        left_count=left_count,
        total_processed=len(payload.decisions),
        message=f"Successfully processed {len(payload.decisions)} student progressions ({promoted_count} promoted, {repeated_count} repeating, {left_count} left).",
    )


def get_enhanced_student_enrollments(
    student_id: uuid.UUID, db: Session
) -> list[EnhancedEnrollmentHistoryItem]:
    """Retrieve complete chronological student enrollment and transfer history with Class Teacher."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollments = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
        ).order_by(StudentEnrollment.enrollment_date.desc(), StudentEnrollment.created_at.desc())
    ).scalars().all()

    items: list[EnhancedEnrollmentHistoryItem] = []
    for e in enrollments:
        grade = db.get(Grade, e.grade_id) if e.grade_id else None
        sec = db.get(Section, e.section_id) if e.section_id else None
        year = db.get(AcademicYear, e.academic_year_id) if e.academic_year_id else None

        # Resolve Class Teacher for this section
        ct_name = None
        if sec:
            ct_assign = db.execute(
                select(TeacherAssignment).where(
                    TeacherAssignment.section_id == sec.id,
                    TeacherAssignment.is_class_teacher == True,
                )
            ).scalars().first()
            if ct_assign:
                t = db.get(Teacher, ct_assign.teacher_id)
                if t:
                    ct_name = f"{t.first_name} {t.last_name}"

        items.append(
            EnhancedEnrollmentHistoryItem(
                id=e.id,
                student_id=e.student_id,
                grade_id=e.grade_id,
                grade_name=grade.name if grade else None,
                section_id=e.section_id,
                section_name=sec.name if sec else None,
                academic_year_id=e.academic_year_id,
                academic_year_name=year.name if year else None,
                roll_no=e.roll_no,
                class_teacher_name=ct_name,
                status=e.status,
                enrollment_date=e.enrollment_date,
                joined_on=e.joined_on,
                left_on=e.left_on,
                reason=e.reason,
                remarks=e.remarks,
                created_at=e.created_at,
            )
        )

    return items

