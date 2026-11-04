import datetime as dt
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import AcademicYear, Grade
    from app.models.admission import Admission
    from app.models.student import Student
    from app.models.user import User


class FeeComponent(TimestampMixin, Base):
    __tablename__ = "fee_components"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fee_type: Mapped[str] = mapped_column(String(50), nullable=False, default="tuition")
    payment_frequency: Mapped[str] = mapped_column(String(30), nullable=False, default="annual")
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # Relationships
    structure_items: Mapped[list["FeeStructureItem"]] = relationship(
        "FeeStructureItem", back_populates="component"
    )

    __table_args__ = (
        Index("ix_fee_components_code", "code"),
        Index("ix_fee_components_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<FeeComponent {self.name} ({self.code})>"


class FeeStructure(TimestampMixin, Base):
    __tablename__ = "fee_structures"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False
    )
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    effective_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    grade: Mapped["Grade"] = relationship("Grade")
    created_by: Mapped["User | None"] = relationship("User")
    items: Mapped[list["FeeStructureItem"]] = relationship(
        "FeeStructureItem", back_populates="structure", cascade="all, delete-orphan"
    )
    student_assignments: Mapped[list["StudentFeeAssignment"]] = relationship(
        "StudentFeeAssignment", back_populates="fee_structure"
    )

    __table_args__ = (
        Index("ix_fee_structures_year_grade", "academic_year_id", "grade_id"),
        Index("ix_fee_structures_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<FeeStructure {self.name} (grade={self.grade_id})>"


class FeeStructureItem(TimestampMixin, Base):
    __tablename__ = "fee_structure_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    fee_structure_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("fee_structures.id", ondelete="CASCADE"), nullable=False
    )
    fee_component_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("fee_components.id", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    payment_frequency: Mapped[str] = mapped_column(String(30), nullable=False, default="annual")
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    structure: Mapped["FeeStructure"] = relationship("FeeStructure", back_populates="items")
    component: Mapped["FeeComponent"] = relationship("FeeComponent", back_populates="structure_items")

    __table_args__ = (
        UniqueConstraint("fee_structure_id", "fee_component_id", name="uq_structure_component"),
        Index("ix_fee_structure_items_structure", "fee_structure_id"),
    )

    def __repr__(self) -> str:
        return f"<FeeStructureItem {self.component_id}: {self.amount}>"


class StudentFeeAssignment(TimestampMixin, Base):
    __tablename__ = "student_fee_assignments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False
    )
    grade_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="RESTRICT"), nullable=False
    )
    fee_structure_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("fee_structures.id", ondelete="RESTRICT"), nullable=False
    )
    admission_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True
    )
    base_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    total_discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    total_additional: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    final_payable_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    installment_frequency: Mapped[str] = mapped_column(String(30), nullable=False, default="annual")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    assigned_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    grade: Mapped["Grade"] = relationship("Grade")
    fee_structure: Mapped["FeeStructure"] = relationship("FeeStructure", back_populates="student_assignments")
    admission: Mapped["Admission | None"] = relationship("Admission")
    created_by: Mapped["User | None"] = relationship("User")

    items: Mapped[list["StudentFeeAssignmentItem"]] = relationship(
        "StudentFeeAssignmentItem", back_populates="assignment", cascade="all, delete-orphan"
    )
    adjustments: Mapped[list["StudentFeeAdjustment"]] = relationship(
        "StudentFeeAdjustment", back_populates="assignment", cascade="all, delete-orphan"
    )
    installments: Mapped[list["FeeInstallment"]] = relationship(
        "FeeInstallment", back_populates="assignment", cascade="all, delete-orphan"
    )
    payments: Mapped[list["FeePayment"]] = relationship(
        "FeePayment", back_populates="assignment"
    )

    __table_args__ = (
        Index("ix_student_fee_assignments_student", "student_id"),
        Index("ix_student_fee_assignments_year", "academic_year_id"),
        Index("ix_student_fee_assignments_grade", "grade_id"),
    )

    def __repr__(self) -> str:
        return f"<StudentFeeAssignment student={self.student_id} final={self.final_payable_amount}>"


class StudentFeeAssignmentItem(TimestampMixin, Base):
    __tablename__ = "student_fee_assignment_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("student_fee_assignments.id", ondelete="CASCADE"), nullable=False
    )
    fee_component_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("fee_components.id", ondelete="RESTRICT"), nullable=False
    )
    component_name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    payment_frequency: Mapped[str] = mapped_column(String(30), nullable=False, default="annual")
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_selected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    assignment: Mapped["StudentFeeAssignment"] = relationship("StudentFeeAssignment", back_populates="items")
    component: Mapped["FeeComponent"] = relationship("FeeComponent")

    __table_args__ = (
        Index("ix_assignment_items_assignment", "assignment_id"),
    )


