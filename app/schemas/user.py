import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class StudentProfile(BaseModel):
    id: uuid.UUID
    student_code: str
    first_name: str
    last_name: str
    dob: date
    class_name: str
    section: str
    department: str
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_email: str | None = None
    admission_date: date
    status: str

    model_config = ConfigDict(from_attributes=True)


class TeacherProfile(BaseModel):
    id: uuid.UUID
    employee_code: str
    first_name: str
    last_name: str
    department: str
    phone: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ParentProfile(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    phone: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    status: str
    must_change_password: bool
    totp_enabled: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    student: StudentProfile | None = None
    teacher: TeacherProfile | None = None
    parent: ParentProfile | None = None

    model_config = ConfigDict(from_attributes=True)
