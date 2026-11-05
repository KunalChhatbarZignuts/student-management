import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import send_invite_email
from app.core.security import generate_secure_token, hash_token, hash_password
from app.models.invite import Invite
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.schemas.student import (
    PaginatedStudentsResponse,
    StudentCreate,
    StudentCreateResponse,
    StudentDetailResponse,
    StudentResponse,
    StudentUpdatePayload,
)
from app.schemas.grade_section import (
    StudentEnrollPayload,
    StudentTransferPayload,
    StudentPromotePayload,
    StudentEnrollmentHistoryItem,
)
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.schemas.student_detail import ComprehensiveStudentDetailResponse
from app.services import enrollment_service
from app.services.audit_service import log_action
from app.services.id_generator import generate_enrollment_number, generate_student_code
from app.services.student_detail_service import get_student_comprehensive_details

router = APIRouter(prefix="/admin/students", tags=["Admin - Students"])


@router.post("", response_model=StudentCreateResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    request: Request,
    payload: StudentCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates a student with mandatory Academic Year, Grade, and Section assignment in an atomic transaction."""
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

    # 4. Check email duplicate
    existing = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # 5. Generate server-issued student code and permanent enrollment number
    adm_year = payload.admission_date.year
    department = payload.department or "General"
    student_code = generate_student_code(db, adm_year, department)
    enrollment_number = generate_enrollment_number(db, adm_year)

    # 6. Create User record with optional initial password
    initial_password = None
    if payload.password and payload.password.strip():
        initial_password = payload.password.strip()
        user_status = UserStatus.ACTIVE.value
        pwd_hash = hash_password(initial_password)
    else:
        user_status = UserStatus.INVITED.value
        pwd_hash = None

    user = User(
        email=payload.email.lower(),
        role=UserRole.STUDENT.value,
        status=user_status,
        password_hash=pwd_hash,
    )
    db.add(user)
    db.flush()

    # 7. Create Student person record linked to User
    student = Student(
        student_code=student_code,
        enrollment_number=enrollment_number,
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        dob=payload.dob,
        class_name=grade.name,
        section=section.name,
        department=department,
        admission_date=payload.admission_date,
        guardian_name=payload.guardian_name,
        guardian_phone=payload.guardian_phone,
        guardian_email=payload.guardian_email,
        status="active",
    )
    db.add(student)
    db.flush()

    # 8. Calculate next roll number in section
    max_roll = db.execute(
        select(func.max(StudentEnrollment.roll_no)).where(
            StudentEnrollment.section_id == section.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one()
    next_roll = (max_roll or 0) + 1

    # 9. Create initial StudentEnrollment record in the same atomic transaction
    initial_enrollment = StudentEnrollment(
        student_id=student.id,
        grade_id=grade.id,
        section_id=section.id,
        academic_year_id=year.id,
        roll_no=next_roll,
        status="ACTIVE",
        enrollment_date=payload.admission_date,
        joined_on=payload.admission_date,
    )
    db.add(initial_enrollment)
    db.flush()

    raw_invite_token = ""
    invite_expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS)

    # 10. Generate invite token if invited
    if user_status == UserStatus.INVITED.value:
        raw_invite_token = generate_secure_token()
        invite = Invite(
            user_id=user.id,
            token_hash=hash_token(raw_invite_token),
            expires_at=invite_expires_at,
        )
        db.add(invite)
        send_invite_email(user.email, raw_invite_token)

    db.commit()

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="user_created",
        entity_type="student",
        entity_id=str(student.id),
        metadata={
            "student_code": student_code,
            "enrollment_number": enrollment_number,
            "email": user.email,
            "grade_id": str(grade.id),
            "section_id": str(section.id),
        },
        ip=ip,
    )

    st_resp = StudentResponse.model_validate(student)
    st_resp.initial_password = initial_password
    st_resp.login_identifier = enrollment_number

    return StudentCreateResponse(
        student=st_resp,
        enrollment_number=enrollment_number,
        user_status=user.status,
        invite_expires_at=invite_expires_at,
        invite_token=raw_invite_token,
        initial_password=initial_password,
        login_identifier=enrollment_number,
    )


@router.get("", response_model=PaginatedStudentsResponse)
def list_students(
    search: str | None = None,
    status: str | None = None,
    grade_id: uuid.UUID | None = None,
    section_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin Directory listing for all students with enrollment numbers, filters, and pagination."""
    query = select(Student)

    if status:
        query = query.where(Student.status == status.lower())
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.where(
            (Student.first_name.ilike(s))
            | (Student.last_name.ilike(s))
            | (Student.student_code.ilike(s))
            | (Student.enrollment_number.ilike(s))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0

    students = db.execute(
        query.order_by(Student.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    return PaginatedStudentsResponse(
        items=[StudentResponse.model_validate(st) for st in students],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin Details page: get single student record by internal ID."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentResponse.model_validate(student)


@router.patch("/{student_id}", response_model=StudentDetailResponse)
def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdatePayload,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin Edit Student: updates student personal details and handles transfer preserving history."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    ip = get_client_ip(request)

    # 1. Update personal details
    if payload.first_name is not None:
        student.first_name = payload.first_name.strip()
    if payload.middle_name is not None:
        student.middle_name = payload.middle_name.strip() or None
    if payload.last_name is not None:
        student.last_name = payload.last_name.strip()
    if payload.dob is not None:
        student.dob = payload.dob
    if payload.gender is not None:
        student.gender = payload.gender
    if payload.phone is not None:
        student.phone = payload.phone.strip() or None
    if payload.alternate_phone is not None:
        student.alternate_phone = payload.alternate_phone.strip() or None
    if payload.department is not None:
        student.department = payload.department.strip()
    if payload.address is not None:
        student.address = payload.address.strip() or None
    if payload.city is not None:
        student.city = payload.city.strip() or None
    if payload.state is not None:
        student.state = payload.state.strip() or None
    if payload.country is not None:
        student.country = payload.country.strip() or None
    if payload.postal_code is not None:
        student.postal_code = payload.postal_code.strip() or None
    if payload.previous_school_name is not None:
        student.previous_school_name = payload.previous_school_name.strip() or None
    if payload.previous_school_details is not None:
        student.previous_school_details = payload.previous_school_details.strip() or None
    if payload.admission_date is not None:
        student.admission_date = payload.admission_date
    if payload.guardian_name is not None:
        student.guardian_name = payload.guardian_name.strip() or None
    if payload.guardian_phone is not None:
        student.guardian_phone = payload.guardian_phone.strip() or None
    if payload.guardian_email is not None:
        student.guardian_email = payload.guardian_email
    if payload.status is not None:
        student.status = payload.status

    # 2. Check if enrollment transfer is requested
    if payload.target_section_id:
        from app.schemas.grade_section import StudentTransferPayload
        transfer_payload = StudentTransferPayload(
            target_section_id=payload.target_section_id,
            target_grade_id=payload.target_grade_id,
            reason=payload.transfer_reason or "Admin updated student enrollment",
        )
        enrollment_service.transfer_student(
            student_id=student.id,
            payload=transfer_payload,
            actor_user_id=current_user.id,
            ip=ip,
            db=db,
        )

    db.commit()
    db.refresh(student)

    log_action(
        db,
        action="student_updated",
        entity_type="student",
        actor_user_id=current_user.id,
        entity_id=str(student.id),
        metadata={"student_id": str(student.id)},
        ip=ip,
    )

    return get_student_profile_admin(student_id=student.id, current_user=current_user, db=db)


@router.get("/{student_id}/profile", response_model=StudentDetailResponse)
def get_student_profile_admin(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin Student Profile view: includes active enrollment, academic year, grade, section, and class teacher."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.get(User, student.user_id)

    # Fetch active academic enrollment
    active_enrollment = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        ).order_by(StudentEnrollment.created_at.desc())
    ).scalar_one_or_none()

    cur_year = None
    cur_grade = None
    cur_sec = None
    teacher_name = None

    if active_enrollment:
        if active_enrollment.academic_year_id:
            y = db.get(AcademicYear, active_enrollment.academic_year_id)
            cur_year = y.name if y else None
        if active_enrollment.grade_id:
            g = db.get(Grade, active_enrollment.grade_id)
            cur_grade = g.name if g else None
        if active_enrollment.section_id:
            s = db.get(Section, active_enrollment.section_id)
            if s:
                cur_sec = s.name
                # Check for class teacher assignment
                if s.teacher_assignments:
                    for ta in s.teacher_assignments:
                        if getattr(ta, "role", "") == "class_teacher" and ta.teacher:
                            teacher_name = f"{ta.teacher.first_name} {ta.teacher.last_name}"
                            break

    return StudentDetailResponse(
        id=student.id,
        student_code=student.student_code,
        enrollment_number=student.enrollment_number,
        user_id=student.user_id,
        first_name=student.first_name,
        last_name=student.last_name,
        dob=student.dob,
        class_name=student.class_name,
        section=student.section,
        department=student.department,
        admission_date=student.admission_date,
        guardian_name=student.guardian_name,
        guardian_phone=student.guardian_phone,
        guardian_email=student.guardian_email,
        status=student.status,
        created_at=student.created_at,
        email=user.email if user else None,
        user_status=user.status if user else None,
        current_academic_year=cur_year,
        current_grade=cur_grade or student.class_name,
        current_section=cur_sec or student.section,
        class_teacher_name=teacher_name,
    )


@router.post("/{student_id}/enroll", response_model=StudentEnrollmentHistoryItem)
def enroll_student(
    student_id: uuid.UUID,
    payload: StudentEnrollPayload,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Enroll student into an active Grade and Section for an academic year."""
    ip = get_client_ip(request)
    return enrollment_service.enroll_student(student_id, payload, current_user.id, ip, db)


@router.post("/{student_id}/transfer", response_model=StudentEnrollmentHistoryItem)
def transfer_student(
    student_id: uuid.UUID,
    payload: StudentTransferPayload,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Transfer student to another section, preserving complete enrollment history."""
    ip = get_client_ip(request)
    return enrollment_service.transfer_student(student_id, payload, current_user.id, ip, db)


@router.post("/{student_id}/promote", response_model=StudentEnrollmentHistoryItem)
def promote_student(
    student_id: uuid.UUID,
    payload: StudentPromotePayload,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Promote student to the next academic grade and section."""
    ip = get_client_ip(request)
    return enrollment_service.promote_student(student_id, payload, current_user.id, ip, db)


@router.get("/{student_id}/enrollments", response_model=list[StudentEnrollmentHistoryItem])
def get_student_enrollments(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """View complete academic enrollment history of a student."""
    return enrollment_service.get_student_enrollments(student_id, db)


@router.get("/{student_id}/details", response_model=ComprehensiveStudentDetailResponse)
def get_student_details(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin centralized 360-degree view of all student records across all domains."""
    return get_student_comprehensive_details(student_id, db)

