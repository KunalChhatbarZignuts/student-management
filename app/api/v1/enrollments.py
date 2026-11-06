import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.enrollment import (
    BulkEnrollmentRequest,
    BulkEnrollmentResponse,
    EnhancedEnrollmentHistoryItem,
    EnrollmentDashboardMetrics,
    PromotionExecuteRequest,
    PromotionExecuteResponse,
    PromotionPreviewRequest,
    PromotionPreviewResponse,
    StudentTransferCreate,
    StudentTransferRecordResponse,
    UnassignedStudentItem,
)
from app.services import enrollment_service

router = APIRouter(prefix="/enrollments", tags=["Academic Enrollments"])

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)
staff_and_admin = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value, UserRole.TEACHER.value)


@router.get("/dashboard", response_model=EnrollmentDashboardMetrics)
def get_enrollment_dashboard(
    academic_year_id: uuid.UUID | None = Query(None, description="Optional academic year filter"),
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Retrieve complete academic enrollment dashboard metrics, grade/section distribution, and capacities."""
    return enrollment_service.get_enrollment_dashboard_metrics(academic_year_id, db)


@router.get("/unassigned", response_model=list[UnassignedStudentItem])
def get_unassigned_students(
    academic_year_id: uuid.UUID | None = Query(None, description="Optional academic year filter"),
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Retrieve admitted students not yet assigned to an active section for the academic year."""
    return enrollment_service.get_unassigned_students(academic_year_id, db)


@router.post("/bulk-enroll", response_model=BulkEnrollmentResponse)
def bulk_enroll_students(
    payload: BulkEnrollmentRequest,
    request: Request,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Assign multiple students to grade and section atomically with pre-validation and capacity checks."""
    ip = get_client_ip(request)
    return enrollment_service.bulk_enroll_students(payload, current_user.id, ip, db)


@router.post("/transfer", response_model=StudentTransferRecordResponse)
def transfer_student(
    payload: StudentTransferCreate,
    request: Request,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Transfer student between sections or grades with mandatory reason and immutable audit recording."""
    ip = get_client_ip(request)
    return enrollment_service.execute_student_transfer(payload, current_user.id, ip, db)


@router.get("/transfers", response_model=list[StudentTransferRecordResponse])
def get_transfer_records(
    academic_year_id: uuid.UUID | None = Query(None, description="Filter transfers by academic year"),
    student_id: uuid.UUID | None = Query(None, description="Filter transfers by student"),
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Search and retrieve institution-wide student transfer records."""
    return enrollment_service.list_transfer_records(academic_year_id, student_id, db)


@router.post("/promotions/preview", response_model=PromotionPreviewResponse)
def preview_promotions(
    payload: PromotionPreviewRequest,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Preview student progression candidates across academic years with exam indicators and target capacities."""
    return enrollment_service.preview_academic_promotions(payload, db)


@router.post("/promotions/execute", response_model=PromotionExecuteResponse)
def execute_promotions(
    payload: PromotionExecuteRequest,
    request: Request,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Execute batch academic year promotions, retentions, or withdrawals atomically."""
    ip = get_client_ip(request)
    return enrollment_service.execute_academic_promotions(payload, current_user.id, ip, db)


@router.get("/students/{student_id}/history", response_model=list[EnhancedEnrollmentHistoryItem])
def get_student_enrollment_history(
    student_id: uuid.UUID,
    current_user: User = Depends(staff_and_admin),
    db: Session = Depends(get_db),
):
    """Retrieve full chronological academic enrollment and transfer history with Class Teacher names."""
    return enrollment_service.get_enhanced_student_enrollments(student_id, db)

