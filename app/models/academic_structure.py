import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Time, UniqueConstraint, Uuid, text
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
    working_days: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default="Monday,Tuesday,Wednesday,Thursday,Friday"
    )
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
    name: Mapped[str | None] = mapped_column(String(50), nullable=True)
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
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "G10"
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # e.g. 10
    shift_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    coordinator_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    shift: Mapped["Shift | None"] = relationship("Shift", back_populates="grades")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear", back_populates="grades")
    coordinator: Mapped["Teacher | None"] = relationship("Teacher", foreign_keys=[coordinator_teacher_id])
    sections: Mapped[list["Section"]] = relationship("Section", back_populates="grade", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("academic_year_id", "name", name="uq_grade_year_name"),
        Index("ix_grades_level", "level"),
        Index("ix_grades_code", "code"),
        Index("ix_grades_coordinator", "coordinator_teacher_id"),
    )

    def __repr__(self) -> str:
        return f"<Grade {self.name} (code={self.code})>"


class Section(TimestampMixin, Base):
    __tablename__ = "sections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "10-A", "Section A"
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "SEC-10A"
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    class_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True, default=30)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    grade: Mapped["Grade"] = relationship("Grade", back_populates="sections")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    teacher_assignments: Mapped[list["TeacherAssignment"]] = relationship("TeacherAssignment", back_populates="section")
    enrollments: Mapped[list["StudentEnrollment"]] = relationship(
        "StudentEnrollment", back_populates="section", cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("grade_id", "name", "academic_year_id", name="uq_section_grade_name_year"),
        Index("ix_sections_grade", "grade_id"),
        Index("ix_sections_year", "academic_year_id"),
    )

    def __repr__(self) -> str:
        return f"<Section {self.name} (grade={self.grade_id})>"


class StudentEnrollment(TimestampMixin, Base):
    __tablename__ = "student_enrollments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    grade_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="CASCADE"), nullable=True,
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="CASCADE"), nullable=True,
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    roll_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    enrollment_date: Mapped[dt.date] = mapped_column(Date, nullable=False, default=dt.date.today)
    joined_on: Mapped[dt.date] = mapped_column(Date, nullable=False, default=dt.date.today)
    left_on: Mapped[dt.date | None] = mapped_column(Date, nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    grade: Mapped["Grade | None"] = relationship("Grade")
    section: Mapped["Section | None"] = relationship("Section", back_populates="enrollments")
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
        Index("ix_student_enrollments_section", "section_id"),
        Index("ix_student_enrollments_grade", "grade_id"),
        Index("ix_student_enrollments_student", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<StudentEnrollment student={self.student_id} section={self.section_id} status={self.status}>"


class TeacherSubject(TimestampMixin, Base):
    __tablename__ = "teacher_subjects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False,
    )
    academic_year_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=True,
    )
    grade_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="SET NULL"), nullable=True,
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher")
    subject: Mapped["Subject"] = relationship("Subject")
    academic_year: Mapped["AcademicYear | None"] = relationship("AcademicYear")
    grade: Mapped["Grade | None"] = relationship("Grade")
    section: Mapped["Section | None"] = relationship("Section")

    __table_args__ = (
        UniqueConstraint(
            "teacher_id",
            "subject_id",
            "academic_year_id",
            "grade_id",
            "section_id",
            name="uq_teacher_subject_academic_scope",
        ),
        Index("ix_teacher_subjects_teacher", "teacher_id"),
        Index("ix_teacher_subjects_subject", "subject_id"),
        Index("ix_teacher_subjects_academic_year", "academic_year_id"),
        Index("ix_teacher_subjects_grade", "grade_id"),
        Index("ix_teacher_subjects_section", "section_id"),
    )

    def __repr__(self) -> str:
        return f"<TeacherSubject teacher={self.teacher_id} subject={self.subject_id} grade={self.grade_id} section={self.section_id}>"


class Timetable(TimestampMixin, Base):
    __tablename__ = "timetables"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False,
    )
    shift_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("shifts.id", ondelete="RESTRICT"), nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")  # draft, published, archived
    published_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    # Relationships
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    grade: Mapped["Grade"] = relationship("Grade")
    section: Mapped["Section"] = relationship("Section")
    shift: Mapped["Shift"] = relationship("Shift")
    entries: Mapped[list["TimetableEntry"]] = relationship(
        "TimetableEntry", back_populates="timetable", cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("academic_year_id", "section_id", "version", name="uq_timetable_year_section_version"),
        Index("ix_timetables_section_status", "section_id", "status"),
        Index("ix_timetables_grade", "grade_id"),
        Index("ix_timetables_year", "academic_year_id"),
    )

    def __repr__(self) -> str:
        return f"<Timetable section={self.section_id} v{self.version} ({self.status})>"


class TimetableEntry(TimestampMixin, Base):
    __tablename__ = "timetable_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    timetable_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("timetables.id", ondelete="CASCADE"), nullable=False,
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 = Monday, ..., 6 = Saturday
    period_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("periods.id", ondelete="RESTRICT"), nullable=False,
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=True,
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True,
    )
    room_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    timetable: Mapped["Timetable"] = relationship("Timetable", back_populates="entries")
    period: Mapped["Period"] = relationship("Period")
    subject: Mapped["Subject | None"] = relationship("Subject")
    teacher: Mapped["Teacher | None"] = relationship("Teacher")

    __table_args__ = (
        UniqueConstraint("timetable_id", "day_of_week", "period_id", name="uq_timetable_slot"),
        Index("ix_timetable_entries_timetable", "timetable_id"),
        Index("ix_timetable_entries_teacher", "teacher_id"),
        Index("ix_timetable_entries_day_period", "day_of_week", "period_id"),
    )

    def __repr__(self) -> str:
        return f"<TimetableEntry day={self.day_of_week} period={self.period_id} subject={self.subject_id} teacher={self.teacher_id}>"


