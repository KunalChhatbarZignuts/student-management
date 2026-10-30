import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import ClassGroup
    from app.models.teacher import Teacher


class Class(TimestampMixin, Base):
    __tablename__ = "classes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    section: Mapped[str] = mapped_column(String(20), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False, default="2026-2027")
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    teacher_assignments: Mapped[list["TeacherAssignment"]] = relationship(
        "TeacherAssignment", back_populates="classroom",
    )

    __table_args__ = (
        UniqueConstraint("name", "section", "academic_year", name="uq_class_name_section_year"),
        Index("ix_classes_department", "department"),
        Index("ix_classes_name_section", "name", "section"),
    )

    def __repr__(self) -> str:
        return f"<Class {self.name}-{self.section} ({self.academic_year})>"


class Subject(TimestampMixin, Base):
    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
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
    class_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("classes.id", ondelete="CASCADE"), nullable=True,
    )
    class_group_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False,
    )
    is_class_teacher: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False, default="2026-2027")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher")
    classroom: Mapped["Class | None"] = relationship("Class", back_populates="teacher_assignments")
    class_group: Mapped["ClassGroup | None"] = relationship("ClassGroup", back_populates="teacher_assignments")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="teacher_assignments")

    __table_args__ = (
        UniqueConstraint(
            "teacher_id", "class_id", "subject_id", "academic_year",
            name="uq_teacher_assignment",
        ),
        Index("ix_teacher_assignments_teacher", "teacher_id"),
        Index("ix_teacher_assignments_class", "class_id"),
    )

    def __repr__(self) -> str:
        return f"<TeacherAssignment teacher={self.teacher_id} class={self.class_id} subject={self.subject_id}>"

