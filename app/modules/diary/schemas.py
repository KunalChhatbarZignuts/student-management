import datetime as dt
import uuid
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class AppBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        populate_by_name=True,
    )


class DiaryAttachment(AppBaseModel):
    name: str
    url: str
    file_type: str = "pdf"
    file_size: int = 0


# --- Entry Schemas ---

class DiaryEntryCreate(AppBaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    entry_type: str = Field(
        default="DAILY_UPDATE",
        description="DAILY_UPDATE, HOMEWORK, ACADEMIC, BEHAVIOUR, ATTENDANCE, ACHIEVEMENT, POSITIVE_FEEDBACK, IMPROVEMENT, NOTICE, PARENT_MEETING, GENERAL, CUSTOM",
    )
    category: str | None = Field(default=None, max_length=50)
    entry_date: dt.date = Field(default_factory=dt.date.today)
    due_date: dt.date | None = None
    grade_id: uuid.UUID | None = None
    section_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    visibility: str = Field(
        default="STUDENT_AND_PARENT",
        description="STUDENT_AND_PARENT, PARENT_ONLY, STUDENT_ONLY",
    )
    requires_acknowledgement: bool = False
    is_conversation_allowed: bool = True
    status: str = Field(default="PUBLISHED", description="DRAFT, PUBLISHED")
    internal_notes: str | None = None
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    student_ids: list[uuid.UUID] = Field(
        default_factory=list,
        description="Specific recipient student IDs. If empty and section_id is provided, all students in that section are recipients.",
    )


class DiaryEntryUpdate(AppBaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    entry_type: str | None = None
    category: str | None = None
    entry_date: dt.date | None = None
    due_date: dt.date | None = None
    grade_id: uuid.UUID | None = None
    section_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    visibility: str | None = None
    requires_acknowledgement: bool | None = None
    is_conversation_allowed: bool | None = None
    status: str | None = None
    internal_notes: str | None = None
    attachments: list[dict[str, Any]] | None = None
    student_ids: list[uuid.UUID] | None = None


class DiaryRetractRequest(AppBaseModel):
    reason: str = Field(..., min_length=1, max_length=255)


# --- Recipient & Acknowledgement Schemas ---

class DiaryRecipientDetail(AppBaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    student_code: str | None = None
    class_name: str | None = None
    section_name: str | None = None
    is_read: bool = False
    read_at: dt.datetime | None = None
    is_acknowledged: bool = False
    acknowledged_at: dt.datetime | None = None
    parent_name: str | None = None


class DiaryAcknowledgementCreate(AppBaseModel):
    student_id: uuid.UUID
    notes: str | None = Field(default=None, max_length=255)


class DiaryAcknowledgementResponse(AppBaseModel):
    id: uuid.UUID
    diary_entry_id: uuid.UUID
    parent_id: uuid.UUID
    parent_name: str
    student_id: uuid.UUID
    student_name: str
    acknowledged_at: dt.datetime
    notes: str | None = None


# --- Entry Response ---

class DiaryEntryResponse(AppBaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    teacher_name: str
    title: str
    description: str
    entry_type: str
    category: str | None = None
    entry_date: dt.date
    due_date: dt.date | None = None
    visibility: str
    requires_acknowledgement: bool
    is_conversation_allowed: bool
    status: str
    published_at: dt.datetime | None = None
    retracted_at: dt.datetime | None = None
    retraction_reason: str | None = None
    grade_id: uuid.UUID | None = None
    grade_name: str | None = None
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    subject_id: uuid.UUID | None = None
    subject_name: str | None = None
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    created_at: dt.datetime
    updated_at: dt.datetime
    internal_notes: str | None = None  # Populated only for teacher/admin

    # Aggregates / Status relative to viewer
    total_recipients: int = 0
    read_count: int = 0
    acknowledged_count: int = 0
    is_read_by_student: bool | None = None
    is_acknowledged: bool | None = None
    acknowledgement_id: uuid.UUID | None = None
    conversation_id: uuid.UUID | None = None
    target_student_id: uuid.UUID | None = None
    target_student_name: str | None = None


# --- Conversation & Messaging Schemas ---

class DiaryMessageCreate(AppBaseModel):
    message: str = Field(..., min_length=1)
    attachments: list[dict[str, Any]] = Field(default_factory=list)


class DiaryMessageResponse(AppBaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_user_id: uuid.UUID
    sender_role: str
    sender_name: str
    message: str
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    is_read: bool = False
    read_at: dt.datetime | None = None
    created_at: dt.datetime


class DiaryConversationResponse(AppBaseModel):
    id: uuid.UUID
    diary_entry_id: uuid.UUID
    entry_title: str
    student_id: uuid.UUID
    student_name: str
    parent_id: uuid.UUID
    parent_name: str
    teacher_id: uuid.UUID
    teacher_name: str
    status: str  # OPEN, RESOLVED, CLOSED
    resolved_at: dt.datetime | None = None
    resolved_by_name: str | None = None
    resolution_notes: str | None = None
    created_at: dt.datetime
    messages: list[DiaryMessageResponse] = Field(default_factory=list)
    unread_count: int = 0


class DiaryConversationResolve(AppBaseModel):
    resolution_notes: str | None = Field(default=None, max_length=255)


# --- Notification Schemas ---

class DiaryNotificationResponse(AppBaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    content: str
    event_type: str
    reference_id: uuid.UUID
    reference_type: str
    is_read: bool
    created_at: dt.datetime


# --- Summary Dashboard Schemas ---

class DiaryStatsSummary(AppBaseModel):
    total_entries: int = 0
    published_entries: int = 0
    draft_entries: int = 0
    pending_acknowledgements: int = 0
    open_conversations: int = 0
    homework_count: int = 0
    today_count: int = 0
