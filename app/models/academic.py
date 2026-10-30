import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.attendance import AttendanceRecord

if TYPE_CHECKING:
    from app.models.student import Student





class StudentMark(TimestampMixin, Base):
    __tablename__ = "student_marks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    obtained_score: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="Pass")
    term: Mapped[str] = mapped_column(String(50), nullable=False, default="Term 1 (2026-2027)")

    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        Index("ix_student_marks_student_term", "student_id", "term"),
    )

    def __repr__(self) -> str:
        return f"<StudentMark student={self.student_id} subject={self.subject} grade={self.grade}>"


class FeeInvoice(TimestampMixin, Base):
    __tablename__ = "fee_invoices"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Pending")

    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        Index("ix_fee_invoices_student", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<FeeInvoice #{self.invoice_number} student={self.student_id} amount={self.amount}>"
