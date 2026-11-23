import datetime as dt
import logging
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.academic import AttendanceRecord
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.ai_learning import SubjectChapter, ChapterTopic
from app.models.classroom import Subject
from app.models.examination import StudentExamMark, ExaminationSchedule, Examination
from app.models.leave import StudentLeaveApplication
from app.models.student import Student
from app.services import (
    calendar_service,
    examination_service,
    fee_service,
    timetable_service,
)
from app.services.online_classroom_service import OnlineClassroomService

logger = logging.getLogger(__name__)


def tool_get_student_profile(student: Student, db: Session) -> dict[str, Any]:
    """Retrieves verified student profile and current academic structure."""
    active_enrollment = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        ).order_by(StudentEnrollment.created_at.desc())
    ).scalar_one_or_none()

    cur_year = None
    cur_grade = student.class_name
    cur_sec = student.section
    teacher_name = None

    if active_enrollment:
        if active_enrollment.academic_year_id:
            y = db.get(AcademicYear, active_enrollment.academic_year_id)
            if y:
                cur_year = y.name
        if active_enrollment.grade_id:
            g = db.get(Grade, active_enrollment.grade_id)
            if g:
                cur_grade = g.name
        if active_enrollment.section_id:
            s = db.get(Section, active_enrollment.section_id)
            if s:
                cur_sec = s.name
                if s.teacher_assignments:
                    for ta in s.teacher_assignments:
                        if getattr(ta, "role", "") == "class_teacher" and ta.teacher:
                            teacher_name = f"{ta.teacher.first_name} {ta.teacher.last_name}"
                            break

    return {
        "full_name": f"{student.first_name} {student.last_name}",
        "student_code": student.student_code,
        "enrollment_number": student.enrollment_number,
        "grade": cur_grade,
        "section": cur_sec,
        "academic_year": cur_year or "Current Academic Session",
        "class_teacher": teacher_name or "Assigned Homeroom Teacher",
        "department": student.department or "General Studies",
    }


def tool_get_student_timetable(student: Student, db: Session, target_date_str: str | None = None) -> dict[str, Any]:
    """Retrieves student's timetable for today, tomorrow, or a specified date."""
    target_date = dt.date.today()
    if target_date_str:
        try:
            target_date = dt.date.fromisoformat(target_date_str)
        except Exception:
            pass

    day_name = target_date.strftime("%A").upper()

    try:
        tt_res = timetable_service.get_student_timetable(student.user_id, db, target_date=target_date)
        entries = []
        for p in tt_res.periods:
            entries.append({
                "period_number": p.period_number,
                "start_time": str(p.start_time),
                "end_time": str(p.end_time),
                "subject_name": p.subject_name or "Free / Study Period",
                "subject_code": p.subject_code or "N/A",
                "teacher_name": p.teacher_name or "Self Study",
                "room_name": getattr(p, "room_name", None) or "Homeroom",
            })

        return {
            "date": target_date.isoformat(),
            "day_of_week": day_name,
            "shift_name": tt_res.shift_name,
            "total_periods": len(entries),
            "periods": entries,
            "is_scheduled": len(entries) > 0,
        }
    except Exception as e:
        logger.info(f"Timetable lookup note: {e}")
        return {
            "date": target_date.isoformat(),
            "day_of_week": day_name,
            "periods": [],
            "total_periods": 0,
            "is_scheduled": False,
            "message": "No scheduled periods found for this date.",
        }


def tool_get_student_attendance(student: Student, db: Session) -> dict[str, Any]:
    """Retrieves cumulative attendance percentage, attended days, and absences."""
    records = db.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.student_id == student.id)
        .order_by(AttendanceRecord.date.desc())
    ).scalars().all()

    total_records = len(records)
    attended = 0
    excused = 0
    unexcused = 0
    recent_absences = []

    for r in records:
        st = (r.status or "").upper()
        if st in ("PRESENT", "ATTENDED"):
            attended += 1
        elif st in ("EXCUSED", "LEAVE"):
            excused += 1
            if len(recent_absences) < 5:
                recent_absences.append({"date": r.date.isoformat(), "type": "Excused Leave"})
        elif st in ("ABSENT", "UNEXCUSED"):
            unexcused += 1
            if len(recent_absences) < 5:
                recent_absences.append({"date": r.date.isoformat(), "type": "Unexcused Absence"})

    pct = round((attended / total_records) * 100.0, 1) if total_records > 0 else 100.0

    return {
        "total_working_days": total_records,
        "attended_days": attended,
        "excused_days": excused,
        "unexcused_days": unexcused,
        "attendance_percentage": pct,
        "status": "Good Standing" if pct >= 75.0 else "Action Required (Below 75%)",
        "recent_absences": recent_absences,
    }


