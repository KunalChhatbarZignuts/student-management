import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.online_classroom import (
    OnlineClass,
    OnlineClassParticipant,
    OnlineClassRecording,
    OnlineClassStatus,
    OnlineClassroomAuditLog,
    OnlineMeetingSession,
    OnlineSessionAttendee,
)
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.online_classroom import (
    OnlineClassCreate,
    OnlineClassDetailResponse,
    OnlineClassParticipantResponse,
    OnlineClassResponse,
    OnlineClassStatsResponse,
    OnlineClassUpdate,
    PreJoinResponse,
    RecordingResponse,
    CreateRecordingRequest,
)
from app.services.classroom_ws_manager import ws_manager

logger = logging.getLogger(__name__)


class OnlineClassroomService:
    @staticmethod
    def _format_class_response(cls: OnlineClass) -> OnlineClassResponse:
        teacher_name = "Unknown Teacher"
        if cls.teacher:
            teacher_name = f"{cls.teacher.first_name} {cls.teacher.last_name}"

        participant_count = len([p for p in cls.participants if p.status == "ACTIVE"])
        live_participants_count = ws_manager.get_room_clients_count(cls.id)
        is_room_active = (cls.status == OnlineClassStatus.LIVE.value and live_participants_count > 0)

        return OnlineClassResponse(
            id=cls.id,
            teacher_id=cls.teacher_id,
            teacher_name=teacher_name,
            title=cls.title,
            description=cls.description,
            room_name=cls.room_name,
            scheduled_date=cls.scheduled_date,
            start_time=cls.start_time,
            expected_duration_minutes=cls.expected_duration_minutes,
            status=cls.status,
            is_recording_enabled=cls.is_recording_enabled,
            allow_student_mic=cls.allow_student_mic,
            allow_student_cam=cls.allow_student_cam,
            allow_student_chat=cls.allow_student_chat,
            allow_student_whiteboard=cls.allow_student_whiteboard,
            participant_count=participant_count,
            live_participants_count=live_participants_count,
            is_room_active=is_room_active,
            created_at=cls.created_at,
            updated_at=cls.updated_at,
        )

    @staticmethod
    def create_online_class(
        db: Session, teacher_id: uuid.UUID, data: OnlineClassCreate
    ) -> OnlineClass:
        # Generate clean, unique room name
        room_name = f"cls-{uuid.uuid4().hex[:12]}"

        # Prevent scheduling in the past
        today = date.today()
        if data.scheduled_date < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled date cannot be in the past",
            )

        online_class = OnlineClass(
            teacher_id=teacher_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            room_name=room_name,
            scheduled_date=data.scheduled_date,
            start_time=data.start_time,
            expected_duration_minutes=data.expected_duration_minutes,
            status=OnlineClassStatus.SCHEDULED.value,
            is_recording_enabled=data.is_recording_enabled,
            allow_student_mic=data.allow_student_mic,
            allow_student_cam=data.allow_student_cam,
            allow_student_chat=data.allow_student_chat,
            allow_student_whiteboard=data.allow_student_whiteboard,
            settings=data.settings or {},
        )
        db.add(online_class)
        db.flush()

        # Add participants if provided
        if data.student_ids:
            # Validate students exist
            existing_students = db.execute(
                select(Student.id).where(Student.id.in_(data.student_ids))
            ).scalars().all()
            existing_ids_set = set(existing_students)

            for student_id in set(data.student_ids):
                if student_id in existing_ids_set:
                    participant = OnlineClassParticipant(
                        online_class_id=online_class.id,
                        student_id=student_id,
                        status="ACTIVE",
                    )
                    db.add(participant)
        elif data.settings and data.settings.get("is_instant"):
            # Instant class open to all students
            all_student_ids = db.execute(select(Student.id)).scalars().all()
            for student_id in all_student_ids:
                participant = OnlineClassParticipant(
                    online_class_id=online_class.id,
                    student_id=student_id,
                    status="ACTIVE",
                )
                db.add(participant)

        db.commit()
        db.refresh(online_class)
        logger.info(f"Created online class {online_class.id} (room={room_name}) by teacher {teacher_id}")
        return online_class

    @staticmethod
    def get_online_class_for_teacher(
        db: Session, class_id: uuid.UUID, teacher_id: uuid.UUID
    ) -> OnlineClass:
        online_class = db.execute(
            select(OnlineClass)
            .options(
                joinedload(OnlineClass.teacher),
                joinedload(OnlineClass.participants).joinedload(OnlineClassParticipant.student),
                joinedload(OnlineClass.recordings),
                joinedload(OnlineClass.sessions),
            )
            .where(OnlineClass.id == class_id, OnlineClass.teacher_id == teacher_id)
        ).unique().scalars().first()

        if not online_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Online class not found or you do not have permission to access it",
            )
        return online_class

    @staticmethod
    def get_online_class_detail(
        db: Session, class_id: uuid.UUID
    ) -> OnlineClassDetailResponse:
        online_class = db.execute(
            select(OnlineClass)
            .options(
                joinedload(OnlineClass.teacher),
                joinedload(OnlineClass.participants).joinedload(OnlineClassParticipant.student),
                joinedload(OnlineClass.recordings),
                joinedload(OnlineClass.sessions),
            )
            .where(OnlineClass.id == class_id)
        ).unique().scalars().first()

        if not online_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Online class not found",
            )

        base_res = OnlineClassroomService._format_class_response(online_class)
        participant_items: list[OnlineClassParticipantResponse] = []
        for p in online_class.participants:
            if p.status == "ACTIVE" and p.student:
                participant_items.append(
                    OnlineClassParticipantResponse(
                        id=p.id,
                        student_id=p.student_id,
                        student_code=p.student.student_code,
                        first_name=p.student.first_name,
                        last_name=p.student.last_name,
                        status=p.status,
                    )
                )

        latest_session_id = None
        if online_class.sessions:
            sorted_sessions = sorted(online_class.sessions, key=lambda s: s.started_at, reverse=True)
            latest_session_id = sorted_sessions[0].id

        return OnlineClassDetailResponse(
            **base_res.model_dump(),
            participants=participant_items,
            recording_count=len(online_class.recordings),
            latest_session_id=latest_session_id,
        )

    @staticmethod
    def list_classes_for_teacher(
        db: Session,
        teacher_id: uuid.UUID,
        status_filter: str | None = None,
        search: str | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[OnlineClassResponse], int]:
        query = select(OnlineClass).options(
            joinedload(OnlineClass.teacher),
            joinedload(OnlineClass.participants),
        ).where(OnlineClass.teacher_id == teacher_id)

        if status_filter and status_filter.upper() != "ALL":
            query = query.where(OnlineClass.status == status_filter.upper())

        if search:
            search_fmt = f"%{search.strip()}%"
            query = query.where(
                or_(
                    OnlineClass.title.ilike(search_fmt),
                    OnlineClass.description.ilike(search_fmt),
                    OnlineClass.room_name.ilike(search_fmt),
                )
            )

        total_query = select(func.count(OnlineClass.id)).where(OnlineClass.teacher_id == teacher_id)
        if status_filter and status_filter.upper() != "ALL":
            total_query = total_query.where(OnlineClass.status == status_filter.upper())
        if search:
            search_fmt = f"%{search.strip()}%"
            total_query = total_query.where(
                or_(
                    OnlineClass.title.ilike(search_fmt),
                    OnlineClass.description.ilike(search_fmt),
                    OnlineClass.room_name.ilike(search_fmt),
                )
            )

        total = db.execute(total_query).scalar_one()

        query = query.order_by(
            OnlineClass.scheduled_date.desc(), OnlineClass.start_time.desc()
        ).offset((page - 1) * size).limit(size)

        classes = db.execute(query).unique().scalars().all()
        return [OnlineClassroomService._format_class_response(c) for c in classes], total

    @staticmethod
    def update_online_class(
        db: Session,
        class_id: uuid.UUID,
        teacher_id: uuid.UUID,
        data: OnlineClassUpdate,
    ) -> OnlineClass:
        online_class = OnlineClassroomService.get_online_class_for_teacher(db, class_id, teacher_id)

        if online_class.status in (OnlineClassStatus.COMPLETED.value, OnlineClassStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit an online class that is {online_class.status}",
            )

        if data.title is not None:
            online_class.title = data.title.strip()
        if data.description is not None:
            online_class.description = data.description.strip()
        if data.scheduled_date is not None:
            if data.scheduled_date < date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Scheduled date cannot be in the past",
                )
            online_class.scheduled_date = data.scheduled_date
        if data.start_time is not None:
            online_class.start_time = data.start_time
        if data.expected_duration_minutes is not None:
            online_class.expected_duration_minutes = data.expected_duration_minutes
        if data.is_recording_enabled is not None:
            online_class.is_recording_enabled = data.is_recording_enabled
        if data.allow_student_mic is not None:
            online_class.allow_student_mic = data.allow_student_mic
        if data.allow_student_cam is not None:
            online_class.allow_student_cam = data.allow_student_cam
        if data.allow_student_chat is not None:
            online_class.allow_student_chat = data.allow_student_chat
        if data.allow_student_whiteboard is not None:
            online_class.allow_student_whiteboard = data.allow_student_whiteboard
        if data.settings is not None:
            online_class.settings = data.settings

        # Update participants if explicitly passed
        if data.student_ids is not None:
            # Clear existing participants and set new list
            db.execute(
                select(OnlineClassParticipant).where(
                    OnlineClassParticipant.online_class_id == class_id
                )
            )
            # Remove old
            for p in list(online_class.participants):
                db.delete(p)

            existing_students = db.execute(
                select(Student.id).where(Student.id.in_(data.student_ids))
            ).scalars().all()
            existing_ids_set = set(existing_students)

            for student_id in set(data.student_ids):
                if student_id in existing_ids_set:
                    participant = OnlineClassParticipant(
                        online_class_id=online_class.id,
                        student_id=student_id,
                        status="ACTIVE",
                    )
                    db.add(participant)

        db.commit()
        db.refresh(online_class)
        return online_class

    @staticmethod
    def cancel_online_class(
        db: Session, class_id: uuid.UUID, teacher_id: uuid.UUID
    ) -> OnlineClass:
        online_class = OnlineClassroomService.get_online_class_for_teacher(db, class_id, teacher_id)
        if online_class.status == OnlineClassStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a completed class",
            )
        online_class.status = OnlineClassStatus.CANCELLED.value
        db.commit()
        db.refresh(online_class)
        logger.info(f"Cancelled online class {class_id} by teacher {teacher_id}")
        return online_class

    @staticmethod
    def start_online_class(
        db: Session, class_id: uuid.UUID, teacher: Teacher
    ) -> OnlineClass:
        online_class = OnlineClassroomService.get_online_class_for_teacher(db, class_id, teacher.id)

        if online_class.status == OnlineClassStatus.CANCELLED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start a cancelled online class",
            )

        now = datetime.now(timezone.utc)
        online_class.status = OnlineClassStatus.LIVE.value

        # Create new meeting session
        session = OnlineMeetingSession(
            online_class_id=online_class.id,
            started_at=now,
            status="ACTIVE",
            technical_meta={"started_by_teacher_id": str(teacher.id)},
        )
        db.add(session)
        db.flush()

        # Add teacher as attendee
        attendee = OnlineSessionAttendee(
            session_id=session.id,
            user_id=teacher.user_id,
            participant_role="TEACHER",
            joined_at=now,
            connection_status="CONNECTED",
        )
        db.add(attendee)

        db.commit()
        db.refresh(online_class)
        logger.info(f"Started online class {class_id} into session {session.id}")
        return online_class

    @staticmethod
    def end_online_class(
        db: Session, class_id: uuid.UUID, teacher_id: uuid.UUID
    ) -> OnlineClass:
        online_class = OnlineClassroomService.get_online_class_for_teacher(db, class_id, teacher_id)

        now = datetime.now(timezone.utc)
        online_class.status = OnlineClassStatus.COMPLETED.value

        # Find any active session and mark as ended
        active_session = db.execute(
            select(OnlineMeetingSession).where(
                OnlineMeetingSession.online_class_id == class_id,
                OnlineMeetingSession.status == "ACTIVE",
            )
        ).scalars().first()

        if active_session:
            active_session.ended_at = now
            active_session.status = "ENDED"
            started_at = active_session.started_at
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)
            duration = int((now - started_at).total_seconds())
            active_session.duration_seconds = max(0, duration)

            # Update attendees left_at
            attendees = db.execute(
                select(OnlineSessionAttendee).where(
                    OnlineSessionAttendee.session_id == active_session.id,
                    OnlineSessionAttendee.left_at.is_(None),
                )
            ).scalars().all()
            for att in attendees:
                att.left_at = now
                joined_at = att.joined_at
                if joined_at.tzinfo is None:
                    joined_at = joined_at.replace(tzinfo=timezone.utc)
                att.total_duration_seconds = max(0, int((now - joined_at).total_seconds()))
                att.connection_status = "DISCONNECTED"

        db.commit()
        db.refresh(online_class)
        logger.info(f"Ended online class {class_id}")
        return online_class

    @staticmethod
    def auto_expire_overdue_classes(db: Session, grace_minutes: int = 15) -> list[uuid.UUID]:
        """Automatically conclude any LIVE classes that have exceeded their scheduled duration + grace window."""
        now = datetime.now()
        live_classes = db.execute(
            select(OnlineClass).where(OnlineClass.status == OnlineClassStatus.LIVE.value)
        ).scalars().all()

        expired_ids: list[uuid.UUID] = []
        for cls in live_classes:
            try:
                class_start = datetime.combine(cls.scheduled_date, cls.start_time)
                cutoff = class_start + timedelta(minutes=cls.expected_duration_minutes + grace_minutes)
                if now > cutoff:
                    logger.info(f"Auto-expiring overdue online class {cls.id} (cutoff {cutoff} < now {now})")
                    OnlineClassroomService.end_online_class(db, cls.id, cls.teacher_id)
                    expired_ids.append(cls.id)
            except Exception as e:
                logger.warning(f"Error checking expiration for class {cls.id}: {e}")

        return expired_ids

    @staticmethod
    def list_classes_for_student(
        db: Session,
        student_id: uuid.UUID,
        status_filter: str | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[OnlineClassResponse], int]:
        # Classes where the student is in participants
        query = (
            select(OnlineClass)
            .join(OnlineClassParticipant, OnlineClassParticipant.online_class_id == OnlineClass.id)
            .options(
                joinedload(OnlineClass.teacher),
                joinedload(OnlineClass.participants),
            )
            .where(
                OnlineClassParticipant.student_id == student_id,
                OnlineClassParticipant.status == "ACTIVE",
            )
        )

        total_query = (
            select(func.count(OnlineClass.id))
            .join(OnlineClassParticipant, OnlineClassParticipant.online_class_id == OnlineClass.id)
            .where(
                OnlineClassParticipant.student_id == student_id,
                OnlineClassParticipant.status == "ACTIVE",
            )
        )

        if status_filter and status_filter.upper() != "ALL":
            query = query.where(OnlineClass.status == status_filter.upper())
            total_query = total_query.where(OnlineClass.status == status_filter.upper())

        total = db.execute(total_query).scalar_one()

        query = query.order_by(
            OnlineClass.scheduled_date.desc(), OnlineClass.start_time.desc()
        ).offset((page - 1) * size).limit(size)

        classes = db.execute(query).unique().scalars().all()
        return [OnlineClassroomService._format_class_response(c) for c in classes], total

    @staticmethod
    def get_pre_join_info(
        db: Session, class_id: uuid.UUID, student_id: uuid.UUID
    ) -> PreJoinResponse:
        online_class = db.execute(
            select(OnlineClass)
            .options(
                joinedload(OnlineClass.teacher),
                joinedload(OnlineClass.participants),
            )
            .where(OnlineClass.id == class_id)
        ).unique().scalars().first()

        if not online_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Online class not found",
            )

        # Check authorization
        is_participant = any(
            p.student_id == student_id and p.status == "ACTIVE"
            for p in online_class.participants
        )
        if not is_participant:
            return PreJoinResponse(
                class_id=online_class.id,
                title=online_class.title,
                description=online_class.description,
                teacher_name=f"{online_class.teacher.first_name} {online_class.teacher.last_name}" if online_class.teacher else "Unknown",
                room_name=online_class.room_name,
                status=online_class.status,
                scheduled_date=online_class.scheduled_date,
                start_time=online_class.start_time,
                can_join=False,
                block_reason="You are not registered as an authorized participant for this online class.",
                allow_student_mic=online_class.allow_student_mic,
                allow_student_cam=online_class.allow_student_cam,
                allow_student_chat=online_class.allow_student_chat,
                allow_student_whiteboard=online_class.allow_student_whiteboard,
            )

        can_join = False
        block_reason: str | None = None

        if online_class.status == OnlineClassStatus.CANCELLED.value:
            block_reason = "This class has been cancelled by the teacher."
        elif online_class.status == OnlineClassStatus.COMPLETED.value:
            block_reason = "This class has already concluded."
        elif online_class.status == OnlineClassStatus.LIVE.value:
            can_join = True
        elif online_class.status == OnlineClassStatus.SCHEDULED.value:
            # Check if within 15-minute pre-join window
            now = datetime.now()
            class_dt = datetime.combine(online_class.scheduled_date, online_class.start_time)
            if now < class_dt - timedelta(minutes=15):
                block_reason = "Class has not started yet. Waiting room opens 15 minutes before scheduled start time."
            else:
                can_join = True

        return PreJoinResponse(
            class_id=online_class.id,
            title=online_class.title,
            description=online_class.description,
            teacher_name=f"{online_class.teacher.first_name} {online_class.teacher.last_name}" if online_class.teacher else "Unknown",
            room_name=online_class.room_name,
            status=online_class.status,
            scheduled_date=online_class.scheduled_date,
            start_time=online_class.start_time,
            can_join=can_join,
            block_reason=block_reason,
            allow_student_mic=online_class.allow_student_mic,
            allow_student_cam=online_class.allow_student_cam,
            allow_student_chat=online_class.allow_student_chat,
            allow_student_whiteboard=online_class.allow_student_whiteboard,
        )

    @staticmethod
    def list_all_classes_admin(
        db: Session,
        teacher_id: uuid.UUID | None = None,
        status_filter: str | None = None,
        search: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[OnlineClassResponse], int]:
        query = select(OnlineClass).options(
            joinedload(OnlineClass.teacher),
            joinedload(OnlineClass.participants),
        )
        total_query = select(func.count(OnlineClass.id))

        if teacher_id:
            query = query.where(OnlineClass.teacher_id == teacher_id)
            total_query = total_query.where(OnlineClass.teacher_id == teacher_id)

        if status_filter and status_filter.upper() != "ALL":
            query = query.where(OnlineClass.status == status_filter.upper())
            total_query = total_query.where(OnlineClass.status == status_filter.upper())

        if date_from:
            query = query.where(OnlineClass.scheduled_date >= date_from)
            total_query = total_query.where(OnlineClass.scheduled_date >= date_from)

        if date_to:
            query = query.where(OnlineClass.scheduled_date <= date_to)
            total_query = total_query.where(OnlineClass.scheduled_date <= date_to)

        if search:
            search_fmt = f"%{search.strip()}%"
            filter_exp = or_(
                OnlineClass.title.ilike(search_fmt),
                OnlineClass.description.ilike(search_fmt),
                OnlineClass.room_name.ilike(search_fmt),
            )
            query = query.where(filter_exp)
            total_query = total_query.where(filter_exp)

        total = db.execute(total_query).scalar_one()

        query = query.order_by(
            OnlineClass.scheduled_date.desc(), OnlineClass.start_time.desc()
        ).offset((page - 1) * size).limit(size)

        classes = db.execute(query).unique().scalars().all()
        return [OnlineClassroomService._format_class_response(c) for c in classes], total

    @staticmethod
    def get_teacher_stats(db: Session, teacher_id: uuid.UUID) -> OnlineClassStatsResponse:
        total = db.execute(
            select(func.count(OnlineClass.id)).where(OnlineClass.teacher_id == teacher_id)
        ).scalar_one()

        upcoming = db.execute(
            select(func.count(OnlineClass.id)).where(
                OnlineClass.teacher_id == teacher_id,
                OnlineClass.status == OnlineClassStatus.SCHEDULED.value,
            )
        ).scalar_one()

        live = db.execute(
            select(func.count(OnlineClass.id)).where(
                OnlineClass.teacher_id == teacher_id,
                OnlineClass.status == OnlineClassStatus.LIVE.value,
            )
        ).scalar_one()

        completed = db.execute(
            select(func.count(OnlineClass.id)).where(
                OnlineClass.teacher_id == teacher_id,
                OnlineClass.status == OnlineClassStatus.COMPLETED.value,
            )
        ).scalar_one()

        cancelled = db.execute(
            select(func.count(OnlineClass.id)).where(
                OnlineClass.teacher_id == teacher_id,
                OnlineClass.status == OnlineClassStatus.CANCELLED.value,
            )
        ).scalar_one()

        recordings = db.execute(
            select(func.count(OnlineClassRecording.id))
            .join(OnlineClass, OnlineClass.id == OnlineClassRecording.online_class_id)
            .where(OnlineClass.teacher_id == teacher_id)
        ).scalar_one()

        participants = db.execute(
            select(func.count(OnlineClassParticipant.id))
            .join(OnlineClass, OnlineClass.id == OnlineClassParticipant.online_class_id)
            .where(OnlineClass.teacher_id == teacher_id, OnlineClassParticipant.status == "ACTIVE")
        ).scalar_one()

        return OnlineClassStatsResponse(
            total_classes=total,
            upcoming_classes=upcoming,
            live_classes=live,
            completed_classes=completed,
            cancelled_classes=cancelled,
            total_recordings=recordings,
            total_participants=participants,
        )

    @staticmethod
    def get_admin_stats(db: Session) -> OnlineClassStatsResponse:
        total = db.execute(select(func.count(OnlineClass.id))).scalar_one()
        upcoming = db.execute(
            select(func.count(OnlineClass.id)).where(OnlineClass.status == OnlineClassStatus.SCHEDULED.value)
        ).scalar_one()
        live = db.execute(
            select(func.count(OnlineClass.id)).where(OnlineClass.status == OnlineClassStatus.LIVE.value)
        ).scalar_one()
        completed = db.execute(
            select(func.count(OnlineClass.id)).where(OnlineClass.status == OnlineClassStatus.COMPLETED.value)
        ).scalar_one()
        cancelled = db.execute(
            select(func.count(OnlineClass.id)).where(OnlineClass.status == OnlineClassStatus.CANCELLED.value)
        ).scalar_one()
        recordings = db.execute(select(func.count(OnlineClassRecording.id))).scalar_one()
        participants = db.execute(
            select(func.count(OnlineClassParticipant.id)).where(OnlineClassParticipant.status == "ACTIVE")
        ).scalar_one()

        return OnlineClassStatsResponse(
            total_classes=total,
            upcoming_classes=upcoming,
            live_classes=live,
            completed_classes=completed,
            cancelled_classes=cancelled,
            total_recordings=recordings,
            total_participants=participants,
        )

    @staticmethod
    def list_recordings(
        db: Session,
        teacher_id: uuid.UUID | None = None,
        class_id: uuid.UUID | None = None,
        status: str | None = None,
        page: int = 1,
        size: int = 50,
    ) -> tuple[list[RecordingResponse], int]:
        stmt = (
            select(OnlineClassRecording)
            .join(OnlineClass, OnlineClass.id == OnlineClassRecording.online_class_id)
            .options(
                joinedload(OnlineClassRecording.online_class).joinedload(OnlineClass.teacher)
            )
        )

        if teacher_id:
            stmt = stmt.where(OnlineClass.teacher_id == teacher_id)
        if class_id:
            stmt = stmt.where(OnlineClassRecording.online_class_id == class_id)
        if status:
            stmt = stmt.where(OnlineClassRecording.processing_status == status)

        # Count total
        count_stmt = select(func.count(OnlineClassRecording.id)).join(
            OnlineClass, OnlineClass.id == OnlineClassRecording.online_class_id
        )
        if teacher_id:
            count_stmt = count_stmt.where(OnlineClass.teacher_id == teacher_id)
        if class_id:
            count_stmt = count_stmt.where(OnlineClassRecording.online_class_id == class_id)
        if status:
            count_stmt = count_stmt.where(OnlineClassRecording.processing_status == status)

        total = db.execute(count_stmt).scalar_one()

        # Paginate
        offset = (page - 1) * size
        records = db.execute(
            stmt.order_by(OnlineClassRecording.created_at.desc()).offset(offset).limit(size)
        ).scalars().all()

        items = []
        for r in records:
            cls = r.online_class
            teacher_name = f"{cls.teacher.first_name} {cls.teacher.last_name}" if cls and cls.teacher else "Unknown Teacher"
            items.append(
                RecordingResponse(
                    id=r.id,
                    online_class_id=r.online_class_id,
                    class_title=cls.title if cls else "Unknown Class",
                    teacher_name=teacher_name,
                    file_name=r.file_name,
                    file_size_bytes=r.file_size_bytes,
                    duration_seconds=r.duration_seconds,
                    processing_status=r.processing_status,
                    is_published=r.is_published,
                    retention_until=r.retention_until,
                    created_at=r.created_at,
                    stream_url=f"/api/v1/recordings/{r.id}/video",
                )
            )

        return items, total

    @staticmethod
    def get_recording_stream(db: Session, recording_id: uuid.UUID, user_id: uuid.UUID, user_roles: list[str]) -> dict[str, Any]:
        recording = db.execute(
            select(OnlineClassRecording)
            .options(
                joinedload(OnlineClassRecording.online_class).joinedload(OnlineClass.teacher)
            )
            .where(OnlineClassRecording.id == recording_id)
        ).scalar_one_or_none()

        if not recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class recording not found",
            )

        # Authorization checks: Admin / SuperAdmin can access any recording
        is_admin = any(r in ["ADMIN", "SUPER_ADMIN"] for r in user_roles)
        if not is_admin:
            cls = recording.online_class
            # Check teacher
            teacher = db.execute(select(Teacher).where(Teacher.user_id == user_id)).scalar_one_or_none()
            if teacher and cls.teacher_id == teacher.id:
                pass  # Authorized teacher
            else:
                # Check student enrollment
                student = db.execute(select(Student).where(Student.user_id == user_id)).scalar_one_or_none()
                if not student:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to stream recording")
                enrolled = db.execute(
                    select(OnlineClassParticipant).where(
                        OnlineClassParticipant.online_class_id == cls.id,
                        OnlineClassParticipant.student_id == student.id,
                        OnlineClassParticipant.status == "ACTIVE",
                    )
                ).scalar_one_or_none()
                if not enrolled:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is not enrolled in this recorded class")

        return {
            "recording_id": recording.id,
            "class_title": recording.online_class.title if recording.online_class else "Class Recording",
            "stream_url": f"/stream/mock-secure-recordings/{recording.id}.mp4",
            "file_name": recording.file_name,
            "duration_seconds": recording.duration_seconds,
            "mime_type": "video/mp4",
        }

    @staticmethod
    def archive_recording(db: Session, recording_id: uuid.UUID, admin_user_id: uuid.UUID) -> RecordingResponse:
        recording = db.execute(
            select(OnlineClassRecording)
            .options(joinedload(OnlineClassRecording.online_class).joinedload(OnlineClass.teacher))
            .where(OnlineClassRecording.id == recording_id)
        ).scalar_one_or_none()

        if not recording:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

        recording.processing_status = "ARCHIVED"
        recording.is_published = False

        # Add audit log
        audit = OnlineClassroomAuditLog(
            online_class_id=recording.online_class_id,
            actor_user_id=admin_user_id,
            event_action="RECORDING_ARCHIVED",
            event_details={"recording_id": str(recording_id), "file_name": recording.file_name},
        )
        db.add(audit)
        db.commit()
        db.refresh(recording)

        cls = recording.online_class
        teacher_name = f"{cls.teacher.first_name} {cls.teacher.last_name}" if cls and cls.teacher else "Unknown Teacher"
        return RecordingResponse(
            id=recording.id,
            online_class_id=recording.online_class_id,
            class_title=cls.title if cls else "Unknown Class",
            teacher_name=teacher_name,
            file_name=recording.file_name,
            file_size_bytes=recording.file_size_bytes,
            duration_seconds=recording.duration_seconds,
            processing_status=recording.processing_status,
            is_published=recording.is_published,
            retention_until=recording.retention_until,
            created_at=recording.created_at,
            stream_url=f"/api/v1/recordings/{recording.id}/stream",
        )

    @staticmethod
    def delete_recording(db: Session, recording_id: uuid.UUID, admin_user_id: uuid.UUID) -> dict[str, Any]:
        recording = db.execute(
            select(OnlineClassRecording).where(OnlineClassRecording.id == recording_id)
        ).scalar_one_or_none()

        if not recording:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

        online_class_id = recording.online_class_id
        file_name = recording.file_name

        db.delete(recording)

        audit = OnlineClassroomAuditLog(
            online_class_id=online_class_id,
            actor_user_id=admin_user_id,
            event_action="RECORDING_DELETED",
            event_details={"recording_id": str(recording_id), "file_name": file_name},
        )
        db.add(audit)
        db.commit()

        return {"message": "Recording deleted successfully", "recording_id": str(recording_id)}

    @staticmethod
    def create_recording(
        db: Session,
        class_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        duration_seconds: int = 0,
        file_size_bytes: int = 0,
        file_name: str | None = None,
        storage_key: str | None = None,
    ) -> RecordingResponse:
        cls = db.execute(
            select(OnlineClass)
            .options(joinedload(OnlineClass.teacher))
            .where(OnlineClass.id == class_id)
        ).scalar_one_or_none()
        if not cls:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Online class not found")

        teacher_name = (
            f"{cls.teacher.first_name} {cls.teacher.last_name}" if cls.teacher else "Teacher"
        )
        rec_id = uuid.uuid4()
        timestamp_sec = int(datetime.now(timezone.utc).timestamp())
        effective_file_name = file_name or f"{cls.title.replace(' ', '_').lower()}_{timestamp_sec}.webm"
        effective_storage_key = storage_key or f"recordings/{class_id}/{rec_id}.webm"
        effective_file_size = file_size_bytes if file_size_bytes > 0 else max(1024 * 1024, duration_seconds * 22000)

        recording = OnlineClassRecording(
            id=rec_id,
            online_class_id=class_id,
            storage_key=effective_storage_key,
            storage_bucket="recordings",
            file_name=effective_file_name,
            file_size_bytes=effective_file_size,
            duration_seconds=duration_seconds,
            processing_status="COMPLETED",
            is_published=True,
            retention_until=datetime.now(timezone.utc) + timedelta(days=90),
        )
        db.add(recording)
        cls.is_recording_enabled = True

        audit = OnlineClassroomAuditLog(
            online_class_id=class_id,
            actor_user_id=actor_user_id,
            event_action="RECORDING_CREATED",
            event_details={"recording_id": str(rec_id), "file_name": effective_file_name, "duration": duration_seconds},
        )
        db.add(audit)
        db.commit()
        db.refresh(recording)

        return RecordingResponse(
            id=recording.id,
            online_class_id=recording.online_class_id,
            class_title=cls.title,
            teacher_name=teacher_name,
            file_name=recording.file_name,
            file_size_bytes=recording.file_size_bytes,
            duration_seconds=recording.duration_seconds,
            processing_status=recording.processing_status,
            is_published=recording.is_published,
            retention_until=recording.retention_until,
            created_at=recording.created_at,
            stream_url=f"/api/v1/recordings/{recording.id}/video",
        )

    @staticmethod
    def list_student_recordings(
        db: Session,
        student_id: uuid.UUID,
        page: int = 1,
        size: int = 50,
    ) -> tuple[list[RecordingResponse], int]:
        stmt = (
            select(OnlineClassRecording)
            .join(OnlineClass, OnlineClass.id == OnlineClassRecording.online_class_id)
            .join(
                OnlineClassParticipant,
                (OnlineClassParticipant.online_class_id == OnlineClass.id)
                & (OnlineClassParticipant.student_id == student_id),
            )
            .where(OnlineClassRecording.is_published == True)
            .options(
                joinedload(OnlineClassRecording.online_class).joinedload(OnlineClass.teacher)
            )
        )
        total = db.execute(
            select(func.count(OnlineClassRecording.id))
            .join(OnlineClass, OnlineClass.id == OnlineClassRecording.online_class_id)
            .join(
                OnlineClassParticipant,
                (OnlineClassParticipant.online_class_id == OnlineClass.id)
                & (OnlineClassParticipant.student_id == student_id),
            )
            .where(OnlineClassRecording.is_published == True)
        ).scalar_one()

        offset = (page - 1) * size
        records = db.execute(
            stmt.order_by(OnlineClassRecording.created_at.desc()).offset(offset).limit(size)
        ).scalars().all()

        items = []
        for r in records:
            cls = r.online_class
            teacher_name = f"{cls.teacher.first_name} {cls.teacher.last_name}" if cls and cls.teacher else "Teacher"
            items.append(
                RecordingResponse(
                    id=r.id,
                    online_class_id=r.online_class_id,
                    class_title=cls.title if cls else "Unknown Class",
                    teacher_name=teacher_name,
                    file_name=r.file_name,
                    file_size_bytes=r.file_size_bytes,
                    duration_seconds=r.duration_seconds,
                    processing_status=r.processing_status,
                    is_published=r.is_published,
                    retention_until=r.retention_until,
                    created_at=r.created_at,
                    stream_url=f"/api/v1/recordings/{r.id}/video",
                )
            )
        return items, total


