import datetime as dt
import uuid
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# Dashboard & Overview Schemas
# ==========================================

class GradeDistributionItem(BaseModel):
    grade_id: uuid.UUID
    grade_name: str
    level: int
    enrolled_count: int
    sections_count: int


class SectionDistributionItem(BaseModel):
    section_id: uuid.UUID
    section_name: str
    grade_name: str
    enrolled_count: int
    capacity: int | None = None
    class_teacher_name: str | None = None


class EnrollmentDashboardMetrics(BaseModel):
    total_enrolled: int
    unassigned_students: int
    transferred_students: int
    promoted_students: int
    inactive_students: int
    grade_distribution: list[GradeDistributionItem]
    section_distribution: list[SectionDistributionItem]


class UnassignedStudentItem(BaseModel):
    student_id: uuid.UUID
    student_code: str
    enrollment_number: str | None = None
    first_name: str
    last_name: str
    gender: str | None = None
    admission_date: dt.date
    department: str

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Bulk Enrollment Schemas
# ==========================================

class BulkEnrollmentRequest(BaseModel):
    student_ids: list[uuid.UUID] = Field(..., min_length=1)
    academic_year_id: uuid.UUID
    grade_id: uuid.UUID
    section_id: uuid.UUID
    enrollment_date: dt.date | None = None


class BulkEnrollmentResponse(BaseModel):
    enrolled_count: int
    section_id: uuid.UUID
    section_name: str
    grade_name: str
    enrolled_student_ids: list[uuid.UUID]


# ==========================================
# Student Transfer Schemas
# ==========================================

class StudentTransferCreate(BaseModel):
    student_id: uuid.UUID
    target_section_id: uuid.UUID
    target_grade_id: uuid.UUID | None = None
    target_academic_year_id: uuid.UUID | None = None
    transfer_date: dt.date | None = None
    transfer_type: str = Field("SECTION_TRANSFER", pattern="^(SECTION_TRANSFER|GRADE_TRANSFER|YEAR_TRANSITION)$")
    reason: str = Field(..., min_length=3, max_length=255)
    remarks: str | None = Field(None, max_length=500)


class StudentTransferRecordResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    student_code: str
    from_academic_year_name: str
    to_academic_year_name: str
    from_grade_name: str | None = None
    to_grade_name: str | None = None
    from_section_name: str | None = None
    to_section_name: str | None = None
    transfer_date: dt.date
    transfer_type: str
    reason: str
    remarks: str | None = None
    performed_by_name: str | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Academic Promotion Wizard Schemas
# ==========================================

class PromotionStudentPreviewItem(BaseModel):
    student_id: uuid.UUID
    student_code: str
    first_name: str
    last_name: str
    current_roll_no: int
    current_grade_id: uuid.UUID
    current_grade_name: str
    current_section_id: uuid.UUID | None = None
    current_section_name: str | None = None
    exam_result: str | None = None  # PASS, FAIL, PENDING, NONE
    exam_percentage: float | None = None
    suggested_action: str = "PROMOTE"  # PROMOTE, REPEAT, RETAIN, LEFT
    is_eligible: bool = True


class PromotionPreviewRequest(BaseModel):
    source_academic_year_id: uuid.UUID
    source_grade_id: uuid.UUID
    source_section_id: uuid.UUID | None = None
    target_academic_year_id: uuid.UUID
    target_grade_id: uuid.UUID


class TargetSectionCapacityItem(BaseModel):
    section_id: uuid.UUID
    section_name: str
    capacity: int | None = None
    current_enrolled: int
    available_seats: int | None = None


class PromotionPreviewResponse(BaseModel):
    source_grade_name: str
    target_grade_name: str
    source_year_name: str
    target_year_name: str
    target_sections: list[TargetSectionCapacityItem]
    students: list[PromotionStudentPreviewItem]


class StudentPromotionDecision(BaseModel):
    student_id: uuid.UUID
    action: str = Field("PROMOTE", pattern="^(PROMOTE|REPEAT|LEFT)$")
    target_section_id: uuid.UUID | None = None
    reason: str | None = Field(None, max_length=255)


class PromotionExecuteRequest(BaseModel):
    source_academic_year_id: uuid.UUID
    target_academic_year_id: uuid.UUID
    target_grade_id: uuid.UUID
    effective_date: dt.date | None = None
    decisions: list[StudentPromotionDecision] = Field(..., min_length=1)


class PromotionExecuteResponse(BaseModel):
    promoted_count: int
    repeated_count: int
    left_count: int
    total_processed: int
    message: str


# ==========================================
# Enhanced Enrollment History
# ==========================================

class EnhancedEnrollmentHistoryItem(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    grade_id: uuid.UUID | None = None
    grade_name: str | None = None
    section_id: uuid.UUID | None = None
    section_name: str | None = None
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    roll_no: int
    class_teacher_name: str | None = None
    status: str
    enrollment_date: dt.date
    joined_on: dt.date
    left_on: dt.date | None = None
    reason: str | None = None
    remarks: str | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)

