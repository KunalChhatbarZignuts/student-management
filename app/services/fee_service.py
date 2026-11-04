import datetime as dt
import hashlib
import hmac
import json
import uuid
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.academic_structure import AcademicYear, Grade
from app.models.fee import (
    FeeComponent,
    FeeInstallment,
    FeePayment,
    FeeStructure,
    FeeStructureItem,
    PaymentTransaction,
    PaymentWebhookEvent,
    StudentFeeAdjustment,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
)
from app.models.student import Student
from app.models.user import User
from app.services.id_generator import get_next_sequence_value
from app.schemas.fee import (
    AdmissionFeeAssignmentPayload,
    FeeCalculationRequest,
    FeeCalculationResponse,
    FeeComponentCreate,
    FeeComponentResponse,
    FeeComponentUpdate,
    FeeDashboardMetricsResponse,
    FeeInstallmentResponse,
    FeeStructureCreate,
    FeeStructureListItem,
    FeeStructureResponse,
    FeeStructureUpdate,
    InstallmentSchedulePreview,
    PaginatedFeeAssignmentsResponse,
    StudentFeeAdjustmentCreate,
    StudentFeeAdjustmentResponse,
    StudentFeeAssignmentItemResponse,
    StudentFeeAssignmentListItem,
    StudentFeeAssignmentResponse,
    FeeReceiptResponse,
    PaginatedTransactionsResponse,
    PaginatedWebhookEventsResponse,
    PaymentOrderCreateRequest,
    PaymentOrderResponse,
    PaymentTransactionResponse,
    PaymentVerificationResponse,
    PaymentVerifyRequest,
    PaymentWebhookEventResponse,
    PortalInstallmentItem,
    RecordOfflinePaymentRequest,
    StudentPortalFeeScheduleResponse,
)


