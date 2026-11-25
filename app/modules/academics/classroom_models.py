import datetime as dt
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Index, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.academics.structure_models import Section
    from app.modules.teachers.models import Teacher


class Subject(TimestampMixin, Base):
    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    department: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    teacher_assignments: Mapped[list["TeacherAssignment"]] = relationship(
        "TeacherAssignment", back_populates="subject",
    )

    __table_args__ = (
        Index("ix_subjects_code", "code"),
    )

    def __repr__(self) -> str:
        return f"<Subject {self.code} {self.name}>"


class TeacherAssignment(TimestampMixin, Base):
    __tablename__ = "teacher_assignments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False,
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="CASCADE"), nullable=True,
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True,
    )
    assignment_type: Mapped[str] = mapped_column(String(30), nullable=False, default="CLASS_TEACHER")
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False, default=dt.date.today)
    end_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_class_teacher: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False, default="2026-2027")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher")
    section: Mapped["Section | None"] = relationship("Section", back_populates="teacher_assignments")
    subject: Mapped["Subject | None"] = relationship("Subject", back_populates="teacher_assignments")

    __table_args__ = (
        UniqueConstraint(
            "teacher_id", "section_id", "subject_id", "academic_year",
            name="uq_teacher_assignment_section",
        ),
        Index("ix_teacher_assignments_teacher", "teacher_id"),
        Index("ix_teacher_assignments_section", "section_id"),
    )

    def __repr__(self) -> str:
        return f"<TeacherAssignment teacher={self.teacher_id} section={self.section_id} subject={self.subject_id}>"

