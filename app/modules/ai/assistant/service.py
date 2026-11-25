import datetime as dt
import json
import logging
import os
import re
import uuid
from typing import Any, AsyncGenerator

from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload

from app.modules.ai.assistant.models import AIStudentConversation, AIStudentMessage, MessageSender
from app.modules.students.models import Student
from app.modules.ai.assistant import tools as ai_assistant_tools
from app.modules.ai.assistant.hf_provider import hf_provider

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
    conversations = db.execute(
        select(AIStudentConversation)
        .options(selectinload(AIStudentConversation.messages))
        .where(AIStudentConversation.student_id == student_id)
        .order_by(AIStudentConversation.updated_at.desc())
    ).scalars().all()

    results = []
    for conversation in conversations:
        # Sort in-memory from preloaded relationship
        sorted_messages = sorted(conversation.messages, key=lambda msg: msg.created_at, reverse=True)
        last_message = sorted_messages[0] if sorted_messages else None

        results.append({
            "id": conversation.id,
            "title": conversation.title,
            "last_message_preview": (last_message.content[:80] + "...") if last_message else None,
            "message_count": len(conversation.messages),
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
        })
    return results


def get_conversation_detail(student_id: uuid.UUID, conversation_id: uuid.UUID, db: Session) -> dict[str, Any] | None:
    conversation = db.execute(
        select(AIStudentConversation)
        .options(selectinload(AIStudentConversation.messages))
        .where(
            AIStudentConversation.id == conversation_id,
            AIStudentConversation.student_id == student_id,
        )
    ).scalar_one_or_none()

    if not conversation:
        return None

    messages_data = []
    for message in conversation.messages:
        messages_data.append({
            "id": message.id,
            "sender": message.sender,
            "content": message.content,
            "tools_used": message.tools_used or [],
            "action_links": message.action_links or [],
            "created_at": message.created_at,
        })

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
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

    import re

    def has_any_word(pattern_list: tuple[str, ...]) -> bool:
        for p in pattern_list:
            if " " in p:
                if p in text:
                    return True
            else:
                if re.search(r'\b' + re.escape(p) + r'\b', text):
                    return True
        return False

    # Combined preparation check (Tomorrow's schedule preparation)
    if ("what" in text and "tomorrow" in text and "do" in text) or text.strip() == "prepare for tomorrow":
        return ["get_student_timetable", "get_student_examinations", "get_school_calendar"]

    if has_any_word(("timetable", "class today", "classes today", "schedule", "period", "next class", "first lecture", "who teaches")):
        tools.append("get_student_timetable")

    if has_any_word(("attendance", "absent", "present", "attendance rate", "working days")):
        tools.append("get_student_attendance")

    if has_any_word(("exam", "exams", "examination", "examinations", "midterm", "upcoming test")):
        tools.append("get_student_examinations")

    if has_any_word(("mark", "marks", "score", "scores", "grade", "grades", "result", "results", "report card")):
        tools.append("get_student_results")

    if has_any_word(("holiday", "holidays", "vacation", "calendar", "sunday", "working day")):
        tools.append("get_school_calendar")

    if has_any_word(("fee", "fees", "invoice", "payment", "due amount", "balance")):
        tools.append("get_student_fees")

    if has_any_word(("online class", "online lecture", "live class", "meeting", "recorded")):
        tools.append("get_student_online_classes")

    if has_any_word(("leave", "leaves", "sick leave", "leave application")):
        tools.append("get_student_leaves")

    if has_any_word(("syllabus", "chapters", "curriculum")):
        tools.append("get_subject_curriculum")

    if has_any_word(("rule", "rules", "policy", "policies", "handbook", "guideline", "guidelines", "uniform", "fine", "cut-off", "cutoff", "passing mark", "grading system", "library", "dress code", "conduct", "late fee")):
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

    # Educational or General question fallback
    if not lines:
        edu_content, edu_links = synthesize_educational_response(message, student)
        return edu_content, edu_links

    return "\n".join(lines), action_links


