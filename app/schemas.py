from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class CourseBase(BaseModel):
    title: str
    code: str
    description: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class CourseResponse(CourseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    age: Optional[int] = None
    grade: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    grade: Optional[str] = None


class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    courses: List[CourseResponse] = []

    model_config = ConfigDict(from_attributes=True)

