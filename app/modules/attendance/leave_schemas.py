import datetime as dt
import uuid
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StudentLeaveApplyRequest(BaseModel):
    start_date: dt.date
    end_date: dt.date
    reason: str = Field(..., min_length=3, max_length=1000)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be earlier than start date")
        return self


class ParentLeaveApplyRequest(BaseModel):
    student_id: uuid.UUID
    start_date: dt.date
    end_date: dt.date
    reason: str = Field(..., min_length=3, max_length=1000)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be earlier than start date")
        return self


class TeacherLeaveDecisionRequest(BaseModel):
    remarks: str | None = Field(None, max_length=1000)


class TeacherLeaveRejectRequest(BaseModel):
    remarks: str = Field(..., min_length=2, max_length=1000)


class LeaveApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    student_code: str
    enrollment_number: str | None = None
    submitted_by_user_id: uuid.UUID
    submission_role: str
    submitted_by_name: str
    academic_year_id: uuid.UUID | None = None
    academic_year_name: str | None = None
    grade_id: uuid.UUID | None = None
    grade_name: str | None = None
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    class_teacher_id: uuid.UUID | None = None
    class_teacher_name: str | None = None
    start_date: dt.date
    end_date: dt.date
    days_count: int
    reason: str
    status: str
    teacher_remarks: str | None = None
    decided_by_teacher_id: uuid.UUID | None = None
    decided_by_teacher_name: str | None = None
    decided_at: dt.datetime | None = None
    created_at: dt.datetime
    updated_at: dt.datetime


class LeaveListResponse(BaseModel):
    items: list[LeaveApplicationResponse]
    total: int
    pending_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0

