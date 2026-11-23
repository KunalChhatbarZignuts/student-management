import datetime as dt
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ActionLink(BaseModel):
    label: str
    url: str

    model_config = ConfigDict(from_attributes=True)


class ChatQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=3000, description="Student natural-language query")
    conversation_id: uuid.UUID | None = Field(None, description="Optional existing session ID")
    stream: bool = Field(False, description="Whether to stream response via SSE")

    model_config = ConfigDict(from_attributes=True)


class ChatQueryResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    content: str
    tools_used: list[str] = []
    action_links: list[ActionLink] = []
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationSummary(BaseModel):
    id: uuid.UUID
    title: str
    last_message_preview: str | None = None
    message_count: int
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class ChatMessageItem(BaseModel):
    id: uuid.UUID
    sender: str
    content: str
    tools_used: list[str] = []
    action_links: list[ActionLink] = []
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    messages: list[ChatMessageItem]
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class CreateConversationRequest(BaseModel):
    title: str | None = Field(None, max_length=255)

    model_config = ConfigDict(from_attributes=True)


class UpdateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

    model_config = ConfigDict(from_attributes=True)


class SuggestionCard(BaseModel):
    id: str
    label: str
    prompt: str
    category: str
    icon: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# Release 2: Academic Intelligence Schemas
# ===========================================================================

class QuizQuestionItem(BaseModel):
    id: str
    question_text: str
    question_type: str = "MCQ"  # MCQ, TRUE_FALSE, SHORT
    options: list[str] = []
    hint: str | None = None

    model_config = ConfigDict(from_attributes=True)


class QuizGenerationRequest(BaseModel):
    subject_name: str = Field(..., min_length=1, max_length=100)
    chapter_title: str | None = Field(None, max_length=200)
    difficulty: str = Field("MEDIUM", description="EASY, MEDIUM, or HARD")
    question_count: int = Field(3, ge=1, le=10)

    model_config = ConfigDict(from_attributes=True)


class QuizGenerationResponse(BaseModel):
    quiz_id: str
    subject_name: str
    chapter_title: str | None = None
    difficulty: str
    questions: list[QuizQuestionItem]

    model_config = ConfigDict(from_attributes=True)


class QuizAnswerItem(BaseModel):
    question_id: str
    selected_option_index: int | None = None
    text_answer: str | None = None

    model_config = ConfigDict(from_attributes=True)


class QuizSubmissionRequest(BaseModel):
    quiz_id: str
    answers: list[QuizAnswerItem]

    model_config = ConfigDict(from_attributes=True)


class QuestionFeedbackItem(BaseModel):
    question_id: str
    question_text: str
    student_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str

    model_config = ConfigDict(from_attributes=True)


class QuizEvaluationResponse(BaseModel):
    quiz_id: str
    total_questions: int
    correct_count: int
    score_percentage: float
    feedback: list[QuestionFeedbackItem]
    recommendation: str

    model_config = ConfigDict(from_attributes=True)


class FlashcardItem(BaseModel):
    id: str
    front: str
    back: str
    hint: str | None = None
    subject: str
    chapter: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FlashcardDeckResponse(BaseModel):
    subject_name: str
    chapter_title: str | None = None
    cards: list[FlashcardItem]

    model_config = ConfigDict(from_attributes=True)


class ExamRevisionChecklistItem(BaseModel):
    day_number: int
    date_str: str
    topic_name: str
    study_duration_minutes: int
    focus_area: str
    is_completed: bool = False

    model_config = ConfigDict(from_attributes=True)


class ExamPrepPlanResponse(BaseModel):
    exam_name: str
    exam_date: str
    days_remaining: int
    total_topics: int
    checklist: list[ExamRevisionChecklistItem]
    key_tips: list[str]

    model_config = ConfigDict(from_attributes=True)


class ImageQuestionResponse(BaseModel):
    filename: str
    detected_subject: str
    extracted_text: str
    step_by_step_solution: list[str]
    final_answer: str
    advice: str

    model_config = ConfigDict(from_attributes=True)


