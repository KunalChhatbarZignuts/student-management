import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.fee import (
    FeeCalculationRequest,
    FeeCalculationResponse,
    FeeComponentCreate,
    FeeComponentResponse,
    FeeComponentUpdate,
    FeeDashboardMetricsResponse,
    FeeReceiptResponse,
    FeeStructureCreate,
    FeeStructureListItem,
    FeeStructureResponse,
    PaginatedFeeAssignmentsResponse,
    PaginatedTransactionsResponse,
    PaginatedWebhookEventsResponse,
    PaymentOrderCreateRequest,
    PaymentOrderResponse,
    PaymentTransactionResponse,
    PaymentVerificationResponse,
    PaymentVerifyRequest,
    PaymentWebhookEventResponse,
    RecordOfflinePaymentRequest,
    StudentFeeAdjustmentCreate,
    StudentFeeAssignmentResponse,
    StudentPortalFeeScheduleResponse,
)
from app.services import fee_service

router = APIRouter(tags=["Fees Management"])

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)


# ==========================================
# Dashboard & Metrics
# ==========================================

@router.get(
    "/admin/fees/dashboard",
    response_model=FeeDashboardMetricsResponse,
    dependencies=[Depends(admin_only)],
)
def get_fees_dashboard(db: Session = Depends(get_db)):
    """Retrieve summarized fees metrics, totals, collections, and grade summaries."""
    return fee_service.get_fee_dashboard_metrics(db)


# ==========================================
# Fee Components
# ==========================================

