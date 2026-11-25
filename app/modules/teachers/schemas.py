import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeacherCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=50)
    phone: str | None = Field(None, max_length=20)


class TeacherResponse(BaseModel):
    id: uuid.UUID
    employee_code: str
    user_id: uuid.UUID
    first_name: str
    last_name: str
    department: str
    phone: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherCreateResponse(BaseModel):
    teacher: TeacherResponse
    user_status: str
    invite_expires_at: datetime
    invite_token: str
