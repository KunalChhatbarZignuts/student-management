import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.ai_student_assistant import (
    ChatQueryRequest,
    ChatQueryResponse,
    ConversationDetailResponse,
    ConversationSummary,
    CreateConversationRequest,
    SuggestionCard,
    UpdateConversationRequest,
    QuizGenerationRequest,
    QuizGenerationResponse,
    QuizSubmissionRequest,
    QuizEvaluationResponse,
    FlashcardDeckResponse,
    ExamPrepPlanResponse,
    ImageQuestionResponse,
    DocumentSummaryResponse,
    GrammarEvaluationRequest,
    GrammarEvaluationResponse,
    DebateRoundRequest,
    DebateRoundResponse,
    ConceptMapResponse,
    ClassTopicNotesResponse,
    MorningBriefingResponse,
    DailyChallengeResponse,
    CareerDiscoveryResponse,
)
from app.services import ai_assistant_service, ai_academic_service
from app.services.ai_interactive_service import ai_interactive_service
from app.services.ai_proactive_service import ai_proactive_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/student/assistant", tags=["AI Student Assistant"])


def _get_current_student(current_user: User, db: Session) -> Student:
    """Resolves authenticated student profile or raises 404."""
    student = db.execute(select(Student).where(Student.user_id == current_user.id)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile record not found for authenticated user",
        )
    return student


@router.post(
    "/chat",
    response_model=ChatQueryResponse,
    summary="Submit a query to the AI Student Assistant",
)
async def chat_with_assistant(
    payload: ChatQueryRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Processes student query using intelligent intent detection and verified school tools."""
    student = _get_current_student(current_user, db)

    # If streaming is requested
    if payload.stream:
        async def event_generator() -> AsyncGenerator[str, None]:
            # Process query synchronously in service
            result = ai_assistant_service.process_assistant_chat(
                student=student,
                message=payload.message,
                conversation_id=payload.conversation_id,
                db=db,
            )

            # Yield metadata event
            meta_data = json.dumps({
                "conversation_id": str(result["conversation_id"]),
                "message_id": str(result["message_id"]),
                "tools_used": result["tools_used"],
            })
            yield f"event: metadata\ndata: {meta_data}\n\n"

            # Yield word tokens
            words = result["content"].split(" ")
            for w in words:
                yield f"event: token\ndata: {json.dumps({'text': w + ' '})}\n\n"
                await asyncio.sleep(0.015)

            # Yield done event with action links
            done_data = json.dumps({
                "action_links": result["action_links"],
            })
            yield f"event: done\ndata: {done_data}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # Standard JSON response
    result = ai_assistant_service.process_assistant_chat(
        student=student,
        message=payload.message,
        conversation_id=payload.conversation_id,
        db=db,
    )
    return ChatQueryResponse(
        conversation_id=result["conversation_id"],
        message_id=result["message_id"],
        content=result["content"],
        tools_used=result["tools_used"],
        action_links=result["action_links"],
        created_at=result["created_at"],
    )


@router.get(
    "/conversations",
    response_model=list[ConversationSummary],
    summary="List authenticated student's conversation sessions",
)
def list_student_conversations(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    student = _get_current_student(current_user, db)
    return ai_assistant_service.list_conversations(student.id, db)


@router.post(
    "/conversations",
    response_model=ConversationSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
def create_new_conversation(
    payload: CreateConversationRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    student = _get_current_student(current_user, db)
    conv = ai_assistant_service.create_conversation(student.id, title=payload.title, db=db)
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        last_message_preview=None,
        message_count=0,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Retrieve full message thread for a conversation",
)
def get_conversation_thread(
    conversation_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    student = _get_current_student(current_user, db)
    detail = ai_assistant_service.get_conversation_detail(student.id, conversation_id, db)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return detail


@router.patch(
    "/conversations/{conversation_id}",
    summary="Rename a conversation session",
)
def rename_student_conversation(
    conversation_id: uuid.UUID,
    payload: UpdateConversationRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    student = _get_current_student(current_user, db)
    success = ai_assistant_service.rename_conversation(student.id, conversation_id, payload.title, db)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return {"status": "renamed", "title": payload.title}


@router.delete(
    "/conversations/{conversation_id}",
    summary="Delete a conversation session and all its messages",
)
def delete_student_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    student = _get_current_student(current_user, db)
    success = ai_assistant_service.delete_conversation(student.id, conversation_id, db)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return {"status": "deleted"}


@router.get(
    "/suggestions",
    response_model=list[SuggestionCard],
    summary="Get contextual question suggestion cards",
)
def get_question_suggestions(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
):
    """Returns functional starter prompt cards for students."""
    return [
        SuggestionCard(
            id="sug-1",
            label="Next Class & Teacher",
            prompt="What is my next class and who is teaching?",
            category="TIMETABLE",
            icon="Schedule",
        ),
        SuggestionCard(
            id="sug-2",
            label="Weekly Timetable",
            prompt="Show my complete timetable for today.",
            category="TIMETABLE",
            icon="CalendarToday",
        ),
        SuggestionCard(
            id="sug-3",
            label="Attendance Summary",
            prompt="What is my attendance percentage and how many days was I absent?",
            category="ATTENDANCE",
            icon="CheckCircle",
        ),
        SuggestionCard(
            id="sug-4",
            label="Upcoming Exams",
            prompt="When is my next examination and what is the schedule?",
            category="EXAMS",
            icon="Quiz",
        ),
        SuggestionCard(
            id="sug-5",
            label="Report Card & Marks",
            prompt="Show my recent examination results and grades.",
            category="RESULTS",
            icon="Grade",
        ),
        SuggestionCard(
            id="sug-6",
            label="School Calendar & Holidays",
            prompt="Is tomorrow a holiday and when is the next school break?",
            category="CALENDAR",
            icon="EventBusy",
        ),
        SuggestionCard(
            id="sug-7",
            label="Tuition Fees Status",
            prompt="How much tuition fee is pending for this term?",
            category="FEES",
            icon="Payment",
        ),
        SuggestionCard(
            id="sug-8",
            label="Science Concept Explainer",
            prompt="Explain Newton's third law of motion with a real-world example.",
            category="ACADEMIC",
            icon="AutoAwesome",
        ),
    ]


# ===========================================================================
# Release 2: Academic Intelligence Endpoints
# ===========================================================================

@router.post(
    "/upload-image",
    response_model=ImageQuestionResponse,
    summary="Upload image of a textbook question, diagram, or handwritten problem",
)
async def upload_image_question(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Analyzes an uploaded problem photo using Gemini 1.5 Flash Vision OCR with pedagogical solutions."""
    student = _get_current_student(current_user, db)

    # 1. Validate file extension and MIME type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{file.content_type}'. Please upload a PNG, JPEG, or WebP picture.",
        )

    # 2. Validate max file size (10 MB limit)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 10MB.",
        )

    grade = getattr(student, "class_name", "Grade 10")
    result = ai_academic_service.analyze_image_question(
        image_bytes=contents,
        filename=file.filename or "uploaded_problem.png",
        student_grade=grade,
    )
    return result


