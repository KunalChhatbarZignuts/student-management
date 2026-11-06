import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import Grade, Section
    from app.models.parent import ParentStudentLink
    from app.models.user import User


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    enrollment_number: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dob: Mapped[date] = mapped_column(Date, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    alternate_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    profile_photo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    previous_school_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    previous_school_details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    class_name: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[str] = mapped_column(String(10), nullable=False)
    current_grade_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="SET NULL"), nullable=True,
    )
    current_section_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True,
    )
    department: Mapped[str] = mapped_column(String(50), nullable=False)
    guardian_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    guardian_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    guardian_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    allergies: Mapped[str | None] = mapped_column(String(500), nullable=True)
    medical_conditions: Mapped[str | None] = mapped_column(String(500), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    authorized_pickup_info: Mapped[str | None] = mapped_column(String(500), nullable=True)
    admission_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student")
    parent_links: Mapped[list["ParentStudentLink"]] = relationship(
        "ParentStudentLink", back_populates="student",
    )
    current_grade: Mapped["Grade | None"] = relationship("Grade", foreign_keys=[current_grade_id])
    current_section: Mapped["Section | None"] = relationship("Section", foreign_keys=[current_section_id])

    __table_args__ = (
        Index("ix_students_student_code", "student_code"),
        Index("ix_students_enrollment_number", "enrollment_number"),
        Index("ix_students_current_grade", "current_grade_id"),
        Index("ix_students_current_section", "current_section_id"),
    )

    def __repr__(self) -> str:
        return f"<Student {self.student_code} {self.first_name} {self.last_name}>"

