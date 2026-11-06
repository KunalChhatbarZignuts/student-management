import datetime as dt
import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.calendar import SchoolHoliday, holiday_grade_associations, holiday_section_associations
from app.models.classroom import Subject, TeacherAssignment
from app.models.examination import (
    ExamStatus,
    ExamType,
    Examination,
    ExaminationNotification,
    ExaminationSchedule,
    GradingScale,
    MarksStatus,
    ResultStatus,
    StudentExamMark,
    StudentExamResult,
)
from app.models.parent import ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.examination import (
    ExaminationCreate,
    ExaminationDashboardMetrics,
    ExaminationResponse,
    ExaminationScheduleCreate,
    ExaminationScheduleResponse,
    ExaminationScheduleUpdate,
    ExaminationUpdate,
    GradingScaleCreate,
    GradingScaleResponse,
    MarksBulkSaveRequest,
    ScheduleRosterResponse,
    StudentResultResponse,
    StudentRosterMarkItem,
    SubjectMarkDetail,
)

logger = logging.getLogger(__name__)

DEFAULT_SCALE_NAME = "Default 10-Point Scale"

DEFAULT_GRADING_TIERS = [
    {"grade": "A+", "min_percentage": 90.0, "max_percentage": 100.0, "grade_point": 10.0, "is_passing": True, "description": "Outstanding"},
    {"grade": "A", "min_percentage": 80.0, "max_percentage": 89.99, "grade_point": 9.0, "is_passing": True, "description": "Excellent"},
    {"grade": "B+", "min_percentage": 70.0, "max_percentage": 79.99, "grade_point": 8.0, "is_passing": True, "description": "Very Good"},
    {"grade": "B", "min_percentage": 60.0, "max_percentage": 69.99, "grade_point": 7.0, "is_passing": True, "description": "Good"},
    {"grade": "C", "min_percentage": 50.0, "max_percentage": 59.99, "grade_point": 6.0, "is_passing": True, "description": "Average"},
    {"grade": "D", "min_percentage": 35.0, "max_percentage": 49.99, "grade_point": 4.0, "is_passing": True, "description": "Pass"},
    {"grade": "F", "min_percentage": 0.0, "max_percentage": 34.99, "grade_point": 0.0, "is_passing": False, "description": "Needs Improvement / Fail"},
]


# ---------------------------------------------------------------------------
# Grading Scale Helpers
# ---------------------------------------------------------------------------

def ensure_default_grading_scale(db: Session) -> None:
    """Ensure standard grading tiers exist in the database."""
    existing = db.execute(select(GradingScale).where(GradingScale.name == DEFAULT_SCALE_NAME)).scalars().first()
    if existing:
        return

    for tier in DEFAULT_GRADING_TIERS:
        scale_tier = GradingScale(
            name=DEFAULT_SCALE_NAME,
            min_percentage=tier["min_percentage"],
            max_percentage=tier["max_percentage"],
            grade=tier["grade"],
            grade_point=tier["grade_point"],
            is_passing=tier["is_passing"],
            description=tier["description"],
            status="active",
        )
        db.add(scale_tier)
    db.commit()


def calculate_grade(percentage: float, scale_name: str, db: Session) -> tuple[str, bool]:
    """Calculate letter grade and passing status for a given percentage score."""
    ensure_default_grading_scale(db)
    tiers = db.execute(
        select(GradingScale)
        .where(GradingScale.name == scale_name, GradingScale.status == "active")
        .order_by(GradingScale.min_percentage.desc())
    ).scalars().all()

    if not tiers:
        tiers = db.execute(
            select(GradingScale)
            .where(GradingScale.name == DEFAULT_SCALE_NAME)
            .order_by(GradingScale.min_percentage.desc())
        ).scalars().all()

    pct = round(percentage, 2)
    for tier in tiers:
        if tier.min_percentage <= pct <= tier.max_percentage or (pct >= tier.min_percentage and tier.grade == "A+"):
            return tier.grade, tier.is_passing

    # Fallback default
    if pct >= 35.0:
        return "D", True
    return "F", False


def list_grading_scales(db: Session) -> list[GradingScaleResponse]:
    ensure_default_grading_scale(db)
    scales = db.execute(
        select(GradingScale).where(GradingScale.status == "active").order_by(GradingScale.name, GradingScale.min_percentage.desc())
    ).scalars().all()
    return [GradingScaleResponse.model_validate(s) for s in scales]


def create_grading_tier(payload: GradingScaleCreate, db: Session) -> GradingScaleResponse:
    existing = db.execute(
        select(GradingScale).where(GradingScale.name == payload.name, GradingScale.grade == payload.grade)
    ).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Grade tier '{payload.grade}' already exists for scale '{payload.name}'")

    tier = GradingScale(**payload.model_dump())
    db.add(tier)
    db.commit()
    db.refresh(tier)
    return GradingScaleResponse.model_validate(tier)