def synthesize_educational_response(
    message: str,
    student: Student,
) -> tuple[str, list[dict[str, str]]]:
    """Synthesizes rich, structured educational responses for general AI questions
    (science, mathematics, programming, writing, creative tasks, and conversation)
    when offline or operating without an active Hugging Face API key.
    """
    text = message.lower().strip()
    action_links: list[dict[str, str]] = []

    # 1. Artificial Intelligence / Machine Learning
    if any(k in text for k in ("artificial intelligence", "what is ai", "machine learning", "deep learning", "neural network", "how ai works")):
        content = f"""### Artificial Intelligence & Machine Learning

**Artificial Intelligence (AI)** is the branch of computer science dedicated to building systems capable of performing tasks that typically require human cognition, such as reasoning, problem-solving, understanding natural language, and visual perception.

#### 1. Core Branches of AI
- **Machine Learning (ML)**: Algorithms that identify statistical patterns from data rather than following rigidly programmed rules.
- **Deep Learning**: A subset of ML utilizing multi-layered artificial neural networks inspired by biological neural architectures.
- **Natural Language Processing (NLP)**: Enables computers to read, comprehend, synthesize, and generate human languages (e.g., modern Large Language Models).

#### 2. How Modern AI Learns
1. **Training Phase**: Models process vast datasets, iteratively adjusting numerical parameters (weights) to minimize error via gradient descent.
2. **Inference Phase**: Once trained, the model predicts outputs or generates text in response to new, unseen prompts.

> **Key Takeaway**: AI systems do not "think" with consciousness—they perform high-dimensional probabilistic pattern matching and mathematical optimization."""
        action_links.append({"label": "Explore Computer Science Syllabus", "url": "/curriculum"})
        return content, action_links

    # 2. Photosynthesis & Biology
    if any(k in text for k in ("photosynthesis", "how plants make food", "calvin cycle", "chloroplast", "chlorophyll")):
        content = r"""### Photosynthesis: The Engine of Terrestrial Life

**Photosynthesis** is the biochemical process by which photoautotrophic organisms (green plants, algae, and cyanobacteria) convert radiant light energy into chemical energy stored in carbohydrates.

#### The Balanced Chemical Equation:
$$6\text{CO}_2 + 6\text{H}_2\text{O} + \text{photons} \xrightarrow{\text{chlorophyll}} \text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2$$

#### The Two Main Stages:
1. **Light-Dependent Reactions (Thylakoid Membrane)**:
   - Sunlight photons excite electrons in chlorophyll within Photosystem II and I.
   - Water molecules are split via photolysis:
     $$2\text{H}_2\text{O} \rightarrow 4\text{H}^+ + 4e^- + \text{O}_2 \uparrow$$
   - Generates high-energy currency molecules: **ATP** (adenosine triphosphate) and **NADPH**.
2. **Light-Independent Reactions / The Calvin Cycle (Stroma)**:
   - Atmospheric $\text{CO}_2$ is fixed by the enzyme **RuBisCO** into 3-phosphoglycerate.
   - ATP and NADPH reduce these intermediates to produce **G3P**, which combines to form glucose ($\text{C}_6\text{H}_{12}\text{O}_6$).

#### Ecological Importance:
- Produces molecular oxygen required for aerobic cellular respiration.
- Acts as the primary global carbon sink regulating atmospheric temperatures."""
        action_links.append({"label": "Review Biology Curriculum", "url": "/curriculum"})
        return content, action_links

    # 3. Newton's Laws of Motion & Physics
    if any(k in text for k in ("newton", "laws of motion", "first law", "second law", "third law", "inertia")):
        content = r"""### Sir Isaac Newton's Three Laws of Motion

Newton's laws of motion form the classical bedrock of Newtonian mechanics, describing the relationship between the forces acting on a body and its motion through space.

#### 1. First Law of Motion (Law of Inertia)
> *An object at rest stays at rest, and an object in uniform motion remains in motion along a straight path unless acted upon by a net external force.*
- **Mathematical Form**: If $\sum \vec{F} = 0$, then $\frac{d\vec{v}}{dt} = 0$.
- **Real-World Example**: A passenger lunges forward when a bus suddenly brakes because their body tends to maintain its state of velocity.

#### 2. Second Law of Motion (Force and Acceleration)
> *The rate of change of momentum of a body is directly proportional to the applied resultant force and occurs in the direction of the force.*
- **Mathematical Form**:
  $$\vec{F}_{\text{net}} = m \vec{a} = \frac{d\vec{p}}{dt}$$
- **Key Insight**: Doubling the net force on an object doubles its acceleration; doubling its mass halves its acceleration.

#### 3. Third Law of Motion (Action and Reaction)
> *For every action force exerted on a body, there is an equal and opposite reaction force exerted on the other body.*
- **Mathematical Form**: $\vec{F}_{AB} = -\vec{F}_{BA}$.
- **Real-World Example**: A rocket propulsion engine expels combustion exhaust gases downward at high velocity; the reacting gas thrust forces the rocket upward into orbit."""
        action_links.append({"label": "Practice Physics Problems", "url": "/learning-assistant"})
        return content, action_links

    # 4. Internet & Networking
    if any(k in text for k in ("how the internet works", "how internet works", "networking", "dns", "http", "tcp/ip", "packet")):
        content = r"""### How the Global Internet Works: A Step-by-Step Overview

The **Internet** is a decentralized global network of interconnected computers communicating via standardized communication protocols (**TCP/IP**).

#### What Happens When You Navigate to a Website:
1. **Domain Name System (DNS) Resolution**:
   - Computers route numerical IP addresses (e.g. `192.0.2.1` or `2606:4700::6810`).
   - Your browser queries a DNS resolver to resolve a domain name into an IP address.
2. **TCP Three-Way Handshake**:
   - Client and server establish a reliable virtual connection: `SYN` $\rightarrow$ `SYN-ACK` $\rightarrow$ `ACK`.
   - TLS/SSL handshake negotiates cryptographic symmetric encryption keys for HTTPS security.
3. **HTTP/HTTPS Request & Response**:
   - The browser issues a `GET / HTTP/2` request with headers.
   - The server processes the request and responds with status codes (e.g. `200 OK`) and payloads (HTML, CSS, JavaScript).
4. **Packet Switching Across Physical Infrastructure**:
   - Data is sliced into discrete binary packets (typically $\le 1500$ bytes MTU) and routed over fiber-optic cables using the **BGP** protocol.
5. **Browser Rendering Engine**:
   - The browser parses HTML into the Document Object Model (DOM), parses CSS into CSSOM, calculates layout reflow, and paints pixels onto your display."""
        action_links.append({"label": "Computer Science Concepts", "url": "/curriculum"})
        return content, action_links

    # 5. Frontend vs Backend Development
    if any(k in text for k in ("frontend and backend", "difference between frontend", "frontend vs backend", "client and server", "full stack")):
        content = r"""### Frontend vs. Backend Development: Architecture & Differences

In software engineering, web applications are cleanly divided into client-facing (presentation) and server-facing (data and computation) layers.

| Dimension | **Frontend (Client-Side)** | **Backend (Server-Side)** |
| :--- | :--- | :--- |
| **Execution Environment** | Runs inside the user's web browser or mobile client. | Runs on dedicated cloud servers or containerized nodes. |
| **Primary Objective** | User experience, visual layout, responsive interactions, and state. | Business logic, authentication, data persistence, and security. |
| **Core Languages** | HTML5, CSS3, JavaScript, TypeScript. | Python, TypeScript/Node.js, Go, Rust, Java. |
| **Common Frameworks** | React, Next.js, Vue, Angular, Material-UI, Tailwind. | FastAPI, Django, Express, NestJS, Spring Boot. |
| **Database Access** | **Never directly access DB** (security boundary violation). | Interacts directly with PostgreSQL, Redis, MongoDB via ORMs. |
| **Security Concerns** | XSS (Cross-Site Scripting), CSRF, input validation. | SQL Injection, broken access control, authentication, data leakage. |

#### How They Communicate:
The frontend issues asynchronous requests (via `fetch` or `Axios`) to backend REST or GraphQL API endpoints, exchanging structured JSON data securely authenticated with JWT tokens."""
        return content, action_links

    # 6. Object-Oriented Programming (OOP)
    if any(k in text for k in ("object-oriented", "oop", "inheritance", "polymorphism", "encapsulation", "abstraction", "classes and objects")):
        content = r"""### Object-Oriented Programming (OOP): The Four Pillars

**Object-Oriented Programming (OOP)** is a programming paradigm that organizes software design around data, or **objects**, rather than functions and logic.

#### The 4 Core Principles:
1. **Encapsulation**:
   - Bundling state (attributes) and behavior (methods) into a class while restricting direct outside access.
2. **Abstraction**:
   - Hiding complex background implementation details and exposing only an intuitive, clean interface to consumers.
3. **Inheritance**:
   - Mechanism where a child class derives attributes and methods from an existing parent class, eliminating duplicated code.
4. **Polymorphism**:
   - The ability for different classes to respond to the same method invocation in their own unique way."""
        return content, action_links

    # 7. Active vs Passive Voice
    if any(k in text for k in ("active and passive", "active voice", "passive voice", "grammar", "voice in english")):
        content = r"""### Active vs. Passive Voice in English Grammar

Understanding voice helps you write clearer, more persuasive, and academically rigorous essays.

#### 1. Active Voice
The grammatical subject of the sentence **performs** the action denoted by the verb.
- **Formula**: $\text{Subject} + \text{Action Verb} + \text{Object}$
- **Example 1**: *The student wrote an insightful history essay.*
- **Example 2**: *Newton discovered the law of universal gravitation.*
- **Best For**: Direct, energetic, clear writing where the actor is important.

#### 2. Passive Voice
The grammatical subject of the sentence **receives** the action. The doer is placed after the verb or omitted.
- **Formula**: $\text{Target Object} + [\text{to be} + \text{Past Participle}] + (\text{by } \text{Subject})$
- **Example 1**: *An insightful history essay was written by the student.*
- **Example 2**: *The experiment was conducted under controlled laboratory conditions.*
- **Best For**: Scientific reports where the objective process matters more than who performed it."""
        return content, action_links

    # 8. Writing Assistance (Email / Presentation / Essay)
    if any(k in text for k in ("write an email", "help me write", "draft an email", "prepare a presentation", "write an essay", "write a short story", "speech")):
        content = f"""### Academic Writing & Communication Assistant

Here is a clear, professional template tailored for student communication and presentation structuring:

#### Professional Email Draft to a Teacher or School Official:
```text
Subject: Query Regarding [Subject Name] Class Assignment / Curriculum — {student.first_name} {student.last_name}

Dear [Teacher Name or Title],

I hope you are having a productive week.

I am writing to respectfully request clarification on [specific topic/assignment] discussed during our [Period / Date] class. Specifically, I am working through [mention concept or question] and wanted to ensure I am approaching the solution correctly.

Could you please advise if you have a few minutes during your office hours or after class tomorrow for a brief check-in?

Thank you for your time, guidance, and support.

Sincerely,
{student.first_name} {student.last_name}
Grade: {student.class_name or 'Student'} | Section: {student.section or ''}
```

#### Best Practices for Academic Writing:
- **Clarity over Complexity**: State your thesis statement or central message in the first paragraph.
- **Evidence-Based Arguments**: Support every claim with verified historical, scientific, or mathematical evidence.
- **Proofreading**: Check for run-on sentences and maintain consistent verb tense throughout."""
        return content, action_links

    # 9. General Mathematics / Algebra / Problem Solving
    if any(k in text for k in ("solve", "equation", "math", "algebra", "formula", "step by step", "calculate")):
        content = r"""### Mathematics & Problem-Solving Step-by-Step

When approaching mathematical equations and word problems, follow this systematic framework:

#### 1. Formulate the Knowns and Unknowns
Identify the given variables and define what you are asked to determine.
- *Example Equation*: $3x + 12 = 33$
- *Goal*: Isolate the independent variable $x$.

#### 2. Step-by-Step Algebraic Solution
1. **Subtract 12 from both sides** to isolate the variable term:
   $$3x + 12 - 12 = 33 - 12$$
   $$3x = 21$$
2. **Divide both sides by the coefficient 3**:
   $$\frac{3x}{3} = \frac{21}{3}$$
   $$x = 7$$

#### 3. Verification & Proof
Substitute $x = 7$ back into the original equation:
$$3(7) + 12 = 21 + 12 = 33 \quad \checkmark \text{ (Verified True)}$$

> *Tip: Always state the units of measurement (e.g. meters, seconds, kilograms) with your final answer when solving applied word problems.*"""
        action_links.append({"label": "Explore Mathematics Syllabus", "url": "/curriculum"})
        return content, action_links

    # 10. School Project Ideas / Science Fair
    if any(k in text for k in ("project ideas", "school project", "science fair", "experiment ideas")):
        content = r"""### Innovative School Project & Science Fair Ideas

Here are three high-impact, curriculum-aligned project concepts:

#### 1. Sustainable Energy: Solar Desalination Still
- **Concept**: Construct a small passive solar distillation unit using acrylic panes and black absorptive lining to purify brackish water.
- **Scientific Principle**: Phase transitions (evaporation $\rightarrow$ condensation) driven by solar thermal absorption.
- **Key Metric**: Liters of potable water produced per square meter of daily solar irradiance.

#### 2. Data Science & Machine Learning: Campus Microclimate Predictor
- **Concept**: Deploy a low-cost temperature/humidity sensor and train a simple regression model to predict classroom temperatures and optimize ventilation.
- **Scientific Principle**: Time-series statistical analysis, correlation coefficients, and sensor calibration.

#### 3. Environmental Biology: Microplastics in Urban Runoff
- **Concept**: Collect local runoff water samples and quantify microplastic concentration using density separation (saltwater buoyancy) and optical microscopy.
- **Scientific Principle**: Density gradients, particulate filtration, and environmental impact assessment."""
        return content, action_links

    # 11. Conversational Greetings / General Introduction
    if any(k == text or k in text for k in ("hello", "hi", "hey", "good morning", "good afternoon", "who are you", "what can you do")):
        content = f"""### Hello {student.first_name}! How can I help you today?

I am your **AI Student Assistant**, powered by conversational AI and directly integrated with your school records.

#### What you can ask me:
- **General AI & Learning**: Ask me to explain concepts in science, physics, mathematics, history, or literature (*"Explain how electricity flows"*, *"Teach me quadratic equations"*).
- **Writing & Problem-Solving**: Get step-by-step homework guidance, email drafting, speech preparation, or essay outlines.
- **Your School Records**: Instant access to your personal schedule, attendance percentage, upcoming exams, fee dues, and syllabus (*"What is my timetable tomorrow?"*, *"What is my attendance rate?"*).
- **School Rules & Guidelines**: Check handbook policies, grading scales, and library rules.

Feel free to ask any question or describe what you are currently studying!"""
        action_links.append({"label": "View My Timetable", "url": "/timetable"})
        action_links.append({"label": "Open Study Plan", "url": "/learning-assistant"})
        return content, action_links

    # 12. Universal Fallback
    content = f"""### Educational Assistant Analysis

Thank you for your question, **{student.first_name}**.

To provide the most thorough and accurate assistance, here is an initial structured breakdown:

1. **Core Concept Overview**:
   - The topic you mentioned involves exploring fundamental principles and practical applications in your coursework.
2. **Recommended Next Steps**:
   - Break down the question into its primary components.
   - For curriculum-related study, check your subject syllabus or review your textbook chapters.
   - You can also ask follow-up questions such as: *"Give me an example"*, *"Explain step-by-step"*, or *"How does this apply in real life?"*

Please feel free to provide more details or ask a follow-up question!"""
    return content, action_links


