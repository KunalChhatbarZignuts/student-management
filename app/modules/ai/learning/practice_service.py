import datetime as dt
import json
import logging
import os
import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.ai.learning.models import (
    SubjectChapter,
    ChapterTopic,
    AIPracticeSession,
    AIPracticeQuestion,
    RecommendationStatus,
)
from app.modules.academics.classroom_models import Subject
from app.modules.ai.learning.schemas import (
    PracticeSessionPublic,
    PracticeQuestionPublic,
    StudentAnswerSubmission,
    PracticeEvaluationResponse,
    QuestionEvaluationResult,
)

logger = logging.getLogger(__name__)

# Fallback curated question bank by subject keywords for offline / keyless resilience
FALLBACK_QUESTIONS_BANK = {
    "math": [
        {
            "question_text": "If 3x + 7 = 22, what is the value of x?",
            "options": ["3", "5", "7", "15"],
            "correct_option_index": 1,
            "hint": "Subtract 7 from both sides, then divide by 3.",
            "explanation": "3x + 7 = 22 => 3x = 22 - 7 => 3x = 15 => x = 5."
        },
        {
            "question_text": "What is the slope of the line representing 4x - 2y = 10?",
            "options": ["2", "-2", "4", "5"],
            "correct_option_index": 0,
            "hint": "Convert to y = mx + c format where m is the slope.",
            "explanation": "-2y = -4x + 10 => 2y = 4x - 10 => y = 2x - 5. The slope m is 2."
        },
        {
            "question_text": "In a right-angled triangle, if legs are of length 6 cm and 8 cm, what is the hypotenuse?",
            "options": ["9 cm", "10 cm", "12 cm", "14 cm"],
            "correct_option_index": 1,
            "hint": "Use the Pythagorean theorem: a^2 + b^2 = c^2.",
            "explanation": "6^2 + 8^2 = 36 + 64 = 100. The square root of 100 is 10 cm."
        },
        {
            "question_text": "What is the value of sin(30°) in standard trigonometry?",
            "options": ["0", "0.5 (1/2)", "√3/2", "1"],
            "correct_option_index": 1,
            "hint": "Recall the standard angle ratios for 30-60-90 degree triangles.",
            "explanation": "sin(30°) = opposite/hypotenuse = 1/2 = 0.5."
        },
        {
            "question_text": "What is the median of the data set: [4, 8, 3, 9, 7]?",
            "options": ["4", "7", "8", "6.2"],
            "correct_option_index": 1,
            "hint": "First sort the numbers in ascending order: [3, 4, 7, 8, 9].",
            "explanation": "Sorted list is [3, 4, 7, 8, 9]. The middle element (3rd) is 7."
        }
    ],
    "science": [
        {
            "question_text": "Which gas is released during photosynthesis by green plants?",
            "options": ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"],
            "correct_option_index": 1,
            "hint": "Plants take in CO2 and water using sunlight and release this gas essential for animal respiration.",
            "explanation": "Photosynthesis equation: 6CO2 + 6H2O -> C6H12O6 + 6O2. Oxygen (O2) is produced."
        },
        {
            "question_text": "According to Ohm's Law, what is the mathematical relationship between Voltage (V), Current (I), and Resistance (R)?",
            "options": ["V = I / R", "V = I * R", "I = V * R", "R = V * I"],
            "correct_option_index": 1,
            "hint": "Voltage is directly proportional to current when resistance is constant.",
            "explanation": "Ohm's law states V = I * R (Potential difference = Current * Resistance)."
        },
        {
            "question_text": "What is the pH of a neutral aqueous solution at 25°C?",
            "options": ["0", "7", "14", "1"],
            "correct_option_index": 1,
            "hint": "Pure water has an equal concentration of H+ and OH- ions.",
            "explanation": "A pH of 7 is neutral. Values below 7 are acidic, and values above 7 are basic/alkaline."
        },
        {
            "question_text": "Which cellular organelle is known as the 'powerhouse of the cell'?",
            "options": ["Ribosome", "Nucleus", "Mitochondria", "Golgi apparatus"],
            "correct_option_index": 2,
            "hint": "This organelle produces ATP through cellular respiration.",
            "explanation": "Mitochondria generate most of the chemical energy needed by the cell (ATP)."
        },
        {
            "question_text": "A concave mirror produces a real, inverted image of the same size as the object when the object is placed at:",
            "options": ["Focus (F)", "Center of Curvature (C)", "Infinity", "Between Pole and Focus"],
            "correct_option_index": 1,
            "hint": "At radius of curvature R = 2F, the magnification magnitude equals 1.",
            "explanation": "When an object is placed at Center of Curvature C, the image is real, inverted, and same size at C."
        }
    ],
    "english": [
        {
            "question_text": "Identify the passive voice for: 'The chef cooked a delicious dinner.'",
            "options": [
                "A delicious dinner was cooked by the chef.",
                "A delicious dinner is being cooked by the chef.",
                "The chef was cooking a delicious dinner.",
                "A delicious dinner had been cooked by the chef."
            ],
            "correct_option_index": 0,
            "hint": "In past simple passive, use was/were + past participle (cooked).",
            "explanation": "'A delicious dinner was cooked by the chef' correctly uses past simple passive voice."
        },
        {
            "question_text": "Choose the correctly reported speech for: He said, 'I am reading a book.'",
            "options": [
                "He said that he was reading a book.",
                "He says that he is reading a book.",
                "He said that I was reading a book.",
                "He asked if he was reading a book."
            ],
            "correct_option_index": 0,
            "hint": "Present continuous ('am reading') changes to past continuous ('was reading') in reported speech.",
            "explanation": "Direct speech in present continuous shifts back to past continuous: 'was reading'."
        },
        {
            "question_text": "Which literary device involves an explicit comparison using 'like' or 'as'?",
            "options": ["Metaphor", "Simile", "Personification", "Alliteration"],
            "correct_option_index": 1,
            "hint": "For example: 'He fought as bravely as a lion.'",
            "explanation": "A simile compares two distinct things using words such as 'like' or 'as'."
        }
    ]
}


