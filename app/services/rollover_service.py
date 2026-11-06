import datetime as dt
import uuid
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.academic_structure import (
    AcademicYear,
    EnrollmentStatus,
    Grade,
    Section,
    StudentEnrollment,
    StudentTransferRecord,
)
from app.models.fee import (
    FeeInstallment,
    FeeStructure,
    FeeStructureItem,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
)
from app.models.student import Student
from app.models.user import User
from app.schemas.rollover import (
    RolloverCohortMappingItem,
    RolloverExecutionRequest,
    RolloverExecutionResponse,
    RolloverPreviewResponse,
)


def preview_academic_year_rollover(
    db: Session,
    source_year_id: uuid.UUID,
    target_year_id: uuid.UUID,
) -> RolloverPreviewResponse:
    """Analyze source academic year cohort sizes, validate target year structures, and generate preview."""
    source_year = db.get(AcademicYear, source_year_id)
    target_year = db.get(AcademicYear, target_year_id)
    if not source_year or not target_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic year not found")

    if source_year_id == target_year_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and Target academic years cannot be identical",
        )

    # Fetch source grades
    source_grades = db.scalars(
        select(Grade)
        .where(Grade.academic_year_id == source_year_id)
        .order_by(Grade.level, Grade.name)
    ).all()

    # Fetch target grades with sections
    target_grades = db.scalars(
        select(Grade)
        .where(Grade.academic_year_id == target_year_id)
        .options(joinedload(Grade.sections))
        .order_by(Grade.level, Grade.name)
    ).unique().all()

    # Map target grades by level and by name
    target_grade_by_level = {g.level: g for g in target_grades}
    target_grade_by_name = {g.name.strip().lower(): g for g in target_grades}

    # Fetch fee structures configured in target year
    target_fee_structures = db.scalars(
        select(FeeStructure).where(
            FeeStructure.academic_year_id == target_year_id,
            FeeStructure.status == "active",
        )
    ).all()
    grades_with_fees = {fs.grade_id for fs in target_fee_structures}

    cohort_mappings: list[RolloverCohortMappingItem] = []
    total_active_students = 0
    warnings: list[str] = []

    for sg in source_grades:
        # Count active students in source grade
        student_count = db.scalar(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.academic_year_id == source_year_id,
                StudentEnrollment.grade_id == sg.id,
                StudentEnrollment.status == EnrollmentStatus.ACTIVE,
            )
        ) or 0
        total_active_students += student_count

        # Determine default target grade (next level, e.g. Grade 1 (level 1) -> Grade 2 (level 2))
        next_level = sg.level + 1 if sg.level is not None else None
        target_g = target_grade_by_level.get(next_level) if next_level is not None else None
        if not target_g and sg.name:
            # Check numerical bump if name contains e.g. "Grade 1" -> "Grade 2"
            try:
                digits = "".join(c for c in sg.name if c.isdigit())
                if digits:
                    bumped_name = sg.name.lower().replace(digits, str(int(digits) + 1))
                    target_g = target_grade_by_name.get(bumped_name)
            except Exception:
                pass

        has_target_sections = len(target_g.sections) if target_g else 0
        has_fees = target_g.id in grades_with_fees if target_g else False

        if student_count > 0:
            if not target_g:
                warnings.append(f"{sg.name}: No subsequent grade found in target year (Cohort will be marked Graduated/Left).")
            elif has_target_sections == 0:
                warnings.append(f"{target_g.name}: Target grade has 0 active sections configured in {target_year.name}.")
            elif not has_fees:
                warnings.append(f"{target_g.name}: No active Fee Structure configured for {target_year.name}.")

        cohort_mappings.append(
            RolloverCohortMappingItem(
                source_grade_id=sg.id,
                source_grade_name=sg.name,
                target_grade_id=target_g.id if target_g else None,
                target_grade_name=target_g.name if target_g else "Graduating Cohort",
                student_count=student_count,
                target_sections_available=has_target_sections,
                fee_structure_configured=has_fees,
            )
        )

    return RolloverPreviewResponse(
        source_year_id=source_year.id,
        source_year_name=source_year.name,
        target_year_id=target_year.id,
        target_year_name=target_year.name,
        total_active_students=total_active_students,
        cohort_mappings=cohort_mappings,
        is_ready_to_rollover=total_active_students > 0,
        warnings=warnings,
    )


