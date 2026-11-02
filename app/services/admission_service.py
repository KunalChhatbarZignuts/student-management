import datetime as dt
import uuid
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.admission import Admission
from app.models.classroom import TeacherAssignment
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.schemas.admission import (
    AcademicDetailsSummary,
    AdmissionCreateRequest,
    AdmissionListItem,
    AdmissionParentSummary,
    AdmissionResponse,
    PaginatedAdmissionsResponse,
    StudentAccountSummary,
    StudentDetailsSummary,
)
from app.services.audit_service import log_action
from app.services.id_generator import (
    generate_admission_number,
    generate_enrollment_number,
    generate_student_code,
)


def process_student_admission(
    payload: AdmissionCreateRequest,
    actor_user_id: uuid.UUID,
    ip: str | None,
    db: Session,
) -> AdmissionResponse:
    """Orchestrate the complete, atomic student admission workflow."""
    # 1. Validate Academic Year
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year or year.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Academic Year not found or inactive",
        )

    # 2. Validate Grade
    grade = db.get(Grade, payload.grade_id)
    if not grade or grade.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Grade not found or inactive",
        )
    if grade.academic_year_id != year.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grade '{grade.name}' does not belong to Academic Year '{year.name}'",
        )

    # 3. Validate Section
    section = db.get(Section, payload.section_id)
    if not section or section.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Section not found or inactive",
        )
    if section.grade_id != grade.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section '{section.name}' does not belong to Grade '{grade.name}'",
        )

    # 4. Check Section Capacity
    active_students_count = db.execute(
        select(func.count(StudentEnrollment.id)).where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()

    if section.class_capacity and active_students_count >= section.class_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section '{section.name}' has reached its maximum capacity of {section.class_capacity} students",
        )

    # 5. Retrieve Section Class Teacher
    teacher_assign = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.section_id == section.id,
            TeacherAssignment.is_active == True,
            or_(
                TeacherAssignment.is_class_teacher == True,
                TeacherAssignment.assignment_type == "CLASS_TEACHER",
            ),
        )
    ).scalars().first()

    class_teacher_name = None
    class_teacher_code = None
    if teacher_assign and teacher_assign.teacher:
        class_teacher_name = f"{teacher_assign.teacher.first_name} {teacher_assign.teacher.last_name}"
        class_teacher_code = teacher_assign.teacher.employee_code

    grade_coord_name = None
    if grade.coordinator:
        grade_coord_name = f"{grade.coordinator.first_name} {grade.coordinator.last_name}"

    # 6. Generate IDs
    adm_year = payload.admission_date.year
    dept = payload.student.department or "General"
    student_code = generate_student_code(db, adm_year, dept)
    enrollment_number = generate_enrollment_number(db, adm_year)
    admission_number = generate_admission_number(db, adm_year)

    # 7. Setup Student User Account
    if payload.student.email:
        student_email = str(payload.student.email).strip().lower()
        existing_u = db.execute(select(User).where(func.lower(User.email) == student_email)).scalar_one_or_none()
        if existing_u:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email '{student_email}' already exists",
            )
    else:
        # Default system-generated email
        student_email = f"{enrollment_number.lower()}@student.school.edu"

    initial_student_pwd = None
    if payload.create_student_account:
        initial_student_pwd = payload.student.password.strip() if payload.student.password else "Student@1234"
        stu_user_status = UserStatus.ACTIVE.value
        stu_pwd_hash = hash_password(initial_student_pwd)
    else:
        stu_user_status = UserStatus.PENDING.value
        stu_pwd_hash = None

    stu_user = User(
        email=student_email,
        role=UserRole.STUDENT.value,
        status=stu_user_status,
        password_hash=stu_pwd_hash,
    )
    db.add(stu_user)
    db.flush()

    # 8. Create Student Person Record
    student = Student(
        user_id=stu_user.id,
        student_code=student_code,
        enrollment_number=enrollment_number,
        first_name=payload.student.first_name.strip(),
        middle_name=payload.student.middle_name.strip() if payload.student.middle_name else None,
        last_name=payload.student.last_name.strip(),
        gender=payload.student.gender.capitalize(),
        dob=payload.student.dob,
        phone=payload.student.phone.strip() if payload.student.phone else None,
        alternate_phone=payload.student.alternate_phone.strip() if payload.student.alternate_phone else None,
        address=payload.student.address.strip() if payload.student.address else None,
        city=payload.student.city.strip() if payload.student.city else None,
        state=payload.student.state.strip() if payload.student.state else None,
        country=payload.student.country.strip() if payload.student.country else None,
        postal_code=payload.student.postal_code.strip() if payload.student.postal_code else None,
        profile_photo=payload.student.profile_photo,
        previous_school_name=payload.student.previous_school_name.strip() if payload.student.previous_school_name else None,
        previous_school_details=payload.student.previous_school_details.strip() if payload.student.previous_school_details else None,
        class_name=grade.name,
        section=section.name,
        department=dept,
        admission_date=payload.admission_date,
        status="active",
    )
    db.add(student)
    db.flush()

    # 9. Compute next roll number & Create Academic Enrollment
    max_roll = db.execute(
        select(func.max(StudentEnrollment.roll_no)).where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()
    next_roll = (max_roll or 0) + 1

    enrollment = StudentEnrollment(
        student_id=student.id,
        grade_id=grade.id,
        section_id=section.id,
        academic_year_id=year.id,
        roll_no=next_roll,
        status="ACTIVE",
        enrollment_date=payload.admission_date,
        joined_on=payload.admission_date,
    )
    db.add(enrollment)
    db.flush()

    # 10. Process Parents / Guardians
    parents_summary: list[AdmissionParentSummary] = []
    has_primary_guardian = False

    for p_in in payload.parents:
        parent_rec: Parent | None = None
        p_user: User | None = None
        initial_parent_pwd: str | None = None

        if p_in.existing_parent_id:
            parent_rec = db.get(Parent, p_in.existing_parent_id)
            if not parent_rec:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Existing parent with ID '{p_in.existing_parent_id}' not found",
                )
            p_user = db.get(User, parent_rec.user_id)
        else:
            # Create or resolve new parent
            if not p_in.first_name or not p_in.last_name or not p_in.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="First name, last name, and email are required when creating a new parent",
                )
            p_email = str(p_in.email).strip().lower()
            existing_p_user = db.execute(
                select(User).where(func.lower(User.email) == p_email)
            ).scalar_one_or_none()

            if existing_p_user:
                if existing_p_user.role != UserRole.PARENT.value:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"An account with email '{p_email}' already exists with role '{existing_p_user.role}'",
                    )
                p_user = existing_p_user
                parent_rec = db.execute(
                    select(Parent).where(Parent.user_id == p_user.id)
                ).scalar_one_or_none()
            else:
                initial_parent_pwd = p_in.password.strip() if p_in.password else "Parent@1234"
                p_user = User(
                    email=p_email,
                    role=UserRole.PARENT.value,
                    status=UserStatus.ACTIVE.value,
                    password_hash=hash_password(initial_parent_pwd),
                )
                db.add(p_user)
                db.flush()

                parent_rec = Parent(
                    user_id=p_user.id,
                    first_name=p_in.first_name.strip(),
                    last_name=p_in.last_name.strip(),
                    phone=p_in.phone.strip() if p_in.phone else None,
                    address=p_in.address.strip() if p_in.address else None,
                )
                db.add(parent_rec)
                db.flush()

        if not parent_rec or not p_user:
            raise HTTPException(status_code=500, detail="Failed to initialize parent profile")

        # Create Parent-Student Link
        existing_link = db.execute(
            select(ParentStudentLink).where(
                ParentStudentLink.parent_id == parent_rec.id,
                ParentStudentLink.student_id == student.id,
            )
        ).scalar_one_or_none()

        is_primary = p_in.is_primary_guardian
        if is_primary:
            has_primary_guardian = True
            # Update student primary guardian fields
            student.guardian_name = f"{parent_rec.first_name} {parent_rec.last_name}"
            student.guardian_phone = parent_rec.phone
            student.guardian_email = p_user.email

        if not existing_link:
            link = ParentStudentLink(
                parent_id=parent_rec.id,
                student_id=student.id,
                relationship_type=p_in.relationship_type,
                is_primary_guardian=is_primary,
                verification_status="verified",
                status="active",
                linked_by=actor_user_id,
            )
            db.add(link)
        else:
            existing_link.status = "active"
            existing_link.relationship_type = p_in.relationship_type
            existing_link.is_primary_guardian = is_primary

        parents_summary.append(
            AdmissionParentSummary(
                parent_id=parent_rec.id,
                user_id=p_user.id,
                first_name=parent_rec.first_name,
                last_name=parent_rec.last_name,
                email=p_user.email,
                phone=parent_rec.phone,
                relationship_type=p_in.relationship_type,
                is_primary_guardian=is_primary,
                initial_password=initial_parent_pwd,
                account_status=p_user.status,
            )
        )

    # If no parent was explicitly marked as primary, default the first one
    if not has_primary_guardian and parents_summary:
        parents_summary[0].is_primary_guardian = True
        student.guardian_name = f"{parents_summary[0].first_name} {parents_summary[0].last_name}"
        student.guardian_phone = parents_summary[0].phone
        student.guardian_email = parents_summary[0].email

    # 11. Create Admission Record
    admission = Admission(
        admission_number=admission_number,
        student_id=student.id,
        enrollment_number=enrollment_number,
        academic_year_id=year.id,
        grade_id=grade.id,
        section_id=section.id,
        admission_date=payload.admission_date,
        status="completed",
        student_account_created=payload.create_student_account,
        created_by_user_id=actor_user_id,
        notes=payload.notes,
    )
    db.add(admission)
    db.flush()

    # 12. Optional Fee Assignment (Atomic)
    fee_resp = None
    if payload.fee_assignment:
        from app.services.fee_service import assign_fees_to_student
        fee_resp = assign_fees_to_student(
            student_id=student.id,
            academic_year_id=year.id,
            grade_id=grade.id,
            payload=payload.fee_assignment,
            admission_id=admission.id,
            actor_user_id=actor_user_id,
            assigned_date=payload.admission_date,
            db=db,
        )

    db.commit()
    db.refresh(admission)

    # 13. Audit Log
    log_action(
        db,
        actor_user_id=actor_user_id,
        action="student_admission_completed",
        entity_type="admission",
        entity_id=str(admission.id),
        metadata={
            "admission_number": admission_number,
            "enrollment_number": enrollment_number,
            "student_id": str(student.id),
            "grade": grade.name,
            "section": section.name,
            "parents_count": len(parents_summary),
        },
        ip=ip,
    )

    return AdmissionResponse(
        admission_id=admission.id,
        admission_number=admission.admission_number,
        status=admission.status,
        admission_date=admission.admission_date,
        student=StudentDetailsSummary(
            id=student.id,
            enrollment_number=enrollment_number,
            student_code=student_code,
            first_name=student.first_name,
            middle_name=student.middle_name,
            last_name=student.last_name,
            gender=student.gender,
            dob=student.dob,
            email=stu_user.email,
        ),
        student_account=StudentAccountSummary(
            user_id=stu_user.id,
            email=stu_user.email,
            login_identifier=enrollment_number,
            initial_password=initial_student_pwd,
            account_status=stu_user.status,
        ),
        academic=AcademicDetailsSummary(
            academic_year_id=year.id,
            academic_year_name=year.name,
            grade_id=grade.id,
            grade_name=grade.name,
            section_id=section.id,
            section_name=section.name,
            roll_no=next_roll,
            class_teacher_name=class_teacher_name,
            class_teacher_employee_code=class_teacher_code,
            grade_coordinator_name=grade_coord_name,
        ),
        parents=parents_summary,
        fee_assignment=fee_resp,
        created_at=admission.created_at,
    )


