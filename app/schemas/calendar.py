import datetime as dt
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HolidayCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=100)
    description: str | None = None
    is_active: bool = True


class HolidayCategoryCreate(HolidayCategoryBase):
    pass


class HolidayCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class HolidayCategoryResponse(HolidayCategoryBase):
    id: uuid.UUID
    is_system: bool
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class SchoolHolidayCreate(BaseModel):
    name: str = Field(..., max_length=150)
    category_id: uuid.UUID
    academic_year_id: uuid.UUID
    start_date: dt.date
    end_date: dt.date
    description: str | None = None
    grade_ids: list[uuid.UUID] = Field(default_factory=list)
    section_ids: list[uuid.UUID] = Field(default_factory=list)
    confirm_attendance_override: bool = False


class SchoolHolidayUpdate(BaseModel):
    name: str | None = None
    category_id: uuid.UUID | None = None
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    description: str | None = None
    grade_ids: list[uuid.UUID] | None = None
    section_ids: list[uuid.UUID] | None = None
    reason: str | None = None
    confirm_attendance_override: bool = False


class SchoolHolidayCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class GradeSimpleInfo(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class HolidayAuditResponse(BaseModel):
    id: uuid.UUID
    holiday_id: uuid.UUID
    action: str
    previous_state: dict[str, Any] | None = None
    new_state: dict[str, Any] | None = None
    reason: str | None = None
    modified_by_user_id: uuid.UUID | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class SchoolHolidayResponse(BaseModel):
    id: uuid.UUID
    name: str
    category_id: uuid.UUID
    category_name: str
    academic_year_id: uuid.UUID
    start_date: dt.date
    end_date: dt.date
    description: str | None = None
    status: str
    is_school_wide: bool
    applicable_grades: list[GradeSimpleInfo] = Field(default_factory=list)
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class SchoolCalendarSettingsResponse(BaseModel):
    academic_year_id: uuid.UUID
    weekly_off_days: list[int]  # 0=Monday, 6=Sunday
    weekly_off_names: list[str]


class SchoolCalendarSettingsUpdate(BaseModel):
    weekly_off_days: list[int] = Field(..., description="0=Monday, ..., 6=Sunday")


class SpecialWorkingDayCreate(BaseModel):
    academic_year_id: uuid.UUID
    date: dt.date
    reason: str = Field(..., max_length=255)


class SpecialWorkingDayResponse(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    date: dt.date
    reason: str
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class DateWorkingStatusResponse(BaseModel):
    date: dt.date
    is_working_day: bool
    day_type: str  # working_day, holiday, weekly_off, special_working_day
    reason: str | None = None
    holiday_name: str | None = None
    holiday_category: str | None = None
    can_mark_attendance: bool


class MonthlyCalendarDay(BaseModel):
    date: dt.date
    day_of_week: int
    day_name: str
    is_working_day: bool
    day_type: str  # working_day, holiday, weekly_off, special_working_day
    label: str | None = None
    category_name: str | None = None
    is_school_wide: bool = True
    applicable_grade_names: list[str] = Field(default_factory=list)


class MonthCalendarResponse(BaseModel):
    year: int
    month: int
    total_days: int
    working_days: int
    holidays: int
    weekly_offs: int
    days: list[MonthlyCalendarDay]