def _round_currency(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ==========================================
# Fee Component Services
# ==========================================

def list_fee_components(
    db: Session,
    status_filter: str | None = None,
    fee_type: str | None = None,
) -> list[FeeComponentResponse]:
    stmt = select(FeeComponent)
    if status_filter:
        stmt = stmt.where(FeeComponent.status == status_filter)
    if fee_type:
        stmt = stmt.where(FeeComponent.fee_type == fee_type)
    stmt = stmt.order_by(FeeComponent.name.asc())
    components = db.execute(stmt).scalars().all()
    return [FeeComponentResponse.model_validate(c) for c in components]


def create_fee_component(payload: FeeComponentCreate, db: Session) -> FeeComponentResponse:
    code = payload.code.strip().upper()
    existing = db.execute(select(FeeComponent).where(FeeComponent.code == code)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Fee component with code '{code}' already exists",
        )

    component = FeeComponent(
        name=payload.name.strip(),
        code=code,
        description=payload.description.strip() if payload.description else None,
        fee_type=payload.fee_type,
        payment_frequency=payload.payment_frequency,
        is_mandatory=payload.is_mandatory,
        is_recurring=payload.is_recurring,
        status=payload.status,
    )
    db.add(component)
    db.commit()
    db.refresh(component)
    return FeeComponentResponse.model_validate(component)


def update_fee_component(
    component_id: uuid.UUID,
    payload: FeeComponentUpdate,
    db: Session,
) -> FeeComponentResponse:
    component = db.get(FeeComponent, component_id)
    if not component:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee component not found")

    if payload.name is not None:
        component.name = payload.name.strip()
    if payload.description is not None:
        component.description = payload.description.strip() if payload.description else None
    if payload.fee_type is not None:
        component.fee_type = payload.fee_type
    if payload.payment_frequency is not None:
        component.payment_frequency = payload.payment_frequency
    if payload.is_mandatory is not None:
        component.is_mandatory = payload.is_mandatory
    if payload.is_recurring is not None:
        component.is_recurring = payload.is_recurring
    if payload.status is not None:
        component.status = payload.status

    db.commit()
    db.refresh(component)
    return FeeComponentResponse.model_validate(component)


# ==========================================
# Fee Structure Services
# ==========================================

def list_fee_structures(
    academic_year_id: uuid.UUID | None,
    grade_id: uuid.UUID | None,
    status_filter: str | None,
    db: Session,
) -> list[FeeStructureListItem]:
    stmt = select(FeeStructure)
    if academic_year_id:
        stmt = stmt.where(FeeStructure.academic_year_id == academic_year_id)
    if grade_id:
        stmt = stmt.where(FeeStructure.grade_id == grade_id)
    if status_filter:
        stmt = stmt.where(FeeStructure.status == status_filter)
    stmt = stmt.order_by(FeeStructure.created_at.desc())

    structures = db.execute(stmt).scalars().all()
    results: list[FeeStructureListItem] = []
    for s in structures:
        results.append(
            FeeStructureListItem(
                id=s.id,
                academic_year_id=s.academic_year_id,
                academic_year_name=s.academic_year.name if s.academic_year else None,
                grade_id=s.grade_id,
                grade_name=s.grade.name if s.grade else None,
                name=s.name,
                total_amount=s.total_amount,
                currency=s.currency,
                status=s.status,
                effective_date=s.effective_date,
                items_count=len(s.items),
                created_at=s.created_at,
            )
        )
    return results


def get_fee_structure_detail(structure_id: uuid.UUID, db: Session) -> FeeStructureResponse:
    s = db.get(FeeStructure, structure_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee structure not found")

    items_resp = []
    for item in sorted(s.items, key=lambda x: x.display_order):
        items_resp.append(
            {
                "id": item.id,
                "fee_structure_id": item.fee_structure_id,
                "fee_component_id": item.fee_component_id,
                "component_name": item.component.name if item.component else None,
                "component_code": item.component.code if item.component else None,
                "amount": item.amount,
                "payment_frequency": item.payment_frequency,
                "is_mandatory": item.is_mandatory,
                "display_order": item.display_order,
            }
        )

    return FeeStructureResponse(
        id=s.id,
        academic_year_id=s.academic_year_id,
        academic_year_name=s.academic_year.name if s.academic_year else None,
        grade_id=s.grade_id,
        grade_name=s.grade.name if s.grade else None,
        name=s.name,
        description=s.description,
        total_amount=s.total_amount,
        currency=s.currency,
        status=s.status,
        effective_date=s.effective_date,
        created_by_user_id=s.created_by_user_id,
        items=items_resp,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def get_active_grade_fee_structure(
    grade_id: uuid.UUID,
    academic_year_id: uuid.UUID,
    db: Session,
) -> FeeStructureResponse | None:
    stmt = (
        select(FeeStructure)
        .where(
            FeeStructure.grade_id == grade_id,
            FeeStructure.academic_year_id == academic_year_id,
            FeeStructure.status == "active",
        )
        .order_by(FeeStructure.created_at.desc())
    )
    structure = db.execute(stmt).scalars().first()
    if not structure:
        return None
    return get_fee_structure_detail(structure.id, db)


def create_fee_structure(
    payload: FeeStructureCreate,
    actor_user_id: uuid.UUID | None,
    db: Session,
) -> FeeStructureResponse:
    # 1. Validate Academic Year
    ay = db.get(AcademicYear, payload.academic_year_id)
    if not ay:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Academic Year not found")

    # 2. Validate Grade
    grade = db.get(Grade, payload.grade_id)
    if not grade:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Grade not found")
    if grade.academic_year_id != ay.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Grade '{grade.name}' does not belong to Academic Year '{ay.name}'",
        )

    # 3. If new structure is active, archive or deactivate previous active structures for same grade & year
    if payload.status == "active":
        prev_actives = (
            db.execute(
                select(FeeStructure).where(
                    FeeStructure.academic_year_id == ay.id,
                    FeeStructure.grade_id == grade.id,
                    FeeStructure.status == "active",
                )
            )
            .scalars()
            .all()
        )
        for prev in prev_actives:
            prev.status = "archived"

    # 4. Calculate total for mandatory items
    total_mandatory = Decimal("0.00")
    for item in payload.items:
        if item.is_mandatory:
            total_mandatory += item.amount

    structure = FeeStructure(
        academic_year_id=ay.id,
        grade_id=grade.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        total_amount=_round_currency(total_mandatory),
        currency=payload.currency,
        status=payload.status,
        effective_date=payload.effective_date,
        created_by_user_id=actor_user_id,
    )
    db.add(structure)
    db.flush()

    # 5. Add items
    for idx, item_data in enumerate(payload.items):
        comp = db.get(FeeComponent, item_data.fee_component_id)
        if not comp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fee Component with ID {item_data.fee_component_id} not found",
            )
        f_item = FeeStructureItem(
            fee_structure_id=structure.id,
            fee_component_id=comp.id,
            amount=_round_currency(item_data.amount),
            payment_frequency=item_data.payment_frequency,
            is_mandatory=item_data.is_mandatory,
            display_order=item_data.display_order or idx,
        )
        db.add(f_item)

    db.commit()
    db.refresh(structure)
    return get_fee_structure_detail(structure.id, db)


# ==========================================
# Calculation & Simulation Engine
# ==========================================

def calculate_fee_schedule(
    structure: FeeStructure,
    selected_component_ids: list[uuid.UUID],
    adjustments: list[StudentFeeAdjustmentCreate],
    installment_frequency: str,
    start_date: dt.date,
) -> tuple[Decimal, Decimal, Decimal, Decimal, list[dict]]:
    """
    Computes:
    - base_amount: mandatory items + chosen optional items
    - total_discount: sum of discounts and concessions
    - total_additional: sum of additional charges
    - final_payable_amount = base_amount - total_discount + total_additional
    - installment schedule reconciling to final_payable_amount
    """
    selected_id_set = set(selected_component_ids)

    base_amount = Decimal("0.00")
    for item in structure.items:
        # Mandatory items are always included; optional items only if selected
        if item.is_mandatory or (item.fee_component_id in selected_id_set):
            base_amount += item.amount

    base_amount = _round_currency(base_amount)

    total_discount = Decimal("0.00")
    total_additional = Decimal("0.00")

    for adj in adjustments:
        adj_amount = Decimal("0.00")
        if adj.calculation_type == "percentage":
            if adj.rate is None or adj.rate < 0 or adj.rate > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Percentage discount rate must be between 0 and 100%. Got {adj.rate}%",
                )
            adj_amount = _round_currency(base_amount * (Decimal(str(adj.rate)) / Decimal("100")))
        else:
            adj_amount = _round_currency(adj.amount)

        if adj.category in ["discount", "concession"]:
            total_discount += adj_amount
        elif adj.category == "additional_charge":
            total_additional += adj_amount

    total_discount = _round_currency(total_discount)
    total_additional = _round_currency(total_additional)

    if total_discount > base_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total discounts and concessions (₹{total_discount}) cannot exceed the base fee (₹{base_amount})",
        )

    final_payable = _round_currency(base_amount - total_discount + total_additional)
    if final_payable < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Final payable amount cannot be negative (calculated: ₹{final_payable})",
        )

    # Generate Installments Schedule
    installments: list[dict] = []
    freq = installment_frequency.lower()

    if freq in ["one_time", "annual"]:
        installments.append(
            {
                "number": 1,
                "name": "Full / Annual Payment",
                "due_date": start_date,
                "amount": final_payable,
            }
        )
    elif freq == "half_yearly":
        # 2 installments
        part = _round_currency(final_payable / Decimal(2))
        rem = final_payable - part
        due2 = start_date + dt.timedelta(days=180)
        installments.append({"number": 1, "name": "Term 1 (At Admission)", "due_date": start_date, "amount": part})
        installments.append({"number": 2, "name": "Term 2", "due_date": due2, "amount": rem})
    elif freq == "quarterly":
        # 4 installments
        part = _round_currency(final_payable / Decimal(4))
        sum_first3 = part * Decimal(3)
        rem = final_payable - sum_first3
        for q in range(1, 5):
            d_date = start_date + dt.timedelta(days=(q - 1) * 90)
            installments.append(
                {
                    "number": q,
                    "name": f"Quarter {q}",
                    "due_date": d_date,
                    "amount": part if q < 4 else rem,
                }
            )
    elif freq == "monthly":
        # 10 monthly installments
        months = 10
        part = _round_currency(final_payable / Decimal(months))
        sum_first = part * Decimal(months - 1)
        rem = final_payable - sum_first
        for m in range(1, months + 1):
            d_date = start_date + dt.timedelta(days=(m - 1) * 30)
            installments.append(
                {
                    "number": m,
                    "name": f"Monthly Installment #{m}",
                    "due_date": d_date,
                    "amount": part if m < months else rem,
                }
            )
    else:
        # Default single installment
        installments.append(
            {
                "number": 1,
                "name": "Admission Payment",
                "due_date": start_date,
                "amount": final_payable,
            }
        )

    return base_amount, total_discount, total_additional, final_payable, installments


