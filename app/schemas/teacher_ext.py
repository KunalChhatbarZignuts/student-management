import uuid
from pydantic import BaseModel, Field

from app.schemas.student import StudentResponse


class MissingStudentRequest(BaseModel):
    student_name: str = Field(..., min_length=2, max_length=100)
    class_name: str = Field(..., min_length=1, max_length=20)
    section: str = Field(..., min_length=1, max_length=10)
    notes: str | None = None


class MissingStudentResponse(BaseModel):
    message: str
    request_id: uuid.UUID


class TeacherClassesResponse(BaseModel):
    department: str
    students: list[StudentResponse]
