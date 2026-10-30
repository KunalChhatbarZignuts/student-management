"""Import all models so Alembic and relationship lookups can discover them."""

from app.models.application import Application
from app.models.audit_log import AuditLog
from app.models.id_counter import IdCounter
from app.models.invite import Invite
from app.models.parent import Parent, ParentStudentLink
from app.models.password_reset import PasswordReset
from app.models.refresh_token import RefreshToken
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User

__all__ = [
    "Application",
    "AuditLog",
    "IdCounter",
    "Invite",
    "Parent",
    "ParentStudentLink",
    "PasswordReset",
    "RefreshToken",
    "Student",
    "Teacher",
    "User",
]