def simulate_fee_calculation(req: FeeCalculationRequest, db: Session) -> FeeCalculationResponse:
    structure = db.get(FeeStructure, req.fee_structure_id)
    if not structure:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee structure not found")

    start_date = req.start_date or dt.date.today()
    base, disc, add, final, insts = calculate_fee_schedule(
        structure,
        req.selected_component_ids,
        req.adjustments,
        req.installment_frequency,
        start_date,
    )

    inst_previews = [
        InstallmentSchedulePreview(
            installment_number=i["number"],
            installment_name=i["name"],
            due_date=i["due_date"],
            amount=i["amount"],
        )
        for i in insts
    ]

    return FeeCalculationResponse(
        base_amount=base,
        total_discount=disc,
        total_additional=add,
        final_payable_amount=final,
        currency=structure.currency,
        installment_frequency=req.installment_frequency,
        installments=inst_previews,
    )


# ==========================================
# Student Fee Assignment Creation
# ==========================================

def assign_fees_to_student(
    student_id: uuid.UUID,
    academic_year_id: uuid.UUID,
    grade_id: uuid.UUID,
    payload: AdmissionFeeAssignmentPayload,
    admission_id: uuid.UUID | None,
    actor_user_id: uuid.UUID | None,
    assigned_date: dt.date,
    db: Session,
) -> StudentFeeAssignmentResponse:
    # 1. Fetch fee structure
    structure = db.get(FeeStructure, payload.fee_structure_id)
    if not structure:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fee structure not found")
    if structure.grade_id != grade_id or structure.academic_year_id != academic_year_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected fee structure does not match the student's Grade and Academic Year",
        )

    # 2. Compute fee breakdown and installments
    base_amt, total_disc, total_add, final_amt, inst_list = calculate_fee_schedule(
        structure,
        payload.selected_component_ids,
        payload.adjustments,
        payload.installment_frequency,
        assigned_date,
    )

    # 3. Create StudentFeeAssignment record
    assignment = StudentFeeAssignment(
        student_id=student_id,
        academic_year_id=academic_year_id,
        grade_id=grade_id,
        fee_structure_id=structure.id,
        admission_id=admission_id,
        base_amount=base_amt,
        total_discount=total_disc,
        total_additional=total_add,
        final_payable_amount=final_amt,
        currency=structure.currency,
        installment_frequency=payload.installment_frequency,
        status="active",
        assigned_date=assigned_date,
        notes=payload.notes,
        created_by_user_id=actor_user_id,
    )
    db.add(assignment)
    db.flush()

    # 4. Snapshot assigned items
    selected_set = set(payload.selected_component_ids)
    for s_item in structure.items:
        is_sel = s_item.is_mandatory or (s_item.fee_component_id in selected_set)
        snap_item = StudentFeeAssignmentItem(
            assignment_id=assignment.id,
            fee_component_id=s_item.fee_component_id,
            component_name=s_item.component.name if s_item.component else "Fee Component",
            amount=s_item.amount,
            payment_frequency=s_item.payment_frequency,
            is_mandatory=s_item.is_mandatory,
            is_selected=is_sel,
        )
        db.add(snap_item)

    # 5. Create Adjustments
    for adj in payload.adjustments:
        if not adj.description or not adj.description.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A clear description/reason is required for every fee adjustment",
            )
        eff_amt = Decimal("0.00")
        if adj.calculation_type == "percentage":
            eff_amt = _round_currency(base_amt * (Decimal(str(adj.rate)) / Decimal("100")))
        else:
            eff_amt = _round_currency(adj.amount)

        db_adj = StudentFeeAdjustment(
            assignment_id=assignment.id,
            adjustment_type=adj.adjustment_type,
            category=adj.category,
            description=adj.description.strip(),
            calculation_type=adj.calculation_type,
            rate=Decimal(str(adj.rate)) if adj.rate is not None else None,
            amount=eff_amt,
            created_by_user_id=actor_user_id,
        )
        db.add(db_adj)

    # 6. Create Installments
    for inst in inst_list:
        db_inst = FeeInstallment(
            assignment_id=assignment.id,
            installment_number=inst["number"],
            installment_name=inst["name"],
            due_date=inst["due_date"],
            amount=inst["amount"],
            paid_amount=Decimal("0.00"),
            outstanding_amount=inst["amount"],
            status="pending",
        )
        db.add(db_inst)

    db.flush()
    return get_student_fee_assignment_detail(assignment.id, db)


