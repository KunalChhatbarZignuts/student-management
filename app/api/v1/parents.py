import datetime as dt
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_client_ip, get_db, require_roles
from app.core.email import send_invite_email
from app.core.security import generate_secure_token, hash_token, hash_password
from app.models.academic import AttendanceRecord, FeeInvoice, StudentMark
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.classroom import Class, Subject, TeacherAssignment
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
    LinkChildPayload,
    LinkedChildDetail,
    LinkedParentDetail,
    LinkedStudentSummary,
    PaginatedParentsResponse,
    ParentCreate,
    ParentLinkResponse,
    ParentNotificationItem,
    ParentProfileUpdate,
    ParentResponse,
    ParentStatusUpdate,
    ParentUnlinkResponse,
    ParentUpdate,
    ParentWithChildrenResponse,
    UpdateRelationshipPayload,
)
from app.schemas.student import StudentResponse
from app.services.audit_service import log_action

router = APIRouter(tags=["Parents & Guardian Management"])


# ==========================================
# Helpers
# ==========================================

def _build_linked_child_detail(db: Session, link: ParentStudentLink, student: Student) -> LinkedChildDetail:
    active_enr = db.execute(
        select(StudentEnrollment)
        .where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        )
        .order_by(StudentEnrollment.created_at.desc())
    ).scalar_one_or_none()

    cur_year = None
    cur_grade = student.class_name
    cur_sec = student.section
    teacher_name = None

    if active_enr:
        if active_enr.academic_year_id:
            y = db.get(AcademicYear, active_enr.academic_year_id)
            if y:
                cur_year = y.name
        if active_enr.grade_id:
            g = db.get(Grade, active_enr.grade_id)
            if g:
                cur_grade = g.name
        if active_enr.section_id:
            s = db.get(Section, active_enr.section_id)
            if s:
                cur_sec = s.name
                if s.teacher_assignments:
                    for ta in s.teacher_assignments:
                        if getattr(ta, "role", "") == "class_teacher" and getattr(ta, "is_active", True) and ta.teacher:
                            teacher_name = f"{ta.teacher.first_name} {ta.teacher.last_name}"
                            break

    return LinkedChildDetail(
        id=student.id,
        relationship_id=link.id,
        student_id=student.id,
        student_code=student.student_code,
        enrollment_number=student.enrollment_number,
        first_name=student.first_name,
        last_name=student.last_name,
        dob=student.dob,
        class_name=cur_grade,
        section=cur_sec,
        department=student.department,
        academic_year=cur_year,
        class_teacher_name=teacher_name,
        relationship_type=link.relationship_type,
        is_primary_guardian=link.is_primary_guardian,
        verification_status=link.verification_status,
        status=link.status,
        linked_at=link.linked_at,
    )


def _get_parent_profile(user_id: uuid.UUID, db: Session) -> Parent:
    parent = db.execute(select(Parent).where(Parent.user_id == user_id)).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return parent


def _verify_parent_child_link(parent_id: uuid.UUID, student_id: uuid.UUID, db: Session) -> Student:
    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
            ParentStudentLink.status == "active",
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


# ==========================================
# 1. Admin Parent Management APIs
# ==========================================

