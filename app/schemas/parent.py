import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.student import StudentResponse


class ParentCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)


class ParentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    phone: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParentLinkResponse(BaseModel):
    message: str
    parent_id: uuid.UUID
    student_id: uuid.UUID
