import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.ai_learning import (
    AIDailyStudyPlan,
    AIStudyPlanItem,
    StudyPlanStatus,
    RoutineActivityStatus,
    RoutineActivityPriority,
    RoutineActivityType,
)
from app.schemas.ai_learning import (
    CreateRoutineActivityRequest,
    UpdateRoutineActivityRequest,
    UpdateActivityStatusRequest,
    DailyStudyPlanResponse,
    StudyPlanItemResponse,
    StudySessionResponse,
    UpdateDailyRoutineMetadataRequest,
)
from app.services.learning.study_planner_engine import get_or_create_daily_study_plan
from app.services.learning.study_session_service import (
    get_active_study_session,
    compute_session_progress,
)

logger = logging.getLogger(__name__)


def _recalculate_plan_metrics(plan: AIDailyStudyPlan, db: Session) -> None:
    """Recomputes total duration, completed duration, and status for a daily plan."""
    active_items = [i for i in plan.items if not i.is_deleted]
    plan.total_planned_minutes = sum(i.duration_minutes for i in active_items)
    plan.completed_minutes = sum(i.duration_minutes for i in active_items if i.is_completed)

    if not active_items:
        plan.status = StudyPlanStatus.PLANNED.value
    elif all(i.is_completed for i in active_items):
        plan.status = StudyPlanStatus.COMPLETED.value
    elif any(i.is_completed for i in active_items):
        plan.status = StudyPlanStatus.PARTIALLY_COMPLETED.value
    else:
        plan.status = StudyPlanStatus.PLANNED.value

    db.commit()
    db.refresh(plan)


def get_daily_routine(student: Student, plan_date: dt.date, db: Session) -> DailyStudyPlanResponse:
    """Retrieves or creates the student's daily routine, including full stats and active timer session."""
    plan = db.execute(
        select(AIDailyStudyPlan).where(
            AIDailyStudyPlan.student_id == student.id,
            AIDailyStudyPlan.plan_date == plan_date,
        )
    ).scalar_one_or_none()

    if not plan:
        # Generate automatically using the constraint engine
        plan = get_or_create_daily_study_plan(student=student, plan_date=plan_date, db=db)

    active_items = [i for i in plan.items if not i.is_deleted]
    active_items.sort(key=lambda x: x.order_index)

    total_mins = sum(i.duration_minutes for i in active_items)
    completed_mins = sum(i.duration_minutes for i in active_items if i.is_completed)
    remaining_mins = max(0, total_mins - completed_mins)
    completion_pct = round((completed_mins / total_mins * 100), 1) if total_mins > 0 else 0.0

    completed_count = len([i for i in active_items if i.is_completed or i.status == RoutineActivityStatus.COMPLETED.value])
    pending_count = len([i for i in active_items if not i.is_completed and i.status != RoutineActivityStatus.COMPLETED.value])

    # Check for active session
    active_session_model = get_active_study_session(student.id, db)
    active_session_dto: StudySessionResponse | None = None
    if active_session_model and active_session_model.plan_item and active_session_model.plan_item.plan_id == plan.id:
        progress = compute_session_progress(active_session_model)
        active_session_dto = StudySessionResponse(
            id=active_session_model.id,
            student_id=active_session_model.student_id,
            plan_item_id=active_session_model.plan_item_id,
            status=active_session_model.status,
            start_time=active_session_model.start_time,
            end_time=active_session_model.end_time,
            paused_at=active_session_model.paused_at,
            accumulated_seconds=active_session_model.accumulated_seconds,
            target_duration_seconds=active_session_model.target_duration_seconds,
            notes=active_session_model.notes,
            activity_title=active_session_model.plan_item.title or active_session_model.plan_item.topic_title,
            subject_name=active_session_model.plan_item.subject_name,
            elapsed_seconds=progress["elapsed_seconds"],
            remaining_seconds=progress["remaining_seconds"],
        )

    items_dto = [
        StudyPlanItemResponse(
            id=i.id,
            plan_id=i.plan_id,
            subject_name=i.subject_name,
            topic_title=i.topic_title,
            title=i.title or i.topic_title,
            description=i.description,
            activity_type=i.activity_type,
            priority=i.priority or RoutineActivityPriority.MEDIUM.value,
            status=i.status or (RoutineActivityStatus.COMPLETED.value if i.is_completed else RoutineActivityStatus.PENDING.value),
            duration_minutes=i.duration_minutes,
            is_completed=i.is_completed,
            is_custom=i.is_custom,
            time_spent_seconds=i.time_spent_seconds,
            order_index=i.order_index,
            start_time=i.start_time,
            end_time=i.end_time,
            notes=i.notes,
            recommended_resource_url=i.recommended_resource_url,
            exam_id=i.exam_id,
            is_rescheduled=i.is_rescheduled,
            is_deleted=i.is_deleted,
        )
        for i in active_items
    ]

    return DailyStudyPlanResponse(
        id=plan.id,
        student_id=plan.student_id,
        plan_date=plan.plan_date,
        total_planned_minutes=total_mins,
        completed_minutes=completed_mins,
        remaining_minutes=remaining_mins,
        completion_percentage=completion_pct,
        status=plan.status,
        notes=plan.notes,
        is_archived=plan.is_archived,
        total_activities_count=len(active_items),
        completed_activities_count=completed_count,
        pending_activities_count=pending_count,
        items=items_dto,
        active_session=active_session_dto,
    )


