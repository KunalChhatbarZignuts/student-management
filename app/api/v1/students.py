from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.academic import AttendanceRecord, FeeInvoice, StudentMark
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.academic import (
    AttendanceRecordRead,
    AttendanceSummaryResponse,
    FeeInvoiceRead,
    StudentMarkRead,
)
from app.schemas.student import StudentResponse

router = APIRouter(prefix="/students", tags=["Students"])


def _get_student_for_user(user_id, db: Session) -> Student:
    student = db.execute(select(Student).where(Student.user_id == user_id)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile record not found",
        )
    return student


@router.get("/me", response_model=StudentResponse)
def get_student_profile(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Student endpoint: strictly returns only the authenticated student's own record."""
    student = _get_student_for_user(current_user.id, db)
    return StudentResponse.model_validate(student)


@router.get("/me/attendance", response_model=AttendanceSummaryResponse)
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

    total = len(records)
    attended = len([r for r in records if r.status in ("present", "excused")])
    excused = len([r for r in records if r.status == "excused"])
    pct = round((attended / total * 100), 1) if total > 0 else 100.0

    return AttendanceSummaryResponse(
        total_classes=total,
        attended_classes=attended,
        percentage=pct,
        excused_absences=excused,
        records=[AttendanceRecordRead.model_validate(r) for r in records],
    )


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
