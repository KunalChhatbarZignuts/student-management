import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.fee import (
    FeeCalculationRequest,
    FeeCalculationResponse,
    FeeComponentCreate,
    FeeComponentResponse,
    FeeComponentUpdate,
    FeeDashboardMetricsResponse,
    FeeStructureCreate,
    FeeStructureListItem,
    FeeStructureResponse,
    PaginatedFeeAssignmentsResponse,
    StudentFeeAssignmentResponse,
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
