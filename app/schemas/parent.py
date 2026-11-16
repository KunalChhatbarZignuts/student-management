import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ParentCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    address: str | None = Field(None, max_length=255)
    profile_image: str | None = Field(None, max_length=500)
    password: str | None = Field(None, min_length=6, max_length=128)


class ParentUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    address: str | None = Field(None, max_length=255)
    profile_image: str | None = Field(None, max_length=500)


class ParentProfileUpdate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    address: str | None = Field(None, max_length=255)
    profile_image: str | None = Field(None, max_length=500)


class ParentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|suspended|deactivated)$")


class LinkedChildDetail(BaseModel):
    id: uuid.UUID | None = None
    relationship_id: uuid.UUID
    student_id: uuid.UUID
    student_code: str
    enrollment_number: str | None = None
    first_name: str
    last_name: str
    dob: date | None = None
    class_name: str
    section: str
    department: str | None = None
    academic_year: str | None = None
    class_teacher_name: str | None = None
    relationship_type: str = "Guardian"
    is_primary_guardian: bool = False
    verification_status: str = "verified"
    status: str = "active"
    linked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LinkedStudentSummary(BaseModel):
    id: uuid.UUID
    student_code: str
    first_name: str
    last_name: str
    class_name: str
    section: str

    model_config = ConfigDict(from_attributes=True)


class ParentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: EmailStr | None = None
    first_name: str
    last_name: str
    phone: str | None = None
    address: str | None = None
    profile_image: str | None = None
    user_status: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    initial_password: str | None = None
    login_identifier: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ParentWithChildrenResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    address: str | None = None
    profile_image: str | None = None
    user_status: str = "invited"
    children_count: int = 0
    children: list[LinkedChildDetail] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedParentsResponse(BaseModel):
    items: list[ParentWithChildrenResponse]
    total: int
    skip: int
    limit: int


class LinkChildPayload(BaseModel):
    student_id: uuid.UUID
    relationship_type: str = Field("Guardian", max_length=50)
    is_primary_guardian: bool = False


class UpdateRelationshipPayload(BaseModel):
    relationship_type: str | None = Field(None, max_length=50)
    is_primary_guardian: bool | None = None
    verification_status: str | None = Field(None, max_length=30)
    status: str | None = Field(None, pattern="^(active|inactive)$")


class LinkedParentDetail(BaseModel):
    relationship_id: uuid.UUID
    parent_id: uuid.UUID
    user_id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    relationship_type: str
    is_primary_guardian: bool
    verification_status: str
    status: str
    linked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParentLinkResponse(BaseModel):
    message: str
    relationship_id: uuid.UUID
    parent_id: uuid.UUID
    student_id: uuid.UUID
    relationship_type: str
    is_primary_guardian: bool


class ParentUnlinkResponse(BaseModel):
    message: str
    parent_id: uuid.UUID
    student_id: uuid.UUID


class ParentNotificationItem(BaseModel):
    id: str
    title: str
    message: str
    category: str
    created_at: datetime
    is_read: bool = False

