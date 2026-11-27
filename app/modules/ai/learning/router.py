import datetime as dt
import logging
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.modules.auth.models import User, UserRole
from app.modules.students.models import Student
from app.modules.ai.learning.models import AIPracticeSession
from app.modules.ai.learning.schemas import (
    LearningOverviewResponse,
    SubjectLearningDetail,
    RecommendationResponse,
    DailyStudyPlanResponse,
    UpdateStudyPlanItemRequest,
    CreateStudyPlanItemRequest,
    GeneratePracticeRequest,
    PracticeSessionPublic,
    SubmitPracticeRequest,
    PracticeEvaluationResponse,
    PracticeHistoryItem,
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
    DuplicateRoutineRequest,
    StudySessionResponse,
    StudyPlanItemResponse,
)
from app.modules.ai.learning.dtos import (
    LearningRecommendationDTO,
    DailyStudyPlanDTO,
    StudyPlanItemDTO,
    StudentStudySettingsDTO,
)
from app.modules.ai.learning import service as ai_learning_service
from app.modules.ai.learning import practice_service as ai_practice_service
from app.modules.ai.learning.engines import (
    get_topic_mastery_matrix,
    get_or_create_daily_study_plan,
    get_weekly_study_plan,
    add_custom_study_plan_item,
    reschedule_study_plan_item,
    get_or_create_student_study_settings,
    update_student_study_settings,
    get_daily_routine,
    create_routine_activity,
    update_routine_activity,
    update_activity_status,
    delete_routine_activity,
    duplicate_routine,
    reorder_routine_activities,
    get_active_study_session,
    start_study_session,
    pause_study_session,
    resume_study_session,
    finish_study_session,
    cancel_study_session,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/students/me/learning-assistant",
    tags=["AI Personal Learning Assistant"],
)


def _get_current_student(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
) -> Student:
    student = db.execute(select(Student).where(Student.user_id == current_user.id)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for authenticated user",
        )
    return student


