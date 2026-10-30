import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.classroom import Class, Subject
    from app.models.student import Student
    from app.models.teacher import Teacher


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class AttendanceSession(TimestampMixin, Base):
    __tablename__ = "attendance_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False,
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    period: Mapped[int] = mapped_column(Integer, nullable=False)
    taken_by_teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True,
    )
    locked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    classroom: Mapped["Class"] = relationship("Class")
    subject: Mapped["Subject"] = relationship("Subject")
    teacher: Mapped["Teacher"] = relationship("Teacher")
    records: Mapped[list["AttendanceRecord"]] = relationship(
        "AttendanceRecord", back_populates="session", cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", "date", "period", name="uq_attendance_session_slot"),
        Index("ix_attendance_sessions_class_date", "class_id", "date"),
        Index("ix_attendance_sessions_teacher", "taken_by_teacher_id"),
    )

    def __repr__(self) -> str:
        return f"<AttendanceSession class={self.class_id} subject={self.subject_id} date={self.date} period={self.period}>"


class AttendanceRecord(TimestampMixin, Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PRESENT")
    remark: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Backward compatibility fields
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    session: Mapped["AttendanceSession | None"] = relationship("AttendanceSession", back_populates="records")
    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_record_session_student"),
        Index("ix_attendance_records_student", "student_id"),
        Index("ix_attendance_records_session", "session_id"),
    )

    def __repr__(self) -> str:
        return f"<AttendanceRecord session={self.session_id} student={self.student_id} status={self.status}>"
