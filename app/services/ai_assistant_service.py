import datetime as dt
import json
import logging
import os
import re
import uuid
from typing import Any

from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload

from app.models.ai_student_assistant import AIStudentConversation, AIStudentMessage, MessageSender
from app.models.student import Student
from app.services import ai_assistant_tools
from app.services.ai_hf_provider import hf_provider

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Conversation & Message Management
# ---------------------------------------------------------------------------

def create_conversation(student_id: uuid.UUID, title: str | None, db: Session) -> AIStudentConversation:
    conv = AIStudentConversation(
        student_id=student_id,
        title=title or "New Conversation",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def list_conversations(student_id: uuid.UUID, db: Session) -> list[dict[str, Any]]:
    # Eager-load messages in a single query to eliminate N+1 latency
    convs = db.execute(
        select(AIStudentConversation)
        .options(selectinload(AIStudentConversation.messages))
        .where(AIStudentConversation.student_id == student_id)
        .order_by(AIStudentConversation.updated_at.desc())
    ).scalars().all()

    results = []
    for c in convs:
        # Sort in-memory from preloaded relationship
        msgs = sorted(c.messages, key=lambda m: m.created_at, reverse=True)
        last_msg = msgs[0] if msgs else None

        results.append({
            "id": c.id,
            "title": c.title,
            "last_message_preview": (last_msg.content[:80] + "...") if last_msg else None,
            "message_count": len(c.messages),
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        })
    return results


def get_conversation_detail(student_id: uuid.UUID, conversation_id: uuid.UUID, db: Session) -> dict[str, Any] | None:
    conv = db.execute(
        select(AIStudentConversation)
        .options(selectinload(AIStudentConversation.messages))
        .where(
            AIStudentConversation.id == conversation_id,
            AIStudentConversation.student_id == student_id,
        )
    ).scalar_one_or_none()

    if not conv:
        return None

    messages_data = []
    for m in conv.messages:
        messages_data.append({
            "id": m.id,
            "sender": m.sender,
            "content": m.content,
            "tools_used": m.tools_used or [],
            "action_links": m.action_links or [],
            "created_at": m.created_at,
        })

    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at,
        "messages": messages_data,
    }


def rename_conversation(student_id: uuid.UUID, conversation_id: uuid.UUID, title: str, db: Session) -> bool:
    conv = db.execute(
        select(AIStudentConversation)
        .where(
            AIStudentConversation.id == conversation_id,
            AIStudentConversation.student_id == student_id,
        )
    ).scalar_one_or_none()

    if not conv:
        return False

    conv.title = title
    conv.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return True


def delete_conversation(student_id: uuid.UUID, conversation_id: uuid.UUID, db: Session) -> bool:
    conv = db.execute(
        select(AIStudentConversation)
        .where(
            AIStudentConversation.id == conversation_id,
            AIStudentConversation.student_id == student_id,
        )
    ).scalar_one_or_none()

    if not conv:
        return False

    db.delete(conv)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Intent Classification & Tool Dispatch
# ---------------------------------------------------------------------------

