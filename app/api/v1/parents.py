import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import send_invite_email
from app.core.security import generate_secure_token, hash_token
from app.models.academic import AttendanceRecord, FeeInvoice, StudentMark
from app.models.invite import Invite
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole, UserStatus
from app.schemas.academic import (
    AttendanceRecordRead,
    AttendanceSummaryResponse,
    FeeInvoiceRead,
    StudentMarkRead,
)
from app.schemas.parent import (
    LinkedStudentSummary,
    ParentCreate,
    ParentLinkResponse,
    ParentResponse,
    ParentUnlinkResponse,
    ParentWithChildrenResponse,
)
from app.schemas.student import StudentResponse
from app.services.audit_service import log_action

router = APIRouter(tags=["Parents"])


@router.get("/admin/parents", response_model=list[ParentWithChildrenResponse])
def list_parents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all parents and their linked children."""
    parents = db.execute(
        select(Parent).order_by(Parent.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    results = []
    for p in parents:
        user = db.get(User, p.user_id)
        links = db.execute(
            select(ParentStudentLink).where(ParentStudentLink.parent_id == p.id)
        ).scalars().all()

        children = []
        for link in links:
            s = db.get(Student, link.student_id)
            if s:
                children.append(
                    LinkedStudentSummary(
                        id=s.id,
                        student_code=s.student_code,
                        first_name=s.first_name,
                        last_name=s.last_name,
                        class_name=s.class_name,
                        section=s.section,
                    )
                )

        results.append(
            ParentWithChildrenResponse(
                id=p.id,
                user_id=p.user_id,
                email=user.email if user else "",
                first_name=p.first_name,
                last_name=p.last_name,
                phone=p.phone,
                children=children,
                created_at=p.created_at,
            )
        )
    return results


@router.post("/admin/parents", response_model=ParentResponse, status_code=status.HTTP_201_CREATED)
def create_parent(
    request: Request,
    payload: ParentCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates a parent account with an invited status and dispatches an invite."""
    existing = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    user = User(
        email=payload.email.lower(),
        role=UserRole.PARENT.value,
        status=UserStatus.INVITED.value,
        password_hash=None,
    )
    db.add(user)
    db.flush()

    parent = Parent(
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
    )
    db.add(parent)
    db.flush()

    raw_token = generate_secure_token()
    invite = Invite(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
    )
    db.add(invite)
    db.commit()

    send_invite_email(user.email, raw_token)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_created",
        entity_type="parent",
        entity_id=str(parent.id),
        ip=ip,
    )

    return ParentResponse.model_validate(parent)


@router.post("/admin/parents/{parent_id}/link-student/{student_id}", response_model=ParentLinkResponse)
def link_parent_to_student(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin links a parent to a student."""
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    existing_link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
        )
    ).scalar_one_or_none()
    if existing_link:
        raise HTTPException(status_code=409, detail="Student is already linked to this parent")

    link = ParentStudentLink(parent_id=parent_id, student_id=student_id)
    db.add(link)
    db.commit()

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_student_linked",
        entity_type="parent_student_link",
        metadata={"parent_id": str(parent_id), "student_id": str(student_id)},
        ip=ip,
    )

    return ParentLinkResponse(
        message="Student linked to parent successfully",
        parent_id=parent_id,
        student_id=student_id,
    )


@router.delete("/admin/parents/{parent_id}/link-student/{student_id}", response_model=ParentUnlinkResponse)
def unlink_parent_student(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin unlinks a student from a parent."""
    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Parent-student relationship link not found")

    db.delete(link)
    db.commit()

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_student_unlinked",
        entity_type="parent_student_link",
        metadata={"parent_id": str(parent_id), "student_id": str(student_id)},
        ip=ip,
    )

    return ParentUnlinkResponse(
        message="Parent and student unlinked successfully",
        parent_id=parent_id,
        student_id=student_id,
    )


@router.get("/parents/me/children", response_model=list[StudentResponse])
def get_my_children(
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent endpoint: strictly returns only the students linked to this parent."""
    parent = _get_parent_profile(current_user.id, db)
    links = db.execute(
        select(ParentStudentLink).where(ParentStudentLink.parent_id == parent.id)
    ).scalars().all()

    students = [db.get(Student, l.student_id) for l in links if l.student_id]
    return [StudentResponse.model_validate(s) for s in students if s is not None]


def _get_parent_profile(user_id, db: Session) -> Parent:
    parent = db.execute(select(Parent).where(Parent.user_id == user_id)).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return parent


def _verify_parent_child_link(parent_id: uuid.UUID, student_id: uuid.UUID, db: Session) -> Student:
    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student is not linked to your guardian account",
        )
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    return student


@router.get("/parents/me/children/{student_id}/attendance", response_model=AttendanceSummaryResponse)
def get_child_attendance(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent endpoint: view linked child's attendance record."""
    parent = _get_parent_profile(current_user.id, db)
    _verify_parent_child_link(parent.id, student_id, db)

    records = (
        db.execute(
            select(AttendanceRecord)
            .where(AttendanceRecord.student_id == student_id)
            .order_by(AttendanceRecord.date.desc())
        )
        .scalars()
        .all()
    )

    total = len(records)
    attended = len([r for r in records if r.status in ("present", "excused")])
    excused = len([r for r in records if r.status == "excused"])
    pct = round((attended / total * 100), 1) if total > 0 else 100.0

    return AttendanceSummaryResponse(
        total_classes=total,
        attended_classes=attended,
        percentage=pct,
        excused_absences=excused,
        records=[AttendanceRecordRead.model_validate(r) for r in records],
    )


@router.get("/parents/me/children/{student_id}/marks", response_model=list[StudentMarkRead])
def get_child_marks(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent endpoint: view linked child's marks and evaluations."""
    parent = _get_parent_profile(current_user.id, db)
    _verify_parent_child_link(parent.id, student_id, db)

    marks = (
        db.execute(
            select(StudentMark)
            .where(StudentMark.student_id == student_id)
            .order_by(StudentMark.subject.asc())
        )
        .scalars()
        .all()
    )
    return [StudentMarkRead.model_validate(m) for m in marks]


@router.get("/parents/me/children/{student_id}/fees", response_model=list[FeeInvoiceRead])
def get_child_fees(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent endpoint: view linked child's tuition fees and invoice records."""
    parent = _get_parent_profile(current_user.id, db)
    _verify_parent_child_link(parent.id, student_id, db)

    invoices = (
        db.execute(
            select(FeeInvoice)
            .where(FeeInvoice.student_id == student_id)
            .order_by(FeeInvoice.due_date.asc())
        )
        .scalars()
        .all()
    )
    return [FeeInvoiceRead.model_validate(inv) for inv in invoices]
