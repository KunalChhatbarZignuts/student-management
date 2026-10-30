import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StudentCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    dob: date
    class_name: str = Field(..., min_length=1, max_length=20)
    section: str = Field(..., min_length=1, max_length=10)
    department: str = Field(..., min_length=1, max_length=50)
    admission_date: date
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_email: EmailStr | None = None


class StudentResponse(BaseModel):
    id: uuid.UUID
    student_code: str
    user_id: uuid.UUID
    first_name: str
    last_name: str
    dob: date
    class_name: str
    section: str
    department: str
    admission_date: date
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_email: str | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentCreateResponse(BaseModel):
    student: StudentResponse
    user_status: str
    invite_expires_at: datetime
    invite_token: str  # returned on creation in dev so admin can distribute/inspect
