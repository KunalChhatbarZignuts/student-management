import datetime as dt
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, get_db, require_roles
from app.modules.academics.structure_models import Grade, Section, TeacherSubject
from app.modules.academics.classroom_models import Subject, TeacherAssignment
from app.modules.diary.models import DiaryConversation, DiaryEntry, DiaryMessage, DiaryNotification
from app.modules.students.parent_models import Parent, ParentStudentLink
from app.modules.students.models import Student
from app.modules.teachers.models import Teacher
from app.modules.auth.models import User, UserRole
from app.modules.diary.schemas import (
    DiaryAcknowledgementCreate,
    DiaryAcknowledgementResponse,
    DiaryConversationResolve,
    DiaryConversationResponse,
    DiaryEntryCreate,
    DiaryEntryResponse,
    DiaryEntryUpdate,
    DiaryMessageCreate,
    DiaryMessageResponse,
    DiaryNotificationResponse,
    DiaryRecipientDetail,
    DiaryRetractRequest,
    DiaryStatsSummary,
)
from app.modules.diary.service import DiaryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/diary", tags=["Digital School Diary"])


def _get_teacher_for_user(db: Session, user: User) -> Teacher:
    teacher = db.execute(
        select(Teacher).where(Teacher.user_id == user.id)
    ).scalar_one_or_none()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found for this account",
        )
    return teacher


def _get_student_for_user(db: Session, user: User) -> Student:
    student = db.execute(
        select(Student).where(Student.user_id == user.id)
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this account",
        )
    return student


def _get_parent_for_user(db: Session, user: User) -> Parent:
    parent = db.execute(
        select(Parent).where(Parent.user_id == user.id)
    ).scalar_one_or_none()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent profile not found for this account",
        )
    return parent


# ==========================================
# TEACHER / ADMIN ENDPOINTS
# ==========================================

