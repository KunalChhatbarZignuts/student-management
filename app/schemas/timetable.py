import datetime as dt
import uuid
from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# Shift & Period Schemas
# ==========================================

class PeriodCreate(BaseModel):
    number: int = Field(..., ge=1, le=20)
    name: str | None = Field(None, max_length=50)
    start_time: str = Field(..., description="HH:MM:SS or HH:MM")
    end_time: str = Field(..., description="HH:MM:SS or HH:MM")
    is_break: bool = False


class PeriodUpdate(BaseModel):
    number: int | None = Field(None, ge=1, le=20)
    name: str | None = Field(None, max_length=50)
    start_time: str | None = None
    end_time: str | None = None
    is_break: bool | None = None
    status: str | None = None


class PeriodResponse(BaseModel):
    id: uuid.UUID
    shift_id: uuid.UUID
    number: int
    name: str | None = None
    start_time: str
    end_time: str
    is_break: bool
    status: str

    model_config = ConfigDict(from_attributes=True)


class ShiftCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    start_time: str = Field(..., description="HH:MM:SS or HH:MM")
    end_time: str = Field(..., description="HH:MM:SS or HH:MM")
    working_days: str = Field(default="Monday,Tuesday,Wednesday,Thursday,Friday", max_length=100)
    assigned_grade_ids: list[uuid.UUID] = Field(default_factory=list)


class ShiftUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=50)
    start_time: str | None = None
    end_time: str | None = None
    working_days: str | None = None
    status: str | None = None
    assigned_grade_ids: list[uuid.UUID] | None = None


class ShiftResponse(BaseModel):
    id: uuid.UUID
    name: str
    start_time: str
    end_time: str
    working_days: str
    status: str
    periods: list[PeriodResponse] = []
    grades_count: int = 0
    assigned_grade_ids: list[uuid.UUID] = []
    assigned_grade_names: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class GradeShiftAssignRequest(BaseModel):
    shift_id: uuid.UUID | None = None


# ==========================================
# Timetable Slot & Matrix Schemas
# ==========================================

class TimetableSlotInput(BaseModel):
    day_of_week: int = Field(..., ge=1, le=6, description="1=Monday, 2=Tuesday, ..., 6=Saturday")
    period_id: uuid.UUID
    subject_id: uuid.UUID | None = None
    teacher_id: uuid.UUID | None = None
    room_number: str | None = Field(None, max_length=50)


class TimetableSlotResponse(BaseModel):
    id: uuid.UUID
    day_of_week: int
    period_id: uuid.UUID
    period_number: int
    period_name: str | None = None
    start_time: str
    end_time: str
    is_break: bool
    subject_id: uuid.UUID | None = None
    subject_name: str | None = None
    subject_code: str | None = None
    teacher_id: uuid.UUID | None = None
    teacher_name: str | None = None
    room_number: str | None = None
    is_current_teacher: bool = False

    model_config = ConfigDict(from_attributes=True)


class TimetableSaveDraftRequest(BaseModel):
    academic_year_id: uuid.UUID
    grade_id: uuid.UUID
    section_id: uuid.UUID
    entries: list[TimetableSlotInput]


class TimetableDetailResponse(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    academic_year_name: str
    grade_id: uuid.UUID
    grade_name: str
    section_id: uuid.UUID
    section_name: str
    shift_id: uuid.UUID
    shift_name: str
    version: int
    status: str
    published_at: dt.datetime | None = None
    working_days: list[str] = []
    periods: list[PeriodResponse] = []
    entries: list[TimetableSlotResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Teacher Timetable Views
# ==========================================

class TeacherPersonalScheduleItem(BaseModel):
    day_of_week: int
    period_number: int
    period_name: str | None = None
    start_time: str
    end_time: str
    subject_name: str
    subject_code: str
    grade_name: str
    section_name: str
    room_number: str | None = None


class TeacherPersonalScheduleResponse(BaseModel):
    teacher_id: uuid.UUID
    teacher_name: str
    academic_year_name: str
    slots: list[TeacherPersonalScheduleItem] = []


class ClashValidationResult(BaseModel):
    is_valid: bool
    clashes: list[str] = []

