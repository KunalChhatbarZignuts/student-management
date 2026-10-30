import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.parent import ParentStudentLink
    from app.models.user import User


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    dob: Mapped[date] = mapped_column(Date, nullable=False)
    class_name: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[str] = mapped_column(String(10), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    guardian_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    guardian_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    guardian_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    admission_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student")
    parent_links: Mapped[list["ParentStudentLink"]] = relationship(
        "ParentStudentLink", back_populates="student",
    )

    __table_args__ = (
        Index("ix_students_student_code", "student_code"),
    )

    def __repr__(self) -> str:
        return f"<Student {self.student_code} {self.first_name} {self.last_name}>"

