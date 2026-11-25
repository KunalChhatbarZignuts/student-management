import datetime as dt
import json
import logging
import uuid
from typing import Any
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.models.ai_learning import (
    SubjectChapter,
    ChapterTopic,
    AIPracticeSession,
    AIPracticeQuestion,
    AIStudentMistake,
    AITopicMastery,
    TopicMasteryLevel,
)
from app.models.classroom import Subject
from app.schemas.ai_learning import (
    PracticeSessionPublic,
    PracticeQuestionPublic,
    StudentAnswerSubmission,
    PracticeEvaluationResponse,
    QuestionEvaluationResult,
    PracticeHistoryItem,
    StudentMistakeResponse,
)
from app.services.learning.learning_path_service import record_topic_practice_result

logger = logging.getLogger(__name__)

CURATED_QUESTION_BANK = {
    "math": [
        {
            "question_text": "If 3x + 7 = 22, what is the value of x?",
            "options": ["3", "5", "7", "15"],
            "correct_option_index": 1,
            "hint": "Subtract 7 from both sides, then divide by 3.",
            "explanation": "3x + 7 = 22 => 3x = 22 - 7 => 3x = 15 => x = 5.",
            "misconception": "Often students forget to apply the inverse operation equally to both sides."
        },
        {
            "question_text": "What is the slope of the line representing 4x - 2y = 10?",
            "options": ["2", "-2", "4", "5"],
            "correct_option_index": 0,
            "hint": "Convert to y = mx + c format where m is the slope.",
            "explanation": "-2y = -4x + 10 => 2y = 4x - 10 => y = 2x - 5. The slope m is 2.",
            "misconception": "Sign error when dividing both sides by the negative coefficient of y."
        },
        {
            "question_text": "In a right-angled triangle, if the legs are 6 cm and 8 cm, what is the hypotenuse?",
            "options": ["9 cm", "10 cm", "12 cm", "14 cm"],
            "correct_option_index": 1,
            "hint": "Use the Pythagorean theorem: a^2 + b^2 = c^2.",
            "explanation": "6^2 + 8^2 = 36 + 64 = 100. sqrt(100) = 10 cm.",
            "misconception": "Adding the sides directly (6 + 8 = 14) instead of squaring first."
        },
        {
            "question_text": "What is the value of sin(30°) in standard trigonometry?",
            "options": ["0", "0.5 (1/2)", "√3/2", "1"],
            "correct_option_index": 1,
            "hint": "Recall the standard angle ratios for 30-60-90 degree triangles.",
            "explanation": "sin(30°) = opposite/hypotenuse = 1/2 = 0.5.",
            "misconception": "Confusing sine of 30° with cosine of 30° (which is √3/2)."
        },
        {
            "question_text": "What is the median of the data set: [4, 8, 3, 9, 7]?",
            "options": ["4", "7", "8", "6.2"],
            "correct_option_index": 1,
            "hint": "First sort the numbers in ascending order: [3, 4, 7, 8, 9].",
            "explanation": "Sorted list is [3, 4, 7, 8, 9]. The middle element is 7.",
            "misconception": "Taking the middle number without sorting the dataset first."
        },
        {
            "question_text": "Solve the quadratic equation x^2 - 5x + 6 = 0 for x.",
            "options": ["x = 2 or x = 3", "x = -2 or x = -3", "x = 1 or x = 6", "x = -1 or x = -6"],
            "correct_option_index": 0,
            "hint": "Find two numbers whose product is 6 and sum is -5: (-2) and (-3).",
            "explanation": "(x - 2)(x - 3) = 0 => x = 2 or x = 3.",
            "misconception": "Flipping signs of roots when equating factors to zero."
        }
    ],
    "science": [
        {
            "question_text": "Which gas is released during photosynthesis by green plants?",
            "options": ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"],
            "correct_option_index": 1,
            "hint": "Plants take in CO2 and water using sunlight and release this gas essential for respiration.",
            "explanation": "Photosynthesis equation: 6CO2 + 6H2O -> C6H12O6 + 6O2. Oxygen is released.",
            "misconception": "Confusing plant respiration (taking in O2 at night) with daytime photosynthesis."
        },
        {
            "question_text": "According to Ohm's Law, what is the mathematical relationship between Voltage (V), Current (I), and Resistance (R)?",
            "options": ["V = I / R", "V = I * R", "I = V * R", "R = V * I"],
            "correct_option_index": 1,
            "hint": "Voltage is directly proportional to current when resistance is constant.",
            "explanation": "Ohm's law states V = I * R (Potential difference = Current * Resistance).",
            "misconception": "Inverting the relationship into V = I / R."
        },
        {
            "question_text": "What is the pH of a neutral aqueous solution at 25°C?",
            "options": ["0", "7", "14", "1"],
            "correct_option_index": 1,
            "hint": "Pure water has an equal concentration of H+ and OH- ions.",
            "explanation": "A pH of 7 is neutral. Values below 7 are acidic; above 7 are basic.",
            "misconception": "Thinking pH 0 means neutral because zero usually denotes 'empty'."
        },
        {
            "question_text": "Which cellular organelle is known as the 'powerhouse of the cell'?",
            "options": ["Ribosome", "Nucleus", "Mitochondria", "Golgi apparatus"],
            "correct_option_index": 2,
            "hint": "This organelle produces ATP through cellular respiration.",
            "explanation": "Mitochondria generate most of the chemical energy needed by the cell (ATP).",
            "misconception": "Confusing ribosomes (protein factories) with mitochondria (energy powerhouses)."
        },
        {
            "question_text": "A concave mirror produces a real, inverted image of the same size as the object when the object is placed at:",
            "options": ["Focus (F)", "Center of Curvature (C)", "Infinity", "Between Pole and Focus"],
            "correct_option_index": 1,
            "hint": "Ray parallel to axis passes through focus; ray through focus reflects parallel.",
            "explanation": "When placed at C, the image is formed at C, real, inverted, and of the same size.",
            "misconception": "Confusing focus (which produces an infinite image) with center of curvature."
        }
    ]
}