def classify_query_intent(message: str) -> list[str]:
    """Identifies required tools from student natural-language query."""
    text = message.lower()
    tools = []

    # Academic specialized queries (Release 2)
    if any(k in text for k in ("quiz", "test my knowledge", "practice questions", "mcq")):
        tools.append("generate_quiz")
        return tools

    if any(k in text for k in ("flashcard", "flash cards", "revision cards")):
        tools.append("generate_flashcards")
        return tools

    if any(k in text for k in ("revision plan", "exam prep", "how to prepare", "study checklist")):
        tools.append("generate_exam_prep_plan")
        tools.append("get_student_examinations")
        return tools

    if any(k in text for k in ("homework", "hint", "help solve")):
        tools.append("solve_homework")
        return tools

    # Interactive AI queries (Release 3)
    if any(k in text for k in ("grammar", "english practice", "check my english", "language partner", "correct this sentence")):
        tools.append("evaluate_grammar")
        return tools

    if any(k in text for k in ("debate", "counter-argument", "rebuttal", "affirmative", "negative side")):
        tools.append("debate_round")
        return tools

    if any(k in text for k in ("concept map", "mind map", "topic tree", "visual map")):
        tools.append("generate_concept_map")
        return tools

    if any(k in text for k in ("class notes", "lecture notes", "summary of class", "today's notes", "revision notes")):
        tools.append("get_class_notes")
        return tools

    # Proactive AI queries (Release 4)
    if any(k in text for k in ("morning briefing", "daily briefing", "today's overview", "start my day", "daily summary")):
        tools.append("get_morning_briefing")
        return tools

    if any(k in text for k in ("daily challenge", "brain teaser", "daily question", "knowledge challenge", "streak")):
        tools.append("get_daily_challenge")
        return tools

    if any(k in text for k in ("career", "future jobs", "what should i become", "university major", "career discovery", "pathway")):
        tools.append("discover_careers")
        return tools

    # Combined preparation check (Tomorrow's schedule preparation)
    if ("what" in text and "tomorrow" in text and "do" in text) or text.strip() == "prepare for tomorrow":
        return ["get_student_timetable", "get_student_examinations", "get_school_calendar"]

    if any(k in text for k in ("timetable", "class today", "classes today", "schedule", "period", "next class", "first lecture", "who teaches")):
        tools.append("get_student_timetable")

    if any(k in text for k in ("attendance", "absent", "present", "attendance rate", "working days")):
        tools.append("get_student_attendance")

    if any(k in text for k in ("exam", "examination", "midterm", "upcoming test")):
        tools.append("get_student_examinations")

    if any(k in text for k in ("mark", "marks", "score", "grade", "result", "report card")):
        tools.append("get_student_results")

    if any(k in text for k in ("holiday", "vacation", "calendar", "sunday", "working day")):
        tools.append("get_school_calendar")

    if any(k in text for k in ("fee", "fees", "invoice", "payment", "due amount", "balance")):
        tools.append("get_student_fees")

    if any(k in text for k in ("online class", "online lecture", "live class", "meeting", "recorded")):
        tools.append("get_student_online_classes")

    if any(k in text for k in ("leave", "sick leave", "leave application")):
        tools.append("get_student_leaves")

    if any(k in text for k in ("syllabus", "chapter", "topic", "curriculum")):
        tools.append("get_subject_curriculum")

    if any(k in text for k in ("rule", "policy", "handbook", "guideline", "uniform", "fine", "cut-off", "cutoff", "passing mark", "grading system", "library", "dress code", "conduct", "late fee")):
        tools.append("search_school_knowledge")

    return list(dict.fromkeys(tools))


# ---------------------------------------------------------------------------
# Deterministic Response Synthesizer (Zero-Failure Fallback Engine)
# ---------------------------------------------------------------------------