def create_routine_activity(
    student: Student,
    payload: CreateRoutineActivityRequest,
    db: Session,
) -> DailyStudyPlanResponse:
    """Creates a new custom or recommended activity in the student's study routine."""
    target_date = payload.target_date or dt.date.today()
    plan = db.execute(
        select(AIDailyStudyPlan).where(
            AIDailyStudyPlan.student_id == student.id,
            AIDailyStudyPlan.plan_date == target_date,
        )
    ).scalar_one_or_none()

    if not plan:
        plan = get_or_create_daily_study_plan(student=student, plan_date=target_date, db=db)

    active_items = [i for i in plan.items if not i.is_deleted]
    next_order = max([i.order_index for i in active_items], default=-1) + 1

    item = AIStudyPlanItem(
        plan_id=plan.id,
        subject_name=payload.subject_name,
        topic_title=payload.topic_title,
        title=payload.title or payload.topic_title,
        description=payload.description,
        activity_type=payload.activity_type or RoutineActivityType.CONCEPT_LEARNING.value,
        duration_minutes=payload.duration_minutes,
        priority=payload.priority or RoutineActivityPriority.MEDIUM.value,
        status=RoutineActivityStatus.PENDING.value,
        is_completed=False,
        is_custom=True,
        time_spent_seconds=0,
        order_index=next_order,
        start_time=payload.start_time,
        end_time=payload.end_time,
        notes=payload.notes,
        recommended_resource_url=payload.recommended_resource_url,
    )
    db.add(item)
    db.commit()
    db.refresh(plan)

    _recalculate_plan_metrics(plan, db)
    return get_daily_routine(student=student, plan_date=target_date, db=db)


def update_routine_activity(
    student: Student,
    activity_id: uuid.UUID,
    payload: UpdateRoutineActivityRequest,
    db: Session,
) -> DailyStudyPlanResponse:
    """Updates an existing activity's details or completion status."""
    item = db.execute(
        select(AIStudyPlanItem).where(
            AIStudyPlanItem.id == activity_id,
            AIStudyPlanItem.is_deleted == False,
        )
    ).scalar_one_or_none()

    if not item or item.plan.student_id != student.id:
        raise ValueError("Activity not found or unauthorized.")

    if payload.subject_name is not None:
        item.subject_name = payload.subject_name
    if payload.topic_title is not None:
        item.topic_title = payload.topic_title
    if payload.title is not None:
        item.title = payload.title
    if payload.description is not None:
        item.description = payload.description
    if payload.activity_type is not None:
        item.activity_type = payload.activity_type
    if payload.duration_minutes is not None:
        item.duration_minutes = payload.duration_minutes
    if payload.priority is not None:
        item.priority = payload.priority
    if payload.start_time is not None:
        item.start_time = payload.start_time
    if payload.end_time is not None:
        item.end_time = payload.end_time
    if payload.notes is not None:
        item.notes = payload.notes
    if payload.recommended_resource_url is not None:
        item.recommended_resource_url = payload.recommended_resource_url

    if payload.status is not None:
        item.status = payload.status
        if payload.status == RoutineActivityStatus.COMPLETED.value:
            item.is_completed = True
        elif payload.status == RoutineActivityStatus.PENDING.value:
            item.is_completed = False

    if payload.is_completed is not None:
        item.is_completed = payload.is_completed
        if item.is_completed and item.status != RoutineActivityStatus.COMPLETED.value:
            item.status = RoutineActivityStatus.COMPLETED.value
        elif not item.is_completed and item.status == RoutineActivityStatus.COMPLETED.value:
            item.status = RoutineActivityStatus.PENDING.value

    db.commit()
    _recalculate_plan_metrics(item.plan, db)
    return get_daily_routine(student=student, plan_date=item.plan.plan_date, db=db)


def update_activity_status(
    student: Student,
    activity_id: uuid.UUID,
    payload: UpdateActivityStatusRequest,
    db: Session,
) -> DailyStudyPlanResponse:
    """Toggles or sets the status of an activity and updates time spent."""
    item = db.execute(
        select(AIStudyPlanItem).where(
            AIStudyPlanItem.id == activity_id,
            AIStudyPlanItem.is_deleted == False,
        )
    ).scalar_one_or_none()

    if not item or item.plan.student_id != student.id:
        raise ValueError("Activity not found or unauthorized.")

    item.status = payload.status
    if payload.status == RoutineActivityStatus.COMPLETED.value:
        item.is_completed = True
    elif payload.status in [RoutineActivityStatus.PENDING.value, RoutineActivityStatus.SKIPPED.value]:
        item.is_completed = False

    if payload.additional_seconds_spent > 0:
        item.time_spent_seconds += payload.additional_seconds_spent

    db.commit()
    _recalculate_plan_metrics(item.plan, db)
    return get_daily_routine(student=student, plan_date=item.plan.plan_date, db=db)


