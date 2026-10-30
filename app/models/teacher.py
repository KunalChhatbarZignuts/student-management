import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Teacher(TimestampMixin, Base):
    __tablename__ = "teachers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="teacher")

    __table_args__ = (
        Index("ix_teachers_employee_code", "employee_code"),
    )

    def __repr__(self) -> str:
        return f"<Teacher {self.employee_code} {self.first_name} {self.last_name}>"

