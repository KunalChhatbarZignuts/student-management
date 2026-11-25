import datetime as dt
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.academics.structure_models import AcademicYear, Grade, Section
    from app.modules.academics.classroom_models import Subject
    from app.modules.students.parent_models import Parent
    from app.modules.students.models import Student
    from app.modules.teachers.models import Teacher
    from app.modules.auth.models import User


class DiaryEntry(TimestampMixin, Base):
    """Primary diary entry authored by teachers with full audience visibility and status."""
    __tablename__ = "diary_entries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False
    )
    academic_year_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=True
    )
    grade_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="SET NULL"), nullable=True
    )
    section_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    entry_type: Mapped[str] = mapped_column(String(40), nullable=False, default="DAILY_UPDATE")
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    entry_date: Mapped[dt.date] = mapped_column(Date, nullable=False, default=dt.date.today)
    due_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)

    # Visibility: 'STUDENT_AND_PARENT', 'PARENT_ONLY', 'STUDENT_ONLY'
    visibility: Mapped[str] = mapped_column(String(30), nullable=False, default="STUDENT_AND_PARENT")

    requires_acknowledgement: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_conversation_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Status: 'DRAFT', 'PUBLISHED', 'ARCHIVED', 'RETRACTED'
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")

    published_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retracted_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retraction_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Internal Teacher & Admin notes - never sent to Student/Parent responses
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Attachments format: [{"name": "worksheet.pdf", "url": "/...", "file_type": "pdf", "file_size": 1024}]
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)

    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher")
    academic_year: Mapped["AcademicYear | None"] = relationship("AcademicYear")
    grade: Mapped["Grade | None"] = relationship("Grade")
    section: Mapped["Section | None"] = relationship("Section")
    subject: Mapped["Subject | None"] = relationship("Subject")

    recipients: Mapped[list["DiaryEntryRecipient"]] = relationship(
        "DiaryEntryRecipient", back_populates="diary_entry", cascade="all, delete-orphan"
    )
    acknowledgements: Mapped[list["DiaryAcknowledgement"]] = relationship(
        "DiaryAcknowledgement", back_populates="diary_entry", cascade="all, delete-orphan"
    )
    conversations: Mapped[list["DiaryConversation"]] = relationship(
        "DiaryConversation", back_populates="diary_entry", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_diary_entries_teacher_id", "teacher_id"),
        Index("ix_diary_entries_section_id", "section_id"),
        Index("ix_diary_entries_subject_id", "subject_id"),
        Index("ix_diary_entries_entry_date", "entry_date"),
        Index("ix_diary_entries_status", "status"),
        Index("ix_diary_entries_entry_type", "entry_type"),
    )

    def __repr__(self) -> str:
        return f"<DiaryEntry id={self.id} title={self.title[:30]} status={self.status}>"


class DiaryEntryRecipient(Base):
    """Maps a single diary entry to recipient students without duplicating entry content."""
    __tablename__ = "diary_entry_recipients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    diary_entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("diary_entries.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    is_read_by_student: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    student_read_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: dt.datetime.now(dt.timezone.utc)
    )

    diary_entry: Mapped["DiaryEntry"] = relationship("DiaryEntry", back_populates="recipients")
    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        UniqueConstraint("diary_entry_id", "student_id", name="uq_diary_entry_recipient"),
        Index("ix_diary_recipients_student_id", "student_id"),
        Index("ix_diary_recipients_entry_id", "diary_entry_id"),
    )

    def __repr__(self) -> str:
        return f"<DiaryEntryRecipient entry={self.diary_entry_id} student={self.student_id}>"


class DiaryAcknowledgement(Base):
    """Parent signature/acknowledgement record stamping verified receipt."""
    __tablename__ = "diary_acknowledgements"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    diary_entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("diary_entries.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("parents.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    acknowledged_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: dt.datetime.now(dt.timezone.utc)
    )
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    diary_entry: Mapped["DiaryEntry"] = relationship("DiaryEntry", back_populates="acknowledgements")
    parent: Mapped["Parent"] = relationship("Parent")
    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        UniqueConstraint("diary_entry_id", "parent_id", "student_id", name="uq_diary_acknowledgement"),
        Index("ix_diary_ack_entry", "diary_entry_id"),
        Index("ix_diary_ack_parent", "parent_id"),
        Index("ix_diary_ack_student", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<DiaryAcknowledgement entry={self.diary_entry_id} parent={self.parent_id}>"


class DiaryConversation(TimestampMixin, Base):
    """Contextual 1-on-1 parent-teacher conversation thread linked to a diary entry."""
    __tablename__ = "diary_conversations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    diary_entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("diary_entries.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("parents.id", ondelete="CASCADE"), nullable=False
    )

    # Status: 'OPEN', 'RESOLVED', 'CLOSED'
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN")
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolution_notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    diary_entry: Mapped["DiaryEntry"] = relationship("DiaryEntry", back_populates="conversations")
    student: Mapped["Student"] = relationship("Student")
    parent: Mapped["Parent"] = relationship("Parent")
    resolved_by: Mapped["User | None"] = relationship("User", foreign_keys=[resolved_by_user_id])

    messages: Mapped[list["DiaryMessage"]] = relationship(
        "DiaryMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="DiaryMessage.created_at.asc()"
    )

    __table_args__ = (
        UniqueConstraint("diary_entry_id", "student_id", "parent_id", name="uq_diary_conversation_scope"),
        Index("ix_diary_conv_entry", "diary_entry_id"),
        Index("ix_diary_conv_student", "student_id"),
        Index("ix_diary_conv_parent", "parent_id"),
        Index("ix_diary_conv_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<DiaryConversation id={self.id} entry={self.diary_entry_id} status={self.status}>"


class DiaryMessage(TimestampMixin, Base):
    """Individual threaded message in a diary conversation."""
    __tablename__ = "diary_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("diary_conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    sender_role: Mapped[str] = mapped_column(String(30), nullable=False)  # 'TEACHER', 'PARENT', 'ADMIN'
    sender_name: Mapped[str] = mapped_column(String(150), nullable=False)

    message: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)

    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    deleted_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversation: Mapped["DiaryConversation"] = relationship("DiaryConversation", back_populates="messages")
    sender: Mapped["User"] = relationship("User")

    __table_args__ = (
        Index("ix_diary_messages_conversation", "conversation_id"),
        Index("ix_diary_messages_sender", "sender_user_id"),
        Index("ix_diary_messages_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<DiaryMessage id={self.id} sender={self.sender_role} length={len(self.message)}>"


class DiaryNotification(Base):
    """In-app diary event notification for real-time alerts."""
    __tablename__ = "diary_notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    reference_type: Mapped[str] = mapped_column(String(50), nullable=False, default="DIARY_ENTRY")

    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: dt.datetime.now(dt.timezone.utc)
    )

    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        Index("ix_diary_notif_user", "user_id"),
        Index("ix_diary_notif_is_read", "is_read"),
        Index("ix_diary_notif_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<DiaryNotification id={self.id} user={self.user_id} event={self.event_type}>"
