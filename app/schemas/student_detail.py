import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, EmailStr


class StudentPersonalDetails(BaseModel):
    first_name: str
    middle_name: str | None = None
    last_name: str
    dob: date
    gender: str | None = None
    blood_group: str | None = None
    phone: str | None = None
    alternate_phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    postal_code: str | None = None
    profile_photo: str | None = None
    department: str | None = None
    status: str
    admission_date: date | None = None
    created_at: datetime
    # Linked User account status
    user_id: uuid.UUID
    user_status: str | None = None
    must_change_password: bool = False

    model_config = ConfigDict(from_attributes=True)


class StudentSubjectItem(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    department: str | None = None
    teacher_name: str | None = None


class StudentEnrollmentHistoryItem(BaseModel):
    id: uuid.UUID
    enrollment_number: str | None = None
    roll_number: str | None = None
    academic_year_name: str
    grade_name: str
    section_name: str
    status: str
    class_teacher_name: str | None = None
    enrolled_at: datetime


class StudentAcademicDetails(BaseModel):
    current_academic_year: str | None = None
    current_grade: str | None = None
    current_section: str | None = None
    current_roll_number: str | None = None
    current_enrollment_number: str | None = None
    class_teacher_name: str | None = None
    active_subjects: list[StudentSubjectItem] = []
    enrollment_history: list[StudentEnrollmentHistoryItem] = []


class StudentParentItem(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    relationship: str
    phone: str
    email: str | None = None
    is_primary_contact: bool = False
    is_emergency_contact: bool = False
    can_pickup: bool = False
    user_status: str | None = None


class StudentAdmissionDetails(BaseModel):
    application_number: str | None = None
    status: str | None = None
    admission_date: date | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    approved_at: datetime | None = None
    academic_year_name: str | None = None
    previous_school_name: str | None = None
    previous_school_details: str | None = None


class StudentDailyAttendanceItem(BaseModel):
    date: date
    status: str  # PRESENT, ABSENT, LATE, HALF_DAY, EXCUSED
    period_slot: str | None = None
    subject_name: str | None = None
    teacher_name: str | None = None
    remarks: str | None = None


class StudentAttendanceSummary(BaseModel):
    total_days: int = 0
    present_days: int = 0
    absent_days: int = 0
    late_days: int = 0
    excused_days: int = 0
    attendance_rate_percentage: float = 0.0
    recent_history: list[StudentDailyAttendanceItem] = []


class StudentLeaveApplicationItem(BaseModel):
    id: uuid.UUID
    start_date: date
    end_date: date
    days_count: int = 1
    leave_type: str = "Standard Leave"
    submission_role: str | None = None
    reason: str
    status: str  # PENDING, APPROVED, REJECTED
    reviewed_by_teacher_name: str | None = None
    reviewed_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime


class StudentFeeInstallmentItem(BaseModel):
    id: uuid.UUID
    installment_number: int
    installment_name: str | None = None
    due_date: date
    amount: Decimal
    paid_amount: Decimal
    balance: Decimal
    status: str  # PENDING, PARTIAL, PAID, OVERDUE


class StudentPaymentTransactionItem(BaseModel):
    id: uuid.UUID
    receipt_number: str | None = None
    payment_method: str
    amount: Decimal
    payment_date: datetime
    status: str
    reference_note: str | None = None


class StudentFeeSummary(BaseModel):
    has_fee_assignment: bool = False
    fee_structure_name: str | None = None
    academic_year_name: str | None = None
    currency: str = "USD"
    total_amount: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    net_amount: Decimal = Decimal("0.00")
    paid_amount: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")
    status: str | None = None
    installments: list[StudentFeeInstallmentItem] = []
    payments: list[StudentPaymentTransactionItem] = []


class StudentTimetableSlotItem(BaseModel):
    day_of_week: str  # MONDAY - FRIDAY
    period_name: str
    start_time: str
    end_time: str
    subject_name: str
    subject_code: str | None = None
    teacher_name: str | None = None
    room_number: str | None = None


class ComprehensiveStudentDetailResponse(BaseModel):
    student_id: uuid.UUID
    student_code: str
    enrollment_number: str | None = None
    personal_details: StudentPersonalDetails
    academic_details: StudentAcademicDetails
    parents: list[StudentParentItem] = []
    admission_details: StudentAdmissionDetails
    attendance_summary: StudentAttendanceSummary
    leave_applications: list[StudentLeaveApplicationItem] = []
    fees: StudentFeeSummary
    timetable: list[StudentTimetableSlotItem] = []