def delete_routine_activity(
    student: Student,
    activity_id: uuid.UUID,
    db: Session,
) -> DailyStudyPlanResponse:
    """Soft deletes a routine activity, preserving historical metrics and sessions."""
    item = db.execute(
        select(AIStudyPlanItem).where(
            AIStudyPlanItem.id == activity_id,
            AIStudyPlanItem.is_deleted == False,
        )
    ).scalar_one_or_none()

    if not item or item.plan.student_id != student.id:
        raise ValueError("Activity not found or unauthorized.")

    plan_date = item.plan.plan_date
    item.is_deleted = True
    db.commit()
    _recalculate_plan_metrics(item.plan, db)
    return get_daily_routine(student=student, plan_date=plan_date, db=db)


def reorder_routine_activities(
    student: Student,
    item_ids: list[uuid.UUID],
    db: Session,
) -> DailyStudyPlanResponse:
    """Reorders activities within a plan."""
    if not item_ids:
        raise ValueError("Item ids list cannot be empty.")

    items = db.execute(
        select(AIStudyPlanItem).where(
            AIStudyPlanItem.id.in_(item_ids),
            AIStudyPlanItem.is_deleted == False,
        )
    ).scalars().all()

    if not items or any(i.plan.student_id != student.id for i in items):
        raise ValueError("One or more items not found or unauthorized.")

    plan = items[0].plan
    id_to_order = {id_: idx for idx, id_ in enumerate(item_ids)}
    for item in items:
        if item.id in id_to_order:
            item.order_index = id_to_order[item.id]

    db.commit()
    return get_daily_routine(student=student, plan_date=plan.plan_date, db=db)


def duplicate_routine(
    student: Student,
    source_date: dt.date,
    target_date: dt.date,
    include_completed: bool,
    db: Session,
) -> DailyStudyPlanResponse:
    """Duplicates activities from a source date to a target date."""
    source_plan = db.execute(
        select(AIDailyStudyPlan).where(
            AIDailyStudyPlan.student_id == student.id,
            AIDailyStudyPlan.plan_date == source_date,
        )
    ).scalar_one_or_none()

    if not source_plan:
        raise ValueError("Source routine not found.")

    target_plan = db.execute(
        select(AIDailyStudyPlan).where(
            AIDailyStudyPlan.student_id == student.id,
            AIDailyStudyPlan.plan_date == target_date,
        )
    ).scalar_one_or_none()

    if not target_plan:
        target_plan = AIDailyStudyPlan(
            student_id=student.id,
            plan_date=target_date,
            total_planned_minutes=0,
            completed_minutes=0,
            status=StudyPlanStatus.PLANNED.value,
        )
        db.add(target_plan)
        db.commit()
        db.refresh(target_plan)

    items_to_copy = [i for i in source_plan.items if not i.is_deleted]
    if not include_completed:
        items_to_copy = [i for i in items_to_copy if not i.is_completed]

    existing_target_items = [i for i in target_plan.items if not i.is_deleted]
    start_order = max([i.order_index for i in existing_target_items], default=-1) + 1

    for idx, item in enumerate(items_to_copy):
        new_item = AIStudyPlanItem(
            plan_id=target_plan.id,
            subject_name=item.subject_name,
            topic_title=item.topic_title,
            title=item.title,
            description=item.description,
            activity_type=item.activity_type,
            priority=item.priority,
            status=RoutineActivityStatus.PENDING.value,
            duration_minutes=item.duration_minutes,
            is_completed=False,
            is_custom=item.is_custom,
            time_spent_seconds=0,
            order_index=start_order + idx,
            start_time=item.start_time,
            end_time=item.end_time,
            notes=item.notes,
            recommended_resource_url=item.recommended_resource_url,
        )
        db.add(new_item)

    db.commit()
    _recalculate_plan_metrics(target_plan, db)
    return get_daily_routine(student=student, plan_date=target_date, db=db)


def update_routine_metadata(
    student: Student,
    plan_date: dt.date,
    payload: UpdateDailyRoutineMetadataRequest,
    db: Session,
) -> DailyStudyPlanResponse:
    """Updates top-level routine metadata such as daily notes or archived state."""
    plan = db.execute(
        select(AIDailyStudyPlan).where(
            AIDailyStudyPlan.student_id == student.id,
            AIDailyStudyPlan.plan_date == plan_date,
        )
    ).scalar_one_or_none()

    if not plan:
        raise ValueError("Routine not found for date.")

    if payload.notes is not None:
        plan.notes = payload.notes
    if payload.is_archived is not None:
        plan.is_archived = payload.is_archived

    db.commit()
    db.refresh(plan)
    return get_daily_routine(student=student, plan_date=plan_date, db=db)