def get_student_fee_assignment_detail(
    assignment_id: uuid.UUID,
    db: Session,
) -> StudentFeeAssignmentResponse:
    a = db.get(StudentFeeAssignment, assignment_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student fee assignment not found")

    student_name = f"{a.student.first_name} {a.student.last_name}" if a.student else "Unknown"

    items_resp = [
        StudentFeeAssignmentItemResponse(
            id=it.id,
            fee_component_id=it.fee_component_id,
            component_name=it.component_name,
            amount=it.amount,
            payment_frequency=it.payment_frequency,
            is_mandatory=it.is_mandatory,
            is_selected=it.is_selected,
        )
        for it in a.items
    ]

    adj_resp = [
        StudentFeeAdjustmentResponse(
            id=adj.id,
            assignment_id=adj.assignment_id,
            adjustment_type=adj.adjustment_type,
            category=adj.category,
            description=adj.description,
            calculation_type=adj.calculation_type,
            rate=adj.rate,
            amount=adj.amount,
            created_by_user_id=adj.created_by_user_id,
            created_at=adj.created_at,
        )
        for adj in a.adjustments
    ]

    inst_resp = [
        FeeInstallmentResponse(
            id=inst.id,
            assignment_id=inst.assignment_id,
            installment_number=inst.installment_number,
            installment_name=inst.installment_name,
            due_date=inst.due_date,
            amount=inst.amount,
            paid_amount=inst.paid_amount,
            outstanding_amount=inst.outstanding_amount,
            status=inst.status,
        )
        for inst in sorted(a.installments, key=lambda x: x.installment_number)
    ]

    return StudentFeeAssignmentResponse(
        id=a.id,
        student_id=a.student_id,
        student_name=student_name,
        student_code=a.student.student_code if a.student else None,
        enrollment_number=a.student.enrollment_number if a.student else None,
        academic_year_id=a.academic_year_id,
        academic_year_name=a.academic_year.name if a.academic_year else None,
        grade_id=a.grade_id,
        grade_name=a.grade.name if a.grade else None,
        fee_structure_id=a.fee_structure_id,
        fee_structure_name=a.fee_structure.name if a.fee_structure else None,
        admission_id=a.admission_id,
        base_amount=a.base_amount,
        total_discount=a.total_discount,
        total_additional=a.total_additional,
        final_payable_amount=a.final_payable_amount,
        currency=a.currency,
        installment_frequency=a.installment_frequency,
        status=a.status,
        assigned_date=a.assigned_date,
        notes=a.notes,
        items=items_resp,
        adjustments=adj_resp,
        installments=inst_resp,
        created_at=a.created_at,
    )


def list_student_fee_assignments(
    academic_year_id: uuid.UUID | None,
    grade_id: uuid.UUID | None,
    search: str | None,
    skip: int,
    limit: int,
    db: Session,
) -> PaginatedFeeAssignmentsResponse:
    stmt = select(StudentFeeAssignment).join(Student, StudentFeeAssignment.student_id == Student.id)
    if academic_year_id:
        stmt = stmt.where(StudentFeeAssignment.academic_year_id == academic_year_id)
    if grade_id:
        stmt = stmt.where(StudentFeeAssignment.grade_id == grade_id)
    if search:
        s_clean = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Student.first_name).like(s_clean),
                func.lower(Student.last_name).like(s_clean),
                func.lower(Student.student_code).like(s_clean),
                func.lower(Student.enrollment_number).like(s_clean),
            )
        )

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    assignments = db.execute(stmt.order_by(StudentFeeAssignment.created_at.desc()).offset(skip).limit(limit)).scalars().all()

    items = []
    for a in assignments:
        st = a.student
        items.append(
            StudentFeeAssignmentListItem(
                id=a.id,
                student_id=a.student_id,
                student_name=f"{st.first_name} {st.last_name}" if st else "Student",
                student_code=st.student_code if st else "N/A",
                enrollment_number=st.enrollment_number if st else None,
                grade_name=a.grade.name if a.grade else "N/A",
                academic_year_name=a.academic_year.name if a.academic_year else "N/A",
                base_amount=a.base_amount,
                total_discount=a.total_discount,
                total_additional=a.total_additional,
                final_payable_amount=a.final_payable_amount,
                currency=a.currency,
                status=a.status,
                assigned_date=a.assigned_date,
                installments_count=len(a.installments),
            )
        )

    return PaginatedFeeAssignmentsResponse(items=items, total=total, skip=skip, limit=limit)


# ==========================================
# Dashboard Metrics Service
# ==========================================

def get_fee_dashboard_metrics(db: Session) -> FeeDashboardMetricsResponse:
    # Total assigned fees
    total_assigned = db.execute(
        select(func.coalesce(func.sum(StudentFeeAssignment.final_payable_amount), Decimal("0.00"))).where(
            StudentFeeAssignment.status == "active"
        )
    ).scalar_one()

    # Total collected and outstanding across installments
    collected_and_out = db.execute(
        select(
            func.coalesce(func.sum(FeeInstallment.paid_amount), Decimal("0.00")),
            func.coalesce(func.sum(FeeInstallment.outstanding_amount), Decimal("0.00")),
        )
    ).one()
    total_collected, total_outstanding = collected_and_out

    # Active structures and student assignments count
    active_structures_count = db.execute(
        select(func.count(FeeStructure.id)).where(FeeStructure.status == "active")
    ).scalar_one()

    total_assignments_count = db.execute(
        select(func.count(StudentFeeAssignment.id)).where(StudentFeeAssignment.status == "active")
    ).scalar_one()

    # Grade-wise summaries
    grade_summaries = []
    grades = db.execute(select(Grade).where(Grade.status == "active")).scalars().all()
    for g in grades:
        g_assigned = db.execute(
            select(func.coalesce(func.sum(StudentFeeAssignment.final_payable_amount), Decimal("0.00"))).where(
                StudentFeeAssignment.grade_id == g.id,
                StudentFeeAssignment.status == "active",
            )
        ).scalar_one()
        g_count = db.execute(
            select(func.count(StudentFeeAssignment.id)).where(
                StudentFeeAssignment.grade_id == g.id,
                StudentFeeAssignment.status == "active",
            )
        ).scalar_one()
        grade_summaries.append(
            {
                "grade_id": str(g.id),
                "grade_name": g.name,
                "student_count": g_count,
                "total_assigned": float(g_assigned),
            }
        )

    return FeeDashboardMetricsResponse(
        total_assigned_fees=_round_currency(total_assigned),
        total_collected_fees=_round_currency(total_collected),
        total_outstanding_fees=_round_currency(total_outstanding),
        total_active_structures=active_structures_count,
        total_student_assignments=total_assignments_count,
        grade_wise_summaries=grade_summaries,
    )