def generate_practice_session(
    student_id: uuid.UUID,
    chapter_id: uuid.UUID | None,
    subject_id: uuid.UUID | None,
    difficulty: str,
    num_questions: int,
    db: Session,
) -> AIPracticeSession:
    """Creates a new diagnostic or adaptive practice session."""
    ch = db.execute(select(SubjectChapter).where(SubjectChapter.id == chapter_id)).scalar_one_or_none() if chapter_id else None
    subj = db.execute(select(Subject).where(Subject.id == subject_id)).scalar_one_or_none() if subject_id else (ch.subject if ch else None)

    subj_name = subj.name if subj else "General Studies"
    ch_title = ch.title if ch else "Comprehensive Diagnostic"

    session = AIPracticeSession(
        student_id=student_id,
        chapter_id=ch.id if ch else None,
        subject_name=subj_name,
        chapter_title=ch_title,
        difficulty=difficulty,
        total_questions=num_questions,
        correct_count=0,
        score_percentage=0.0,
    )
    db.add(session)
    db.flush()

    # Attempt Hugging Face AI question generation
    generated_questions = []
    from app.services.ai_hf_provider import hf_provider
    if hf_provider.is_configured():
        try:
            prompt = f"""Generate {num_questions} educational practice questions for High School students.
Subject: {subj_name}
Chapter/Topic: {ch_title}
Difficulty: {difficulty}

Strict JSON output format:
[
  {{
    "question_text": "Question statement...",
    "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correct_option_index": 0,
    "hint": "Helpful conceptual hint...",
    "explanation": "Clear explanation of why this answer is correct...",
    "misconception": "Common error or mistake students make..."
  }}
]"""
            resp = hf_provider.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500,
                temperature=0.7,
            )
            clean_json = resp.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()
            parsed = json.loads(clean_json)
            if isinstance(parsed, list) and len(parsed) >= 2:
                generated_questions = parsed[:num_questions]
        except Exception as exc:
            logger.warning(f"AI practice question generation fallback: {exc}")

    if not generated_questions:
        lookup_key = "math" if "math" in subj_name.lower() else "science"
        bank = CURATED_QUESTION_BANK.get(lookup_key, CURATED_QUESTION_BANK["math"])
        generated_questions = bank[:num_questions]

    for q_data in generated_questions:
        q = AIPracticeQuestion(
            session_id=session.id,
            question_text=q_data["question_text"],
            options=q_data["options"],
            correct_option_index=int(q_data["correct_option_index"]),
            explanation=q_data.get("explanation", "Review core curriculum principles."),
            hint=q_data.get("hint"),
        )
        db.add(q)

    db.commit()
    db.refresh(session)
    return session