@router.get("/admin/parents", response_model=PaginatedParentsResponse)
def list_parents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None, description="Search by name, email, or phone"),
    status: str | None = Query(None, description="Filter by account status"),
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list parents with search, status filtering, and child count."""
    query = select(Parent).join(User, Parent.user_id == User.id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Parent.first_name.ilike(term),
                Parent.last_name.ilike(term),
                Parent.phone.ilike(term),
                User.email.ilike(term),
            )
        )

    if status and status.strip():
        query = query.where(User.status == status.strip().lower())

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    parents = db.execute(
        query.order_by(Parent.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    items = []
    for p in parents:
        user = db.get(User, p.user_id)
        links = db.execute(
            select(ParentStudentLink).where(
                ParentStudentLink.parent_id == p.id,
                ParentStudentLink.status == "active",
            )
        ).scalars().all()

        children = []
        for link in links:
            s = db.get(Student, link.student_id)
            if s:
                children.append(_build_linked_child_detail(db, link, s))

        items.append(
            ParentWithChildrenResponse(
                id=p.id,
                user_id=p.user_id,
                email=user.email if user else "",
                first_name=p.first_name,
                last_name=p.last_name,
                phone=p.phone,
                address=p.address,
                profile_image=p.profile_image,
                user_status=user.status if user else "invited",
                children_count=len(children),
                children=children,
                created_at=p.created_at,
            )
        )

    return PaginatedParentsResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/admin/parents", response_model=ParentResponse, status_code=status.HTTP_201_CREATED)
def create_parent(
    request: Request,
    payload: ParentCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin creates a parent account, creates user with role PARENT in invited status, and sends invitation email."""
    existing = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    initial_password = None
    if payload.password and payload.password.strip():
        initial_password = payload.password.strip()
        user_status = UserStatus.ACTIVE.value
        pwd_hash = hash_password(initial_password)
    else:
        user_status = UserStatus.INVITED.value
        pwd_hash = None

    user = User(
        email=payload.email.lower(),
        role=UserRole.PARENT.value,
        status=user_status,
        password_hash=pwd_hash,
    )
    db.add(user)
    db.flush()

    parent = Parent(
        user_id=user.id,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        address=payload.address.strip() if payload.address else None,
        profile_image=payload.profile_image,
    )
    db.add(parent)
    db.flush()

    if user_status == UserStatus.INVITED.value:
        raw_token = generate_secure_token()
        invite = Invite(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
        )
        db.add(invite)
        send_invite_email(user.email, raw_token)

    db.commit()
    db.refresh(parent)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_created",
        entity_type="parent",
        entity_id=str(parent.id),
        ip=ip,
    )

    return ParentResponse(
        id=parent.id,
        user_id=parent.user_id,
        email=user.email,
        first_name=parent.first_name,
        last_name=parent.last_name,
        phone=parent.phone,
        address=parent.address,
        profile_image=parent.profile_image,
        user_status=user.status,
        created_at=parent.created_at,
        updated_at=parent.updated_at,
        initial_password=initial_password,
        login_identifier=user.email,
    )


@router.get("/admin/parents/available-students")
def get_available_students_for_linking(
    search: str | None = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin endpoint to retrieve enrolled students who are not yet linked to any active parent profile."""
    linked_subquery = select(ParentStudentLink.student_id).where(ParentStudentLink.status == "active")

    query = select(Student).where(Student.id.not_in(linked_subquery))
    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.where(
            (Student.first_name.ilike(s))
            | (Student.last_name.ilike(s))
            | (Student.student_code.ilike(s))
            | (Student.enrollment_number.ilike(s))
        )
    students = db.execute(query.order_by(Student.first_name.asc())).scalars().all()

    items = []
    for st in students:
        class_name = st.class_name
        sec_name = st.section
        active_enr = db.execute(
            select(StudentEnrollment).where(
                StudentEnrollment.student_id == st.id,
                StudentEnrollment.status == "ACTIVE",
            ).order_by(StudentEnrollment.created_at.desc())
        ).scalars().first()
        if active_enr:
            if active_enr.grade_id:
                g = db.get(Grade, active_enr.grade_id)
                if g:
                    class_name = g.name
            if active_enr.section_id:
                s = db.get(Section, active_enr.section_id)
                if s:
                    sec_name = s.name

        items.append({
            "id": str(st.id),
            "student_code": st.student_code,
            "enrollment_number": st.enrollment_number or st.student_code,
            "first_name": st.first_name,
            "last_name": st.last_name,
            "class_name": class_name or "Class",
            "section": sec_name or "A",
            "label": f"{st.first_name} {st.last_name} ({st.enrollment_number or st.student_code}) - {class_name or 'Class'} ({sec_name or 'A'})",
        })
    return items


@router.get("/admin/parents/{parent_id}", response_model=ParentWithChildrenResponse)
def get_parent_detail(
    parent_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin retrieves full details for a specific parent including active linked children."""
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    user = db.get(User, parent.user_id)
    links = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.status == "active",
        )
    ).scalars().all()

    children = []
    for link in links:
        s = db.get(Student, link.student_id)
        if s:
            children.append(_build_linked_child_detail(db, link, s))

    return ParentWithChildrenResponse(
        id=parent.id,
        user_id=parent.user_id,
        email=user.email if user else "",
        first_name=parent.first_name,
        last_name=parent.last_name,
        phone=parent.phone,
        address=parent.address,
        profile_image=parent.profile_image,
        user_status=user.status if user else "invited",
        children_count=len(children),
        children=children,
        created_at=parent.created_at,
    )


