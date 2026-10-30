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


class AuditLogRead(BaseModel):
    id: uuid.UUID
    actor_email: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    ip: str | None = None
    metadata: dict | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    items: list[AuditLogRead]
    total: int
    skip: int
    limit: int