@router.get(
    "/admin/fees/components",
    response_model=list[FeeComponentResponse],
    dependencies=[Depends(admin_only)],
)
def list_components(
    status: str | None = Query(None, description="active or inactive"),
    fee_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """List fee components in the catalog."""
    return fee_service.list_fee_components(db, status_filter=status, fee_type=fee_type)


@router.post(
    "/admin/fees/components",
    response_model=FeeComponentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_component(
    payload: FeeComponentCreate,
    db: Session = Depends(get_db),
):
    """Create a new fee component."""
    return fee_service.create_fee_component(payload, db)


@router.put(
    "/admin/fees/components/{component_id}",
    response_model=FeeComponentResponse,
    dependencies=[Depends(admin_only)],
)
def update_component(
    component_id: uuid.UUID,
    payload: FeeComponentUpdate,
    db: Session = Depends(get_db),
):
    """Update a fee component."""
    return fee_service.update_fee_component(component_id, payload, db)


@router.patch(
    "/admin/fees/components/{component_id}/status",
    response_model=FeeComponentResponse,
    dependencies=[Depends(admin_only)],
)
def toggle_component_status(
    component_id: uuid.UUID,
    status: str = Query(..., pattern="^(active|inactive)$"),
    db: Session = Depends(get_db),
):
    """Activate or deactivate a fee component."""
    return fee_service.update_fee_component(
        component_id, FeeComponentUpdate(status=status), db
    )


# ==========================================
# Fee Structures
# ==========================================

@router.get(
    "/admin/fees/structures",
    response_model=list[FeeStructureListItem],
    dependencies=[Depends(admin_only)],
)
def list_structures(
    academic_year_id: uuid.UUID | None = Query(None),
    grade_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """List configured grade-wise fee structures."""
    return fee_service.list_fee_structures(
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        status_filter=status,
        db=db,
    )


@router.get(
    "/admin/fees/structures/active",
    response_model=FeeStructureResponse | None,
    dependencies=[Depends(admin_only)],
)
def get_active_structure(
    grade_id: uuid.UUID = Query(...),
    academic_year_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
):
    """Retrieve the active fee structure for a given grade and academic year."""
    return fee_service.get_active_grade_fee_structure(grade_id, academic_year_id, db)


@router.get(
    "/admin/fees/structures/{structure_id}",
    response_model=FeeStructureResponse,
    dependencies=[Depends(admin_only)],
)
def get_structure_detail(
    structure_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get fee structure details including all itemized components."""
    return fee_service.get_fee_structure_detail(structure_id, db)


@router.post(
    "/admin/fees/structures",
    response_model=FeeStructureResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def create_structure(
    payload: FeeStructureCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new grade-wise fee structure with items."""
    return fee_service.create_fee_structure(payload, current_user.id, db)


@router.post(
    "/admin/fees/simulate",
    response_model=FeeCalculationResponse,
    dependencies=[Depends(admin_only)],
)
def simulate_fee_calculation(
    payload: FeeCalculationRequest,
    db: Session = Depends(get_db),
):
    """Live simulation of base fees, adjustments, final amount, and installments schedule."""
    return fee_service.simulate_fee_calculation(payload, db)


# ==========================================
# Student Fee Assignments
# ==========================================

@router.get(
    "/admin/fees/assignments",
    response_model=PaginatedFeeAssignmentsResponse,
    dependencies=[Depends(admin_only)],
)
def list_student_assignments(
    academic_year_id: uuid.UUID | None = Query(None),
    grade_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List assigned student fee records with filters and search."""
    return fee_service.list_student_fee_assignments(
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        search=search,
        skip=skip,
        limit=limit,
        db=db,
    )


@router.get(
    "/admin/fees/assignments/{assignment_id}",
    response_model=StudentFeeAssignmentResponse,
    dependencies=[Depends(admin_only)],
)
def get_assignment_detail(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Retrieve full details of a student's fee assignment, items, adjustments, and installments."""
    return fee_service.get_student_fee_assignment_detail(assignment_id, db)


# ==========================================
# Helpers for Student / Parent Access Control
# ==========================================

def _get_student_for_user(user_id: uuid.UUID, db: Session) -> Student:
    student = db.execute(select(Student).where(Student.user_id == user_id)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user account",
        )
    return student


def _verify_parent_access(parent_user_id: uuid.UUID, student_id: uuid.UUID, db: Session) -> Student:
    parent = db.execute(select(Parent).where(Parent.user_id == parent_user_id)).scalar_one_or_none()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent profile not found for this account",
        )

    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.student_id == student_id,
        )
    ).scalar_one_or_none()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this child's fee records",
        )

    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


# ==========================================
# Online Payment Endpoints
# ==========================================

@router.post(
    "/payments/create-order",
    response_model=PaymentOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_order(
    payload: PaymentOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a gateway payment order for an installment."""
    if current_user.role == UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to make fee payments.",
        )

    student_id = None
    if current_user.role == UserRole.PARENT.value:
        # Resolve student from installment
        installment = db.get(fee_service.FeeInstallment, payload.installment_id)
        if not installment or not installment.assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")
        student = _verify_parent_access(current_user.id, installment.assignment.student_id, db)
        student_id = student.id
    elif current_user.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        installment = db.get(fee_service.FeeInstallment, payload.installment_id)
        if not installment or not installment.assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")
        student_id = installment.assignment.student_id
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    return fee_service.create_payment_order(payload, student_id, db)


@router.post(
    "/payments/verify",
    response_model=PaymentVerificationResponse,
)
def verify_payment(
    payload: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Client verification of gateway checkout signature (fallback before webhook)."""
    return fee_service.verify_client_payment(payload, db)


# ==========================================
# Webhook Endpoint (Raw Body & Header)
# ==========================================

@router.post(
    "/webhooks/payments/razorpay",
    status_code=status.HTTP_200_OK,
)
async def razorpay_payment_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db),
):
    """Receive and process payment gateway webhooks idempotently."""
    body_bytes = await request.body()
    return fee_service.process_webhook_event(body_bytes, x_razorpay_signature, db)


# ==========================================
# Student & Parent Portal Fee Schedules
# ==========================================

@router.get(
    "/student/fees/my-schedule",
    response_model=StudentPortalFeeScheduleResponse,
)
def get_my_fee_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student portal: view full assigned fee schedule (Students restricted per school policy)."""
    if current_user.role == UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to access fee schedules.",
        )
    if current_user.role not in (UserRole.PARENT.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")
    student = _get_student_for_user(current_user.id, db)
    return fee_service.get_student_portal_fee_schedule(student.id, db)


@router.get(
    "/parent/fees/child/{student_id}",
    response_model=StudentPortalFeeScheduleResponse,
)
def get_child_fee_schedule(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent portal: view linked child's fee schedule, installments, and receipts."""
    student = _verify_parent_access(current_user.id, student_id, db)
    return fee_service.get_student_portal_fee_schedule(student.id, db)


@router.get(
    "/fees/receipts/{receipt_number}",
    response_model=FeeReceiptResponse,
)
def get_fee_receipt(
    receipt_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View payment receipt details by receipt number."""
    if current_user.role == UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to view fee receipts.",
        )

    receipt = fee_service.get_fee_receipt_detail(receipt_number, db)

    # Permission check for parents
    if current_user.role == UserRole.PARENT.value:
        _verify_parent_access(current_user.id, receipt.student_id, db)

    return receipt


# ==========================================
# Admin Payment Management & Monitoring
# ==========================================

@router.get(
    "/admin/fees/transactions",
    response_model=PaginatedTransactionsResponse,
    dependencies=[Depends(admin_only)],
)
def list_transactions(
    academic_year_id: uuid.UUID | None = Query(None),
    grade_id: uuid.UUID | None = Query(None),
    student_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    payment_method: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Admin: filter and view payment transactions across online and offline channels."""
    return fee_service.list_payment_transactions(
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        student_id=student_id,
        status_filter=status,
        payment_method=payment_method,
        skip=skip,
        limit=limit,
        db=db,
    )


@router.post(
    "/admin/fees/installments/{installment_id}/record-offline-payment",
    response_model=FeeReceiptResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def record_offline_payment(
    installment_id: uuid.UUID,
    payload: RecordOfflinePaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: record authorized offline payments (cash, cheque, bank transfer)."""
    return fee_service.record_offline_payment(installment_id, payload, current_user.id, db)


@router.post(
    "/admin/fees/assignments/{assignment_id}/adjustments",
    response_model=StudentFeeAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(admin_only)],
)
def apply_concession_or_scholarship(
    assignment_id: uuid.UUID,
    payload: StudentFeeAdjustmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: apply student-specific concession, discount, or scholarship adjustment."""
    return fee_service.apply_student_fee_adjustment(assignment_id, payload, current_user.id, db)


@router.get(
    "/admin/fees/webhooks",
    response_model=PaginatedWebhookEventsResponse,
    dependencies=[Depends(admin_only)],
)
def list_webhook_events(
    status: str | None = Query(None, description="received, processed, failed, ignored"),
    event_type: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Admin: audit log of incoming payment gateway webhook events."""
    return fee_service.list_webhook_events(
        status_filter=status,
        event_type=event_type,
        skip=skip,
        limit=limit,
        db=db,
    )


@router.post(
    "/admin/fees/webhooks/{event_id}/retry",
    dependencies=[Depends(admin_only)],
)
def retry_webhook(
    event_id: str,
    db: Session = Depends(get_db),
):
    """Admin: safely retry processing a failed webhook event."""
    return fee_service.retry_webhook_event(event_id, db)

