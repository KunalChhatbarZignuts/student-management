import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class TeacherProfileDetails(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    department: str
    phone: str | None = None
    email: EmailStr | None = None
    is_active: bool = True
    created_at: datetime
    user_id: uuid.UUID
    user_status: str | None = None
    must_change_password: bool = False

    model_config = ConfigDict(from_attributes=True)


class TeacherClassRole(BaseModel):
    grade_name: str
    section_name: str
    academic_year_name: str | None = None
    role: str = "Class Teacher"
    assigned_at: datetime | None = None


class TeacherSubjectAllocation(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: str
    subject_code: str
    grade_name: str
    section_name: str
    periods_per_week: int = 0
    status: str = "active"


class TeacherTimetableSlot(BaseModel):
    day_of_week: str  # MONDAY - FRIDAY
    period_name: str
    start_time: str
    end_time: str
    grade_name: str
    section_name: str
    subject_name: str
    subject_code: str | None = None
    room_number: str | None = None


class TeacherAttendanceSessionLog(BaseModel):
    id: uuid.UUID
    date: date
    grade_name: str
    section_name: str
    subject_name: str | None = None
    total_students: int = 0
    present_count: int = 0
    recorded_at: datetime


class TeacherWorkloadMetrics(BaseModel):
    total_assigned_subjects: int = 0
    total_weekly_periods: int = 0
    total_assigned_sections: int = 0
    has_class_teacher_role: bool = False


class ComprehensiveTeacherDetailResponse(BaseModel):
    teacher_id: uuid.UUID
    employee_code: str
    profile: TeacherProfileDetails
    class_teacher_role: TeacherClassRole | None = None
    workload: TeacherWorkloadMetrics
    subject_allocations: list[TeacherSubjectAllocation] = []
    timetable: list[TeacherTimetableSlot] = []
    attendance_activity: list[TeacherAttendanceSessionLog] = []
    hr_notice: str = "Staff biometric HR clock-in and staff leave applications are maintained externally."

