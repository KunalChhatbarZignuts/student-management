"""Import all models so Alembic and relationship lookups can discover them."""

from app.models.academic import FeeInvoice, StudentMark
from app.models.admission import Admission
from app.models.fee import (
    FeeComponent,
    FeeInstallment,
    FeeStructure,
    FeeStructureItem,
    StudentFeeAdjustment,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
)
from app.models.academic_structure import (
    AcademicYear,
    ClassGroup,
    EnrollmentStatus,
    Grade,
    GradeSubject,
    Period,
    Section,
    Shift,
    StudentEnrollment,
    TeacherSubject,
)
from app.models.application import Application
from app.models.attendance import (
    AttendanceAuditHistory,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
)
from app.models.audit_log import AuditLog
from app.models.calendar import (
    CalendarSpecialWorkingDay,
    HolidayAuditHistory,
    HolidayCategory,
    SchoolCalendarSettings,
    SchoolHoliday,
    holiday_grade_associations,
    holiday_section_associations,
)
from app.models.classroom import Class, Subject, TeacherAssignment
from app.models.id_counter import IdCounter
from app.models.invite import Invite
from app.models.parent import Parent, ParentStudentLink
from app.models.password_reset import PasswordReset
from app.models.refresh_token import RefreshToken
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User

__all__ = [
    "AcademicYear",
    "Admission",
    "Application",
    "AttendanceAuditHistory",
    "AttendanceRecord",
    "AttendanceSession",
    "AttendanceStatus",
    "AuditLog",
    "CalendarSpecialWorkingDay",
    "Class",
    "ClassGroup",
    "EnrollmentStatus",
    "FeeComponent",
    "FeeInstallment",
    "FeeInvoice",
    "FeeStructure",
    "FeeStructureItem",
    "Grade",
    "GradeSubject",
    "HolidayAuditHistory",
    "HolidayCategory",
    "IdCounter",
    "Invite",
    "Parent",
    "ParentStudentLink",
    "PasswordReset",
    "Period",
    "RefreshToken",
    "SchoolCalendarSettings",
    "SchoolHoliday",
    "Section",
    "Shift",
    "Student",
    "StudentEnrollment",
    "StudentFeeAdjustment",
    "StudentFeeAssignment",
    "StudentFeeAssignmentItem",
    "StudentMark",
    "Subject",
    "Teacher",
    "TeacherAssignment",
    "TeacherSubject",
    "User",
]
