import datetime as dt
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.academic_structure import AcademicYear
from app.models.user import User, UserRole
from app.schemas.calendar import (
    DateWorkingStatusResponse,
    HolidayCategoryCreate,
    HolidayCategoryResponse,
    MonthCalendarResponse,
    SchoolCalendarSettingsResponse,
    SchoolCalendarSettingsUpdate,
    SchoolHolidayCancelRequest,
    SchoolHolidayCreate,
    SchoolHolidayResponse,
    SchoolHolidayUpdate,
    SpecialWorkingDayCreate,
    SpecialWorkingDayResponse,
)
from app.services import calendar_service

router = APIRouter(tags=["Calendar & Holidays"])

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)
teacher_or_admin = require_roles(UserRole.TEACHER.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _get_active_academic_year(db: Session) -> AcademicYear:
    ay = db.query(AcademicYear).filter(AcademicYear.is_current.is_(True)).first()
    if not ay:
        ay = db.query(AcademicYear).order_by(AcademicYear.start_date.desc()).first()
    if not ay:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No active academic year found")
    return ay


# ==========================================
# ADMIN ENDPOINTS
# ==========================================

@router.get("/admin/calendar/categories", response_model=list[HolidayCategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    return calendar_service.get_holiday_categories(db, active_only=True)


@router.post("/admin/calendar/categories", response_model=HolidayCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: HolidayCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    return calendar_service.create_holiday_category(payload, db)


@router.get("/admin/calendar/holidays", response_model=list[SchoolHolidayResponse])
def get_admin_holidays(
    academic_year_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    if not academic_year_id:
        ay = _get_active_academic_year(db)
        academic_year_id = ay.id
    return calendar_service.get_school_holidays(
        academic_year_id=academic_year_id,
        category_id=category_id,
        grade_id=grade_id,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
        db=db,
    )


@router.post("/admin/calendar/holidays", response_model=SchoolHolidayResponse, status_code=status.HTTP_201_CREATED)
def create_holiday(
    payload: SchoolHolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    return calendar_service.create_school_holiday(payload, actor_user_id=current_user.id, db=db)


@router.put("/admin/calendar/holidays/{holiday_id}", response_model=SchoolHolidayResponse)
def update_holiday(
    holiday_id: uuid.UUID,
    payload: SchoolHolidayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    return calendar_service.update_school_holiday(holiday_id, payload, actor_user_id=current_user.id, db=db)


@router.post("/admin/calendar/holidays/{holiday_id}/cancel", response_model=SchoolHolidayResponse)
def cancel_holiday(
    holiday_id: uuid.UUID,
    payload: SchoolHolidayCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    return calendar_service.cancel_school_holiday(holiday_id, payload, actor_user_id=current_user.id, db=db)


@router.delete("/admin/calendar/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    calendar_service.delete_school_holiday(holiday_id, actor_user_id=current_user.id, db=db)


@router.get("/admin/calendar/settings", response_model=SchoolCalendarSettingsResponse)
def get_settings(
    academic_year_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    s = calendar_service.get_calendar_settings(academic_year_id, db)
    names = [DAY_NAMES[d] for d in s.weekly_off_days if 0 <= d < 7]
    return SchoolCalendarSettingsResponse(
        academic_year_id=s.academic_year_id,
        weekly_off_days=s.weekly_off_days,
        weekly_off_names=names,
    )


@router.put("/admin/calendar/settings", response_model=SchoolCalendarSettingsResponse)
def update_settings(
    payload: SchoolCalendarSettingsUpdate,
    academic_year_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    s = calendar_service.update_calendar_settings(academic_year_id, payload, actor_user_id=current_user.id, db=db)
    names = [DAY_NAMES[d] for d in s.weekly_off_days if 0 <= d < 7]
    return SchoolCalendarSettingsResponse(
        academic_year_id=s.academic_year_id,
        weekly_off_days=s.weekly_off_days,
        weekly_off_names=names,
    )


@router.get("/admin/calendar/special-working-days", response_model=list[SpecialWorkingDayResponse])
def list_special_working_days(
    academic_year_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    return calendar_service.get_special_working_days(academic_year_id, db)


@router.post("/admin/calendar/special-working-days", response_model=SpecialWorkingDayResponse, status_code=status.HTTP_201_CREATED)
def create_special_working_day(
    payload: SpecialWorkingDayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    return calendar_service.add_special_working_day(payload, actor_user_id=current_user.id, db=db)


@router.delete("/admin/calendar/special-working-days/{special_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_special_working_day(
    special_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    calendar_service.delete_special_working_day(special_id, db)


@router.get("/admin/calendar/monthly", response_model=MonthCalendarResponse)
def get_monthly_view(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    academic_year_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    return calendar_service.get_monthly_calendar(
        year=year,
        month=month,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        db=db,
    )


@router.get("/admin/calendar/check-date", response_model=DateWorkingStatusResponse)
def check_date_status_admin(
    date: dt.date = Query(...),
    academic_year_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    section_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    return calendar_service.check_date_working_status(
        target_date=date,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        section_id=section_id,
        db=db,
    )


# ==========================================
# TEACHER ENDPOINTS (READ-ONLY)
# ==========================================

@router.get("/teacher/calendar/holidays", response_model=list[SchoolHolidayResponse])
def get_teacher_holidays(
    academic_year_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    start_date: dt.date | None = None,
    end_date: dt.date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(teacher_or_admin),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    return calendar_service.get_school_holidays(
        academic_year_id=academic_year_id,
        category_id=None,
        grade_id=grade_id,
        status_filter="active",
        start_date=start_date,
        end_date=end_date,
        db=db,
    )


@router.get("/teacher/calendar/monthly", response_model=MonthCalendarResponse)
def get_teacher_monthly(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    academic_year_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(teacher_or_admin),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    return calendar_service.get_monthly_calendar(
        year=year,
        month=month,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        db=db,
    )


@router.get("/teacher/calendar/check-date", response_model=DateWorkingStatusResponse)
def check_date_status_teacher(
    date: dt.date = Query(...),
    academic_year_id: uuid.UUID | None = None,
    grade_id: uuid.UUID | None = None,
    section_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(teacher_or_admin),
):
    if not academic_year_id:
        academic_year_id = _get_active_academic_year(db).id
    return calendar_service.check_date_working_status(
        target_date=date,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        section_id=section_id,
        db=db,
    )
