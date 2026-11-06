import datetime as dt
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Grading Scale Schemas
# ---------------------------------------------------------------------------

class GradingScaleBase(BaseModel):
    name: str = Field(..., max_length=100)
    min_percentage: float = Field(..., ge=0, le=100)
    max_percentage: float = Field(..., ge=0, le=100)
    grade: str = Field(..., max_length=10)
    grade_point: float = Field(default=0.0, ge=0)
    description: str | None = Field(default=None, max_length=255)
    is_passing: bool = True
    status: str = "active"


class GradingScaleCreate(GradingScaleBase):
    pass


class GradingScaleResponse(GradingScaleBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: dt.datetime
    updated_at: dt.datetime


# ---------------------------------------------------------------------------
# Examination Schemas
# ---------------------------------------------------------------------------

class ExaminationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    exam_type: str = Field(..., max_length=50)  # UNIT_TEST, MID_TERM, FINAL, etc.
    academic_year_id: uuid.UUID
    term: str = Field(default="Term 1", max_length=50)
    description: str | None = None
    start_date: dt.date
    end_date: dt.date
    grading_scale_name: str = Field(default="Default 10-Point Scale", max_length=100)


class ExaminationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    exam_type: str | None = None
    term: str | None = None
    description: str | None = None
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    status: str | None = None
    grading_scale_name: str | None = None


class ExaminationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    exam_type: str
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    term: str
    description: str | None = None
    start_date: dt.date
    end_date: dt.date
    status: str
    grading_scale_name: str
    total_schedules: int = 0
    published_results_count: int = 0
    created_at: dt.datetime
    updated_at: dt.datetime


# ---------------------------------------------------------------------------
# Examination Schedule Schemas
# ---------------------------------------------------------------------------

class ExaminationScheduleCreate(BaseModel):
    examination_id: uuid.UUID
    grade_id: uuid.UUID
    section_id: uuid.UUID
    subject_id: uuid.UUID
    exam_date: dt.date
    start_time: dt.time
    end_time: dt.time
    max_marks: float = Field(default=100.0, gt=0)
    pass_marks: float = Field(default=35.0, ge=0)
    room_number: str | None = Field(default=None, max_length=50)
    instructions: str | None = None


class ExaminationScheduleUpdate(BaseModel):
    exam_date: dt.date | None = None
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    max_marks: float | None = Field(default=None, gt=0)
    pass_marks: float | None = Field(default=None, ge=0)
    room_number: str | None = None
    instructions: str | None = None
    status: str | None = None


class ExaminationScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    examination_id: uuid.UUID
    exam_name: str | None = None
    grade_id: uuid.UUID
    grade_name: str | None = None
    section_id: uuid.UUID
    section_name: str | None = None
    subject_id: uuid.UUID
    subject_name: str | None = None
    subject_code: str | None = None
    exam_date: dt.date
    start_time: dt.time
    end_time: dt.time
    max_marks: float
    pass_marks: float
    room_number: str | None = None
    instructions: str | None = None
    status: str
    marks_entry_status: str = "PENDING"  # PENDING, DRAFT, SUBMITTED, PUBLISHED
    created_at: dt.datetime


# ---------------------------------------------------------------------------
# Marks Entry & Roster Schemas
# ---------------------------------------------------------------------------

class StudentExamMarkItem(BaseModel):
    student_id: uuid.UUID
    marks_obtained: float | None = Field(default=None, ge=0)
    is_absent: bool = False
    remarks: str | None = Field(default=None, max_length=255)


class MarksBulkSaveRequest(BaseModel):
    marks: list[StudentExamMarkItem]
    teacher_remarks: str | None = None


class StudentRosterMarkItem(BaseModel):
    student_id: uuid.UUID
    student_name: str
    enrollment_number: str | None = None
    roll_no: int = 1
    marks_obtained: float | None = None
    is_absent: bool = False
    grade: str | None = None
    is_passed: bool | None = None
    remarks: str | None = None
    status: str = "DRAFT"


class ScheduleRosterResponse(BaseModel):
    schedule_id: uuid.UUID
    exam_name: str
    exam_type: str
    term: str
    grade_name: str
    section_name: str
    subject_name: str
    subject_code: str
    exam_date: dt.date
    start_time: dt.time
    end_time: dt.time
    max_marks: float
    pass_marks: float
    status: str
    students: list[StudentRosterMarkItem]


# ---------------------------------------------------------------------------
# Consolidated Result & Report Card Schemas
# ---------------------------------------------------------------------------

class SubjectMarkDetail(BaseModel):
    subject_name: str
    subject_code: str
    exam_date: dt.date
    max_marks: float
    pass_marks: float
    marks_obtained: float | None
    is_absent: bool
    grade: str | None
    is_passed: bool | None
    status: str


class StudentResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    examination_id: uuid.UUID
    exam_name: str
    exam_type: str
    term: str
    academic_year: str
    student_id: uuid.UUID
    student_name: str
    enrollment_number: str | None
    roll_no: int | None
    grade_name: str
    section_name: str
    class_teacher_name: str | None = None
    total_max_marks: float
    total_obtained_marks: float
    percentage: float
    overall_grade: str
    overall_result: str
    teacher_remarks: str | None = None
    status: str
    published_at: dt.datetime | None = None
    subject_marks: list[SubjectMarkDetail] = Field(default_factory=list)


class PublishResultsRequest(BaseModel):
    section_id: uuid.UUID | None = None  # None to publish entire exam


class ExaminationDashboardMetrics(BaseModel):
    total_examinations: int = 0
    upcoming_examinations: int = 0
    ongoing_examinations: int = 0
    completed_examinations: int = 0
    results_pending: int = 0
    published_results: int = 0
    total_participating_students: int = 0


class ExaminationNotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    message: str
    event_type: str
    is_read: bool
    created_at: dt.datetime