# ---------------------------------------------------------------------------
# Examination Core CRUD & Dashboard
# ---------------------------------------------------------------------------

def create_examination(payload: ExaminationCreate, db: Session) -> ExaminationResponse:
    year = db.get(AcademicYear, payload.academic_year_id)
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")

    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="Examination end_date cannot be earlier than start_date")

    ensure_default_grading_scale(db)

    exam = Examination(
        name=payload.name,
        exam_type=payload.exam_type,
        academic_year_id=payload.academic_year_id,
        term=payload.term,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=ExamStatus.SCHEDULED.value,
        grading_scale_name=payload.grading_scale_name or DEFAULT_SCALE_NAME,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return _build_examination_response(exam, db)


def list_examinations(
    academic_year_id: uuid.UUID | None = None,
    term: str | None = None,
    status_filter: str | None = None,
    db: Session = None,  # type: ignore
) -> list[ExaminationResponse]:
    query = select(Examination).order_by(Examination.start_date.desc())
    if academic_year_id:
        query = query.where(Examination.academic_year_id == academic_year_id)
    if term:
        query = query.where(Examination.term == term)
    if status_filter:
        query = query.where(Examination.status == status_filter)

    exams = db.execute(query).scalars().all()
    return [_build_examination_response(e, db) for e in exams]


def get_examination(examination_id: uuid.UUID, db: Session) -> ExaminationResponse:
    exam = db.get(Examination, examination_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    return _build_examination_response(exam, db)


def update_examination(examination_id: uuid.UUID, payload: ExaminationUpdate, db: Session) -> ExaminationResponse:
    exam = db.get(Examination, examination_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    data = payload.model_dump(exclude_unset=True)
    if "start_date" in data and "end_date" in data:
        if data["end_date"] < data["start_date"]:
            raise HTTPException(status_code=400, detail="end_date cannot be earlier than start_date")
    elif "start_date" in data and data["start_date"] > exam.end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than current end_date")
    elif "end_date" in data and data["end_date"] < exam.start_date:
        raise HTTPException(status_code=400, detail="end_date cannot be earlier than current start_date")

    for k, v in data.items():
        setattr(exam, k, v)

    db.commit()
    db.refresh(exam)
    return _build_examination_response(exam, db)


def delete_examination(examination_id: uuid.UUID, db: Session) -> None:
    exam = db.get(Examination, examination_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    if exam.status == ExamStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Completed examinations cannot be deleted")
    db.delete(exam)
    db.commit()


def get_dashboard_metrics(db: Session) -> ExaminationDashboardMetrics:
    today = dt.date.today()
    total_exams = db.execute(select(func.count(Examination.id))).scalar() or 0
    upcoming = db.execute(
        select(func.count(Examination.id)).where(Examination.start_date > today, Examination.status != ExamStatus.CANCELLED.value)
    ).scalar() or 0
    ongoing = db.execute(
        select(func.count(Examination.id)).where(
            Examination.start_date <= today,
            Examination.end_date >= today,
            Examination.status != ExamStatus.CANCELLED.value,
        )
    ).scalar() or 0
    completed = db.execute(
        select(func.count(Examination.id)).where(
            or_(Examination.end_date < today, Examination.status == ExamStatus.COMPLETED.value)
        )
    ).scalar() or 0

    results_pending = db.execute(
        select(func.count(StudentExamResult.id)).where(StudentExamResult.status == MarksStatus.SUBMITTED.value)
    ).scalar() or 0
    published_results = db.execute(
        select(func.count(StudentExamResult.id)).where(StudentExamResult.status == MarksStatus.PUBLISHED.value)
    ).scalar() or 0
    total_students = db.execute(select(func.count(Student.id))).scalar() or 0

    return ExaminationDashboardMetrics(
        total_examinations=total_exams,
        upcoming_examinations=upcoming,
        ongoing_examinations=ongoing,
        completed_examinations=completed,
        results_pending=results_pending,
        published_results=published_results,
        total_participating_students=total_students,
    )


def _build_examination_response(exam: Examination, db: Session) -> ExaminationResponse:
    total_schedules = db.execute(
        select(func.count(ExaminationSchedule.id)).where(ExaminationSchedule.examination_id == exam.id)
    ).scalar() or 0
    published_results = db.execute(
        select(func.count(StudentExamResult.id)).where(
            StudentExamResult.examination_id == exam.id,
            StudentExamResult.status == MarksStatus.PUBLISHED.value,
        )
    ).scalar() or 0

    year_name = exam.academic_year.name if exam.academic_year else None

    return ExaminationResponse(
        id=exam.id,
        name=exam.name,
        exam_type=exam.exam_type,
        academic_year_id=exam.academic_year_id,
        academic_year_name=year_name,
        term=exam.term,
        description=exam.description,
        start_date=exam.start_date,
        end_date=exam.end_date,
        status=exam.status,
        grading_scale_name=exam.grading_scale_name,
        total_schedules=total_schedules,
        published_results_count=published_results,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


# ---------------------------------------------------------------------------
# Examination Schedules & Conflict Detection
# ---------------------------------------------------------------------------

def create_schedule_slot(payload: ExaminationScheduleCreate, db: Session) -> ExaminationScheduleResponse:
    exam = db.get(Examination, payload.examination_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    grade = db.get(Grade, payload.grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")

    section = db.get(Section, payload.section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section.grade_id != grade.id:
        raise HTTPException(status_code=400, detail="Section does not belong to the selected Grade")

    subject = db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # 1. Date window validation
    if not (exam.start_date <= payload.exam_date <= exam.end_date):
        raise HTTPException(
            status_code=400,
            detail=f"Exam date {payload.exam_date} must be within examination period ({exam.start_date} to {exam.end_date})",
        )

    # 2. Timing validation
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    if payload.max_marks <= 0:
        raise HTTPException(status_code=400, detail="Maximum marks must be greater than 0")

    if payload.pass_marks > payload.max_marks:
        raise HTTPException(status_code=400, detail="Passing marks cannot exceed maximum marks")

    # 3. Holiday conflict check
    _check_holiday_conflict(payload.exam_date, payload.grade_id, payload.section_id, db)

    # 4. Duplicate subject check for this examination and section
    existing_dup = db.execute(
        select(ExaminationSchedule).where(
            ExaminationSchedule.examination_id == payload.examination_id,
            ExaminationSchedule.section_id == payload.section_id,
            ExaminationSchedule.subject_id == payload.subject_id,
        )
    ).scalars().first()
    if existing_dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An examination schedule for {subject.name} already exists for this section in this examination",
        )

    # 5. Overlapping time clash for the same section
    time_clash = db.execute(
        select(ExaminationSchedule).where(
            ExaminationSchedule.section_id == payload.section_id,
            ExaminationSchedule.exam_date == payload.exam_date,
            ExaminationSchedule.status != ExamStatus.CANCELLED.value,
            or_(
                and_(
                    ExaminationSchedule.start_time <= payload.start_time,
                    ExaminationSchedule.end_time > payload.start_time,
                ),
                and_(
                    ExaminationSchedule.start_time < payload.end_time,
                    ExaminationSchedule.end_time >= payload.end_time,
                ),
                and_(
                    ExaminationSchedule.start_time >= payload.start_time,
                    ExaminationSchedule.end_time <= payload.end_time,
                ),
            ),
        )
    ).scalars().first()
    if time_clash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Schedule conflict: Section already has an exam scheduled on {payload.exam_date} between {time_clash.start_time.strftime('%H:%M')} and {time_clash.end_time.strftime('%H:%M')}",
        )

    sched = ExaminationSchedule(
        examination_id=payload.examination_id,
        grade_id=payload.grade_id,
        section_id=payload.section_id,
        subject_id=payload.subject_id,
        exam_date=payload.exam_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        max_marks=payload.max_marks,
        pass_marks=payload.pass_marks,
        room_number=payload.room_number,
        instructions=payload.instructions,
        status=ExamStatus.SCHEDULED.value,
    )
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return _build_schedule_response(sched, db)


def list_schedules_for_exam(
    examination_id: uuid.UUID,
    grade_id: uuid.UUID | None = None,
    section_id: uuid.UUID | None = None,
    db: Session = None,  # type: ignore
) -> list[ExaminationScheduleResponse]:
    query = (
        select(ExaminationSchedule)
        .where(ExaminationSchedule.examination_id == examination_id)
        .order_by(ExaminationSchedule.exam_date.asc(), ExaminationSchedule.start_time.asc())
    )
    if grade_id:
        query = query.where(ExaminationSchedule.grade_id == grade_id)
    if section_id:
        query = query.where(ExaminationSchedule.section_id == section_id)

    schedules = db.execute(query).scalars().all()
    return [_build_schedule_response(s, db) for s in schedules]


def update_schedule_slot(
    schedule_id: uuid.UUID, payload: ExaminationScheduleUpdate, db: Session
) -> ExaminationScheduleResponse:
    sched = db.get(ExaminationSchedule, schedule_id)
    if not sched:
        raise HTTPException(status_code=404, detail="Examination schedule not found")

    data = payload.model_dump(exclude_unset=True)

    new_date = data.get("exam_date", sched.exam_date)
    new_start = data.get("start_time", sched.start_time)
    new_end = data.get("end_time", sched.end_time)

    if new_end <= new_start:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    exam = sched.examination
    if not (exam.start_date <= new_date <= exam.end_date):
        raise HTTPException(
            status_code=400,
            detail=f"Exam date {new_date} must be within examination period ({exam.start_date} to {exam.end_date})",
        )

    if "exam_date" in data:
        _check_holiday_conflict(new_date, sched.grade_id, sched.section_id, db)

    # Check clash with other slots for same section
    clash = db.execute(
        select(ExaminationSchedule).where(
            ExaminationSchedule.id != sched.id,
            ExaminationSchedule.section_id == sched.section_id,
            ExaminationSchedule.exam_date == new_date,
            ExaminationSchedule.status != ExamStatus.CANCELLED.value,
            or_(
                and_(ExaminationSchedule.start_time <= new_start, ExaminationSchedule.end_time > new_start),
                and_(ExaminationSchedule.start_time < new_end, ExaminationSchedule.end_time >= new_end),
                and_(ExaminationSchedule.start_time >= new_start, ExaminationSchedule.end_time <= new_end),
            ),
        )
    ).scalars().first()
    if clash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Schedule conflict on {new_date} with existing slot {clash.start_time.strftime('%H:%M')}-{clash.end_time.strftime('%H:%M')}",
        )

    for k, v in data.items():
        setattr(sched, k, v)

    db.commit()
    db.refresh(sched)
    return _build_schedule_response(sched, db)


def delete_schedule_slot(schedule_id: uuid.UUID, db: Session) -> None:
    sched = db.get(ExaminationSchedule, schedule_id)
    if not sched:
        raise HTTPException(status_code=404, detail="Examination schedule not found")
    db.delete(sched)
    db.commit()


def _check_holiday_conflict(exam_date: dt.date, grade_id: uuid.UUID, section_id: uuid.UUID, db: Session) -> None:
    holidays = db.execute(
        select(SchoolHoliday).where(
            SchoolHoliday.status == "active",
            SchoolHoliday.start_date <= exam_date,
            SchoolHoliday.end_date >= exam_date,
        )
    ).scalars().all()

    for h in holidays:
        # Check if holiday is school-wide or scoped to this grade/section
        app_grades = db.execute(
            select(holiday_grade_associations.c.grade_id).where(holiday_grade_associations.c.holiday_id == h.id)
        ).scalars().all()
        app_sections = db.execute(
            select(holiday_section_associations.c.section_id).where(holiday_section_associations.c.holiday_id == h.id)
        ).scalars().all()

        is_school_wide = len(app_grades) == 0 and len(app_sections) == 0
        is_grade_match = grade_id in app_grades
        is_section_match = section_id in app_sections

        if is_school_wide or is_grade_match or is_section_match:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot schedule examination on {exam_date}: Official School Holiday declared ('{h.name}')",
            )


def _build_schedule_response(sched: ExaminationSchedule, db: Session) -> ExaminationScheduleResponse:
    # Determine marks status
    marks_count = db.execute(
        select(func.count(StudentExamMark.id)).where(StudentExamMark.schedule_id == sched.id)
    ).scalar() or 0

    submitted_count = db.execute(
        select(func.count(StudentExamMark.id)).where(
            StudentExamMark.schedule_id == sched.id,
            StudentExamMark.status.in_([MarksStatus.SUBMITTED.value, MarksStatus.PUBLISHED.value]),
        )
    ).scalar() or 0

    if marks_count == 0:
        entry_status = "PENDING"
    elif submitted_count == marks_count:
        entry_status = "SUBMITTED"
    else:
        entry_status = "DRAFT"

    grade = db.get(Grade, sched.grade_id)
    section = db.get(Section, sched.section_id)
    subject = db.get(Subject, sched.subject_id)
    exam = db.get(Examination, sched.examination_id)

    return ExaminationScheduleResponse(
        id=sched.id,
        examination_id=sched.examination_id,
        exam_name=exam.name if exam else None,
        grade_id=sched.grade_id,
        grade_name=grade.name if grade else None,
        section_id=sched.section_id,
        section_name=section.name if section else None,
        subject_id=sched.subject_id,
        subject_name=subject.name if subject else None,
        subject_code=subject.code if subject else None,
        exam_date=sched.exam_date,
        start_time=sched.start_time,
        end_time=sched.end_time,
        max_marks=sched.max_marks,
        pass_marks=sched.pass_marks,
        room_number=sched.room_number,
        instructions=sched.instructions,
        status=sched.status,
        marks_entry_status=entry_status,
        created_at=sched.created_at,
    )


# ---------------------------------------------------------------------------
# Class Teacher Authorization & Conduction
# ---------------------------------------------------------------------------

def verify_class_teacher_access(teacher_user_id: uuid.UUID, section_id: uuid.UUID, db: Session) -> Teacher:
    """Verify that current user is the currently assigned Class Teacher of the section."""
    teacher = db.execute(select(Teacher).where(Teacher.user_id == teacher_user_id)).scalars().first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user is not registered as a teacher",
        )

    # Check active Class Teacher assignment
    assignment = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.section_id == section_id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.is_class_teacher == True,
        )
    ).scalars().first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only the assigned Class Teacher can conduct examinations and enter marks for this section.",
        )

    return teacher