# ---------------------------------------------------------------------------
# Main Chat Orchestrator (Autonomous Agentic Dual-Intelligence Loop)
# ---------------------------------------------------------------------------

def process_assistant_chat(
    student: Student,
    message: str,
    conversation_id: uuid.UUID | None,
    db: Session,
) -> dict[str, Any]:
    """Processes student query using autonomous tool calling and general-purpose LLM reasoning."""
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

    # 3. Assemble sliding conversation history (last 10 messages)
    history_records = db.execute(
        select(AIStudentMessage)
        .where(AIStudentMessage.conversation_id == conv.id)
        .order_by(AIStudentMessage.created_at.asc())
    ).scalars().all()

    recent_turns = history_records[-10:] if len(history_records) > 10 else history_records
    conversation_messages: list[dict[str, str]] = []
    for m in recent_turns:
        role = "user" if m.sender == MessageSender.STUDENT.value else "assistant"
        conversation_messages.append({"role": role, "content": m.content})

    student_info = f"{student.first_name} {student.last_name} (Class: {student.class_name or 'High School'} {student.section or ''})"
    system_prompt = f"""You are the official AI Student Assistant for {student_info} at St. Joseph Academy.
Today's Date: {dt.date.today().isoformat()} ({dt.date.today().strftime('%A')}).

MISSION & CAPABILITIES:
You are a real, general-purpose educational AI assistant similar to ChatGPT, seamlessly integrated with the school's student management system.
You help students with:
1. General knowledge, science, mathematics, literature, programming, and educational concepts.
2. Writing assistance, brainstorming, study techniques, problem-solving, and creative exploration.
3. Accessing their personal school records (timetables, attendance, grades, fee dues, exam dates, syllabus) by calling the available school tools.

TOOL USAGE GUIDELINES:
- When a student asks about their personal school schedule, timetable, attendance percentage, exam dates, fee dues, school holidays, or handbook policies, call the corresponding tool.
- For general knowledge questions (e.g. "What is AI?", "Explain photosynthesis", "Help me write an essay", "Solve 3x + 5 = 20"), answer directly with high academic rigor, structured formatting, and step-by-step clarity WITHOUT calling tools.
- When tool results are provided, synthesize a natural, encouraging, and complete response that answers the student's question accurately.
- Never invent or hallucinate student records. Always ground personal school data in the returned tool outputs.
- Format all mathematical equations with KaTeX ($...$ for inline, $$...$$ for block math). Use clear Markdown headings and bullet points.
"""

    messages_payload: list[dict[str, str]] = [{"role": "system", "content": system_prompt}] + conversation_messages
    intent_tools = classify_query_intent(message)
    tools_used: list[str] = list(intent_tools)
    action_links: list[dict[str, str]] = []
    final_content: str | None = None

    # Pre-fetch school data if intent indicates school-specific query
    prefetched_tool_results: dict[str, Any] = {}
    if intent_tools:
        prefetched_tool_results["profile"] = ai_assistant_tools.tool_get_student_profile(student, db)
        target_date_str = (dt.date.today() + dt.timedelta(days=1)).isoformat() if "tomorrow" in message.lower() else None

        for t_name in intent_tools:
            args = {}
            if target_date_str:
                args["target_date"] = target_date_str
            if t_name == "evaluate_grammar":
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
            prefetched_tool_results[t_name] = ai_assistant_tools.execute_tool(t_name, args, student, db)

        messages_payload.append({
            "role": "system",
            "content": f"VERIFIED SCHOOL DATABASE & OFFICIAL KNOWLEDGE RETRIEVED:\n{json.dumps(prefetched_tool_results, indent=2, default=str)}"
        })

    # 4. Attempt autonomous agentic execution via Hugging Face
    if hf_provider.is_configured():
        try:
            turn_result = hf_provider.chat_completion_with_tools(
                messages=messages_payload,
                tools=ai_assistant_tools.SCHOOL_TOOL_DEFINITIONS,
                max_tokens=1500,
                temperature=0.7,
            )

            # Check if LLM requested one or more tool calls
            tool_calls = turn_result.get("tool_calls", [])
            if tool_calls:
                for tc in tool_calls:
                    t_name = tc.get("name")
                    t_args = tc.get("arguments", {})
                    if t_name not in tools_used:
                        tools_used.append(t_name)
                    tool_output = ai_assistant_tools.execute_tool(t_name, t_args, student, db)
                    messages_payload.append({
                        "role": "tool",
                        "name": t_name,
                        "content": json.dumps(tool_output, default=str),
                    })

                synth_result = hf_provider.chat_completion(
                    messages=messages_payload,
                    max_tokens=1500,
                    temperature=0.7,
                )
                if synth_result:
                    final_content = synth_result.strip()
            elif turn_result.get("content"):
                final_content = turn_result["content"].strip()
        except Exception as exc:
            logger.warning("Hugging Face autonomous completion error (%s); falling back to verified offline synthesizer.", exc)

    # 5. Offline Resilient Fallback Engine
    if not final_content:
        if intent_tools:
            deterministic_content, action_links = synthesize_fallback_response(message, student, prefetched_tool_results)
            final_content = deterministic_content
        else:
            edu_content, action_links = synthesize_educational_response(message, student)
            final_content = edu_content

    # 6. Record assistant message turn
    asst_msg = AIStudentMessage(
        conversation_id=conv.id,
        sender=MessageSender.ASSISTANT.value,
        content=final_content,
        tools_used=tools_used,
        action_links=action_links,
    )
    db.add(asst_msg)
    conv.updated_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(asst_msg)

    return {
        "conversation_id": conv.id,
        "message_id": asst_msg.id,
        "content": asst_msg.content,
        "tools_used": tools_used,
        "action_links": action_links,
        "created_at": asst_msg.created_at,
    }


