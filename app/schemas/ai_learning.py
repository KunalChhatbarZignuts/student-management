import datetime as dt
import uuid
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class AppBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        populate_by_name=True,
    )


# --- Overview & Analytics Schemas ---

class SubjectPerformanceSummary(AppBaseModel):
    subject_id: uuid.UUID | None = None
    subject_name: str
    subject_code: str | None = None
    average_marks: float
    total_exams: int = 1
    status: str = Field(..., description="EXCELLING, STRONG, NEEDS_IMPROVEMENT, CRITICAL_ATTENTION")
    trend: str = Field(default="STABLE", description="IMPROVING, DECLINING, STABLE")


class RecommendationsSummary(AppBaseModel):
    total_recommendations: int
    completed_count: int
    in_progress_count: int
    completion_percentage: float


class TodayPlanSummary(AppBaseModel):
    total_minutes: int
    completed_minutes: int
    items_count: int
    completed_items: int


class DataAttribution(AppBaseModel):
    exam_source: str = "Verified Official School Examination Records"
    practice_source: str = "Formative AI Practice Analytics"
    confidence: str = "HIGH"
    data_availability: str = "EXAMINATION_AND_DIAGNOSTIC"


class LearningOverviewResponse(AppBaseModel):
    student_id: uuid.UUID
    student_name: str
    grade_name: str
    section_name: str
    academic_year: str
    overall_exam_average: float
    strong_subjects: list[SubjectPerformanceSummary]
    weak_subjects: list[SubjectPerformanceSummary]
    recommendations_summary: RecommendationsSummary
    top_recommendation: dict[str, Any] | None = None
    today_plan_summary: TodayPlanSummary
    data_attribution: DataAttribution
    historical_improvement: list[dict[str, Any]] = Field(default_factory=list)


# --- Subject & Chapter Detail Schemas ---

class TopicDetail(AppBaseModel):
    id: uuid.UUID
    title: str
    learning_objective: str | None = None
    difficulty_level: str
    estimated_minutes: int
    order_index: int
    diagnostic_accuracy: float | None = None
    is_mastered: bool = False


class ChapterDetail(AppBaseModel):
    id: uuid.UUID
    chapter_number: int
    title: str
    description: str | None = None
    order_index: int
    topics: list[TopicDetail] = Field(default_factory=list)
    diagnostic_accuracy: float | None = None
    status: str = "NOT_STARTED"  # NOT_STARTED, IN_PROGRESS, COMPLETED


class SubjectLearningDetail(AppBaseModel):
    subject_id: uuid.UUID
    subject_name: str
    subject_code: str
    official_exam_average: float | None = None
    total_chapters: int
    completed_chapters: int
    diagnostic_accuracy: float | None = None
    status: str
    chapters: list[ChapterDetail] = Field(default_factory=list)


# --- Learning Path & Recommendation Schemas ---

class RecommendationResponse(AppBaseModel):
    id: uuid.UUID
    subject_name: str
    topic_title: str
    reason: str
    priority: str  # HIGH, MEDIUM, LOW
    estimated_minutes: int
    status: str  # NOT_STARTED, IN_PROGRESS, COMPLETED, NEED_PRACTICE
    order_index: int
    created_at: dt.datetime


class UpdateRecommendationStatusRequest(AppBaseModel):
    status: str  # NOT_STARTED, IN_PROGRESS, COMPLETED, NEED_PRACTICE


# --- Daily Study Plan Schemas ---

class StudyPlanItemResponse(AppBaseModel):
    id: uuid.UUID
    subject_name: str
    topic_title: str
    activity_type: str  # CONCEPT_REVIEW, PRACTICE_QUIZ, MISTAKE_REVISION
    duration_minutes: int
    is_completed: bool
    time_spent_seconds: int
    order_index: int


class DailyStudyPlanResponse(AppBaseModel):
    id: uuid.UUID
    plan_date: dt.date
    total_planned_minutes: int
    completed_minutes: int
    status: str
    items: list[StudyPlanItemResponse] = Field(default_factory=list)


class UpdateStudyPlanItemRequest(AppBaseModel):
    is_completed: bool | None = None
    additional_seconds_spent: int | None = None


class CreateStudyPlanItemRequest(AppBaseModel):
    subject_name: str
    topic_title: str
    duration_minutes: int = 25
    activity_type: str = "WEAK_TOPIC_REVISION"


# --- Practice & Quiz Schemas ---

class GeneratePracticeRequest(AppBaseModel):
    chapter_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    difficulty: str = "MEDIUM"
    num_questions: int = 5


class PracticeQuestionPublic(AppBaseModel):
    id: uuid.UUID
    question_number: int
    question_text: str
    options: list[str]
    hint: str | None = None


class PracticeSessionPublic(AppBaseModel):
    session_id: uuid.UUID
    subject_name: str
    chapter_title: str
    difficulty: str
    total_questions: int
    questions: list[PracticeQuestionPublic]


class StudentAnswerSubmission(AppBaseModel):
    question_id: uuid.UUID
    selected_option_index: int


class SubmitPracticeRequest(AppBaseModel):
    answers: list[StudentAnswerSubmission]


class QuestionEvaluationResult(AppBaseModel):
    question_id: uuid.UUID
    question_text: str
    selected_option_index: int | None
    correct_option_index: int
    is_correct: bool
    explanation: str
    hint: str | None = None


class PracticeEvaluationResponse(AppBaseModel):
    session_id: uuid.UUID
    subject_name: str
    chapter_title: str
    total_questions: int
    correct_count: int
    score_percentage: float
    results: list[QuestionEvaluationResult]
    learning_impact: str


class PracticeHistoryItem(AppBaseModel):
    session_id: uuid.UUID
    subject_name: str
    chapter_title: str
    difficulty: str
    score_percentage: float
    total_questions: int
    correct_count: int
    completed_at: dt.datetime | None = None


# --- Conversational Assistant Schemas ---

class ChatActionSuggestion(AppBaseModel):
    label: str
    action_type: str  # NAVIGATE_PLAN, START_PRACTICE, VIEW_SUBJECT
    target_id: str | None = None


class ChatRequest(AppBaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class ChatResponse(AppBaseModel):
    reply: str
    suggested_actions: list[ChatActionSuggestion] = Field(default_factory=list)
    timestamp: dt.datetime = Field(default_factory=dt.datetime.utcnow)