def tool_get_student_examinations(student: Student, db: Session) -> dict[str, Any]:
    """Retrieves upcoming scheduled examinations for the student."""
    try:
        schedules = examination_service.get_student_upcoming_schedules(student.id, db)
        items = []
        for s in schedules:
            items.append({
                "exam_name": s.exam_name,
                "subject_name": s.subject_name,
                "exam_date": s.exam_date.isoformat() if s.exam_date else None,
                "start_time": str(s.start_time) if s.start_time else None,
                "end_time": str(s.end_time) if s.end_time else None,
                "max_marks": float(s.max_marks) if s.max_marks else 100.0,
            })
        return {
            "upcoming_count": len(items),
            "upcoming_examinations": items,
        }
    except Exception as e:
        logger.error(f"Error fetching upcoming examinations: {e}")
        return {"upcoming_count": 0, "upcoming_examinations": []}


def tool_get_student_results(student: Student, db: Session) -> dict[str, Any]:
    """Retrieves published examination marks and report card records."""
    try:
        results = examination_service.get_student_published_results(student.id, None, db)
        exams_list = []
        for res in results:
            subs = []
            for sm in getattr(res, "subject_marks", []):
                subs.append({
                    "subject_name": getattr(sm, "subject_name", "Subject"),
                    "marks_obtained": float(sm.marks_obtained) if sm.marks_obtained is not None else 0.0,
                    "max_marks": float(sm.max_marks) if sm.max_marks else 100.0,
                    "grade": getattr(sm, "grade", "N/A"),
                })
            exams_list.append({
                "exam_name": getattr(res, "exam_name", "Examination"),
                "academic_year": getattr(res, "academic_year", "Current"),
                "subject_marks": subs,
                "overall_percentage": float(res.overall_percentage) if getattr(res, "overall_percentage", None) else None,
                "overall_grade": getattr(res, "overall_grade", None),
            })
        return {
            "published_exams_count": len(exams_list),
            "results": exams_list,
        }
    except Exception as e:
        logger.error(f"Error fetching published results: {e}")
        return {"published_exams_count": 0, "results": []}


def tool_get_school_calendar(student: Student, db: Session, target_date_str: str | None = None) -> dict[str, Any]:
    """Checks holiday status, special working days, or upcoming calendar events."""
    target_date = dt.date.today()
    if target_date_str:
        try:
            target_date = dt.date.fromisoformat(target_date_str)
        except Exception:
            pass

    try:
        # Find active academic year
        enr = db.execute(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == student.id,
                StudentEnrollment.status == "ACTIVE",
            )
        ).scalar_one_or_none()
        ay_id = enr.academic_year_id if enr and enr.academic_year_id else None

        if not ay_id:
            ay = db.execute(select(AcademicYear).where(AcademicYear.status == "active")).scalars().first()
            ay_id = ay.id if ay else None

        if not ay_id:
            return {
                "date": target_date.isoformat(),
                "is_working_day": target_date.weekday() != 6,
                "day_type": "standard_day" if target_date.weekday() != 6 else "sunday",
                "reason": "Sunday weekly holiday" if target_date.weekday() == 6 else "Regular school day",
                "holiday_name": None,
                "upcoming_holidays": [],
            }

        status_resp = calendar_service.check_date_working_status(
            target_date=target_date,
            academic_year_id=ay_id,
            grade_id=enr.grade_id if enr else None,
            section_id=enr.section_id if enr else None,
            db=db,
        )

        # Also retrieve upcoming holidays
        holidays = calendar_service.get_school_holidays(
            academic_year_id=ay_id,
            category_id=None,
            grade_id=enr.grade_id if enr else None,
            status_filter="ACTIVE",
            start_date=target_date,
            end_date=None,
            db=db,
        )
        upcoming_holidays = []
        for h in holidays:
            if h.start_date >= target_date:
                upcoming_holidays.append({
                    "holiday_name": h.name,
                    "start_date": h.start_date.isoformat(),
                    "end_date": h.end_date.isoformat(),
                    "description": h.description,
                })

        return {
            "date": target_date.isoformat(),
            "is_working_day": status_resp.is_working_day,
            "day_type": status_resp.day_type,
            "reason": status_resp.reason,
            "holiday_name": status_resp.holiday_name,
            "upcoming_holidays": upcoming_holidays[:4],
        }
    except Exception as e:
        logger.error(f"Error checking school calendar: {e}")
        return {
            "date": target_date.isoformat(),
            "is_working_day": target_date.weekday() != 6,
            "day_type": "standard_day" if target_date.weekday() != 6 else "sunday",
            "reason": "Regular schedule assumed.",
            "holiday_name": None,
            "upcoming_holidays": [],
        }


