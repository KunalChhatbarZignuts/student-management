import datetime as dt
import uuid
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.academic_structure import AcademicYear, Grade
from app.models.fee import (
    FeeComponent,
    FeeInstallment,
    FeeStructure,
    FeeStructureItem,
    StudentFeeAdjustment,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
)
from app.models.student import Student
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

