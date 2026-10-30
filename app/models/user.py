import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.audit_log import AuditLog
    from app.models.invite import Invite
    from app.models.parent import Parent
    from app.models.password_reset import PasswordReset
    from app.models.refresh_token import RefreshToken
    from app.models.student import Student
    from app.models.teacher import Teacher


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"


class UserStatus(str, enum.Enum):
    PENDING = "pending"
    INVITED = "invited"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    LOCKED = "locked"
    DEACTIVATED = "deactivated"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=UserStatus.PENDING.value)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student | None"] = relationship("Student", back_populates="user", uselist=False)
    teacher: Mapped["Teacher | None"] = relationship("Teacher", back_populates="user", uselist=False)
    parent: Mapped["Parent | None"] = relationship("Parent", back_populates="user", uselist=False)
    invites: Mapped[list["Invite"]] = relationship("Invite", back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship("RefreshToken", back_populates="user")
    password_resets: Mapped[list["PasswordReset"]] = relationship("PasswordReset", back_populates="user")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="actor")

    __table_args__ = (
        Index("ix_users_email", "email"),
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role} status={self.status}>"

