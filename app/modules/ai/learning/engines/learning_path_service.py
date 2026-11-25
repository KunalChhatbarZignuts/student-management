import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.academics.classroom_models import Subject
from app.modules.ai.learning.models import (
    SubjectChapter,
    ChapterTopic,
    AILearningRecommendation,
    AITopicMastery,
    TopicMasteryLevel,
    RecommendationPriority,
    RecommendationStatus,
)
from app.modules.ai.learning.schemas import (
    SubjectPerformanceSummary,
    SubjectLearningDetail,
    ChapterDetail,
    TopicDetail,
    RecommendationResponse,
    TopicMasteryItemResponse,
    TopicMasteryMatrixResponse,
)

logger = logging.getLogger(__name__)


def get_or_create_topic_mastery(
    student_id: uuid.UUID, topic_id: uuid.UUID, db: Session
) -> AITopicMastery:
    """Finds or initializes a student's mastery tracker for a curriculum topic."""
    mastery = db.execute(
        select(AITopicMastery).where(
            AITopicMastery.student_id == student_id,
            AITopicMastery.topic_id == topic_id,
        )
    ).scalar_one_or_none()

    if not mastery:
        mastery = AITopicMastery(
            student_id=student_id,
            topic_id=topic_id,
            mastery_level=TopicMasteryLevel.NOT_STARTED.value,
            accuracy_percentage=0.0,
            attempts_count=0,
            consecutive_correct=0,
        )
        db.add(mastery)
        db.flush()
    return mastery


def record_topic_practice_result(
    student_id: uuid.UUID,
    topic_id: uuid.UUID,
    is_correct: bool,
    db: Session,
) -> AITopicMastery:
    """
    Updates the student topic mastery state based on real practice evidence.
    Enforces mastery thresholds:
    - Minimum 2 practice attempts with >= 80% accuracy and >= 3 consecutive correct required for MASTERED.
    - Low accuracy (<60%) moves topic to NEEDS_PRACTICE.
    - Improving accuracy (60-79%) moves topic to IMPROVING.
    """
    mastery = get_or_create_topic_mastery(student_id, topic_id, db)
    mastery.attempts_count += 1
    mastery.last_assessed_at = dt.datetime.now(dt.timezone.utc)

    if is_correct:
        mastery.consecutive_correct += 1
    else:
        mastery.consecutive_correct = 0

    # Exponential moving accuracy calculation
    current_score = 100.0 if is_correct else 0.0
    if mastery.attempts_count == 1:
        mastery.accuracy_percentage = current_score
    else:
        # Weight recent attempts higher (smoothing factor alpha=0.35)
        mastery.accuracy_percentage = round(
            (0.35 * current_score) + (0.65 * mastery.accuracy_percentage), 1
        )

    # Determine progression level
    if mastery.attempts_count >= 2 and mastery.accuracy_percentage >= 80.0 and mastery.consecutive_correct >= 3:
        mastery.mastery_level = TopicMasteryLevel.MASTERED.value
    elif mastery.accuracy_percentage < 60.0:
        mastery.mastery_level = TopicMasteryLevel.NEEDS_PRACTICE.value
    elif mastery.accuracy_percentage >= 60.0 and mastery.attempts_count >= 2:
        mastery.mastery_level = TopicMasteryLevel.IMPROVING.value
    else:
        mastery.mastery_level = TopicMasteryLevel.IN_PROGRESS.value

    db.commit()
    return mastery