# ==========================================
# Receipt Generator Service
# ==========================================

def generate_receipt_number(db: Session) -> str:
    year = dt.date.today().year
    counter_name = f"fee:receipt:{year}"
    seq = get_next_sequence_value(db, counter_name)
    return f"RCP-{year}-{seq:04d}"


def _build_receipt_response(payment: FeePayment) -> FeeReceiptResponse:
    installment = payment.installment
    assignment = payment.assignment
    student = assignment.student if assignment else None
    grade = assignment.grade if assignment else None
    ay = assignment.academic_year if assignment else None

    return FeeReceiptResponse(
        receipt_number=payment.receipt_number,
        payment_date=payment.payment_date,
        amount=payment.amount,
        payment_method=payment.payment_method,
        status=payment.status,
        reference_note=payment.reference_note,
        student_id=assignment.student_id if assignment else uuid.uuid4(),
        student_name=f"{student.first_name} {student.last_name}" if student else "Student",
        student_code=student.student_code if student else None,
        enrollment_number=student.enrollment_number if student else None,
        grade_name=grade.name if grade else None,
        academic_year_name=ay.name if ay else None,
        installment_id=installment.id,
        installment_name=installment.installment_name,
        installment_total_amount=installment.amount,
        installment_paid_amount=installment.paid_amount,
        installment_outstanding_amount=installment.outstanding_amount,
        currency=assignment.currency if assignment else "INR",
        created_at=payment.created_at,
    )


def get_fee_receipt_detail(receipt_number: str, db: Session) -> FeeReceiptResponse:
    payment = db.execute(
        select(FeePayment).where(FeePayment.receipt_number == receipt_number)
    ).scalar_one_or_none()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment receipt '{receipt_number}' not found",
        )
    return _build_receipt_response(payment)


# ==========================================
# Payment Order & Gateway Integration
# ==========================================

def create_payment_order(
    req: PaymentOrderCreateRequest,
    student_id: uuid.UUID,
    db: Session,
) -> PaymentOrderResponse:
    installment = db.get(FeeInstallment, req.installment_id)
    if not installment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")

    assignment = installment.assignment
    if not assignment or assignment.student_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to pay for this student installment",
        )

    if installment.outstanding_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This installment is already fully settled",
        )

    pay_amount = req.amount if req.amount is not None else installment.outstanding_amount
    pay_amount = _round_currency(pay_amount)

    if pay_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero",
        )

    if pay_amount > installment.outstanding_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount (₹{pay_amount}) cannot exceed outstanding amount (₹{installment.outstanding_amount})",
        )

    # Convert to paise (1 INR = 100 paise)
    amount_paise = int(pay_amount * 100)

    # Generate gateway order id
    # Uses mock pattern order_<random> for test placeholder or live call
    order_id = f"order_{uuid.uuid4().hex[:14]}"

    transaction = PaymentTransaction(
        installment_id=installment.id,
        student_id=student_id,
        gateway_provider="razorpay",
        gateway_order_id=order_id,
        amount=pay_amount,
        currency="INR",
        status="created",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    student = assignment.student
    student_name = f"{student.first_name} {student.last_name}" if student else "Student"
    student_email = student.user.email if student and student.user else None

    return PaymentOrderResponse(
        order_id=order_id,
        gateway_provider="razorpay",
        key_id=settings.RAZORPAY_KEY_ID,
        amount=pay_amount,
        amount_paise=amount_paise,
        currency="INR",
        installment_id=installment.id,
        installment_name=installment.installment_name,
        student_id=student_id,
        student_name=student_name,
        student_email=student_email,
    )


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = settings.RAZORPAY_KEY_SECRET
    # In dev mode with placeholder credentials, accept matching or simulated signatures
    if secret == "rzp_secret_placeholder" and signature.startswith("sim_sig_"):
        return True
    try:
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        expected_sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, signature)
    except Exception:
        return False


def verify_webhook_signature(body_bytes: bytes, signature_header: str | None) -> bool:
    if not signature_header:
        return False
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if secret == "rzp_webhook_secret_placeholder" and signature_header.startswith("sim_webhook_sig_"):
        return True
    try:
        expected = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature_header)
    except Exception:
        return False


