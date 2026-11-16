import datetime as dt
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Period,
    Section,
    Shift,
    StudentEnrollment,
    Timetable,
    TimetableEntry,
)
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.timetable import (
    PeriodCreate,
    PeriodResponse,
    PeriodUpdate,
    ShiftCreate,
    ShiftResponse,
    ShiftUpdate,
    TeacherPersonalScheduleItem,
    TeacherPersonalScheduleResponse,
    TimetableDetailResponse,
    TimetableSaveDraftRequest,
    TimetableSlotInput,
    TimetableSlotResponse,
)


def parse_time(time_val: str | dt.time) -> dt.time:
    if isinstance(time_val, dt.time):
        return time_val
    val = time_val.strip()
    if len(val) == 5:
        return dt.datetime.strptime(val, "%H:%M").time()
    return dt.datetime.strptime(val, "%H:%M:%S").time()


def format_time(t: dt.time) -> str:
    return t.strftime("%H:%M")


# ==========================================
# Shift & Period Service Logic
# ==========================================

def list_shifts(db: Session) -> list[ShiftResponse]:
    shifts = db.execute(select(Shift).order_by(Shift.name)).scalars().all()
    results = []
    for s in shifts:
        periods_resp = [
            PeriodResponse(
                id=p.id,
                shift_id=p.shift_id,
                number=p.number,
                name=p.name or (f"Break" if p.is_break else f"Period {p.number}"),
                start_time=format_time(p.start_time),
                end_time=format_time(p.end_time),
                is_break=p.is_break,
                status=p.status,
            )
            for p in sorted(s.periods, key=lambda x: x.number)
        ]
        results.append(
            ShiftResponse(
                id=s.id,
                name=s.name,
                start_time=format_time(s.start_time),
                end_time=format_time(s.end_time),
                working_days=s.working_days or "Monday,Tuesday,Wednesday,Thursday,Friday",
                status=s.status,
                periods=periods_resp,
                grades_count=len(s.grades),
                assigned_grade_ids=[g.id for g in s.grades],
                assigned_grade_names=[g.name for g in s.grades],
            )
        )
    return results