def synthesize_fallback_response(
    message: str,
    student: Student,
    tool_results: dict[str, Any],
) -> tuple[str, list[dict[str, str]]]:
    """Produces verified, beautifully formatted Markdown responses with portal deep-links."""
    text = message.lower()
    action_links: list[dict[str, str]] = []
    lines: list[str] = []

    # 1. Homework / Assignment check
    if any(k in text for k in ("assignment", "homework", "project submission")):
        lines.append("### Homework & Assignment Status\n")
        lines.append(
            "Please note that online assignment and homework submissions are currently **not activated** in this school portal.\n"
            "Your teachers assign homework directly in class. For curriculum study topics or diagnostic practice, you can explore the Subject Syllabus or Adaptive Practice."
        )
        action_links.append({"label": "Open Learning Assistant", "url": "/learning-assistant"})
        return "\n".join(lines), action_links

    # 2. Recorded online classes check
    if "recorded" in text or "recording" in text:
        lines.append("### Online Class Recordings\n")
        lines.append(
            "Lecture recording is currently **disabled** across online classrooms in this institution in accordance with school privacy standards.\n"
            "You can join upcoming scheduled live sessions directly from your Online Classroom dashboard."
        )
        action_links.append({"label": "Go to Online Classroom", "url": "/online-classroom"})
        return "\n".join(lines), action_links

    # 3. Timetable response
    if "get_student_timetable" in tool_results:
        tt = tool_results["get_student_timetable"]
        date_label = "Tomorrow" if "tomorrow" in text else "Today"
        lines.append(f"### Timetable for {date_label} ({tt.get('date')}, {tt.get('day_of_week')})\n")
        periods = tt.get("periods", [])
        if not periods or not tt.get("is_scheduled"):
            lines.append("You have **no scheduled periods** for this day. It may be a designated study day or school holiday.")
        else:
            lines.append("| Period | Time | Subject | Teacher | Room |")
            lines.append("|---|---|---|---|---|")
            for p in periods:
                lines.append(
                    f"| **P{p['period_number']}** | {p['start_time'][:5]} - {p['end_time'][:5]} | **{p['subject_name']}** (`{p['subject_code']}`) | {p['teacher_name']} | {p['room_name']} |"
                )
        action_links.append({"label": "View Full Timetable", "url": "/timetable"})

    # 4. Attendance response
    if "get_student_attendance" in tool_results:
        att = tool_results["get_student_attendance"]
        if lines:
            lines.append("\n---\n")
        lines.append("### Official Attendance Summary\n")
        lines.append(f"- **Current Attendance Rate**: **{att['attendance_percentage']}%** ({att['status']})")
        lines.append(f"- **Total Working Days**: {att['total_working_days']}")
        lines.append(f"- **Days Attended**: {att['attended_days']}")
        lines.append(f"- **Excused Leaves**: {att['excused_days']}")
        lines.append(f"- **Unexcused Absences**: {att['unexcused_days']}")
        if att["recent_absences"]:
            lines.append("\n*Recent Absences Recorded:*")
            for ab in att["recent_absences"]:
                lines.append(f"- `{ab['date']}`: {ab['type']}")
        action_links.append({"label": "View Attendance Log", "url": "/attendance"})

    # 5. Examinations response
    if "get_student_examinations" in tool_results:
        exams = tool_results["get_student_examinations"]
        if lines:
            lines.append("\n---\n")
        lines.append("### Upcoming Examination Schedules\n")
        upcoming = exams.get("upcoming_examinations", [])
        if not upcoming:
            lines.append("You have no upcoming examinations scheduled right now.")
        else:
            for ex in upcoming:
                lines.append(f"- **{ex['subject_name']}** ({ex['exam_name']}): `{ex['exam_date']}` at `{ex['start_time'][:5] if ex['start_time'] else 'TBD'}` (Max Marks: {int(ex['max_marks'])})")
        action_links.append({"label": "Open Examinations", "url": "/examinations"})

    # 6. Examination Results response
    if "get_student_results" in tool_results:
        res = tool_results["get_student_results"]
        if lines:
            lines.append("\n---\n")
        lines.append("### Published Examination Results\n")
        results_list = res.get("results", [])
        if not results_list:
            lines.append("No published examination results are available for your current term yet. Please check back after term results are announced.")
        else:
            for r in results_list:
                lines.append(f"### {r['exam_name']} ({r['academic_year']})")
                if r.get("overall_percentage"):
                    lines.append(f"**Overall Average**: **{r['overall_percentage']}%** (Grade {r.get('overall_grade', 'N/A')})")
                lines.append("| Subject | Marks | Max | Grade |")
                lines.append("|---|---|---|---|")
                for sm in r.get("subject_marks", []):
                    lines.append(f"| **{sm['subject_name']}** | {sm['marks_obtained']} | {sm['max_marks']} | **{sm['grade']}** |")
        action_links.append({"label": "View Report Cards", "url": "/marks"})

    # 7. School Calendar / Holidays response
    if "get_school_calendar" in tool_results:
        cal = tool_results["get_school_calendar"]
        if lines:
            lines.append("\n---\n")
        lines.append("### School Calendar & Holiday Information\n")
        lines.append(f"- **Target Date**: `{cal.get('date', 'Today')}`")
        if cal.get("is_working_day"):
            lines.append(f"- **Status**: Standard school working day.")
        else:
            lines.append(f"- **Status**: **School Closed** ({cal.get('reason') or cal.get('holiday_name') or 'Weekend Holiday'}).")
        if cal.get("upcoming_holidays"):
            lines.append("\n*Upcoming Academic Breaks & Holidays:*")
            for h in cal["upcoming_holidays"]:
                lines.append(f"- **{h['holiday_name']}**: `{h['start_date']}` to `{h['end_date']}` ({h.get('description') or 'School Holiday'})")

    # 8. Fees response
    if "get_student_fees" in tool_results:
        fee = tool_results["get_student_fees"]
        if lines:
            lines.append("\n---\n")
        lines.append("### Tuition Fee Schedule Summary\n")
        insts = fee.get("installments", [])
        if not insts:
            lines.append("You have no pending fee invoices assigned. Your account is in clear standing!")
        else:
            lines.append("| Installment | Due Date | Amount | Paid | Outstanding | Status |")
            lines.append("|---|---|---|---|---|---|")
            for i in insts:
                lines.append(
                    f"| Inst #{i['installment_number']} | {i['due_date']} | ₹{i['amount']:,.2f} | ₹{i['paid_amount']:,.2f} | **₹{i['outstanding']:,.2f}** | `{i['status']}` |"
                )
        lines.append("\n*Note: Fee payments and receipts are managed by parents through the portal.*")
        action_links.append({"label": "Go to Fee Details", "url": "/fees"})

    # 9. Online Classes response
    if "get_student_online_classes" in tool_results:
        oc = tool_results["get_student_online_classes"]
        if lines:
            lines.append("\n---\n")
        lines.append("### Online Classroom Sessions\n")
        cls_list = oc.get("classes", [])
        if not cls_list:
            lines.append("You have no live or upcoming online classes right now.")
        else:
            for c in cls_list:
                status_icon = "LIVE NOW" if c['status'] == "LIVE" else f"{c['scheduled_date']} at {c['start_time'][:5]}"
                lines.append(f"- **{c['title']}** with {c['teacher_name']} • {status_icon}")
        lines.append("\n*Note: Lecture recordings are not enabled on this platform.*")
        action_links.append({"label": "Join Online Classroom", "url": "/online-classroom"})

    # 10. Leaves response
    if "get_student_leaves" in tool_results:
        leaves = tool_results["get_student_leaves"]
        if lines:
            lines.append("\n---\n")
        lines.append("### Leave Applications\n")
        l_list = leaves.get("leaves", [])
        if not l_list:
            lines.append("You have not submitted any leave applications recently.")
        else:
            for lv in l_list:
                lines.append(f"- **{lv['start_date']} to {lv['end_date']}** (`{lv['status']}`): {lv['reason']}")
        action_links.append({"label": "Apply for Leave", "url": "/leaves"})

    # 11. Curriculum response
    if "get_subject_curriculum" in tool_results:
        cur = tool_results["get_subject_curriculum"]
        if lines:
            lines.append("\n---\n")
        lines.append("### Enrolled Subjects & Syllabus Curriculum\n")
        for s in cur.get("subjects", []):
            lines.append(f"### {s['subject_name']} (`{s['subject_code']}`)")
            for ch in s.get("chapters", [])[:3]:
                lines.append(f"- **Chapter {ch['chapter_number']}: {ch['title']}** ({ch['topics_count']} topics)")
        action_links.append({"label": "Explore Learning Assistant", "url": "/learning-assistant"})

    # 12. Quiz response (Release 2)
    if "generate_quiz" in tool_results:
        quiz = tool_results["generate_quiz"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"🎯 **Interactive Practice Quiz: {quiz.get('subject_name')}** ({quiz.get('difficulty')} Level)\n")
        for idx, q in enumerate(quiz.get("questions", [])):
            lines.append(f"**Q{idx + 1}. {q['question_text']}**")
            for o_idx, opt in enumerate(q.get("options", [])):
                lines.append(f"  {chr(65 + o_idx)}. {opt}")
            if q.get("hint"):
                lines.append(f"  *(Hint: {q['hint']})*")
            lines.append("")
        lines.append("*Reply with your answers or click the options to evaluate!*")

    # 13. Flashcard response (Release 2)
    if "generate_flashcards" in tool_results:
        fc = tool_results["generate_flashcards"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"🗂️ **Revision Flashcards: {fc.get('subject_name')}**\n")
        for idx, card in enumerate(fc.get("cards", [])):
            lines.append(f"### Card {idx + 1}: **{card['front']}**")
            lines.append(f"> **Key Concept**: {card['back']}")
            if card.get("hint"):
                lines.append(f"> *Memory Cue*: {card['hint']}")
            lines.append("")

    # 14. Exam Prep Plan response (Release 2)
    if "generate_exam_prep_plan" in tool_results:
        plan = tool_results["generate_exam_prep_plan"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"📅 **Exam Revision Checklist: {plan.get('exam_name')}**\n")
        lines.append(f"- **Exam Date**: `{plan.get('exam_date')}` (**{plan.get('days_remaining')} days remaining**)")
        lines.append("\n| Day | Study Focus | Suggested Time | Weightage |")
        lines.append("|---|---|---|---|")
        for item in plan.get("checklist", []):
            lines.append(f"| Day {item['day_number']} | **{item['topic_name']}** | {item['study_duration_minutes']} mins | `{item['focus_area']}` |")
        if plan.get("key_tips"):
            lines.append("\n*Top Exam Strategy Tips:*")
            for tip in plan["key_tips"][:3]:
                lines.append(f"- {tip}")
        action_links.append({"label": "View Exam Schedule", "url": "/examinations"})

    # 15. Homework guidance response (Release 2)
    if "solve_homework" in tool_results:
        hw = tool_results["solve_homework"]
        if lines:
            lines.append("\n---\n")
        lines.append(hw.get("guidance", "Here is your Socratic homework guidance."))

    # 16. Grammar evaluation response (Release 3)
    if "evaluate_grammar" in tool_results:
        gram = tool_results["evaluate_grammar"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"💬 **English Language & Grammar Feedback** (CEFR: `{gram.get('cefr_level')}`, Score: **{gram.get('overall_score')}/100**)\n")
        lines.append(f"- **Corrected Expression**: \"*{gram.get('corrected_text')}*\"")
        if gram.get("corrections"):
            lines.append("\n*Grammar Rule Explanations:*")
            for c in gram["corrections"]:
                lines.append(f"- **{c['error_phrase']}** ➔ **{c['corrected_phrase']}**: {c['rule_explanation']}")
        if gram.get("vocabulary_enhancements"):
            lines.append("\n*Vocabulary Upgrades:*")
            for v in gram["vocabulary_enhancements"]:
                lines.append(f"- Instead of *\"{v['simple']}\"*, try using **\"{v['advanced']}\"** ({v['context']})")
        lines.append(f"\n> 💡 *{gram.get('encouragement')}*")

    # 17. Debate round response (Release 3)
    if "debate_round" in tool_results:
        deb = tool_results["debate_round"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"⚖️ **AI Debate Partner: {deb.get('topic')}** (Round {deb.get('current_round')}/{deb.get('max_rounds')})\n")
        lines.append(f"**Your Stance**: `{deb.get('stance').capitalize()}`\n")
        lines.append(f"**AI Counter-Argument**:\n{deb.get('ai_counter_argument')}\n")
        lines.append(f"**Critique of your argument**: *{deb.get('student_argument_critique')}*\n")
        if deb.get("suggested_rebuttal_points"):
            lines.append("*Suggested Rebuttal Angles:*")
            for pt in deb["suggested_rebuttal_points"]:
                lines.append(f"- {pt}")
        if deb.get("is_concluded") and deb.get("rubric_scorecard"):
            sc = deb["rubric_scorecard"]
            lines.append("\n🏆 **Final Debate Rubric Scorecard**:")
            lines.append(f"- Logic & Premise: **{sc['logic_score']}/10**")
            lines.append(f"- Evidence & Application: **{sc['evidence_score']}/10**")
            lines.append(f"- Clarity & Delivery: **{sc['clarity_score']}/10**")
            lines.append(f"- **Total Score**: **{sc['total_score']}/30**")
            lines.append(f"\n*{sc['verdict_summary']}*")

    # 18. Concept Map response (Release 3)
    if "generate_concept_map" in tool_results:
        cm = tool_results["generate_concept_map"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"🗺️ **Interactive Concept Map: {cm.get('root_topic')}** ({cm.get('subject')})\n")
        lines.append(f"> *Key Takeaway*: {cm.get('key_takeaway')}\n")
        lines.append("**Key Concept Branches**:")
        for node in cm.get("nodes", []):
            if node["category"] != "root":
                lines.append(f"- **{node['label']}**: {node['definition']}")

    # 19. Class Revision Notes response (Release 3)
    if "get_class_notes" in tool_results:
        cn = tool_results["get_class_notes"]
        if lines:
            lines.append("\n---\n")
        lines.append(cn.get("summary_markdown", "Here are your class revision notes."))
        action_links.append({"label": "View Live Class Schedule", "url": "/online-classroom"})

    # 20. Morning Briefing response (Release 4)
    if "get_morning_briefing" in tool_results:
        br = tool_results["get_morning_briefing"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"### Morning Academic Briefing ({br.get('day_name')}, {br.get('date_str')})\n")
        lines.append(f"Good Morning, {br.get('student_name')}!\n")
        lines.append(f"> {br.get('inspirational_quote')}\n")
        lines.append(f"- **Classes Today**: {br.get('classes_count')} scheduled periods")
        if br.get("next_class_summary"):
            lines.append(f"- **First Lecture**: {br.get('next_class_summary')}")
        if br.get("nearest_exam_name"):
            lines.append(f"- **Next Examination**: `{br.get('nearest_exam_name')}`")
        if br.get("pending_fee_balance", 0) > 0:
            lines.append(f"- **Account Notice**: Pending fee balance of ${br.get('pending_fee_balance'):.2f}")
        if br.get("calendar_notice"):
            lines.append(f"- **Calendar Alert**: {br.get('calendar_notice')}")
        lines.append(f"\n*Academic Focus*: {br.get('proactive_recommendation')}")
        action_links.append({"label": "View Full Timetable", "url": "/timetable"})

    # 21. Daily Knowledge Challenge response (Release 4)
    if "get_daily_challenge" in tool_results:
        dc = tool_results["get_daily_challenge"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"### Daily Knowledge Challenge ({dc.get('subject')} – {dc.get('topic')})\n")
        lines.append(f"**Question**: {dc.get('question_text')}\n")
        for idx, opt in enumerate(dc.get("options", [])):
            lines.append(f"{chr(65 + idx)}. {opt}")
        lines.append(f"\n*(Hint: {dc.get('hint')})*")
        lines.append("\n*Answer in chat or open the Daily Challenge banner to continue your daily streak.*")

    # 22. Career Discovery response (Release 4)
    if "discover_careers" in tool_results:
        cd = tool_results["discover_careers"]
        if lines:
            lines.append("\n---\n")
        lines.append(f"### Career Discovery & Pathways ({cd.get('student_grade')})\n")
        lines.append(f"> {cd.get('advice')}\n")
        for p in cd.get("career_pathways", []):
            lines.append(f"### {p['title']} ({p['match_score']}% Match)")
            lines.append(f"{p['description']}")
            lines.append(f"- **Key High School Subjects**: {', '.join(p['primary_subjects'])}")
            lines.append(f"- **Recommended University Majors**: {', '.join(p['university_degrees'])}")
            lines.append(f"- **Core Industry Skills**: {', '.join(p['key_skills'])}")
            lines.append("")

    # 23. School Knowledge Base / RAG response
    if "search_school_knowledge" in tool_results:
        sk = tool_results["search_school_knowledge"]
        docs = sk.get("documents", [])
        if docs:
            if lines:
                lines.append("\n---\n")
            lines.append("### Official School Information & Guidelines\n")
            for doc in docs:
                lines.append(f"### {doc['document_title']}")
                lines.append(f"> Category: `{doc.get('category', 'GENERAL')}`")
                lines.append(doc["chunk_content"])
                lines.append("")
            action_links.append({"label": "View School Calendar", "url": "/calendar"})

    # Educational or General question default
    if not lines:
        lines.append(
            f"Hello {student.first_name}. I am your AI Student Assistant.\n\n"
            "I can assist you with:\n"
            "- **Daily and weekly class timetables**\n"
            "- **Attendance summaries and records**\n"
            "- **Upcoming examinations and published marks**\n"
            "- **School calendar and holiday schedule**\n"
            "- **Online classroom sessions**\n"
            "- **Subject curriculum and concept explanations**\n\n"
            "Try asking: *\"What is my next class?\"*, *\"What is my attendance rate?\"*, or *\"Explain Newton's third law.\"*"
        )
        action_links.append({"label": "View Timetable", "url": "/timetable"})

    return "\n".join(lines), action_links