def list_admissions(
    skip: int,
    limit: int,
    search: str | None,
    grade_id: uuid.UUID | None,
    status_filter: str | None,
    db: Session,
) -> PaginatedAdmissionsResponse:
    """Retrieve historical admissions with pagination and filtering."""
    query = select(Admission)

    if grade_id:
        query = query.where(Admission.grade_id == grade_id)
    if status_filter:
        query = query.where(Admission.status == status_filter)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()

    admissions = db.execute(
        query.order_by(Admission.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    items: list[AdmissionListItem] = []
    for adm in admissions:
        st = db.get(Student, adm.student_id)
        gr = db.get(Grade, adm.grade_id)
        sec = db.get(Section, adm.section_id)
        ay = db.get(AcademicYear, adm.academic_year_id)

        # Lookup class teacher
        t_assign = db.execute(
            select(TeacherAssignment).where(
                TeacherAssignment.section_id == adm.section_id,
                TeacherAssignment.is_active == True,
                or_(
                    TeacherAssignment.is_class_teacher == True,
                    TeacherAssignment.assignment_type == "CLASS_TEACHER",
                ),
            )
        ).scalars().first()

        t_name = f"{t_assign.teacher.first_name} {t_assign.teacher.last_name}" if t_assign and t_assign.teacher else None

        items.append(
            AdmissionListItem(
                id=adm.id,
                admission_number=adm.admission_number,
                enrollment_number=adm.enrollment_number,
                student_name=f"{st.first_name} {st.last_name}" if st else "Student",
                grade_name=gr.name if gr else "Grade",
                section_name=sec.name if sec else "Section",
                academic_year_name=ay.name if ay else "Year",
                class_teacher_name=t_name,
                admission_date=adm.admission_date,
                status=adm.status,
                created_at=adm.created_at,
            )
        )

    return PaginatedAdmissionsResponse(items=items, total=total, skip=skip, limit=limit)


def get_admission_by_id(admission_id: uuid.UUID, db: Session) -> AdmissionResponse:
    """Retrieve full details of an admission record."""
    adm = db.get(Admission, admission_id)
    if not adm:
        raise HTTPException(status_code=404, detail="Admission record not found")

    student = db.get(Student, adm.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Associated student record not found")

    stu_user = db.get(User, student.user_id)
    year = db.get(AcademicYear, adm.academic_year_id)
    grade = db.get(Grade, adm.grade_id)
    section = db.get(Section, adm.section_id)

    # Class teacher
    t_assign = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.section_id == adm.section_id,
            TeacherAssignment.is_active == True,
            or_(
                TeacherAssignment.is_class_teacher == True,
                TeacherAssignment.assignment_type == "CLASS_TEACHER",
            ),
        )
    ).scalars().first()
    class_teacher_name = f"{t_assign.teacher.first_name} {t_assign.teacher.last_name}" if t_assign and t_assign.teacher else None
    class_teacher_code = t_assign.teacher.employee_code if t_assign and t_assign.teacher else None

    # Roll no
    enr = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one_or_none()
    roll_no = enr.roll_no if enr else 1

    # Parents
    links = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.student_id == student.id,
            ParentStudentLink.status == "active",
        )
    ).scalars().all()

    parents_summary = []
    for link in links:
        p = db.get(Parent, link.parent_id)
        if p:
            u = db.get(User, p.user_id)
            parents_summary.append(
                AdmissionParentSummary(
                    parent_id=p.id,
                    user_id=p.user_id,
                    first_name=p.first_name,
                    last_name=p.last_name,
                    email=u.email if u else "",
                    phone=p.phone,
                    relationship_type=link.relationship_type,
                    is_primary_guardian=link.is_primary_guardian,
                    account_status=u.status if u else "active",
                )
            )

    return AdmissionResponse(
        admission_id=adm.id,
        admission_number=adm.admission_number,
        status=adm.status,
        admission_date=adm.admission_date,
        student=StudentDetailsSummary(
            id=student.id,
            enrollment_number=adm.enrollment_number,
            student_code=student.student_code,
            first_name=student.first_name,
            middle_name=student.middle_name,
            last_name=student.last_name,
            gender=student.gender,
            dob=student.dob,
            email=stu_user.email if stu_user else "",
        ),
        student_account=StudentAccountSummary(
            user_id=stu_user.id if stu_user else uuid.uuid4(),
            email=stu_user.email if stu_user else "",
            login_identifier=adm.enrollment_number,
            account_status=stu_user.status if stu_user else "active",
        ),
        academic=AcademicDetailsSummary(
            academic_year_id=adm.academic_year_id,
            academic_year_name=year.name if year else "",
            grade_id=adm.grade_id,
            grade_name=grade.name if grade else "",
            section_id=adm.section_id,
            section_name=section.name if section else "",
            roll_no=roll_no,
            class_teacher_name=class_teacher_name,
            class_teacher_employee_code=class_teacher_code,
            grade_coordinator_name=f"{grade.coordinator.first_name} {grade.coordinator.last_name}" if grade and grade.coordinator else None,
        ),
        parents=parents_summary,
        created_at=adm.created_at,
    )

