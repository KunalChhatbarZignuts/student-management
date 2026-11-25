import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# Grade Schemas
# ==========================================

class AcademicYearResponse(BaseModel):
    id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    is_current: bool
    status: str

    model_config = ConfigDict(from_attributes=True)


class GradeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    code: str | None = Field(None, max_length=20)
    description: str | None = Field(None, max_length=255)
    level: int = Field(1, ge=0, le=20)
    academic_year_id: uuid.UUID
    shift_id: uuid.UUID | None = None
    coordinator_teacher_id: uuid.UUID | None = None


class GradeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    code: str | None = Field(None, max_length=20)
    description: str | None = Field(None, max_length=255)
    level: int | None = Field(None, ge=0, le=20)
    shift_id: uuid.UUID | None = None
    coordinator_teacher_id: uuid.UUID | None = None


class GradeStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$")


class GradeResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str | None = None
    description: str | None = None
    level: int
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    coordinator_teacher_id: uuid.UUID | None = None
    coordinator_name: str | None = None
    shift_id: uuid.UUID | None = None
    shift_name: str | None = None
    status: str
    total_sections: int = 0
    total_students: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GradeListResponse(BaseModel):
    items: list[GradeResponse]
    total: int
    page: int
    size: int


# ==========================================
# Section Schemas
# ==========================================

class SectionCreate(BaseModel):
    grade_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=50)
    code: str | None = Field(None, max_length=20)
    academic_year_id: uuid.UUID
    class_capacity: int | None = Field(30, ge=1, le=100)
    assigned_teacher_id: uuid.UUID | None = None


class SectionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    code: str | None = Field(None, max_length=20)
    class_capacity: int | None = Field(None, ge=1, le=100)


class SectionStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$")


class SectionResponse(BaseModel):
    id: uuid.UUID
    grade_id: uuid.UUID
    grade_name: str | None = None
    name: str
    code: str | None = None
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    class_capacity: int | None = 30
    status: str
    assigned_teacher_id: uuid.UUID | None = None
    assigned_teacher_name: str | None = None
    total_students: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SectionListResponse(BaseModel):
    items: list[SectionResponse]
    total: int
    page: int
    size: int


class GradeDetailResponse(GradeResponse):
    sections: list[SectionResponse] = []


# ==========================================
# Teacher Assignment Schemas
# ==========================================

class AssignTeacherPayload(BaseModel):
    teacher_id: uuid.UUID


class TeacherAssignmentItem(BaseModel):
    id: uuid.UUID
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    grade_name: str | None = None
    teacher_id: uuid.UUID
    teacher_name: str | None = None
    employee_code: str | None = None
    assignment_type: str
    start_date: date
    end_date: date | None = None
    is_active: bool
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherSectionItem(BaseModel):
    section_id: uuid.UUID
    section_name: str
    section_code: str | None = None
    grade_id: uuid.UUID
    grade_name: str
    academic_year: str
    total_students: int = 0
    role: str  # CLASS_TEACHER or GRADE_COORDINATOR


class TeacherMySectionsResponse(BaseModel):
    teacher_id: uuid.UUID
    teacher_name: str
    sections: list[TeacherSectionItem]


# ==========================================
# Student Enrollment Schemas
# ==========================================

class StudentEnrollPayload(BaseModel):
    grade_id: uuid.UUID
    section_id: uuid.UUID
    academic_year_id: uuid.UUID
    roll_no: int | None = 1
    enrollment_date: date | None = None


class StudentTransferPayload(BaseModel):
    target_section_id: uuid.UUID
    target_grade_id: uuid.UUID | None = None
    transfer_date: date | None = None
    reason: str | None = Field(None, max_length=255)


class StudentPromotePayload(BaseModel):
    target_grade_id: uuid.UUID
    target_section_id: uuid.UUID
    target_academic_year_id: uuid.UUID
    effective_date: date | None = None


class EnrolledStudentItem(BaseModel):
    enrollment_id: uuid.UUID
    student_id: uuid.UUID
    student_code: str
    first_name: str
    last_name: str
    roll_no: int
    status: str
    enrollment_date: date
    left_on: date | None = None


class SectionStudentsResponse(BaseModel):
    section_id: uuid.UUID
    section_name: str
    grade_name: str
    total_students: int
    capacity: int | None = None
    items: list[EnrolledStudentItem]


class StudentEnrollmentHistoryItem(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    grade_id: uuid.UUID | None = None
    grade_name: str | None = None
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    roll_no: int
    status: str
    enrollment_date: date
    left_on: date | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
