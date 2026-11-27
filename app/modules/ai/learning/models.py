import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.modules.ai.learning.dtos import (
    LearningRecommendationDTO as AILearningRecommendation,
    DailyStudyPlanDTO as AIDailyStudyPlan,
    StudyPlanItemDTO as AIStudyPlanItem,
    StudentStudySettingsDTO as AIStudentStudySettings,
)
from app.modules.ai.learning.schemas import StudySessionResponse as AIStudySession

if TYPE_CHECKING:
    from app.modules.academics.structure_models import AcademicYear, Grade
    from app.modules.academics.classroom_models import Subject
    from app.modules.students.models import Student
    from app.modules.examinations.models import Examination

JsonType = JSON().with_variant(JSONB, "postgresql")


class TopicMasteryLevel(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    RECOMMENDED = "RECOMMENDED"
    IN_PROGRESS = "IN_PROGRESS"
    NEEDS_PRACTICE = "NEEDS_PRACTICE"
    IMPROVING = "IMPROVING"
    MASTERED = "MASTERED"


class RecommendationPriority(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RecommendationStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    NEED_PRACTICE = "NEED_PRACTICE"


class StudyPlanStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"
    COMPLETED = "COMPLETED"


class RoutineActivityType(str, enum.Enum):
    REVISION = "REVISION"
    PRACTICE_QUIZ = "PRACTICE_QUIZ"
    CONCEPT_LEARNING = "CONCEPT_LEARNING"
    HOMEWORK = "HOMEWORK"
    READING = "READING"
    PROBLEM_SOLVING = "PROBLEM_SOLVING"
    MOCK_TEST = "MOCK_TEST"
    FLASHCARDS = "FLASHCARDS"
    CUSTOM_ACTIVITY = "CUSTOM_ACTIVITY"
    CONCEPT_REVIEW = "CONCEPT_REVIEW"
    EXAM_PREPARATION = "EXAM_PREPARATION"


class RoutineActivityStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"
    SKIPPED = "SKIPPED"


class RoutineActivityPriority(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class StudySessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SubjectChapter(TimestampMixin, Base):
    __tablename__ = "subject_chapters"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    grade_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("grades.id", ondelete="SET NULL"), nullable=True, index=True
    )
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    subject: Mapped["Subject"] = relationship("Subject")
    grade: Mapped["Grade | None"] = relationship("Grade")
    topics: Mapped[list["ChapterTopic"]] = relationship(
        "ChapterTopic", back_populates="chapter", cascade="all, delete-orphan", order_by="ChapterTopic.order_index"
    )

    __table_args__ = (
        UniqueConstraint("subject_id", "grade_id", "chapter_number", name="uq_subject_grade_chapter_num"),
        Index("ix_subject_chapters_subject_grade", "subject_id", "grade_id"),
    )

    def __repr__(self) -> str:
        return f"<SubjectChapter {self.chapter_number}: {self.title}>"


class ChapterTopic(TimestampMixin, Base):
    __tablename__ = "chapter_topics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subject_chapters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    learning_objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty_level: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    prerequisite_topic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("chapter_topics.id", ondelete="SET NULL"), nullable=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    chapter: Mapped["SubjectChapter"] = relationship("SubjectChapter", back_populates="topics")
    prerequisite: Mapped["ChapterTopic | None"] = relationship("ChapterTopic", remote_side=[id])

    __table_args__ = (
        Index("ix_chapter_topics_chapter", "chapter_id"),
    )

    def __repr__(self) -> str:
        return f"<ChapterTopic {self.title}>"


class AIPracticeSession(TimestampMixin, Base):
    __tablename__ = "ai_practice_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chapter_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subject_chapters.id", ondelete="SET NULL"), nullable=True
    )
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    chapter_title: Mapped[str] = mapped_column(String(200), nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    chapter: Mapped["SubjectChapter | None"] = relationship("SubjectChapter")
    questions: Mapped[list["AIPracticeQuestion"]] = relationship(
        "AIPracticeQuestion", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_ai_practice_sessions_student", "student_id"),
    )

    def __repr__(self) -> str:
        return f"<AIPracticeSession student={self.student_id} {self.subject_name} ({self.score_percentage}%)>"


class AIPracticeQuestion(TimestampMixin, Base):
    __tablename__ = "ai_practice_questions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ai_practice_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[Any] = mapped_column(JsonType, nullable=False)  # list of 4 strings
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    selected_option_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Relationships
    session: Mapped["AIPracticeSession"] = relationship("AIPracticeSession", back_populates="questions")

    def __repr__(self) -> str:
        return f"<AIPracticeQuestion session={self.session_id}>"


class AITopicMastery(TimestampMixin, Base):
    __tablename__ = "v_ai_topic_masteries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("chapter_topics.id", ondelete="CASCADE"), nullable=False
    )
    mastery_level: Mapped[str] = mapped_column(
        String(30), nullable=False, default=TopicMasteryLevel.NOT_STARTED.value
    )
    accuracy_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    consecutive_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_assessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    topic: Mapped["ChapterTopic"] = relationship("ChapterTopic")

    def __repr__(self) -> str:
        return f"<AITopicMastery student={self.student_id} topic={self.topic_id} level={self.mastery_level}>"


class AIStudentMistake(TimestampMixin, Base):
    __tablename__ = "v_ai_student_mistakes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("chapter_topics.id", ondelete="SET NULL"), nullable=True
    )
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    topic_title: Mapped[str] = mapped_column(String(200), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    student_answer: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    misconception_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    topic: Mapped["ChapterTopic | None"] = relationship("ChapterTopic")

    def __repr__(self) -> str:
        return f"<AIStudentMistake student={self.student_id} resolved={self.is_resolved}>"
