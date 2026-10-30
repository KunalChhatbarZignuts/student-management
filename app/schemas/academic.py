import uuid
from datetime import date
from pydantic import BaseModel, ConfigDict


class AttendanceRecordRead(BaseModel):
    id: uuid.UUID
    date: date
    status: str
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceSummaryResponse(BaseModel):
    total_classes: int
    attended_classes: int
    percentage: float
    excused_absences: int
    records: list[AttendanceRecordRead]


class StudentMarkRead(BaseModel):
    id: uuid.UUID
    subject: str
    code: str
    max_score: int
    obtained_score: int
    grade: str
    status: str
    term: str

    model_config = ConfigDict(from_attributes=True)


class FeeInvoiceRead(BaseModel):
    id: uuid.UUID
    invoice_number: str
    description: str
    amount: float
    due_date: date
    status: str

    model_config = ConfigDict(from_attributes=True)