def execute_academic_year_rollover(
    db: Session,
    payload: RolloverExecutionRequest,
    current_user: User,
) -> RolloverExecutionResponse:
    """Execute bulk cohort transition across academic years with fee initialization."""
    source_year = db.get(AcademicYear, payload.source_year_id)
    target_year = db.get(AcademicYear, payload.target_year_id)
    if not source_year or not target_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic year not found")

    # Map input grade transitions: source_grade_id -> (target_grade_id, default_section_id)
    grade_map = {gm.source_grade_id: (gm.target_grade_id, gm.default_target_section_id) for gm in payload.grade_mappings}
    overrides_map = {so.student_id: so for so in payload.student_overrides}

    # Fetch target grades sections to find fallback sections
    target_grades = db.scalars(
        select(Grade)
        .where(Grade.academic_year_id == target_year.id)
        .options(joinedload(Grade.sections))
    ).unique().all()
    target_grade_dict = {g.id: g for g in target_grades}

    # Preload target year fee structures by grade
    fee_structures = db.scalars(
        select(FeeStructure)
        .where(
            FeeStructure.academic_year_id == target_year.id,
            FeeStructure.status == "active",
        )
        .options(joinedload(FeeStructure.items).joinedload(FeeStructureItem.component))
    ).unique().all()
    fee_structure_by_grade = {fs.grade_id: fs for fs in fee_structures}

    # Fetch all active source enrollments
    enrollments = db.scalars(
        select(StudentEnrollment)
        .where(
            StudentEnrollment.academic_year_id == source_year.id,
            StudentEnrollment.status == EnrollmentStatus.ACTIVE,
        )
        .options(
            joinedload(StudentEnrollment.student),
            joinedload(StudentEnrollment.grade),
            joinedload(StudentEnrollment.section),
        )
    ).all()

    today = dt.date.today()
    promoted_count = 0
    repeated_count = 0
    graduated_left_count = 0
    fee_assignments_created = 0

    for enr in enrollments:
        student = enr.student
        if not student:
            continue

        override = overrides_map.get(student.id)
        action = override.action if override else "PROMOTE"

        if action == "LEFT":
            enr.status = EnrollmentStatus.LEFT
            enr.left_on = today
            enr.reason = "STUDENT_WITHDRAWAL_ROLLOVER"
            graduated_left_count += 1
            continue

        if action == "REPEAT":
            # Student repeats in the same grade level in target year
            source_grade_name = enr.grade.name.strip().lower() if enr.grade else ""
            repeat_grade = next(
                (g for g in target_grades if g.name.strip().lower() == source_grade_name),
                None,
            )
            if not repeat_grade:
                # If no matching grade name in target year, keep target_grades[0] or error
                repeat_grade = target_grades[0] if target_grades else None

            if not repeat_grade or not repeat_grade.sections:
                continue

            target_section = override.target_section_id if override and override.target_section_id else repeat_grade.sections[0].id

            # Close old enrollment
            enr.status = EnrollmentStatus.LEFT
            enr.left_on = today
            enr.reason = "ACADEMIC_YEAR_ROLLOVER_REPEAT"

            # Create new enrollment
            new_enr = StudentEnrollment(
                student_id=student.id,
                academic_year_id=target_year.id,
                grade_id=repeat_grade.id,
                section_id=target_section,
                roll_no=enr.roll_no,
                enrollment_date=today,
                status=EnrollmentStatus.ACTIVE,
                reason="REPEATED_GRADE",
                transfer_from_enrollment_id=enr.id,
                enrolled_by_user_id=current_user.id,
            )
            db.add(new_enr)

            student.current_grade_id = repeat_grade.id
            student.current_section_id = target_section
            repeated_count += 1

            # Auto-assign base fees
            if payload.auto_assign_base_fees and repeat_grade.id in fee_structure_by_grade:
                fs = fee_structure_by_grade[repeat_grade.id]
                _create_student_fee_assignment(db, student, target_year.id, repeat_grade.id, fs, current_user.id, today)
                fee_assignments_created += 1
            continue

        # Normal Promotion
        grade_rule = grade_map.get(enr.grade_id)
        target_grade_id = grade_rule[0] if grade_rule else None
        default_section_id = grade_rule[1] if grade_rule else None

        if not target_grade_id:
            # Graduating cohort
            enr.status = EnrollmentStatus.LEFT
            enr.left_on = today
            enr.reason = "GRADUATED"
            graduated_left_count += 1
            continue

        target_grade = target_grade_dict.get(target_grade_id)
        if not target_grade or not target_grade.sections:
            continue

        chosen_section_id = (
            (override.target_section_id if override and override.target_section_id else None)
            or default_section_id
            or target_grade.sections[0].id
        )

        # Close old enrollment
        enr.status = EnrollmentStatus.LEFT
        enr.left_on = today
        enr.reason = "ACADEMIC_YEAR_ROLLOVER_PROMOTED"

        # Create new active enrollment
        new_enr = StudentEnrollment(
            student_id=student.id,
            academic_year_id=target_year.id,
            grade_id=target_grade.id,
            section_id=chosen_section_id,
            roll_no=enr.roll_no,
            enrollment_date=today,
            status=EnrollmentStatus.ACTIVE,
            reason="PROMOTED",
            transfer_from_enrollment_id=enr.id,
            enrolled_by_user_id=current_user.id,
        )
        db.add(new_enr)

        student.current_grade_id = target_grade.id
        student.current_section_id = chosen_section_id
        promoted_count += 1

        # Auto-assign base fee structure
        if payload.auto_assign_base_fees and target_grade.id in fee_structure_by_grade:
            fs = fee_structure_by_grade[target_grade.id]
            _create_student_fee_assignment(db, student, target_year.id, target_grade.id, fs, current_user.id, today)
            fee_assignments_created += 1

    db.commit()

    return RolloverExecutionResponse(
        source_year_id=source_year.id,
        target_year_id=target_year.id,
        total_processed=len(enrollments),
        promoted_count=promoted_count,
        repeated_count=repeated_count,
        graduated_left_count=graduated_left_count,
        fee_assignments_created_count=fee_assignments_created,
        executed_at=dt.datetime.now(dt.timezone.utc),
        status="COMPLETED",
    )


