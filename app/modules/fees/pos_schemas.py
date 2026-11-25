import datetime as dt
import uuid
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class POSStudentSearchItem(BaseModel):
    student_id: uuid.UUID
    name: str
    admission_number: str
    grade_name: str
    section_name: str
    total_fee: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    pending_installment_count: int


class POSInstallmentItem(BaseModel):
    installment_id: uuid.UUID
    assignment_id: uuid.UUID
    title: str
    due_date: dt.date
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    status: str


class POSRecentPayment(BaseModel):
    receipt_number: str
    payment_date: dt.date
    amount: Decimal
    payment_method: str
    reference_note: Optional[str] = None


class POSStudentAccountDetails(BaseModel):
    student_id: uuid.UUID
    name: str
    admission_number: str
    grade_name: str
    section_name: str
    total_fee: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    installments: list[POSInstallmentItem]
    recent_payments: list[POSRecentPayment]


class POSAllocationItem(BaseModel):
    installment_id: uuid.UUID
    amount: Decimal = Field(..., gt=0)


class POSCollectPaymentRequest(BaseModel):
    student_id: uuid.UUID
    total_amount: Decimal = Field(..., gt=0)
    payment_method: str = Field(..., description="cash, upi, card, bank_transfer, cheque")
    cash_tendered: Optional[Decimal] = None
    transaction_reference: Optional[str] = None
    remarks: Optional[str] = None
    allocations: Optional[list[POSAllocationItem]] = None


class POSReceiptItem(BaseModel):
    installment_title: str
    due_date: dt.date
    amount_paid: Decimal
    prior_outstanding: Decimal
    new_outstanding: Decimal


class POSPaymentReceiptResponse(BaseModel):
    receipt_number: str
    student_id: uuid.UUID
    student_name: str
    admission_number: str
    grade_name: str
    section_name: str
    payment_date: dt.date
    payment_method: str
    amount_paid: Decimal
    cash_tendered: Optional[Decimal] = None
    change_returned: Optional[Decimal] = None
    transaction_reference: Optional[str] = None
    remarks: Optional[str] = None
    cashier_name: str
    items: list[POSReceiptItem]
    total_remaining_balance: Decimal
    pdf_url: str