def get_student_subjects_detail(student_id: uuid.UUID, db: Session) -> list[SubjectLearningDetail]:
    """
    Returns enrolled subjects with chapter syllabus hierarchy and verified diagnostic mastery.
    """
    from app.modules.ai.learning.engines.performance_engine import compute_student_exam_performance
    perf = compute_student_exam_performance(student_id, db)
    exam_dict = {s.subject_name: s for s in perf["subject_summaries"]}

    # Load all curriculum chapters and topics
    chapters_query = (
        select(SubjectChapter)
        .join(Subject, SubjectChapter.subject_id == Subject.id)
        .order_by(Subject.name.asc(), SubjectChapter.chapter_number.asc())
    )
    all_chapters = db.execute(chapters_query).scalars().all()

    # Preload student's topic masteries
    masteries_rows = db.execute(
        select(AITopicMastery).where(AITopicMastery.student_id == student_id)
    ).scalars().all()
    mastery_by_topic = {m.topic_id: m for m in masteries_rows}

    # Group by subject
    subjects_map: dict[uuid.UUID, dict[str, Any]] = {}
    for ch in all_chapters:
        subj = ch.subject
        if not subj:
            continue
        if subj.id not in subjects_map:
            exam_stat = exam_dict.get(subj.name)
            subjects_map[subj.id] = {
                "subject_id": subj.id,
                "subject_name": subj.name,
                "subject_code": subj.code or "SUBJ",
                "official_exam_average": exam_stat.average_marks if exam_stat else None,
                "status": exam_stat.status if exam_stat else "ENROLLED",
                "chapters": [],
            }

        topic_details: list[TopicDetail] = []
        ch_accuracies: list[float] = []
        for top in ch.topics:
            m = mastery_by_topic.get(top.id)
            diag_acc = m.accuracy_percentage if m and m.attempts_count > 0 else None
            is_mastered = m.mastery_level == TopicMasteryLevel.MASTERED.value if m else False
            if diag_acc is not None:
                ch_accuracies.append(diag_acc)

            topic_details.append(TopicDetail(
                id=top.id,
                title=top.title,
                learning_objective=top.learning_objective,
                difficulty_level=top.difficulty_level,
                estimated_minutes=top.estimated_minutes,
                order_index=top.order_index,
                diagnostic_accuracy=diag_acc,
                is_mastered=is_mastered,
            ))

        avg_ch_diag = round(sum(ch_accuracies) / len(ch_accuracies), 1) if ch_accuracies else None
        all_mastered = len(topic_details) > 0 and all(t.is_mastered for t in topic_details)
        any_in_prog = any(t.diagnostic_accuracy is not None for t in topic_details)

        ch_status = "COMPLETED" if all_mastered else ("IN_PROGRESS" if any_in_prog else "NOT_STARTED")

        subjects_map[subj.id]["chapters"].append(ChapterDetail(
            id=ch.id,
            chapter_number=ch.chapter_number,
            title=ch.title,
            description=ch.description,
            order_index=ch.order_index,
            topics=topic_details,
            diagnostic_accuracy=avg_ch_diag,
            status=ch_status,
        ))

    results: list[SubjectLearningDetail] = []
    for s_id, s_data in subjects_map.items():
        total_ch = len(s_data["chapters"])
        comp_ch = sum(1 for c in s_data["chapters"] if c.status == "COMPLETED")
        all_subj_accs = [c.diagnostic_accuracy for c in s_data["chapters"] if c.diagnostic_accuracy is not None]
        avg_subj_diag = round(sum(all_subj_accs) / len(all_subj_accs), 1) if all_subj_accs else None

        results.append(SubjectLearningDetail(
            subject_id=s_id,
            subject_name=s_data["subject_name"],
            subject_code=s_data["subject_code"],
            official_exam_average=s_data["official_exam_average"],
            total_chapters=total_ch,
            completed_chapters=comp_ch,
            diagnostic_accuracy=avg_subj_diag,
            status=s_data["status"],
            chapters=s_data["chapters"],
        ))

    return results