# ---------------------------------------------------------------------------
# Main Chat Orchestrator (Gemini LLM with Fallback)
# ---------------------------------------------------------------------------

def process_assistant_chat(
    student: Student,
    message: str,
    conversation_id: uuid.UUID | None,
    db: Session,
) -> dict[str, Any]:
    """Processes student query using intelligent tool execution and resilient LLM delivery."""
    # 1. Resolve or create conversation session
    if conversation_id:
        conv = db.execute(
            select(AIStudentConversation).where(
                AIStudentConversation.id == conversation_id,
                AIStudentConversation.student_id == student.id,
            )
        ).scalar_one_or_none()
    else:
        conv = None

    if not conv:
        # Generate initial title from first query
        words = message.strip().split()
        title = " ".join(words[:5]) if words else "New Conversation"
        if len(title) > 40:
            title = title[:40] + "..."
        conv = create_conversation(student.id, title=title, db=db)

    # 2. Record student message turn
    student_msg = AIStudentMessage(
        conversation_id=conv.id,
        sender=MessageSender.STUDENT.value,
        content=message.strip(),
    )
    db.add(student_msg)
    db.commit()

    # 3. Classify intent and execute relevant tools
    required_tools = classify_query_intent(message)
    tool_results: dict[str, Any] = {}

    # Always fetch profile for context
    profile_data = ai_assistant_tools.tool_get_student_profile(student, db)
    tool_results["profile"] = profile_data

    # Parse potential target date (e.g. tomorrow)
    target_date_str = None
    if "tomorrow" in message.lower():
        target_date_str = (dt.date.today() + dt.timedelta(days=1)).isoformat()

    for t_name in required_tools:
        args = {}
        if target_date_str:
            args["target_date"] = target_date_str
        if t_name == "evaluate_grammar":
            # Extract sentence if prefixed by prompt text
            clean_eval = message
            for pfx in ("check my english grammar and sentence:", "check my english grammar:", "correct this sentence:"):
                if pfx in message.lower():
                    clean_eval = message[message.lower().find(pfx) + len(pfx) :].strip()
                    break
            args["text"] = clean_eval
        elif t_name == "debate_round":
            args["student_argument"] = message
            args["topic"] = "Renewable Energy vs Fossil Fuels" if "energy" in message.lower() else "Artificial Intelligence in Education"
            args["stance"] = "negative" if "negative" in message.lower() else "affirmative"
            args["current_round"] = 1
        elif t_name == "generate_concept_map":
            subj_top = "Photosynthesis"
            if "newton" in message.lower():
                subj_top = "Newton's Laws of Motion"
            elif "cell" in message.lower():
                subj_top = "Cellular Respiration"
            args["topic"] = subj_top
        elif t_name == "get_class_notes":
            args["subject_name"] = "Mathematics"
        elif t_name == "search_school_knowledge":
            args["query"] = message
        tool_results[t_name] = ai_assistant_tools.execute_tool(t_name, args, student, db)

    # 4. Generate deterministic fallback response
    deterministic_content, action_links = synthesize_fallback_response(message, student, tool_results)

    final_content = deterministic_content

    # 5. Enhance via Hugging Face LLM (Qwen/Qwen2.5-7B-Instruct or configured model)
    if hf_provider.is_configured():
        try:
            student_info = f"{student.first_name} {student.last_name} (Class: {student.class_name or 'High School'} {student.section or ''})"
            system_prompt = f"""You are the official AI Student Assistant for {student_info} at St. Joseph Academy.
Today's Date: {dt.date.today().isoformat()} ({dt.date.today().strftime('%A')}).
Your mission is to be an encouraging, academically empowering, factual, and supportive digital school copilot.

VERIFIED SCHOOL DATABASE & OFFICIAL KNOWLEDGE RETRIEVED:
The following authoritative school data was retrieved from the database for this authenticated student:
{json.dumps(tool_results, indent=2, default=str)}

OPERATIONAL RULES:
1. Grounding: Answer strictly using the verified school data and official guidelines above. Never fabricate attendance rates, examination marks, fee balances, or timetable periods.
2. If data shows no upcoming exams, zero fee dues, or a holiday, state that clearly and accurately.
3. Tone: Warm, respectful, student-friendly, and educational. Format with clear Markdown headings, bullet points, and tables.
4. Academics: When explaining science, math, or study concepts, provide clear step-by-step guidance with KaTeX LaTeX math ($...$) where helpful.
5. School Policies: Accurately cite official guidelines (such as the 75% attendance rule, 14-day library loan, grading scale) from the retrieved knowledge.
6. Scope: Note that online homework submissions and class recordings are currently disabled in this school portal.
"""
            messages = [{"role": "system", "content": system_prompt}]
            # Include recent turns for conversational continuity
            recent_turns = conv.messages[-4:]
            for m in recent_turns:
                role = "user" if m.sender == MessageSender.STUDENT.value else "assistant"
                messages.append({"role": role, "content": m.content})
            messages.append({"role": "user", "content": message})

            hf_result = hf_provider.chat_completion(
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
            )
            if hf_result:
                final_content = hf_result.strip()
        except Exception as exc:
            logger.info("Hugging Face LLM completion skipped or failed (%s); using verified deterministic response.", exc)

    # 6. Record assistant message turn
    asst_msg = AIStudentMessage(
        conversation_id=conv.id,
        sender=MessageSender.ASSISTANT.value,
        content=final_content,
        tools_used=required_tools,
        action_links=action_links,
    )
    db.add(asst_msg)

    # Update conversation last modified timestamp
    conv.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(asst_msg)

    return {
        "conversation_id": conv.id,
        "message_id": asst_msg.id,
        "content": asst_msg.content,
        "tools_used": required_tools,
        "action_links": action_links,
        "created_at": asst_msg.created_at,
    }
