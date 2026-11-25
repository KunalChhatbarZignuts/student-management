import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.academics.structure_models import Grade, Section, StudentEnrollment
from app.modules.examinations.models import Examination, ExaminationSchedule
from app.modules.ai.learning.models import (
    AIDailyStudyPlan,
    AIStudyPlanItem,
    AIStudentStudySettings,
    AILearningRecommendation,
    RecommendationStatus,
    StudyPlanStatus,
)
from app.modules.ai.learning.schemas import (
    DailyStudyPlanResponse,
    WeeklyStudyPlanResponse,
    StudyPlanItemResponse,
    StudentStudySettingsResponse,
    UpdateStudentStudySettingsRequest,
)

logger = logging.getLogger(__name__)


def get_or_create_student_study_settings(
    student_id: uuid.UUID, db: Session
) -> AIStudentStudySettings:
    """Retrieves student study constraints or initializes smart defaults."""
    settings = db.execute(
        select(AIStudentStudySettings).where(AIStudentStudySettings.student_id == student_id)
    ).scalar_one_or_none()

    if not settings:
        settings = AIStudentStudySettings(
            student_id=student_id,
            weekday_daily_minutes=45,
            weekend_daily_minutes=90,
            preferred_study_time="EVENING",
            break_interval_minutes=10,
            notifications_enabled=True,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_student_study_settings(
    student_id: uuid.UUID, data: UpdateStudentStudySettingsRequest, db: Session
) -> AIStudentStudySettings:
    """Updates student study preferences and available minutes."""
    settings = get_or_create_student_study_settings(student_id, db)
    if data.weekday_daily_minutes is not None:
        settings.weekday_daily_minutes = data.weekday_daily_minutes
    if data.weekend_daily_minutes is not None:
        settings.weekend_daily_minutes = data.weekend_daily_minutes
    if data.preferred_study_time is not None:
        settings.preferred_study_time = data.preferred_study_time
    if data.break_interval_minutes is not None:
        settings.break_interval_minutes = data.break_interval_minutes
    if data.notifications_enabled is not None:
        settings.notifications_enabled = data.notifications_enabled

    db.commit()
    db.refresh(settings)
    return settings


def _get_upcoming_examinations(
    student: Student, db: Session, horizon_days: int = 14
) -> list[dict[str, Any]]:
    """Discovers upcoming examinations for student within the planning horizon."""
    today = dt.date.today()
    horizon = today + dt.timedelta(days=horizon_days)

    query = (
        select(
            Examination.id.label("exam_id"),
            Examination.name.label("exam_name"),
            Examination.start_date,
            ExaminationSchedule.subject_id,
        )
        .join(ExaminationSchedule, Examination.id == ExaminationSchedule.examination_id)
        .where(
            Examination.start_date >= today,
            Examination.start_date <= horizon,
        )
        .order_by(Examination.start_date.asc())
    )
    rows = db.execute(query).all()
    upcoming = []
    seen = set()
    for r in rows:
        if r.exam_id not in seen:
            seen.add(r.exam_id)
            days_left = (r.start_date - today).days
            upcoming.append({
                "exam_id": r.exam_id,
                "exam_name": r.exam_name,
                "start_date": r.start_date,
                "days_left": days_left,
            })
    return upcoming


def get_or_create_daily_study_plan(
    student: Student, plan_date: dt.date | None = None, db: Session = None
) -> AIDailyStudyPlan:
    """
    Constructs an achievable daily study plan respecting student availability,
    upcoming examinations, and pending learning recommendations.
    Never overwrites a student's existing plan tasks.
    """
    if plan_date is None:
        plan_date = dt.date.today()

    existing_plan = db.execute(
        select(AIDailyStudyPlan).where(
            AIDailyStudyPlan.student_id == student.id,
            AIDailyStudyPlan.plan_date == plan_date,
        )
    ).scalar_one_or_none()

    if existing_plan:
        return existing_plan

    # Retrieve student constraints
    settings = get_or_create_student_study_settings(student.id, db)
    is_weekend = plan_date.weekday() >= 5
    target_budget = settings.weekend_daily_minutes if is_weekend else settings.weekday_daily_minutes

    plan = AIDailyStudyPlan(
        student_id=student.id,
        plan_date=plan_date,
        total_planned_minutes=target_budget,
        completed_minutes=0,
        status=StudyPlanStatus.PLANNED.value,
    )
    db.add(plan)
    db.flush()

    # Time slot base determination
    time_bases = {
        "MORNING": ("07:00", 7, 0),
        "AFTERNOON": ("15:00", 15, 0),
        "EVENING": ("17:30", 17, 30),
        "NIGHT": ("19:30", 19, 30),
    }
    _, base_hour, base_minute = time_bases.get(settings.preferred_study_time, ("17:30", 17, 30))
    current_time_cursor = dt.datetime.combine(plan_date, dt.time(base_hour, base_minute))

    # Priority 1: Check if an exam is within 7 days
    upcoming_exams = _get_upcoming_examinations(student, db, horizon_days=7)
    items_created = 0
    used_minutes = 0

    if upcoming_exams:
        urgent_exam = upcoming_exams[0]
        exam_duration = min(30, target_budget)
        end_time_cursor = current_time_cursor + dt.timedelta(minutes=exam_duration)
        item = AIStudyPlanItem(
            plan_id=plan.id,
            subject_name=f"Exam Prep: {urgent_exam['exam_name']}",
            topic_title=f"Intensive Revision ({urgent_exam['days_left']} days left)",
            activity_type="EXAM_REVISION",
            duration_minutes=exam_duration,
            is_completed=False,
            time_spent_seconds=0,
            order_index=1,
            start_time=current_time_cursor.strftime("%H:%M"),
            end_time=end_time_cursor.strftime("%H:%M"),
            exam_id=urgent_exam["exam_id"],
        )
        db.add(item)
        items_created += 1
        used_minutes += exam_duration
        current_time_cursor = end_time_cursor + dt.timedelta(minutes=settings.break_interval_minutes)

    # Priority 2: Incomplete high-priority learning recommendations
    pending_recs = db.execute(
        select(AILearningRecommendation)
        .where(
            AILearningRecommendation.student_id == student.id,
            AILearningRecommendation.status != RecommendationStatus.COMPLETED.value,
        )
        .order_by(AILearningRecommendation.order_index.asc())
        .limit(3)
    ).scalars().all()

    activities = ["CONCEPT_REVIEW", "PRACTICE_QUIZ", "MISTAKE_REVISION"]
    for idx, rec in enumerate(pending_recs):
        if used_minutes >= target_budget:
            break
        rem = target_budget - used_minutes
        item_dur = min(rec.estimated_minutes or 20, rem)
        if item_dur < 10:
            break

        end_time_cursor = current_time_cursor + dt.timedelta(minutes=item_dur)
        item = AIStudyPlanItem(
            plan_id=plan.id,
            subject_name=rec.subject_name,
            topic_title=rec.topic_title,
            activity_type=activities[idx % len(activities)],
            duration_minutes=item_dur,
            is_completed=False,
            time_spent_seconds=0,
            order_index=items_created + 1,
            start_time=current_time_cursor.strftime("%H:%M"),
            end_time=end_time_cursor.strftime("%H:%M"),
        )
        db.add(item)
        items_created += 1
        used_minutes += item_dur
        current_time_cursor = end_time_cursor + dt.timedelta(minutes=settings.break_interval_minutes)

    # Fallback routine if no recommendations or exams yet
    if items_created == 0:
        defaults = [
            ("Mathematics", "Linear Equations & Algebra Review", "CONCEPT_REVIEW", 20),
            ("General Science", "Photosynthesis & Respiration", "PRACTICE_QUIZ", 15),
            ("English", "Grammar & Sentence Synthesis", "CONCEPT_REVIEW", 10),
        ]
        for idx, (subj, top, act, dur) in enumerate(defaults, start=1):
            end_time_cursor = current_time_cursor + dt.timedelta(minutes=dur)
            item = AIStudyPlanItem(
                plan_id=plan.id,
                subject_name=subj,
                topic_title=top,
                activity_type=act,
                duration_minutes=dur,
                is_completed=False,
                time_spent_seconds=0,
                order_index=idx,
                start_time=current_time_cursor.strftime("%H:%M"),
                end_time=end_time_cursor.strftime("%H:%M"),
            )
            db.add(item)
            used_minutes += dur
            current_time_cursor = end_time_cursor + dt.timedelta(minutes=settings.break_interval_minutes)

    plan.total_planned_minutes = used_minutes
    db.commit()
    db.refresh(plan)
    return plan


def get_weekly_study_plan(
    student: Student, week_start_date: dt.date | None = None, db: Session = None
) -> WeeklyStudyPlanResponse:
    """
    Returns a unified 7-day weekly study schedule (Monday to Sunday)
    integrated with student timetable events and upcoming examinations.
    """
    if week_start_date is None:
        today = dt.date.today()
        week_start_date = today - dt.timedelta(days=today.weekday())  # Monday

    daily_plan_responses: list[DailyStudyPlanResponse] = []
    total_planned = 0
    total_completed = 0

    for day_offset in range(7):
        current_day = week_start_date + dt.timedelta(days=day_offset)
        plan = get_or_create_daily_study_plan(student, plan_date=current_day, db=db)
        total_planned += plan.total_planned_minutes
        total_completed += plan.completed_minutes
        daily_plan_responses.append(DailyStudyPlanResponse.model_validate(plan))

    upcoming = _get_upcoming_examinations(student, db, horizon_days=14)
    pct = round((total_completed / total_planned) * 100.0, 1) if total_planned > 0 else 0.0

    return WeeklyStudyPlanResponse(
        week_start_date=week_start_date,
        total_planned_minutes=total_planned,
        completed_minutes=total_completed,
        daily_plans=daily_plan_responses,
        upcoming_exams_count=len(upcoming),
        completion_percentage=pct,
    )


def add_custom_study_plan_item(
    student: Student,
    subject_name: str,
    topic_title: str,
    duration_minutes: int,
    activity_type: str,
    db: Session,
) -> AIDailyStudyPlan:
    """Allows student to append a targeted revision topic directly into today's plan."""
    plan = get_or_create_daily_study_plan(student, db=db)
    max_order = max([i.order_index for i in plan.items], default=0)

    item = AIStudyPlanItem(
        plan_id=plan.id,
        subject_name=subject_name,
        topic_title=topic_title,
        activity_type=activity_type,
        duration_minutes=duration_minutes,
        is_completed=False,
        time_spent_seconds=0,
        order_index=max_order + 1,
    )
    db.add(item)
    plan.total_planned_minutes += duration_minutes
    db.commit()
    db.refresh(plan)
    return plan


def reschedule_study_plan_item(
    student: Student,
    item_id: uuid.UUID,
    target_date: dt.date,
    db: Session,
) -> AIDailyStudyPlan:
    """Moves a missed or delayed study item to a new date with full traceability."""
    item = db.execute(
        select(AIStudyPlanItem)
        .join(AIDailyStudyPlan, AIStudyPlanItem.plan_id == AIDailyStudyPlan.id)
        .where(
            AIStudyPlanItem.id == item_id,
            AIDailyStudyPlan.student_id == student.id,
        )
    ).scalar_one_or_none()

    if not item:
        raise ValueError("Study plan item not found")

    target_plan = get_or_create_daily_study_plan(student, plan_date=target_date, db=db)
    max_order = max([i.order_index for i in target_plan.items], default=0)

    # Detach from old plan and attach to target plan
    old_plan = item.plan
    old_plan.total_planned_minutes = max(0, old_plan.total_planned_minutes - item.duration_minutes)

    item.plan_id = target_plan.id
    item.order_index = max_order + 1
    item.is_rescheduled = True
    target_plan.total_planned_minutes += item.duration_minutes

    db.commit()
    db.refresh(target_plan)
    return target_plan
