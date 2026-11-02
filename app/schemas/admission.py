import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.fee import AdmissionFeeAssignmentPayload, StudentFeeAssignmentResponse


class AdmissionStudentPayload(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    dob: date
    gender: str = Field(..., pattern="^(male|female|other|Male|Female|Other)$")
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    alternate_phone: str | None = Field(None, max_length=30)
    address: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    profile_photo: str | None = Field(None, max_length=500)
    previous_school_name: str | None = Field(None, max_length=200)
    previous_school_details: str | None = Field(None, max_length=500)
    department: str = Field("General", max_length=50)
    password: str | None = Field(None, min_length=6, max_length=128)


class AdmissionParentPayload(BaseModel):
    existing_parent_id: uuid.UUID | None = None
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = Field(None, max_length=255)
    relationship_type: str = Field("Guardian", pattern="^(Father|Mother|Guardian|Other)$")
    is_primary_guardian: bool = False
    password: str | None = Field(None, min_length=6, max_length=128)


class AdmissionCreateRequest(BaseModel):
    student: AdmissionStudentPayload
    parents: list[AdmissionParentPayload] = Field(..., min_length=1)
    academic_year_id: uuid.UUID
    grade_id: uuid.UUID
    section_id: uuid.UUID
    admission_date: date
    create_student_account: bool = True
    notes: str | None = None
    fee_assignment: AdmissionFeeAssignmentPayload | None = None


class AdmissionParentSummary(BaseModel):
    parent_id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    relationship_type: str
    is_primary_guardian: bool
    initial_password: str | None = None
    account_status: str

    model_config = ConfigDict(from_attributes=True)


class StudentAccountSummary(BaseModel):
    user_id: uuid.UUID
    email: str
    login_identifier: str
    initial_password: str | None = None
    account_status: str


class StudentDetailsSummary(BaseModel):
    id: uuid.UUID
    enrollment_number: str
    student_code: str
    first_name: str
    middle_name: str | None = None
    last_name: str
    gender: str | None = None
    dob: date
    email: str


class AcademicDetailsSummary(BaseModel):
    academic_year_id: uuid.UUID
    academic_year_name: str
    grade_id: uuid.UUID
    grade_name: str
    section_id: uuid.UUID
    section_name: str
    roll_no: int
    class_teacher_name: str | None = None
    class_teacher_employee_code: str | None = None
    grade_coordinator_name: str | None = None


class AdmissionResponse(BaseModel):
    admission_id: uuid.UUID
    admission_number: str
    status: str
    admission_date: date
    student: StudentDetailsSummary
    student_account: StudentAccountSummary
    academic: AcademicDetailsSummary
    parents: list[AdmissionParentSummary]
    fee_assignment: StudentFeeAssignmentResponse | None = None
    created_at: datetime


class AdmissionListItem(BaseModel):
    id: uuid.UUID
    admission_number: str
    enrollment_number: str
    student_name: str
    grade_name: str
    section_name: str
    academic_year_name: str
    class_teacher_name: str | None = None
    admission_date: date
    status: str
    created_at: datetime


class PaginatedAdmissionsResponse(BaseModel):
    items: list[AdmissionListItem]
    total: int
    skip: int
    limit: int