class StudentFeeAdjustment(TimestampMixin, Base):
    __tablename__ = "student_fee_adjustments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("student_fee_assignments.id", ondelete="CASCADE"), nullable=False
    )
    adjustment_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)  # discount, concession, additional_charge
    description: Mapped[str] = mapped_column(Text, nullable=False)
    calculation_type: Mapped[str] = mapped_column(String(20), nullable=False, default="fixed")  # percentage or fixed
    rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)  # e.g. 10.00 for 10%
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    assignment: Mapped["StudentFeeAssignment"] = relationship("StudentFeeAssignment", back_populates="adjustments")
    created_by: Mapped["User | None"] = relationship("User")

    __table_args__ = (
        Index("ix_adjustments_assignment", "assignment_id"),
    )


class FeeInstallment(TimestampMixin, Base):
    __tablename__ = "fee_installments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("student_fee_assignments.id", ondelete="CASCADE"), nullable=False
    )
    installment_number: Mapped[int] = mapped_column(Integer, nullable=False)
    installment_name: Mapped[str] = mapped_column(String(100), nullable=False)
    due_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    outstanding_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending, partially_paid, paid, overdue

    # Relationships
    assignment: Mapped["StudentFeeAssignment"] = relationship("StudentFeeAssignment", back_populates="installments")
    payments: Mapped[list["FeePayment"]] = relationship("FeePayment", back_populates="installment")
    transactions: Mapped[list["PaymentTransaction"]] = relationship("PaymentTransaction", back_populates="installment")

    __table_args__ = (
        Index("ix_fee_installments_assignment", "assignment_id"),
        Index("ix_fee_installments_status", "status"),
        Index("ix_fee_installments_due_date", "due_date"),
    )


class PaymentTransaction(TimestampMixin, Base):
    __tablename__ = "payment_transactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    installment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("fee_installments.id", ondelete="RESTRICT"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="RESTRICT"), nullable=False
    )
    gateway_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="razorpay")
    gateway_order_id: Mapped[str] = mapped_column(String(100), nullable=False)
    gateway_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gateway_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="created"
    )  # created, authorized, captured, failed, refunded
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    installment: Mapped["FeeInstallment"] = relationship("FeeInstallment", back_populates="transactions")
    student: Mapped["Student"] = relationship("Student")
    payments: Mapped[list["FeePayment"]] = relationship("FeePayment", back_populates="transaction")

    __table_args__ = (
        Index("ix_payment_transactions_order", "gateway_order_id"),
        Index("ix_payment_transactions_payment", "gateway_payment_id"),
        Index("ix_payment_transactions_status", "status"),
        Index("ix_payment_transactions_installment", "installment_id"),
        Index("ix_payment_transactions_student", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<PaymentTransaction order={self.gateway_order_id} status={self.status} amt={self.amount}>"


class FeePayment(TimestampMixin, Base):
    __tablename__ = "fee_payments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    installment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("fee_installments.id", ondelete="RESTRICT"), nullable=False
    )
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("student_fee_assignments.id", ondelete="RESTRICT"), nullable=False
    )
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("payment_transactions.id", ondelete="SET NULL"), nullable=True
    )
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    payment_method: Mapped[str] = mapped_column(
        String(30), nullable=False, default="online_gateway"
    )  # online_gateway, cash, cheque, bank_transfer, demand_draft
    payment_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")  # completed, refunded, cancelled
    reference_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    installment: Mapped["FeeInstallment"] = relationship("FeeInstallment", back_populates="payments")
    assignment: Mapped["StudentFeeAssignment"] = relationship("StudentFeeAssignment", back_populates="payments")
    transaction: Mapped["PaymentTransaction | None"] = relationship("PaymentTransaction", back_populates="payments")
    recorded_by: Mapped["User | None"] = relationship("User")

    __table_args__ = (
        Index("ix_fee_payments_receipt", "receipt_number"),
        Index("ix_fee_payments_installment", "installment_id"),
        Index("ix_fee_payments_assignment", "assignment_id"),
        Index("ix_fee_payments_payment_date", "payment_date"),
        Index("ix_fee_payments_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<FeePayment receipt={self.receipt_number} amt={self.amount} method={self.payment_method}>"


class PaymentWebhookEvent(TimestampMixin, Base):
    __tablename__ = "payment_webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    gateway_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="razorpay")
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_payload: Mapped[str] = mapped_column(Text, nullable=False)
    processing_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="received"
    )  # received, processed, failed, ignored
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_payment_webhook_events_event_id", "event_id"),
        Index("ix_payment_webhook_events_status", "processing_status"),
        Index("ix_payment_webhook_events_type", "event_type"),
    )

    def __repr__(self) -> str:
        return f"<PaymentWebhookEvent {self.event_id} ({self.event_type}) status={self.processing_status}>"


