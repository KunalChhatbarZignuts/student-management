import datetime as dt
import uuid
from typing import Optional
from pydantic import BaseModel


class AbsenceNotificationLogItem(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    admission_number: str
    grade_name: str
    section_name: str
    parent_id: Optional[uuid.UUID] = None
    parent_name: Optional[str] = None
    date: dt.date
    period: int
    channel: str
    recipient: Optional[str] = None
    status: str
    message: str
    error_message: Optional[str] = None
    sent_at: dt.datetime


class AbsenceNotificationSummary(BaseModel):
    total_triggered: int
    sent_count: int
    suppressed_holiday_count: int
    suppressed_no_contact_count: int
    failed_count: int
    logs: list[AbsenceNotificationLogItem]