def get_teacher_examinations(teacher_user_id: uuid.UUID, db: Session) -> list[dict[str, Any]]:
    """List examinations and schedules where the teacher is assigned as Class Teacher."""
    teacher = db.execute(select(Teacher).where(Teacher.user_id == teacher_user_id)).scalars().first()
    if not teacher:
        return []

    # Get sections where teacher is class teacher
    assignments = db.execute(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.is_active == True,
            TeacherAssignment.is_class_teacher == True,
            TeacherAssignment.section_id.isnot(None),
        )
    ).scalars().all()

    section_ids = [a.section_id for a in assignments if a.section_id]
    if not section_ids:
        return []

    schedules = db.execute(
        select(ExaminationSchedule)
        .where(ExaminationSchedule.section_id.in_(section_ids))
        .order_by(ExaminationSchedule.exam_date.desc(), ExaminationSchedule.start_time.asc())
    ).scalars().all()

    res = []
    for s in schedules:
        resp = _build_schedule_response(s, db)
        res.append(resp.model_dump())
    return res


# ---------------------------------------------------------------------------
# Marks Entry & Roster Management
# ---------------------------------------------------------------------------

def get_schedule_roster(
    schedule_id: uuid.UUID, teacher_user_id: uuid.UUID | None, db: Session, is_admin: bool = False
) -> ScheduleRosterResponse:
    sched = db.get(ExaminationSchedule, schedule_id)
    if not sched:
        raise HTTPException(status_code=404, detail="Examination schedule not found")

    if not is_admin and teacher_user_id:
        verify_class_teacher_access(teacher_user_id, sched.section_id, db)

    # Get active enrolled students in this section
    enrollments = db.execute(
        select(StudentEnrollment)
        .where(StudentEnrollment.section_id == sched.section_id, StudentEnrollment.status == "ACTIVE")
        .order_by(StudentEnrollment.roll_no.asc())
    ).scalars().all()

    # Load existing marks
    existing_marks = db.execute(
        select(StudentExamMark).where(StudentExamMark.schedule_id == sched.id)
    ).scalars().all()
    marks_map = {m.student_id: m for m in existing_marks}

    students_list: list[StudentRosterMarkItem] = []
    for enr in enrollments:
        std = enr.student
        m = marks_map.get(std.id)
        students_list.append(
            StudentRosterMarkItem(
                student_id=std.id,
                student_name=f"{std.first_name} {std.last_name}",
                enrollment_number=std.enrollment_number,
                roll_no=enr.roll_no,
                marks_obtained=m.marks_obtained if m else None,
                is_absent=m.is_absent if m else False,
                grade=m.grade if m else None,
                is_passed=m.is_passed if m else None,
                remarks=m.remarks if m else None,
                status=m.status if m else "PENDING",
            )
        )

    # If no enrollments exist via StudentEnrollment, fallback to students with current_section_id
    if not students_list:
        direct_students = db.execute(
            select(Student).where(Student.current_section_id == sched.section_id).order_by(Student.last_name.asc())
        ).scalars().all()
        for idx, std in enumerate(direct_students, start=1):
            m = marks_map.get(std.id)
            students_list.append(
                StudentRosterMarkItem(
                    student_id=std.id,
                    student_name=f"{std.first_name} {std.last_name}",
                    enrollment_number=std.enrollment_number,
                    roll_no=idx,
                    marks_obtained=m.marks_obtained if m else None,
                    is_absent=m.is_absent if m else False,
                    grade=m.grade if m else None,
                    is_passed=m.is_passed if m else None,
                    remarks=m.remarks if m else None,
                    status=m.status if m else "PENDING",
                )
            )

    exam = sched.examination
    grade = sched.grade
    section = sched.section
    subject = sched.subject

    return ScheduleRosterResponse(
        schedule_id=sched.id,
        exam_name=exam.name,
        exam_type=exam.exam_type,
        term=exam.term,
        grade_name=grade.name,
        section_name=section.name,
        subject_name=subject.name,
        subject_code=subject.code,
        exam_date=sched.exam_date,
        start_time=sched.start_time,
        end_time=sched.end_time,
        max_marks=sched.max_marks,
        pass_marks=sched.pass_marks,
        status=sched.status,
        students=students_list,
    )


