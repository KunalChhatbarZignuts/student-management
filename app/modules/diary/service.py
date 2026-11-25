import datetime as dt
import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.academics.structure_models import Grade, Section
from app.modules.academics.classroom_models import Subject, TeacherAssignment
from app.modules.diary.models import (
    DiaryAcknowledgement,
    DiaryConversation,
    DiaryEntry,
    DiaryEntryRecipient,
    DiaryMessage,
    DiaryNotification,
)
from app.modules.students.parent_models import Parent, ParentStudentLink
from app.modules.students.models import Student
from app.modules.teachers.models import Teacher
from app.modules.auth.models import User, UserRole
from app.modules.diary.schemas import (
    DiaryAcknowledgementCreate,
    DiaryEntryCreate,
    DiaryEntryUpdate,
    DiaryMessageCreate,
)

logger = logging.getLogger(__name__)


class DiaryService:
    @staticmethod
    def create_entry(
        db: Session,
        teacher: Teacher,
        payload: DiaryEntryCreate,
    ) -> DiaryEntry:
        """Create a new diary entry with recipients and optional publish."""
        # 1. Resolve recipients
        student_ids_to_add: set[uuid.UUID] = set(payload.student_ids or [])

        if not student_ids_to_add and payload.section_id:
            # Add all students from this section
            students_in_sec = db.execute(
                select(Student.id).where(Student.current_section_id == payload.section_id)
            ).scalars().all()
            student_ids_to_add.update(students_in_sec)

        if not student_ids_to_add and not payload.section_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must specify at least one recipient student or select a class section.",
            )

        # Resolve grade_id if omitted but section_id provided
        resolved_grade_id = payload.grade_id
        if not resolved_grade_id and payload.section_id:
            sec = db.get(Section, payload.section_id)
            if sec and sec.grade_id:
                resolved_grade_id = sec.grade_id

        # Resolve category if omitted
        resolved_category = payload.category
        if not resolved_category and payload.entry_type:
            category_map = {
                "DAILY_UPDATE": "ACADEMIC",
                "HOMEWORK": "ACADEMIC",
                "ACADEMIC": "ACADEMIC",
                "BEHAVIOUR": "BEHAVIOUR",
                "POSITIVE_FEEDBACK": "BEHAVIOUR",
                "IMPROVEMENT": "BEHAVIOUR",
                "ACHIEVEMENT": "ACADEMIC",
                "ATTENDANCE": "ADMINISTRATIVE",
                "NOTICE": "GENERAL",
                "PARENT_MEETING": "COMMUNICATION",
                "GENERAL": "GENERAL",
                "CUSTOM": "GENERAL",
            }
            resolved_category = category_map.get(payload.entry_type, "GENERAL")

        now = dt.datetime.now(dt.timezone.utc)
        is_published = payload.status == "PUBLISHED"

        entry = DiaryEntry(
            teacher_id=teacher.id,
            grade_id=resolved_grade_id,
            section_id=payload.section_id,
            subject_id=payload.subject_id,
            title=payload.title,
            description=payload.description,
            entry_type=payload.entry_type,
            category=resolved_category,
            entry_date=payload.entry_date,
            due_date=payload.due_date,
            visibility=payload.visibility,
            requires_acknowledgement=payload.requires_acknowledgement,
            is_conversation_allowed=payload.is_conversation_allowed,
            status=payload.status,
            published_at=now if is_published else None,
            internal_notes=payload.internal_notes,
            attachments=payload.attachments or [],
        )
        db.add(entry)
        db.flush()

        # Add recipients
        for s_id in student_ids_to_add:
            rec = DiaryEntryRecipient(
                diary_entry_id=entry.id,
                student_id=s_id,
            )
            db.add(rec)

        db.flush()

        # If published, trigger notifications
        if is_published:
            DiaryService._notify_recipients_of_entry(db, entry, list(student_ids_to_add))

        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def update_entry(
        db: Session,
        entry_id: uuid.UUID,
        user: User,
        payload: DiaryEntryUpdate,
    ) -> DiaryEntry:
        entry = db.get(DiaryEntry, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")

        # Permission check
        DiaryService._assert_can_edit_entry(db, entry, user)

        if entry.status == "RETRACTED":
            raise HTTPException(
                status_code=400, detail="Cannot edit a retracted diary entry"
            )

        update_data = payload.model_dump(exclude_unset=True)
        student_ids = update_data.pop("student_ids", None)

        now = dt.datetime.now(dt.timezone.utc)
        was_draft = entry.status == "DRAFT"

        for key, value in update_data.items():
            setattr(entry, key, value)

        if was_draft and entry.status == "PUBLISHED" and not entry.published_at:
            entry.published_at = now

        # Update recipients if provided
        if student_ids is not None:
            # Delete old recipients
            db.execute(
                select(DiaryEntryRecipient).where(DiaryEntryRecipient.diary_entry_id == entry.id)
            )
            for old_rec in entry.recipients:
                db.delete(old_rec)
            db.flush()

            for s_id in set(student_ids):
                db.add(DiaryEntryRecipient(diary_entry_id=entry.id, student_id=s_id))
            db.flush()

        if was_draft and entry.status == "PUBLISHED":
            # notify
            rec_ids = [r.student_id for r in entry.recipients]
            DiaryService._notify_recipients_of_entry(db, entry, rec_ids)

        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def publish_entry(db: Session, entry_id: uuid.UUID, user: User) -> DiaryEntry:
        entry = db.get(DiaryEntry, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")

        DiaryService._assert_can_edit_entry(db, entry, user)
        if entry.status == "PUBLISHED":
            return entry

        entry.status = "PUBLISHED"
        entry.published_at = dt.datetime.now(dt.timezone.utc)
        db.flush()

        rec_ids = [r.student_id for r in entry.recipients]
        DiaryService._notify_recipients_of_entry(db, entry, rec_ids)

        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def retract_entry(
        db: Session,
        entry_id: uuid.UUID,
        user: User,
        reason: str,
    ) -> DiaryEntry:
        entry = db.get(DiaryEntry, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")

        DiaryService._assert_can_edit_entry(db, entry, user)
        entry.status = "RETRACTED"
        entry.retracted_at = dt.datetime.now(dt.timezone.utc)
        entry.retraction_reason = reason
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def delete_entry(db: Session, entry_id: uuid.UUID, user: User) -> bool:
        entry = db.get(DiaryEntry, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")

        DiaryService._assert_can_edit_entry(db, entry, user)
        db.delete(entry)
        db.commit()
        return True

    @staticmethod
    def get_teacher_entries(
        db: Session,
        teacher_id: uuid.UUID,
        status_filter: str | None = None,
        entry_type: str | None = None,
        section_id: uuid.UUID | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        stmt = (
            select(DiaryEntry)
            .options(
                joinedload(DiaryEntry.teacher),
                joinedload(DiaryEntry.grade),
                joinedload(DiaryEntry.section),
                joinedload(DiaryEntry.subject),
                joinedload(DiaryEntry.recipients),
                joinedload(DiaryEntry.acknowledgements),
            )
            .where(DiaryEntry.teacher_id == teacher_id)
        )

        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(DiaryEntry.status == status_filter.upper())
        if entry_type and entry_type.upper() != "ALL":
            stmt = stmt.where(DiaryEntry.entry_type == entry_type.upper())
        if section_id:
            stmt = stmt.where(DiaryEntry.section_id == section_id)
        if search:
            search_clause = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    DiaryEntry.title.ilike(search_clause),
                    DiaryEntry.description.ilike(search_clause),
                )
            )

        # Count total
        count_stmt = select(func.count(DiaryEntry.id)).where(DiaryEntry.teacher_id == teacher_id)
        if status_filter and status_filter.upper() != "ALL":
            count_stmt = count_stmt.where(DiaryEntry.status == status_filter.upper())
        if entry_type and entry_type.upper() != "ALL":
            count_stmt = count_stmt.where(DiaryEntry.entry_type == entry_type.upper())
        if section_id:
            count_stmt = count_stmt.where(DiaryEntry.section_id == section_id)
        if search:
            count_stmt = count_stmt.where(
                or_(
                    DiaryEntry.title.ilike(f"%{search.strip()}%"),
                    DiaryEntry.description.ilike(f"%{search.strip()}%"),
                )
            )
        total_count = db.execute(count_stmt).scalar() or 0

        entries = db.execute(
            stmt.order_by(DiaryEntry.entry_date.desc(), DiaryEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).unique().scalars().all()

        results = []
        for e in entries:
            t_name = f"{e.teacher.first_name} {e.teacher.last_name}" if e.teacher else "Teacher"
            total_rec = len(e.recipients)
            read_cnt = sum(1 for r in e.recipients if r.is_read_by_student)
            ack_cnt = len(e.acknowledgements)

            results.append({
                "id": e.id,
                "teacher_id": e.teacher_id,
                "teacher_name": t_name,
                "title": e.title,
                "description": e.description,
                "entry_type": e.entry_type,
                "category": e.category,
                "entry_date": e.entry_date,
                "due_date": e.due_date,
                "visibility": e.visibility,
                "requires_acknowledgement": e.requires_acknowledgement,
                "is_conversation_allowed": e.is_conversation_allowed,
                "status": e.status,
                "published_at": e.published_at,
                "retracted_at": e.retracted_at,
                "retraction_reason": e.retraction_reason,
                "grade_id": e.grade_id,
                "grade_name": e.grade.name if e.grade else None,
                "section_id": e.section_id,
                "section_name": e.section.name if e.section else None,
                "subject_id": e.subject_id,
                "subject_name": e.subject.name if e.subject else None,
                "attachments": e.attachments or [],
                "created_at": e.created_at,
                "updated_at": e.updated_at,
                "internal_notes": e.internal_notes,
                "total_recipients": total_rec,
                "read_count": read_cnt,
                "acknowledged_count": ack_cnt,
            })

        return results, total_count

    @staticmethod
    def get_entry_recipients(
        db: Session,
        entry_id: uuid.UUID,
        user: User,
    ) -> list[dict[str, Any]]:
        entry = db.get(DiaryEntry, entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")

        DiaryService._assert_can_view_recipients(db, entry, user)

        recipients = db.execute(
            select(DiaryEntryRecipient)
            .options(joinedload(DiaryEntryRecipient.student))
            .where(DiaryEntryRecipient.diary_entry_id == entry_id)
        ).scalars().all()

        # Fetch acknowledgements for this entry
        acks = db.execute(
            select(DiaryAcknowledgement)
            .options(joinedload(DiaryAcknowledgement.parent))
            .where(DiaryAcknowledgement.diary_entry_id == entry_id)
        ).scalars().all()
        ack_map = {a.student_id: a for a in acks}

        result = []
        for r in recipients:
            st = r.student
            st_name = f"{st.first_name} {st.last_name}" if st else "Student"
            ack = ack_map.get(r.student_id)
            p_name = f"{ack.parent.first_name} {ack.parent.last_name}" if ack and ack.parent else None

            result.append({
                "id": r.id,
                "student_id": r.student_id,
                "student_name": st_name,
                "student_code": st.student_code if st else None,
                "class_name": st.class_name if st else None,
                "section_name": st.section if st else None,
                "is_read": r.is_read_by_student,
                "read_at": r.student_read_at,
                "is_acknowledged": ack is not None,
                "acknowledged_at": ack.acknowledged_at if ack else None,
                "parent_name": p_name,
            })

        return result

    @staticmethod
    def get_student_entries(
        db: Session,
        student_id: uuid.UUID,
        entry_type: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Student portal view: published entries where visibility allows student."""
        stmt = (
            select(DiaryEntry, DiaryEntryRecipient)
            .join(DiaryEntryRecipient, DiaryEntryRecipient.diary_entry_id == DiaryEntry.id)
            .options(
                joinedload(DiaryEntry.teacher),
                joinedload(DiaryEntry.grade),
                joinedload(DiaryEntry.section),
                joinedload(DiaryEntry.subject),
            )
            .where(
                DiaryEntryRecipient.student_id == student_id,
                DiaryEntry.status == "PUBLISHED",
                DiaryEntry.visibility.in_(["STUDENT_AND_PARENT", "STUDENT_ONLY"]),
            )
        )

        if entry_type and entry_type.upper() != "ALL":
            stmt = stmt.where(DiaryEntry.entry_type == entry_type.upper())
        if search:
            search_clause = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    DiaryEntry.title.ilike(search_clause),
                    DiaryEntry.description.ilike(search_clause),
                )
            )

        # Count
        count_stmt = (
            select(func.count(DiaryEntry.id))
            .join(DiaryEntryRecipient, DiaryEntryRecipient.diary_entry_id == DiaryEntry.id)
            .where(
                DiaryEntryRecipient.student_id == student_id,
                DiaryEntry.status == "PUBLISHED",
                DiaryEntry.visibility.in_(["STUDENT_AND_PARENT", "STUDENT_ONLY"]),
            )
        )
        if entry_type and entry_type.upper() != "ALL":
            count_stmt = count_stmt.where(DiaryEntry.entry_type == entry_type.upper())
        if search:
            count_stmt = count_stmt.where(
                or_(
                    DiaryEntry.title.ilike(f"%{search.strip()}%"),
                    DiaryEntry.description.ilike(f"%{search.strip()}%"),
                )
            )
        total_count = db.execute(count_stmt).scalar() or 0

        rows = db.execute(
            stmt.order_by(DiaryEntry.entry_date.desc(), DiaryEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()

        results = []
        for entry, recipient in rows:
            t_name = f"{entry.teacher.first_name} {entry.teacher.last_name}" if entry.teacher else "Teacher"
            results.append({
                "id": entry.id,
                "teacher_id": entry.teacher_id,
                "teacher_name": t_name,
                "title": entry.title,
                "description": entry.description,
                "entry_type": entry.entry_type,
                "category": entry.category,
                "entry_date": entry.entry_date,
                "due_date": entry.due_date,
                "visibility": entry.visibility,
                "requires_acknowledgement": entry.requires_acknowledgement,
                "is_conversation_allowed": entry.is_conversation_allowed,
                "status": entry.status,
                "published_at": entry.published_at,
                "grade_id": entry.grade_id,
                "grade_name": entry.grade.name if entry.grade else None,
                "section_id": entry.section_id,
                "section_name": entry.section.name if entry.section else None,
                "subject_id": entry.subject_id,
                "subject_name": entry.subject.name if entry.subject else None,
                "attachments": entry.attachments or [],
                "created_at": entry.created_at,
                "updated_at": entry.updated_at,
                "internal_notes": None,  # Scrubbed from student
                "is_read_by_student": recipient.is_read_by_student,
                "target_student_id": student_id,
            })

        return results, total_count

    @staticmethod
    def mark_as_read_by_student(
        db: Session,
        entry_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> bool:
        rec = db.execute(
            select(DiaryEntryRecipient).where(
                DiaryEntryRecipient.diary_entry_id == entry_id,
                DiaryEntryRecipient.student_id == student_id,
            )
        ).scalar_one_or_none()
        if not rec:
            raise HTTPException(status_code=404, detail="Entry recipient not found")

        if not rec.is_read_by_student:
            rec.is_read_by_student = True
            rec.student_read_at = dt.datetime.now(dt.timezone.utc)
            db.commit()
        return True

    @staticmethod
    def get_parent_entries(
        db: Session,
        parent_id: uuid.UUID,
        student_id: uuid.UUID | None = None,
        entry_type: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Parent portal view: published entries for linked children."""
        # Validate parent-student linkage
        linked_students_stmt = select(ParentStudentLink.student_id).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.status == "active",
        )
        if student_id:
            linked_students_stmt = linked_students_stmt.where(
                ParentStudentLink.student_id == student_id
            )
        allowed_student_ids = db.execute(linked_students_stmt).scalars().all()
        if not allowed_student_ids:
            return [], 0

        stmt = (
            select(DiaryEntry, DiaryEntryRecipient, Student)
            .join(DiaryEntryRecipient, DiaryEntryRecipient.diary_entry_id == DiaryEntry.id)
            .join(Student, Student.id == DiaryEntryRecipient.student_id)
            .options(
                joinedload(DiaryEntry.teacher),
                joinedload(DiaryEntry.grade),
                joinedload(DiaryEntry.section),
                joinedload(DiaryEntry.subject),
            )
            .where(
                DiaryEntryRecipient.student_id.in_(allowed_student_ids),
                DiaryEntry.status == "PUBLISHED",
                DiaryEntry.visibility.in_(["STUDENT_AND_PARENT", "PARENT_ONLY"]),
            )
        )

        if entry_type and entry_type.upper() != "ALL":
            stmt = stmt.where(DiaryEntry.entry_type == entry_type.upper())
        if search:
            search_clause = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    DiaryEntry.title.ilike(search_clause),
                    DiaryEntry.description.ilike(search_clause),
                )
            )

        # Count
        count_stmt = (
            select(func.count(DiaryEntry.id))
            .join(DiaryEntryRecipient, DiaryEntryRecipient.diary_entry_id == DiaryEntry.id)
            .where(
                DiaryEntryRecipient.student_id.in_(allowed_student_ids),
                DiaryEntry.status == "PUBLISHED",
                DiaryEntry.visibility.in_(["STUDENT_AND_PARENT", "PARENT_ONLY"]),
            )
        )
        if entry_type and entry_type.upper() != "ALL":
            count_stmt = count_stmt.where(DiaryEntry.entry_type == entry_type.upper())
        if search:
            count_stmt = count_stmt.where(
                or_(
                    DiaryEntry.title.ilike(f"%{search.strip()}%"),
                    DiaryEntry.description.ilike(f"%{search.strip()}%"),
                )
            )
        total_count = db.execute(count_stmt).scalar() or 0

        rows = db.execute(
            stmt.order_by(DiaryEntry.entry_date.desc(), DiaryEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()

        results = []
        for entry, recipient, st in rows:
            t_name = f"{entry.teacher.first_name} {entry.teacher.last_name}" if entry.teacher else "Teacher"
            st_name = f"{st.first_name} {st.last_name}"

            # Check acknowledgement
            ack = db.execute(
                select(DiaryAcknowledgement).where(
                    DiaryAcknowledgement.diary_entry_id == entry.id,
                    DiaryAcknowledgement.parent_id == parent_id,
                    DiaryAcknowledgement.student_id == st.id,
                )
            ).scalar_one_or_none()

            # Check conversation
            conv = db.execute(
                select(DiaryConversation.id).where(
                    DiaryConversation.diary_entry_id == entry.id,
                    DiaryConversation.parent_id == parent_id,
                    DiaryConversation.student_id == st.id,
                )
            ).scalar_one_or_none()

            results.append({
                "id": entry.id,
                "teacher_id": entry.teacher_id,
                "teacher_name": t_name,
                "title": entry.title,
                "description": entry.description,
                "entry_type": entry.entry_type,
                "category": entry.category,
                "entry_date": entry.entry_date,
                "due_date": entry.due_date,
                "visibility": entry.visibility,
                "requires_acknowledgement": entry.requires_acknowledgement,
                "is_conversation_allowed": entry.is_conversation_allowed,
                "status": entry.status,
                "published_at": entry.published_at,
                "grade_id": entry.grade_id,
                "grade_name": entry.grade.name if entry.grade else None,
                "section_id": entry.section_id,
                "section_name": entry.section.name if entry.section else None,
                "subject_id": entry.subject_id,
                "subject_name": entry.subject.name if entry.subject else None,
                "attachments": entry.attachments or [],
                "created_at": entry.created_at,
                "updated_at": entry.updated_at,
                "internal_notes": None,  # Scrubbed from parent
                "is_read_by_student": recipient.is_read_by_student,
                "is_acknowledged": ack is not None,
                "acknowledgement_id": ack.id if ack else None,
                "conversation_id": conv,
                "target_student_id": st.id,
                "target_student_name": st_name,
            })

        return results, total_count

    @staticmethod
    def acknowledge_entry(
        db: Session,
        entry_id: uuid.UUID,
        parent: Parent,
        payload: DiaryAcknowledgementCreate,
    ) -> DiaryAcknowledgement:
        # Validate parent is linked to student
        link = db.execute(
            select(ParentStudentLink).where(
                ParentStudentLink.parent_id == parent.id,
                ParentStudentLink.student_id == payload.student_id,
                ParentStudentLink.status == "active",
            )
        ).scalar_one_or_none()
        if not link:
            raise HTTPException(
                status_code=403, detail="Not authorized for this student"
            )

        entry = db.get(DiaryEntry, entry_id)
        if not entry or entry.status != "PUBLISHED":
            raise HTTPException(
                status_code=404, detail="Published diary entry not found"
            )

        # Check existing acknowledgement
        existing = db.execute(
            select(DiaryAcknowledgement).where(
                DiaryAcknowledgement.diary_entry_id == entry_id,
                DiaryAcknowledgement.parent_id == parent.id,
                DiaryAcknowledgement.student_id == payload.student_id,
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        ack = DiaryAcknowledgement(
            diary_entry_id=entry_id,
            parent_id=parent.id,
            student_id=payload.student_id,
            notes=payload.notes,
        )
        db.add(ack)

        # Notify the teacher
        teacher = db.get(Teacher, entry.teacher_id)
        if teacher and teacher.user_id:
            parent_name = f"{parent.first_name} {parent.last_name}"
            student = db.get(Student, payload.student_id)
            student_name = f"{student.first_name} {student.last_name}" if student else "Student"
            notif = DiaryNotification(
                user_id=teacher.user_id,
                title="Diary Entry Acknowledged",
                content=f"{parent_name} has acknowledged '{entry.title}' for {student_name}.",
                event_type="DIARY_ACKNOWLEDGED",
                reference_id=entry.id,
                reference_type="DIARY_ENTRY",
            )
            db.add(notif)

        db.commit()
        db.refresh(ack)
        return ack

    # --- Conversation / Messaging ---

    @staticmethod
    def get_or_create_conversation(
        db: Session,
        entry_id: uuid.UUID,
        student_id: uuid.UUID,
        parent_id: uuid.UUID,
        user: User,
    ) -> DiaryConversation:
        entry = db.get(DiaryEntry, entry_id)
        if not entry or entry.status != "PUBLISHED":
            raise HTTPException(status_code=404, detail="Published diary entry not found")

        if not entry.is_conversation_allowed:
            raise HTTPException(
                status_code=400, detail="Conversations are disabled for this diary entry"
            )

        # Ensure user is parent, teacher, or admin
        conv = db.execute(
            select(DiaryConversation)
            .options(
                joinedload(DiaryConversation.messages),
                joinedload(DiaryConversation.student),
                joinedload(DiaryConversation.parent),
                joinedload(DiaryConversation.diary_entry),
            )
            .where(
                DiaryConversation.diary_entry_id == entry_id,
                DiaryConversation.student_id == student_id,
                DiaryConversation.parent_id == parent_id,
            )
        ).unique().scalar_one_or_none()

        if not conv:
            conv = DiaryConversation(
                diary_entry_id=entry_id,
                student_id=student_id,
                parent_id=parent_id,
                status="OPEN",
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)

        return conv

    @staticmethod
    def post_message(
        db: Session,
        conversation_id: uuid.UUID,
        sender_user: User,
        payload: DiaryMessageCreate,
    ) -> DiaryMessage:
        conv = db.execute(
            select(DiaryConversation)
            .options(
                joinedload(DiaryConversation.diary_entry),
                joinedload(DiaryConversation.parent),
                joinedload(DiaryConversation.student),
            )
            .where(DiaryConversation.id == conversation_id)
        ).unique().scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conv.status == "CLOSED":
            raise HTTPException(
                status_code=400, detail="Cannot send messages to a closed conversation"
            )

        sender_role = str(sender_user.role).upper()
        sender_name = sender_user.email

        # If teacher, get teacher name
        if sender_role in ("TEACHER", "USER"):
            teacher = db.execute(
                select(Teacher).where(Teacher.user_id == sender_user.id)
            ).scalar_one_or_none()
            if teacher:
                sender_name = f"{teacher.first_name} {teacher.last_name}"
                sender_role = "TEACHER"

        if sender_role == "PARENT":
            parent = db.execute(
                select(Parent).where(Parent.user_id == sender_user.id)
            ).scalar_one_or_none()
            if parent:
                sender_name = f"{parent.first_name} {parent.last_name}"

        msg = DiaryMessage(
            conversation_id=conversation_id,
            sender_user_id=sender_user.id,
            sender_role=sender_role,
            sender_name=sender_name,
            message=payload.message,
            attachments=payload.attachments or [],
        )
        db.add(msg)

        # Send in-app notification to counter-party
        if sender_role == "PARENT":
            # Notify teacher
            teacher = db.get(Teacher, conv.diary_entry.teacher_id)
            if teacher and teacher.user_id:
                db.add(
                    DiaryNotification(
                        user_id=teacher.user_id,
                        title="New Message from Parent",
                        content=f"{sender_name} replied on diary note '{conv.diary_entry.title}': {payload.message[:60]}",
                        event_type="DIARY_MESSAGE",
                        reference_id=conv.id,
                        reference_type="DIARY_CONVERSATION",
                    )
                )
        else:
            # Notify parent
            if conv.parent and conv.parent.user_id:
                db.add(
                    DiaryNotification(
                        user_id=conv.parent.user_id,
                        title="Teacher Response",
                        content=f"{sender_name} responded to diary note '{conv.diary_entry.title}': {payload.message[:60]}",
                        event_type="DIARY_MESSAGE",
                        reference_id=conv.id,
                        reference_type="DIARY_CONVERSATION",
                    )
                )

        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def resolve_conversation(
        db: Session,
        conversation_id: uuid.UUID,
        user: User,
        resolution_notes: str | None,
        close: bool = False,
    ) -> DiaryConversation:
        conv = db.get(DiaryConversation, conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conv.status = "CLOSED" if close else "RESOLVED"
        conv.resolved_at = dt.datetime.now(dt.timezone.utc)
        conv.resolved_by_user_id = user.id
        conv.resolution_notes = resolution_notes
        db.commit()
        db.refresh(conv)
        return conv

    # --- Notifications ---

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: uuid.UUID,
        unread_only: bool = False,
    ) -> list[DiaryNotification]:
        stmt = select(DiaryNotification).where(DiaryNotification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(DiaryNotification.is_read.is_(False))
        return list(
            db.execute(stmt.order_by(DiaryNotification.created_at.desc()).limit(30)).scalars().all()
        )

    @staticmethod
    def mark_notifications_read(db: Session, user_id: uuid.UUID) -> None:
        notifs = db.execute(
            select(DiaryNotification).where(
                DiaryNotification.user_id == user_id,
                DiaryNotification.is_read.is_(False),
            )
        ).scalars().all()
        for n in notifs:
            n.is_read = True
        db.commit()

    # --- Private Helpers ---

    @staticmethod
    def _assert_can_edit_entry(db: Session, entry: DiaryEntry, user: User) -> None:
        role = str(user.role).upper()
        if role in ("ADMIN", "SUPERADMIN"):
            return
        teacher = db.execute(
            select(Teacher).where(Teacher.user_id == user.id)
        ).scalar_one_or_none()
        if not teacher or teacher.id != entry.teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the author teacher or administrator can edit this entry",
            )

    @staticmethod
    def _assert_can_view_recipients(db: Session, entry: DiaryEntry, user: User) -> None:
        role = str(user.role).upper()
        if role in ("ADMIN", "SUPERADMIN"):
            return
        teacher = db.execute(
            select(Teacher).where(Teacher.user_id == user.id)
        ).scalar_one_or_none()
        if not teacher or teacher.id != entry.teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to inspect recipients for this entry",
            )

    @staticmethod
    def _notify_recipients_of_entry(
        db: Session,
        entry: DiaryEntry,
        student_ids: list[uuid.UUID],
    ) -> None:
        if not student_ids:
            return

        # 1. Notify students if visibility permits
        if entry.visibility in ("STUDENT_AND_PARENT", "STUDENT_ONLY"):
            students = db.execute(
                select(Student).where(Student.id.in_(student_ids))
            ).scalars().all()
            for s in students:
                if s.user_id:
                    db.add(
                        DiaryNotification(
                            user_id=s.user_id,
                            title=f"New Diary Update: {entry.title}",
                            content=f"Teacher posted a {entry.entry_type.replace('_', ' ').title()}: {entry.description[:80]}",
                            event_type="DIARY_ENTRY_PUBLISHED",
                            reference_id=entry.id,
                            reference_type="DIARY_ENTRY",
                        )
                    )

        # 2. Notify linked parents if visibility permits
        if entry.visibility in ("STUDENT_AND_PARENT", "PARENT_ONLY"):
            links = db.execute(
                select(ParentStudentLink)
                .options(joinedload(ParentStudentLink.parent))
                .where(
                    ParentStudentLink.student_id.in_(student_ids),
                    ParentStudentLink.status == "active",
                )
            ).scalars().all()

            seen_parents = set()
            for link in links:
                if link.parent and link.parent.user_id and link.parent.id not in seen_parents:
                    seen_parents.add(link.parent.id)
                    db.add(
                        DiaryNotification(
                            user_id=link.parent.user_id,
                            title=f"School Diary Note: {entry.title}",
                            content=f"A new remark was recorded by teacher. {('Acknowledgement is requested.' if entry.requires_acknowledgement else '')}",
                            event_type="DIARY_ENTRY_PUBLISHED",
                            reference_id=entry.id,
                            reference_type="DIARY_ENTRY",
                        )
                    )
        db.flush()
