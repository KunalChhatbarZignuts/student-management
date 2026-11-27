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


# --- Daily Study Plan & Routine Schemas ---

class StudySessionResponse(AppBaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    plan_item_id: uuid.UUID
    status: str
    start_time: dt.datetime
    end_time: dt.datetime | None = None
    paused_at: dt.datetime | None = None
    accumulated_seconds: int = 0
    target_duration_seconds: int = 1500
    notes: str | None = None
    activity_title: str | None = None
    subject_name: str | None = None
    elapsed_seconds: int = 0
    remaining_seconds: int = 0


class StudyPlanItemResponse(AppBaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID | None = None
    subject_name: str
    topic_title: str
    title: str | None = None
    description: str | None = None
    activity_type: str = "CONCEPT_LEARNING"
    priority: str = "MEDIUM"
    status: str = "PENDING"
    duration_minutes: int
    is_completed: bool = False
    is_custom: bool = False
    time_spent_seconds: int = 0
    order_index: int = 0
    start_time: str | None = None
    end_time: str | None = None
    notes: str | None = None
    recommended_resource_url: str | None = None
    exam_id: uuid.UUID | None = None
    is_rescheduled: bool = False
    is_deleted: bool = False


class DailyStudyPlanResponse(AppBaseModel):
    id: uuid.UUID
    student_id: uuid.UUID | None = None
    plan_date: dt.date
    total_planned_minutes: int
    completed_minutes: int
    remaining_minutes: int = 0
    completion_percentage: float = 0.0
    status: str
    notes: str | None = None
    is_archived: bool = False
    total_activities_count: int = 0
    completed_activities_count: int = 0
    pending_activities_count: int = 0
    items: list[StudyPlanItemResponse] = Field(default_factory=list)
    active_session: StudySessionResponse | None = None


class UpdateStudyPlanItemRequest(AppBaseModel):
    is_completed: bool | None = None
    additional_seconds_spent: int | None = None


class CreateStudyPlanItemRequest(AppBaseModel):
    subject_name: str
    topic_title: str
    duration_minutes: int = 25
    activity_type: str = "WEAK_TOPIC_REVISION"


class CreateRoutineActivityRequest(AppBaseModel):
    subject_name: str
    topic_title: str
    title: str | None = None
    description: str | None = None
    activity_type: str = "CONCEPT_LEARNING"
    duration_minutes: int = 20
    priority: str = "MEDIUM"
    start_time: str | None = None
    end_time: str | None = None
    notes: str | None = None
    recommended_resource_url: str | None = None
    target_date: dt.date | None = None


class UpdateRoutineActivityRequest(AppBaseModel):
    subject_name: str | None = None
    topic_title: str | None = None
    title: str | None = None
    description: str | None = None
    activity_type: str | None = None
    duration_minutes: int | None = None
    priority: str | None = None
    status: str | None = None
    is_completed: bool | None = None
    start_time: str | None = None
    end_time: str | None = None
    notes: str | None = None
    recommended_resource_url: str | None = None


class UpdateActivityStatusRequest(AppBaseModel):
    status: str
    additional_seconds_spent: int = 0


class ReorderRoutineActivitiesRequest(AppBaseModel):
    item_ids: list[uuid.UUID]


class DuplicateRoutineRequest(AppBaseModel):
    source_date: dt.date
    target_date: dt.date
    include_completed: bool = False
    activity_ids: list[uuid.UUID] | None = None


class UpdateDailyRoutineMetadataRequest(AppBaseModel):
    notes: str | None = None
    is_archived: bool | None = None


class StartStudySessionRequest(AppBaseModel):
    plan_item_id: uuid.UUID
    target_duration_seconds: int = 1500


class FinishStudySessionRequest(AppBaseModel):
    mark_activity_completed: bool = False
    notes: str | None = None


# --- Practice & Quiz Schemas ---

class GeneratePracticeRequest(AppBaseModel):
    chapter_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    subject_name: str | None = None
    chapter_title: str | None = None
    difficulty: str = "MEDIUM"
    num_questions: int = 5
    question_count: int = 5


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


# --- Study Settings & Weekly Planning Schemas ---

class StudentStudySettingsResponse(AppBaseModel):
    student_id: uuid.UUID
    weekday_daily_minutes: int
    weekend_daily_minutes: int
    preferred_study_time: str
    break_interval_minutes: int
    notifications_enabled: bool


class UpdateStudentStudySettingsRequest(AppBaseModel):
    weekday_daily_minutes: int | None = Field(default=None, ge=15, le=240)
    weekend_daily_minutes: int | None = Field(default=None, ge=15, le=360)
    preferred_study_time: str | None = None
    break_interval_minutes: int | None = Field(default=None, ge=5, le=30)
    notifications_enabled: bool | None = None


class WeeklyStudyPlanResponse(AppBaseModel):
    week_start_date: dt.date
    total_planned_minutes: int
    completed_minutes: int
    daily_plans: list[DailyStudyPlanResponse] = Field(default_factory=list)
    upcoming_exams_count: int = 0
    completion_percentage: float = 0.0


class RescheduleStudyPlanItemRequest(AppBaseModel):
    target_date: dt.date | None = None
    target_order_index: int | None = None


# --- Mastery & Mistake Bank Schemas ---

class TopicMasteryItemResponse(AppBaseModel):
    topic_id: uuid.UUID
    topic_title: str
    chapter_title: str
    subject_name: str
    mastery_level: str
    accuracy_percentage: float
    attempts_count: int
    consecutive_correct: int
    last_assessed_at: dt.datetime | None = None


class TopicMasteryMatrixResponse(AppBaseModel):
    total_topics: int
    mastered_count: int
    in_progress_count: int
    needs_practice_count: int
    topics: list[TopicMasteryItemResponse] = Field(default_factory=list)


class StudentMistakeResponse(AppBaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID | None = None
    subject_name: str
    topic_title: str
    question_text: str
    student_answer: str
    correct_answer: str
    misconception_explanation: str
    is_resolved: bool
    created_at: dt.datetime


class ResolveStudentMistakeRequest(AppBaseModel):
    is_resolved: bool = True


# --- Socratic Concept Tutor Schemas ---

class ConceptTutorExplainRequest(AppBaseModel):
    subject_name: str
    topic_title: str
    chapter_title: str | None = None
    specific_question: str | None = None
    learning_objective: str | None = None


class ConceptTutorExplainResponse(AppBaseModel):
    subject_name: str
    topic_title: str
    explanation_markdown: str
    worked_example: str | None = None
    key_takeaways: list[str] = Field(default_factory=list)
    practice_prompt: str | None = None
    attribution: str = "Verified Academic Concept Guidance"
