import calendar
import datetime as dt
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.academic_structure import AcademicYear, Grade, Section
from app.models.attendance import AttendanceSession
from app.models.calendar import (
    CalendarSpecialWorkingDay,
    HolidayAuditHistory,
    HolidayCategory,
    SchoolCalendarSettings,
    SchoolHoliday,
)
from app.schemas.calendar import (
    DateWorkingStatusResponse,
    GradeSimpleInfo,
    HolidayCategoryCreate,
    MonthCalendarResponse,
    MonthlyCalendarDay,
    SchoolCalendarSettingsUpdate,
    SchoolHolidayCancelRequest,
    SchoolHolidayCreate,
    SchoolHolidayResponse,
    SchoolHolidayUpdate,
    SpecialWorkingDayCreate,
)

DEFAULT_CATEGORIES = [
    ("Public Holiday", "public_holiday", "Recognized public or government holiday", True),
    ("National Holiday", "national_holiday", "National independence or republic days", True),
    ("Religious Festival", "religious_festival", "Religious festival and celebrations", True),
    ("Diwali Vacation", "diwali_vacation", "Annual Diwali vacation period", True),
    ("Summer Vacation", "summer_vacation", "Annual summer school vacation", True),
    ("Winter Vacation", "winter_vacation", "Annual winter or Christmas vacation", True),
    ("School Holiday", "school_holiday", "Institutional holiday or administrative off-day", True),
    ("Other", "other", "Other holiday or discretionary non-working day", True),
]

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def seed_default_holiday_categories(db: Session) -> list[HolidayCategory]:
    """Seeds standard holiday categories if they do not exist."""
    categories = []
    for name, code, desc, is_sys in DEFAULT_CATEGORIES:
        existing = db.execute(
            select(HolidayCategory).where(HolidayCategory.code == code)
        ).scalar_one_or_none()
        if not existing:
            cat = HolidayCategory(
                name=name,
                code=code,
                description=desc,
                is_system=is_sys,
                is_active=True,
            )
            db.add(cat)
            categories.append(cat)
        else:
            categories.append(existing)
    db.commit()
    return categories


def get_holiday_categories(db: Session, active_only: bool = True) -> list[HolidayCategory]:
    query = select(HolidayCategory)
    if active_only:
        query = query.where(HolidayCategory.is_active.is_(True))
    query = query.order_by(HolidayCategory.name.asc())
    results = db.execute(query).scalars().all()
    if not results:
        seed_default_holiday_categories(db)
        results = db.execute(query).scalars().all()
    return list(results)