def get_shift_detail(shift_id: uuid.UUID, db: Session) -> ShiftResponse:
    s = db.get(Shift, shift_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    periods_resp = [
        PeriodResponse(
            id=p.id,
            shift_id=p.shift_id,
            number=p.number,
            name=p.name or (f"Break" if p.is_break else f"Period {p.number}"),
            start_time=format_time(p.start_time),
            end_time=format_time(p.end_time),
            is_break=p.is_break,
            status=p.status,
        )
        for p in sorted(s.periods, key=lambda x: x.number)
    ]
    return ShiftResponse(
        id=s.id,
        name=s.name,
        start_time=format_time(s.start_time),
        end_time=format_time(s.end_time),
        working_days=s.working_days or "Monday,Tuesday,Wednesday,Thursday,Friday",
        status=s.status,
        periods=periods_resp,
        grades_count=len(s.grades),
        assigned_grade_ids=[g.id for g in s.grades],
        assigned_grade_names=[g.name for g in s.grades],
    )


def create_shift(payload: ShiftCreate, db: Session) -> ShiftResponse:
    existing = db.execute(select(Shift).where(Shift.name == payload.name.strip())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A shift named '{payload.name}' already exists")

    st = parse_time(payload.start_time)
    et = parse_time(payload.end_time)
    if st >= et:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift start time must be earlier than end time")

    shift = Shift(
        name=payload.name.strip(),
        start_time=st,
        end_time=et,
        working_days=payload.working_days.strip() if payload.working_days else "Monday,Tuesday,Wednesday,Thursday,Friday",
        status="active",
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    if payload.assigned_grade_ids:
        grades = db.query(Grade).filter(Grade.id.in_(payload.assigned_grade_ids)).all()
        for g in grades:
            g.shift_id = shift.id
        db.commit()
        db.refresh(shift)

    return get_shift_detail(shift.id, db)


def update_shift(shift_id: uuid.UUID, payload: ShiftUpdate, db: Session) -> ShiftResponse:
    s = db.get(Shift, shift_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    if payload.name:
        existing = db.execute(
            select(Shift).where(Shift.name == payload.name.strip(), Shift.id != shift_id)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Another shift named '{payload.name}' exists")
        s.name = payload.name.strip()

    if payload.start_time:
        s.start_time = parse_time(payload.start_time)
    if payload.end_time:
        s.end_time = parse_time(payload.end_time)
    if s.start_time >= s.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift start time must be earlier than end time")

    if payload.working_days is not None:
        s.working_days = payload.working_days
    if payload.status is not None:
        s.status = payload.status

    if payload.assigned_grade_ids is not None:
        # Clear grades currently on this shift that are not in the new list
        current_grades = db.query(Grade).filter(Grade.shift_id == s.id).all()
        for g in current_grades:
            if g.id not in payload.assigned_grade_ids:
                g.shift_id = None
        # Assign new grades
        if payload.assigned_grade_ids:
            new_grades = db.query(Grade).filter(Grade.id.in_(payload.assigned_grade_ids)).all()
            for g in new_grades:
                g.shift_id = s.id

    db.commit()
    db.refresh(s)
    return get_shift_detail(s.id, db)


def assign_shift_to_grade(grade_id: uuid.UUID, shift_id: uuid.UUID | None, db: Session) -> dict:
    grade = db.get(Grade, grade_id)
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    if shift_id is not None:
        shift = db.get(Shift, shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
        grade.shift_id = shift.id
    else:
        grade.shift_id = None
    db.commit()
    db.refresh(grade)
    return {
        "grade_id": str(grade.id),
        "grade_name": grade.name,
        "shift_id": str(grade.shift_id) if grade.shift_id else None,
    }


def assign_grades_to_shift(shift_id: uuid.UUID, grade_ids: list[uuid.UUID], db: Session) -> ShiftResponse:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    current_grades = db.query(Grade).filter(Grade.shift_id == shift_id).all()
    for g in current_grades:
        if g.id not in grade_ids:
            g.shift_id = None

    if grade_ids:
        to_assign = db.query(Grade).filter(Grade.id.in_(grade_ids)).all()
        for g in to_assign:
            g.shift_id = shift.id

    db.commit()
    db.refresh(shift)
    return get_shift_detail(shift.id, db)


def add_period_to_shift(shift_id: uuid.UUID, payload: PeriodCreate, db: Session) -> PeriodResponse:
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    p_start = parse_time(payload.start_time)
    p_end = parse_time(payload.end_time)
    if p_start >= p_end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Period start time must be before end time")

    # Validate falls within shift timings
    if p_start < shift.start_time or p_end > shift.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Period ({format_time(p_start)}–{format_time(p_end)}) must fall within shift timings ({format_time(shift.start_time)}–{format_time(shift.end_time)})",
        )

    # Check for period number uniqueness in shift
    existing_num = db.execute(
        select(Period).where(Period.shift_id == shift_id, Period.number == payload.number)
    ).scalar_one_or_none()
    if existing_num:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Period number {payload.number} is already configured in this shift",
        )

    # Check for overlap with existing active periods in shift
    for p in shift.periods:
        if p.status == "active":
            # Overlap condition: start < other.end AND end > other.start
            if p_start < p.end_time and p_end > p.start_time:
                p_label = p.name or f"Period {p.number}"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Period time overlaps with {p_label} ({format_time(p.start_time)}–{format_time(p.end_time)})",
                )

    period = Period(
        shift_id=shift_id,
        number=payload.number,
        name=payload.name.strip() if payload.name else (f"Break" if payload.is_break else f"Period {payload.number}"),
        start_time=p_start,
        end_time=p_end,
        is_break=payload.is_break,
        status="active",
    )
    db.add(period)
    db.commit()
    db.refresh(period)

    return PeriodResponse(
        id=period.id,
        shift_id=period.shift_id,
        number=period.number,
        name=period.name,
        start_time=format_time(period.start_time),
        end_time=format_time(period.end_time),
        is_break=period.is_break,
        status=period.status,
    )


def update_period(shift_id: uuid.UUID, period_id: uuid.UUID, payload: PeriodUpdate, db: Session) -> PeriodResponse:
    p = db.get(Period, period_id)
    if not p or p.shift_id != shift_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Period not found in this shift")

    shift = p.shift
    new_start = parse_time(payload.start_time) if payload.start_time else p.start_time
    new_end = parse_time(payload.end_time) if payload.end_time else p.end_time

    if new_start >= new_end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Period start time must be before end time")

    if new_start < shift.start_time or new_end > shift.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Period must fall within shift timings ({format_time(shift.start_time)}–{format_time(shift.end_time)})",
        )

    # Check overlaps excluding self
    for other in shift.periods:
        if other.id != p.id and other.status == "active":
            if new_start < other.end_time and new_end > other.start_time:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Period time overlaps with {other.name or f'Period {other.number}'} ({format_time(other.start_time)}–{format_time(other.end_time)})",
                )

    if payload.number is not None and payload.number != p.number:
        existing_num = db.execute(
            select(Period).where(Period.shift_id == shift_id, Period.number == payload.number, Period.id != p.id)
        ).scalar_one_or_none()
        if existing_num:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Period number {payload.number} is already taken")
        p.number = payload.number

    p.start_time = new_start
    p.end_time = new_end
    if payload.name is not None:
        p.name = payload.name.strip()
    if payload.is_break is not None:
        p.is_break = payload.is_break
    if payload.status is not None:
        p.status = payload.status

    db.commit()
    db.refresh(p)
    return PeriodResponse(
        id=p.id,
        shift_id=p.shift_id,
        number=p.number,
        name=p.name,
        start_time=format_time(p.start_time),
        end_time=format_time(p.end_time),
        is_break=p.is_break,
        status=p.status,
    )


# ==========================================
# Timetable Core & Matrix Logic
# ==========================================

def _build_timetable_detail_response(
    tt: Timetable,
    current_teacher_id: uuid.UUID | None = None,
    target_date: dt.date | None = None,
    db: Session | None = None,
) -> TimetableDetailResponse:
    shift = tt.shift
    periods_resp = [
        PeriodResponse(
            id=p.id,
            shift_id=p.shift_id,
            number=p.number,
            name=p.name or (f"Break" if p.is_break else f"Period {p.number}"),
            start_time=format_time(p.start_time),
            end_time=format_time(p.end_time),
            is_break=p.is_break,
            status=p.status,
        )
        for p in sorted(shift.periods, key=lambda x: x.number)
    ]

    working_days = [d.strip() for d in (shift.working_days or "Monday,Tuesday,Wednesday,Thursday,Friday").split(",") if d.strip()]

    date_status_resp = None
    is_holiday = False

    if target_date is not None and db is not None:
        from app.services.calendar_service import check_date_working_status

        date_status_resp = check_date_working_status(
            target_date=target_date,
            academic_year_id=tt.academic_year_id,
            grade_id=tt.grade_id,
            section_id=tt.section_id,
            db=db,
        )
        is_holiday = not date_status_resp.is_working_day

    entries_resp = []
    # If a specific date was queried and it IS a holiday or weekly off, suppress regular scheduled classes
    if not (target_date is not None and is_holiday):
        target_day_of_week = None
        if target_date is not None:
            iso_wd = target_date.isoweekday()  # 1=Monday, ..., 7=Sunday
            # For special compensatory working day falling on Sunday, map to Monday's schedule (1)
            target_day_of_week = 1 if iso_wd == 7 else iso_wd

        for e in tt.entries:
            if target_day_of_week is not None and e.day_of_week != target_day_of_week:
                continue

            sub = e.subject
            teacher = e.teacher
            period = e.period
            is_mine = bool(current_teacher_id and e.teacher_id == current_teacher_id)

            entries_resp.append(
                TimetableSlotResponse(
                    id=e.id,
                    day_of_week=e.day_of_week,
                    period_id=e.period_id,
                    period_number=period.number if period else 0,
                    period_name=period.name if period else None,
                    start_time=format_time(period.start_time) if period else "",
                    end_time=format_time(period.end_time) if period else "",
                    is_break=period.is_break if period else False,
                    subject_id=e.subject_id,
                    subject_name=sub.name if sub else None,
                    subject_code=sub.code if sub else None,
                    teacher_id=e.teacher_id,
                    teacher_name=f"{teacher.first_name} {teacher.last_name}" if teacher else None,
                    room_number=e.room_number,
                    is_current_teacher=is_mine,
                )
            )

    return TimetableDetailResponse(
        id=tt.id,
        academic_year_id=tt.academic_year_id,
        academic_year_name=tt.academic_year.name if tt.academic_year else "",
        grade_id=tt.grade_id,
        grade_name=tt.grade.name if tt.grade else "",
        section_id=tt.section_id,
        section_name=tt.section.name if tt.section else "",
        shift_id=tt.shift_id,
        shift_name=shift.name if shift else "",
        version=tt.version,
        status=tt.status,
        published_at=tt.published_at,
        working_days=working_days,
        periods=periods_resp,
        entries=entries_resp,
        target_date=target_date,
        date_status=date_status_resp,
        is_holiday=is_holiday,
    )


def get_section_timetable(
    academic_year_id: uuid.UUID | None,
    section_id: uuid.UUID,
    include_draft: bool,
    db: Session,
    current_teacher_id: uuid.UUID | None = None,
    target_date: dt.date | None = None,
) -> TimetableDetailResponse | None:
    query = select(Timetable).where(Timetable.section_id == section_id)
    if academic_year_id:
        query = query.where(Timetable.academic_year_id == academic_year_id)
    if not include_draft:
        query = query.where(Timetable.status == "published")
    query = query.order_by(Timetable.version.desc())

    tt = db.execute(query).scalars().first()
    if not tt:
        return None
    return _build_timetable_detail_response(
        tt,
        current_teacher_id=current_teacher_id,
        target_date=target_date,
        db=db,
    )


def validate_timetable_clashes(
    academic_year_id: uuid.UUID,
    section_id: uuid.UUID,
    entries: list[TimetableSlotInput],
    current_timetable_id: uuid.UUID | None,
    db: Session,
) -> list[str]:
    clashes: list[str] = []
    days_map = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}

    # 1. Internal slot duplicates check
    seen_slots = set()
    for e in entries:
        slot_key = (e.day_of_week, e.period_id)
        if slot_key in seen_slots:
            clashes.append(f"Multiple subjects assigned to Day {days_map.get(e.day_of_week)} for the same period.")
        seen_slots.add(slot_key)

    # 2. Teacher double-booking check across all other active published/draft timetables
    for e in entries:
        if not e.teacher_id:
            continue

        teacher = db.get(Teacher, e.teacher_id)
        teacher_name = f"{teacher.first_name} {teacher.last_name}" if teacher else "Teacher"
        period = db.get(Period, e.period_id)
        p_name = period.name if period else f"Period {e.period_id}"

        conflict_query = (
            select(TimetableEntry)
            .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
            .where(
                Timetable.academic_year_id == academic_year_id,
                Timetable.section_id != section_id,
                Timetable.status.in_(["published", "draft"]),
                TimetableEntry.day_of_week == e.day_of_week,
                TimetableEntry.period_id == e.period_id,
                TimetableEntry.teacher_id == e.teacher_id,
            )
        )
        if current_timetable_id:
            conflict_query = conflict_query.where(Timetable.id != current_timetable_id)

        conflicts = db.execute(conflict_query).scalars().all()
        for c in conflicts:
            sec_name = c.timetable.section.name if c.timetable and c.timetable.section else "another section"
            clashes.append(
                f"{teacher_name} is already booked in {sec_name} on {days_map.get(e.day_of_week)} during {p_name}."
            )

    return clashes


