import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

from livekit import api

from app.core.config import settings
from app.modules.students.models import Student
from app.modules.teachers.models import Teacher
from app.modules.auth.models import User
from app.modules.online_classroom.schemas import MeetingTokenResponse

logger = logging.getLogger(__name__)


class LiveKitTokenService:
    @staticmethod
    def _create_token(
        identity: str,
        name: str,
        room: str,
        grants: api.VideoGrants,
        metadata: dict,
        ttl_minutes: int,
    ) -> tuple[str, datetime]:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=ttl_minutes)

        token = (
            api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
            .with_identity(identity)
            .with_name(name)
            .with_metadata(json.dumps(metadata))
            .with_grants(grants)
            .with_ttl(timedelta(minutes=ttl_minutes))
        )
        return token.to_jwt(), expires_at

    @staticmethod
    def generate_teacher_token(
        class_id: uuid.UUID,
        room_name: str,
        user: User,
        teacher: Teacher,
        duration_minutes: int = 60,
    ) -> MeetingTokenResponse:
        identity = str(user.id)
        name = f"{teacher.first_name} {teacher.last_name}"
        ttl = max(60, duration_minutes + 60)

        grants = api.VideoGrants(
            room=room_name,
            room_join=True,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            room_admin=True,
        )
        metadata = {
            "role": "TEACHER",
            "class_id": str(class_id),
            "teacher_id": str(teacher.id),
        }

        jwt_token, expires_at = LiveKitTokenService._create_token(
            identity=identity,
            name=name,
            room=room_name,
            grants=grants,
            metadata=metadata,
            ttl_minutes=ttl,
        )

        logger.info(f"Generated teacher token for class {class_id} (identity={identity})")
        return MeetingTokenResponse(
            token=jwt_token,
            livekit_url=settings.LIVEKIT_URL,
            room_name=room_name,
            participant_identity=identity,
            participant_name=name,
            participant_role="TEACHER",
            expires_at=expires_at,
        )

    @staticmethod
    def generate_student_token(
        class_id: uuid.UUID,
        room_name: str,
        user: User,
        student: Student,
        duration_minutes: int = 60,
        allow_mic: bool = True,
        allow_cam: bool = True,
        allow_chat: bool = True,
    ) -> MeetingTokenResponse:
        identity = str(user.id)
        name = f"{student.first_name} {student.last_name}"
        ttl = max(60, duration_minutes + 60)

        grants = api.VideoGrants(
            room=room_name,
            room_join=True,
            can_publish=False,  # Viewers subscribe only; media broadcast handled by host teacher
            can_subscribe=True,
            can_publish_data=allow_chat,
            room_admin=False,
        )
        metadata = {
            "role": "STUDENT_VIEWER",
            "class_id": str(class_id),
            "student_id": str(student.id),
            "student_code": student.student_code,
            "allow_mic": False,
            "allow_cam": False,
            "allow_chat": allow_chat,
        }

        jwt_token, expires_at = LiveKitTokenService._create_token(
            identity=identity,
            name=name,
            room=room_name,
            grants=grants,
            metadata=metadata,
            ttl_minutes=ttl,
        )

        logger.info(f"Generated student token for class {class_id} (student={student.student_code})")
        return MeetingTokenResponse(
            token=jwt_token,
            livekit_url=settings.LIVEKIT_URL,
            room_name=room_name,
            participant_identity=identity,
            participant_name=name,
            participant_role="STUDENT",
            expires_at=expires_at,
        )

    @staticmethod
    def generate_observer_token(
        class_id: uuid.UUID,
        room_name: str,
        user: User,
        duration_minutes: int = 60,
    ) -> MeetingTokenResponse:
        identity = str(user.id)
        name = "Administrator (Observer)"
        ttl = max(60, duration_minutes + 60)

        grants = api.VideoGrants(
            room=room_name,
            room_join=True,
            can_publish=False,
            can_subscribe=True,
            can_publish_data=False,
            room_admin=False,
        )
        metadata = {
            "role": "ADMIN_OBSERVER",
            "class_id": str(class_id),
            "user_id": str(user.id),
        }

        jwt_token, expires_at = LiveKitTokenService._create_token(
            identity=identity,
            name=name,
            room=room_name,
            grants=grants,
            metadata=metadata,
            ttl_minutes=ttl,
        )

        logger.info(f"Generated admin observer token for class {class_id} (identity={identity})")
        return MeetingTokenResponse(
            token=jwt_token,
            livekit_url=settings.LIVEKIT_URL,
            room_name=room_name,
            participant_identity=identity,
            participant_name=name,
            participant_role="ADMIN_OBSERVER",
            expires_at=expires_at,
        )
