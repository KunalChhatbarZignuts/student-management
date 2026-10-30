import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Uuid
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

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="parent")
    student_links: Mapped[list["ParentStudentLink"]] = relationship(
        "ParentStudentLink", back_populates="parent",
    )

    def __repr__(self) -> str:
        return f"<Parent {self.first_name} {self.last_name}>"


class ParentStudentLink(Base):
    """Association table linking parents to their students."""
    __tablename__ = "parent_student_links"

    parent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("parents.id"), primary_key=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id"), primary_key=True,
    )

    # Relationships
    parent: Mapped["Parent"] = relationship("Parent", back_populates="student_links")
    student: Mapped["Student"] = relationship("Student", back_populates="parent_links")