def ensure_learning_recommendations(
    student: Student, subject_summaries: list[SubjectPerformanceSummary], db: Session
) -> list[AILearningRecommendation]:
    """
    Generates evidence-backed learning recommendations.
    Never invents topic-level certainty from pure subject marks.
    Cites explicit data sources in recommendation reasons.
    """
    existing = db.execute(
        select(AILearningRecommendation)
        .where(AILearningRecommendation.student_id == student.id)
        .order_by(AILearningRecommendation.order_index.asc())
    ).scalars().all()

    if existing:
        return existing

    new_recs: list[AILearningRecommendation] = []
    order_idx = 1

    priority_map = {"CRITICAL_ATTENTION": 0, "NEEDS_IMPROVEMENT": 1, "STRONG": 2, "EXCELLING": 3}
    sorted_subjects = sorted(
        subject_summaries,
        key=lambda s: (priority_map.get(s.status, 4), s.average_marks),
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
                    reason = (
                        f"Official exam average in {subj.subject_name} is {subj.average_marks}%. "
                        f"Prerequisite review recommended to rebuild foundational concepts."
                    )
                elif subj.status == "NEEDS_IMPROVEMENT":
                    prio = RecommendationPriority.MEDIUM.value
                    reason = (
                        f"Scored {subj.average_marks}% in {subj.subject_name}. Targeted practice "
                        f"recommended to strengthen mastery before examinations."
                    )
                else:
                    prio = RecommendationPriority.LOW.value
                    reason = (
                        f"Solid foundation in {subj.subject_name} ({subj.average_marks}%). "
                        f"Advance to higher-order problem solving."
                    )

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

    # Fallback to standard introductory curriculum if no exam history exists
    if not new_recs:
        all_chapters = db.execute(
            select(SubjectChapter).order_by(SubjectChapter.order_index.asc())
        ).scalars().all()
        for ch in all_chapters[:4]:
            top = db.execute(
                select(ChapterTopic).where(ChapterTopic.chapter_id == ch.id)
            ).scalars().first()
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


def get_topic_mastery_matrix(student_id: uuid.UUID, db: Session) -> TopicMasteryMatrixResponse:
    """Returns overall student mastery across all curriculum topics."""
    all_topics = db.execute(
        select(ChapterTopic, SubjectChapter, Subject)
        .join(SubjectChapter, ChapterTopic.chapter_id == SubjectChapter.id)
        .join(Subject, SubjectChapter.subject_id == Subject.id)
        .order_by(Subject.name.asc(), SubjectChapter.chapter_number.asc(), ChapterTopic.order_index.asc())
    ).all()

    masteries = db.execute(
        select(AITopicMastery).where(AITopicMastery.student_id == student_id)
    ).scalars().all()
    mastery_map = {m.topic_id: m for m in masteries}

    items: list[TopicMasteryItemResponse] = []
    mastered_count = 0
    in_progress_count = 0
    needs_practice_count = 0

    for top, ch, subj in all_topics:
        m = mastery_map.get(top.id)
        level = m.mastery_level if m else TopicMasteryLevel.NOT_STARTED.value
        accuracy = m.accuracy_percentage if m else 0.0
        attempts = m.attempts_count if m else 0
        consec = m.consecutive_correct if m else 0
        last_dt = m.last_assessed_at if m else None

        if level == TopicMasteryLevel.MASTERED.value:
            mastered_count += 1
        elif level in (TopicMasteryLevel.IN_PROGRESS.value, TopicMasteryLevel.IMPROVING.value):
            in_progress_count += 1
        elif level == TopicMasteryLevel.NEEDS_PRACTICE.value:
            needs_practice_count += 1

        items.append(TopicMasteryItemResponse(
            topic_id=top.id,
            topic_title=top.title,
            chapter_title=ch.title,
            subject_name=subj.name,
            mastery_level=level,
            accuracy_percentage=accuracy,
            attempts_count=attempts,
            consecutive_correct=consec,
            last_assessed_at=last_dt,
        ))

    return TopicMasteryMatrixResponse(
        total_topics=len(all_topics),
        mastered_count=mastered_count,
        in_progress_count=in_progress_count,
        needs_practice_count=needs_practice_count,
        topics=items,
    )
