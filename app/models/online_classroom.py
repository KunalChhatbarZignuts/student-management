import enum
import uuid
from datetime import date, datetime, time
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.teacher import Teacher
    from app.models.user import User

# Compatible JSON column for PostgreSQL (JSONB) and fallback for SQLite/tests
JsonType = JSON().with_variant(JSONB, "postgresql")


class OnlineClassStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OnlineClass(TimestampMixin, Base):
    __tablename__ = "online_classes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    room_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    expected_duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default=OnlineClassStatus.SCHEDULED.value, nullable=False, index=True
    )

    # Permission and feature toggles
    is_recording_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_student_mic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_student_cam: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_student_chat: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_student_whiteboard: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    settings: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)

    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher")
    participants: Mapped[list["OnlineClassParticipant"]] = relationship(
        "OnlineClassParticipant", back_populates="online_class", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["OnlineMeetingSession"]] = relationship(
        "OnlineMeetingSession", back_populates="online_class", cascade="all, delete-orphan"
    )
    recordings: Mapped[list["OnlineClassRecording"]] = relationship(
        "OnlineClassRecording", back_populates="online_class", cascade="all, delete-orphan"
    )
    materials: Mapped[list["OnlineClassMaterial"]] = relationship(
        "OnlineClassMaterial", back_populates="online_class", cascade="all, delete-orphan"
    )
    whiteboard_sessions: Mapped[list["OnlineWhiteboardSession"]] = relationship(
        "OnlineWhiteboardSession", back_populates="online_class", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["OnlineClassroomAuditLog"]] = relationship(
        "OnlineClassroomAuditLog", back_populates="online_class", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_online_classes_teacher_status", "teacher_id", "status"),
        Index("ix_online_classes_date_status", "scheduled_date", "status"),
    )

    def __repr__(self) -> str:
        return f"<OnlineClass {self.title} status={self.status} room={self.room_name}>"


class OnlineClassParticipant(TimestampMixin, Base):
    __tablename__ = "online_class_participants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    online_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)

    # Relationships
    online_class: Mapped["OnlineClass"] = relationship("OnlineClass", back_populates="participants")
    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        UniqueConstraint("online_class_id", "student_id", name="uq_online_class_student"),
        Index("ix_online_class_participants_class_student", "online_class_id", "student_id"),
    )


class OnlineMeetingSession(TimestampMixin, Base):
    __tablename__ = "online_meeting_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    online_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    technical_meta: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)

    # Relationships
    online_class: Mapped["OnlineClass"] = relationship("OnlineClass", back_populates="sessions")
    attendees: Mapped[list["OnlineSessionAttendee"]] = relationship(
        "OnlineSessionAttendee", back_populates="session", cascade="all, delete-orphan"
    )
    recordings: Mapped[list["OnlineClassRecording"]] = relationship(
        "OnlineClassRecording", back_populates="session"
    )


class OnlineSessionAttendee(TimestampMixin, Base):
    __tablename__ = "online_session_attendees"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_meeting_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    participant_role: Mapped[str] = mapped_column(String(20), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    connection_status: Mapped[str] = mapped_column(String(20), default="CONNECTED", nullable=False)

    # Relationships
    session: Mapped["OnlineMeetingSession"] = relationship("OnlineMeetingSession", back_populates="attendees")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        Index("ix_session_attendees_session_user", "session_id", "user_id"),
    )


class OnlineClassRecording(TimestampMixin, Base):
    __tablename__ = "online_class_recordings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    online_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("online_meeting_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_bucket: Mapped[str] = mapped_column(String(100), default="recordings", nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    thumbnail_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    processing_status: Mapped[str] = mapped_column(String(30), default="PROCESSING", nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    retention_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    online_class: Mapped["OnlineClass"] = relationship("OnlineClass", back_populates="recordings")
    session: Mapped["OnlineMeetingSession | None"] = relationship("OnlineMeetingSession", back_populates="recordings")


class OnlineClassMaterial(TimestampMixin, Base):
    __tablename__ = "online_class_materials"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    online_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Relationships
    online_class: Mapped["OnlineClass"] = relationship("OnlineClass", back_populates="materials")


class OnlineWhiteboardSession(TimestampMixin, Base):
    __tablename__ = "online_whiteboard_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    online_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    current_page: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    snapshot_data: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)

    # Relationships
    online_class: Mapped["OnlineClass"] = relationship("OnlineClass", back_populates="whiteboard_sessions")
    events: Mapped[list["OnlineWhiteboardEvent"]] = relationship(
        "OnlineWhiteboardEvent", back_populates="whiteboard_session", cascade="all, delete-orphan"
    )


class OnlineWhiteboardEvent(TimestampMixin, Base):
    __tablename__ = "online_whiteboard_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    whiteboard_session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_whiteboard_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    event_payload: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)

    # Relationships
    whiteboard_session: Mapped["OnlineWhiteboardSession"] = relationship("OnlineWhiteboardSession", back_populates="events")
    user: Mapped["User"] = relationship("User")


class OnlineClassroomAuditLog(TimestampMixin, Base):
    __tablename__ = "online_classroom_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    online_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("online_classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_action: Mapped[str] = mapped_column(String(50), nullable=False)
    client_ip: Mapped[str | None] = mapped_column(String(50), nullable=True)
    event_details: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)

    # Relationships
    online_class: Mapped["OnlineClass"] = relationship("OnlineClass", back_populates="audit_logs")
    actor: Mapped["User"] = relationship("User")