async def stream_assistant_chat(
    student: Student,
    message: str,
    conversation_id: uuid.UUID | None,
    db: Session,
) -> AsyncGenerator[str, None]:
    """Asynchronous true SSE token streaming generator for the AI Student Assistant."""
    import asyncio

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

    # Yield initial session metadata
    yield f"event: metadata\ndata: {json.dumps({'conversation_id': str(conv.id), 'message_id': str(student_msg.id)})}\n\n"

    # 3. Assemble history and prompt
    history_records = db.execute(
        select(AIStudentMessage)
        .where(AIStudentMessage.conversation_id == conv.id)
        .order_by(AIStudentMessage.created_at.asc())
    ).scalars().all()

    recent_turns = history_records[-10:] if len(history_records) > 10 else history_records
    conversation_messages: list[dict[str, str]] = []
    for m in recent_turns:
        role = "user" if m.sender == MessageSender.STUDENT.value else "assistant"
        conversation_messages.append({"role": role, "content": m.content})

    student_info = f"{student.first_name} {student.last_name} (Class: {student.class_name or 'High School'} {student.section or ''})"
    system_prompt = f"""You are the official AI Student Assistant for {student_info} at St. Joseph Academy.
Today's Date: {dt.date.today().isoformat()} ({dt.date.today().strftime('%A')}).

MISSION:
You are a real, general-purpose educational AI assistant similar to ChatGPT, deeply connected to the school's student management system.
You answer general knowledge, educational, writing, programming, and mathematical questions directly and comprehensively.
When personal school data is requested (timetable, attendance, exams, fees, calendar), you call the appropriate tool.
Format equations with KaTeX ($...$).
"""

    messages_payload: list[dict[str, str]] = [{"role": "system", "content": system_prompt}] + conversation_messages
    tools_used: list[str] = []
    action_links: list[dict[str, str]] = []
    collected_tokens: list[str] = []

    if hf_provider.is_configured():
        try:
            # Check for tool call
            turn_result = hf_provider.chat_completion_with_tools(
                messages=messages_payload,
                tools=ai_assistant_tools.SCHOOL_TOOL_DEFINITIONS,
                max_tokens=1500,
                temperature=0.7,
            )
            tool_calls = turn_result.get("tool_calls", [])
            if tool_calls:
                for tc in tool_calls:
                    t_name = tc.get("name")
                    t_args = tc.get("arguments", {})
                    tools_used.append(t_name)
                    yield f"event: tool_start\ndata: {json.dumps({'tool': t_name})}\n\n"
                    tool_output = ai_assistant_tools.execute_tool(t_name, t_args, student, db)
                    messages_payload.append({
                        "role": "tool",
                        "name": t_name,
                        "content": json.dumps(tool_output, default=str),
                    })

            # Stream response tokens
            for token_chunk in hf_provider.stream_chat_completion(messages_payload, max_tokens=1500, temperature=0.7):
                collected_tokens.append(token_chunk)
                yield f"event: token\ndata: {json.dumps({'text': token_chunk})}\n\n"
                await asyncio.sleep(0.005)
        except Exception as exc:
            logger.warning("Hugging Face streaming error: %s. Falling back to offline engine.", exc)

    # If stream produced no tokens (e.g. offline or unconfigured)
    if not collected_tokens:
        result = process_assistant_chat(student, message, conv.id, db)
        content = result["content"]
        tools_used = result["tools_used"]
        action_links = result["action_links"]
        # Yield words in quick succession for responsive UI
        words = content.split(" ")
        for i, w in enumerate(words):
            suffix = " " if i < len(words) - 1 else ""
            yield f"event: token\ndata: {json.dumps({'text': w + suffix})}\n\n"
            await asyncio.sleep(0.01)
        asst_msg_id = str(result["message_id"])
    else:
        full_content = "".join(collected_tokens).strip()
        asst_msg = AIStudentMessage(
            conversation_id=conv.id,
            sender=MessageSender.ASSISTANT.value,
            content=full_content,
            tools_used=tools_used,
            action_links=action_links,
        )
        db.add(asst_msg)
        conv.updated_at = dt.datetime.now(dt.timezone.utc)
        db.commit()
        db.refresh(asst_msg)
        asst_msg_id = str(asst_msg.id)

    # Done event
    yield f"event: done\ndata: {json.dumps({'message_id': asst_msg_id, 'action_links': action_links, 'tools_used': tools_used})}\n\n"
