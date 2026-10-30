import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Index, Integer, String, Time, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.classroom import Subject, TeacherAssignment
    from app.models.student import Student
    from app.models.teacher import Teacher


class EnrollmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    TRANSFERRED = "TRANSFERRED"
    LEFT = "LEFT"


class AcademicYear(TimestampMixin, Base):
    __tablename__ = "academic_years"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g., "2026-2027"
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    grades: Mapped[list["Grade"]] = relationship("Grade", back_populates="academic_year")
    class_groups: Mapped[list["ClassGroup"]] = relationship("ClassGroup", back_populates="academic_year")

    __table_args__ = (
        Index("ix_academic_years_current", "is_current"),
    )

    def __repr__(self) -> str:
        return f"<AcademicYear {self.name} (current={self.is_current})>"


class Shift(TimestampMixin, Base):
    __tablename__ = "shifts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g., "Morning Shift"
    start_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    periods: Mapped[list["Period"]] = relationship(
        "Period", back_populates="shift", cascade="all, delete-orphan", order_by="Period.number",
    )
    grades: Mapped[list["Grade"]] = relationship("Grade", back_populates="shift")

    def __repr__(self) -> str:
        return f"<Shift {self.name} ({self.start_time}-{self.end_time})>"


class Period(TimestampMixin, Base):
    __tablename__ = "periods"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    shift_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False,
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    is_break: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    shift: Mapped["Shift"] = relationship("Shift", back_populates="periods")

    __table_args__ = (
        UniqueConstraint("shift_id", "number", name="uq_shift_period_number"),
        Index("ix_periods_shift", "shift_id"),
    )

    def __repr__(self) -> str:
        return f"<Period {self.number} (shift={self.shift_id}, break={self.is_break})>"


class Grade(TimestampMixin, Base):
    __tablename__ = "grades"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "Grade 10"
    level: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g. 10
    shift_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("shifts.id", ondelete="RESTRICT"), nullable=False,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    shift: Mapped["Shift"] = relationship("Shift", back_populates="grades")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", back_populates="grades")
    class_groups: Mapped[list["ClassGroup"]] = relationship("ClassGroup", back_populates="grade")
    grade_subjects: Mapped[list["GradeSubject"]] = relationship(
        "GradeSubject", back_populates="grade", cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("academic_year_id", "name", name="uq_grade_year_name"),
        Index("ix_grades_level", "level"),
    )

    def __repr__(self) -> str:
        return f"<Grade {self.name} (level={self.level})>"


class GradeSubject(TimestampMixin, Base):
    __tablename__ = "grade_subjects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False,
    )
    periods_per_week: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    is_optional: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    grade: Mapped["Grade"] = relationship("Grade", back_populates="grade_subjects")
    subject: Mapped["Subject"] = relationship("Subject")

    __table_args__ = (
        UniqueConstraint("grade_id", "subject_id", name="uq_grade_subject"),
        Index("ix_grade_subjects_grade", "grade_id"),
    )

    def __repr__(self) -> str:
        return f"<GradeSubject grade={self.grade_id} subject={self.subject_id} periods={self.periods_per_week}>"


class ClassGroup(TimestampMixin, Base):
    __tablename__ = "class_groups"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "Section A"
    room: Mapped[str] = mapped_column(String(50), nullable=False, default="Room 101")
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    head_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    grade: Mapped["Grade"] = relationship("Grade", back_populates="class_groups")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", back_populates="class_groups")
    head_teacher: Mapped["Teacher | None"] = relationship("Teacher")
    enrollments: Mapped[list["StudentEnrollment"]] = relationship(
        "StudentEnrollment", back_populates="class_group", cascade="all, delete-orphan",
    )
    teacher_assignments: Mapped[list["TeacherAssignment"]] = relationship(
        "TeacherAssignment", back_populates="class_group",
    )

    __table_args__ = (
        UniqueConstraint("grade_id", "name", name="uq_class_group_grade_name"),
        Index("ix_class_groups_grade", "grade_id"),
        Index("ix_class_groups_head_teacher", "head_teacher_id"),
    )

    def __repr__(self) -> str:
        return f"<ClassGroup {self.name} (grade={self.grade_id}, cap={self.capacity})>"


class StudentEnrollment(TimestampMixin, Base):
    __tablename__ = "student_enrollments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    class_group_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    roll_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    joined_on: Mapped[dt.date] = mapped_column(Date, nullable=False, default=dt.date.today)
    left_on: Mapped[dt.date | None] = mapped_column(Date, nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    class_group: Mapped["ClassGroup"] = relationship("ClassGroup", back_populates="enrollments")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")

    __table_args__ = (
        # Partial unique index: A student can have ONE active enrollment per academic year
        Index(
            "uq_student_active_enrollment_per_year",
            "student_id",
            "academic_year_id",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
        ),
        Index("ix_student_enrollments_group", "class_group_id"),
        Index("ix_student_enrollments_student", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<StudentEnrollment student={self.student_id} group={self.class_group_id} status={self.status}>"


class TeacherSubject(TimestampMixin, Base):
    __tablename__ = "teacher_subjects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher")
    subject: Mapped["Subject"] = relationship("Subject")

    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_id", name="uq_teacher_subject"),
        Index("ix_teacher_subjects_teacher", "teacher_id"),
        Index("ix_teacher_subjects_subject", "subject_id"),
    )

    def __repr__(self) -> str:
        return f"<TeacherSubject teacher={self.teacher_id} subject={self.subject_id}>"

