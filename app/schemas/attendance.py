import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus


class AttendanceRecordItemCreate(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remark: str | None = Field(None, max_length=255)


class AttendanceBulkCreate(BaseModel):
    class_id: uuid.UUID
    subject_id: uuid.UUID
    date: date
    period: int = Field(..., ge=1, le=15)
    records: list[AttendanceRecordItemCreate] = Field(..., min_length=1)


class AttendanceRecordItemUpdate(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus
    remark: str | None = Field(None, max_length=255)


class AttendanceSessionUpdate(BaseModel):
    records: list[AttendanceRecordItemUpdate] = Field(..., min_length=1)


class AttendanceRecordResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID | None
    student_id: uuid.UUID
    status: str
    remark: str | None = None
    student_name: str | None = None
    student_code: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceSessionResponse(BaseModel):
    id: uuid.UUID
    class_id: uuid.UUID
    subject_id: uuid.UUID
    date: date
    period: int
    taken_by_teacher_id: uuid.UUID | None = None
    locked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    class_name: str | None = None
    section: str | None = None
    subject_name: str | None = None
    records: list[AttendanceRecordResponse] = []

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceSummaryItem(BaseModel):
    student_id: uuid.UUID
    student_code: str
    name: str
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    percentage: float


class ClassAttendanceSummaryResponse(BaseModel):
    class_id: uuid.UUID
    class_name: str
    section: str
    from_date: date
    to_date: date
    total_sessions: int
    items: list[StudentAttendanceSummaryItem]


class StudentMeAttendanceRecord(BaseModel):
    id: uuid.UUID
    date: date
    period: int | None = None
    subject_name: str | None = None
    status: str
    remark: str | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentMeAttendanceResponse(BaseModel):
    student_id: uuid.UUID
    student_code: str
    total_classes: int
    attended_classes: int
    percentage: float
    excused_absences: int
    records: list[StudentMeAttendanceRecord]

