import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.academic_structure import Grade, Section, AcademicYear, StudentEnrollment
from app.models.classroom import Subject
from app.models.examination import StudentExamMark, ExaminationSchedule, Examination, StudentExamResult
from app.models.ai_learning import (
    SubjectChapter,
    ChapterTopic,
    AILearningProfile,
    AILearningRecommendation,
    AIDailyStudyPlan,
    AIStudyPlanItem,
    AIPracticeSession,
    RecommendationPriority,
    RecommendationStatus,
    StudyPlanStatus,
)
from app.schemas.ai_learning import (
    LearningOverviewResponse,
    SubjectPerformanceSummary,
    RecommendationsSummary,
    TodayPlanSummary,
    DataAttribution,
    SubjectLearningDetail,
    ChapterDetail,
    TopicDetail,
)
from app.services.learning.performance_engine import compute_student_exam_performance
from app.services.learning.learning_path_service import (
    ensure_learning_recommendations,
    get_student_subjects_detail,
    get_topic_mastery_matrix,
    get_or_create_topic_mastery,
    record_topic_practice_result,
)
from app.services.learning.study_planner_engine import (
    get_or_create_daily_study_plan,
    get_weekly_study_plan,
    add_custom_study_plan_item,
    reschedule_study_plan_item,
    get_or_create_student_study_settings,
    update_student_study_settings,
)
from app.services.learning.practice_quiz_service import (
    generate_practice_session,
    evaluate_practice_session,
    get_student_mistakes,
    resolve_student_mistake,
)
from app.services.learning.concept_tutor_service import explain_curriculum_concept

logger = logging.getLogger(__name__)


