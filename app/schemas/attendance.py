import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus


class AttendanceRecordItemCreate(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remark: str | None = Field(None, max_length=255)


class AttendanceBulkCreate(BaseModel):
    class_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    date: date
    period: int = Field(default=1, ge=1, le=15)
    records: list[AttendanceRecordItemCreate] = Field(..., min_length=1)


class SectionRollCallRecord(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remark: str | None = Field(None, max_length=255)


class SectionAttendanceCreate(BaseModel):
    date: date
    period: int = Field(default=1, ge=1, le=15)
    records: list[SectionRollCallRecord] = Field(..., min_length=1)


class AttendanceRecordItemUpdate(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus
    remark: str | None = Field(None, max_length=255)


class AttendanceSessionUpdate(BaseModel):
    records: list[AttendanceRecordItemUpdate] = Field(..., min_length=1)


class AttendanceRecordResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID | None = None
    student_id: uuid.UUID
    enrollment_id: uuid.UUID | None = None
    status: str
    remark: str | None = None
    student_name: str | None = None
    student_code: str | None = None
    enrollment_number: str | None = None
    roll_no: int | None = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceSessionResponse(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID | None = None
    grade_id: uuid.UUID | None = None
    grade_name: str | None = None
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    class_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    date: date
    period: int
    submission_status: str = "submitted"
    taken_by_teacher_id: uuid.UUID | None = None
    teacher_name: str | None = None
    total_students: int = 0
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    excused_count: int = 0
    locked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    class_name: str | None = None
    section: str | None = None
    subject_name: str | None = None
    records: list[AttendanceRecordResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Admin Overview & Audit Schemas
# ==========================================

class AdminAttendanceRecordUpdate(BaseModel):
    status: AttendanceStatus
    reason: str = Field(..., min_length=2, description="Mandatory reason for correcting attendance")
    remark: str | None = None


class AttendanceAuditItemResponse(BaseModel):
    id: uuid.UUID
    record_id: uuid.UUID
    session_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    enrollment_number: str | None = None
    previous_status: str
    new_status: str
    reason: str
    modified_by_name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssignedSectionItem(BaseModel):
    section_id: uuid.UUID
    section_name: str
    grade_id: uuid.UUID
    grade_name: str
    academic_year_id: uuid.UUID | None = None
    role: str | None = None
    enrolled_students_count: int = 0


class SectionRosterStudentItem(BaseModel):
    student_id: uuid.UUID
    enrollment_id: uuid.UUID
    student_name: str
    enrollment_number: str | None = None
    student_code: str
    roll_no: int | None = None
    gender: str | None = None
    has_approved_leave: bool = False
    leave_reason: str | None = None
    default_status: str | None = None
    default_remark: str | None = None


class SectionDailyOverviewItem(BaseModel):
    grade_id: uuid.UUID
    grade_name: str
    section_id: uuid.UUID
    section_name: str
    session_id: uuid.UUID | None = None
    status: str  # Marked or Unmarked
    total_students: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_percentage: float
    marked_by: str | None = None
    marked_at: datetime | None = None


class AdminAttendanceOverviewResponse(BaseModel):
    date: date
    total_sections: int
    marked_sections: int
    total_students: int
    total_present: int
    total_absent: int
    total_late: int
    total_excused: int
    overall_percentage: float
    sections: list[SectionDailyOverviewItem]


class StudentAttendanceHistoryRecord(BaseModel):
    date: date
    period: int
    status: str
    remark: str | None = None
    grade_name: str
    section_name: str
    marked_by: str | None = None


class StudentAttendanceHistoryResponse(BaseModel):
    student_id: uuid.UUID
    student_name: str
    enrollment_number: str | None = None
    student_code: str
    grade_name: str
    section_name: str
    total_working_days: int
    present_days: int
    absent_days: int
    late_days: int
    excused_days: int
    attendance_percentage: float
    records: list[StudentAttendanceHistoryRecord] = []


# ==========================================
# Legacy Summaries (Backward-Compatibility)
# ==========================================

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
