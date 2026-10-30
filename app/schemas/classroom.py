import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ClassCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    section: str = Field(..., min_length=1, max_length=20)
    academic_year: str = Field("2026-2027", min_length=4, max_length=20)
    department: str = Field(..., min_length=1, max_length=50)


class ClassResponse(BaseModel):
    id: uuid.UUID
    name: str
    section: str
    academic_year: str
    department: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassListResponse(BaseModel):
    items: list[ClassResponse]
    total: int
    page: int
    size: int


class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)


class SubjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubjectListResponse(BaseModel):
    items: list[SubjectResponse]
    total: int
    page: int
    size: int


class TeacherAssignmentCreate(BaseModel):
    teacher_id: uuid.UUID
    class_id: uuid.UUID
    subject_id: uuid.UUID
    is_class_teacher: bool = False
    academic_year: str = Field("2026-2027", min_length=4, max_length=20)


class TeacherAssignmentResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    class_id: uuid.UUID
    subject_id: uuid.UUID
    is_class_teacher: bool
    academic_year: str
    status: str
    created_at: datetime

    # Denormalized / enriched fields for convenient consumer consumption
    class_name: str | None = None
    section: str | None = None
    subject_name: str | None = None
    subject_code: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TeacherAssignmentListResponse(BaseModel):
    items: list[TeacherAssignmentResponse]
    total: int
    page: int
    size: int


class StudentRosterItem(BaseModel):
    id: uuid.UUID
    student_code: str
    name: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class ClassRosterResponse(BaseModel):
    class_id: uuid.UUID
    class_name: str
    section: str
    items: list[StudentRosterItem]
    total: int
    page: int
    size: int

