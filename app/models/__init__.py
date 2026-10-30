"""Import all models so Alembic and relationship lookups can discover them."""

from app.models.academic import FeeInvoice, StudentMark
from app.models.academic_structure import (
    AcademicYear,
    ClassGroup,
    EnrollmentStatus,
    Grade,
    GradeSubject,
    Period,
    Shift,
    StudentEnrollment,
    TeacherSubject,
)
from app.models.application import Application
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus
from app.models.audit_log import AuditLog
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
    "Application",
    "AttendanceRecord",
    "AttendanceSession",
    "AttendanceStatus",
    "AuditLog",
    "Class",
    "ClassGroup",
    "EnrollmentStatus",
    "FeeInvoice",
    "Grade",
    "GradeSubject",
    "IdCounter",
    "Invite",
    "Parent",
    "ParentStudentLink",
    "PasswordReset",
    "Period",
    "RefreshToken",
    "Shift",
    "Student",
    "StudentEnrollment",
    "StudentMark",
    "Subject",
    "Teacher",
    "TeacherAssignment",
    "TeacherSubject",
    "User",
]
