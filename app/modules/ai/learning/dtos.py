import datetime as dt
import uuid
from typing import Any
from pydantic import BaseModel, Field

class LearningRecommendationDTO(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    chapter_id: uuid.UUID | None = None
    topic_id: uuid.UUID | None = None
    subject_name: str
    topic_title: str
    reason: str
    priority: str = "MEDIUM"
    estimated_minutes: int = 20
    status: str = "NOT_STARTED"
    order_index: int = 1
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))

class StudyPlanItemDTO(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    plan_id: uuid.UUID | None = None
    subject_name: str
    topic_title: str
    title: str | None = None
    description: str | None = None
    activity_type: str = "CONCEPT_LEARNING"
    priority: str = "MEDIUM"
    status: str = "PENDING"
    duration_minutes: int = 15
    is_completed: bool = False
    is_custom: bool = False
    time_spent_seconds: int = 0
    order_index: int = 0
    start_time: str | None = None
    end_time: str | None = None
    notes: str | None = None
    recommended_resource_url: str | None = None
    exam_id: uuid.UUID | None = None
    is_rescheduled: bool = False
    is_deleted: bool = False

class DailyStudyPlanDTO(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    student_id: uuid.UUID
    plan_date: dt.date = Field(default_factory=dt.date.today)
    total_planned_minutes: int = 45
    completed_minutes: int = 0
    remaining_minutes: int = 45
    completion_percentage: float = 0.0
    status: str = "PLANNED"
    notes: str | None = None
    is_archived: bool = False
    total_activities_count: int = 0
    completed_activities_count: int = 0
    pending_activities_count: int = 0
    items: list[StudyPlanItemDTO] = Field(default_factory=list)
    active_session: Any = None

class StudentStudySettingsDTO(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    student_id: uuid.UUID
    weekday_daily_minutes: int = 45
    weekend_daily_minutes: int = 90
    preferred_study_time: str = "EVENING"
    break_interval_minutes: int = 10
    notifications_enabled: bool = True
