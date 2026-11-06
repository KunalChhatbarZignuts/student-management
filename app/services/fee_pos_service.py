import datetime as dt
import uuid
import secrets
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.academic_structure import Grade, Section, StudentEnrollment
from app.models.fee import FeeInstallment, FeePayment, StudentFeeAssignment
from app.models.student import Student
from app.models.user import User
from app.schemas.fee_pos import (
    POSAllocationItem,
    POSCollectPaymentRequest,
    POSInstallmentItem,
    POSPaymentReceiptResponse,
    POSReceiptItem,
    POSRecentPayment,
    POSStudentAccountDetails,
    POSStudentSearchItem,
)


def search_pos_students(
    db: Session,
    query: str = "",
    limit: int = 20,
) -> list[POSStudentSearchItem]:
    """Search active students for POS counter fee collection."""
    stmt = (
        select(Student)
        .options(
            joinedload(Student.current_grade),
            joinedload(Student.current_section),
        )
    )

    clean_q = query.strip()
    if clean_q:
        stmt = stmt.where(
            or_(
                Student.first_name.ilike(f"%{clean_q}%"),
                Student.last_name.ilike(f"%{clean_q}%"),
                Student.student_code.ilike(f"%{clean_q}%"),
                Student.enrollment_number.ilike(f"%{clean_q}%"),
            )
        )

    students = db.scalars(stmt.limit(limit)).unique().all()
    results: list[POSStudentSearchItem] = []

    student_ids = [s.id for s in students]
    assignments_by_student: dict[uuid.UUID, list[StudentFeeAssignment]] = {}
    if student_ids:
        all_assignments = db.scalars(
            select(StudentFeeAssignment)
            .where(
                StudentFeeAssignment.student_id.in_(student_ids),
                StudentFeeAssignment.status == "active",
            )
            .options(joinedload(StudentFeeAssignment.installments))
        ).unique().all()
        for a in all_assignments:
            assignments_by_student.setdefault(a.student_id, []).append(a)

    for s in students:
        s_assignments = assignments_by_student.get(s.id, [])
        total_fee = Decimal("0.00")
        total_paid = Decimal("0.00")
        total_outstanding = Decimal("0.00")
        pending_count = 0

        for fa in s_assignments:
            for inst in fa.installments or []:
                total_fee += inst.amount
                total_paid += inst.paid_amount
                total_outstanding += inst.outstanding_amount
                if inst.outstanding_amount > 0:
                    pending_count += 1

        results.append(
            POSStudentSearchItem(
                student_id=s.id,
                name=f"{s.first_name} {s.last_name}".strip(),
                admission_number=s.enrollment_number or s.student_code,
                grade_name=s.current_grade.name if s.current_grade else "N/A",
                section_name=s.current_section.name if s.current_section else "N/A",
                total_fee=total_fee,
                total_paid=total_paid,
                total_outstanding=total_outstanding,
                pending_installment_count=pending_count,
            )
        )

    return results