def tool_get_student_fees(student: Student, db: Session) -> dict[str, Any]:
    """Returns student tuition fee summary, paid amounts, and outstanding balance."""
    try:
        schedule = fee_service.get_student_portal_fee_schedule(student.id, db)
        installments_summary = []
        for inst in getattr(schedule, "installments", []):
            installments_summary.append({
                "installment_number": inst.installment_number,
                "due_date": inst.due_date.isoformat() if inst.due_date else None,
                "amount": float(inst.amount),
                "paid_amount": float(inst.paid_amount),
                "outstanding": float(inst.outstanding_amount),
                "status": inst.status,
            })

        return {
            "student_name": schedule.student_name,
            "student_code": schedule.student_code,
            "currency": "INR",
            "installments": installments_summary,
            "portal_fee_link": "/fees",
            "note": "Fee payments are managed by parent/guardian through the portal.",
        }
    except Exception as e:
        logger.info(f"Fee summary note: {e}")
        return {
            "student_name": f"{student.first_name} {student.last_name}",
            "currency": "INR",
            "installments": [],
            "portal_fee_link": "/fees",
            "note": "No active fee invoice currently assigned.",
        }


def tool_get_student_online_classes(student: Student, db: Session) -> dict[str, Any]:
    """Returns scheduled and active online classroom sessions."""
    try:
        classes, total = OnlineClassroomService.list_classes_for_student(db, student.id, page=1, size=10)
        items = []
        for c in classes:
            items.append({
                "id": str(c.id),
                "title": c.title,
                "teacher_name": c.teacher_name,
                "scheduled_date": c.scheduled_date.isoformat() if c.scheduled_date else None,
                "start_time": str(c.start_time) if c.start_time else None,
                "duration_minutes": c.expected_duration_minutes,
                "status": c.status,
                "join_url": f"/online-classroom/{c.id}/live" if c.status == "LIVE" else f"/online-classroom/{c.id}/pre-join",
            })
        return {
            "total_classes": total,
            "classes": items,
            "recordings_note": "Online class recordings are not active in this institution.",
        }
    except Exception as e:
        logger.error(f"Error fetching online classes: {e}")
        return {"total_classes": 0, "classes": []}


def tool_get_student_leaves(student: Student, db: Session) -> dict[str, Any]:
    """Returns submitted leave applications and current approval statuses."""
    leaves = db.execute(
        select(StudentLeaveApplication)
        .where(StudentLeaveApplication.student_id == student.id)
        .order_by(StudentLeaveApplication.created_at.desc())
    ).scalars().all()

    items = []
    for l in leaves:
        items.append({
            "id": str(l.id),
            "start_date": l.start_date.isoformat() if l.start_date else None,
            "end_date": l.end_date.isoformat() if l.end_date else None,
            "reason": l.reason,
            "status": l.status,
            "rejection_reason": l.rejection_reason,
        })

    return {
        "total_applications": len(items),
        "leaves": items[:5],
        "portal_leaves_link": "/leaves",
    }