def save_draft_timetable(
    payload: TimetableSaveDraftRequest,
    actor_id: uuid.UUID,
    db: Session,
) -> TimetableDetailResponse:
    grade = db.get(Grade, payload.grade_id)
    if not grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")

    section = db.get(Section, payload.section_id)
    if not section or section.grade_id != grade.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section does not belong to selected grade")

    if not grade.shift_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grade '{grade.name}' has no Shift assigned. Please configure its shift in Grades first.",
        )

    # Check or create timetable header
    tt = db.execute(
        select(Timetable).where(
            Timetable.academic_year_id == payload.academic_year_id,
            Timetable.section_id == payload.section_id,
            Timetable.status == "draft",
        )
    ).scalar_one_or_none()

    if not tt:
        # Check max version for section
        last_v = db.execute(
            select(Timetable.version)
            .where(
                Timetable.academic_year_id == payload.academic_year_id,
                Timetable.section_id == payload.section_id,
            )
            .order_by(Timetable.version.desc())
        ).scalars().first()
        version = (last_v or 0) + 1

        tt = Timetable(
            academic_year_id=payload.academic_year_id,
            grade_id=payload.grade_id,
            section_id=payload.section_id,
            shift_id=grade.shift_id,
            version=version,
            status="draft",
            created_by_user_id=actor_id,
        )
        db.add(tt)
        db.flush()
    else:
        # Clear existing draft entries
        for old in tt.entries:
            db.delete(old)
        db.flush()

    # Save new entries
    for item in payload.entries:
        entry = TimetableEntry(
            timetable_id=tt.id,
            day_of_week=item.day_of_week,
            period_id=item.period_id,
            subject_id=item.subject_id,
            teacher_id=item.teacher_id,
            room_number=item.room_number,
        )
        db.add(entry)

    db.commit()
    db.refresh(tt)
    return _build_timetable_detail_response(tt)


