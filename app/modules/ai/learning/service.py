import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.academics.structure_models import Grade, Section, AcademicYear, StudentEnrollment
from app.modules.academics.classroom_models import Subject
from app.modules.examinations.models import StudentExamMark, ExaminationSchedule, Examination, StudentExamResult
from app.modules.ai.learning.models import (
    SubjectChapter,
    ChapterTopic,
    AIPracticeSession,
    RecommendationPriority,
    RecommendationStatus,
    StudyPlanStatus,
)
from app.modules.ai.learning.dtos import (
    LearningRecommendationDTO,
    DailyStudyPlanDTO,
    StudyPlanItemDTO,
    StudentStudySettingsDTO,
)
from app.modules.ai.learning.schemas import (
    LearningOverviewResponse,
    SubjectPerformanceSummary,
    RecommendationsSummary,
    TodayPlanSummary,
    DataAttribution,
    SubjectLearningDetail,
    ChapterDetail,
    TopicDetail,
)
from app.modules.ai.learning.engines.performance_engine import compute_student_exam_performance

logger = logging.getLogger(__name__)


def ensure_learning_recommendations(
    student: Student, subject_summaries: list[SubjectPerformanceSummary], db: Session
) -> list[LearningRecommendationDTO]:
    """Generates dynamic query-driven learning recommendations based on exam performance shortfalls and syllabus topics."""
    new_recs: list[LearningRecommendationDTO] = []
    order_idx = 1

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

            for top in topics[:2]:
                if subj.status == "CRITICAL_ATTENTION":
                    prio = RecommendationPriority.HIGH.value
                    reason = f"Exam average in {subj.subject_name} is {subj.average_marks}%. Essential foundational concept revision."
                elif subj.status == "NEEDS_IMPROVEMENT":
                    prio = RecommendationPriority.MEDIUM.value
                    reason = f"Scored {subj.average_marks}% in {subj.subject_name}. Targeted practice recommended to reach mastery."
                else:
                    prio = RecommendationPriority.LOW.value
                    reason = f"Solid foundation in {subj.subject_name} ({subj.average_marks}%). Advance to higher difficulty practice."

                rec = LearningRecommendationDTO(
                    id=uuid.uuid5(student.id, f"{ch.id}:{top.id}"),
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
                    created_at=dt.datetime.now(dt.timezone.utc),
                )
                new_recs.append(rec)
                order_idx += 1
                if order_idx > 8:
                    break
        if order_idx > 8:
            break

    # Fallback recommendations if student has no chapters seeded
    if not new_recs:
        defaults = [
            ("Mathematics", "Linear Equations & Graphs", "Foundational algebra mastery"),
            ("Science", "Newton's Laws of Motion", "Core physics conceptual clarity"),
            ("English", "Grammar & Reported Speech", "Essential sentence structure review"),
        ]
        for idx, (subj, top, reason) in enumerate(defaults, start=1):
            new_recs.append(
                LearningRecommendationDTO(
                    id=uuid.uuid5(student.id, f"default:{idx}"),
                    student_id=student.id,
                    subject_name=subj,
                    topic_title=top,
                    reason=reason,
                    priority="HIGH" if idx == 1 else "MEDIUM",
                    estimated_minutes=20,
                    status=RecommendationStatus.NOT_STARTED.value,
                    order_index=idx,
                    created_at=dt.datetime.now(dt.timezone.utc),
                )
            )

    return new_recs


def get_or_create_daily_study_plan(student: Student, db: Session) -> DailyStudyPlanDTO:
    """Returns today's dynamically generated study plan based on timetable and weak recommendations."""
    today = dt.date.today()
    perf = compute_student_exam_performance(student.id, db)
    recs = ensure_learning_recommendations(student, perf.get("subject_summaries", []), db)

    activities = ["CONCEPT_REVIEW", "PRACTICE_QUIZ", "MISTAKE_REVISION"]
    items: list[StudyPlanItemDTO] = []
    total_minutes = 0

    for idx, rec in enumerate(recs[:3], start=1):
        act_type = activities[(idx - 1) % len(activities)]
        dur = rec.estimated_minutes or 15
        total_minutes += dur
        items.append(
            StudyPlanItemDTO(
                id=uuid.uuid5(student.id, f"plan_item:{today}:{idx}"),
                subject_name=rec.subject_name,
                topic_title=rec.topic_title,
                activity_type=act_type,
                duration_minutes=dur,
                is_completed=False,
                time_spent_seconds=0,
                order_index=idx,
            )
        )

    return DailyStudyPlanDTO(
        id=uuid.uuid5(student.id, f"plan:{today}"),
        student_id=student.id,
        plan_date=today,
        total_planned_minutes=total_minutes or 45,
        completed_minutes=0,
        remaining_minutes=total_minutes or 45,
        completion_percentage=0.0,
        status=StudyPlanStatus.PLANNED.value,
        items=items,
    )


