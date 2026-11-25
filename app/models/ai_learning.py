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

if TYPE_CHECKING:
    from app.models.academic_structure import AcademicYear, Grade
    from app.models.classroom import Subject
    from app.models.student import Student
    from app.models.examination import Examination

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


class AILearningProfile(TimestampMixin, Base):
    __tablename__ = "ai_learning_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    academic_year_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True
    )
    strong_subjects: Mapped[Any] = mapped_column(JsonType, nullable=False, default=list)
    weak_subjects: Mapped[Any] = mapped_column(JsonType, nullable=False, default=list)
    learning_pace: Mapped[str] = mapped_column(String(30), nullable=False, default="MODERATE")
    last_analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    academic_year: Mapped["AcademicYear | None"] = relationship("AcademicYear")

    def __repr__(self) -> str:
        return f"<AILearningProfile student={self.student_id}>"


class AILearningRecommendation(TimestampMixin, Base):
    __tablename__ = "ai_learning_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chapter_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subject_chapters.id", ondelete="SET NULL"), nullable=True
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("chapter_topics.id", ondelete="SET NULL"), nullable=True
    )
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    topic_title: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default=RecommendationPriority.MEDIUM.value)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=RecommendationStatus.NOT_STARTED.value)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    chapter: Mapped["SubjectChapter | None"] = relationship("SubjectChapter")
    topic: Mapped["ChapterTopic | None"] = relationship("ChapterTopic")

    __table_args__ = (
        Index("ix_ai_recs_student_status", "student_id", "status"),
        Index("ix_ai_recs_priority", "priority"),
    )

    def __repr__(self) -> str:
        return f"<AILearningRecommendation {self.subject_name} - {self.topic_title} ({self.priority})>"


class AIDailyStudyPlan(TimestampMixin, Base):
    __tablename__ = "ai_daily_study_plans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    total_planned_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=45)
    completed_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=StudyPlanStatus.PLANNED.value)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    items: Mapped[list["AIStudyPlanItem"]] = relationship(
        "AIStudyPlanItem", back_populates="plan", cascade="all, delete-orphan", order_by="AIStudyPlanItem.order_index"
    )

    __table_args__ = (
        UniqueConstraint("student_id", "plan_date", name="uq_student_daily_plan_date"),
        Index("ix_ai_study_plans_student_date", "student_id", "plan_date"),
    )

    def __repr__(self) -> str:
        return f"<AIDailyStudyPlan student={self.student_id} date={self.plan_date}>"


class AIStudyPlanItem(TimestampMixin, Base):
    __tablename__ = "ai_study_plan_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ai_daily_study_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    topic_title: Mapped[str] = mapped_column(String(200), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, default=RoutineActivityType.CONCEPT_LEARNING.value)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default=RoutineActivityPriority.MEDIUM.value)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=RoutineActivityStatus.PENDING.value)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_custom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_resource_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    exam_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("examinations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_rescheduled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    plan: Mapped["AIDailyStudyPlan"] = relationship("AIDailyStudyPlan", back_populates="items")
    examination: Mapped["Examination | None"] = relationship("Examination")
    sessions: Mapped[list["AIStudySession"]] = relationship(
        "AIStudySession", back_populates="plan_item", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<AIStudyPlanItem {self.subject_name}: {self.topic_title}>"


class AIStudySession(TimestampMixin, Base):
    __tablename__ = "ai_study_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("ai_study_plan_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=StudySessionStatus.ACTIVE.value)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accumulated_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    target_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=1500)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")
    plan_item: Mapped["AIStudyPlanItem"] = relationship("AIStudyPlanItem", back_populates="sessions")

    __table_args__ = (
        Index("ix_ai_study_sessions_student_status", "student_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<AIStudySession {self.id} student={self.student_id} status={self.status}>"


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


class AIStudentStudySettings(TimestampMixin, Base):
    __tablename__ = "ai_student_study_settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    weekday_daily_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=45)
    weekend_daily_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    preferred_study_time: Mapped[str] = mapped_column(String(30), nullable=False, default="EVENING")
    break_interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    student: Mapped["Student"] = relationship("Student")

    def __repr__(self) -> str:
        return f"<AIStudentStudySettings student={self.student_id}>"


class AITopicMastery(TimestampMixin, Base):
    __tablename__ = "ai_topic_masteries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("chapter_topics.id", ondelete="CASCADE"), nullable=False, index=True
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

    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", name="uq_student_topic_mastery"),
        Index("ix_ai_topic_masteries_student_level", "student_id", "mastery_level"),
    )

    def __repr__(self) -> str:
        return f"<AITopicMastery student={self.student_id} topic={self.topic_id} level={self.mastery_level}>"


class AIStudentMistake(TimestampMixin, Base):
    __tablename__ = "ai_student_mistakes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("chapter_topics.id", ondelete="SET NULL"), nullable=True, index=True
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

    __table_args__ = (
        Index("ix_ai_student_mistakes_student_status", "student_id", "is_resolved"),
    )

    def __repr__(self) -> str:
        return f"<AIStudentMistake student={self.student_id} resolved={self.is_resolved}>"


class AIWeeklyStudyPlan(TimestampMixin, Base):
    __tablename__ = "ai_weekly_study_plans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_planned_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    completed_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=StudyPlanStatus.PLANNED.value)

    # Relationships
    student: Mapped["Student"] = relationship("Student")

    __table_args__ = (
        UniqueConstraint("student_id", "week_start_date", name="uq_student_weekly_plan_date"),
        Index("ix_ai_weekly_study_plans_student_date", "student_id", "week_start_date"),
    )

    def __repr__(self) -> str:
        return f"<AIWeeklyStudyPlan student={self.student_id} week={self.week_start_date}>"
