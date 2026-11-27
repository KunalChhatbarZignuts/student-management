import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.ai.learning.dtos import (
    DailyStudyPlanDTO,
    StudyPlanItemDTO,
    StudentStudySettingsDTO,
)
from app.modules.ai.learning.schemas import (
    DailyStudyPlanResponse,
    WeeklyStudyPlanResponse,
    StudentStudySettingsResponse,
)

logger = logging.getLogger(__name__)


def get_or_create_student_study_settings(
    student_id: uuid.UUID, db: Session
) -> StudentStudySettingsDTO:
    """Returns study settings for student with sensible defaults."""
    return StudentStudySettingsDTO(student_id=student_id)


def update_student_study_settings(
    student_id: uuid.UUID,
    data: dict[str, Any],
    db: Session,
) -> StudentStudySettingsDTO:
    """Simulates updating study settings."""
    settings = get_or_create_student_study_settings(student_id, db)
    for k, v in data.items():
        if hasattr(settings, k) and v is not None:
            setattr(settings, k, v)
    return settings


def get_or_create_daily_study_plan(student: Student, db: Session) -> DailyStudyPlanDTO:
    """Returns today's dynamically generated study plan."""
    from app.modules.ai.learning.service import get_or_create_daily_study_plan as gsp
    return gsp(student, db)


def get_weekly_study_plan(student: Student, db: Session) -> WeeklyStudyPlanResponse:
    """Generates a 7-day projected study plan based on schedule and exam load."""
    today = dt.date.today()
    days: list[WeeklyDayPlan] = []
    total_minutes = 0

    from app.modules.ai.learning.service import ensure_learning_recommendations, compute_student_exam_performance
    perf = compute_student_exam_performance(student.id, db)
    recs = ensure_learning_recommendations(student, perf.get("subject_summaries", []), db)

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for i in range(7):
        current_date = today + dt.timedelta(days=i)
        is_weekend = current_date.weekday() in (5, 6)
        daily_target = 60 if is_weekend else 45
        total_minutes += daily_target

        assigned_rec = recs[i % len(recs)] if recs else None
        subj_name = assigned_rec.subject_name if assigned_rec else "General Studies"
        top_name = assigned_rec.topic_title if assigned_rec else "Core Review"

        items = [
            StudyPlanItemDTO(
                id=uuid.uuid5(student.id, f"weekly_item:{current_date}:1"),
                subject_name=subj_name,
                topic_title=top_name,
                activity_type="CONCEPT_REVIEW",
                duration_minutes=daily_target,
                is_completed=(i == 0),
            )
        ]

        days.append(
            DailyStudyPlanResponse(
                id=uuid.uuid5(student.id, f"plan:{current_date}"),
                student_id=student.id,
                plan_date=current_date,
                total_planned_minutes=daily_target,
                completed_minutes=daily_target if i == 0 else 0,
                status="IN_PROGRESS" if i == 0 else "PLANNED",
                items=items,
            )
        )

    return WeeklyStudyPlanResponse(
        week_start_date=today,
        total_planned_minutes=total_minutes,
        completed_minutes=45,
        daily_plans=days,
    )


def add_custom_study_plan_item(
    student: Student,
    subject_name: str,
    topic_title: str,
    duration_minutes: int,
    activity_type: str,
    db: Session,
) -> StudyPlanItemDTO:
    """Creates a custom study item."""
    from app.modules.ai.learning.service import add_custom_study_plan_item as aci
    return aci(student, subject_name, topic_title, duration_minutes, activity_type, db)


def reschedule_study_plan_item(
    student: Student,
    item_id: uuid.UUID,
    target_date: dt.date,
    reason: str,
    db: Session,
) -> StudyPlanItemDTO:
    """Reschedules study item DTO."""
    return StudyPlanItemDTO(
        id=item_id,
        subject_name="Rescheduled Subject",
        topic_title="Rescheduled Topic",
        duration_minutes=25,
        is_rescheduled=True,
    )