def process_captured_payment(
    gateway_order_id: str,
    gateway_payment_id: str,
    amount_paid: Decimal,
    payment_method: str = "online_gateway",
    reference_note: str | None = None,
    db: Session = None,
) -> FeePayment:
    # 1. Fetch transaction
    tx = db.execute(
        select(PaymentTransaction).where(PaymentTransaction.gateway_order_id == gateway_order_id)
    ).scalar_one_or_none()

    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment transaction for order '{gateway_order_id}' not found",
        )

    # 2. Check Idempotency: If already captured, return existing payment
    if tx.status == "captured":
        existing_payment = db.execute(
            select(FeePayment).where(FeePayment.transaction_id == tx.id)
        ).scalar_one_or_none()
        if existing_payment:
            return existing_payment

    installment = db.get(FeeInstallment, tx.installment_id)
    if not installment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")

    assignment = installment.assignment
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    amount_paid = _round_currency(amount_paid)

    # 3. Update Transaction
    tx.status = "captured"
    tx.gateway_payment_id = gateway_payment_id
    tx.error_code = None
    tx.error_description = None

    # 4. Generate Receipt & Create Payment Record
    receipt_num = generate_receipt_number(db)
    payment = FeePayment(
        installment_id=installment.id,
        assignment_id=assignment.id,
        transaction_id=tx.id,
        receipt_number=receipt_num,
        amount=amount_paid,
        payment_method=payment_method,
        payment_date=dt.date.today(),
        status="completed",
        reference_note=reference_note or f"Online Payment Order {gateway_order_id}",
    )
    db.add(payment)

    # 5. Reconcile Installment Balances
    installment.paid_amount = _round_currency(installment.paid_amount + amount_paid)
    new_outstanding = installment.amount - installment.paid_amount
    installment.outstanding_amount = _round_currency(max(Decimal("0.00"), new_outstanding))

    if installment.outstanding_amount <= Decimal("0.00"):
        installment.status = "paid"
    else:
        installment.status = "partially_paid"

    # 6. Check if all installments for assignment are settled
    all_settled = all(inst.status == "paid" for inst in assignment.installments)
    if all_settled:
        assignment.status = "completed"

    db.commit()
    db.refresh(payment)
    return payment


def process_failed_payment(
    gateway_order_id: str,
    gateway_payment_id: str | None,
    error_code: str | None,
    error_description: str | None,
    db: Session,
):
    tx = db.execute(
        select(PaymentTransaction).where(PaymentTransaction.gateway_order_id == gateway_order_id)
    ).scalar_one_or_none()

    if tx:
        tx.status = "failed"
        tx.gateway_payment_id = gateway_payment_id
        tx.error_code = error_code
        tx.error_description = error_description
        db.commit()


# ==========================================
# Webhook Handler Service
# ==========================================

def process_webhook_event(raw_body: bytes, signature: str | None, db: Session) -> dict:
    # 1. Parse JSON payload
    try:
        body_text = raw_body.decode("utf-8")
        payload = json.loads(body_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON payload: {str(e)}",
        )

    # Razorpay webhooks contain an event id (e.g. "event_id" or "id" or generated from payload)
    event_id = payload.get("id") or payload.get("event_id")
    event_type = payload.get("event", "unknown")

    if not event_id:
        # Fallback hash-based ID for deduplication
        event_id = f"evt_{hashlib.sha256(raw_body).hexdigest()[:20]}"

    # 2. Check Idempotency: has this event already been processed?
    existing_evt = db.execute(
        select(PaymentWebhookEvent).where(PaymentWebhookEvent.event_id == event_id)
    ).scalar_one_or_none()

    if existing_evt and existing_evt.processing_status == "processed":
        return {
            "status": "ignored",
            "message": f"Webhook event '{event_id}' has already been processed successfully.",
            "event_id": event_id,
        }

    # 3. Verify Signature
    is_valid_sig = verify_webhook_signature(raw_body, signature)
    if not is_valid_sig and not (settings.RAZORPAY_WEBHOOK_SECRET == "rzp_webhook_secret_placeholder"):
        # Record failure and reject
        if not existing_evt:
            evt = PaymentWebhookEvent(
                event_id=event_id,
                gateway_provider="razorpay",
                event_type=event_type,
                raw_payload=body_text,
                processing_status="failed",
                failure_reason="Invalid webhook signature",
                retry_count=1,
            )
            db.add(evt)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    # 4. Create or update event record as processing
    if not existing_evt:
        evt = PaymentWebhookEvent(
            event_id=event_id,
            gateway_provider="razorpay",
            event_type=event_type,
            raw_payload=body_text,
            processing_status="received",
            retry_count=0,
        )
        db.add(evt)
        db.flush()
    else:
        evt = existing_evt
        evt.retry_count += 1

    # 5. Dispatch Event Actions
    try:
        if event_type in ("payment.captured", "order.paid"):
            # Extract payment entity
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            amt_paise = payment_entity.get("amount", 0)
            amount_inr = Decimal(str(amt_paise)) / Decimal("100")
            method = payment_entity.get("method", "online_gateway")

            if not order_id:
                # Some webhooks have order in payload.order.entity
                order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})
                order_id = order_entity.get("id")

            if order_id and payment_id:
                process_captured_payment(
                    gateway_order_id=order_id,
                    gateway_payment_id=payment_id,
                    amount_paid=amount_inr,
                    payment_method=f"online_{method}",
                    db=db,
                )

        elif event_type == "payment.failed":
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            error_code = payment_entity.get("error_code")
            error_desc = payment_entity.get("error_description")
            if order_id:
                process_failed_payment(order_id, payment_id, error_code, error_desc, db)

        evt.processing_status = "processed"
        evt.failure_reason = None
        evt.processed_at = dt.datetime.now(dt.timezone.utc)
        db.commit()

        return {
            "status": "success",
            "message": f"Webhook event '{event_id}' processed successfully",
            "event_id": event_id,
        }

    except Exception as e:
        db.rollback()
        evt.processing_status = "failed"
        evt.failure_reason = str(e)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}",
        )


def verify_client_payment(payload: PaymentVerifyRequest, db: Session) -> PaymentVerificationResponse:
    # 1. Validate signature
    is_valid = verify_razorpay_signature(
        payload.gateway_order_id, payload.gateway_payment_id, payload.gateway_signature
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature verification failed",
        )

    # 2. Fetch transaction
    tx = db.execute(
        select(PaymentTransaction).where(
            PaymentTransaction.gateway_order_id == payload.gateway_order_id
        )
    ).scalar_one_or_none()

    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    # 3. Process payment capture atomically
    payment = process_captured_payment(
        gateway_order_id=payload.gateway_order_id,
        gateway_payment_id=payload.gateway_payment_id,
        amount_paid=tx.amount,
        payment_method="online_gateway",
        reference_note="Verified via client checkout signature",
        db=db,
    )

    installment = payment.installment
    return PaymentVerificationResponse(
        success=True,
        status="captured",
        message="Payment verified and recorded successfully",
        receipt_number=payment.receipt_number,
        paid_amount=payment.amount,
        remaining_balance=installment.outstanding_amount if installment else None,
    )