def _generate_questions_with_ai(subject_name: str, chapter_title: str, difficulty: str, count: int) -> list[dict[str, Any]] | None:
    """Attempts to call Hugging Face LLM or Gemini to generate tailored questions."""
    from app.modules.ai.assistant.hf_provider import hf_provider
    if hf_provider.is_configured():
        try:
            prompt = f"""Generate {count} multiple-choice practice questions for:
Subject: {subject_name}
Chapter/Topic: {chapter_title}
Difficulty Level: {difficulty} (High School level)

Return ONLY valid JSON matching this exact structure:
[
  {{
    "question_text": "Clear conceptual question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "hint": "One short clue to guide the student without giving away the answer",
    "explanation": "Step-by-step pedagogical explanation of why this answer is correct"
  }}
]
"""
            messages = [
                {"role": "system", "content": "You are an expert high school academic teacher. You return ONLY pure valid JSON."},
                {"role": "user", "content": prompt},
            ]
            hf_res = hf_provider.chat_completion(messages=messages, max_tokens=1024, temperature=0.5)
            if hf_res:
                text = hf_res.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                data = json.loads(text.strip())
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as exc:
            logger.warning(f"Hugging Face practice question generation fallback triggered: {exc}")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = f"""
You are an expert high-school educator. Generate {count} multiple-choice practice questions for:
Subject: {subject_name}
Chapter/Topic: {chapter_title}
Difficulty Level: {difficulty}

Return ONLY valid JSON matching this exact structure:
[
  {{
    "question_text": "Clear conceptual question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "hint": "One short clue to guide the student without giving away the answer",
    "explanation": "Step-by-step pedagogical explanation of why this answer is correct"
  }}
]
"""
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
        )
        text = response.text.strip()
        # Clean markdown code blocks if wrapped
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        data = json.loads(text.strip())
        if isinstance(data, list) and len(data) > 0:
            return data
    except Exception as e:
        logger.warning(f"Gemini API practice generation fallback triggered: {e}")
    return None