def tool_get_subject_curriculum(student: Student, db: Session, subject_name: str | None = None) -> dict[str, Any]:
    """Returns enrolled subjects, chapters, and topics."""
    query = select(Subject)
    if subject_name:
        query = query.where(Subject.name.ilike(f"%{subject_name}%"))
    subjects = db.execute(query).scalars().all()

    items = []
    for s in subjects:
        chapters = db.execute(
            select(SubjectChapter).where(SubjectChapter.subject_id == s.id).order_by(SubjectChapter.order_index.asc())
        ).scalars().all()

        ch_list = []
        for ch in chapters:
            topics = db.execute(
                select(ChapterTopic).where(ChapterTopic.chapter_id == ch.id).order_by(ChapterTopic.order_index.asc())
            ).scalars().all()
            ch_list.append({
                "chapter_number": ch.chapter_number,
                "title": ch.title,
                "topics_count": len(topics),
                "topics": [t.title for t in topics],
            })

        items.append({
            "subject_name": s.name,
            "subject_code": s.code,
            "chapters_count": len(chapters),
            "chapters": ch_list,
        })

    return {
        "enrolled_subjects_count": len(items),
        "subjects": items,
        "portal_assistant_link": "/learning-assistant",
    }


def tool_generate_quiz(student: Student, db: Session, subject_name: str | None = None, chapter: str | None = None) -> dict[str, Any]:
    """Generates curriculum practice quiz questions for student revision."""
    from app.services import ai_academic_service
    subj = subject_name or "Mathematics"
    res = ai_academic_service.generate_quiz(subj, chapter, difficulty="MEDIUM", question_count=3)
    return res.model_dump()


def tool_generate_flashcards(student: Student, db: Session, subject_name: str | None = None, chapter: str | None = None) -> dict[str, Any]:
    """Generates revision flashcards for core subject concepts."""
    from app.services import ai_academic_service
    subj = subject_name or "Science"
    res = ai_academic_service.generate_flashcards(subj, chapter, card_count=4)
    return res.model_dump()


def tool_generate_exam_prep_plan(student: Student, db: Session, subject_name: str | None = None) -> dict[str, Any]:
    """Generates structured countdown study checklist for upcoming examination."""
    from app.services import ai_academic_service
    res = ai_academic_service.generate_exam_prep_plan(student, subject_name, db)
    return res.model_dump()


def tool_solve_homework(student: Student, db: Session, problem_text: str | None = None) -> dict[str, Any]:
    """Provides Socratic progressive hints for homework problems."""
    from app.services import ai_academic_service
    grade = getattr(student, "class_name", "Grade 10")
    return ai_academic_service.solve_homework_socratic(problem_text or "General homework problem", grade_level=grade)


def tool_evaluate_grammar(student: Student, db: Session, text: str | None = None) -> dict[str, Any]:
    """Analyzes student English grammar, structure, and vocabulary tips."""
    from app.services.ai_interactive_service import ai_interactive_service
    grade = getattr(student, "class_name", "Grade 10")
    res = ai_interactive_service.evaluate_grammar(text or "", student_grade=grade)
    return res.model_dump()


def tool_debate_round(
    student: Student,
    db: Session,
    topic: str | None = None,
    stance: str | None = None,
    current_round: int = 1,
    student_argument: str | None = None,
) -> dict[str, Any]:
    """Progresses structured 3-round constructive debate session."""
    from app.services.ai_interactive_service import ai_interactive_service
    res = ai_interactive_service.progress_debate_round(
        topic=topic or "Impact of Artificial Intelligence in Education",
        stance=stance or "affirmative",
        current_round=current_round,
        student_argument=student_argument or "I believe this is impactful.",
    )
    return res.model_dump()


def tool_generate_concept_map(
    student: Student, db: Session, topic: str | None = None, subject_name: str | None = None
) -> dict[str, Any]:
    """Generates 2D hierarchical visual concept map."""
    from app.services.ai_interactive_service import ai_interactive_service
    grade = getattr(student, "class_name", "Grade 10")
    res = ai_interactive_service.generate_concept_map(
        topic=topic or "Photosynthesis",
        subject=subject_name or "General Science",
        grade_level=grade,
    )
    return res.model_dump()


def tool_get_class_notes(student: Student, db: Session, subject_name: str | None = None) -> dict[str, Any]:
    """Generates structured revision notes grounded in student timetable."""
    from app.services.ai_interactive_service import ai_interactive_service
    res = ai_interactive_service.generate_class_topic_notes(db, student.id, subject_name)
    return res.model_dump()