def save_schedule_marks(
    schedule_id: uuid.UUID,
    payload: MarksBulkSaveRequest,
    teacher_user_id: uuid.UUID,
    is_submit: bool,
    db: Session,
) -> ScheduleRosterResponse:
    sched = db.get(ExaminationSchedule, schedule_id)
    if not sched:
        raise HTTPException(status_code=404, detail="Examination schedule not found")

    verify_class_teacher_access(teacher_user_id, sched.section_id, db)

    exam = sched.examination
    scale_name = exam.grading_scale_name or DEFAULT_SCALE_NAME

    # Validate each mark
    for item in payload.marks:
        if not item.is_absent and item.marks_obtained is not None:
            if item.marks_obtained < 0:
                raise HTTPException(status_code=422, detail=f"Negative marks not allowed for student {item.student_id}")
            if item.marks_obtained > sched.max_marks:
                raise HTTPException(
                    status_code=422,
                    detail=f"Marks obtained ({item.marks_obtained}) cannot exceed maximum marks ({sched.max_marks})",
                )

    new_status = MarksStatus.SUBMITTED.value if is_submit else MarksStatus.DRAFT.value

    for item in payload.marks:
        record = db.execute(
            select(StudentExamMark).where(
                StudentExamMark.schedule_id == sched.id,
                StudentExamMark.student_id == item.student_id,
            )
        ).scalars().first()

        if item.is_absent:
            grade_val = "AB"
            passed = False
            score = 0.0
        elif item.marks_obtained is not None:
            score = float(item.marks_obtained)
            pct = (score / sched.max_marks) * 100.0
            grade_val, _ = calculate_grade(pct, scale_name, db)
            passed = score >= sched.pass_marks
        else:
            score = None
            grade_val = None
            passed = None

        if not record:
            record = StudentExamMark(
                schedule_id=sched.id,
                student_id=item.student_id,
                marks_obtained=score,
                is_absent=item.is_absent,
                grade=grade_val,
                is_passed=passed,
                remarks=item.remarks,
                status=new_status,
            )
            db.add(record)
        else:
            # If already published, prevent teacher modification
            if record.status == MarksStatus.PUBLISHED.value:
                raise HTTPException(status_code=400, detail="Cannot modify marks for published examinations")
            record.marks_obtained = score
            record.is_absent = item.is_absent
            record.grade = grade_val
            record.is_passed = passed
            record.remarks = item.remarks
            record.status = new_status

    db.commit()

    # If this is a final submission for the section, update/create consolidated StudentExamResult
    if is_submit:
        _recalculate_section_results(exam.id, sched.section_id, payload.teacher_remarks, db)

    return get_schedule_roster(sched.id, teacher_user_id, db)