def publish_timetable(timetable_id: uuid.UUID, actor_id: uuid.UUID, db: Session) -> TimetableDetailResponse:
    tt = db.get(Timetable, timetable_id)
    if not tt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timetable not found")

    # Validate clashes before publishing
    slot_inputs = [
        TimetableSlotInput(
            day_of_week=e.day_of_week,
            period_id=e.period_id,
            subject_id=e.subject_id,
            teacher_id=e.teacher_id,
            room_number=e.room_number,
        )
        for e in tt.entries
    ]
    clashes = validate_timetable_clashes(
        academic_year_id=tt.academic_year_id,
        section_id=tt.section_id,
        entries=slot_inputs,
        current_timetable_id=tt.id,
        db=db,
    )
    if clashes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot publish timetable due to scheduling conflicts: {'; '.join(clashes[:3])}",
        )

    # Archive previous published timetable for this section
    prev_published = db.execute(
        select(Timetable).where(
            Timetable.academic_year_id == tt.academic_year_id,
            Timetable.section_id == tt.section_id,
            Timetable.status == "published",
            Timetable.id != tt.id,
        )
    ).scalars().all()
    for prev in prev_published:
        prev.status = "archived"

    tt.status = "published"
    tt.published_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(tt)
    return _build_timetable_detail_response(tt)