@router.put("/admin/parents/{parent_id}", response_model=ParentResponse)
def update_parent(
    parent_id: uuid.UUID,
    payload: ParentUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin edits parent contact and profile information."""
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    if payload.first_name is not None:
        parent.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        parent.last_name = payload.last_name.strip()
    if payload.phone is not None:
        parent.phone = payload.phone.strip() if payload.phone else None
    if payload.address is not None:
        parent.address = payload.address.strip() if payload.address else None
    if payload.profile_image is not None:
        parent.profile_image = payload.profile_image

    db.commit()
    db.refresh(parent)
    user = db.get(User, parent.user_id)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_updated",
        entity_type="parent",
        entity_id=str(parent.id),
        ip=ip,
    )

    return ParentResponse(
        id=parent.id,
        user_id=parent.user_id,
        email=user.email if user else None,
        first_name=parent.first_name,
        last_name=parent.last_name,
        phone=parent.phone,
        address=parent.address,
        profile_image=parent.profile_image,
        user_status=user.status if user else None,
        created_at=parent.created_at,
        updated_at=parent.updated_at,
    )


@router.patch("/admin/parents/{parent_id}/status", response_model=ParentResponse)
def update_parent_status(
    parent_id: uuid.UUID,
    payload: ParentStatusUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin updates parent account status (active, suspended, deactivated)."""
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    user = db.get(User, parent.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Parent user account not found")

    user.status = payload.status
    db.commit()
    db.refresh(user)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_status_updated",
        entity_type="user",
        entity_id=str(user.id),
        metadata={"new_status": payload.status},
        ip=ip,
    )

    return ParentResponse(
        id=parent.id,
        user_id=parent.user_id,
        email=user.email,
        first_name=parent.first_name,
        last_name=parent.last_name,
        phone=parent.phone,
        address=parent.address,
        profile_image=parent.profile_image,
        user_status=user.status,
        created_at=parent.created_at,
        updated_at=parent.updated_at,
    )


@router.post("/admin/parents/{parent_id}/resend-invite")
@router.post("/admin/parents/{parent_id}/invite")
def resend_parent_invite(
    parent_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin resends an invitation email with a fresh secure activation token."""
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    user = db.get(User, parent.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    raw_token = generate_secure_token()
    invite = Invite(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
    )
    db.add(invite)
    user.status = UserStatus.INVITED.value
    db.commit()

    send_invite_email(user.email, raw_token)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_invite_resent",
        entity_type="parent",
        entity_id=str(parent.id),
        ip=ip,
    )

    return {"message": f"Invitation email successfully resent to {user.email}"}


# ==========================================
# 2. Parent-Student Relationship APIs
# ==========================================

@router.get("/admin/parents/{parent_id}/children", response_model=list[LinkedChildDetail])
def get_parent_children(
    parent_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all children linked to a parent."""
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    links = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.status == "active",
        )
    ).scalars().all()

    children = []
    for link in links:
        s = db.get(Student, link.student_id)
        if s:
            children.append(_build_linked_child_detail(db, link, s))
    return children


