import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ApplicationCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(None, max_length=20)
    department: str = Field(..., min_length=1, max_length=50)
    message: str | None = None


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    department: str
    message: str | None = None
    email_verified: bool
    status: str
    reviewed_by: uuid.UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationApproveResponse(BaseModel):
    message: str
    application_id: uuid.UUID
    student_code: str
    invite_expires_at: datetime
    invite_token: str