def _recalculate_section_results(
    examination_id: uuid.UUID, section_id: uuid.UUID, teacher_remarks: str | None, db: Session
) -> None:
    """Consolidate student marks across all subjects in the exam into student_exam_results."""
    exam = db.get(Examination, examination_id)
    if not exam:
        return
    scale_name = exam.grading_scale_name or DEFAULT_SCALE_NAME

    # Get all schedules for this examination and section
    schedules = db.execute(
        select(ExaminationSchedule).where(
            ExaminationSchedule.examination_id == examination_id,
            ExaminationSchedule.section_id == section_id,
            ExaminationSchedule.status != ExamStatus.CANCELLED.value,
        )
    ).scalars().all()
    schedule_ids = [s.id for s in schedules]
    if not schedule_ids:
        return

    # Load all enrolled students in section
    students = db.execute(
        select(Student).where(
            or_(
                Student.current_section_id == section_id,
                Student.id.in_(
                    select(StudentEnrollment.student_id).where(
                        StudentEnrollment.section_id == section_id, StudentEnrollment.status == "ACTIVE"
                    )
                ),
            )
        )
    ).scalars().all()

    for std in students:
        marks = db.execute(
            select(StudentExamMark).where(
                StudentExamMark.schedule_id.in_(schedule_ids),
                StudentExamMark.student_id == std.id,
            )
        ).scalars().all()

        total_max = 0.0
        total_obtained = 0.0
        has_fail = False
        has_absent = False

        sched_map = {s.id: s for s in schedules}
        for m in marks:
            sch = sched_map.get(m.schedule_id)
            if not sch:
                continue
            total_max += sch.max_marks
            if m.is_absent:
                has_absent = True
                has_fail = True
            elif m.marks_obtained is not None:
                total_obtained += m.marks_obtained
                if not m.is_passed:
                    has_fail = True

        pct = (total_obtained / total_max * 100.0) if total_max > 0 else 0.0
        grade_letter, _ = calculate_grade(pct, scale_name, db)

        if has_absent and total_obtained == 0.0:
            result_label = ResultStatus.ABSENT.value
        elif has_fail:
            result_label = ResultStatus.FAIL.value
        else:
            result_label = ResultStatus.PASS.value

        existing_res = db.execute(
            select(StudentExamResult).where(
                StudentExamResult.examination_id == examination_id,
                StudentExamResult.student_id == std.id,
            )
        ).scalars().first()

        if not existing_res:
            res_obj = StudentExamResult(
                examination_id=examination_id,
                student_id=std.id,
                grade_id=sched_map[schedule_ids[0]].grade_id,
                section_id=section_id,
                total_max_marks=total_max,
                total_obtained_marks=total_obtained,
                percentage=round(pct, 2),
                overall_grade=grade_letter,
                overall_result=result_label,
                teacher_remarks=teacher_remarks,
                status=MarksStatus.SUBMITTED.value,
            )
            db.add(res_obj)
        else:
            if existing_res.status != MarksStatus.PUBLISHED.value:
                existing_res.total_max_marks = total_max
                existing_res.total_obtained_marks = total_obtained
                existing_res.percentage = round(pct, 2)
                existing_res.overall_grade = grade_letter
                existing_res.overall_result = result_label
                if teacher_remarks:
                    existing_res.teacher_remarks = teacher_remarks
                existing_res.status = MarksStatus.SUBMITTED.value

    db.commit()