@router.post(
    "/upload-document",
    response_model=DocumentSummaryResponse,
    summary="Upload study notes or PDF document for summarization and key definition extraction",
)
async def upload_document_notes(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Extracts text from uploaded study document in-memory, generating summaries and citations."""
    student = _get_current_student(current_user, db)

    allowed_exts = [".pdf", ".txt", ".md"]
    fname = (file.filename or "notes.txt").lower()
    if not any(fname.endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document format. Allowed formats are PDF (.pdf), Text (.txt), and Markdown (.md).",
        )

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document size exceeds 10MB limit.",
        )

    grade = getattr(student, "class_name", "Grade 10")
    result = ai_academic_service.summarize_document(
        doc_bytes=contents,
        filename=file.filename or "study_material.pdf",
        student_grade=grade,
    )
    return result


@router.post(
    "/quiz/generate",
    response_model=QuizGenerationResponse,
    summary="Generate curriculum-aligned practice questions",
)
def generate_academic_quiz(
    payload: QuizGenerationRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Generates 1 to 10 questions for a given subject and chapter with Socratic hints."""
    _get_current_student(current_user, db)
    return ai_academic_service.generate_quiz(
        subject_name=payload.subject_name,
        chapter_title=payload.chapter_title,
        difficulty=payload.difficulty,
        question_count=payload.question_count,
    )


@router.post(
    "/quiz/evaluate",
    response_model=QuizEvaluationResponse,
    summary="Submit answers for evaluation and pedagogical feedback",
)
def evaluate_academic_quiz(
    payload: QuizSubmissionRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Evaluates student quiz choices, returning scores and conceptual error explanations."""
    _get_current_student(current_user, db)
    return ai_academic_service.evaluate_quiz(
        quiz_id=payload.quiz_id,
        answers=payload.answers,
    )


@router.post(
    "/flashcards/generate",
    response_model=FlashcardDeckResponse,
    summary="Generate revision flashcards for a chapter or subject",
)
def generate_academic_flashcards(
    subject_name: str = Query(..., description="Subject name"),
    chapter_title: str | None = Query(None, description="Optional chapter or topic title"),
    card_count: int = Query(4, ge=1, le=10, description="Number of flashcards"),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Generates flashcards with front (term/concept), back (definition/formula), and hint."""
    _get_current_student(current_user, db)
    return ai_academic_service.generate_flashcards(
        subject_name=subject_name,
        chapter_title=chapter_title,
        card_count=card_count,
    )


@router.get(
    "/exam-prep",
    response_model=ExamPrepPlanResponse,
    summary="Generate countdown revision checklist for upcoming examination",
)
def get_exam_prep_checklist(
    subject_name: str | None = Query(None, description="Optional target subject"),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Generates structured daily revision checklist based on verified scheduled examinations."""
    student = _get_current_student(current_user, db)
    return ai_academic_service.generate_exam_prep_plan(
        student=student,
        subject_name=subject_name,
        db=db,
    )


@router.post(
    "/homework-hint",
    summary="Get Socratic step-by-step guidance on a homework problem without cheating",
)
def get_socratic_homework_guidance(
    problem_text: str = Query(..., min_length=3, max_length=2000, description="Homework question text"),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Returns 3-step pedagogical breakdown: Key Concept -> Formula -> Guiding Question."""
    student = _get_current_student(current_user, db)
    grade = getattr(student, "class_name", "Grade 10")
    return ai_academic_service.solve_homework_socratic(
        problem_text=problem_text,
        grade_level=grade,
    )


# ============================================================================
# RELEASE 3: INTERACTIVE AI ENDPOINTS (Language, Debate, Concept Map, Notes)
# ============================================================================

@router.post(
    "/language/evaluate",
    response_model=GrammarEvaluationResponse,
    summary="Evaluate English sentence grammar, CEFR rating, and vocabulary upgrades",
)
def evaluate_language_grammar(
    payload: GrammarEvaluationRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Analyzes student English expression and provides pedagogical corrections."""
    student = _get_current_student(current_user, db)
    grade = payload.target_grade_level or getattr(student, "class_name", "Grade 10")
    return ai_interactive_service.evaluate_grammar(payload.student_text, student_grade=grade)


@router.post(
    "/debate/round",
    response_model=DebateRoundResponse,
    summary="Progress structured 3-round constructive debate session",
)
def submit_debate_round(
    payload: DebateRoundRequest,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Evaluates student's argument, presents counter-points, and tracks 3-round debate."""
    _get_current_student(current_user, db)
    return ai_interactive_service.progress_debate_round(
        topic=payload.topic,
        stance=payload.stance,
        current_round=payload.current_round,
        student_argument=payload.student_argument,
    )


@router.get(
    "/concept-map",
    response_model=ConceptMapResponse,
    summary="Generate 2D interactive concept map for a subject topic",
)
def get_interactive_concept_map(
    topic: str = Query(..., min_length=2, max_length=150, description="Topic name to map"),
    subject_name: str | None = Query(None, description="Optional subject"),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Generates visual concept nodes, relationships, and takeaways."""
    student = _get_current_student(current_user, db)
    grade = getattr(student, "class_name", "Grade 10")
    return ai_interactive_service.generate_concept_map(
        topic=topic,
        subject=subject_name,
        grade_level=grade,
    )


@router.get(
    "/class-notes",
    response_model=ClassTopicNotesResponse,
    summary="Get structured revision notes for today's classes and topics",
)
def get_class_lecture_notes(
    subject_name: str | None = Query(None, description="Optional subject filter"),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Produces structured lecture takeaways grounded in timetable and curriculum."""
    student = _get_current_student(current_user, db)
    return ai_interactive_service.generate_class_topic_notes(
        db=db,
        student_id=student.id,
        subject_name=subject_name,
    )


# ============================================================================
# RELEASE 4: PROACTIVE AI ENDPOINTS (Briefing, Daily Challenge, Careers)
# ============================================================================

@router.get(
    "/briefing",
    response_model=MorningBriefingResponse,
    summary="Get proactive daily morning briefing digest for student",
)
def get_student_morning_briefing(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Combines timetable, exams, fees, and calendar notice into daily briefing."""
    student = _get_current_student(current_user, db)
    return ai_proactive_service.generate_morning_briefing(db, student.id)


@router.get(
    "/daily-challenge",
    response_model=DailyChallengeResponse,
    summary="Get today's 1-minute curriculum brain teaser question",
)
def get_todays_daily_challenge(
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Returns rotating daily challenge question with hint and explanation."""
    student = _get_current_student(current_user, db)
    return ai_proactive_service.get_daily_challenge(db, student.id)


@router.get(
    "/career-discovery",
    response_model=CareerDiscoveryResponse,
    summary="Get tailored career pathways matching academic strengths and interests",
)
def get_student_career_discovery(
    interests: str | None = Query(None, description="Optional stated interests (e.g., technology, medicine)"),
    current_user: User = Depends(require_roles(UserRole.STUDENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Recommends university majors, skills, and industry career pathways."""
    student = _get_current_student(current_user, db)
    return ai_proactive_service.discover_career_pathways(
        db=db,
        student_id=student.id,
        interests=interests,
    )



