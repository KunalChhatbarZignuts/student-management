import datetime as dt
import logging
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.ai_learning import (
    AILearningRecommendation,
    AIDailyStudyPlan,
    AIStudyPlanItem,
    AIPracticeSession,
    RecommendationStatus,
    StudyPlanStatus,
)
from app.schemas.ai_learning import (
    LearningOverviewResponse,
    SubjectLearningDetail,
    RecommendationResponse,
    UpdateRecommendationStatusRequest,
    DailyStudyPlanResponse,
    UpdateStudyPlanItemRequest,
    CreateStudyPlanItemRequest,
    GeneratePracticeRequest,
    PracticeSessionPublic,
    SubmitPracticeRequest,
    PracticeEvaluationResponse,
    PracticeHistoryItem,
    ChatRequest,
    ChatResponse,
    StudentStudySettingsResponse,
    UpdateStudentStudySettingsRequest,
    WeeklyStudyPlanResponse,
    RescheduleStudyPlanItemRequest,
    TopicMasteryMatrixResponse,
    StudentMistakeResponse,
    ResolveStudentMistakeRequest,
    ConceptTutorExplainRequest,
    ConceptTutorExplainResponse,
    CreateRoutineActivityRequest,
    UpdateRoutineActivityRequest,
    UpdateActivityStatusRequest,
    ReorderRoutineActivitiesRequest,
    DuplicateRoutineRequest,
    UpdateDailyRoutineMetadataRequest,
    StartStudySessionRequest,
    FinishStudySessionRequest,
    StudySessionResponse,
)
from app.services import ai_learning_service, ai_practice_service, ai_chat_service
from app.services.learning import study_routine_service, study_session_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/students/me/learning-assistant", tags=["AI Personal Learning Assistant"])


def _get_current_student(current_user: User, db: Session) -> Student:
    """Helper to resolve authenticated student or raise 404."""
    student = db.execute(select(Student).where(Student.user_id == current_user.id)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile record not found for authenticated user",
        )
    return student


