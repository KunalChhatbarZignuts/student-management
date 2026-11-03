import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field, computed_field


class TeacherSubjectItemCreate(BaseModel):
    subject_id: uuid.UUID
    grade_id: uuid.UUID | None = None
    section_id: uuid.UUID | None = None


class TeacherSubjectAssignmentCreate(BaseModel):
    teacher_id: uuid.UUID
    subject_id: uuid.UUID
    academic_year_id: uuid.UUID | None = None
    grade_id: uuid.UUID | None = None
    section_id: uuid.UUID | None = None


class TeacherSubjectBulkCreate(BaseModel):
    teacher_id: uuid.UUID
    academic_year_id: uuid.UUID | None = None
    assignments: list[TeacherSubjectItemCreate] = Field(..., min_length=1)


class TeacherSubjectUpdate(BaseModel):
    grade_id: uuid.UUID | None = None
    section_id: uuid.UUID | None = None
    status: str | None = None  # active, inactive


class TeacherSubjectResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    teacher_name: str
    employee_code: str
    teacher_email: str | None = None
    department: str | None = None
    subject_id: uuid.UUID
    subject_name: str
    subject_code: str
    academic_year_id: uuid.UUID | None = None
    academic_year_name: str | None = None
    grade_id: uuid.UUID | None = None
    grade_name: str | None = None
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    status: str
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherSubjectTeacherItem(BaseModel):
    assignment_id: uuid.UUID
    teacher_id: uuid.UUID
    teacher_name: str
    employee_code: str
    teacher_email: str | None = None
    department: str
    grade_id: uuid.UUID | None = None
    grade_name: str | None = None
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    academic_year_name: str | None = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class TeacherProfileAssignedSection(BaseModel):
    section_id: uuid.UUID
    section_name: str
    grade_name: str
    academic_year: str
    role: str
    total_students: int


class TeacherProfileWithSubjectsResponse(BaseModel):
    teacher_id: uuid.UUID
    user_id: uuid.UUID
    employee_code: str
    first_name: str
    last_name: str
    department: str
    phone: str | None = None
    email: str
    status: str
    assigned_sections: list[TeacherProfileAssignedSection] = Field(default_factory=list)
    assigned_subjects: list[TeacherSubjectResponse] = Field(default_factory=list)

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    model_config = ConfigDict(from_attributes=True)