def create_holiday_category(payload: HolidayCategoryCreate, db: Session) -> HolidayCategory:
    existing = db.execute(
        select(HolidayCategory).where(
            or_(
                HolidayCategory.name.ilike(payload.name),
                HolidayCategory.code == payload.code.strip().lower(),
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with name '{payload.name}' or code '{payload.code}' already exists",
        )
    cat = HolidayCategory(
        name=payload.name,
        code=payload.code.strip().lower(),
        description=payload.description,
        is_system=False,
        is_active=payload.is_active,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def get_calendar_settings(academic_year_id: uuid.UUID, db: Session) -> SchoolCalendarSettings:
    settings_obj = db.execute(
        select(SchoolCalendarSettings).where(
            SchoolCalendarSettings.academic_year_id == academic_year_id
        )
    ).scalar_one_or_none()
    if not settings_obj:
        # Default to Sunday (day 6) as weekly off
        settings_obj = SchoolCalendarSettings(
            academic_year_id=academic_year_id,
            weekly_off_days=[6],
        )
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
    return settings_obj


def update_calendar_settings(
    academic_year_id: uuid.UUID,
    payload: SchoolCalendarSettingsUpdate,
    actor_user_id: uuid.UUID,
    db: Session,
) -> SchoolCalendarSettings:
    settings_obj = get_calendar_settings(academic_year_id, db)
    settings_obj.weekly_off_days = payload.weekly_off_days
    settings_obj.updated_by_user_id = actor_user_id
    db.commit()
    db.refresh(settings_obj)
    return settings_obj


def add_special_working_day(
    payload: SpecialWorkingDayCreate,
    actor_user_id: uuid.UUID,
    db: Session,
) -> CalendarSpecialWorkingDay:
    existing = db.execute(
        select(CalendarSpecialWorkingDay).where(
            CalendarSpecialWorkingDay.academic_year_id == payload.academic_year_id,
            CalendarSpecialWorkingDay.date == payload.date,
        )
    ).scalar_one_or_none()
    if existing:
        existing.reason = payload.reason
        existing.created_by_user_id = actor_user_id
        db.commit()
        db.refresh(existing)
        return existing

    special = CalendarSpecialWorkingDay(
        academic_year_id=payload.academic_year_id,
        date=payload.date,
        reason=payload.reason,
        created_by_user_id=actor_user_id,
    )
    db.add(special)
    db.commit()
    db.refresh(special)
    return special


def get_special_working_days(
    academic_year_id: uuid.UUID,
    db: Session,
) -> list[CalendarSpecialWorkingDay]:
    return list(
        db.execute(
            select(CalendarSpecialWorkingDay)
            .where(CalendarSpecialWorkingDay.academic_year_id == academic_year_id)
            .order_by(CalendarSpecialWorkingDay.date.asc())
        ).scalars().all()
    )


def delete_special_working_day(
    special_id: uuid.UUID,
    db: Session,
) -> None:
    special = db.get(CalendarSpecialWorkingDay, special_id)
    if not special:
        raise HTTPException(status_code=404, detail="Special working day not found")
    db.delete(special)
    db.commit()


def check_date_working_status(
    target_date: dt.date,
    academic_year_id: uuid.UUID,
    grade_id: uuid.UUID | None,
    section_id: uuid.UUID | None,
    db: Session,
) -> DateWorkingStatusResponse:
    """Evaluates whether a given date is a working day or non-working day."""
    # 1. Check special compensatory working day override
    special = db.execute(
        select(CalendarSpecialWorkingDay).where(
            CalendarSpecialWorkingDay.academic_year_id == academic_year_id,
            CalendarSpecialWorkingDay.date == target_date,
        )
    ).scalar_one_or_none()
    if special:
        return DateWorkingStatusResponse(
            date=target_date,
            is_working_day=True,
            day_type="special_working_day",
            reason=f"Compensatory Working Day: {special.reason}",
            holiday_name=None,
            holiday_category=None,
            can_mark_attendance=True,
        )

    # 2. Check active holidays
    holiday_query = (
        select(SchoolHoliday)
        .where(
            SchoolHoliday.academic_year_id == academic_year_id,
            SchoolHoliday.status == "active",
            SchoolHoliday.start_date <= target_date,
            SchoolHoliday.end_date >= target_date,
        )
    )
    holidays = db.execute(holiday_query).scalars().all()
    for h in holidays:
        # Check applicability
        has_grades = len(h.applicable_grades) > 0
        has_sections = len(h.applicable_sections) > 0

        # If school-wide (no specific grades or sections), it applies!
        is_applicable = not has_grades and not has_sections
        if has_grades and grade_id and any(g.id == grade_id for g in h.applicable_grades):
            is_applicable = True
        if has_sections and section_id and any(s.id == section_id for s in h.applicable_sections):
            is_applicable = True

        if is_applicable:
            return DateWorkingStatusResponse(
                date=target_date,
                is_working_day=False,
                day_type="holiday",
                reason=h.description or f"School Holiday: {h.name}",
                holiday_name=h.name,
                holiday_category=h.category.name if h.category else None,
                can_mark_attendance=False,
            )

    # 3. Check weekly off
    settings_obj = get_calendar_settings(academic_year_id, db)
    weekday = target_date.weekday()  # 0=Monday, 6=Sunday
    if weekday in settings_obj.weekly_off_days:
        day_name = DAY_NAMES[weekday]
        return DateWorkingStatusResponse(
            date=target_date,
            is_working_day=False,
            day_type="weekly_off",
            reason=f"Weekly Off ({day_name})",
            holiday_name=None,
            holiday_category=None,
            can_mark_attendance=False,
        )

    # 4. Regular working day
    return DateWorkingStatusResponse(
        date=target_date,
        is_working_day=True,
        day_type="working_day",
        reason="Regular School Day",
        holiday_name=None,
        holiday_category=None,
        can_mark_attendance=True,
    )


def create_school_holiday(
    payload: SchoolHolidayCreate,
    actor_user_id: uuid.UUID,
    db: Session,
) -> SchoolHolidayResponse:
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Holiday end_date cannot be earlier than start_date",
        )

    ay = db.get(AcademicYear, payload.academic_year_id)
    if not ay:
        raise HTTPException(status_code=404, detail="Academic year not found")

    cat = db.get(HolidayCategory, payload.category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Holiday category not found")

    # Check for attendance conflicts
    conflict_query = select(AttendanceSession).where(
        AttendanceSession.academic_year_id == payload.academic_year_id,
        AttendanceSession.date >= payload.start_date,
        AttendanceSession.date <= payload.end_date,
    )
    if payload.grade_ids:
        conflict_query = conflict_query.where(AttendanceSession.grade_id.in_(payload.grade_ids))
    if payload.section_ids:
        conflict_query = conflict_query.where(AttendanceSession.section_id.in_(payload.section_ids))

    existing_sessions = db.execute(conflict_query).scalars().all()
    if existing_sessions and not payload.confirm_attendance_override:
        dates_affected = sorted(list({str(s.date) for s in existing_sessions}))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"Attendance records already exist for {len(existing_sessions)} session(s) between {payload.start_date} and {payload.end_date}.",
                "dates_affected": dates_affected,
                "conflict_count": len(existing_sessions),
                "requires_confirmation": True,
            },
        )

    # Create SchoolHoliday
    holiday = SchoolHoliday(
        name=payload.name,
        category_id=payload.category_id,
        academic_year_id=payload.academic_year_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        description=payload.description,
        status="active",
        created_by_user_id=actor_user_id,
    )

    if payload.grade_ids:
        grades = db.execute(select(Grade).where(Grade.id.in_(payload.grade_ids))).scalars().all()
        holiday.applicable_grades = list(grades)

    if payload.section_ids:
        sections = db.execute(select(Section).where(Section.id.in_(payload.section_ids))).scalars().all()
        holiday.applicable_sections = list(sections)

    db.add(holiday)
    db.flush()

    # Audit log
    audit = HolidayAuditHistory(
        holiday_id=holiday.id,
        action="CREATED",
        previous_state=None,
        new_state={
            "name": holiday.name,
            "category": cat.name,
            "start_date": str(holiday.start_date),
            "end_date": str(holiday.end_date),
            "grades_count": len(holiday.applicable_grades),
        },
        reason="Holiday created",
        modified_by_user_id=actor_user_id,
    )
    db.add(audit)
    db.commit()
    db.refresh(holiday)

    return _to_holiday_response(holiday)


def update_school_holiday(
    holiday_id: uuid.UUID,
    payload: SchoolHolidayUpdate,
    actor_user_id: uuid.UUID,
    db: Session,
) -> SchoolHolidayResponse:
    holiday = db.get(SchoolHoliday, holiday_id)
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    prev_state = {
        "name": holiday.name,
        "start_date": str(holiday.start_date),
        "end_date": str(holiday.end_date),
        "status": holiday.status,
    }

    if payload.name is not None:
        holiday.name = payload.name
    if payload.category_id is not None:
        cat = db.get(HolidayCategory, payload.category_id)
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        holiday.category_id = payload.category_id
    if payload.start_date is not None:
        holiday.start_date = payload.start_date
    if payload.end_date is not None:
        holiday.end_date = payload.end_date
    if payload.description is not None:
        holiday.description = payload.description

    if holiday.end_date < holiday.start_date:
        raise HTTPException(status_code=400, detail="Holiday end_date cannot be earlier than start_date")

    if payload.grade_ids is not None:
        grades = db.execute(select(Grade).where(Grade.id.in_(payload.grade_ids))).scalars().all()
        holiday.applicable_grades = list(grades)

    if payload.section_ids is not None:
        sections = db.execute(select(Section).where(Section.id.in_(payload.section_ids))).scalars().all()
        holiday.applicable_sections = list(sections)

    # Audit log
    audit = HolidayAuditHistory(
        holiday_id=holiday.id,
        action="UPDATED",
        previous_state=prev_state,
        new_state={
            "name": holiday.name,
            "start_date": str(holiday.start_date),
            "end_date": str(holiday.end_date),
            "status": holiday.status,
        },
        reason=payload.reason or "Holiday details updated",
        modified_by_user_id=actor_user_id,
    )
    db.add(audit)
    db.commit()
    db.refresh(holiday)
    return _to_holiday_response(holiday)


def cancel_school_holiday(
    holiday_id: uuid.UUID,
    payload: SchoolHolidayCancelRequest,
    actor_user_id: uuid.UUID,
    db: Session,
) -> SchoolHolidayResponse:
    holiday = db.get(SchoolHoliday, holiday_id)
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    holiday.status = "cancelled"
    audit = HolidayAuditHistory(
        holiday_id=holiday.id,
        action="CANCELLED",
        previous_state={"status": "active"},
        new_state={"status": "cancelled"},
        reason=payload.reason,
        modified_by_user_id=actor_user_id,
    )
    db.add(audit)
    db.commit()
    db.refresh(holiday)
    return _to_holiday_response(holiday)


def delete_school_holiday(
    holiday_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    db: Session,
) -> None:
    holiday = db.get(SchoolHoliday, holiday_id)
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    # Check protected historical attendance dependency
    sessions = db.execute(
        select(AttendanceSession).where(
            AttendanceSession.academic_year_id == holiday.academic_year_id,
            AttendanceSession.date >= holiday.start_date,
            AttendanceSession.date <= holiday.end_date,
        )
    ).scalars().all()
    if sessions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete holiday with protected attendance history. Cancel/deactivate the holiday instead to preserve historical integrity.",
        )

    db.delete(holiday)
    db.commit()


