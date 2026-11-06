import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
    from app.models.classroom import Class, Subject
    from app.models.parent import Parent
    from app.models.student import Student
    from app.models.teacher import Teacher
    from app.models.user import User


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class AttendanceSession(TimestampMixin, Base):
    __tablename__ = "attendance_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=True
    )
    grade_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="RESTRICT"), nullable=True
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="RESTRICT"), nullable=True
    )
    class_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("classes.id", ondelete="CASCADE"), nullable=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    period: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    submission_status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")
    taken_by_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    marked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    locked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    academic_year: Mapped["AcademicYear | None"] = relationship("AcademicYear")
    grade: Mapped["Grade | None"] = relationship("Grade")
    section: Mapped["Section | None"] = relationship("Section")
    classroom: Mapped["Class | None"] = relationship("Class")
    subject: Mapped["Subject | None"] = relationship("Subject")
    teacher: Mapped["Teacher | None"] = relationship("Teacher")
    marked_by: Mapped["User | None"] = relationship("User")

    records: Mapped[list["AttendanceRecord"]] = relationship(
        "AttendanceRecord", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_attendance_sessions_section_date", "section_id", "date"),
        Index("ix_attendance_sessions_grade", "grade_id"),
        Index("ix_attendance_sessions_year", "academic_year_id"),
        Index("ix_attendance_sessions_teacher", "taken_by_teacher_id"),
    )

    def __repr__(self) -> str:
        return f"<AttendanceSession section={self.section_id} date={self.date} period={self.period}>"


class AttendanceRecord(TimestampMixin, Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    enrollment_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("student_enrollments.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PRESENT")
    remark: Mapped[str | None] = mapped_column(String(255), nullable=True)
    marked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Backward compatibility fields
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    session: Mapped["AttendanceSession | None"] = relationship("AttendanceSession", back_populates="records")
    student: Mapped["Student"] = relationship("Student")
    enrollment: Mapped["StudentEnrollment | None"] = relationship("StudentEnrollment")
    marked_by: Mapped["User | None"] = relationship("User")
    audit_history: Mapped[list["AttendanceAuditHistory"]] = relationship(
        "AttendanceAuditHistory", back_populates="record", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_record_session_student"),
        Index("ix_attendance_records_student", "student_id"),
        Index("ix_attendance_records_session", "session_id"),
    )

    def __repr__(self) -> str:
        return f"<AttendanceRecord session={self.session_id} student={self.student_id} status={self.status}>"


class AttendanceAuditHistory(Base):
    __tablename__ = "attendance_audit_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    record_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    previous_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    modified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: dt.datetime.now(dt.timezone.utc)
    )

    # Relationships
    record: Mapped["AttendanceRecord"] = relationship("AttendanceRecord", back_populates="audit_history")
    session: Mapped["AttendanceSession"] = relationship("AttendanceSession")
    student: Mapped["Student"] = relationship("Student")
    modified_by: Mapped["User | None"] = relationship("User")

    __table_args__ = (
        Index("ix_attendance_audit_record", "record_id"),
        Index("ix_attendance_audit_session", "session_id"),
        Index("ix_attendance_audit_student", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<AttendanceAuditHistory record={self.record_id} {self.previous_status}->{self.new_status}>"


class AbsenceNotificationLog(TimestampMixin, Base):
    __tablename__ = "absence_notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("parents.id", ondelete="SET NULL"), nullable=True
    )
    attendance_record_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    channel: Mapped[str] = mapped_column(String(30), nullable=False, default="IN_APP")  # IN_APP, SMS, EMAIL
    recipient: Mapped[str | None] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="SENT"
    )  # SENT, FAILED, SUPPRESSED_HOLIDAY, SUPPRESSED_NO_CONTACT
    message: Mapped[str] = mapped_column(Text, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: dt.datetime.now(dt.timezone.utc)
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    parent: Mapped["Parent | None"] = relationship("Parent")
    attendance_record: Mapped["AttendanceRecord"] = relationship("AttendanceRecord")
    session: Mapped["AttendanceSession"] = relationship("AttendanceSession")

    __table_args__ = (
        Index("ix_absence_notif_student", "student_id"),
        Index("ix_absence_notif_date", "date"),
        Index("ix_absence_notif_session", "session_id"),
        Index("ix_absence_notif_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<AbsenceNotificationLog student={self.student_id} date={self.date} status={self.status}>"

