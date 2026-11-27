import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.modules.students.models import Student
from app.modules.ai.learning.dtos import StudyPlanItemDTO, DailyStudyPlanDTO
from app.modules.ai.learning.schemas import DailyStudyPlanResponse, StudyPlanItemResponse

logger = logging.getLogger(__name__)

# In-memory store for routine state across requests within runtime
_student_routines: dict[uuid.UUID, DailyStudyPlanDTO] = {}


def _get_or_init_routine(student: Student, plan_date: dt.date | None, db: Session) -> DailyStudyPlanDTO:
    date_to_use = plan_date or dt.date.today()
    routine = _student_routines.get(student.id)
    if not routine or routine.plan_date != date_to_use:
        from app.modules.ai.learning.service import get_or_create_daily_study_plan
        routine = get_or_create_daily_study_plan(student, db)
        routine.plan_date = date_to_use
        _student_routines[student.id] = routine
    return routine


def _sync_counts(routine: DailyStudyPlanDTO):
    routine.total_activities_count = len(routine.items)
    routine.completed_activities_count = sum(1 for i in routine.items if i.is_completed)
    routine.pending_activities_count = routine.total_activities_count - routine.completed_activities_count
    if routine.total_activities_count > 0:
        routine.completion_percentage = round((routine.completed_activities_count / routine.total_activities_count) * 100.0, 1)


def get_daily_routine(student: Student, plan_date: dt.date | None, db: Session) -> DailyStudyPlanResponse:
    routine = _get_or_init_routine(student, plan_date, db)
    _sync_counts(routine)
    return DailyStudyPlanResponse.model_validate(routine)


def create_routine_activity(
    student: Student,
    data: dict[str, Any],
    db: Session,
) -> DailyStudyPlanResponse:
    routine = _get_or_init_routine(student, None, db)
    item = StudyPlanItemDTO(
        id=uuid.uuid4(),
        subject_name=data.get("subject_name", "General Studies"),
        topic_title=data.get("topic_title", "Concept Practice"),
        title=data.get("title") or data.get("topic_title"),
        description=data.get("description"),
        activity_type=data.get("activity_type", "CONCEPT_LEARNING"),
        duration_minutes=data.get("duration_minutes", 20),
        priority=data.get("priority", "MEDIUM"),
        start_time=data.get("start_time"),
        end_time=data.get("end_time"),
        notes=data.get("notes"),
        is_custom=True,
    )
    routine.items.append(item)
    routine.total_planned_minutes += item.duration_minutes
    routine.remaining_minutes = max(0, routine.total_planned_minutes - routine.completed_minutes)
    _sync_counts(routine)
    return DailyStudyPlanResponse.model_validate(routine)


def update_routine_activity(
    student: Student,
    activity_id: uuid.UUID,
    data: dict[str, Any],
    db: Session,
) -> DailyStudyPlanResponse:
    routine = _get_or_init_routine(student, None, db)
    for item in routine.items:
        if item.id == activity_id:
            for k, v in data.items():
                if v is not None and hasattr(item, k):
                    setattr(item, k, v)
            break
    _sync_counts(routine)
    return DailyStudyPlanResponse.model_validate(routine)


def update_activity_status(
    student: Student,
    activity_id: uuid.UUID,
    status: str,
    time_spent_seconds: int = 0,
    db: Session = None,
) -> DailyStudyPlanResponse:
    routine = _get_or_init_routine(student, None, db)
    for item in routine.items:
        if item.id == activity_id:
            item.status = status
            item.is_completed = (status == "COMPLETED")
            if time_spent_seconds:
                item.time_spent_seconds = (item.time_spent_seconds or 0) + time_spent_seconds
            break
    
    comp_mins = sum(i.duration_minutes for i in routine.items if i.is_completed)
    routine.completed_minutes = max(routine.completed_minutes, comp_mins)
    _sync_counts(routine)
    return DailyStudyPlanResponse.model_validate(routine)


def delete_routine_activity(
    student: Student, activity_id: uuid.UUID, db: Session
) -> DailyStudyPlanResponse:
    routine = _get_or_init_routine(student, None, db)
    routine.items = [i for i in routine.items if i.id != activity_id]
    _sync_counts(routine)
    return DailyStudyPlanResponse.model_validate(routine)


def duplicate_routine(
    student: Student,
    source_date: dt.date,
    target_date: dt.date,
    activity_ids: list[uuid.UUID] | None,
    db: Session,
) -> DailyStudyPlanResponse:
    source_routine = _get_or_init_routine(student, source_date, db)
    items_to_copy = source_routine.items
    if activity_ids:
        items_to_copy = [i for i in source_routine.items if i.id in activity_ids]
    
    new_items = [
        StudyPlanItemDTO(
            id=uuid.uuid4(),
            subject_name=i.subject_name,
            topic_title=i.topic_title,
            title=i.title,
            description=i.description,
            activity_type=i.activity_type,
            priority=i.priority,
            duration_minutes=i.duration_minutes,
            is_completed=False,
            is_custom=i.is_custom,
            notes=i.notes,
        )
        for i in items_to_copy
    ]
    target_routine = DailyStudyPlanDTO(
        id=uuid.uuid4(),
        student_id=student.id,
        plan_date=target_date,
        total_planned_minutes=sum(i.duration_minutes for i in new_items),
        completed_minutes=0,
        remaining_minutes=sum(i.duration_minutes for i in new_items),
        status="PLANNED",
        items=new_items,
    )
    _sync_counts(target_routine)
    _student_routines[student.id] = target_routine
    return DailyStudyPlanResponse.model_validate(target_routine)


def reorder_routine_activities(
    student: Student, ordered_ids: list[uuid.UUID], db: Session
) -> list[StudyPlanItemResponse]:
    routine = _get_or_init_routine(student, None, db)
    item_map = {i.id: i for i in routine.items}
    reordered: list[StudyPlanItemResponse] = []
    for idx, i_id in enumerate(ordered_ids):
        if i_id in item_map:
            item = item_map[i_id]
            item.order_index = idx
            reordered.append(StudyPlanItemResponse.model_validate(item))
    return reordered