@router.get("/overview", response_model=LearningOverviewResponse)
def get_learning_overview(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns student academic overview, strong/weak subjects, and top study recommendation."""
    student = _get_current_student(current_user, db)
    return ai_learning_service.get_learning_overview(student.id, db)


@router.get("/subjects", response_model=list[SubjectLearningDetail])
def get_subjects_analysis(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns all enrolled subjects with chapter-wise syllabus and diagnostic progress."""
    student = _get_current_student(current_user, db)
    return ai_learning_service.get_student_subjects_detail(student.id, db)


@router.get("/learning-path", response_model=list[RecommendationResponse])
def get_learning_path(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns prioritized personalized learning path recommendations."""
    student = _get_current_student(current_user, db)
    perf = ai_learning_service.compute_student_exam_performance(student.id, db)
    recs = ai_learning_service.ensure_learning_recommendations(student, perf["subject_summaries"], db)
    return [RecommendationResponse.model_validate(r) for r in recs]


@router.post("/learning-path/recalculate", response_model=list[RecommendationResponse])
def recalculate_learning_path(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Force re-computes learning path based on latest exam and practice history."""
    student = _get_current_student(current_user, db)
    # Remove existing recommendations
    existing = db.execute(
        select(AILearningRecommendation).where(AILearningRecommendation.student_id == student.id)
    ).scalars().all()
    for e in existing:
        db.delete(e)
    db.commit()

    perf = ai_learning_service.compute_student_exam_performance(student.id, db)
    new_recs = ai_learning_service.ensure_learning_recommendations(student, perf["subject_summaries"], db)
    return [RecommendationResponse.model_validate(r) for r in new_recs]


@router.patch("/learning-path/recommendations/{recommendation_id}/status", response_model=RecommendationResponse)
def update_recommendation_status(
    recommendation_id: uuid.UUID,
    data: UpdateRecommendationStatusRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Updates the status of a specific recommendation."""
    student = _get_current_student(current_user, db)
    rec = db.execute(
        select(AILearningRecommendation).where(
            AILearningRecommendation.id == recommendation_id,
            AILearningRecommendation.student_id == student.id,
        )
    ).scalar_one_or_none()

    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = data.status
    db.commit()
    db.refresh(rec)
    return RecommendationResponse.model_validate(rec)


@router.get("/daily-plan", response_model=DailyStudyPlanResponse)
def get_daily_study_plan(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns today's active study plan."""
    student = _get_current_student(current_user, db)
    return study_routine_service.get_daily_routine(student, dt.date.today(), db)


@router.patch("/daily-plan/items/{item_id}", response_model=DailyStudyPlanResponse)
def update_daily_plan_item(
    item_id: uuid.UUID,
    data: UpdateStudyPlanItemRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Updates a study item's completion state or tracks duration spent."""
    student = _get_current_student(current_user, db)
    try:
        req = UpdateRoutineActivityRequest(
            is_completed=data.is_completed,
        )
        if data.additional_seconds_spent:
            return study_routine_service.update_activity_status(
                student=student,
                activity_id=item_id,
                payload=UpdateActivityStatusRequest(
                    status="COMPLETED" if data.is_completed else "IN_PROGRESS",
                    additional_seconds_spent=data.additional_seconds_spent,
                ),
                db=db,
            )
        return study_routine_service.update_routine_activity(
            student=student,
            activity_id=item_id,
            payload=req,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/daily-plan/items", response_model=DailyStudyPlanResponse, status_code=status.HTTP_201_CREATED)
def add_daily_plan_item(
    payload: CreateStudyPlanItemRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Adds a targeted remediation focus session or topic practice into today's active study plan."""
    student = _get_current_student(current_user, db)
    return study_routine_service.create_routine_activity(
        student=student,
        payload=CreateRoutineActivityRequest(
            subject_name=payload.subject_name,
            topic_title=payload.topic_title,
            duration_minutes=payload.duration_minutes,
            activity_type=payload.activity_type,
        ),
        db=db,
    )


# --- Dedicated Study Routine & Activity Checklist CRUD Endpoints ---

@router.get("/daily-routine", response_model=DailyStudyPlanResponse)
def get_daily_routine_endpoint(
    plan_date: dt.date | None = None,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns complete daily routine, overview statistics, and checklist for a specified date."""
    student = _get_current_student(current_user, db)
    target_date = plan_date or dt.date.today()
    return study_routine_service.get_daily_routine(student, target_date, db)


@router.post("/daily-routine/activities", response_model=DailyStudyPlanResponse, status_code=status.HTTP_201_CREATED)
def create_routine_activity_endpoint(
    payload: CreateRoutineActivityRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Creates a custom or recommended activity in the study checklist."""
    student = _get_current_student(current_user, db)
    return study_routine_service.create_routine_activity(student, payload, db)


@router.put("/daily-routine/activities/{activity_id}", response_model=DailyStudyPlanResponse)
def update_routine_activity_endpoint(
    activity_id: uuid.UUID,
    payload: UpdateRoutineActivityRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Updates activity details, duration, priority, scheduled time, or notes."""
    student = _get_current_student(current_user, db)
    try:
        return study_routine_service.update_routine_activity(student, activity_id, payload, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/daily-routine/activities/{activity_id}/status", response_model=DailyStudyPlanResponse)
def update_activity_status_endpoint(
    activity_id: uuid.UUID,
    payload: UpdateActivityStatusRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Updates activity status (PENDING, IN_PROGRESS, COMPLETED, PAUSED, SKIPPED)."""
    student = _get_current_student(current_user, db)
    try:
        return study_routine_service.update_activity_status(student, activity_id, payload, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/daily-routine/activities/{activity_id}", response_model=DailyStudyPlanResponse)
def delete_routine_activity_endpoint(
    activity_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Soft-deletes a routine activity while preserving completed session history."""
    student = _get_current_student(current_user, db)
    try:
        return study_routine_service.delete_routine_activity(student, activity_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/daily-routine/activities-reorder", response_model=DailyStudyPlanResponse)
def reorder_routine_activities_endpoint(
    payload: ReorderRoutineActivitiesRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Reorders checklist activities according to student preference."""
    student = _get_current_student(current_user, db)
    try:
        return study_routine_service.reorder_routine_activities(student, payload.item_ids, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/daily-routine/duplicate", response_model=DailyStudyPlanResponse)
def duplicate_routine_endpoint(
    payload: DuplicateRoutineRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Duplicates activities from a previous date into a target routine date."""
    student = _get_current_student(current_user, db)
    try:
        return study_routine_service.duplicate_routine(
            student=student,
            source_date=payload.source_date,
            target_date=payload.target_date,
            include_completed=payload.include_completed,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/daily-routine/metadata", response_model=DailyStudyPlanResponse)
def update_routine_metadata_endpoint(
    payload: UpdateDailyRoutineMetadataRequest,
    plan_date: dt.date | None = None,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Updates daily notes or archived state for a routine date."""
    student = _get_current_student(current_user, db)
    target_date = plan_date or dt.date.today()
    try:
        return study_routine_service.update_routine_metadata(student, target_date, payload, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Focus Timer & Persistent Study Session Endpoints ---

@router.get("/study-sessions/active", response_model=StudySessionResponse | None)
def get_active_session_endpoint(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Retrieves the student's active or paused study session for timer state restoration."""
    student = _get_current_student(current_user, db)
    session = study_session_service.get_active_study_session(student.id, db)
    if not session:
        return None
    progress = study_session_service.compute_session_progress(session)
    return StudySessionResponse(
        id=session.id,
        student_id=session.student_id,
        plan_item_id=session.plan_item_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
        paused_at=session.paused_at,
        accumulated_seconds=session.accumulated_seconds,
        target_duration_seconds=session.target_duration_seconds,
        notes=session.notes,
        activity_title=session.plan_item.title or session.plan_item.topic_title if session.plan_item else None,
        subject_name=session.plan_item.subject_name if session.plan_item else None,
        elapsed_seconds=progress["elapsed_seconds"],
        remaining_seconds=progress["remaining_seconds"],
    )


@router.post("/study-sessions/start", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def start_study_session_endpoint(
    payload: StartStudySessionRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Starts a server-persisted study session."""
    student = _get_current_student(current_user, db)
    try:
        session = study_session_service.start_study_session(
            student=student,
            plan_item_id=payload.plan_item_id,
            target_duration_seconds=payload.target_duration_seconds,
            db=db,
        )
        progress = study_session_service.compute_session_progress(session)
        return StudySessionResponse(
            id=session.id,
            student_id=session.student_id,
            plan_item_id=session.plan_item_id,
            status=session.status,
            start_time=session.start_time,
            end_time=session.end_time,
            paused_at=session.paused_at,
            accumulated_seconds=session.accumulated_seconds,
            target_duration_seconds=session.target_duration_seconds,
            notes=session.notes,
            activity_title=session.plan_item.title or session.plan_item.topic_title if session.plan_item else None,
            subject_name=session.plan_item.subject_name if session.plan_item else None,
            elapsed_seconds=progress["elapsed_seconds"],
            remaining_seconds=progress["remaining_seconds"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/study-sessions/{session_id}/pause", response_model=StudySessionResponse)
def pause_study_session_endpoint(
    session_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Pauses an active timer session and accumulates elapsed time."""
    student = _get_current_student(current_user, db)
    try:
        session = study_session_service.pause_study_session(student, session_id, db)
        progress = study_session_service.compute_session_progress(session)
        return StudySessionResponse(
            id=session.id,
            student_id=session.student_id,
            plan_item_id=session.plan_item_id,
            status=session.status,
            start_time=session.start_time,
            end_time=session.end_time,
            paused_at=session.paused_at,
            accumulated_seconds=session.accumulated_seconds,
            target_duration_seconds=session.target_duration_seconds,
            notes=session.notes,
            activity_title=session.plan_item.title or session.plan_item.topic_title if session.plan_item else None,
            subject_name=session.plan_item.subject_name if session.plan_item else None,
            elapsed_seconds=progress["elapsed_seconds"],
            remaining_seconds=progress["remaining_seconds"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/study-sessions/{session_id}/resume", response_model=StudySessionResponse)
def resume_study_session_endpoint(
    session_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Resumes a paused timer session."""
    student = _get_current_student(current_user, db)
    try:
        session = study_session_service.resume_study_session(student, session_id, db)
        progress = study_session_service.compute_session_progress(session)
        return StudySessionResponse(
            id=session.id,
            student_id=session.student_id,
            plan_item_id=session.plan_item_id,
            status=session.status,
            start_time=session.start_time,
            end_time=session.end_time,
            paused_at=session.paused_at,
            accumulated_seconds=session.accumulated_seconds,
            target_duration_seconds=session.target_duration_seconds,
            notes=session.notes,
            activity_title=session.plan_item.title or session.plan_item.topic_title if session.plan_item else None,
            subject_name=session.plan_item.subject_name if session.plan_item else None,
            elapsed_seconds=progress["elapsed_seconds"],
            remaining_seconds=progress["remaining_seconds"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/study-sessions/{session_id}/finish", response_model=StudySessionResponse)
def finish_study_session_endpoint(
    session_id: uuid.UUID,
    payload: FinishStudySessionRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Finishes a study session and saves final duration and reflection notes."""
    student = _get_current_student(current_user, db)
    try:
        session = study_session_service.finish_study_session(
            student=student,
            session_id=session_id,
            mark_activity_completed=payload.mark_activity_completed,
            notes=payload.notes,
            db=db,
        )
        progress = study_session_service.compute_session_progress(session)
        return StudySessionResponse(
            id=session.id,
            student_id=session.student_id,
            plan_item_id=session.plan_item_id,
            status=session.status,
            start_time=session.start_time,
            end_time=session.end_time,
            paused_at=session.paused_at,
            accumulated_seconds=session.accumulated_seconds,
            target_duration_seconds=session.target_duration_seconds,
            notes=session.notes,
            activity_title=session.plan_item.title or session.plan_item.topic_title if session.plan_item else None,
            subject_name=session.plan_item.subject_name if session.plan_item else None,
            elapsed_seconds=progress["elapsed_seconds"],
            remaining_seconds=progress["remaining_seconds"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/study-sessions/{session_id}/cancel", response_model=StudySessionResponse)
def cancel_study_session_endpoint(
    session_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Cancels and discards an active or paused session."""
    student = _get_current_student(current_user, db)
    try:
        session = study_session_service.cancel_study_session(student, session_id, db)
        progress = study_session_service.compute_session_progress(session)
        return StudySessionResponse(
            id=session.id,
            student_id=session.student_id,
            plan_item_id=session.plan_item_id,
            status=session.status,
            start_time=session.start_time,
            end_time=session.end_time,
            paused_at=session.paused_at,
            accumulated_seconds=session.accumulated_seconds,
            target_duration_seconds=session.target_duration_seconds,
            notes=session.notes,
            activity_title=session.plan_item.title or session.plan_item.topic_title if session.plan_item else None,
            subject_name=session.plan_item.subject_name if session.plan_item else None,
            elapsed_seconds=progress["elapsed_seconds"],
            remaining_seconds=progress["remaining_seconds"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/practice/generate", response_model=PracticeSessionPublic, status_code=status.HTTP_201_CREATED)
def generate_practice(
    data: GeneratePracticeRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Generates an adaptive multiple-choice practice quiz."""
    student = _get_current_student(current_user, db)
    return ai_practice_service.generate_practice_session(
        student_id=student.id,
        chapter_id=data.chapter_id,
        subject_id=data.subject_id,
        difficulty=data.difficulty,
        num_questions=data.num_questions,
        db=db,
    )


@router.post("/practice/{session_id}/submit", response_model=PracticeEvaluationResponse)
def submit_practice(
    session_id: uuid.UUID,
    data: SubmitPracticeRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Submits student quiz responses, scores the session, and returns explanations."""
    student = _get_current_student(current_user, db)
    try:
        return ai_practice_service.evaluate_practice_session(
            session_id=session_id,
            answers=data.answers,
            student_id=student.id,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/history", response_model=list[PracticeHistoryItem])
def get_practice_history(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns past practice quiz sessions and diagnostic performance."""
    student = _get_current_student(current_user, db)
    sessions = db.execute(
        select(AIPracticeSession)
        .where(
            AIPracticeSession.student_id == student.id,
            AIPracticeSession.completed_at.isnot(None),
        )
        .order_by(desc(AIPracticeSession.completed_at))
        .limit(20)
    ).scalars().all()

    return [
        PracticeHistoryItem(
            session_id=s.id,
            subject_name=s.subject_name,
            chapter_title=s.chapter_title,
            difficulty=s.difficulty,
            score_percentage=s.score_percentage,
            total_questions=s.total_questions,
            correct_count=s.correct_count,
            completed_at=s.completed_at,
        )
        for s in sessions
    ]


@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(
    data: ChatRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Conversational educational tutoring with authenticated student context."""
    student = _get_current_student(current_user, db)
    return ai_chat_service.process_student_chat(student.id, data.message, db)


# --- Production Extended Learning Assistant Endpoints ---

@router.get("/settings", response_model=StudentStudySettingsResponse)
def get_study_settings(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns student study constraints and availability preferences."""
    student = _get_current_student(current_user, db)
    settings = ai_learning_service.get_or_create_student_study_settings(student.id, db)
    return StudentStudySettingsResponse.model_validate(settings)


@router.put("/settings", response_model=StudentStudySettingsResponse)
def update_study_settings(
    data: UpdateStudentStudySettingsRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Updates student study constraints and available daily minutes."""
    student = _get_current_student(current_user, db)
    settings = ai_learning_service.update_student_study_settings(student.id, data, db)
    return StudentStudySettingsResponse.model_validate(settings)


@router.get("/weekly-plan", response_model=WeeklyStudyPlanResponse)
def get_weekly_study_plan(
    week_start: dt.date | None = None,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns a unified 7-day study schedule integrating exams and school timetable commitments."""
    student = _get_current_student(current_user, db)
    return ai_learning_service.get_weekly_study_plan(student, week_start_date=week_start, db=db)


@router.post("/daily-plan/items/{item_id}/reschedule", response_model=DailyStudyPlanResponse)
def reschedule_study_item(
    item_id: uuid.UUID,
    payload: RescheduleStudyPlanItemRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Intelligently reschedules an item to a future date preserving student changes."""
    student = _get_current_student(current_user, db)
    target = payload.target_date or (dt.date.today() + dt.timedelta(days=1))
    try:
        plan = ai_learning_service.reschedule_study_plan_item(student, item_id, target, db)
        return DailyStudyPlanResponse.model_validate(plan)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/mastery", response_model=TopicMasteryMatrixResponse)
def get_topic_mastery(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns granular concept mastery progression across curriculum topics."""
    student = _get_current_student(current_user, db)
    return ai_learning_service.get_topic_mastery_matrix(student.id, db)


@router.get("/mistakes", response_model=list[StudentMistakeResponse])
def get_student_mistakes(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Returns student's unresolved practice mistakes with misconception explanations."""
    student = _get_current_student(current_user, db)
    return ai_learning_service.get_student_mistakes(student.id, db)


@router.patch("/mistakes/{mistake_id}/resolve", response_model=StudentMistakeResponse)
def resolve_mistake(
    mistake_id: uuid.UUID,
    payload: ResolveStudentMistakeRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Marks a student mistake as resolved after conceptual remediation."""
    student = _get_current_student(current_user, db)
    try:
        return ai_learning_service.resolve_student_mistake(student.id, mistake_id, payload.is_resolved, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/tutor/explain", response_model=ConceptTutorExplainResponse)
def explain_concept(
    payload: ConceptTutorExplainRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Generates Socratic, grade-tailored concept explanations with step-by-step proofs and KaTeX."""
    student = _get_current_student(current_user, db)
    return ai_learning_service.explain_curriculum_concept(student.id, payload, db)
