import datetime as dt
import logging
import uuid
from typing import Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.modules.students.models import Student
from app.modules.ai.learning.schemas import StudySessionResponse

logger = logging.getLogger(__name__)

_active_sessions: dict[uuid.UUID, StudySessionResponse] = {}


def get_active_study_session(student_id: uuid.UUID, db: Session = None) -> StudySessionResponse | None:
    session = _active_sessions.get(student_id)
    if session and session.status in ("ACTIVE", "PAUSED"):
        return session
    return None


def compute_session_progress(session: Any) -> dict[str, int]:
    return {"elapsed_seconds": 0, "remaining_seconds": 1500}


def start_study_session(
    student: Student,
    plan_item_id: uuid.UUID,
    target_duration_seconds: int = 1500,
    db: Session = None,
) -> StudySessionResponse:
    existing = get_active_study_session(student.id, db)
    if existing:
        raise HTTPException(status_code=400, detail="A study session is already running.")

    now = dt.datetime.now(dt.timezone.utc)
    session = StudySessionResponse(
        id=uuid.uuid4(),
        student_id=student.id,
        plan_item_id=plan_item_id,
        status="ACTIVE",
        start_time=now,
        target_duration_seconds=target_duration_seconds,
        elapsed_seconds=0,
        remaining_seconds=target_duration_seconds,
    )
    _active_sessions[student.id] = session
    return session


def pause_study_session(student: Student, session_id: uuid.UUID, db: Session = None) -> StudySessionResponse:
    session = _active_sessions.get(student.id)
    if session and session.id == session_id:
        session.status = "PAUSED"
        session.paused_at = dt.datetime.now(dt.timezone.utc)
        return session
    raise HTTPException(status_code=404, detail="Active session not found")


def resume_study_session(student: Student, session_id: uuid.UUID, db: Session = None) -> StudySessionResponse:
    session = _active_sessions.get(student.id)
    if session and session.id == session_id:
        session.status = "ACTIVE"
        session.paused_at = None
        return session
    raise HTTPException(status_code=404, detail="Active session not found")


def finish_study_session(
    student: Student,
    session_id: uuid.UUID,
    notes: str | None = None,
    mark_item_completed: bool = True,
    db: Session = None,
) -> StudySessionResponse:
    session = _active_sessions.pop(student.id, None)
    now = dt.datetime.now(dt.timezone.utc)
    if not session or session.id != session_id:
        session = StudySessionResponse(
            id=session_id,
            student_id=student.id,
            plan_item_id=uuid.uuid4(),
            status="COMPLETED",
            start_time=now,
            end_time=now,
            notes=notes,
        )
    else:
        session.status = "COMPLETED"
        session.end_time = now
        session.notes = notes

    if mark_item_completed and session.plan_item_id:
        from app.modules.ai.learning.engines.study_routine_service import update_activity_status
        update_activity_status(student, session.plan_item_id, "COMPLETED", 0, db)

    return session


def cancel_study_session(student: Student, session_id: uuid.UUID, db: Session = None) -> StudySessionResponse:
    session = _active_sessions.pop(student.id, None)
    now = dt.datetime.now(dt.timezone.utc)
    if session:
        session.status = "CANCELLED"
        session.end_time = now
        return session
    return StudySessionResponse(
        id=session_id,
        student_id=student.id,
        plan_item_id=uuid.uuid4(),
        status="CANCELLED",
        start_time=now,
        end_time=now,
    )
