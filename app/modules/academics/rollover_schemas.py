import datetime as dt
import uuid
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class RolloverCohortMappingItem(BaseModel):
    source_grade_id: uuid.UUID
    source_grade_name: str
    target_grade_id: Optional[uuid.UUID] = None
    target_grade_name: Optional[str] = None
    student_count: int
    target_sections_available: int
    fee_structure_configured: bool


class RolloverPreviewResponse(BaseModel):
    source_year_id: uuid.UUID
    source_year_name: str
    target_year_id: uuid.UUID
    target_year_name: str
    total_active_students: int
    cohort_mappings: list[RolloverCohortMappingItem]
    is_ready_to_rollover: bool
    warnings: list[str] = []


class RolloverGradeMappingInput(BaseModel):
    source_grade_id: uuid.UUID
    target_grade_id: Optional[uuid.UUID] = None  # None indicates graduating class
    default_target_section_id: Optional[uuid.UUID] = None


class RolloverStudentOverrideInput(BaseModel):
    student_id: uuid.UUID
    action: str = Field(..., description="'PROMOTE', 'REPEAT', 'LEFT'")
    target_section_id: Optional[uuid.UUID] = None


class RolloverExecutionRequest(BaseModel):
    source_year_id: uuid.UUID
    target_year_id: uuid.UUID
    grade_mappings: list[RolloverGradeMappingInput]
    student_overrides: list[RolloverStudentOverrideInput] = []
    auto_assign_base_fees: bool = True


class RolloverExecutionResponse(BaseModel):
    source_year_id: uuid.UUID
    target_year_id: uuid.UUID
    total_processed: int
    promoted_count: int
    repeated_count: int
    graduated_left_count: int
    fee_assignments_created_count: int
    executed_at: dt.datetime
    status: str

