import uuid
from datetime import date, datetime, time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OnlineClassCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Title of the online class")
    description: str | None = Field(None, max_length=2000, description="Optional class overview / syllabus")
    scheduled_date: date = Field(..., description="Date on which the class takes place")
    start_time: time = Field(..., description="Start time (HH:MM:SS)")
    expected_duration_minutes: int = Field(60, ge=15, le=360, description="Expected duration in minutes")
    student_ids: list[uuid.UUID] = Field(default_factory=list, description="Independent list of authorized student IDs")
    is_recording_enabled: bool = Field(False, description="Whether recording is enabled for the class")
    allow_student_mic: bool = Field(True, description="Whether students can unmute their microphones")
    allow_student_cam: bool = Field(True, description="Whether students can turn on their cameras")
    allow_student_chat: bool = Field(True, description="Whether in-room text chat is enabled")
    allow_student_whiteboard: bool = Field(False, description="Whether students can draw on the interactive whiteboard")
    settings: dict[str, Any] = Field(default_factory=dict, description="Additional custom settings")


class OnlineClassUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = Field(None, max_length=2000)
    scheduled_date: date | None = None
    start_time: time | None = None
    expected_duration_minutes: int | None = Field(None, ge=15, le=360)
    student_ids: list[uuid.UUID] | None = None
    is_recording_enabled: bool | None = None
    allow_student_mic: bool | None = None
    allow_student_cam: bool | None = None
    allow_student_chat: bool | None = None
    allow_student_whiteboard: bool | None = None
    settings: dict[str, Any] | None = None


class OnlineClassPermissionsUpdate(BaseModel):
    allow_student_mic: bool | None = None
    allow_student_cam: bool | None = None
    allow_student_chat: bool | None = None
    allow_student_whiteboard: bool | None = None


class AdminOnlineClassCreate(OnlineClassCreate):
    teacher_id: uuid.UUID = Field(..., description="Teacher assigned to lead the class")


class OnlineClassParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    student_code: str
    first_name: str
    last_name: str
    status: str


class OnlineClassResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    teacher_id: uuid.UUID
    teacher_name: str
    title: str
    description: str | None = None
    room_name: str
    scheduled_date: date
    start_time: time
    expected_duration_minutes: int
    status: str
    is_recording_enabled: bool
    allow_student_mic: bool
    allow_student_cam: bool
    allow_student_chat: bool
    allow_student_whiteboard: bool
    participant_count: int
    live_participants_count: int = 0
    is_room_active: bool = False
    created_at: datetime
    updated_at: datetime


class OnlineClassDetailResponse(OnlineClassResponse):
    participants: list[OnlineClassParticipantResponse] = Field(default_factory=list)
    recording_count: int = 0
    latest_session_id: uuid.UUID | None = None


class OnlineClassListResponse(BaseModel):
    items: list[OnlineClassResponse]
    total: int
    page: int
    size: int


class OnlineClassStatsResponse(BaseModel):
    total_classes: int
    upcoming_classes: int
    live_classes: int
    completed_classes: int
    cancelled_classes: int
    total_recordings: int
    total_participants: int


class PreJoinResponse(BaseModel):
    class_id: uuid.UUID
    title: str
    description: str | None = None
    teacher_name: str
    room_name: str
    status: str
    scheduled_date: date
    start_time: time
    can_join: bool
    block_reason: str | None = None
    allow_student_mic: bool
    allow_student_cam: bool
    allow_student_chat: bool
    allow_student_whiteboard: bool


class MeetingTokenResponse(BaseModel):
    token: str
    livekit_url: str
    room_name: str
    participant_identity: str
    participant_name: str
    participant_role: str
    expires_at: datetime


class CreateRecordingRequest(BaseModel):
    duration_seconds: int = Field(default=0, ge=0)
    file_size_bytes: int = Field(default=0, ge=0)
    file_name: str | None = None


class RecordingResponse(BaseModel):
    id: uuid.UUID
    online_class_id: uuid.UUID
    class_title: str
    teacher_name: str
    file_name: str
    file_size_bytes: int
    duration_seconds: int
    processing_status: str
    is_published: bool
    retention_until: datetime | None = None
    created_at: datetime
    stream_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RecordingListResponse(BaseModel):
    items: list[RecordingResponse]
    total: int
    page: int
    size: int