def evaluate_practice_session(
    student_id: uuid.UUID,
    session_id: uuid.UUID,
    answers: list[StudentAnswerSubmission],
    db: Session,
) -> PracticeEvaluationResponse:
    """Evaluates student answers, updates topic mastery, and records mistake bank entries."""
    session = db.execute(
        select(AIPracticeSession).where(
            AIPracticeSession.id == session_id,
            AIPracticeSession.student_id == student_id,
        )
    ).scalar_one_or_none()

    if not session:
        raise ValueError("Practice session not found")

    answers_map = {a.question_id: a.selected_option_index for a in answers}
    questions = session.questions

    correct_count = 0
    results: list[QuestionEvaluationResult] = []

    # Associated chapter topic for mastery recording
    topic = None
    if session.chapter_id:
        topic = db.execute(
            select(ChapterTopic).where(ChapterTopic.chapter_id == session.chapter_id)
        ).scalars().first()

    for q in questions:
        selected_idx = answers_map.get(q.id)
        q.selected_option_index = selected_idx
        is_corr = (selected_idx is not None) and (selected_idx == q.correct_option_index)
        q.is_correct = is_corr
        if is_corr:
            correct_count += 1
        else:
            # Record into Mistake Bank for student remediation
            student_choice = q.options[selected_idx] if (selected_idx is not None and selected_idx < len(q.options)) else "No response"
            correct_choice = q.options[q.correct_option_index] if q.correct_option_index < len(q.options) else "Unknown"
            mistake = AIStudentMistake(
                student_id=student_id,
                topic_id=topic.id if topic else None,
                subject_name=session.subject_name,
                topic_title=topic.title if topic else session.chapter_title,
                question_text=q.question_text,
                student_answer=student_choice,
                correct_answer=correct_choice,
                misconception_explanation=q.explanation,
                is_resolved=False,
            )
            db.add(mistake)

        # Update topic mastery progression
        if topic:
            record_topic_practice_result(student_id, topic.id, is_corr, db)

        results.append(QuestionEvaluationResult(
            question_id=q.id,
            question_text=q.question_text,
            selected_option_index=selected_idx,
            correct_option_index=q.correct_option_index,
            is_correct=is_corr,
            explanation=q.explanation,
            hint=q.hint,
        ))

    score_pct = round((correct_count / len(questions)) * 100.0, 1) if questions else 0.0
    session.correct_count = correct_count
    session.score_percentage = score_pct
    session.completed_at = dt.datetime.now(dt.timezone.utc)

    if score_pct >= 80.0:
        impact = "Excellent mastery demonstrated. You are ready to tackle advanced problem-solving."
    elif score_pct >= 60.0:
        impact = "Good conceptual progress. Review the highlighted explanations to solidify your foundation."
    else:
        impact = "Gaps detected. Mistakes have been added to your Mistake Bank for guided remediation."

    db.commit()
    return PracticeEvaluationResponse(
        session_id=session.id,
        subject_name=session.subject_name,
        chapter_title=session.chapter_title,
        total_questions=len(questions),
        correct_count=correct_count,
        score_percentage=score_pct,
        results=results,
        learning_impact=impact,
    )


def get_student_mistakes(student_id: uuid.UUID, db: Session) -> list[StudentMistakeResponse]:
    """Retrieves unresolved learning mistakes for personalized remediation."""
    mistakes = db.execute(
        select(AIStudentMistake)
        .where(
            AIStudentMistake.student_id == student_id,
            AIStudentMistake.is_resolved.is_(False),
        )
        .order_by(AIStudentMistake.created_at.desc())
        .limit(20)
    ).scalars().all()
    return [StudentMistakeResponse.model_validate(m) for m in mistakes]


def resolve_student_mistake(
    student_id: uuid.UUID, mistake_id: uuid.UUID, is_resolved: bool, db: Session
) -> StudentMistakeResponse:
    """Marks a mistake as resolved after remediation."""
    m = db.execute(
        select(AIStudentMistake).where(
            AIStudentMistake.id == mistake_id,
            AIStudentMistake.student_id == student_id,
        )
    ).scalar_one_or_none()

    if not m:
        raise ValueError("Mistake record not found")

    m.is_resolved = is_resolved
    m.resolved_at = dt.datetime.now(dt.timezone.utc) if is_resolved else None
    db.commit()
    db.refresh(m)
    return StudentMistakeResponse.model_validate(m)
