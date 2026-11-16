import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.rollover import (
    RolloverExecutionRequest,
    RolloverExecutionResponse,
    RolloverPreviewResponse,
)
from app.services.rollover_service import (
    execute_academic_year_rollover,
    preview_academic_year_rollover,
)

router = APIRouter(prefix="/rollover", tags=["Academic Year Rollover"])


@router.get("/preview", response_model=RolloverPreviewResponse)
def get_rollover_preview(
    source_year_id: uuid.UUID = Query(..., description="Source academic year ID"),
    target_year_id: uuid.UUID = Query(..., description="Target academic year ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN"])),
):
    """Preview annual student promotion, cohort mapping, and readiness before rollover execution."""
    return preview_academic_year_rollover(
        db,
        source_year_id=source_year_id,
        target_year_id=target_year_id,
    )


@router.post("/execute", response_model=RolloverExecutionResponse, status_code=status.HTTP_200_OK)
def run_academic_year_rollover(
    payload: RolloverExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN"])),
):
    """Execute annual academic rollover: bulk student progression, repeating/leaving handling, and fee initialization."""
    return execute_academic_year_rollover(db, payload=payload, current_user=current_user)