# ==========================================
# Teacher, Student & Parent Views
# ==========================================

def get_teacher_personal_schedule(
    teacher_user_id: uuid.UUID,
    academic_year_id: uuid.UUID | None,
    db: Session,
    target_date: dt.date | None = None,
) -> TeacherPersonalScheduleResponse:
    teacher = db.execute(select(Teacher).where(Teacher.user_id == teacher_user_id)).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    ay_query = select(AcademicYear)
    if academic_year_id:
        ay_query = ay_query.where(AcademicYear.id == academic_year_id)
    else:
        ay_query = ay_query.where(AcademicYear.is_current == True)
    ay = db.execute(ay_query).scalars().first()
    if not ay:
        ay = db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc())).scalars().first()

    slots_resp = []
    date_status_resp = None
    is_holiday = False

    if ay and target_date is not None:
        from app.services.calendar_service import check_date_working_status

        date_status_resp = check_date_working_status(
            target_date=target_date,
            academic_year_id=ay.id,
            grade_id=None,
            section_id=None,
            db=db,
        )
        is_holiday = not date_status_resp.is_working_day

    # If target_date is a holiday or weekly off, suppress regular slots
    if not (target_date is not None and is_holiday) and ay:
        target_day_of_week = None
        if target_date is not None:
            iso_wd = target_date.isoweekday()  # 1=Monday, ..., 7=Sunday
            target_day_of_week = 1 if iso_wd == 7 else iso_wd

        entries = (
            db.execute(
                select(TimetableEntry)
                .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
                .join(Period, TimetableEntry.period_id == Period.id)
                .where(
                    TimetableEntry.teacher_id == teacher.id,
                    Timetable.academic_year_id == ay.id,
                    Timetable.status == "published",
                )
                .order_by(TimetableEntry.day_of_week, Period.number)
            )
            .scalars()
            .all()
        )

        # Fallback to most recent academic year with published slots if current year has none
        if not entries and not academic_year_id:
            fallback_entry = db.execute(
                select(TimetableEntry)
                .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
                .where(
                    TimetableEntry.teacher_id == teacher.id,
                    Timetable.status == "published",
                )
                .order_by(Timetable.published_at.desc())
            ).scalars().first()
            if fallback_entry and fallback_entry.timetable:
                ay = fallback_entry.timetable.academic_year
                entries = (
                    db.execute(
                        select(TimetableEntry)
                        .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
                        .join(Period, TimetableEntry.period_id == Period.id)
                        .where(
                            TimetableEntry.teacher_id == teacher.id,
                            Timetable.academic_year_id == ay.id,
                            Timetable.status == "published",
                        )
                        .order_by(TimetableEntry.day_of_week, Period.number)
                    )
                    .scalars()
                    .all()
                )

        for e in entries:
            p = e.period
            sub = e.subject
            sec = e.timetable.section if e.timetable else None
            grd = e.timetable.grade if e.timetable else None

            slots_resp.append(
                TeacherPersonalScheduleItem(
                    day_of_week=e.day_of_week,
                    period_number=p.number if p else 0,
                    period_name=p.name if p else None,
                    start_time=format_time(p.start_time) if p else "",
                    end_time=format_time(p.end_time) if p else "",
                    subject_name=sub.name if sub else "General",
                    subject_code=sub.code if sub else "GEN",
                    grade_name=grd.name if grd else "",
                    section_name=sec.name if sec else "",
                    room_number=e.room_number,
                )
            )

    return TeacherPersonalScheduleResponse(
        teacher_id=teacher.id,
        teacher_name=f"{teacher.first_name} {teacher.last_name}",
        academic_year_name=ay.name if ay else "",
        slots=slots_resp,
        target_date=target_date,
        date_status=date_status_resp,
        is_holiday=is_holiday,
    )


