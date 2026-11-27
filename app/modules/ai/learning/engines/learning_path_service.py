import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.academics.classroom_models import Subject
from app.modules.academics.structure_models import StudentEnrollment
from app.modules.ai.learning.models import (
    SubjectChapter,
    ChapterTopic,
    AITopicMastery,
    TopicMasteryLevel,
    RecommendationPriority,
    RecommendationStatus,
)
from app.modules.ai.learning.dtos import LearningRecommendationDTO
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
    """Updates topic mastery metrics based on practice performance."""
    mastery = get_or_create_topic_mastery(student_id, topic_id, db)

    mastery.attempts_count += 1
    if is_correct:
        mastery.consecutive_correct += 1
    else:
        mastery.consecutive_correct = 0

    # Dynamic accuracy adjustment
    if mastery.attempts_count > 0:
        prev_correct = round(mastery.accuracy_percentage * (mastery.attempts_count - 1) / 100.0)
        new_correct = prev_correct + (1 if is_correct else 0)
        mastery.accuracy_percentage = round((new_correct / mastery.attempts_count) * 100.0, 1)

    # Classify mastery level
    if mastery.accuracy_percentage >= 85.0 and mastery.attempts_count >= 5:
        mastery.mastery_level = TopicMasteryLevel.MASTERED.value
    elif mastery.accuracy_percentage >= 70.0 and mastery.attempts_count >= 3:
        mastery.mastery_level = TopicMasteryLevel.IMPROVING.value
    elif mastery.attempts_count >= 2 and mastery.accuracy_percentage < 50.0:
        mastery.mastery_level = TopicMasteryLevel.NEEDS_PRACTICE.value
    elif mastery.attempts_count > 0:
        mastery.mastery_level = TopicMasteryLevel.IN_PROGRESS.value

    mastery.last_assessed_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(mastery)
    return mastery


def get_topic_mastery_matrix(
    student_id: uuid.UUID, subject_id: uuid.UUID | None, db: Session
) -> TopicMasteryMatrixResponse:
    """Returns matrix of mastered, in-progress, and needs-practice topics."""
    query = (
        select(AITopicMastery, ChapterTopic, SubjectChapter, Subject)
        .join(ChapterTopic, AITopicMastery.topic_id == ChapterTopic.id)
        .join(SubjectChapter, ChapterTopic.chapter_id == SubjectChapter.id)
        .join(Subject, SubjectChapter.subject_id == Subject.id)
        .where(AITopicMastery.student_id == student_id)
    )
    if subject_id:
        query = query.where(Subject.id == subject_id)

    rows = db.execute(query).all()

    items: list[TopicMasteryItemResponse] = []
    level_counts = {
        "MASTERED": 0,
        "IMPROVING": 0,
        "NEEDS_PRACTICE": 0,
        "IN_PROGRESS": 0,
        "NOT_STARTED": 0,
    }

    if not rows:
        curric_query = (
            select(ChapterTopic, SubjectChapter, Subject)
            .join(SubjectChapter, ChapterTopic.chapter_id == SubjectChapter.id)
            .join(Subject, SubjectChapter.subject_id == Subject.id)
        )
        if subject_id:
            curric_query = curric_query.where(Subject.id == subject_id)
        curric_rows = db.execute(curric_query).all()
        for topic, chapter, subj in curric_rows:
            level_counts["NOT_STARTED"] += 1
            items.append(
                TopicMasteryItemResponse(
                    topic_id=topic.id,
                    topic_title=topic.title,
                    chapter_id=chapter.id,
                    chapter_title=chapter.title,
                    subject_id=subj.id,
                    subject_name=subj.name,
                    mastery_level="NOT_STARTED",
                    accuracy_percentage=0.0,
                    attempts_count=0,
                    consecutive_correct=0,
                    last_assessed_at=None,
                )
            )
    else:
        for mastery, topic, chapter, subj in rows:
            level_counts[mastery.mastery_level] = level_counts.get(mastery.mastery_level, 0) + 1
            items.append(
                TopicMasteryItemResponse(
                    topic_id=topic.id,
                    topic_title=topic.title,
                    chapter_id=chapter.id,
                    chapter_title=chapter.title,
                    subject_id=subj.id,
                    subject_name=subj.name,
                    mastery_level=mastery.mastery_level,
                    accuracy_percentage=mastery.accuracy_percentage,
                    attempts_count=mastery.attempts_count,
                    last_assessed_at=mastery.last_assessed_at,
                )
            )

    total_topics = len(items)
    overall_pct = (
        round((level_counts["MASTERED"] / total_topics * 100.0), 1) if total_topics > 0 else 0.0
    )

    return TopicMasteryMatrixResponse(
        total_topics=total_topics,
        mastered_count=level_counts["MASTERED"],
        in_progress_count=level_counts["IN_PROGRESS"] + level_counts["IMPROVING"],
        needs_practice_count=level_counts["NEEDS_PRACTICE"],
        topics=items,
    )


def ensure_learning_recommendations(
    student: Student, subject_summaries: list[SubjectPerformanceSummary], db: Session
) -> list[LearningRecommendationDTO]:
    """Redirects to main service implementation."""
    from app.modules.ai.learning.service import ensure_learning_recommendations as elr
    return elr(student, subject_summaries, db)


def get_student_subjects_detail(student_id: uuid.UUID, db: Session) -> list[SubjectLearningDetail]:
    """Redirects to main service implementation."""
    from app.modules.ai.learning.service import get_student_subjects_detail as gsd
    return gsd(student_id, db)
