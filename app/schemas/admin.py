import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.user import UserRead


class PaginatedUsersResponse(BaseModel):
    items: list[UserRead]
    total: int
    skip: int
    limit: int


class UserStatusUpdateResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    status: str
    message: str


class ResendInviteResponse(BaseModel):
    message: str
    invite_token: str
    expires_at: datetime


class TriggerPasswordResetResponse(BaseModel):
    message: str
