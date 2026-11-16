import datetime as dt
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.substitution import (
    AbsentTeacherCoverageResponse,
    SubstituteCandidate,
    SubstitutionCancelRequest,
    SubstitutionCreateRequest,
    SubstitutionResponse,
)
from app.services.substitution_service import (
    cancel_substitution,
    create_substitution,
    get_absent_teacher_coverage,
    get_substitute_recommendations,
    list_substitutions,
)

router = APIRouter(prefix="/substitutions", tags=["Teacher Substitutions"])


@router.get("/coverage", response_model=AbsentTeacherCoverageResponse)
def get_coverage(
    teacher_id: uuid.UUID = Query(..., description="ID of the teacher"),
    target_date: dt.date = Query(..., alias="date", description="Target date to inspect"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Inspect timetable slots and coverage status for a teacher on a specific date."""
    return get_absent_teacher_coverage(db, teacher_id=teacher_id, target_date=target_date)


@router.get("/recommendations", response_model=list[SubstituteCandidate])
def get_recommendations(
    timetable_entry_id: uuid.UUID = Query(..., description="Timetable slot entry ID"),
    target_date: dt.date = Query(..., alias="date", description="Target date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN", "TEACHER"])),
):
    """Retrieve ranked substitute recommendations for a timetable slot on target_date."""
    return get_substitute_recommendations(db, timetable_entry_id=timetable_entry_id, target_date=target_date)


@router.post("", response_model=SubstitutionResponse, status_code=status.HTTP_201_CREATED)
def assign_substitution(
    payload: SubstitutionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN"])),
):
    """Assign an eligible substitute teacher to an absent teacher's timetable slot."""
    return create_substitution(db, payload=payload, current_user=current_user)


@router.get("", response_model=list[SubstitutionResponse])
def get_substitutions(
    target_date: Optional[dt.date] = Query(None, alias="date"),
    teacher_id: Optional[uuid.UUID] = Query(None),
    as_substitute: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List substitutions with optional filters for date, teacher, and coverage role."""
    return list_substitutions(
        db,
        target_date=target_date,
        teacher_id=teacher_id,
        as_substitute=as_substitute,
    )


@router.post("/{substitution_id}/cancel", response_model=SubstitutionResponse)
def cancel_assigned_substitution(
    substitution_id: uuid.UUID,
    payload: Optional[SubstitutionCancelRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN"])),
):
    """Cancel an active teacher substitution assignment."""
    reason = payload.reason if payload else None
    return cancel_substitution(db, substitution_id=substitution_id, reason=reason)