@router.get("/teacher-context", response_model=dict[str, Any])
def get_teacher_context(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve assigned sections, subjects, and students for composing diary entries."""
    role = str(current_user.role).upper()
    if role not in ("TEACHER", "ADMIN", "SUPERADMIN"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    if role in ("ADMIN", "SUPERADMIN"):
        # Admin can access all sections and subjects
        sections = db.execute(
            select(Section).options(joinedload(Section.grade)).order_by(Section.name.asc())
        ).scalars().all()
        subjects = db.execute(
            select(Subject).order_by(Subject.name.asc())
        ).scalars().all()
        all_students = db.execute(
            select(Student).order_by(Student.first_name.asc()).limit(300)
        ).scalars().all()

        return {
            "is_admin": True,
            "sections": [
                {
                    "id": str(s.id),
                    "name": s.name,
                    "grade_id": str(s.grade_id) if s.grade_id else None,
                    "grade_name": s.grade.name if s.grade else None,
                }
                for s in sections
            ],
            "subjects": [{"id": str(sb.id), "name": sb.name, "code": sb.code} for sb in subjects],
            "students": [
                {
                    "id": str(st.id),
                    "name": f"{st.first_name} {st.last_name}",
                    "section_id": str(st.current_section_id) if st.current_section_id else None,
                    "student_code": st.student_code,
                    "class_name": st.class_name,
                    "section_name": st.section,
                }
                for st in all_students
            ],
        }

    teacher = _get_teacher_for_user(db, current_user)

    # Fetch teacher's assigned sections and subjects
    assignments = db.execute(
        select(TeacherAssignment)
        .options(
            joinedload(TeacherAssignment.section),
            joinedload(TeacherAssignment.subject),
        )
        .where(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.status == "active",
        )
    ).scalars().all()

    # Academic structure teacher subjects
    ts_list = db.execute(
        select(TeacherSubject)
        .options(
            joinedload(TeacherSubject.subject),
            joinedload(TeacherSubject.grade),
            joinedload(TeacherSubject.section),
        )
        .where(TeacherSubject.teacher_id == teacher.id)
    ).scalars().all()

    sections_dict = {}
    subjects_dict = {}

    for a in assignments:
        if a.section_id:
            sec = db.get(Section, a.section_id)
            if sec:
                sections_dict[str(sec.id)] = {
                    "id": str(sec.id),
                    "name": sec.name,
                    "grade_id": str(sec.grade_id) if sec.grade_id else None,
                    "grade_name": None,
                }
        if a.subject:
            subjects_dict[str(a.subject.id)] = {
                "id": str(a.subject.id),
                "name": a.subject.name,
                "code": a.subject.code,
            }

    for ts in ts_list:
        if ts.section:
            sections_dict[str(ts.section.id)] = {
                "id": str(ts.section.id),
                "name": ts.section.name,
                "grade_id": str(ts.grade_id) if ts.grade_id else None,
                "grade_name": ts.grade.name if ts.grade else None,
            }
        if ts.subject:
            subjects_dict[str(ts.subject.id)] = {
                "id": str(ts.subject.id),
                "name": ts.subject.name,
                "code": ts.subject.code,
            }

    # Fetch students in teacher's sections
    sec_uuids = [uuid.UUID(sid) for sid in sections_dict.keys()]
    students = []
    if sec_uuids:
        st_rows = db.execute(
            select(Student).where(Student.current_section_id.in_(sec_uuids)).order_by(Student.first_name.asc())
        ).scalars().all()
        students = [
            {
                "id": str(st.id),
                "name": f"{st.first_name} {st.last_name}",
                "section_id": str(st.current_section_id) if st.current_section_id else None,
                "student_code": st.student_code,
                "class_name": st.class_name,
                "section_name": st.section,
            }
            for st in st_rows
        ]

    # If teacher has no explicit assignments yet (fresh dev DB), provide all sections so teacher is never blocked
    if not sections_dict:
        fallback_secs = db.execute(select(Section).limit(20)).scalars().all()
        for fs in fallback_secs:
            sections_dict[str(fs.id)] = {
                "id": str(fs.id),
                "name": fs.name,
                "grade_id": str(fs.grade_id) if fs.grade_id else None,
                "grade_name": None,
            }
        fallback_subs = db.execute(select(Subject).limit(20)).scalars().all()
        for fsub in fallback_subs:
            subjects_dict[str(fsub.id)] = {
                "id": str(fsub.id),
                "name": fsub.name,
                "code": fsub.code,
            }
        fallback_st = db.execute(select(Student).limit(50)).scalars().all()
        students = [
            {
                "id": str(st.id),
                "name": f"{st.first_name} {st.last_name}",
                "section_id": str(st.current_section_id) if st.current_section_id else None,
                "student_code": st.student_code,
                "class_name": st.class_name,
                "section_name": st.section,
            }
            for st in fallback_st
        ]

    return {
        "is_admin": False,
        "sections": list(sections_dict.values()),
        "subjects": list(subjects_dict.values()),
        "students": students,
    }


@router.post("/entries", response_model=dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_diary_entry(
    payload: DiaryEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new diary entry as Teacher or Admin."""
    role = str(current_user.role).upper()
    if role not in ("TEACHER", "ADMIN", "SUPERADMIN"):
        raise HTTPException(status_code=403, detail="Only teachers or admins can author diary entries")

    teacher = None
    if role in ("ADMIN", "SUPERADMIN"):
        # Use first teacher or create dummy profile if needed
        teacher = db.execute(select(Teacher)).scalars().first()
        if not teacher:
            raise HTTPException(status_code=400, detail="No teacher profile exists in the system")
    else:
        teacher = _get_teacher_for_user(db, current_user)

    entry = DiaryService.create_entry(db, teacher, payload)
    return {"message": "Diary entry created successfully", "id": str(entry.id), "status": entry.status}


@router.get("/entries", response_model=dict[str, Any])
def list_teacher_entries(
    status: str | None = Query(default=None),
    entry_type: str | None = Query(default=None),
    section_id: uuid.UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List authored diary entries with recipient analytics and filtering."""
    role = str(current_user.role).upper()
    if role not in ("TEACHER", "ADMIN", "SUPERADMIN"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    teacher = _get_teacher_for_user(db, current_user)
    entries, total = DiaryService.get_teacher_entries(
        db=db,
        teacher_id=teacher.id,
        status_filter=status,
        entry_type=entry_type,
        section_id=section_id,
        search=search,
        limit=limit,
        offset=offset,
    )
    return {"entries": entries, "total": total, "limit": limit, "offset": offset}


@router.put("/entries/{entry_id}", response_model=dict[str, Any])
def update_diary_entry(
    entry_id: uuid.UUID,
    payload: DiaryEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update diary entry details, visibility, status, or recipients."""
    entry = DiaryService.update_entry(db, entry_id, current_user, payload)
    return {"message": "Diary entry updated successfully", "id": str(entry.id), "status": entry.status}


@router.post("/entries/{entry_id}/publish", response_model=dict[str, Any])
def publish_diary_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Publish a draft diary entry to students and parents."""
    entry = DiaryService.publish_entry(db, entry_id, current_user)
    return {"message": "Diary entry published successfully", "id": str(entry.id), "status": entry.status}


@router.post("/entries/{entry_id}/retract", response_model=dict[str, Any])
def retract_diary_entry(
    entry_id: uuid.UUID,
    payload: DiaryRetractRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retract an erroneous or obsolete published diary entry."""
    entry = DiaryService.retract_entry(db, entry_id, current_user, payload.reason)
    return {"message": "Diary entry retracted", "id": str(entry.id), "status": entry.status}


@router.delete("/entries/{entry_id}", response_model=dict[str, Any])
def delete_diary_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a diary entry (author teacher or admin only)."""
    DiaryService.delete_entry(db, entry_id, current_user)
    return {"message": "Diary entry deleted successfully", "id": str(entry_id)}


@router.get("/entries/{entry_id}/recipients", response_model=list[DiaryRecipientDetail])
def get_entry_recipients(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Inspect recipient students, read markers, and parent acknowledgements."""
    return DiaryService.get_entry_recipients(db, entry_id, current_user)


# ==========================================
# STUDENT PORTAL ENDPOINTS
# ==========================================

@router.get("/student/entries", response_model=dict[str, Any])
def list_student_entries(
    entry_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student portal diary feed: published homework, feedback, remarks, notices."""
    student = _get_student_for_user(db, current_user)
    entries, total = DiaryService.get_student_entries(
        db=db,
        student_id=student.id,
        entry_type=entry_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    return {"entries": entries, "total": total}


@router.post("/student/entries/{entry_id}/read", response_model=dict[str, Any])
def mark_entry_read_by_student(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a diary entry as read by the authenticated student."""
    student = _get_student_for_user(db, current_user)
    DiaryService.mark_as_read_by_student(db, entry_id, student.id)
    return {"message": "Marked as read", "is_read": True}


# ==========================================
# PARENT PORTAL ENDPOINTS
# ==========================================

@router.get("/parent/entries", response_model=dict[str, Any])
def list_parent_entries(
    student_id: uuid.UUID | None = Query(default=None),
    entry_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parent portal diary feed: filterable by child, with acknowledgement status."""
    parent = _get_parent_for_user(db, current_user)
    entries, total = DiaryService.get_parent_entries(
        db=db,
        parent_id=parent.id,
        student_id=student_id,
        entry_type=entry_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    return {"entries": entries, "total": total}


@router.post("/parent/entries/{entry_id}/acknowledge", response_model=DiaryAcknowledgementResponse)
def acknowledge_entry(
    entry_id: uuid.UUID,
    payload: DiaryAcknowledgementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parent one-click signature/acknowledgement of a published diary entry."""
    parent = _get_parent_for_user(db, current_user)
    ack = DiaryService.acknowledge_entry(db, entry_id, parent, payload)

    student = db.get(Student, ack.student_id)
    return {
        "id": ack.id,
        "diary_entry_id": ack.diary_entry_id,
        "parent_id": ack.parent_id,
        "parent_name": f"{parent.first_name} {parent.last_name}",
        "student_id": ack.student_id,
        "student_name": f"{student.first_name} {student.last_name}" if student else "Student",
        "acknowledged_at": ack.acknowledged_at,
        "notes": ack.notes,
    }


# ==========================================
# CONVERSATIONS & MESSAGING ENDPOINTS
# ==========================================

@router.post("/conversations", response_model=dict[str, Any])
def get_or_create_conversation(
    entry_id: uuid.UUID = Query(...),
    student_id: uuid.UUID = Query(...),
    parent_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Access or initialize 1-on-1 parent-teacher conversation thread."""
    role = str(current_user.role).upper()

    actual_parent_id = parent_id
    if role == "PARENT":
        parent = _get_parent_for_user(db, current_user)
        actual_parent_id = parent.id
    elif not actual_parent_id:
        # Find active parent linked to student
        link = db.execute(
            select(ParentStudentLink).where(
                ParentStudentLink.student_id == student_id,
                ParentStudentLink.status == "active",
            )
        ).scalars().first()
        if not link:
            raise HTTPException(status_code=400, detail="No active parent linked to this student")
        actual_parent_id = link.parent_id

    conv = DiaryService.get_or_create_conversation(
        db, entry_id, student_id, actual_parent_id, current_user
    )
    return {"conversation_id": str(conv.id), "status": conv.status}


@router.get("/conversations/{conversation_id}", response_model=DiaryConversationResponse)
def get_conversation_details(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch conversation thread with messages."""
    conv = db.execute(
        select(DiaryConversation)
        .options(
            joinedload(DiaryConversation.diary_entry).joinedload(DiaryEntry.teacher),
            joinedload(DiaryConversation.student),
            joinedload(DiaryConversation.parent),
            joinedload(DiaryConversation.messages),
            joinedload(DiaryConversation.resolved_by),
        )
        .where(DiaryConversation.id == conversation_id)
    ).unique().scalar_one_or_none()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    teacher_user_id = conv.diary_entry.teacher.user_id if conv.diary_entry and conv.diary_entry.teacher else None
    parent_user_id = conv.parent.user_id if conv.parent else None

    # Role check
    role = str(current_user.role).upper()
    if role not in ("ADMIN", "SUPERADMIN") and current_user.id not in (teacher_user_id, parent_user_id):
        raise HTTPException(status_code=403, detail="Unauthorized for this conversation thread")

    # Mark opposite messages as read
    for m in conv.messages:
        if m.sender_user_id != current_user.id and not m.is_read:
            m.is_read = True
            m.read_at = dt.datetime.now(dt.timezone.utc)
    db.commit()

    teacher_name = (
        f"{conv.diary_entry.teacher.first_name} {conv.diary_entry.teacher.last_name}"
        if conv.diary_entry and conv.diary_entry.teacher
        else "Teacher"
    )
    parent_name = f"{conv.parent.first_name} {conv.parent.last_name}" if conv.parent else "Parent"
    student_name = f"{conv.student.first_name} {conv.student.last_name}" if conv.student else "Student"

    return {
        "id": conv.id,
        "diary_entry_id": conv.diary_entry_id,
        "entry_title": conv.diary_entry.title if conv.diary_entry else "",
        "student_id": conv.student_id,
        "student_name": student_name,
        "parent_id": conv.parent_id,
        "parent_name": parent_name,
        "teacher_id": conv.diary_entry.teacher_id if conv.diary_entry else uuid.uuid4(),
        "teacher_name": teacher_name,
        "status": conv.status,
        "resolved_at": conv.resolved_at,
        "resolved_by_name": conv.resolved_by.email if conv.resolved_by else None,
        "resolution_notes": conv.resolution_notes,
        "created_at": conv.created_at,
        "messages": [
            {
                "id": m.id,
                "conversation_id": m.conversation_id,
                "sender_user_id": m.sender_user_id,
                "sender_role": m.sender_role,
                "sender_name": m.sender_name,
                "message": m.message,
                "attachments": m.attachments or [],
                "is_read": m.is_read,
                "read_at": m.read_at,
                "created_at": m.created_at,
            }
            for m in conv.messages
            if not m.deleted_at
        ],
        "unread_count": sum(1 for m in conv.messages if not m.is_read and m.sender_user_id != current_user.id),
    }


@router.post("/conversations/{conversation_id}/messages", response_model=DiaryMessageResponse)
def post_conversation_message(
    conversation_id: uuid.UUID,
    payload: DiaryMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Post a reply in a diary conversation thread."""
    msg = DiaryService.post_message(db, conversation_id, current_user, payload)
    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_user_id": msg.sender_user_id,
        "sender_role": msg.sender_role,
        "sender_name": msg.sender_name,
        "message": msg.message,
        "attachments": msg.attachments or [],
        "is_read": msg.is_read,
        "read_at": msg.read_at,
        "created_at": msg.created_at,
    }


@router.post("/conversations/{conversation_id}/resolve", response_model=dict[str, Any])
def resolve_conversation(
    conversation_id: uuid.UUID,
    payload: DiaryConversationResolve,
    close: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a conversation thread as RESOLVED or CLOSED."""
    conv = DiaryService.resolve_conversation(db, conversation_id, current_user, payload.resolution_notes, close)
    return {"message": f"Conversation marked as {conv.status}", "status": conv.status}


# ==========================================
# IN-APP NOTIFICATIONS
# ==========================================

@router.get("/notifications", response_model=list[DiaryNotificationResponse])
def get_diary_notifications(
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve in-app notifications related to diary updates and messages."""
    return DiaryService.get_user_notifications(db, current_user.id, unread_only)


@router.post("/notifications/mark-read", response_model=dict[str, Any])
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all diary notifications as read for current user."""
    DiaryService.mark_notifications_read(db, current_user.id)
    return {"message": "All notifications marked as read"}