# ==========================================
# Offline Payment & Concession Services
# ==========================================

def record_offline_payment(
    installment_id: uuid.UUID,
    payload: RecordOfflinePaymentRequest,
    actor_user_id: uuid.UUID | None,
    db: Session,
) -> FeeReceiptResponse:
    installment = db.get(FeeInstallment, installment_id)
    if not installment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")

    assignment = installment.assignment
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee assignment not found")

    amount = _round_currency(payload.amount)
    if amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero",
        )

    if amount > installment.outstanding_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Amount (₹{amount}) cannot exceed remaining installment balance (₹{installment.outstanding_amount})",
        )

    pay_date = payload.payment_date or dt.date.today()
    receipt_num = generate_receipt_number(db)

    payment = FeePayment(
        installment_id=installment.id,
        assignment_id=assignment.id,
        transaction_id=None,
        receipt_number=receipt_num,
        amount=amount,
        payment_method=payload.payment_method,
        payment_date=pay_date,
        status="completed",
        reference_note=payload.reference_note or f"Offline payment via {payload.payment_method}",
        recorded_by_user_id=actor_user_id,
    )
    db.add(payment)

    # Update installment
    installment.paid_amount = _round_currency(installment.paid_amount + amount)
    installment.outstanding_amount = _round_currency(
        max(Decimal("0.00"), installment.amount - installment.paid_amount)
    )

    if installment.outstanding_amount <= Decimal("0.00"):
        installment.status = "paid"
    else:
        installment.status = "partially_paid"

    # Check if all installments for assignment are settled
    all_settled = all(inst.status == "paid" for inst in assignment.installments)
    if all_settled:
        assignment.status = "completed"

    db.commit()
    db.refresh(payment)
    return _build_receipt_response(payment)


def apply_student_fee_adjustment(
    assignment_id: uuid.UUID,
    payload: StudentFeeAdjustmentCreate,
    actor_user_id: uuid.UUID | None,
    db: Session,
) -> StudentFeeAssignmentResponse:
    assignment = db.get(StudentFeeAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student fee assignment not found")

    if not payload.description or not payload.description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A clear description/reason is required for every fee adjustment",
        )

    eff_amt = Decimal("0.00")
    if payload.calculation_type == "percentage":
        eff_amt = _round_currency(assignment.base_amount * (Decimal(str(payload.rate)) / Decimal("100")))
    else:
        eff_amt = _round_currency(payload.amount)

    db_adj = StudentFeeAdjustment(
        assignment_id=assignment.id,
        adjustment_type=payload.adjustment_type,
        category=payload.category,
        description=payload.description.strip(),
        calculation_type=payload.calculation_type,
        rate=Decimal(str(payload.rate)) if payload.rate is not None else None,
        amount=eff_amt,
        created_by_user_id=actor_user_id,
    )
    db.add(db_adj)

    # Recalculate totals
    if payload.category in ("discount", "concession"):
        assignment.total_discount = _round_currency(assignment.total_discount + eff_amt)
    else:
        assignment.total_additional = _round_currency(assignment.total_additional + eff_amt)

    new_final = max(Decimal("0.00"), assignment.base_amount - assignment.total_discount + assignment.total_additional)
    assignment.final_payable_amount = _round_currency(new_final)

    # Rebalance remaining unpaid installments
    unpaid_installments = [
        inst for inst in assignment.installments if inst.status in ("pending", "partially_paid", "overdue")
    ]
    if unpaid_installments:
        total_already_paid = sum((inst.paid_amount for inst in assignment.installments), Decimal("0.00"))
        remaining_balance = max(Decimal("0.00"), assignment.final_payable_amount - total_already_paid)
        count = len(unpaid_installments)
        part = _round_currency(remaining_balance / Decimal(count))
        sum_first = part * Decimal(count - 1)
        rem = remaining_balance - sum_first

        for idx, inst in enumerate(unpaid_installments):
            inst.amount = part if idx < count - 1 else rem
            inst.outstanding_amount = max(Decimal("0.00"), inst.amount - inst.paid_amount)
            if inst.outstanding_amount <= Decimal("0.00"):
                inst.status = "paid"
            elif inst.paid_amount > Decimal("0.00"):
                inst.status = "partially_paid"
            else:
                inst.status = "pending"

    db.commit()
    return get_student_fee_assignment_detail(assignment.id, db)


# ==========================================
# Student / Parent Portal Schedule Service
# ==========================================

