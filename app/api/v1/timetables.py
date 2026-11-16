import datetime as dt
import uuid
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.timetable import (
    ClashValidationResult,
    PeriodCreate,
    PeriodResponse,
    PeriodUpdate,
    ShiftCreate,
    ShiftResponse,
    ShiftUpdate,
    GradeShiftAssignRequest,
    TeacherPersonalScheduleResponse,
    TimetableDetailResponse,
    TimetableSaveDraftRequest,
    TimetableSlotInput,
)
from app.services import timetable_service

router = APIRouter(tags=["Timetables & Shifts"])

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)
teacher_only = require_roles(UserRole.TEACHER.value)
student_only = require_roles(UserRole.STUDENT.value)
parent_only = require_roles(UserRole.PARENT.value)


# ==========================================
# 1. Admin Shift & Period Management
# ==========================================

@router.get(
    "/admin/shifts",
    response_model=list[ShiftResponse],
    dependencies=[Depends(admin_only)],
)
def list_shifts(db: Session = Depends(get_db)):
    """Admin: list all configured shifts with reusable period timings."""
    return timetable_service.list_shifts(db)


@router.post(
    "/admin/shifts",
    response_model=ShiftResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_shift(
    payload: ShiftCreate,
    db: Session = Depends(get_db),
):
    """Admin: configure a new school shift (e.g. Morning Shift 07:00 AM - 12:00 PM)."""
    return timetable_service.create_shift(payload, db)


@router.put(
    "/admin/shifts/{shift_id}",
    response_model=ShiftResponse,
    dependencies=[Depends(admin_only)],
)
def update_shift(
    shift_id: uuid.UUID,
    payload: ShiftUpdate,
    db: Session = Depends(get_db),
):
    """Admin: update shift name, hours, or working days."""
    return timetable_service.update_shift(shift_id, payload, db)


@router.put(
    "/admin/grades/{grade_id}/shift",
    dependencies=[Depends(admin_only)],
)
def assign_shift_to_grade(
    grade_id: uuid.UUID,
    payload: GradeShiftAssignRequest,
    db: Session = Depends(get_db),
):
    """Admin: link or unlink a grade to a shift."""
    return timetable_service.assign_shift_to_grade(grade_id, payload.shift_id, db)


@router.post(
    "/admin/shifts/{shift_id}/assign-grades",
    response_model=ShiftResponse,
    dependencies=[Depends(admin_only)],
)
def assign_grades_to_shift(
    shift_id: uuid.UUID,
    grade_ids: list[uuid.UUID] = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    """Admin: assign multiple grades to a shift."""
    return timetable_service.assign_grades_to_shift(shift_id, grade_ids, db)


@router.post(
    "/admin/shifts/{shift_id}/periods",
    response_model=PeriodResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def add_period_to_shift(
    shift_id: uuid.UUID,
    payload: PeriodCreate,
    db: Session = Depends(get_db),
):
    """Admin: configure reusable periods at the shift level with overlap & boundary validation."""
    return timetable_service.add_period_to_shift(shift_id, payload, db)


@router.put(
    "/admin/shifts/{shift_id}/periods/{period_id}",
    response_model=PeriodResponse,
    dependencies=[Depends(admin_only)],
)
def update_shift_period(
    shift_id: uuid.UUID,
    period_id: uuid.UUID,
    payload: PeriodUpdate,
    db: Session = Depends(get_db),
):
    """Admin: update period number, timings, or break indicator."""
    return timetable_service.update_period(shift_id, period_id, payload, db)


# ==========================================
# 2. Admin Timetable Matrix Operations
# ==========================================

@router.get(
    "/admin/timetables",
    response_model=TimetableDetailResponse | None,
    dependencies=[Depends(admin_only)],
)
def get_class_timetable(
    section_id: uuid.UUID = Query(...),
    academic_year_id: uuid.UUID | None = Query(None),
    include_draft: bool = Query(True),
    date: dt.date | None = Query(None),
    db: Session = Depends(get_db),
):
    """Admin: retrieve draft or published timetable matrix for a grade section."""
    return timetable_service.get_section_timetable(
        academic_year_id=academic_year_id,
        section_id=section_id,
        include_draft=include_draft,
        target_date=date,
        db=db,
    )


@router.post(
    "/admin/timetables/validate-clashes",
    response_model=ClashValidationResult,
    dependencies=[Depends(admin_only)],
)
def validate_timetable_clashes(
    payload: TimetableSaveDraftRequest | list[TimetableSlotInput] = Body(...),
    academic_year_id: uuid.UUID | None = Query(None),
    section_id: uuid.UUID | None = Query(None),
    timetable_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    """Admin: pre-flight check for teacher double-booking and slot overlaps."""
    if isinstance(payload, TimetableSaveDraftRequest):
        ay_id = payload.academic_year_id
        sec_id = payload.section_id
        entries_list = payload.entries
    else:
        if not academic_year_id or not section_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="academic_year_id and section_id are required",
            )
        ay_id = academic_year_id
        sec_id = section_id
        entries_list = payload

    clashes = timetable_service.validate_timetable_clashes(
        academic_year_id=ay_id,
        section_id=sec_id,
        entries=entries_list,
        current_timetable_id=timetable_id,
        db=db,
    )
    return ClashValidationResult(is_valid=len(clashes) == 0, clashes=clashes)


@router.post(
    "/admin/timetables/save-draft",
    response_model=TimetableDetailResponse,
    dependencies=[Depends(admin_only)],
)
def save_draft_timetable(
    payload: TimetableSaveDraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: save working timetable draft for a section."""
    return timetable_service.save_draft_timetable(payload, current_user.id, db)


@router.post(
    "/admin/timetables/{timetable_id}/publish",
    response_model=TimetableDetailResponse,
    dependencies=[Depends(admin_only)],
)
def publish_timetable(
    timetable_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: publish timetable, making it visible to teachers, students, and parents."""
    return timetable_service.publish_timetable(timetable_id, current_user.id, db)


# ==========================================
# 3. Teacher Portal Timetable Views
# ==========================================

@router.get(
    "/teacher/timetable/me",
    response_model=TeacherPersonalScheduleResponse,
    dependencies=[Depends(teacher_only)],
)
@router.get(
    "/teacher/timetable/personal",
    response_model=TeacherPersonalScheduleResponse,
    dependencies=[Depends(teacher_only)],
)
def get_my_teaching_timetable(
    academic_year_id: uuid.UUID | None = Query(None),
    date: dt.date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher View 1: Personal timetable showing only the logged-in teacher's assigned periods."""
    return timetable_service.get_teacher_personal_schedule(
        current_user.id,
        academic_year_id,
        db,
        target_date=date,
    )


@router.get(
    "/teacher/timetable/grade-wise",
    response_model=TimetableDetailResponse,
    dependencies=[Depends(teacher_only)],
)
def get_teacher_grade_timetable(
    section_id: uuid.UUID = Query(...),
    date: dt.date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher View 2: Complete grade timetable with the teacher's assigned subjects/periods highlighted."""
    return timetable_service.get_teacher_grade_timetable(
        current_user.id,
        section_id,
        db,
        target_date=date,
    )


# ==========================================
# 4. Student & Parent Timetable Views
# ==========================================

@router.get(
    "/student/timetable/me",
    response_model=TimetableDetailResponse,
    dependencies=[Depends(student_only)],
)
def get_student_class_timetable(
    date: dt.date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student Portal: view current published class timetable."""
    return timetable_service.get_student_timetable(current_user.id, db, target_date=date)
