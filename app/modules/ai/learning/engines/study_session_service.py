import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.ai.learning.models import (
    AIStudyPlanItem,
    AIStudySession,
    StudySessionStatus,
    RoutineActivityStatus,
    StudyPlanStatus,
)

logger = logging.getLogger(__name__)


def get_active_study_session(student_id: uuid.UUID, db: Session) -> AIStudySession | None:
    """Returns the currently running or paused study session for the student."""
    return db.execute(
        select(AIStudySession)
        .where(
            AIStudySession.student_id == student_id,
            AIStudySession.status.in_([StudySessionStatus.ACTIVE.value, StudySessionStatus.PAUSED.value]),
        )
        .order_by(desc(AIStudySession.created_at))
    ).scalars().first()


def compute_session_progress(session: AIStudySession) -> dict[str, int]:
    """Calculates elapsed and remaining seconds using precise server timestamps."""
    accumulated = session.accumulated_seconds or 0
    if session.status == StudySessionStatus.ACTIVE.value and session.start_time:
        now = dt.datetime.now(dt.timezone.utc)
        start_tz = session.start_time
        if start_tz.tzinfo is None:
            start_tz = start_tz.replace(tzinfo=dt.timezone.utc)
        current_run = int((now - start_tz).total_seconds())
        elapsed = accumulated + max(0, current_run)
    else:
        elapsed = accumulated

    remaining = max(0, session.target_duration_seconds - elapsed)
    return {"elapsed_seconds": elapsed, "remaining_seconds": remaining}


def start_study_session(
    student: Student,
    plan_item_id: uuid.UUID,
    target_duration_seconds: int,
    db: Session,
) -> AIStudySession:
    """Starts a new persistent study session, verifying student ownership and no concurrent session."""
    active = get_active_study_session(student.id, db)
    if active:
        raise ValueError("An active study session is already running. Please pause or finish it first.")

    item = db.execute(
        select(AIStudyPlanItem).where(
            AIStudyPlanItem.id == plan_item_id,
            AIStudyPlanItem.is_deleted == False,
        )
    ).scalar_one_or_none()

    if not item or item.plan.student_id != student.id:
        raise ValueError("Study activity item not found or unauthorized.")

    now = dt.datetime.now(dt.timezone.utc)
    target_sec = target_duration_seconds if target_duration_seconds > 0 else (item.duration_minutes * 60)

    session = AIStudySession(
        student_id=student.id,
        plan_item_id=item.id,
        status=StudySessionStatus.ACTIVE.value,
        start_time=now,
        accumulated_seconds=item.time_spent_seconds or 0,
        target_duration_seconds=target_sec,
    )
    db.add(session)

    item.status = RoutineActivityStatus.IN_PROGRESS.value
    db.commit()
    db.refresh(session)
    return session


def pause_study_session(student: Student, session_id: uuid.UUID, db: Session) -> AIStudySession:
    """Pauses an active timer session and accumulates elapsed seconds."""
    session = db.execute(
        select(AIStudySession).where(
            AIStudySession.id == session_id,
            AIStudySession.student_id == student.id,
        )
    ).scalar_one_or_none()

    if not session or session.status != StudySessionStatus.ACTIVE.value:
        raise ValueError("No active study session found to pause.")

    now = dt.datetime.now(dt.timezone.utc)
    start_tz = session.start_time
    if start_tz.tzinfo is None:
        start_tz = start_tz.replace(tzinfo=dt.timezone.utc)

    delta = int((now - start_tz).total_seconds())
    session.accumulated_seconds += max(0, delta)
    session.paused_at = now
    session.status = StudySessionStatus.PAUSED.value

    # Update item time spent
    item = session.plan_item
    item.time_spent_seconds = session.accumulated_seconds
    item.status = RoutineActivityStatus.PAUSED.value

    db.commit()
    db.refresh(session)
    return session


def resume_study_session(student: Student, session_id: uuid.UUID, db: Session) -> AIStudySession:
    """Resumes a paused timer session."""
    session = db.execute(
        select(AIStudySession).where(
            AIStudySession.id == session_id,
            AIStudySession.student_id == student.id,
        )
    ).scalar_one_or_none()

    if not session or session.status != StudySessionStatus.PAUSED.value:
        raise ValueError("No paused study session found to resume.")

    now = dt.datetime.now(dt.timezone.utc)
    session.start_time = now
    session.paused_at = None
    session.status = StudySessionStatus.ACTIVE.value

    item = session.plan_item
    item.status = RoutineActivityStatus.IN_PROGRESS.value

    db.commit()
    db.refresh(session)
    return session


def finish_study_session(
    student: Student,
    session_id: uuid.UUID,
    mark_activity_completed: bool,
    notes: str | None,
    db: Session,
) -> AIStudySession:
    """Explicitly finishes a study session, updates item and plan metrics."""
    session = db.execute(
        select(AIStudySession).where(
            AIStudySession.id == session_id,
            AIStudySession.student_id == student.id,
            AIStudySession.status.in_([StudySessionStatus.ACTIVE.value, StudySessionStatus.PAUSED.value]),
        )
    ).scalar_one_or_none()

    if not session:
        raise ValueError("Active or paused study session not found.")

    now = dt.datetime.now(dt.timezone.utc)
    if session.status == StudySessionStatus.ACTIVE.value:
        start_tz = session.start_time
        if start_tz.tzinfo is None:
            start_tz = start_tz.replace(tzinfo=dt.timezone.utc)
        delta = int((now - start_tz).total_seconds())
        session.accumulated_seconds += max(0, delta)

    session.end_time = now
    session.status = StudySessionStatus.COMPLETED.value
    if notes:
        session.notes = notes

    item = session.plan_item
    item.time_spent_seconds = session.accumulated_seconds
    if mark_activity_completed:
        item.is_completed = True
        item.status = RoutineActivityStatus.COMPLETED.value
    elif item.status in [RoutineActivityStatus.IN_PROGRESS.value, RoutineActivityStatus.PAUSED.value]:
        item.status = RoutineActivityStatus.PENDING.value

    if notes and not item.notes:
        item.notes = notes

    # Recalculate plan status
    plan = item.plan
    active_items = [i for i in plan.items if not i.is_deleted]
    completed_dur = sum(i.duration_minutes for i in active_items if i.is_completed)
    plan.completed_minutes = completed_dur

    if active_items and all(i.is_completed for i in active_items):
        plan.status = StudyPlanStatus.COMPLETED.value
    elif any(i.is_completed for i in active_items):
        plan.status = StudyPlanStatus.PARTIALLY_COMPLETED.value
    else:
        plan.status = StudyPlanStatus.PLANNED.value

    db.commit()
    db.refresh(session)
    return session


def cancel_study_session(student: Student, session_id: uuid.UUID, db: Session) -> AIStudySession:
    """Cancels and discards an active or paused session."""
    session = db.execute(
        select(AIStudySession).where(
            AIStudySession.id == session_id,
            AIStudySession.student_id == student.id,
            AIStudySession.status.in_([StudySessionStatus.ACTIVE.value, StudySessionStatus.PAUSED.value]),
        )
    ).scalar_one_or_none()

    if not session:
        raise ValueError("Active or paused study session not found.")

    session.end_time = dt.datetime.now(dt.timezone.utc)
    session.status = StudySessionStatus.CANCELLED.value

    item = session.plan_item
    if not item.is_completed and item.status in [RoutineActivityStatus.IN_PROGRESS.value, RoutineActivityStatus.PAUSED.value]:
        item.status = RoutineActivityStatus.PENDING.value

    db.commit()
    db.refresh(session)
    return session
