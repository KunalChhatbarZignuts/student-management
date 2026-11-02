import datetime as dt
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import AcademicYear, Grade, Section
    from app.models.student import Student
    from app.models.user import User


class Admission(TimestampMixin, Base):
    __tablename__ = "admissions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    admission_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    enrollment_number: Mapped[str] = mapped_column(String(30), nullable=False)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="RESTRICT"), nullable=False,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="RESTRICT"), nullable=False,
    )
    admission_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    student_account_created: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    grade: Mapped["Grade"] = relationship("Grade")
    section: Mapped["Section"] = relationship("Section")
    created_by: Mapped["User | None"] = relationship("User", foreign_keys=[created_by_user_id])

    __table_args__ = (
        UniqueConstraint("admission_number", name="uq_admissions_admission_number"),
        Index("ix_admissions_admission_number", "admission_number"),
        Index("ix_admissions_enrollment_number", "enrollment_number"),
        Index("ix_admissions_student_id", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<Admission {self.admission_number} student={self.student_id}>"