def get_school_holidays(
    academic_year_id: uuid.UUID | None,
    category_id: uuid.UUID | None,
    grade_id: uuid.UUID | None,
    status_filter: str | None,
    start_date: dt.date | None,
    end_date: dt.date | None,
    db: Session,
) -> list[SchoolHolidayResponse]:
    query = select(SchoolHoliday)
    if academic_year_id:
        query = query.where(SchoolHoliday.academic_year_id == academic_year_id)
    if category_id:
        query = query.where(SchoolHoliday.category_id == category_id)
    if status_filter:
        query = query.where(SchoolHoliday.status == status_filter)
    if start_date:
        query = query.where(SchoolHoliday.end_date >= start_date)
    if end_date:
        query = query.where(SchoolHoliday.start_date <= end_date)

    query = query.order_by(SchoolHoliday.start_date.asc())
    holidays = db.execute(query).scalars().all()

    results = []
    for h in holidays:
        # If grade_id filter specified, filter by applicability
        if grade_id:
            if h.applicable_grades and not any(g.id == grade_id for g in h.applicable_grades):
                continue
        results.append(_to_holiday_response(h))
    return results


def get_monthly_calendar(
    year: int,
    month: int,
    academic_year_id: uuid.UUID,
    grade_id: uuid.UUID | None,
    db: Session,
) -> MonthCalendarResponse:
    num_days = calendar.monthrange(year, month)[1]
    start_date = dt.date(year, month, 1)
    end_date = dt.date(year, month, num_days)

    settings_obj = get_calendar_settings(academic_year_id, db)
    weekly_off_set = set(settings_obj.weekly_off_days)

    # Fetch holidays active in this month
    holidays = db.execute(
        select(SchoolHoliday).where(
            SchoolHoliday.academic_year_id == academic_year_id,
            SchoolHoliday.status == "active",
            SchoolHoliday.start_date <= end_date,
            SchoolHoliday.end_date >= start_date,
        )
    ).scalars().all()

    # Fetch special working days in this month
    specials = db.execute(
        select(CalendarSpecialWorkingDay).where(
            CalendarSpecialWorkingDay.academic_year_id == academic_year_id,
            CalendarSpecialWorkingDay.date >= start_date,
            CalendarSpecialWorkingDay.date <= end_date,
        )
    ).scalars().all()
    special_map = {s.date: s for s in specials}

    days_list: list[MonthlyCalendarDay] = []
    working_days_count = 0
    holidays_count = 0
    weekly_offs_count = 0

    for day_num in range(1, num_days + 1):
        cur_date = dt.date(year, month, day_num)
        weekday = cur_date.weekday()
        day_name = DAY_NAMES[weekday]

        # 1. Check special working day
        if cur_date in special_map:
            sp = special_map[cur_date]
            days_list.append(
                MonthlyCalendarDay(
                    date=cur_date,
                    day_of_week=weekday,
                    day_name=day_name,
                    is_working_day=True,
                    day_type="special_working_day",
                    label=sp.reason,
                    category_name=None,
                    is_school_wide=True,
                    applicable_grade_names=[],
                )
            )
            working_days_count += 1
            continue

        # 2. Check holidays
        holiday_match = None
        for h in holidays:
            if h.start_date <= cur_date <= h.end_date:
                has_grades = len(h.applicable_grades) > 0
                if grade_id:
                    if not has_grades or any(g.id == grade_id for g in h.applicable_grades):
                        holiday_match = h
                        break
                else:
                    holiday_match = h
                    break

        if holiday_match:
            days_list.append(
                MonthlyCalendarDay(
                    date=cur_date,
                    day_of_week=weekday,
                    day_name=day_name,
                    is_working_day=False,
                    day_type="holiday",
                    label=holiday_match.name,
                    category_name=holiday_match.category.name if holiday_match.category else None,
                    is_school_wide=len(holiday_match.applicable_grades) == 0,
                    applicable_grade_names=[g.name for g in holiday_match.applicable_grades],
                )
            )
            holidays_count += 1
            continue

        # 3. Check weekly off
        if weekday in weekly_off_set:
            days_list.append(
                MonthlyCalendarDay(
                    date=cur_date,
                    day_of_week=weekday,
                    day_name=day_name,
                    is_working_day=False,
                    day_type="weekly_off",
                    label=f"Weekly Off ({day_name})",
                    category_name=None,
                    is_school_wide=True,
                    applicable_grade_names=[],
                )
            )
            weekly_offs_count += 1
            continue

        # 4. Normal working day
        days_list.append(
            MonthlyCalendarDay(
                date=cur_date,
                day_of_week=weekday,
                day_name=day_name,
                is_working_day=True,
                day_type="working_day",
                label="Working Day",
                category_name=None,
                is_school_wide=True,
                applicable_grade_names=[],
            )
        )
        working_days_count += 1

    return MonthCalendarResponse(
        year=year,
        month=month,
        total_days=num_days,
        working_days=working_days_count,
        holidays=holidays_count,
        weekly_offs=weekly_offs_count,
        days=days_list,
    )


def _to_holiday_response(h: SchoolHoliday) -> SchoolHolidayResponse:
    return SchoolHolidayResponse(
        id=h.id,
        name=h.name,
        category_id=h.category_id,
        category_name=h.category.name if h.category else "Other",
        academic_year_id=h.academic_year_id,
        start_date=h.start_date,
        end_date=h.end_date,
        description=h.description,
        status=h.status,
        is_school_wide=len(h.applicable_grades) == 0 and len(h.applicable_sections) == 0,
        applicable_grades=[
            GradeSimpleInfo(id=g.id, name=g.name) for g in h.applicable_grades
        ],
        created_at=h.created_at,
        updated_at=h.updated_at,
    )