def tool_get_morning_briefing(student: Student, db: Session) -> dict[str, Any]:
    """Retrieves proactive daily morning student briefing digest."""
    from app.services.ai_proactive_service import ai_proactive_service
    return ai_proactive_service.generate_morning_briefing(db, student.id).model_dump()


def tool_get_daily_challenge(student: Student, db: Session) -> dict[str, Any]:
    """Retrieves 1-minute daily curriculum brain teaser question."""
    from app.services.ai_proactive_service import ai_proactive_service
    return ai_proactive_service.get_daily_challenge(db, student.id).model_dump()


def tool_discover_careers(student: Student, db: Session, interests: str | None = None) -> dict[str, Any]:
    """Matches student subject strengths and interests to career pathways."""
    from app.services.ai_proactive_service import ai_proactive_service
    return ai_proactive_service.discover_career_pathways(db, student.id, interests).model_dump()


# Tool Dispatch Router
TOOL_REGISTRY = {
    "get_student_profile": tool_get_student_profile,
    "get_student_timetable": tool_get_student_timetable,
    "get_student_attendance": tool_get_student_attendance,
    "get_student_examinations": tool_get_student_examinations,
    "get_student_results": tool_get_student_results,
    "get_school_calendar": tool_get_school_calendar,
    "get_student_fees": tool_get_student_fees,
    "get_student_online_classes": tool_get_student_online_classes,
    "get_student_leaves": tool_get_student_leaves,
    "get_subject_curriculum": tool_get_subject_curriculum,
    "generate_quiz": tool_generate_quiz,
    "generate_flashcards": tool_generate_flashcards,
    "generate_exam_prep_plan": tool_generate_exam_prep_plan,
    "solve_homework": tool_solve_homework,
    "evaluate_grammar": tool_evaluate_grammar,
    "debate_round": tool_debate_round,
    "generate_concept_map": tool_generate_concept_map,
    "get_class_notes": tool_get_class_notes,
    "get_morning_briefing": tool_get_morning_briefing,
    "get_daily_challenge": tool_get_daily_challenge,
    "discover_careers": tool_discover_careers,
}


def execute_tool(tool_name: str, args: dict[str, Any], student: Student, db: Session) -> dict[str, Any]:
    """Executes an authorized tool strictly bound to the authenticated student context."""
    handler = TOOL_REGISTRY.get(tool_name)
    if not handler:
        return {"error": f"Tool '{tool_name}' is not recognized."}

    try:
        # Pass relevant arguments if accepted
        if tool_name in ("get_student_timetable", "get_school_calendar"):
            target_date = args.get("target_date")
            return handler(student, db, target_date_str=target_date)
        elif tool_name in ("get_subject_curriculum", "get_class_notes"):
            subj = args.get("subject_name")
            return handler(student, db, subject_name=subj)
        elif tool_name in ("generate_quiz", "generate_flashcards"):
            subj = args.get("subject_name")
            chapter = args.get("chapter_title")
            return handler(student, db, subject_name=subj, chapter=chapter)
        elif tool_name == "generate_exam_prep_plan":
            subj = args.get("subject_name")
            return handler(student, db, subject_name=subj)
        elif tool_name == "solve_homework":
            prob = args.get("problem_text")
            return handler(student, db, problem_text=prob)
        elif tool_name == "evaluate_grammar":
            txt = args.get("text")
            return handler(student, db, text=txt)
        elif tool_name == "debate_round":
            topic = args.get("topic")
            stance = args.get("stance")
            rnd = args.get("current_round", 1)
            arg = args.get("student_argument")
            return handler(student, db, topic=topic, stance=stance, current_round=rnd, student_argument=arg)
        elif tool_name == "generate_concept_map":
            top = args.get("topic")
            subj = args.get("subject_name")
            return handler(student, db, topic=top, subject_name=subj)
        elif tool_name == "discover_careers":
            intr = args.get("interests")
            return handler(student, db, interests=intr)
        else:
            return handler(student, db)
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}")
        return {"error": f"Failed to execute tool '{tool_name}': {str(e)}"}