def compute_student_exam_performance(student_id: uuid.UUID, db: Session) -> dict[str, Any]:
    """
    Computes verified statistical performance directly from official published exam records.
    Returns:
        - subject_stats: dict of subject_name -> {avg_pct, marks, total_exams, trend}
        - overall_average: float
        - historical_improvement: list of {exam_name, percentage, date}
    """
    # Query all published exam marks for this student
    marks_query = (
        select(
            StudentExamMark.marks_obtained,
            ExaminationSchedule.max_marks,
            Subject.name.label("subject_name"),
            Subject.code.label("subject_code"),
            Subject.id.label("subject_id"),
            Examination.name.label("exam_name"),
            Examination.start_date.label("exam_date"),
        )
        .join(ExaminationSchedule, StudentExamMark.schedule_id == ExaminationSchedule.id)
        .join(Subject, ExaminationSchedule.subject_id == Subject.id)
        .join(Examination, ExaminationSchedule.examination_id == Examination.id)
        .where(
            StudentExamMark.student_id == student_id,
            StudentExamMark.is_absent.is_(False),
            StudentExamMark.marks_obtained.isnot(None),
        )
        .order_by(Examination.start_date.asc())
    )
    records = db.execute(marks_query).all()

    subject_data: dict[str, list[dict[str, Any]]] = {}
    for r in records:
        if r.max_marks and r.max_marks > 0:
            pct = (r.marks_obtained / r.max_marks) * 100.0
        else:
            pct = 0.0

        if r.subject_name not in subject_data:
            subject_data[r.subject_name] = []
        subject_data[r.subject_name].append({
            "subject_id": r.subject_id,
            "subject_code": r.subject_code,
            "percentage": pct,
            "date": r.exam_date,
            "exam_name": r.exam_name,
        })

    # Aggregate by subject
    subject_summaries: list[SubjectPerformanceSummary] = []
    total_pct_sum = 0.0
    total_exams_count = 0

    for subj_name, attempts in subject_data.items():
        avg_pct = round(sum(a["percentage"] for a in attempts) / len(attempts), 1)
        total_pct_sum += sum(a["percentage"] for a in attempts)
        total_exams_count += len(attempts)

        # Determine trend
        if len(attempts) >= 2:
            first_half = attempts[:len(attempts)//2]
            second_half = attempts[len(attempts)//2:]
            avg_first = sum(a["percentage"] for a in first_half) / len(first_half)
            avg_second = sum(a["percentage"] for a in second_half) / len(second_half)
            if avg_second - avg_first >= 5.0:
                trend = "IMPROVING"
            elif avg_first - avg_second >= 5.0:
                trend = "DECLINING"
            else:
                trend = "STABLE"
        else:
            trend = "STABLE"

        # Determine status
        if avg_pct >= 80.0:
            status = "EXCELLING"
        elif avg_pct >= 65.0:
            status = "STRONG"
        elif avg_pct >= 50.0:
            status = "NEEDS_IMPROVEMENT"
        else:
            status = "CRITICAL_ATTENTION"

        subject_summaries.append(SubjectPerformanceSummary(
            subject_id=attempts[0]["subject_id"],
            subject_name=subj_name,
            subject_code=attempts[0]["subject_code"],
            average_marks=avg_pct,
            total_exams=len(attempts),
            status=status,
            trend=trend,
        ))

    overall_average = round(total_pct_sum / total_exams_count, 1) if total_exams_count > 0 else 0.0

    # Query consolidated exam results for historical timeline
    results_query = (
        select(
            StudentExamResult.percentage,
            StudentExamResult.overall_grade,
            Examination.name.label("exam_name"),
            Examination.start_date.label("exam_date"),
        )
        .join(Examination, StudentExamResult.examination_id == Examination.id)
        .where(StudentExamResult.student_id == student_id)
        .order_by(Examination.start_date.asc())
    )
    result_rows = db.execute(results_query).all()
    historical_improvement = [
        {
            "exam_name": row.exam_name,
            "percentage": round(row.percentage, 1),
            "grade": row.overall_grade,
            "date": str(row.exam_date),
        }
        for row in result_rows
    ]

    return {
        "subject_summaries": subject_summaries,
        "overall_average": overall_average,
        "historical_improvement": historical_improvement,
    }


def ensure_learning_recommendations(student: Student, subject_summaries: list[SubjectPerformanceSummary], db: Session) -> list[AILearningRecommendation]:
    """Generates initial learning recommendations if none exist or synchronizes them with latest performance."""
    existing = db.execute(
        select(AILearningRecommendation)
        .where(AILearningRecommendation.student_id == student.id)
        .order_by(AILearningRecommendation.order_index.asc())
    ).scalars().all()

    if existing:
        return existing

    # Find curriculum chapters for student's subjects
    new_recs: list[AILearningRecommendation] = []
    order_idx = 1

    # Sort subjects: Critical Attention first, then Needs Improvement, then Strong
    priority_order = {"CRITICAL_ATTENTION": 0, "NEEDS_IMPROVEMENT": 1, "STRONG": 2, "EXCELLING": 3}
    sorted_subjects = sorted(
        subject_summaries,
        key=lambda s: (priority_order.get(s.status, 4), s.average_marks)
    )

    for subj in sorted_subjects:
        if not subj.subject_id:
            continue
        chapters = db.execute(
            select(SubjectChapter)
            .where(SubjectChapter.subject_id == subj.subject_id)
            .order_by(SubjectChapter.chapter_number.asc())
        ).scalars().all()

        for ch in chapters:
            topics = db.execute(
                select(ChapterTopic)
                .where(ChapterTopic.chapter_id == ch.id)
                .order_by(ChapterTopic.order_index.asc())
            ).scalars().all()

            for top in topics[:2]:  # Take top 2 key topics per chapter
                if subj.status == "CRITICAL_ATTENTION":
                    prio = RecommendationPriority.HIGH.value
                    reason = f"Exam average in {subj.subject_name} is {subj.average_marks}%. Essential foundational concept revision."
                elif subj.status == "NEEDS_IMPROVEMENT":
                    prio = RecommendationPriority.MEDIUM.value
                    reason = f"Scored {subj.average_marks}% in {subj.subject_name}. Targeted practice recommended to reach mastery."
                else:
                    prio = RecommendationPriority.LOW.value
                    reason = f"Solid foundation in {subj.subject_name} ({subj.average_marks}%). Advance to higher difficulty practice."

                rec = AILearningRecommendation(
                    student_id=student.id,
                    chapter_id=ch.id,
                    topic_id=top.id,
                    subject_name=subj.subject_name,
                    topic_title=top.title,
                    reason=reason,
                    priority=prio,
                    estimated_minutes=top.estimated_minutes,
                    status=RecommendationStatus.NOT_STARTED.value,
                    order_index=order_idx,
                )
                db.add(rec)
                new_recs.append(rec)
                order_idx += 1
                if order_idx > 8:
                    break
            if order_idx > 8:
                break
        if order_idx > 8:
            break

    # Fallback if no exam records were present yet: recommend standard intro chapters
    if not new_recs:
        all_chapters = db.execute(select(SubjectChapter).order_by(SubjectChapter.order_index.asc())).scalars().all()
        for ch in all_chapters[:4]:
            top = db.execute(select(ChapterTopic).where(ChapterTopic.chapter_id == ch.id)).scalars().first()
            subj_title = ch.subject.name if ch.subject else "General"
            rec = AILearningRecommendation(
                student_id=student.id,
                chapter_id=ch.id,
                topic_id=top.id if top else None,
                subject_name=subj_title,
                topic_title=top.title if top else ch.title,
                reason="Baseline diagnostic recommendation. Start here to assess your current knowledge level.",
                priority=RecommendationPriority.MEDIUM.value,
                estimated_minutes=20,
                status=RecommendationStatus.NOT_STARTED.value,
                order_index=order_idx,
            )
            db.add(rec)
            new_recs.append(rec)
            order_idx += 1

    db.commit()
    return new_recs


def get_or_create_daily_study_plan(student: Student, db: Session) -> AIDailyStudyPlan:
    """Returns today's study plan or constructs a balanced schedule if one does not exist."""
    today = dt.date.today()
    plan = db.execute(
        select(AIDailyStudyPlan)
        .where(
            AIDailyStudyPlan.student_id == student.id,
            AIDailyStudyPlan.plan_date == today,
        )
    ).scalars().first()

    if plan:
        return plan

    # Create new daily plan based on pending recommendations
    plan = AIDailyStudyPlan(
        student_id=student.id,
        plan_date=today,
        total_planned_minutes=45,
        completed_minutes=0,
        status=StudyPlanStatus.PLANNED.value,
    )
    db.add(plan)
    db.flush()

    # Find pending recommendations
    recs = db.execute(
        select(AILearningRecommendation)
        .where(
            AILearningRecommendation.student_id == student.id,
            AILearningRecommendation.status != RecommendationStatus.COMPLETED.value,
        )
        .order_by(AILearningRecommendation.order_index.asc())
        .limit(3)
    ).scalars().all()

    activities = ["CONCEPT_REVIEW", "PRACTICE_QUIZ", "MISTAKE_REVISION"]
    if recs:
        for idx, rec in enumerate(recs, start=1):
            act_type = activities[(idx - 1) % len(activities)]
            item = AIStudyPlanItem(
                plan_id=plan.id,
                subject_name=rec.subject_name,
                topic_title=rec.topic_title,
                activity_type=act_type,
                duration_minutes=rec.estimated_minutes or 15,
                is_completed=False,
                time_spent_seconds=0,
                order_index=idx,
            )
            db.add(item)
    else:
        # Default starter routine
        defaults = [
            ("Mathematics", "Linear Equations Review", "CONCEPT_REVIEW", 20),
            ("General Science", "Life Processes & Respiration", "PRACTICE_QUIZ", 15),
            ("English Literature", "Grammar: Reported Speech", "CONCEPT_REVIEW", 10),
        ]
        for idx, (subj, top, act, dur) in enumerate(defaults, start=1):
            item = AIStudyPlanItem(
                plan_id=plan.id,
                subject_name=subj,
                topic_title=top,
                activity_type=act,
                duration_minutes=dur,
                is_completed=False,
                time_spent_seconds=0,
                order_index=idx,
            )
            db.add(item)

    db.commit()
    return plan


def add_custom_study_plan_item(
    student: Student,
    subject_name: str,
    topic_title: str,
    duration_minutes: int,
    activity_type: str,
    db: Session,
) -> AIDailyStudyPlan:
    """Adds a targeted remediation focus session or topic practice into today's active study plan."""
    plan = get_or_create_daily_study_plan(student, db)
    max_order = max([i.order_index for i in plan.items], default=0)
    item = AIStudyPlanItem(
        plan_id=plan.id,
        subject_name=subject_name,
        topic_title=topic_title,
        activity_type=activity_type,
        duration_minutes=duration_minutes,
        is_completed=False,
        time_spent_seconds=0,
        order_index=max_order + 1,
    )
    db.add(item)
    plan.total_planned_minutes += duration_minutes
    db.commit()
    db.refresh(plan)
    return plan


def get_learning_overview(student_id: uuid.UUID, db: Session) -> LearningOverviewResponse:
    """Consolidates complete learning overview for the authenticated student."""
    student = db.execute(select(Student).where(Student.id == student_id)).scalars().first()
    if not student:
        raise ValueError("Student not found")

    grade_name = student.class_name or "Standard Grade"
    section_name = student.section or "A"

    # Compute exam analytics
    perf = compute_student_exam_performance(student_id, db)
    subject_summaries: list[SubjectPerformanceSummary] = perf["subject_summaries"]

    strong_subjects = [s for s in subject_summaries if s.status in ("EXCELLING", "STRONG")]
    weak_subjects = [s for s in subject_summaries if s.status in ("CRITICAL_ATTENTION", "NEEDS_IMPROVEMENT")]

    # Recommendations
    recs = ensure_learning_recommendations(student, subject_summaries, db)
    completed_recs = [r for r in recs if r.status == RecommendationStatus.COMPLETED.value]
    in_progress_recs = [r for r in recs if r.status == RecommendationStatus.IN_PROGRESS.value]

    total_r = len(recs)
    comp_r = len(completed_recs)
    comp_pct = round((comp_r / total_r * 100.0), 1) if total_r > 0 else 0.0

    recs_summary = RecommendationsSummary(
        total_recommendations=total_r,
        completed_count=comp_r,
        in_progress_count=len(in_progress_recs),
        completion_percentage=comp_pct,
    )

    top_rec = None
    for r in recs:
        if r.status != RecommendationStatus.COMPLETED.value:
            top_rec = {
                "id": str(r.id),
                "subject_name": r.subject_name,
                "topic_title": r.topic_title,
                "reason": r.reason,
                "priority": r.priority,
                "estimated_minutes": r.estimated_minutes,
                "status": r.status,
            }
            break

    # Daily study plan
    daily_plan = get_or_create_daily_study_plan(student, db)
    completed_items = [i for i in daily_plan.items if i.is_completed]
    today_summary = TodayPlanSummary(
        total_minutes=daily_plan.total_planned_minutes,
        completed_minutes=daily_plan.completed_minutes,
        items_count=len(daily_plan.items),
        completed_items=len(completed_items),
    )

    data_avail = "EXAMINATION_AND_DIAGNOSTIC" if subject_summaries else "BASELINE_DIAGNOSTIC_ONLY"

    return LearningOverviewResponse(
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}",
        grade_name=grade_name,
        section_name=section_name,
        academic_year="2026-2027",
        overall_exam_average=perf["overall_average"],
        strong_subjects=strong_subjects,
        weak_subjects=weak_subjects,
        recommendations_summary=recs_summary,
        top_recommendation=top_rec,
        today_plan_summary=today_summary,
        data_attribution=DataAttribution(
            exam_source="Verified Official School Examination Records",
            practice_source="Formative AI Practice Analytics",
            confidence="HIGH" if len(subject_summaries) >= 3 else "MEDIUM",
            data_availability=data_avail,
        ),
        historical_improvement=perf["historical_improvement"],
    )


def get_student_subjects_detail(student_id: uuid.UUID, db: Session) -> list[SubjectLearningDetail]:
    """Returns detailed subject, chapter, and topic progress with diagnostic practice accuracy."""
    student = db.execute(select(Student).where(Student.id == student_id)).scalars().first()
    if not student:
        raise ValueError("Student not found")

    # Fetch exam performance for baseline averages
    perf = compute_student_exam_performance(student_id, db)
    exam_avg_map = {s.subject_name: s.average_marks for s in perf["subject_summaries"]}

    # Fetch practice session accuracy by chapter
    practice_rows = db.execute(
        select(
            AIPracticeSession.chapter_id,
            func.avg(AIPracticeSession.score_percentage).label("avg_score"),
        )
        .where(AIPracticeSession.student_id == student_id)
        .group_by(AIPracticeSession.chapter_id)
    ).all()
    chapter_accuracy_map = {r.chapter_id: round(float(r.avg_score), 1) for r in practice_rows if r.chapter_id}

    # Fetch all subjects
    subjects = db.execute(select(Subject).order_by(Subject.name.asc())).scalars().all()
    results: list[SubjectLearningDetail] = []

    for subj in subjects:
        chapters = db.execute(
            select(SubjectChapter)
            .where(SubjectChapter.subject_id == subj.id)
            .order_by(SubjectChapter.chapter_number.asc())
        ).scalars().all()

        ch_details: list[ChapterDetail] = []
        completed_ch_count = 0

        for ch in chapters:
            topics = db.execute(
                select(ChapterTopic)
                .where(ChapterTopic.chapter_id == ch.id)
                .order_by(ChapterTopic.order_index.asc())
            ).scalars().all()

            top_details = [
                TopicDetail(
                    id=t.id,
                    title=t.title,
                    learning_objective=t.learning_objective,
                    difficulty_level=t.difficulty_level,
                    estimated_minutes=t.estimated_minutes,
                    order_index=t.order_index,
                    diagnostic_accuracy=chapter_accuracy_map.get(ch.id),
                    is_mastered=(chapter_accuracy_map.get(ch.id, 0) >= 80.0),
                )
                for t in topics
            ]

            ch_acc = chapter_accuracy_map.get(ch.id)
            if ch_acc is not None and ch_acc >= 75.0:
                ch_status = "COMPLETED"
                completed_ch_count += 1
            elif ch_acc is not None:
                ch_status = "IN_PROGRESS"
            else:
                ch_status = "NOT_STARTED"

            ch_details.append(ChapterDetail(
                id=ch.id,
                chapter_number=ch.chapter_number,
                title=ch.title,
                description=ch.description,
                order_index=ch.order_index,
                topics=top_details,
                diagnostic_accuracy=ch_acc,
                status=ch_status,
            ))

        exam_avg = exam_avg_map.get(subj.name)
        if exam_avg is not None:
            if exam_avg >= 75.0:
                subj_status = "STRONG"
            elif exam_avg >= 50.0:
                subj_status = "NEEDS_IMPROVEMENT"
            else:
                subj_status = "CRITICAL_ATTENTION"
        else:
            subj_status = "ENROLLED"

        results.append(SubjectLearningDetail(
            subject_id=subj.id,
            subject_name=subj.name,
            subject_code=subj.code,
            official_exam_average=exam_avg,
            total_chapters=len(chapters),
            completed_chapters=completed_ch_count,
            diagnostic_accuracy=None,
            status=subj_status,
            chapters=ch_details,
        ))

    return results
