import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.fee_pos import (
    POSCollectPaymentRequest,
    POSPaymentReceiptResponse,
    POSStudentAccountDetails,
    POSStudentSearchItem,
)
from app.services.fee_pos_service import (
    collect_pos_payment,
    get_receipt_data_by_number,
    get_student_pos_details,
    search_pos_students,
)
from app.services.fee_receipt_generator import generate_fee_receipt_pdf

router = APIRouter(prefix="/pos", tags=["Fee Counter POS"])


@router.get("/students", response_model=list[POSStudentSearchItem])
def search_students_for_pos(
    query: str = Query("", description="Search by student name or admission number"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN", "STAFF"])),
):
    """Search students for fee counter collection."""
    return search_pos_students(db, query=query, limit=limit)


@router.get("/students/{student_id}/details", response_model=POSStudentAccountDetails)
def get_student_account_details(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN", "STAFF"])),
):
    """Get student fee ledger, installments, and payment history for checkout."""
    return get_student_pos_details(db, student_id=student_id)


@router.post("/collect", response_model=POSPaymentReceiptResponse, status_code=status.HTTP_201_CREATED)
def collect_payment_at_counter(
    payload: POSCollectPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN", "STAFF"])),
):
    """Collect fee payment, record transactions, and generate immediate receipt."""
    return collect_pos_payment(db, payload=payload, current_user=current_user)


@router.get("/receipts/{receipt_number}", response_model=POSPaymentReceiptResponse)
def get_receipt_details(
    receipt_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch complete receipt metadata by receipt number."""
    return get_receipt_data_by_number(db, receipt_number=receipt_number)


@router.get("/receipts/{receipt_number}/pdf")
def download_receipt_pdf(
    receipt_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream official printable PDF receipt generated via ReportLab."""
    receipt_data = get_receipt_data_by_number(db, receipt_number=receipt_number)
    pdf_bytes = generate_fee_receipt_pdf(receipt_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="Receipt_{receipt_number}.pdf"',
        },
    )
