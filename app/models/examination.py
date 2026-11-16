import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import AcademicYear, Grade, Section
    from app.models.classroom import Subject
    from app.models.student import Student
    from app.models.user import User


class ExamType(str, enum.Enum):
    UNIT_TEST = "UNIT_TEST"
    MID_TERM = "MID_TERM"
    FINAL = "FINAL"
    QUARTERLY = "QUARTERLY"
    PRELIMINARY = "PRELIMINARY"
    PRACTICAL = "PRACTICAL"


class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MarksStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    PUBLISHED = "PUBLISHED"


class ResultStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    ABSENT = "ABSENT"
    WITHHELD = "WITHHELD"


class GradingScale(TimestampMixin, Base):
    __tablename__ = "grading_scales"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "Default 10-Point Scale"
    min_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    max_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g., "A+", "A", "B"
    grade_point: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_passing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    __table_args__ = (
        UniqueConstraint("name", "grade", name="uq_grading_scale_name_grade"),
        Index("ix_grading_scales_name", "name"),
    )

    def __repr__(self) -> str:
        return f"<GradingScale {self.name}: {self.grade} ({self.min_percentage}-{self.max_percentage}%)>"


class Examination(TimestampMixin, Base):
    __tablename__ = "examinations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    exam_type: Mapped[str] = mapped_column(String(50), nullable=False, default=ExamType.UNIT_TEST.value)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False,
    )
    term: Mapped[str] = mapped_column(String(50), nullable=False, default="Term 1")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=ExamStatus.DRAFT.value)
    grading_scale_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Default 10-Point Scale")

    # Relationships
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    schedules: Mapped[list["ExaminationSchedule"]] = relationship(
        "ExaminationSchedule", back_populates="examination", cascade="all, delete-orphan",
    )
    results: Mapped[list["StudentExamResult"]] = relationship(
        "StudentExamResult", back_populates="examination", cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_examinations_year_term", "academic_year_id", "term"),
        Index("ix_examinations_status", "status"),
        Index("ix_examinations_dates", "start_date", "end_date"),
    )

    def __repr__(self) -> str:
        return f"<Examination {self.name} ({self.exam_type}, {self.term})>"


class ExaminationSchedule(TimestampMixin, Base):
    __tablename__ = "examination_schedules"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    examination_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False,
    )
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False,
    )
    exam_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    start_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    end_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    max_marks: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    pass_marks: Mapped[float] = mapped_column(Float, nullable=False, default=35.0)
    room_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=ExamStatus.SCHEDULED.value)

    # Relationships
    examination: Mapped["Examination"] = relationship("Examination", back_populates="schedules")
    grade: Mapped["Grade"] = relationship("Grade")
    section: Mapped["Section"] = relationship("Section")
    subject: Mapped["Subject"] = relationship("Subject")
    marks: Mapped[list["StudentExamMark"]] = relationship(
        "StudentExamMark", back_populates="schedule", cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "examination_id", "section_id", "subject_id",
            name="uq_exam_schedule_section_subject",
        ),
        Index("ix_exam_schedules_exam", "examination_id"),
        Index("ix_exam_schedules_section", "section_id"),
        Index("ix_exam_schedules_grade", "grade_id"),
        Index("ix_exam_schedules_date", "exam_date"),
    )

    def __repr__(self) -> str:
        return f"<ExaminationSchedule exam={self.examination_id} section={self.section_id} subject={self.subject_id} date={self.exam_date}>"


class StudentExamMark(TimestampMixin, Base):
    __tablename__ = "student_exam_marks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    schedule_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("examination_schedules.id", ondelete="CASCADE"), nullable=False,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    marks_obtained: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_absent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    grade: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=MarksStatus.DRAFT.value)

    # Relationships
    schedule: Mapped["ExaminationSchedule"] = relationship("ExaminationSchedule", back_populates="marks")
    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        UniqueConstraint("schedule_id", "student_id", name="uq_student_exam_mark_schedule"),
        Index("ix_student_exam_marks_schedule", "schedule_id"),
        Index("ix_student_exam_marks_student", "student_id"),
        Index("ix_student_exam_marks_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<StudentExamMark student={self.student_id} marks={self.marks_obtained} absent={self.is_absent}>"


class StudentExamResult(TimestampMixin, Base):
    __tablename__ = "student_exam_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    examination_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="CASCADE"), nullable=False,
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False,
    )
    total_max_marks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_obtained_marks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    overall_grade: Mapped[str] = mapped_column(String(10), nullable=False, default="F")
    overall_result: Mapped[str] = mapped_column(String(20), nullable=False, default=ResultStatus.PASS.value)
    teacher_remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=MarksStatus.DRAFT.value)
    published_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    # Relationships
    examination: Mapped["Examination"] = relationship("Examination", back_populates="results")
    student: Mapped["Student"] = relationship("Student")
    grade: Mapped["Grade"] = relationship("Grade")
    section: Mapped["Section"] = relationship("Section")
    published_by: Mapped["User | None"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("examination_id", "student_id", name="uq_student_exam_result_student"),
        Index("ix_student_exam_results_exam", "examination_id"),
        Index("ix_student_exam_results_student", "student_id"),
        Index("ix_student_exam_results_section", "section_id"),
        Index("ix_student_exam_results_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<StudentExamResult exam={self.examination_id} student={self.student_id} pct={self.percentage}% grade={self.overall_grade}>"


class ExaminationNotification(TimestampMixin, Base):
    __tablename__ = "examination_notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True,
    )
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SCHEDULED")
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    user: Mapped["User | None"] = relationship("User")
    student: Mapped["Student | None"] = relationship("Student")

    __table_args__ = (
        Index("ix_exam_notifs_user", "user_id"),
        Index("ix_exam_notifs_student", "student_id"),
        Index("ix_exam_notifs_read", "is_read"),
    )

    def __repr__(self) -> str:
        return f"<ExaminationNotification user={self.user_id} title={self.title}>"