def generate_practice_session(
    student_id: uuid.UUID,
    chapter_id: uuid.UUID | None,
    subject_id: uuid.UUID | None,
    difficulty: str,
    num_questions: int,
    db: Session,
) -> PracticeSessionPublic:
    """Creates a new practice session and returns questions with hidden answers."""
    # Resolve Chapter & Subject
    chapter = None
    subject = None

    if chapter_id:
        chapter = db.execute(select(SubjectChapter).where(SubjectChapter.id == chapter_id)).scalars().first()
        if chapter:
            subject = chapter.subject

    if not chapter and subject_id:
        subject = db.execute(select(Subject).where(Subject.id == subject_id)).scalars().first()
        if subject:
            chapter = db.execute(
                select(SubjectChapter).where(SubjectChapter.subject_id == subject.id).order_by(SubjectChapter.chapter_number.asc())
            ).scalars().first()

    if not chapter:
        # Default to first available chapter
        chapter = db.execute(select(SubjectChapter).order_by(SubjectChapter.order_index.asc())).scalars().first()
        if chapter:
            subject = chapter.subject

    subject_name = subject.name if subject else "General Academics"
    chapter_title = chapter.title if chapter else "Diagnostic Fundamentals"

    # Generate questions (via AI or Fallback Bank)
    questions_data = _generate_questions_with_ai(subject_name, chapter_title, difficulty, num_questions)

    if not questions_data:
        # Select from Fallback Bank
        subj_key = "math"
        if "science" in subject_name.lower():
            subj_key = "science"
        elif "english" in subject_name.lower():
            subj_key = "english"
        questions_data = FALLBACK_QUESTIONS_BANK.get(subj_key, FALLBACK_QUESTIONS_BANK["math"])[:num_questions]

    # Create Session in DB
    session = AIPracticeSession(
        student_id=student_id,
        chapter_id=chapter.id if chapter else None,
        subject_name=subject_name,
        chapter_title=chapter_title,
        total_questions=len(questions_data),
        correct_count=0,
        score_percentage=0.0,
        difficulty=difficulty,
    )
    db.add(session)
    db.flush()

    public_questions: list[PracticeQuestionPublic] = []
    for idx, q_item in enumerate(questions_data, start=1):
        q = AIPracticeQuestion(
            session_id=session.id,
            question_text=q_item["question_text"],
            options=q_item["options"],
            correct_option_index=q_item["correct_option_index"],
            explanation=q_item["explanation"],
            hint=q_item.get("hint"),
        )
        db.add(q)
        db.flush()

        public_questions.append(PracticeQuestionPublic(
            id=q.id,
            question_number=idx,
            question_text=q.question_text,
            options=q.options,
            hint=q.hint,
        ))

    db.commit()

    return PracticeSessionPublic(
        session_id=session.id,
        subject_name=subject_name,
        chapter_title=chapter_title,
        difficulty=difficulty,
        total_questions=len(public_questions),
        questions=public_questions,
    )


def evaluate_practice_session(
    session_id: uuid.UUID,
    answers: list[StudentAnswerSubmission],
    student_id: uuid.UUID,
    db: Session,
) -> PracticeEvaluationResponse:
    """Evaluates student submission, reveals explanations, and updates mastery."""
    session = db.execute(
        select(AIPracticeSession).where(
            AIPracticeSession.id == session_id,
            AIPracticeSession.student_id == student_id,
        )
    ).scalars().first()

    if not session:
        raise ValueError("Practice session not found or unauthorized")

    questions = db.execute(
        select(AIPracticeQuestion).where(AIPracticeQuestion.session_id == session.id)
    ).scalars().all()

    answers_map = {a.question_id: a.selected_option_index for a in answers}
    correct_count = 0
    results: list[QuestionEvaluationResult] = []

    for q in questions:
        selected_idx = answers_map.get(q.id)
        is_corr = (selected_idx == q.correct_option_index) if selected_idx is not None else False
        if is_corr:
            correct_count += 1

        q.selected_option_index = selected_idx
        q.is_correct = is_corr

        results.append(QuestionEvaluationResult(
            question_id=q.id,
            question_text=q.question_text,
            selected_option_index=selected_idx,
            correct_option_index=q.correct_option_index,
            is_correct=is_corr,
            explanation=q.explanation,
            hint=q.hint,
        ))

    total = len(questions)
    pct = round((correct_count / total * 100.0), 1) if total > 0 else 0.0

    session.correct_count = correct_count
    session.score_percentage = pct
    session.completed_at = dt.datetime.now(dt.timezone.utc)

    # Dynamic learning recommendation feedback
    if pct >= 75.0:
        impact_msg = f"Awesome work! Scored {pct}%. Recommended topic mastery verified."
    else:
        impact_msg = f"Diagnostic score: {pct}%. Additional concept revision recommended before re-attempting."
        impact_msg = f"Diagnostic session completed with {pct}% accuracy. Progress recorded in your learning journey."

    db.commit()

    return PracticeEvaluationResponse(
        session_id=session.id,
        subject_name=session.subject_name,
        chapter_title=session.chapter_title,
        total_questions=total,
        correct_count=correct_count,
        score_percentage=pct,
        results=results,
        learning_impact=impact_msg,
    )