@router.post("/admin/parents/{parent_id}/children", response_model=ParentLinkResponse)
def link_child_to_parent(
    parent_id: uuid.UUID,
    payload: LinkChildPayload,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin links a student to a parent with relationship type and primary guardian flag."""
    return _do_link_parent_student(
        parent_id=parent_id,
        student_id=payload.student_id,
        relationship_type=payload.relationship_type,
        is_primary_guardian=payload.is_primary_guardian,
        actor_user_id=current_user.id,
        request=request,
        db=db,
    )


@router.post("/admin/parents/{parent_id}/link-student/{student_id}", response_model=ParentLinkResponse)
def link_parent_to_student_legacy(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Backward compatible path-param linking endpoint."""
    return _do_link_parent_student(
        parent_id=parent_id,
        student_id=student_id,
        relationship_type="Guardian",
        is_primary_guardian=False,
        actor_user_id=current_user.id,
        request=request,
        db=db,
    )


def _do_link_parent_student(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    relationship_type: str,
    is_primary_guardian: bool,
    actor_user_id: uuid.UUID,
    request: Request,
    db: Session,
) -> ParentLinkResponse:
    parent = db.get(Parent, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    # Enforce strict 1-parent-profile per student rule across the institution
    other_active_link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.student_id == student_id,
            ParentStudentLink.parent_id != parent_id,
            ParentStudentLink.status == "active",
        )
    ).scalar_one_or_none()

    if other_active_link:
        other_parent = db.get(Parent, other_active_link.parent_id)
        other_parent_user = db.get(User, other_parent.user_id) if other_parent else None
        other_name = f"{other_parent.first_name} {other_parent.last_name}" if other_parent else "Another parent"
        other_email = f" ({other_parent_user.email})" if other_parent_user and other_parent_user.email else ""
        raise HTTPException(
            status_code=409,
            detail=f"Student is already actively linked to parent profile '{other_name}'{other_email}. Please unlink the student from that profile before reassigning.",
        )

    existing_link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
        )
    ).scalar_one_or_none()

    if existing_link:
        if existing_link.status == "active":
            raise HTTPException(status_code=409, detail="Student is already actively linked to this parent")
        # Reactivate previous inactive link
        existing_link.status = "active"
        existing_link.relationship_type = relationship_type
        existing_link.is_primary_guardian = is_primary_guardian
        existing_link.verification_status = "verified"
        existing_link.linked_by = actor_user_id
        existing_link.linked_at = dt.datetime.now(dt.timezone.utc)
        link = existing_link
    else:
        link = ParentStudentLink(
            parent_id=parent_id,
            student_id=student_id,
            relationship_type=relationship_type,
            is_primary_guardian=is_primary_guardian,
            verification_status="verified",
            status="active",
            linked_by=actor_user_id,
        )
        db.add(link)

    # If is_primary_guardian is True, update student's guardian fields
    if is_primary_guardian:
        p_user = db.get(User, parent.user_id)
        student.guardian_name = f"{parent.first_name} {parent.last_name}"
        if parent.phone:
            student.guardian_phone = parent.phone
        if p_user and p_user.email:
            student.guardian_email = p_user.email

    db.commit()
    db.refresh(link)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=actor_user_id,
        action="parent_student_linked",
        entity_type="parent_student_link",
        entity_id=str(link.id),
        metadata={"parent_id": str(parent_id), "student_id": str(student_id), "relationship_type": relationship_type},
        ip=ip,
    )

    return ParentLinkResponse(
        message="Student linked to parent successfully",
        relationship_id=link.id,
        parent_id=parent_id,
        student_id=student_id,
        relationship_type=link.relationship_type,
        is_primary_guardian=link.is_primary_guardian,
    )


@router.get("/admin/students/{student_id}/parents", response_model=list[LinkedParentDetail])
def get_student_parents(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all parents/guardians linked to a student."""
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    links = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.student_id == student.id,
            ParentStudentLink.status == "active",
        )
    ).scalars().all()

    results = []
    for link in links:
        parent = db.get(Parent, link.parent_id)
        if parent:
            user = db.get(User, parent.user_id)
            results.append(
                LinkedParentDetail(
                    relationship_id=link.id,
                    parent_id=parent.id,
                    user_id=parent.user_id,
                    email=user.email if user else "",
                    first_name=parent.first_name,
                    last_name=parent.last_name,
                    phone=parent.phone,
                    relationship_type=link.relationship_type,
                    is_primary_guardian=link.is_primary_guardian,
                    verification_status=link.verification_status,
                    status=link.status,
                    linked_at=link.linked_at,
                )
            )
    return results


@router.put("/admin/parents/{parent_id}/children/{student_id}", response_model=ParentLinkResponse)
def update_parent_child_relationship(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    payload: UpdateRelationshipPayload,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin updates relationship details between a parent and child."""
    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Relationship link not found")

    if payload.relationship_type is not None:
        link.relationship_type = payload.relationship_type
    if payload.is_primary_guardian is not None:
        link.is_primary_guardian = payload.is_primary_guardian
    if payload.verification_status is not None:
        link.verification_status = payload.verification_status
    if payload.status is not None:
        link.status = payload.status

    db.commit()
    db.refresh(link)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_student_link_updated",
        entity_type="parent_student_link",
        entity_id=str(link.id),
        ip=ip,
    )

    return ParentLinkResponse(
        message="Relationship details updated successfully",
        relationship_id=link.id,
        parent_id=parent_id,
        student_id=student_id,
        relationship_type=link.relationship_type,
        is_primary_guardian=link.is_primary_guardian,
    )


