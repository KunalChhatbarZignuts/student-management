import datetime as dt
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    Table,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.academic_structure import AcademicYear, Grade, Section
    from app.models.user import User


# Many-to-many associations for holiday grade and section applicability
holiday_grade_associations = Table(
    "holiday_grade_associations",
    Base.metadata,
    Column("holiday_id", Uuid, ForeignKey("school_holidays.id", ondelete="CASCADE"), primary_key=True),
    Column("grade_id", Uuid, ForeignKey("grades.id", ondelete="CASCADE"), primary_key=True),
)

holiday_section_associations = Table(
    "holiday_section_associations",
    Base.metadata,
    Column("holiday_id", Uuid, ForeignKey("school_holidays.id", ondelete="CASCADE"), primary_key=True),
    Column("section_id", Uuid, ForeignKey("sections.id", ondelete="CASCADE"), primary_key=True),
)


class HolidayCategory(TimestampMixin, Base):
    __tablename__ = "holiday_categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    holidays: Mapped[list["SchoolHoliday"]] = relationship("SchoolHoliday", back_populates="category")

    def __repr__(self) -> str:
        return f"<HolidayCategory {self.name} ({self.code})>"


class SchoolHoliday(TimestampMixin, Base):
    __tablename__ = "school_holidays"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("holiday_categories.id", ondelete="RESTRICT"), nullable=False
    )
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False
    )
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active, cancelled
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    category: Mapped["HolidayCategory"] = relationship("HolidayCategory", back_populates="holidays")
    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    created_by: Mapped["User | None"] = relationship("User")

    applicable_grades: Mapped[list["Grade"]] = relationship(
        "Grade", secondary=holiday_grade_associations, lazy="selectin"
    )
    applicable_sections: Mapped[list["Section"]] = relationship(
        "Section", secondary=holiday_section_associations, lazy="selectin"
    )
    audit_history: Mapped[list["HolidayAuditHistory"]] = relationship(
        "HolidayAuditHistory", back_populates="holiday", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_school_holidays_academic_year_dates", "academic_year_id", "start_date", "end_date"),
        Index("ix_school_holidays_category", "category_id"),
        Index("ix_school_holidays_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<SchoolHoliday {self.name} ({self.start_date} to {self.end_date})>"


class SchoolCalendarSettings(TimestampMixin, Base):
    __tablename__ = "school_calendar_settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    # List of weekday numbers that are non-working days (0=Monday, 6=Sunday). Default: [6] (Sundays)
    weekly_off_days: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    updated_by: Mapped["User | None"] = relationship("User")

    def __repr__(self) -> str:
        return f"<SchoolCalendarSettings year={self.academic_year_id} offs={self.weekly_off_days}>"


class CalendarSpecialWorkingDay(TimestampMixin, Base):
    __tablename__ = "calendar_special_working_days"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    academic_year_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")
    created_by: Mapped["User | None"] = relationship("User")

    __table_args__ = (
        Index("ix_special_working_days_year_date", "academic_year_id", "date"),
    )

    def __repr__(self) -> str:
        return f"<CalendarSpecialWorkingDay date={self.date} reason={self.reason}>"


class HolidayAuditHistory(Base):
    __tablename__ = "holiday_audit_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    holiday_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("school_holidays.id", ondelete="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # CREATED, UPDATED, CANCELLED, DELETED
    previous_state: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    new_state: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    modified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: dt.datetime.now(dt.timezone.utc)
    )

    holiday: Mapped["SchoolHoliday"] = relationship("SchoolHoliday", back_populates="audit_history")
    modified_by: Mapped["User | None"] = relationship("User")

    __table_args__ = (
        Index("ix_holiday_audit_holiday", "holiday_id"),
        Index("ix_holiday_audit_action", "action"),
    )

    def __repr__(self) -> str:
        return f"<HolidayAuditHistory holiday={self.holiday_id} action={self.action}>"