# ---------------------------------------------------------------------------
# Results Publication & Notifications
# ---------------------------------------------------------------------------

def publish_results(
    examination_id: uuid.UUID,
    section_id: uuid.UUID | None,
    admin_user_id: uuid.UUID,
    db: Session,
) -> int:
    exam = db.get(Examination, examination_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    query = select(StudentExamResult).where(StudentExamResult.examination_id == examination_id)
    if section_id:
        query = query.where(StudentExamResult.section_id == section_id)

    results = db.execute(query).scalars().all()
    if not results:
        # Generate them if submitted
        schedules = db.execute(
            select(ExaminationSchedule).where(ExaminationSchedule.examination_id == examination_id)
        ).scalars().all()
        sec_ids = {s.section_id for s in schedules}
        for sec in sec_ids:
            if section_id is None or sec == section_id:
                _recalculate_section_results(examination_id, sec, None, db)
        results = db.execute(query).scalars().all()

    now = dt.datetime.now(dt.timezone.utc)
    count = 0
    for res in results:
        res.status = MarksStatus.PUBLISHED.value
        res.published_at = now
        res.published_by_user_id = admin_user_id
        count += 1

        # Also publish marks
        sched_ids = db.execute(
            select(ExaminationSchedule.id).where(
                ExaminationSchedule.examination_id == examination_id,
                ExaminationSchedule.section_id == res.section_id,
            )
        ).scalars().all()
        if sched_ids:
            marks = db.execute(
                select(StudentExamMark).where(
                    StudentExamMark.schedule_id.in_(sched_ids),
                    StudentExamMark.student_id == res.student_id,
                )
            ).scalars().all()
            for m in marks:
                m.status = MarksStatus.PUBLISHED.value

        # Generate notification for student and parent
        std = res.student
        if std:
            # Student notif
            notif = ExaminationNotification(
                user_id=std.user_id,
                student_id=std.id,
                title=f"Results Published: {exam.name}",
                message=f"Results for {exam.name} ({exam.term}) have been published. Your overall grade is {res.overall_grade} ({res.percentage}%).",
                event_type="PUBLISHED",
            )
            db.add(notif)

            # Parent notifs
            links = db.execute(
                select(ParentStudentLink).where(ParentStudentLink.student_id == std.id)
            ).scalars().all()
            for lnk in links:
                parent = lnk.parent
                if parent and parent.user_id:
                    p_notif = ExaminationNotification(
                        user_id=parent.user_id,
                        student_id=std.id,
                        title=f"Examination Results Published: {std.first_name}",
                        message=f"Official results for {std.first_name} in {exam.name} are now available for viewing and report card download.",
                        event_type="PUBLISHED",
                    )
                    db.add(p_notif)

    # If all schedules published, mark examination completed
    exam.status = ExamStatus.COMPLETED.value
    db.commit()
    return count


def unpublish_results(
    examination_id: uuid.UUID,
    section_id: uuid.UUID | None,
    db: Session,
) -> int:
    query = select(StudentExamResult).where(
        StudentExamResult.examination_id == examination_id,
        StudentExamResult.status == MarksStatus.PUBLISHED.value,
    )
    if section_id:
        query = query.where(StudentExamResult.section_id == section_id)

    results = db.execute(query).scalars().all()
    count = 0
    for res in results:
        res.status = MarksStatus.SUBMITTED.value
        res.published_at = None
        count += 1

    db.commit()
    return count


# ---------------------------------------------------------------------------
# Student & Parent Portal Queries
# ---------------------------------------------------------------------------

def get_student_upcoming_schedules(student_id: uuid.UUID, db: Session) -> list[ExaminationScheduleResponse]:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    section_id = student.current_section_id
    if not section_id:
        # Try active enrollment
        enr = db.execute(
            select(StudentEnrollment).where(StudentEnrollment.student_id == student_id, StudentEnrollment.status == "ACTIVE")
        ).scalars().first()
        section_id = enr.section_id if enr else None

    if not section_id:
        return []

    today = dt.date.today()
    schedules = db.execute(
        select(ExaminationSchedule)
        .where(
            ExaminationSchedule.section_id == section_id,
            ExaminationSchedule.exam_date >= today,
            ExaminationSchedule.status != ExamStatus.CANCELLED.value,
        )
        .order_by(ExaminationSchedule.exam_date.asc(), ExaminationSchedule.start_time.asc())
    ).scalars().all()

    return [_build_schedule_response(s, db) for s in schedules]


def get_student_past_schedules(student_id: uuid.UUID, db: Session) -> list[ExaminationScheduleResponse]:
    student = db.get(Student, student_id)
    if not student:
        return []

    section_id = student.current_section_id
    if not section_id:
        enr = db.execute(
            select(StudentEnrollment).where(StudentEnrollment.student_id == student_id, StudentEnrollment.status == "ACTIVE")
        ).scalars().first()
        section_id = enr.section_id if enr else None

    if not section_id:
        return []

    today = dt.date.today()
    schedules = db.execute(
        select(ExaminationSchedule)
        .where(
            ExaminationSchedule.section_id == section_id,
            ExaminationSchedule.exam_date < today,
        )
        .order_by(ExaminationSchedule.exam_date.desc(), ExaminationSchedule.start_time.asc())
    ).scalars().all()

    return [_build_schedule_response(s, db) for s in schedules]


def get_student_published_results(
    student_id: uuid.UUID, examination_id: uuid.UUID | None, db: Session
) -> list[StudentResultResponse]:
    """Strict privacy: returns ONLY PUBLISHED results for the given student."""
    query = (
        select(StudentExamResult)
        .where(
            StudentExamResult.student_id == student_id,
            StudentExamResult.status == MarksStatus.PUBLISHED.value,
        )
        .order_by(StudentExamResult.created_at.desc())
    )
    if examination_id:
        query = query.where(StudentExamResult.examination_id == examination_id)

    results = db.execute(query).scalars().all()
    output: list[StudentResultResponse] = []

    for res in results:
        exam = res.examination
        std = res.student
        grade = res.grade
        section = res.section

        # Fetch subject breakdown for published schedules
        schedules = db.execute(
            select(ExaminationSchedule).where(
                ExaminationSchedule.examination_id == res.examination_id,
                ExaminationSchedule.section_id == res.section_id,
            )
        ).scalars().all()

        sched_ids = [s.id for s in schedules]
        marks = db.execute(
            select(StudentExamMark).where(
                StudentExamMark.schedule_id.in_(sched_ids),
                StudentExamMark.student_id == std.id,
            )
        ).scalars().all()
        marks_by_sch = {m.schedule_id: m for m in marks}

        subj_details: list[SubjectMarkDetail] = []
        for sch in schedules:
            m = marks_by_sch.get(sch.id)
            subj = sch.subject
            subj_details.append(
                SubjectMarkDetail(
                    subject_name=subj.name,
                    subject_code=subj.code,
                    exam_date=sch.exam_date,
                    max_marks=sch.max_marks,
                    pass_marks=sch.pass_marks,
                    marks_obtained=m.marks_obtained if m else None,
                    is_absent=m.is_absent if m else False,
                    grade=m.grade if m else None,
                    is_passed=m.is_passed if m else None,
                    status=m.status if m else "PENDING",
                )
            )

        # Get class teacher name
        teacher_name = None
        assignment = db.execute(
            select(TeacherAssignment).where(
                TeacherAssignment.section_id == res.section_id,
                TeacherAssignment.is_class_teacher == True,
                TeacherAssignment.is_active == True,
            )
        ).scalars().first()
        if assignment and assignment.teacher:
            teacher_name = f"{assignment.teacher.first_name} {assignment.teacher.last_name}"

        # Roll number
        roll_no = 1
        enr = db.execute(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == std.id, StudentEnrollment.section_id == res.section_id
            )
        ).scalars().first()
        if enr:
            roll_no = enr.roll_no

        output.append(
            StudentResultResponse(
                id=res.id,
                examination_id=res.examination_id,
                exam_name=exam.name,
                exam_type=exam.exam_type,
                term=exam.term,
                academic_year=exam.academic_year.name if exam.academic_year else "2026-2027",
                student_id=std.id,
                student_name=f"{std.first_name} {std.last_name}",
                enrollment_number=std.enrollment_number,
                roll_no=roll_no,
                grade_name=grade.name,
                section_name=section.name,
                class_teacher_name=teacher_name,
                total_max_marks=res.total_max_marks,
                total_obtained_marks=res.total_obtained_marks,
                percentage=res.percentage,
                overall_grade=res.overall_grade,
                overall_result=res.overall_result,
                teacher_remarks=res.teacher_remarks,
                status=res.status,
                published_at=res.published_at,
                subject_marks=subj_details,
            )
        )

    return output