@router.delete("/admin/parents/{parent_id}/children/{student_id}", response_model=ParentUnlinkResponse)
@router.delete("/admin/parents/{parent_id}/link-student/{student_id}", response_model=ParentUnlinkResponse)
def unlink_parent_student(
    parent_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Admin unlinks a student from a parent safely by deactivating the relationship."""
    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
            ParentStudentLink.status == "active",
        )
    ).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Active parent-student relationship link not found")

    # Soft-deactivate to preserve historical link record
    link.status = "inactive"
    db.commit()

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_student_unlinked",
        entity_type="parent_student_link",
        entity_id=str(link.id),
        metadata={"parent_id": str(parent_id), "student_id": str(student_id)},
        ip=ip,
    )

    return ParentUnlinkResponse(
        message="Parent and student unlinked successfully",
        parent_id=parent_id,
        student_id=student_id,
    )


# ==========================================
# 3. Parent Portal APIs (Logged-in Parent)
# ==========================================

@router.get("/parent/me", response_model=ParentWithChildrenResponse)
@router.get("/parent/profile", response_model=ParentWithChildrenResponse)
def get_parent_own_profile(
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: returns the authenticated parent's profile and active linked children."""
    parent = _get_parent_profile(current_user.id, db)

    links = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.status == "active",
        )
    ).scalars().all()

    children = []
    for link in links:
        s = db.get(Student, link.student_id)
        if s:
            children.append(_build_linked_child_detail(db, link, s))

    return ParentWithChildrenResponse(
        id=parent.id,
        user_id=parent.user_id,
        email=current_user.email,
        first_name=parent.first_name,
        last_name=parent.last_name,
        phone=parent.phone,
        address=parent.address,
        profile_image=parent.profile_image,
        user_status=current_user.status,
        children_count=len(children),
        children=children,
        created_at=parent.created_at,
    )


@router.put("/parent/profile", response_model=ParentResponse)
def update_parent_own_profile(
    payload: ParentProfileUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: parent updates their own contact details."""
    parent = _get_parent_profile(current_user.id, db)

    parent.first_name = payload.first_name.strip()
    parent.last_name = payload.last_name.strip()
    parent.phone = payload.phone.strip() if payload.phone else None
    parent.address = payload.address.strip() if payload.address else None
    if payload.profile_image is not None:
        parent.profile_image = payload.profile_image

    db.commit()
    db.refresh(parent)

    ip = get_client_ip(request)
    log_action(
        db,
        actor_user_id=current_user.id,
        action="parent_self_profile_updated",
        entity_type="parent",
        entity_id=str(parent.id),
        ip=ip,
    )

    return ParentResponse(
        id=parent.id,
        user_id=parent.user_id,
        email=current_user.email,
        first_name=parent.first_name,
        last_name=parent.last_name,
        phone=parent.phone,
        address=parent.address,
        profile_image=parent.profile_image,
        user_status=current_user.status,
        created_at=parent.created_at,
        updated_at=parent.updated_at,
    )


@router.get("/parent/children", response_model=list[LinkedChildDetail])
@router.get("/parents/me/children", response_model=list[LinkedChildDetail])
def get_parent_portal_children(
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: list active children linked to the authenticated parent."""
    parent = _get_parent_profile(current_user.id, db)
    links = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.status == "active",
        )
    ).scalars().all()

    children = []
    for link in links:
        s = db.get(Student, link.student_id)
        if s:
            children.append(_build_linked_child_detail(db, link, s))
    return children