def add_custom_study_plan_item(
    student: Student,
    subject_name: str,
    topic_title: str,
    duration_minutes: int,
    activity_type: str,
    db: Session,
) -> StudyPlanItemDTO:
    """Creates a custom study plan item DTO."""
    return StudyPlanItemDTO(
        id=uuid.uuid4(),
        subject_name=subject_name,
        topic_title=topic_title,
        duration_minutes=duration_minutes,
        activity_type=activity_type,
        is_completed=False,
        is_custom=True,
    )


def get_learning_overview(student_id: uuid.UUID, db: Session) -> LearningOverviewResponse:
    """Consolidates complete learning overview for the authenticated student using queries."""
    student = db.execute(select(Student).where(Student.id == student_id)).scalars().first()
    if not student:
        raise ValueError("Student not found")

    grade_name = student.class_name or "Standard Grade"
    section_name = student.section or "A"

    perf = compute_student_exam_performance(student_id, db)
    subject_summaries: list[SubjectPerformanceSummary] = perf["subject_summaries"]

    strong_subjects = [s for s in subject_summaries if s.status in ("EXCELLING", "STRONG")]
    weak_subjects = [s for s in subject_summaries if s.status in ("CRITICAL_ATTENTION", "NEEDS_IMPROVEMENT")]

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
        data_attribution=DataAttribution(data_availability=data_avail),
    )


def get_student_subjects_detail(student_id: uuid.UUID, db: Session) -> list[SubjectLearningDetail]:
    """Returns curriculum chapters and topics for all enrolled subjects."""
    student = db.execute(select(Student).where(Student.id == student_id)).scalars().first()
    if not student:
        raise ValueError("Student not found")

    enrollment = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.status == "active",
        )
    ).scalars().first()

    grade_id = enrollment.grade_id if enrollment else getattr(student, "current_grade_id", None)
    if grade_id:
        subjects = db.execute(
            select(Subject).where(Subject.grade_id == grade_id).order_by(Subject.name.asc())
        ).scalars().all()
    else:
        # Fallback to all active subjects when mock student has no explicit grade_id assigned
        subjects = db.execute(
            select(Subject).order_by(Subject.name.asc())
        ).scalars().all()

    perf = compute_student_exam_performance(student_id, db)
    summary_map = {s.subject_name: s for s in perf["subject_summaries"]}

    result: list[SubjectLearningDetail] = []
    for subj in subjects:
        s_sum = summary_map.get(subj.name)
        avg = s_sum.average_marks if s_sum else 0.0
        stat = s_sum.status if s_sum else "NOT_STARTED"

        chapters = db.execute(
            select(SubjectChapter)
            .where(SubjectChapter.subject_id == subj.id)
            .order_by(SubjectChapter.chapter_number.asc())
        ).scalars().all()

        ch_details: list[ChapterDetail] = []
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
                    learning_objective=getattr(t, "learning_objective", getattr(t, "concept_summary", None)),
                    difficulty_level=t.difficulty_level,
                    estimated_minutes=t.estimated_minutes,
                    order_index=t.order_index,
                    is_mastered=False,
                )
                for t in topics
            ]

            ch_details.append(
                ChapterDetail(
                    id=ch.id,
                    chapter_number=ch.chapter_number,
                    title=ch.title,
                    description=ch.description,
                    order_index=ch.chapter_number,
                    topics=top_details,
                    status="NOT_STARTED",
                )
            )

        result.append(
            SubjectLearningDetail(
                subject_id=subj.id,
                subject_name=subj.name,
                subject_code=subj.code,
                official_exam_average=avg,
                total_chapters=len(chapters),
                completed_chapters=0,
                status=stat,
                chapters=ch_details,
            )
        )

    return result
