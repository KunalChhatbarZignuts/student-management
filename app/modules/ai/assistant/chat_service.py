import datetime as dt
import logging
import os
import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.ai.learning.service import compute_student_exam_performance, ensure_learning_recommendations, get_or_create_daily_study_plan
from app.modules.ai.learning.schemas import ChatResponse, ChatActionSuggestion

logger = logging.getLogger(__name__)


def process_student_chat(student_id: uuid.UUID, message: str, db: Session) -> ChatResponse:
    """Processes student educational questions with authenticated academic context."""
    student = db.execute(select(Student).where(Student.id == student_id)).scalars().first()
    if not student:
        raise ValueError("Student not found")

    # Gather academic context
    perf = compute_student_exam_performance(student.id, db)
    subject_summaries = perf["subject_summaries"]
    weak_subjs = [s for s in subject_summaries if s.status in ("CRITICAL_ATTENTION", "NEEDS_IMPROVEMENT")]
    strong_subjs = [s for s in subject_summaries if s.status in ("EXCELLING", "STRONG")]

    recs = ensure_learning_recommendations(student, subject_summaries, db)
    pending_recs = [r for r in recs if r.status != "COMPLETED"]
    top_rec = pending_recs[0] if pending_recs else None

    daily_plan = get_or_create_daily_study_plan(student, db)
    pending_plan_items = [i for i in daily_plan.items if not i.is_completed]

    # Context string
    weak_names = ", ".join([f"{s.subject_name} ({s.average_marks}%)" for s in weak_subjs]) if weak_subjs else "None"
    strong_names = ", ".join([f"{s.subject_name} ({s.average_marks}%)" for s in strong_subjs]) if strong_subjs else "All subjects consistent"
    rec_info = f"{top_rec.subject_name}: {top_rec.topic_title}" if top_rec else "All caught up"
    plan_info = ", ".join([f"{i.subject_name} ({i.duration_minutes}m)" for i in pending_plan_items]) if pending_plan_items else "All daily tasks completed"

    from app.modules.ai.assistant.hf_provider import hf_provider
    if hf_provider.is_configured():
        try:
            system_prompt = f"""You are the AI Personal Learning Assistant for {student.first_name}, a student in {student.class_name or 'High School'}.
Your role is to act as an encouraging, pedagogically sound, and supportive academic coach.

Verified Student Academic Context:
- Overall Exam Average: {perf['overall_average']}%
- Weak Subjects needing attention: {weak_names}
- Strong Subjects: {strong_names}
- Top Recommended Topic: {rec_info}
- Today's Remaining Study Plan: {plan_info}

Rules:
1. Provide constructive, educational explanations and actionable advice.
2. If asked about weak areas, explain them kindly with reference to their verified score and suggest specific topics to revise.
3. If asked about what to study today, reference their daily study plan.
4. If asked to explain a concept or give tips, explain simply with an example and KaTeX LaTeX math ($...$) where appropriate.
5. Strictly decline non-educational or harmful questions.
6. Keep responses concise, clear, and inspiring (under 150 words).
"""
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ]
            hf_text = hf_provider.chat_completion(messages=messages, max_tokens=512, temperature=0.7)
            if hf_text:
                return ChatResponse(
                    reply=hf_text.strip(),
                    suggested_actions=[
                        ChatActionSuggestion(label="View Today's Study Plan", action_type="NAVIGATE_PLAN"),
                        ChatActionSuggestion(label="Start Recommended Practice", action_type="START_PRACTICE"),
                    ],
                    timestamp=dt.datetime.now(dt.timezone.utc),
                )
        except Exception as exc:
            logger.warning(f"Hugging Face tutor chat fallback triggered: {exc}")

    # Deterministic Rule-Based Fallback
    msg_lower = message.lower()
    if any(k in msg_lower for k in ["weak", "improve", "bad", "score", "marks", "grade"]):
        if weak_subjs:
            reply = (
                f"Based on your recent exam results, your primary focus area is {weak_subjs[0].subject_name} "
                f"with an average of {weak_subjs[0].average_marks}%. I have prioritized foundational chapter topics "
                f"in your Learning Path to help you gain confidence before your next exam."
            )
        else:
            reply = (
                f"Great news! Your overall exam performance is {perf['overall_average']}%, and your scores across "
                f"subjects are in good standing. To keep excelling, practice advanced questions in your top subjects."
            )
        actions = [
            ChatActionSuggestion(label="Open Subject Analysis", action_type="VIEW_SUBJECT"),
            ChatActionSuggestion(label="Take Practice Quiz", action_type="START_PRACTICE"),
        ]
    elif any(k in msg_lower for k in ["today", "study", "schedule", "plan", "what should i"]):
        if pending_plan_items:
            first_item = pending_plan_items[0]
            reply = (
                f"Today, I recommend focusing on {first_item.subject_name}: '{first_item.topic_title}' "
                f"for about {first_item.duration_minutes} minutes. You have {len(pending_plan_items)} activities planned today."
            )
        else:
            reply = "You have completed all planned study sessions for today! Take a well-deserved break or try an optional practice quiz."
        actions = [
            ChatActionSuggestion(label="Go to Today's Plan", action_type="NAVIGATE_PLAN"),
            ChatActionSuggestion(label="Quick 5-Min Quiz", action_type="START_PRACTICE"),
        ]
    elif any(k in msg_lower for k in ["practice", "quiz", "test", "question"]):
        reply = (
            f"Ready to test your knowledge? I can generate a targeted 5-question quiz for "
            f"{top_rec.subject_name if top_rec else 'your current subjects'} with instant feedback on each question."
        )
        actions = [
            ChatActionSuggestion(label="Launch Practice Quiz", action_type="START_PRACTICE"),
        ]
    else:
        reply = (
            f"Hello {student.first_name}! I am your AI Learning Assistant. You can ask me how to improve in specific subjects, "
            f"what topics to revise today, or request interactive practice questions to prepare for upcoming examinations."
        )
        actions = [
            ChatActionSuggestion(label="View Learning Overview", action_type="VIEW_SUBJECT"),
            ChatActionSuggestion(label="Check Today's Plan", action_type="NAVIGATE_PLAN"),
        ]

    return ChatResponse(
        reply=reply,
        suggested_actions=actions,
        timestamp=dt.datetime.now(dt.timezone.utc),
    )
