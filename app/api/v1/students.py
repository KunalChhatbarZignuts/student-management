from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.academic import AttendanceRecord, FeeInvoice, StudentMark
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.academic import (
    AttendanceRecordRead,
    AttendanceSummaryResponse,
    FeeInvoiceRead,
    StudentMarkRead,
)
from app.schemas.grade_section import StudentEnrollmentHistoryItem
from app.schemas.student import StudentDetailResponse, StudentResponse
from app.services.enrollment_service import get_student_enrollments

router = APIRouter(prefix="", tags=["Students"])


def _get_student_for_user(user_id, db: Session) -> Student:
    student = db.execute(select(Student).where(Student.user_id == user_id)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile record not found",
        )
    return student


@router.get("/students/me", response_model=StudentResponse)
@router.get("/student/me", response_model=StudentResponse)
def get_student_profile(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student endpoint: strictly returns only the authenticated student's own record."""
    student = _get_student_for_user(current_user.id, db)
    return StudentResponse.model_validate(student)


@router.get("/students/profile", response_model=StudentDetailResponse)
@router.get("/students/me/profile", response_model=StudentDetailResponse)
@router.get("/student/profile", response_model=StudentDetailResponse)
def get_student_portal_profile(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student portal profile: returns student details, enrollment number, academic year, grade, section, class teacher."""
    student = _get_student_for_user(current_user.id, db)

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
        current_grade_id=student.current_grade_id,
        current_section_id=student.current_section_id,
        blood_group=student.blood_group,
        allergies=student.allergies,
        medical_conditions=student.medical_conditions,
        emergency_contact_name=student.emergency_contact_name,
        emergency_contact_phone=student.emergency_contact_phone,
        authorized_pickup_info=student.authorized_pickup_info,
        created_at=student.created_at,
        email=current_user.email,
        user_status=current_user.status,
        current_academic_year=cur_year,
        current_grade=cur_grade or student.class_name,
        current_section=cur_sec or student.section,
        class_teacher_name=teacher_name,
    )


@router.get("/students/enrollments", response_model=list[StudentEnrollmentHistoryItem])
@router.get("/students/me/enrollments", response_model=list[StudentEnrollmentHistoryItem])
@router.get("/student/enrollments", response_model=list[StudentEnrollmentHistoryItem])
def get_my_enrollments(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student portal endpoint: returns authenticated student's full enrollment history."""
    student = _get_student_for_user(current_user.id, db)
    return get_student_enrollments(student.id, db)


@router.get("/students/me/attendance", response_model=AttendanceSummaryResponse)
@router.get("/student/me/attendance", response_model=AttendanceSummaryResponse)
def get_my_attendance(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student endpoint: returns attendance percentage and daily logs."""
    student = _get_student_for_user(current_user.id, db)
    records = (
        db.execute(
            select(AttendanceRecord)
            .where(AttendanceRecord.student_id == student.id)
            .order_by(AttendanceRecord.date.desc())
        )
        .scalars()
        .all()
    )

    records_list = []
    attended = 0
    excused = 0
    for r in records:
        rec_data = AttendanceRecordRead.model_validate(r)
        if rec_data.date is None and r.session_id and r.session:
            rec_data.date = r.session.date
        st_lower = r.status.lower()
        if st_lower in ("present", "excused", "late"):
            attended += 1
        if st_lower == "excused":
            excused += 1
        records_list.append(rec_data)

    total = len(records_list)
    pct = round((attended / total * 100), 1) if total > 0 else 100.0

    return AttendanceSummaryResponse(
        total_classes=total,
        attended_classes=attended,
        percentage=pct,
        excused_absences=excused,
        records=records_list,
    )


@router.get("/students/me/marks", response_model=list[StudentMarkRead])
@router.get("/student/me/marks", response_model=list[StudentMarkRead])
@router.get("/students/marks", response_model=list[StudentMarkRead])
@router.get("/student/marks", response_model=list[StudentMarkRead])
@router.get("/me/marks", response_model=list[StudentMarkRead])
def get_my_marks(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student endpoint: returns evaluation marks and grades."""
    student = _get_student_for_user(current_user.id, db)
    marks = (
        db.execute(
            select(StudentMark)
            .where(StudentMark.student_id == student.id)
            .order_by(StudentMark.subject.asc())
        )
        .scalars()
        .all()
    )
    return [StudentMarkRead.model_validate(m) for m in marks]


@router.get("/students/me/fees", response_model=list[FeeInvoiceRead])
@router.get("/student/me/fees", response_model=list[FeeInvoiceRead])
@router.get("/students/fees", response_model=list[FeeInvoiceRead])
@router.get("/student/fees", response_model=list[FeeInvoiceRead])
@router.get("/me/fees", response_model=list[FeeInvoiceRead])
def get_my_fees(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student endpoint: returns billing invoices and tuition fee status."""
    student = _get_student_for_user(current_user.id, db)
    invoices = (
        db.execute(
            select(FeeInvoice)
            .where(FeeInvoice.student_id == student.id)
            .order_by(FeeInvoice.due_date.asc())
        )
        .scalars()
        .all()
    )
    return [FeeInvoiceRead.model_validate(inv) for inv in invoices]