class DocumentSummaryResponse(BaseModel):
    filename: str
    document_type: str
    summary: str
    key_definitions: list[dict[str, str]]
    revision_questions: list[str]
    source_citations: list[dict[str, str]]

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# RELEASE 3: INTERACTIVE AI SCHEMAS (Language, Debate, Concept Map, Notes)
# ============================================================================

class GrammarEvaluationRequest(BaseModel):
    student_text: str
    target_grade_level: str | None = None

    model_config = ConfigDict(from_attributes=True)


class GrammarCorrectionItem(BaseModel):
    error_phrase: str
    corrected_phrase: str
    rule_explanation: str

    model_config = ConfigDict(from_attributes=True)


class GrammarEvaluationResponse(BaseModel):
    original_text: str
    corrected_text: str
    overall_score: int
    cefr_level: str
    corrections: list[GrammarCorrectionItem]
    vocabulary_enhancements: list[dict[str, str]]
    encouragement: str

    model_config = ConfigDict(from_attributes=True)


class DebateRoundRequest(BaseModel):
    topic: str
    stance: str  # "affirmative" or "negative"
    current_round: int = 1  # 1, 2, or 3
    student_argument: str

    model_config = ConfigDict(from_attributes=True)


class DebateScorecard(BaseModel):
    logic_score: int  # 1-10
    evidence_score: int  # 1-10
    clarity_score: int  # 1-10
    total_score: int  # out of 30
    strengths: list[str]
    areas_for_growth: list[str]
    verdict_summary: str

    model_config = ConfigDict(from_attributes=True)


class DebateRoundResponse(BaseModel):
    topic: str
    stance: str
    current_round: int
    max_rounds: int = 3
    ai_counter_argument: str
    student_argument_critique: str
    suggested_rebuttal_points: list[str]
    is_concluded: bool = False
    rubric_scorecard: DebateScorecard | None = None

    model_config = ConfigDict(from_attributes=True)


class ConceptMapNode(BaseModel):
    id: str
    label: str
    definition: str
    category: str  # "root", "primary", "secondary", "detail"
    x: int
    y: int

    model_config = ConfigDict(from_attributes=True)


class ConceptMapEdge(BaseModel):
    source: str
    target: str
    relationship: str  # e.g., "requires", "produces", "divided into"

    model_config = ConfigDict(from_attributes=True)


class ConceptMapResponse(BaseModel):
    root_topic: str
    subject: str
    grade_level: str
    nodes: list[ConceptMapNode]
    edges: list[ConceptMapEdge]
    key_takeaway: str

    model_config = ConfigDict(from_attributes=True)


class ClassTopicNotesResponse(BaseModel):
    subject_name: str
    topic_name: str
    teacher_name: str | None = None
    date_str: str
    core_concepts: list[str]
    formulas_or_rules: list[str]
    homework_or_followup: list[str]
    summary_markdown: str

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# RELEASE 4: PROACTIVE AI SCHEMAS (Briefing, Challenge, Career Discovery)
# ============================================================================

class MorningBriefingResponse(BaseModel):
    student_name: str
    date_str: str
    day_name: str
    classes_count: int
    next_class_summary: str | None = None
    nearest_exam_name: str | None = None
    nearest_exam_days: int | None = None
    pending_fee_balance: float = 0.0
    calendar_notice: str | None = None
    inspirational_quote: str
    proactive_recommendation: str

    model_config = ConfigDict(from_attributes=True)


class DailyChallengeResponse(BaseModel):
    challenge_id: str
    date_str: str
    subject: str
    topic: str
    question_text: str
    options: list[str]
    correct_option_index: int
    hint: str
    explanation: str

    model_config = ConfigDict(from_attributes=True)


class CareerPathwayItem(BaseModel):
    title: str
    match_score: int
    description: str
    primary_subjects: list[str]
    university_degrees: list[str]
    key_skills: list[str]

    model_config = ConfigDict(from_attributes=True)


class CareerDiscoveryResponse(BaseModel):
    student_grade: str
    top_subjects: list[str]
    career_pathways: list[CareerPathwayItem]
    advice: str

    model_config = ConfigDict(from_attributes=True)



