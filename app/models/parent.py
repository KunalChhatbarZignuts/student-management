import datetime as dt
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.user import User


class Parent(TimestampMixin, Base):
    __tablename__ = "parents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    profile_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="parent")
    student_links: Mapped[list["ParentStudentLink"]] = relationship(
        "ParentStudentLink", back_populates="parent", cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Parent {self.first_name} {self.last_name}>"


class ParentStudentLink(TimestampMixin, Base):
    """Association table linking parents to their students with relationship metadata."""
    __tablename__ = "parent_student_links"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("parents.id", ondelete="CASCADE"), nullable=False,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Guardian")
    is_primary_guardian: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="verified")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    linked_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: dt.datetime.now(dt.timezone.utc)
    )
    linked_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    # Relationships
    parent: Mapped["Parent"] = relationship("Parent", back_populates="student_links")
    student: Mapped["Student"] = relationship("Student", back_populates="parent_links")

    __table_args__ = (
        Index("ix_psl_parent_id", "parent_id"),
        Index("ix_psl_student_id", "student_id"),
        Index("ix_psl_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<ParentStudentLink parent={self.parent_id} student={self.student_id} type={self.relationship_type}>"