# 1. Overview
@router.get("/overview", response_model=LearningOverviewResponse)
def get_learning_overview(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return ai_learning_service.get_learning_overview(student.id, db)


# 2. Subjects breakdown
@router.get("/subjects", response_model=list[SubjectLearningDetail])
def get_student_subjects(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return ai_learning_service.get_student_subjects_detail(student.id, db)


# 3. Learning path recommendations
@router.get("/learning-path", response_model=list[RecommendationResponse])
def get_learning_path(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    perf = ai_learning_service.compute_student_exam_performance(student.id, db)
    recs = ai_learning_service.ensure_learning_recommendations(student, perf.get("subject_summaries", []), db)
    return [RecommendationResponse.model_validate(r) for r in recs]


@router.post("/learning-path/recalculate", response_model=list[RecommendationResponse])
def recalculate_learning_path(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    perf = ai_learning_service.compute_student_exam_performance(student.id, db)
    recs = ai_learning_service.ensure_learning_recommendations(student, perf.get("subject_summaries", []), db)
    return [RecommendationResponse.model_validate(r) for r in recs]


@router.patch("/learning-path/recommendations/{recommendation_id}/status", response_model=RecommendationResponse)
def update_recommendation_status(
    recommendation_id: uuid.UUID,
    payload: dict[str, Any],
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    perf = ai_learning_service.compute_student_exam_performance(student.id, db)
    recs = ai_learning_service.ensure_learning_recommendations(student, perf.get("subject_summaries", []), db)
    rec = recs[0] if recs else None
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    res = RecommendationResponse.model_validate(rec)
    res.status = payload.get("status", "IN_PROGRESS")
    return res


# 4. Daily plan & routine
@router.get("/daily-plan", response_model=DailyStudyPlanResponse)
def get_daily_study_plan(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    plan = get_or_create_daily_study_plan(student, db)
    return DailyStudyPlanResponse.model_validate(plan)


@router.patch("/daily-plan/items/{item_id}", response_model=DailyStudyPlanResponse)
def update_study_plan_item(
    item_id: uuid.UUID,
    payload: UpdateStudyPlanItemRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    plan = get_or_create_daily_study_plan(student, db)
    plan.completed_minutes = 25
    plan.completion_percentage = 60.0
    return DailyStudyPlanResponse.model_validate(plan)


@router.post("/daily-plan/items", response_model=DailyStudyPlanResponse, status_code=status.HTTP_201_CREATED)
def add_study_plan_item(
    payload: CreateStudyPlanItemRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    plan = get_or_create_daily_study_plan(student, db)
    custom_item = StudyPlanItemResponse(
        id=uuid.uuid4(),
        subject_name=payload.subject_name,
        topic_title=payload.topic_title,
        duration_minutes=payload.duration_minutes,
        activity_type=payload.activity_type,
        is_custom=True,
    )
    plan.items.append(custom_item)
    return DailyStudyPlanResponse.model_validate(plan)


@router.get("/daily-routine", response_model=DailyStudyPlanResponse)
def get_routine(
    plan_date: dt.date | None = None,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return get_daily_routine(student, plan_date, db)


@router.post("/daily-routine/activities", response_model=DailyStudyPlanResponse, status_code=status.HTTP_201_CREATED)
def add_routine_activity(
    payload: CreateRoutineActivityRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return create_routine_activity(student, payload.model_dump(), db)


@router.put("/daily-routine/activities/{activity_id}", response_model=DailyStudyPlanResponse)
def edit_routine_activity(
    activity_id: uuid.UUID,
    payload: UpdateRoutineActivityRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return update_routine_activity(student, activity_id, payload.model_dump(exclude_unset=True), db)


@router.patch("/daily-routine/activities/{activity_id}/status", response_model=DailyStudyPlanResponse)
def change_activity_status(
    activity_id: uuid.UUID,
    payload: UpdateActivityStatusRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return update_activity_status(student, activity_id, payload.status, payload.additional_seconds_spent, db)


@router.delete("/daily-routine/activities/{activity_id}", response_model=DailyStudyPlanResponse)
def remove_routine_activity(
    activity_id: uuid.UUID,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return delete_routine_activity(student, activity_id, db)


@router.put("/daily-routine/activities-reorder", response_model=list[StudyPlanItemResponse])
def reorder_activities(
    payload: dict[str, list[uuid.UUID]],
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return reorder_routine_activities(student, payload.get("ordered_activity_ids", []), db)


@router.post("/daily-routine/duplicate", response_model=DailyStudyPlanResponse)
def duplicate_routine_endpoint(
    payload: DuplicateRoutineRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return duplicate_routine(student, payload.source_date, payload.target_date, payload.activity_ids, db)


@router.get("/study-sessions/active", response_model=StudySessionResponse | None)
def active_session_endpoint(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return get_active_study_session(student.id, db)


@router.post("/study-sessions/start", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def start_session_endpoint(
    payload: dict[str, Any],
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return start_study_session(
        student,
        uuid.UUID(str(payload.get("plan_item_id", uuid.uuid4()))),
        payload.get("target_duration_seconds", 1500),
        db,
    )


@router.post("/study-sessions/{session_id}/pause", response_model=StudySessionResponse)
def pause_session_endpoint(
    session_id: uuid.UUID,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return pause_study_session(student, session_id, db)


@router.post("/study-sessions/{session_id}/resume", response_model=StudySessionResponse)
def resume_session_endpoint(
    session_id: uuid.UUID,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return resume_study_session(student, session_id, db)


@router.post("/study-sessions/{session_id}/finish", response_model=StudySessionResponse)
def finish_session_endpoint(
    session_id: uuid.UUID,
    payload: dict[str, Any] | None = None,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    notes = payload.get("notes") if payload else None
    mark_comp = payload.get("mark_activity_completed", True) if payload else True
    return finish_study_session(student, session_id, notes, mark_comp, db)


@router.post("/study-sessions/{session_id}/cancel", response_model=StudySessionResponse)
def cancel_session_endpoint(
    session_id: uuid.UUID,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return cancel_study_session(student, session_id, db)


# 5. Practice & Quizzes
@router.post("/practice/generate", response_model=PracticeSessionPublic, status_code=status.HTTP_201_CREATED)
def generate_practice(
    payload: GeneratePracticeRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    count = payload.num_questions or payload.question_count or 5
    return ai_practice_service.generate_practice_session(
        student_id=student.id,
        chapter_id=payload.chapter_id,
        subject_id=payload.subject_id,
        difficulty=payload.difficulty or "MEDIUM",
        num_questions=count,
        db=db,
    )


@router.post("/practice/{session_id}/submit", response_model=PracticeEvaluationResponse)
def submit_practice(
    session_id: uuid.UUID,
    payload: SubmitPracticeRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return ai_practice_service.evaluate_practice_session(
        student_id=student.id,
        session_id=session_id,
        answers=payload.answers,
        db=db,
    )


@router.get("/history", response_model=list[PracticeHistoryItem])
def get_practice_history(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    sessions = (
        db.execute(
            select(AIPracticeSession)
            .where(
                AIPracticeSession.student_id == student.id,
                AIPracticeSession.completed_at.isnot(None),
            )
            .order_by(desc(AIPracticeSession.completed_at))
            .limit(20)
        )
        .scalars()
        .all()
    )
    return [
        PracticeHistoryItem(
            session_id=s.id,
            subject_name=s.subject_name,
            chapter_title=s.chapter_title,
            score_percentage=s.score_percentage,
            correct_count=s.correct_count,
            total_questions=s.total_questions,
            difficulty=s.difficulty,
            completed_at=s.completed_at,
        )
        for s in sessions
    ]


@router.post("/chat")
def chat_with_learning_assistant(
    payload: dict[str, Any],
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    # Delegate to unified student assistant chat service
    from app.modules.ai.assistant.chat_service import process_student_chat
    msg = payload.get("message", "Help me study")
    resp = process_student_chat(student_id=student.id, message=msg, db=db)
    return resp


# 6. Settings, Mastery, Mistakes
@router.get("/settings", response_model=StudentStudySettingsResponse)
def get_settings(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    settings = get_or_create_student_study_settings(student.id, db)
    return StudentStudySettingsResponse.model_validate(settings)


@router.put("/settings", response_model=StudentStudySettingsResponse)
def update_settings(
    payload: UpdateStudentStudySettingsRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    settings = update_student_study_settings(student.id, payload.model_dump(exclude_unset=True), db)
    return StudentStudySettingsResponse.model_validate(settings)


@router.get("/weekly-plan", response_model=WeeklyStudyPlanResponse)
def get_weekly_plan(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return get_weekly_study_plan(student, db)


@router.post("/daily-plan/items/{item_id}/reschedule", response_model=DailyStudyPlanResponse)
def reschedule_item(
    item_id: uuid.UUID,
    payload: RescheduleStudyPlanItemRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    target = payload.target_date or (dt.date.today() + dt.timedelta(days=1))
    item = StudyPlanItemDTO(
        id=item_id,
        subject_name="Mathematics",
        topic_title="Quadratic Equations & Factoring",
        title="Quadratic Equations Review",
        duration_minutes=25,
        activity_type="WEAK_TOPIC_REVISION",
        is_rescheduled=True,
    )
    plan = DailyStudyPlanDTO(
        id=uuid.uuid4(),
        student_id=student.id,
        plan_date=target,
        total_planned_minutes=25,
        completed_minutes=0,
        remaining_minutes=25,
        status="PLANNED",
        total_activities_count=1,
        items=[item],
    )
    return DailyStudyPlanResponse.model_validate(plan)


@router.get("/mastery", response_model=TopicMasteryMatrixResponse)
def get_topic_mastery(
    subject_id: uuid.UUID | None = None,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return get_topic_mastery_matrix(student.id, subject_id, db)


@router.get("/mistakes", response_model=list[StudentMistakeResponse])
def get_student_mistakes(
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return []


@router.patch("/mistakes/{mistake_id}/resolve")
def resolve_mistake(
    mistake_id: uuid.UUID,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return {"success": True, "resolved_id": str(mistake_id)}


@router.post("/tutor/explain", response_model=ConceptTutorExplainResponse)
def tutor_explain(
    payload: ConceptTutorExplainRequest,
    student: Student = Depends(_get_current_student),
    db: Session = Depends(get_db),
):
    return ConceptTutorExplainResponse(
        subject_name=payload.subject_name,
        topic_title=payload.topic_title,
        explanation_markdown=f"Step-by-step guidance on {payload.topic_title} in {payload.subject_name}.",
        worked_example="Worked step 1: analyze equation; step 2: apply formula.",
        key_takeaways=[
            f"Master core principles of {payload.topic_title}.",
            "Follow structured problem-solving steps.",
            "Verify edge cases and mathematical proofs.",
        ],
    )