def get_student_portal_fee_schedule(student_id: uuid.UUID, db: Session) -> StudentPortalFeeScheduleResponse:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    student_name = f"{student.first_name} {student.last_name}"

    assignment = db.execute(
        select(StudentFeeAssignment)
        .where(StudentFeeAssignment.student_id == student_id)
        .order_by(StudentFeeAssignment.created_at.desc())
    ).scalars().first()

    if not assignment:
        return StudentPortalFeeScheduleResponse(
            student_id=student_id,
            student_name=student_name,
            student_code=student.student_code,
        )

    today = dt.date.today()
    total_paid = sum((inst.paid_amount for inst in assignment.installments), Decimal("0.00"))
    total_out = sum((inst.outstanding_amount for inst in assignment.installments), Decimal("0.00"))

    # Load receipts
    all_payments = db.execute(
        select(FeePayment)
        .where(FeePayment.assignment_id == assignment.id)
        .order_by(FeePayment.created_at.desc())
    ).scalars().all()
    receipts_list = [_build_receipt_response(p) for p in all_payments]

    # Map receipts to installments
    receipts_by_inst: dict[uuid.UUID, list[FeeReceiptResponse]] = {}
    for r in receipts_list:
        receipts_by_inst.setdefault(r.installment_id, []).append(r)

    inst_items: list[PortalInstallmentItem] = []
    for inst in sorted(assignment.installments, key=lambda x: x.installment_number):
        is_overdue = inst.due_date < today and inst.outstanding_amount > Decimal("0.00")
        inst_items.append(
            PortalInstallmentItem(
                id=inst.id,
                installment_number=inst.installment_number,
                installment_name=inst.installment_name,
                due_date=inst.due_date,
                amount=inst.amount,
                paid_amount=inst.paid_amount,
                outstanding_amount=inst.outstanding_amount,
                status="overdue" if is_overdue else inst.status,
                is_overdue=is_overdue,
                receipts=receipts_by_inst.get(inst.id, []),
            )
        )

    comp_items = [
        StudentFeeAssignmentItemResponse(
            id=it.id,
            fee_component_id=it.fee_component_id,
            component_name=it.component_name,
            amount=it.amount,
            payment_frequency=it.payment_frequency,
            is_mandatory=it.is_mandatory,
            is_selected=it.is_selected,
        )
        for it in assignment.items
    ]

    adj_items = [
        StudentFeeAdjustmentResponse(
            id=adj.id,
            assignment_id=adj.assignment_id,
            adjustment_type=adj.adjustment_type,
            category=adj.category,
            description=adj.description,
            calculation_type=adj.calculation_type,
            rate=adj.rate,
            amount=adj.amount,
            created_by_user_id=adj.created_by_user_id,
            created_at=adj.created_at,
        )
        for adj in assignment.adjustments
    ]

    return StudentPortalFeeScheduleResponse(
        assignment_id=assignment.id,
        student_id=student.id,
        student_name=student_name,
        student_code=student.student_code,
        grade_name=assignment.grade.name if assignment.grade else None,
        academic_year_name=assignment.academic_year.name if assignment.academic_year else None,
        base_amount=assignment.base_amount,
        total_discount=assignment.total_discount,
        total_additional=assignment.total_additional,
        final_payable_amount=assignment.final_payable_amount,
        total_paid_amount=_round_currency(total_paid),
        total_outstanding_amount=_round_currency(total_out),
        currency=assignment.currency,
        components=comp_items,
        adjustments=adj_items,
        installments=inst_items,
        payment_history=receipts_list,
    )


# ==========================================
# Transaction & Webhook Listing Services
# ==========================================

def list_payment_transactions(
    academic_year_id: uuid.UUID | None,
    grade_id: uuid.UUID | None,
    student_id: uuid.UUID | None,
    status_filter: str | None,
    payment_method: str | None,
    skip: int,
    limit: int,
    db: Session,
) -> PaginatedTransactionsResponse:
    stmt = (
        select(PaymentTransaction)
        .join(Student, PaymentTransaction.student_id == Student.id)
        .join(FeeInstallment, PaymentTransaction.installment_id == FeeInstallment.id)
        .join(StudentFeeAssignment, FeeInstallment.assignment_id == StudentFeeAssignment.id)
    )

    if academic_year_id:
        stmt = stmt.where(StudentFeeAssignment.academic_year_id == academic_year_id)
    if grade_id:
        stmt = stmt.where(StudentFeeAssignment.grade_id == grade_id)
    if student_id:
        stmt = stmt.where(PaymentTransaction.student_id == student_id)
    if status_filter:
        stmt = stmt.where(PaymentTransaction.status == status_filter)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    txs = db.execute(
        stmt.order_by(PaymentTransaction.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    items = []
    for tx in txs:
        student = tx.student
        installment = tx.installment
        assignment = installment.assignment if installment else None
        grade = assignment.grade if assignment else None

        receipt = None
        if tx.payments:
            receipt = tx.payments[0].receipt_number

        items.append(
            PaymentTransactionResponse(
                id=tx.id,
                installment_id=tx.installment_id,
                installment_name=installment.installment_name if installment else None,
                student_id=tx.student_id,
                student_name=f"{student.first_name} {student.last_name}" if student else "Student",
                student_code=student.student_code if student else None,
                grade_name=grade.name if grade else None,
                gateway_provider=tx.gateway_provider,
                gateway_order_id=tx.gateway_order_id,
                gateway_payment_id=tx.gateway_payment_id,
                amount=tx.amount,
                currency=tx.currency,
                status=tx.status,
                receipt_number=receipt,
                error_code=tx.error_code,
                error_description=tx.error_description,
                created_at=tx.created_at,
            )
        )

    return PaginatedTransactionsResponse(items=items, total=total, skip=skip, limit=limit)


def list_webhook_events(
    status_filter: str | None,
    event_type: str | None,
    skip: int,
    limit: int,
    db: Session,
) -> PaginatedWebhookEventsResponse:
    stmt = select(PaymentWebhookEvent)
    if status_filter:
        stmt = stmt.where(PaymentWebhookEvent.processing_status == status_filter)
    if event_type:
        stmt = stmt.where(PaymentWebhookEvent.event_type == event_type)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    evts = db.execute(
        stmt.order_by(PaymentWebhookEvent.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    items = [PaymentWebhookEventResponse.model_validate(e) for e in evts]
    return PaginatedWebhookEventsResponse(items=items, total=total, skip=skip, limit=limit)


def retry_webhook_event(event_id: str, db: Session) -> dict:
    evt = db.execute(
        select(PaymentWebhookEvent).where(PaymentWebhookEvent.event_id == event_id)
    ).scalar_one_or_none()
    if not evt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook event not found")

    raw_body = evt.raw_payload.encode("utf-8")
    return process_webhook_event(raw_body, signature=None, db=db)