def get_student_pos_details(
    db: Session,
    student_id: uuid.UUID,
) -> POSStudentAccountDetails:
    """Get full fee installment ledger and recent payment history for cashier checkout."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    grade = student.current_grade
    section = student.current_section

    # Load active installments
    assignments = db.scalars(
        select(StudentFeeAssignment)
        .where(
            StudentFeeAssignment.student_id == student.id,
            StudentFeeAssignment.status == "active",
        )
        .options(
            joinedload(StudentFeeAssignment.installments),
            joinedload(StudentFeeAssignment.payments),
        )
    ).unique().all()

    installments_list: list[POSInstallmentItem] = []
    total_fee = Decimal("0.00")
    total_paid = Decimal("0.00")
    total_outstanding = Decimal("0.00")

    all_installments: list[FeeInstallment] = []
    for a in assignments:
        for inst in a.installments or []:
            all_installments.append(inst)

    # Sort by due_date
    all_installments.sort(key=lambda i: i.due_date)

    for inst in all_installments:
        total_fee += inst.amount
        total_paid += inst.paid_amount
        total_outstanding += inst.outstanding_amount

        installments_list.append(
            POSInstallmentItem(
                installment_id=inst.id,
                assignment_id=inst.assignment_id,
                title=inst.installment_name,
                due_date=inst.due_date,
                total_amount=inst.amount,
                paid_amount=inst.paid_amount,
                outstanding_amount=inst.outstanding_amount,
                status=inst.status,
            )
        )

    # Recent payments
    payments = db.scalars(
        select(FeePayment)
        .join(StudentFeeAssignment, FeePayment.assignment_id == StudentFeeAssignment.id)
        .where(
            StudentFeeAssignment.student_id == student.id,
            FeePayment.status == "completed",
        )
        .order_by(FeePayment.payment_date.desc(), FeePayment.created_at.desc())
        .limit(10)
    ).all()

    recent_payments: list[POSRecentPayment] = [
        POSRecentPayment(
            receipt_number=p.receipt_number,
            payment_date=p.payment_date,
            amount=p.amount,
            payment_method=p.payment_method,
            reference_note=p.reference_note,
        )
        for p in payments
    ]

    return POSStudentAccountDetails(
        student_id=student.id,
        name=f"{student.first_name} {student.last_name}".strip(),
        admission_number=student.enrollment_number or student.student_code,
        grade_name=grade.name if grade else "N/A",
        section_name=section.name if section else "N/A",
        total_fee=total_fee,
        total_paid=total_paid,
        total_outstanding=total_outstanding,
        installments=installments_list,
        recent_payments=recent_payments,
    )


def collect_pos_payment(
    db: Session,
    payload: POSCollectPaymentRequest,
    current_user: User,
) -> POSPaymentReceiptResponse:
    """Collect fee payment at counter, apply auto-FIFO or manual allocations, update ledgers, and return receipt."""
    student = db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if payload.total_amount <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero")

    # Fetch active unpaid installments
    installments = db.scalars(
        select(FeeInstallment)
        .join(StudentFeeAssignment, FeeInstallment.assignment_id == StudentFeeAssignment.id)
        .where(
            StudentFeeAssignment.student_id == student.id,
            StudentFeeAssignment.status == "active",
            FeeInstallment.outstanding_amount > 0,
        )
        .order_by(FeeInstallment.due_date.asc())
    ).all()

    if not installments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student has no outstanding fee balance to pay",
        )

    total_due = sum(i.outstanding_amount for i in installments)
    if payload.total_amount > total_due:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ₹{payload.total_amount:,.2f} exceeds total outstanding balance ₹{total_due:,.2f}",
        )

    # Cash change calculation
    change_returned = None
    if payload.payment_method.lower() == "cash" and payload.cash_tendered is not None:
        if payload.cash_tendered < payload.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cash tendered (₹{payload.cash_tendered:,.2f}) cannot be less than total payable (₹{payload.total_amount:,.2f})",
            )
        change_returned = payload.cash_tendered - payload.total_amount

    # Build allocation map: installment_id -> amount_to_pay
    allocated_items: list[tuple[FeeInstallment, Decimal]] = []

    if payload.allocations and len(payload.allocations) > 0:
        # Manual allocation override (Option 2-A)
        alloc_sum = sum(a.amount for a in payload.allocations)
        if alloc_sum != payload.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sum of manual allocations (₹{alloc_sum:,.2f}) does not match total payment amount (₹{payload.total_amount:,.2f})",
            )

        inst_map = {i.id: i for i in installments}
        for a in payload.allocations:
            inst = inst_map.get(a.installment_id)
            if not inst:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid installment ID {a.installment_id} or already settled",
                )
            if a.amount > inst.outstanding_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Allocation of ₹{a.amount:,.2f} exceeds installment outstanding ₹{inst.outstanding_amount:,.2f}",
                )
            allocated_items.append((inst, a.amount))
    else:
        # Automatic FIFO allocation (Option 2-A)
        remaining_to_pay = payload.total_amount
        for inst in installments:
            if remaining_to_pay <= Decimal("0.00"):
                break
            amount_for_inst = min(remaining_to_pay, inst.outstanding_amount)
            allocated_items.append((inst, amount_for_inst))
            remaining_to_pay -= amount_for_inst

    # Generate master receipt code: REC-YYYYMMDD-XXXX
    today_str = dt.date.today().strftime("%Y%m%d")
    random_code = secrets.token_hex(2).upper()
    base_receipt_number = f"REC-{today_str}-{random_code}"

    receipt_items: list[POSReceiptItem] = []
    payment_date = dt.date.today()

    for idx, (inst, amt_to_pay) in enumerate(allocated_items, start=1):
        prior_out = inst.outstanding_amount
        inst.paid_amount += amt_to_pay
        inst.outstanding_amount -= amt_to_pay
        if inst.outstanding_amount <= Decimal("0.00"):
            inst.status = "paid"
        else:
            inst.status = "partially_paid"

        # Unique fee_payment receipt number for DB constraint safety
        sub_receipt = base_receipt_number if len(allocated_items) == 1 else f"{base_receipt_number}-{idx}"

        fee_payment = FeePayment(
            installment_id=inst.id,
            assignment_id=inst.assignment_id,
            receipt_number=sub_receipt,
            amount=amt_to_pay,
            payment_method=payload.payment_method.lower(),
            payment_date=payment_date,
            status="completed",
            reference_note=payload.transaction_reference or payload.remarks or f"POS Cashier payment ({base_receipt_number})",
            recorded_by_user_id=current_user.id,
        )
        db.add(fee_payment)

        receipt_items.append(
            POSReceiptItem(
                installment_title=inst.installment_name,
                due_date=inst.due_date,
                amount_paid=amt_to_pay,
                prior_outstanding=prior_out,
                new_outstanding=inst.outstanding_amount,
            )
        )

    db.commit()

    # Recalculate student total remaining balance
    updated_all_installments = db.scalars(
        select(FeeInstallment)
        .join(StudentFeeAssignment, FeeInstallment.assignment_id == StudentFeeAssignment.id)
        .where(
            StudentFeeAssignment.student_id == student.id,
            StudentFeeAssignment.status == "active",
        )
    ).all()
    remaining_total = sum(i.outstanding_amount for i in updated_all_installments)

    cashier_name = f"{current_user.first_name} {current_user.last_name}".strip() if hasattr(current_user, "first_name") and current_user.first_name else current_user.email

    grade = student.current_grade
    section = student.current_section

    return POSPaymentReceiptResponse(
        receipt_number=base_receipt_number,
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}".strip(),
        admission_number=student.enrollment_number or student.student_code,
        grade_name=grade.name if grade else "N/A",
        section_name=section.name if section else "N/A",
        payment_date=payment_date,
        payment_method=payload.payment_method.upper(),
        amount_paid=payload.total_amount,
        cash_tendered=payload.cash_tendered,
        change_returned=change_returned,
        transaction_reference=payload.transaction_reference,
        remarks=payload.remarks,
        cashier_name=cashier_name,
        items=receipt_items,
        total_remaining_balance=remaining_total,
        pdf_url=f"/api/v1/pos/receipts/{base_receipt_number}/pdf",
    )


def get_receipt_data_by_number(
    db: Session,
    receipt_number: str,
) -> POSPaymentReceiptResponse:
    """Retrieve full payment receipt details by receipt number for printing and PDF generation."""
    payments = db.scalars(
        select(FeePayment)
        .where(
            or_(
                FeePayment.receipt_number == receipt_number,
                FeePayment.receipt_number.like(f"{receipt_number}-%"),
            )
        )
        .options(
            joinedload(FeePayment.installment),
            joinedload(FeePayment.assignment).joinedload(StudentFeeAssignment.student).joinedload(Student.current_grade),
            joinedload(FeePayment.assignment).joinedload(StudentFeeAssignment.student).joinedload(Student.current_section),
            joinedload(FeePayment.recorded_by),
        )
    ).all()

    if not payments:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    first_payment = payments[0]
    assignment = first_payment.assignment
    student = assignment.student
    grade = student.current_grade if student else None
    section = student.current_section if student else None
    recorded_by = first_payment.recorded_by

    cashier_name = (
        f"{recorded_by.first_name} {recorded_by.last_name}".strip()
        if recorded_by and hasattr(recorded_by, "first_name") and recorded_by.first_name
        else (recorded_by.email if recorded_by else "School Cashier")
    )

    items: list[POSReceiptItem] = []
    total_paid = Decimal("0.00")

    for p in payments:
        inst = p.installment
        total_paid += p.amount
        items.append(
            POSReceiptItem(
                installment_title=inst.installment_name if inst else "Fee Installment",
                due_date=inst.due_date if inst else p.payment_date,
                amount_paid=p.amount,
                prior_outstanding=inst.outstanding_amount + p.amount if inst else Decimal("0.00"),
                new_outstanding=inst.outstanding_amount if inst else Decimal("0.00"),
            )
        )

    # Remaining balance
    all_insts = db.scalars(
        select(FeeInstallment)
        .join(StudentFeeAssignment, FeeInstallment.assignment_id == StudentFeeAssignment.id)
        .where(
            StudentFeeAssignment.student_id == student.id,
            StudentFeeAssignment.status == "active",
        )
    ).all()
    remaining = sum(i.outstanding_amount for i in all_insts)

    return POSPaymentReceiptResponse(
        receipt_number=receipt_number,
        student_id=student.id,
        student_name=f"{student.first_name} {student.last_name}".strip(),
        admission_number=student.enrollment_number or student.student_code,
        grade_name=grade.name if grade else "N/A",
        section_name=section.name if section else "N/A",
        payment_date=first_payment.payment_date,
        payment_method=first_payment.payment_method.upper(),
        amount_paid=total_paid,
        cash_tendered=None,
        change_returned=None,
        transaction_reference=first_payment.reference_note,
        remarks=first_payment.reference_note,
        cashier_name=cashier_name,
        items=items,
        total_remaining_balance=remaining,
        pdf_url=f"/api/v1/pos/receipts/{receipt_number}/pdf",
    )
