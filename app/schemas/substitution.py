import datetime as dt
import uuid
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class SubstituteCandidate(BaseModel):
    teacher_id: uuid.UUID
    teacher_name: str
    employee_code: str
    department: str
    is_subject_match: bool
    is_department_match: bool
    daily_assigned_periods_count: int
    is_available: bool
    availability_conflict_reason: Optional[str] = None


class AffectedTimetableSlot(BaseModel):
    timetable_entry_id: uuid.UUID
    day_of_week: int
    period_id: uuid.UUID
    period_name: str
    period_number: int
    start_time: str
    end_time: str
    grade_id: uuid.UUID
    grade_name: str
    section_id: uuid.UUID
    section_name: str
    subject_id: Optional[uuid.UUID] = None
    subject_name: Optional[str] = None
    original_teacher_id: uuid.UUID
    original_teacher_name: str
    current_substitution_id: Optional[uuid.UUID] = None
    current_substitute_name: Optional[str] = None
    substitution_status: Optional[str] = None


class AbsentTeacherCoverageResponse(BaseModel):
    teacher_id: uuid.UUID
    teacher_name: str
    employee_code: str
    department: str
    date: dt.date
    attendance_status: str
    total_slots_count: int
    covered_slots_count: int
    affected_slots: list[AffectedTimetableSlot]


class SubstitutionCreateRequest(BaseModel):
    date: dt.date
    timetable_entry_id: uuid.UUID
    substitute_teacher_id: uuid.UUID
    reason: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class SubstitutionResponse(BaseModel):
    id: uuid.UUID
    date: dt.date
    timetable_entry_id: uuid.UUID
    original_teacher_id: uuid.UUID
    original_teacher_name: str
    substitute_teacher_id: uuid.UUID
    substitute_teacher_name: str
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    period_name: str
    grade_name: str
    section_name: str
    subject_name: Optional[str] = None
    created_at: dt.datetime


class SubstitutionCancelRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)

