import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.student import Student

JsonType = JSON().with_variant(JSONB, "postgresql")


class MessageSender(str, enum.Enum):
    STUDENT = "STUDENT"
    ASSISTANT = "ASSISTANT"
    SYSTEM = "SYSTEM"


class AIStudentConversation(TimestampMixin, Base):
    """Stores persistent multi-turn conversation sessions between a student and the AI Student Assistant."""
    __tablename__ = "ai_student_conversations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), default="New Conversation", nullable=False)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    messages: Mapped[list["AIStudentMessage"]] = relationship(
        "AIStudentMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AIStudentMessage.created_at.asc()",
    )

    __table_args__ = (
        Index("ix_ai_student_conversations_student", "student_id"),
        Index("ix_ai_student_conversations_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AIStudentConversation id={self.id} student_id={self.student_id} title='{self.title}'>"


class AIStudentMessage(Base):
    """Stores individual message turns within an AI Student Assistant conversation."""
    __tablename__ = "ai_student_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ai_student_conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender: Mapped[str] = mapped_column(String(30), default=MessageSender.STUDENT.value, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tools_used: Mapped[Any | None] = mapped_column(JsonType, nullable=True)
    action_links: Mapped[Any | None] = mapped_column(JsonType, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        nullable=False,
    )

    # Relationships
    conversation: Mapped["AIStudentConversation"] = relationship(
        "AIStudentConversation", back_populates="messages"
    )

    __table_args__ = (
        Index("ix_ai_student_messages_conversation", "conversation_id"),
        Index("ix_ai_student_messages_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AIStudentMessage id={self.id} sender={self.sender} conversation_id={self.conversation_id}>"
