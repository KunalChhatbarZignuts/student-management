import datetime as dt
import uuid
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# Fee Component Schemas
# ==========================================

class FeeComponentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    description: str | None = None
    fee_type: str = Field(default="tuition")  # tuition, admission, transport, activity, exam, other
    payment_frequency: str = Field(default="annual")  # one_time, monthly, quarterly, half_yearly, annual
    is_mandatory: bool = True
    is_recurring: bool = False
    status: str = Field(default="active")


class FeeComponentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    fee_type: str | None = None
    payment_frequency: str | None = None
    is_mandatory: bool | None = None
    is_recurring: bool | None = None
    status: str | None = None


class FeeComponentResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    description: str | None = None
    fee_type: str
    payment_frequency: str
    is_mandatory: bool
    is_recurring: bool
    status: str
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Fee Structure Schemas
# ==========================================

class FeeStructureItemCreate(BaseModel):
    fee_component_id: uuid.UUID
    amount: Decimal = Field(..., ge=0)
    payment_frequency: str = Field(default="annual")
    is_mandatory: bool = True
    display_order: int = 0


class FeeStructureItemResponse(BaseModel):
    id: uuid.UUID
    fee_structure_id: uuid.UUID
    fee_component_id: uuid.UUID
    component_name: str | None = None
    component_code: str | None = None
    amount: Decimal
    payment_frequency: str
    is_mandatory: bool
    display_order: int

    model_config = ConfigDict(from_attributes=True)


class FeeStructureCreate(BaseModel):
    academic_year_id: uuid.UUID
    grade_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    currency: str = Field(default="INR")
    status: str = Field(default="active")
    effective_date: dt.date = Field(default_factory=dt.date.today)
    items: list[FeeStructureItemCreate] = Field(default_factory=list)


class FeeStructureUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    effective_date: dt.date | None = None
    items: list[FeeStructureItemCreate] | None = None


class FeeStructureResponse(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    grade_id: uuid.UUID
    grade_name: str | None = None
    name: str
    description: str | None = None
    total_amount: Decimal
    currency: str
    status: str
    effective_date: dt.date
    created_by_user_id: uuid.UUID | None = None
    items: list[FeeStructureItemResponse] = Field(default_factory=list)
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class FeeStructureListItem(BaseModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    grade_id: uuid.UUID
    grade_name: str | None = None
    name: str
    total_amount: Decimal
    currency: str
    status: str
    effective_date: dt.date
    items_count: int = 0
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Adjustment & Installment Schemas
# ==========================================

class StudentFeeAdjustmentCreate(BaseModel):
    adjustment_type: str = Field(
        ...,
        description="DISCOUNT_PERCENTAGE, DISCOUNT_FIXED, CONCESSION_SCHOLARSHIP, CONCESSION_FINANCIAL, CONCESSION_SPECIAL, ADDITIONAL_CHARGE",
    )
    category: str = Field(..., description="discount, concession, additional_charge")
    description: str = Field(..., min_length=2, description="Reason for adjustment")
    calculation_type: str = Field(default="fixed", description="percentage or fixed")
    rate: Decimal | None = Field(default=None, ge=0, le=100)
    amount: Decimal = Field(..., ge=0)


class StudentFeeAdjustmentResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    adjustment_type: str
    category: str
    description: str
    calculation_type: str
    rate: Decimal | None = None
    amount: Decimal
    created_by_user_id: uuid.UUID | None = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class FeeInstallmentResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    installment_number: int
    installment_name: str
    due_date: dt.date
    amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)


class StudentFeeAssignmentItemResponse(BaseModel):
    id: uuid.UUID
    fee_component_id: uuid.UUID
    component_name: str
    amount: Decimal
    payment_frequency: str
    is_mandatory: bool
    is_selected: bool

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Student Fee Assignment Schemas
# ==========================================

class AdmissionFeeAssignmentPayload(BaseModel):
    fee_structure_id: uuid.UUID
    selected_component_ids: list[uuid.UUID] = Field(default_factory=list)
    adjustments: list[StudentFeeAdjustmentCreate] = Field(default_factory=list)
    installment_frequency: str = Field(default="annual")  # annual, half_yearly, quarterly, monthly, one_time
    notes: str | None = None


class StudentFeeAssignmentResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str | None = None
    student_code: str | None = None
    enrollment_number: str | None = None
    academic_year_id: uuid.UUID
    academic_year_name: str | None = None
    grade_id: uuid.UUID
    grade_name: str | None = None
    fee_structure_id: uuid.UUID
    fee_structure_name: str | None = None
    admission_id: uuid.UUID | None = None
    base_amount: Decimal
    total_discount: Decimal
    total_additional: Decimal
    final_payable_amount: Decimal
    currency: str
    installment_frequency: str
    status: str
    assigned_date: dt.date
    notes: str | None = None
    items: list[StudentFeeAssignmentItemResponse] = Field(default_factory=list)
    adjustments: list[StudentFeeAdjustmentResponse] = Field(default_factory=list)
    installments: list[FeeInstallmentResponse] = Field(default_factory=list)
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class StudentFeeAssignmentListItem(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    student_code: str
    enrollment_number: str | None = None
    grade_name: str
    academic_year_name: str
    base_amount: Decimal
    total_discount: Decimal
    total_additional: Decimal
    final_payable_amount: Decimal
    currency: str
    status: str
    assigned_date: dt.date
    installments_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PaginatedFeeAssignmentsResponse(BaseModel):
    items: list[StudentFeeAssignmentListItem]
    total: int
    skip: int
    limit: int


# ==========================================
# Simulation & Dashboard Schemas
# ==========================================

class FeeCalculationRequest(BaseModel):
    fee_structure_id: uuid.UUID
    selected_component_ids: list[uuid.UUID] = Field(default_factory=list)
    adjustments: list[StudentFeeAdjustmentCreate] = Field(default_factory=list)
    installment_frequency: str = Field(default="annual")
    start_date: dt.date | None = None


class InstallmentSchedulePreview(BaseModel):
    installment_number: int
    installment_name: str
    due_date: dt.date
    amount: Decimal


class FeeCalculationResponse(BaseModel):
    base_amount: Decimal
    total_discount: Decimal
    total_additional: Decimal
    final_payable_amount: Decimal
    currency: str
    installment_frequency: str
    installments: list[InstallmentSchedulePreview]


class FeeDashboardMetricsResponse(BaseModel):
    total_assigned_fees: Decimal
    total_collected_fees: Decimal
    total_outstanding_fees: Decimal
    total_active_structures: int
    total_student_assignments: int
    grade_wise_summaries: list[dict]

