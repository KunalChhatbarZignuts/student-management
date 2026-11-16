import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import AcademicYear, Grade, Section
    from app.models.student import Student
    from app.models.teacher import Teacher
    from app.models.user import User


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class LeaveSubmissionRole(str, enum.Enum):
    STUDENT = "student"
    PARENT = "parent"


class StudentLeaveApplication(TimestampMixin, Base):
    """Student leave application submitted by student or parent, reviewed by assigned Class Teacher."""

    __tablename__ = "student_leave_applications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    submitted_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    submission_role: Mapped[str] = mapped_column(
        String(20), nullable=False, default=LeaveSubmissionRole.STUDENT.value,
    )
    academic_year_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True,
    )
    grade_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="SET NULL"), nullable=True,
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True,
    )
    class_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True,
    )
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    days_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=LeaveStatus.PENDING.value,
    )
    teacher_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True,
    )
    decided_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    submitted_by: Mapped["User"] = relationship("User", foreign_keys=[submitted_by_user_id])
    academic_year: Mapped["AcademicYear | None"] = relationship("AcademicYear")
    grade: Mapped["Grade | None"] = relationship("Grade")
    section: Mapped["Section | None"] = relationship("Section")
    class_teacher: Mapped["Teacher | None"] = relationship("Teacher", foreign_keys=[class_teacher_id])
    decided_by_teacher: Mapped["Teacher | None"] = relationship("Teacher", foreign_keys=[decided_by_teacher_id])

    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="chk_leave_dates_valid"),
        Index("ix_leave_student_status", "student_id", "status"),
        Index("ix_leave_class_teacher_status", "class_teacher_id", "status"),
        Index("ix_leave_section_status", "section_id", "status"),
        Index("ix_leave_dates", "start_date", "end_date"),
    )

    def __repr__(self) -> str:
        return f"<StudentLeaveApplication student={self.student_id} from={self.start_date} to={self.end_date} status={self.status}>"