@router.get("/parent/children/{student_id}", response_model=LinkedChildDetail)
def get_parent_portal_child_detail(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: view single child details with ownership check."""
    parent = _get_parent_profile(current_user.id, db)
    student = _verify_parent_child_link(parent.id, student_id, db)

    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.student_id == student.id,
            ParentStudentLink.status == "active",
        )
    ).scalar_one()

    return _build_linked_child_detail(db, link, student)


@router.get("/parent/children/{student_id}/attendance", response_model=AttendanceSummaryResponse)
@router.get("/parents/me/children/{student_id}/attendance", response_model=AttendanceSummaryResponse)
def get_child_attendance(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: view child's attendance summary and history."""
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

    records_list = []
    attended = 0
    excused = 0
    for r in records:
        rec_data = AttendanceRecordRead.model_validate(r)
        if rec_data.date is None and r.session_id and r.session:
            rec_data.date = r.session.date
        st_lower = r.status.lower()
        if st_lower in ("present", "excused", "late"):
            attended += 1
        if st_lower == "excused":
            excused += 1
        records_list.append(rec_data)

    total = len(records_list)
    pct = round((attended / total * 100), 1) if total > 0 else 100.0

    return AttendanceSummaryResponse(
        total_classes=total,
        attended_classes=attended,
        percentage=pct,
        excused_absences=excused,
        records=records_list,
    )


@router.get("/parent/children/{student_id}/academics", response_model=list[StudentMarkRead])
@router.get("/parent/children/{student_id}/marks", response_model=list[StudentMarkRead])
@router.get("/parents/me/children/{student_id}/marks", response_model=list[StudentMarkRead])
def get_child_academics(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: view child's examination marks and evaluations."""
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


@router.get("/parent/children/{student_id}/fees", response_model=list[FeeInvoiceRead])
@router.get("/parents/me/children/{student_id}/fees", response_model=list[FeeInvoiceRead])
def get_child_fees(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: view child's tuition fees and invoice records."""
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


@router.get("/parent/children/{student_id}/timetable")
def get_child_timetable(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: view child's published timetable, or fallback schedule."""
    parent = _get_parent_profile(current_user.id, db)
    student = _verify_parent_child_link(parent.id, student_id, db)

    # Attempt to return published school timetable
    try:
        from app.services import timetable_service
        return timetable_service.get_child_timetable_for_parent(current_user.id, student.id, db)
    except HTTPException as e:
        if e.status_code != status.HTTP_404_NOT_FOUND:
            raise e

    # Fallback to assignment schedule if timetable not yet configured/published
    active_enr = db.execute(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id,
            StudentEnrollment.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    section_id = active_enr.section_id if active_enr else None

    assignments = []
    if section_id:
        assignments = db.execute(
            select(TeacherAssignment).where(
                TeacherAssignment.section_id == section_id,
                TeacherAssignment.is_active == True,
            )
        ).scalars().all()

    schedule_items = []
    for a in assignments:
        sub_name = a.subject.name if a.subject else "General"
        sub_code = a.subject.code if a.subject else "GEN"
        t_name = f"{a.teacher.first_name} {a.teacher.last_name}" if a.teacher else "Instructor"
        schedule_items.append({
            "subject": sub_name,
            "subject_code": sub_code,
            "teacher": t_name,
            "assignment_type": a.assignment_type,
            "schedule": "Monday - Friday (Period Assigned)",
        })

    return {
        "student_id": str(student.id),
        "student_name": f"{student.first_name} {student.last_name}",
        "class_name": student.class_name,
        "section": student.section,
        "schedule": schedule_items,
        "entries": [],
        "periods": [],
        "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    }


@router.get("/parent/children/{student_id}/assignments")
def get_child_assignments(
    student_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: view pending homework/assignments for child's class."""
    parent = _get_parent_profile(current_user.id, db)
    student = _verify_parent_child_link(parent.id, student_id, db)

    return {
        "student_id": str(student.id),
        "student_name": f"{student.first_name} {student.last_name}",
        "class_name": student.class_name,
        "section": student.section,
        "assignments": [
            {
                "id": "asgn-01",
                "title": f"Mid-Term Revision Worksheet - {student.class_name}",
                "subject": "Mathematics",
                "due_date": (date.today() + timedelta(days=7)).isoformat(),
                "status": "Assigned",
            },
            {
                "id": "asgn-02",
                "title": "Science Lab Observation Report",
                "subject": "General Science",
                "due_date": (date.today() + timedelta(days=4)).isoformat(),
                "status": "Pending Review",
            },
        ],
    }


@router.get("/parent/notifications", response_model=list[ParentNotificationItem])
def get_parent_notifications(
    current_user: User = Depends(require_roles(UserRole.PARENT.value)),
    db: Session = Depends(get_db),
):
    """Parent Portal: school notifications and academic announcements."""
    parent = _get_parent_profile(current_user.id, db)
    now = datetime.now(timezone.utc)

    return [
        ParentNotificationItem(
            id="notif-1",
            title="Parent-Teacher Conference Scheduled",
            message=f"Dear {parent.first_name}, the upcoming term Parent-Teacher Conference is scheduled for next Friday. Please check the timetable.",
            category="Academic",
            created_at=now - timedelta(days=2),
            is_read=False,
        ),
        ParentNotificationItem(
            id="notif-2",
            title="Term Tuition Fee Notice",
            message="Tuition fee invoices for the upcoming term have been published. Please review under the Fees tab.",
            category="Finance",
            created_at=now - timedelta(days=5),
            is_read=True,
        ),
        ParentNotificationItem(
            id="notif-3",
            title="Sports Day Event Announcement",
            message="Annual school sports meet will be held on the 25th of this month. Parents are cordially invited to attend.",
            category="Events",
            created_at=now - timedelta(days=9),
            is_read=True,
        ),
    ]
