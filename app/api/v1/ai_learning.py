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
)
from app.services import ai_learning_service, ai_practice_service, ai_chat_service

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
    plan = ai_learning_service.get_or_create_daily_study_plan(student, db)
    return DailyStudyPlanResponse.model_validate(plan)


@router.patch("/daily-plan/items/{item_id}", response_model=DailyStudyPlanResponse)
def update_daily_plan_item(
    item_id: uuid.UUID,
    data: UpdateStudyPlanItemRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Updates a study item's completion state or tracks duration spent."""
    student = _get_current_student(current_user, db)
    item = db.execute(select(AIStudyPlanItem).where(AIStudyPlanItem.id == item_id)).scalar_one_or_none()
    if not item or item.plan.student_id != student.id:
        raise HTTPException(status_code=404, detail="Study plan item not found")

    if data.is_completed is not None:
        item.is_completed = data.is_completed
    if data.additional_seconds_spent:
        item.time_spent_seconds += data.additional_seconds_spent

    # Recalculate parent plan completed minutes
    plan = item.plan
    completed_dur = sum(i.duration_minutes for i in plan.items if i.is_completed)
    plan.completed_minutes = completed_dur

    if all(i.is_completed for i in plan.items):
        plan.status = StudyPlanStatus.COMPLETED.value
    elif any(i.is_completed for i in plan.items):
        plan.status = StudyPlanStatus.PARTIALLY_COMPLETED.value
    else:
        plan.status = StudyPlanStatus.PLANNED.value

    db.commit()
    db.refresh(plan)
    return DailyStudyPlanResponse.model_validate(plan)


@router.post("/daily-plan/items", response_model=DailyStudyPlanResponse, status_code=status.HTTP_201_CREATED)
def add_daily_plan_item(
    payload: CreateStudyPlanItemRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Adds a targeted remediation focus session or topic practice into today's active study plan."""
    student = _get_current_student(current_user, db)
    plan = ai_learning_service.add_custom_study_plan_item(
        student=student,
        subject_name=payload.subject_name,
        topic_title=payload.topic_title,
        duration_minutes=payload.duration_minutes,
        activity_type=payload.activity_type,
        db=db,
    )
    return DailyStudyPlanResponse.model_validate(plan)


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