def _create_student_fee_assignment(
    db: Session,
    student: Student,
    academic_year_id: uuid.UUID,
    grade_id: uuid.UUID,
    fee_structure: FeeStructure,
    user_id: uuid.UUID,
    assigned_date: dt.date,
):
    """Internal helper to initialize base fee assignment and installments for promoted student."""
    # Check if assignment already exists
    existing = db.scalars(
        select(StudentFeeAssignment).where(
            StudentFeeAssignment.student_id == student.id,
            StudentFeeAssignment.academic_year_id == academic_year_id,
        )
    ).first()
    if existing:
        return

    base_amount = fee_structure.total_amount or Decimal("0.00")
    assignment = StudentFeeAssignment(
        student_id=student.id,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        fee_structure_id=fee_structure.id,
        base_amount=base_amount,
        total_discount=Decimal("0.00"),
        total_additional=Decimal("0.00"),
        final_payable_amount=base_amount,
        currency="INR",
        installment_frequency="annual",
        status="active",
        assigned_date=assigned_date,
        notes="Auto-assigned during Academic Year Rollover",
        created_by_user_id=user_id,
    )
    db.add(assignment)
    db.flush()

    # Create assignment items from fee structure items
    for item in fee_structure.items or []:
        ass_item = StudentFeeAssignmentItem(
            assignment_id=assignment.id,
            fee_component_id=item.fee_component_id,
            component_name=item.component.name if item.component else "Fee Component",
            amount=item.amount,
            payment_frequency=item.payment_frequency,
            is_mandatory=item.is_mandatory,
            is_selected=True,
        )
        db.add(ass_item)

    # Create single annual installment if base amount > 0
    if base_amount > Decimal("0.00"):
        installment = FeeInstallment(
            assignment_id=assignment.id,
            installment_number=1,
            installment_name="Annual Academic Term Fee",
            due_date=assigned_date + dt.timedelta(days=30),
            amount=base_amount,
            paid_amount=Decimal("0.00"),
            outstanding_amount=base_amount,
            status="pending",
        )
        db.add(installment)
