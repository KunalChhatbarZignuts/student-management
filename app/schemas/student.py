import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StudentCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    dob: date
    department: str = Field("General", min_length=1, max_length=50)
    admission_date: date
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_email: EmailStr | None = None

    # Mandatory Academic Structure references for atomic initial enrollment
    academic_year_id: uuid.UUID = Field(..., description="Academic year ID for initial enrollment")
    grade_id: uuid.UUID = Field(..., description="Grade ID for initial enrollment")
    section_id: uuid.UUID = Field(..., description="Section ID for initial enrollment")

    # Optional fallback strings
    class_name: str | None = None
    section: str | None = None

    # Optional initial password for direct account provisioning
    password: str | None = Field(None, min_length=6, max_length=128)


class StudentUpdatePayload(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    dob: date | None = None
    gender: str | None = Field(None, pattern="^(male|female|other|Male|Female|Other)$")
    phone: str | None = Field(None, max_length=30)
    alternate_phone: str | None = Field(None, max_length=30)
    department: str | None = Field(None, min_length=1, max_length=50)
    address: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    previous_school_name: str | None = Field(None, max_length=200)
    previous_school_details: str | None = Field(None, max_length=500)
    admission_date: date | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_email: EmailStr | None = None
    status: str | None = None

    # Optional transfer fields to update enrollment while preserving history
    target_academic_year_id: uuid.UUID | None = None
    target_grade_id: uuid.UUID | None = None
    target_section_id: uuid.UUID | None = None
    transfer_reason: str | None = None


class StudentResponse(BaseModel):
    id: uuid.UUID
    student_code: str
    enrollment_number: str | None = None
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
    initial_password: str | None = None
    login_identifier: str | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentDetailResponse(StudentResponse):
    email: EmailStr | None = None
    user_status: str | None = None
    current_academic_year: str | None = None
    current_grade: str | None = None
    current_section: str | None = None
    class_teacher_name: str | None = None


class PaginatedStudentsResponse(BaseModel):
    items: list[StudentResponse]
    total: int
    skip: int
    limit: int


class StudentCreateResponse(BaseModel):
    student: StudentResponse
    enrollment_number: str
    user_status: str
    invite_expires_at: datetime
    invite_token: str  # returned on creation in dev so admin can distribute/inspect
    initial_password: str | None = None
    login_identifier: str | None = None