def get_teacher_grade_timetable(
    teacher_user_id: uuid.UUID,
    section_id: uuid.UUID,
    db: Session,
    target_date: dt.date | None = None,
) -> TimetableDetailResponse:
    teacher = db.execute(select(Teacher).where(Teacher.user_id == teacher_user_id)).scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")

    # Fetch latest published timetable
    tt = db.execute(
        select(Timetable)
        .where(
            Timetable.section_id == section_id,
            Timetable.status == "published",
        )
        .order_by(Timetable.version.desc())
    ).scalars().first()

    if not tt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No published timetable found for section {section.name}",
        )

    # Automatically highlight the requesting teacher's assigned periods and apply date context
    return _build_timetable_detail_response(
        tt,
        current_teacher_id=teacher.id,
        target_date=target_date,
        db=db,
    )


def get_student_timetable(
    student_user_id: uuid.UUID,
    db: Session,
    target_date: dt.date | None = None,
) -> TimetableDetailResponse:
    student = db.execute(select(Student).where(Student.user_id == student_user_id)).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Resolve active enrollment
    enr = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    section_id = enr.section_id if enr else None
    if not section_id:
        # Fallback by matching section name and class name (flexible matching for prefixes like 10-A vs A)
        if student.section and student.class_name:
            clean_num = student.class_name.replace("Grade", "").strip()
            possible_section_names = [student.section, f"{clean_num}-{student.section}"]
            possible_grade_names = [student.class_name, f"Grade {clean_num}", clean_num]
            sec = db.execute(
                select(Section).join(Grade, Section.grade_id == Grade.id).where(
                    Grade.name.in_(possible_grade_names),
                    Section.name.in_(possible_section_names),
                )
            ).scalars().first()
            if sec:
                section_id = sec.id

    if not section_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not currently enrolled in an active section",
        )

    tt = db.execute(
        select(Timetable)
        .where(
            Timetable.section_id == section_id,
            Timetable.status == "published",
        )
        .order_by(Timetable.version.desc())
    ).scalars().first()

    if not tt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timetable has not been published for your class yet",
        )

    return _build_timetable_detail_response(tt, target_date=target_date, db=db)


def get_child_timetable_for_parent(
    parent_user_id: uuid.UUID,
    child_student_id: uuid.UUID,
    db: Session,
    target_date: dt.date | None = None,
) -> TimetableDetailResponse:
    parent = db.execute(select(Parent).where(Parent.user_id == parent_user_id)).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent profile not found")

    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.student_id == child_student_id,
            ParentStudentLink.status == "active",
        )
    ).scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view timetable for this student",
        )

    student = link.student
    if not student or not student.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    return get_student_timetable(student.user_id, db=db, target_date=target_date)

