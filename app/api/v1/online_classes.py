import uuid
from datetime import date
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_teacher, get_current_user, get_db, require_roles
from app.models.online_classroom import OnlineClass, OnlineClassParticipant, OnlineClassRecording, OnlineClassStatus, OnlineClassroomAuditLog
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.schemas.online_classroom import (
    CreateRecordingRequest,
    MeetingTokenResponse,
    OnlineClassCreate,
    OnlineClassDetailResponse,
    OnlineClassListResponse,
    OnlineClassResponse,
    OnlineClassStatsResponse,
    OnlineClassUpdate,
    OnlineClassPermissionsUpdate,
    AdminOnlineClassCreate,
    PreJoinResponse,
)
from app.services.classroom_ws_manager import ws_manager
from app.services.livekit_token_service import LiveKitTokenService
from app.services.online_classroom_service import OnlineClassroomService

router = APIRouter(tags=["Online Classroom"])


def _get_student_for_user(user_id: uuid.UUID, db: Session) -> Student:
    student = db.execute(select(Student).where(Student.user_id == user_id)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this account",
        )
    return student


# ============================================================================
# TEACHER ENDPOINTS
# ============================================================================

@router.post(
    "/teacher/online-classes",
    response_model=OnlineClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule or create an online class",
)
async def create_online_class(
    data: OnlineClassCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Teacher creates an independent online class with optional student participant selection."""
    online_class = OnlineClassroomService.create_online_class(db, teacher.id, data)
    resp = OnlineClassroomService._format_class_response(online_class)
    await ws_manager.broadcast_global("CLASS_CREATED", {"class_id": str(online_class.id), "title": online_class.title, "status": online_class.status})
    return resp


@router.get(
    "/teacher/online-classes",
    response_model=OnlineClassListResponse,
    summary="List teacher's online classes",
)
def list_teacher_online_classes(
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Retrieve scheduled, live, and completed classes for the logged-in teacher."""
    OnlineClassroomService.auto_expire_overdue_classes(db)
    items, total = OnlineClassroomService.list_classes_for_teacher(
        db, teacher.id, status_filter=status_filter, search=search, page=page, size=size
    )
    return OnlineClassListResponse(items=items, total=total, page=page, size=size)


@router.get(
    "/teacher/online-classes/students",
    summary="Search students for online class invitation",
)
def search_students_for_teacher(
    search: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Allow teachers to search and select enrolled students when scheduling an online class."""
    from app.models.student import Student
    query = db.query(Student).filter(Student.status != "deleted")
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Student.first_name.ilike(s)) | (Student.last_name.ilike(s)) | (Student.student_id.ilike(s)))
    students = query.limit(limit).all()
    return {
        "items": [
            {
                "id": str(st.id),
                "student_code": st.student_id,
                "first_name": st.first_name,
                "last_name": st.last_name,
                "class_name": f"{st.current_grade.name} - {st.current_section.name}" if (st.current_grade and st.current_section) else "",
            }
            for st in students
        ]
    }


@router.get(
    "/teacher/online-classes/stats",
    response_model=OnlineClassStatsResponse,
    summary="Get teacher's online classroom statistics",
)
def get_teacher_online_class_stats(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Get metrics for teacher dashboard: upcoming, live, completed, participants."""
    return OnlineClassroomService.get_teacher_stats(db, teacher.id)



@router.get(
    "/teacher/online-classes/{class_id}",
    response_model=OnlineClassDetailResponse,
    summary="Get teacher's online class details and participant roster",
)
def get_teacher_online_class(
    class_id: uuid.UUID,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Get specific online class configuration and assigned student roster."""
    OnlineClassroomService.get_online_class_for_teacher(db, class_id, teacher.id)
    return OnlineClassroomService.get_online_class_detail(db, class_id)


@router.put(
    "/teacher/online-classes/{class_id}",
    response_model=OnlineClassResponse,
    summary="Update scheduled online class",
)
async def update_teacher_online_class(
    class_id: uuid.UUID,
    data: OnlineClassUpdate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Update title, schedule, or participant list before class starts."""
    updated = OnlineClassroomService.update_online_class(db, class_id, teacher.id, data)
    resp = OnlineClassroomService._format_class_response(updated)
    await ws_manager.broadcast_global("CLASS_UPDATED", {"class_id": str(updated.id), "title": updated.title, "status": updated.status})
    return resp


@router.delete(
    "/teacher/online-classes/{class_id}",
    response_model=OnlineClassResponse,
    summary="Cancel scheduled online class",
)
async def cancel_teacher_online_class(
    class_id: uuid.UUID,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Cancel a scheduled online class."""
    cancelled = OnlineClassroomService.cancel_online_class(db, class_id, teacher.id)
    resp = OnlineClassroomService._format_class_response(cancelled)
    await ws_manager.broadcast_global("CLASS_UPDATED", {"class_id": str(cancelled.id), "title": cancelled.title, "status": cancelled.status})
    return resp


@router.post(
    "/teacher/online-classes/{class_id}/start",
    response_model=OnlineClassResponse,
    summary="Start live online class session",
)
async def start_teacher_online_class(
    class_id: uuid.UUID,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Transition online class to LIVE and create active meeting session."""
    started = OnlineClassroomService.start_online_class(db, class_id, teacher)
    resp = OnlineClassroomService._format_class_response(started)
    await ws_manager.broadcast_global("CLASS_STARTED", {"class_id": str(started.id), "title": started.title, "status": started.status})
    return resp


@router.post(
    "/teacher/online-classes/{class_id}/end",
    response_model=OnlineClassResponse,
    summary="End live online class session",
)
async def end_teacher_online_class(
    class_id: uuid.UUID,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Conclude meeting session and mark class status as COMPLETED."""
    ended = OnlineClassroomService.end_online_class(db, class_id, teacher.id)
    await ws_manager.terminate_room(
        class_id=class_id,
        reason="Teacher has ended the class session for all participants",
    )
    resp = OnlineClassroomService._format_class_response(ended)
    await ws_manager.broadcast_global("CLASS_ENDED", {"class_id": str(ended.id), "title": ended.title, "status": ended.status})
    return resp


@router.post(
    "/teacher/online-classes/{class_id}/token",
    response_model=MeetingTokenResponse,
    summary="Generate teacher room connection token",
)
def get_teacher_meeting_token(
    class_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.TEACHER.value)),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Generate cryptographically signed LiveKit token with host and admin privileges."""
    online_class = OnlineClassroomService.get_online_class_for_teacher(db, class_id, teacher.id)
    if online_class.status == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot join a cancelled online class",
        )
    return LiveKitTokenService.generate_teacher_token(
        class_id=online_class.id,
        room_name=online_class.room_name,
        user=current_user,
        teacher=teacher,
        duration_minutes=online_class.expected_duration_minutes,
    )


# ============================================================================
# STUDENT ENDPOINTS
# ============================================================================

@router.get(
    "/student/online-classes",
    response_model=OnlineClassListResponse,
    summary="List student's assigned online classes",
)
def list_student_online_classes(
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """List online classes the student is authorized to attend."""
    OnlineClassroomService.auto_expire_overdue_classes(db)
    student = _get_student_for_user(current_user.id, db)
    items, total = OnlineClassroomService.list_classes_for_student(
        db, student.id, status_filter=status_filter, page=page, size=size
    )
    return OnlineClassListResponse(items=items, total=total, page=page, size=size)


@router.get(
    "/student/online-classes/{class_id}/pre-join",
    response_model=PreJoinResponse,
    summary="Pre-join check for student before entering classroom",
)
def get_student_pre_join_status(
    class_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Validates authorization, timing window, and returns hardware permission policies."""
    student = _get_student_for_user(current_user.id, db)
    return OnlineClassroomService.get_pre_join_info(db, class_id, student.id)


@router.get(
    "/student/online-classes/{class_id}",
    response_model=OnlineClassDetailResponse,
    summary="Get online class details for student",
)
def get_student_online_class_detail(
    class_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """View details, materials, and recordings of an assigned class."""
    student = _get_student_for_user(current_user.id, db)
    detail = OnlineClassroomService.get_online_class_detail(db, class_id)
    # Verify student is in participants
    if not any(p.student_id == student.id for p in detail.participants):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this online class",
        )
    return detail


@router.post(
    "/student/online-classes/{class_id}/token",
    response_model=MeetingTokenResponse,
    summary="Generate student room connection token",
)
def get_student_meeting_token(
    class_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.STUDENT.value)),
    db: Session = Depends(get_db),
):
    """Validate pre-join eligibility and generate student LiveKit token."""
    student = _get_student_for_user(current_user.id, db)
    pre_join = OnlineClassroomService.get_pre_join_info(db, class_id, student.id)
    if not pre_join.can_join:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=pre_join.block_reason or "You cannot enter this room at this time",
        )
    online_class = db.get(OnlineClass, class_id)
    if not online_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    return LiveKitTokenService.generate_student_token(
        class_id=online_class.id,
        room_name=online_class.room_name,
        user=current_user,
        student=student,
        duration_minutes=online_class.expected_duration_minutes,
        allow_mic=online_class.allow_student_mic,
        allow_cam=online_class.allow_student_cam,
        allow_chat=online_class.allow_student_chat,
    )


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.get(
    "/admin/online-classes",
    response_model=OnlineClassListResponse,
    summary="Administrator view of all online classes",
)
def list_admin_online_classes(
    teacher_id: Annotated[uuid.UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Administrative oversight of scheduled, ongoing, and past classes across the school."""
    OnlineClassroomService.auto_expire_overdue_classes(db)
    items, total = OnlineClassroomService.list_all_classes_admin(
        db,
        teacher_id=teacher_id,
        status_filter=status_filter,
        search=search,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
    )
    return OnlineClassListResponse(items=items, total=total, page=page, size=size)


@router.get(
    "/admin/online-classes/stats",
    response_model=OnlineClassStatsResponse,
    summary="Get school-wide online classroom metrics",
)
def get_admin_online_class_stats(
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Get system-wide metrics: total scheduled, ongoing live, completed, recording count."""
    OnlineClassroomService.auto_expire_overdue_classes(db)
    return OnlineClassroomService.get_admin_stats(db)


@router.get(
    "/admin/online-classes/{class_id}",
    response_model=OnlineClassDetailResponse,
    summary="Administrator view of online class details and session logs",
)
def get_admin_online_class_detail(
    class_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Administrator audit of class configuration, roster, and session data."""
    return OnlineClassroomService.get_online_class_detail(db, class_id)


@router.post(
    "/admin/online-classes/{class_id}/observer-token",
    response_model=MeetingTokenResponse,
    summary="Generate administrator observer token",
)
async def get_admin_observer_token(
    class_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    """Generate authorized observer token with explicit in-room broadcast announcement."""
    online_class = db.get(OnlineClass, class_id)
    if not online_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Online class not found")

    # Broadcast notification to room via WebSocket
    await ws_manager.broadcast(
        class_id=class_id,
        message={
            "type": "OBSERVER_JOINED",
            "payload": {
                "admin_email": current_user.email,
                "text": "Administrator has joined as an authorized observer.",
            },
        },
    )

    return LiveKitTokenService.generate_observer_token(
        class_id=online_class.id,
        room_name=online_class.room_name,
        user=current_user,
        duration_minutes=online_class.expected_duration_minutes,
    )


@router.post(
    "/admin/online-classes",
    response_model=OnlineClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Administrator schedules an online class for an instructor",
)
async def create_admin_online_class(
    data: AdminOnlineClassCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    teacher = db.get(Teacher, data.teacher_id)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned teacher not found")
    created = OnlineClassroomService.create_online_class(db, data.teacher_id, data)
    resp = OnlineClassroomService._format_class_response(created)
    await ws_manager.broadcast_global("CLASS_CREATED", {"class_id": str(created.id), "title": created.title, "status": created.status})
    return resp


@router.patch(
    "/admin/online-classes/{class_id}/permissions",
    response_model=OnlineClassResponse,
    summary="Administrator updates student permissions for an online class",
)
async def update_admin_class_permissions(
    class_id: uuid.UUID,
    payload: OnlineClassPermissionsUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    online_class = db.get(OnlineClass, class_id)
    if not online_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Online class not found")

    if payload.allow_student_mic is not None:
        online_class.allow_student_mic = payload.allow_student_mic
    if payload.allow_student_cam is not None:
        online_class.allow_student_cam = payload.allow_student_cam
    if payload.allow_student_chat is not None:
        online_class.allow_student_chat = payload.allow_student_chat
    if payload.allow_student_whiteboard is not None:
        online_class.allow_student_whiteboard = payload.allow_student_whiteboard

    db.add(online_class)
    db.commit()
    db.refresh(online_class)

    # Broadcast updated permissions to active room participants if live
    await ws_manager.broadcast(
        class_id=class_id,
        message={
            "type": "PERMISSIONS_UPDATED",
            "payload": {
                "allow_student_mic": online_class.allow_student_mic,
                "allow_student_cam": online_class.allow_student_cam,
                "allow_student_chat": online_class.allow_student_chat,
                "allow_student_whiteboard": online_class.allow_student_whiteboard,
            },
        },
    )
    await ws_manager.broadcast_global("CLASS_UPDATED", {"class_id": str(online_class.id), "title": online_class.title, "status": online_class.status})

    return OnlineClassroomService._format_class_response(online_class)


@router.post(
    "/admin/online-classes/{class_id}/terminate",
    response_model=OnlineClassResponse,
    summary="Administrator force-terminates an active live class",
)
async def terminate_admin_online_class(
    class_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)),
    db: Session = Depends(get_db),
):
    online_class = db.get(OnlineClass, class_id)
    if not online_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Online class not found")

    ended = OnlineClassroomService.end_online_class(db, class_id, online_class.teacher_id)
    await ws_manager.terminate_room(class_id, reason="Session terminated by administrator governance")
    resp = OnlineClassroomService._format_class_response(ended)
    await ws_manager.broadcast_global("CLASS_ENDED", {"class_id": str(ended.id), "title": ended.title, "status": ended.status})
    return resp


# ============================================================================
# REAL-TIME GLOBAL FEED WEBSOCKET ENDPOINT (Live Updates for Dashboards)
# ============================================================================

@router.websocket("/online-classes/feed/ws")
async def online_classroom_feed_websocket(
    websocket: WebSocket,
    client_id: str = Query(...),
):
    """Global WebSocket connection for dashboards (Admin, Student, Teacher) to receive real-time class feed updates."""
    await ws_manager.connect_global(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_global(client_id)
    except Exception as e:
        ws_manager.disconnect_global(client_id)


# ============================================================================
# REAL-TIME WEBSOCKET ENDPOINT (Whiteboard, Chat & Events)
# ============================================================================

@router.websocket("/online-classes/{class_id}/ws")
async def classroom_websocket_endpoint(
    websocket: WebSocket,
    class_id: uuid.UUID,
    client_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Real-time bidirectional hub for whiteboard synchronization, chat, and room notifications."""
    # Check class existence and lifecycle eligibility
    cls_record = db.get(OnlineClass, class_id)
    if cls_record and cls_record.status in (OnlineClassStatus.COMPLETED.value, OnlineClassStatus.CANCELLED.value):
        await websocket.accept()
        await websocket.send_json({
            "type": "CLASS_ENDED",
            "payload": {"reason": f"Class has already {cls_record.status.lower()}"},
        })
        await websocket.close(code=4403, reason="Class has concluded")
        return

    await ws_manager.connect(class_id, client_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type") or data.get("event_type")

            if msg_type == "JOIN_ROOM":
                payload = data.get("payload") or data.get("data") or {}
                raw_name = payload.get("name")
                student_user_id = payload.get("user_id") or payload.get("id") or client_id
                resolved_name = raw_name

                # If name is generic or missing, resolve official student profile from database
                if (not resolved_name or resolved_name in ("Student", "Anonymous", "")) and db:
                    try:
                        import uuid as py_uuid
                        target_uuid = py_uuid.UUID(str(student_user_id))
                        from app.models.student import Student
                        from app.models.user import User

                        student_rec = db.query(Student).filter(
                            (Student.user_id == target_uuid) | (Student.id == target_uuid)
                        ).first()
                        if student_rec:
                            resolved_name = f"{student_rec.first_name} {student_rec.last_name}".strip()
                        else:
                            user_rec = db.query(User).filter(User.id == target_uuid).first()
                            if user_rec and user_rec.email:
                                resolved_name = user_rec.email.split("@")[0].replace(".", " ").title()
                    except Exception:
                        pass

                if not resolved_name or resolved_name == "":
                    resolved_name = "Student"

                meta = {
                    "client_id": client_id,
                    "id": payload.get("id", client_id),
                    "user_id": str(student_user_id),
                    "name": resolved_name,
                    "role": payload.get("role", "STUDENT"),
                }

                # Waiting room admission check for students
                if (
                    ws_manager.is_waiting_room_enabled(class_id)
                    and meta.get("role") == "STUDENT"
                    and not ws_manager.is_user_admitted(class_id, str(student_user_id))
                ):
                    ws_manager.add_to_waiting_room(class_id, client_id, meta)
                    await websocket.send_json({
                        "type": "WAITING_ROOM_STATUS",
                        "payload": {
                            "status": "WAITING",
                            "message": "Waiting for instructor to admit you to the classroom...",
                        },
                    })
                    # Notify teacher of knocking student
                    await ws_manager.broadcast(
                        class_id,
                        {
                            "type": "STUDENT_KNOCKING",
                            "payload": {
                                **meta,
                                "waiting_count": len(ws_manager.get_waiting_room_students(class_id)),
                            },
                        },
                        exclude_client_id=client_id,
                    )
                    continue

                await ws_manager.register_client_meta(class_id, client_id, meta)
                await websocket.send_json({
                    "type": "WAITING_ROOM_STATUS",
                    "payload": {"status": "ADMITTED"},
                })
                participants = ws_manager.get_room_participants(class_id)
                await websocket.send_json({
                    "type": "ROOM_ROSTER",
                    "payload": {
                        "participants": participants,
                        "viewer_count": len([p for p in participants if p.get("role") == "STUDENT"]),
                    },
                })

                if cls_record:
                    await websocket.send_json({
                        "type": "PERMISSIONS_UPDATED",
                        "payload": {
                            "allow_student_mic": cls_record.allow_student_mic,
                            "allow_student_cam": cls_record.allow_student_cam,
                            "allow_student_chat": cls_record.allow_student_chat,
                            "allow_student_whiteboard": cls_record.allow_student_whiteboard,
                        },
                    })

                # Replay current whiteboard state, page, & stroke history to the joining participant
                current_page = ws_manager.get_whiteboard_current_page(class_id)
                if ws_manager.get_whiteboard_state(class_id):
                    await websocket.send_json({
                        "type": "WHITEBOARD_STATE",
                        "payload": {"isOpen": True, "page_index": current_page},
                        "data": {"is_open": True, "isOpen": True, "page_index": current_page},
                    })
                strokes = ws_manager.get_whiteboard_history(class_id, current_page)
                if strokes:
                    await websocket.send_json({
                        "type": "WHITEBOARD_HISTORY",
                        "payload": {"strokes": strokes, "page_index": current_page},
                        "data": {"strokes": strokes, "page_index": current_page},
                    })

                # Send active poll if currently running
                active_poll = ws_manager.get_poll(class_id)
                if active_poll and active_poll.get("is_active"):
                    await websocket.send_json({
                        "type": "POLL_STARTED",
                        "payload": active_poll,
                    })

                # Send active hand-raise queue
                hand_queue = ws_manager.get_hand_raises(class_id)
                if hand_queue:
                    await websocket.send_json({
                        "type": "HAND_RAISE_QUEUE",
                        "payload": {"queue": hand_queue},
                    })

                await ws_manager.broadcast(
                    class_id,
                    {"type": "USER_JOINED", "payload": meta},
                    exclude_client_id=client_id,
                )
                if meta.get("role") == "TEACHER":
                    await ws_manager.broadcast(
                        class_id,
                        {
                            "type": "TEACHER_RECONNECTED",
                            "payload": {"teacher_name": resolved_name},
                        },
                    )
            elif msg_type == "GET_ROSTER":
                participants = ws_manager.get_room_participants(class_id)
                await websocket.send_json({
                    "type": "ROOM_ROSTER",
                    "payload": {
                        "participants": participants,
                        "viewer_count": len([p for p in participants if p.get("role") == "STUDENT"]),
                    },
                })

                if cls_record:
                    await websocket.send_json({
                        "type": "PERMISSIONS_UPDATED",
                        "payload": {
                            "allow_student_mic": cls_record.allow_student_mic,
                            "allow_student_cam": cls_record.allow_student_cam,
                            "allow_student_chat": cls_record.allow_student_chat,
                            "allow_student_whiteboard": cls_record.allow_student_whiteboard,
                        },
                    })
            elif msg_type == "PING":
                await websocket.send_json({"type": "PONG", "payload": data.get("payload", {})})
            elif msg_type == "LATENCY_PING":
                import time
                await websocket.send_json({
                    "type": "LATENCY_PONG",
                    "payload": {
                        "client_timestamp": data.get("payload", {}).get("timestamp"),
                        "server_timestamp": int(time.time() * 1000),
                    },
                })
            elif msg_type == "UPDATE_PERMISSIONS":
                payload = data.get("payload") or {}
                if cls_record and db:
                    if "allowMic" in payload or "allow_student_mic" in payload:
                        cls_record.allow_student_mic = bool(payload.get("allowMic", payload.get("allow_student_mic")))
                    if "allowCam" in payload or "allow_student_cam" in payload:
                        cls_record.allow_student_cam = bool(payload.get("allowCam", payload.get("allow_student_cam")))
                    if "allowChat" in payload or "allow_student_chat" in payload:
                        cls_record.allow_student_chat = bool(payload.get("allowChat", payload.get("allow_student_chat")))
                    if "allowWhiteboard" in payload or "allow_student_whiteboard" in payload:
                        cls_record.allow_student_whiteboard = bool(payload.get("allowWhiteboard", payload.get("allow_student_whiteboard")))
                    db.commit()

                perm_payload = {
                    "allow_student_mic": cls_record.allow_student_mic if cls_record else bool(payload.get("allowMic", True)),
                    "allow_student_cam": cls_record.allow_student_cam if cls_record else bool(payload.get("allowCam", True)),
                    "allow_student_chat": cls_record.allow_student_chat if cls_record else bool(payload.get("allowChat", True)),
                    "allow_student_whiteboard": cls_record.allow_student_whiteboard if cls_record else bool(payload.get("allowWhiteboard", False)),
                }
                await ws_manager.broadcast(
                    class_id,
                    {"type": "PERMISSIONS_UPDATED", "payload": perm_payload},
                )
            elif msg_type == "TOGGLE_WAITING_ROOM":
                payload = data.get("payload") or {}
                enabled = bool(payload.get("enabled", True))
                ws_manager.set_waiting_room_enabled(class_id, enabled)
                await ws_manager.broadcast(
                    class_id,
                    {"type": "WAITING_ROOM_CONFIG", "payload": {"enabled": enabled}},
                )
            elif msg_type == "GET_WAITING_ROOM":
                waiting = ws_manager.get_waiting_room_students(class_id)
                await websocket.send_json({
                    "type": "WAITING_ROOM_LIST",
                    "payload": {"students": waiting, "count": len(waiting)},
                })
            elif msg_type == "ADMIT_STUDENT":
                payload = data.get("payload") or {}
                target_client = payload.get("client_id")
                if target_client:
                    admitted_meta = ws_manager.admit_student(class_id, target_client)
                    if admitted_meta:
                        await ws_manager.register_client_meta(class_id, target_client, admitted_meta)
                        await ws_manager.send_to_client(
                            class_id,
                            target_client,
                            {"type": "WAITING_ROOM_STATUS", "payload": {"status": "ADMITTED"}},
                        )
                        # Replay whiteboard
                        current_page = ws_manager.get_whiteboard_current_page(class_id)
                        strokes = ws_manager.get_whiteboard_history(class_id, current_page)
                        if strokes:
                            await ws_manager.send_to_client(
                                class_id,
                                target_client,
                                {"type": "WHITEBOARD_HISTORY", "payload": {"strokes": strokes, "page_index": current_page}},
                            )
                        # Broadcast student entry to entire room
                        await ws_manager.broadcast(
                            class_id,
                            {"type": "USER_JOINED", "payload": admitted_meta},
                        )
                        # Update teacher waiting list
                        waiting = ws_manager.get_waiting_room_students(class_id)
                        await websocket.send_json({
                            "type": "WAITING_ROOM_LIST",
                            "payload": {"students": waiting, "count": len(waiting)},
                        })
            elif msg_type == "DENY_STUDENT":
                payload = data.get("payload") or {}
                target_client = payload.get("client_id")
                if target_client:
                    ws_manager.deny_student(class_id, target_client)
                    await ws_manager.send_to_client(
                        class_id,
                        target_client,
                        {
                            "type": "WAITING_ROOM_STATUS",
                            "payload": {
                                "status": "DENIED",
                                "message": "Admission request was not approved by instructor.",
                            },
                        },
                    )
                    waiting = ws_manager.get_waiting_room_students(class_id)
                    await websocket.send_json({
                        "type": "WAITING_ROOM_LIST",
                        "payload": {"students": waiting, "count": len(waiting)},
                    })
            elif msg_type == "POLL_CREATE":
                payload = data.get("payload") or {}
                poll_rec = ws_manager.create_poll(class_id, payload)
                await ws_manager.broadcast(
                    class_id,
                    {"type": "POLL_STARTED", "payload": poll_rec},
                )
            elif msg_type == "POLL_VOTE":
                payload = data.get("payload") or {}
                u_id = payload.get("user_id") or client_id
                opt_idx = int(payload.get("option_index", 0))
                updated_poll = ws_manager.vote_poll(class_id, str(u_id), opt_idx)
                if updated_poll:
                    await ws_manager.broadcast(
                        class_id,
                        {"type": "POLL_UPDATED", "payload": updated_poll},
                    )
            elif msg_type == "POLL_CLOSE":
                closed_poll = ws_manager.close_poll(class_id)
                if closed_poll:
                    await ws_manager.broadcast(
                        class_id,
                        {"type": "POLL_CLOSED", "payload": closed_poll},
                    )
            elif msg_type == "HAND_RAISE":
                payload = data.get("payload") or {}
                h_queue = ws_manager.raise_hand(class_id, payload)
                await ws_manager.broadcast(
                    class_id,
                    {"type": "HAND_RAISE_QUEUE", "payload": {"queue": h_queue}},
                )
            elif msg_type == "HAND_LOWER":
                payload = data.get("payload") or {}
                target_user = payload.get("student_id") or payload.get("id") or client_id
                h_queue = ws_manager.lower_hand(class_id, str(target_user))
                await ws_manager.broadcast(
                    class_id,
                    {"type": "HAND_RAISE_QUEUE", "payload": {"queue": h_queue}},
                )
            elif msg_type == "WHITEBOARD_PAGE_CHANGE":
                payload = data.get("payload") or {}
                page_idx = int(payload.get("page_index", 0))
                ws_manager.set_whiteboard_current_page(class_id, page_idx)
                strokes = ws_manager.get_whiteboard_history(class_id, page_idx)
                await ws_manager.broadcast(
                    class_id,
                    {
                        "type": "WHITEBOARD_PAGE_CHANGED",
                        "payload": {"page_index": page_idx, "strokes": strokes},
                    },
                )
            elif msg_type in ("WEBRTC_OFFER", "WEBRTC_ANSWER", "ICE_CANDIDATE"):
                target_client_id = data.get("target_client_id") or data.get("to")
                data["from"] = client_id
                data["sender_client_id"] = client_id
                if target_client_id:
                    await ws_manager.send_to_client(class_id, target_client_id, data)
                else:
                    await ws_manager.broadcast(class_id, data, exclude_client_id=client_id)
            elif msg_type == "WHITEBOARD_STATE":
                wb_data = data.get("payload") or data.get("data") or {}
                is_open = wb_data.get("isOpen", wb_data.get("is_open", False))
                ws_manager.set_whiteboard_state(class_id, bool(is_open))
                await ws_manager.broadcast(class_id, data)
            elif msg_type in ("WHITEBOARD_DRAW", "WHITEBOARD_SHAPE", "WHITEBOARD_STROKE"):
                stroke = data.get("payload") or data.get("data")
                page_idx = int(data.get("page_index", data.get("payload", {}).get("page_index", 0)))
                if stroke:
                    ws_manager.add_whiteboard_stroke(class_id, stroke, page_index=page_idx)
                await ws_manager.broadcast(class_id, data, exclude_client_id=client_id)
            elif msg_type == "WHITEBOARD_CLEAR":
                page_idx = data.get("page_index", data.get("payload", {}).get("page_index"))
                ws_manager.clear_whiteboard(class_id, page_index=page_idx)
                await ws_manager.broadcast(class_id, data, exclude_client_id=client_id)
            elif msg_type == "KICK_PARTICIPANT":
                payload = data.get("payload") or data.get("data") or {}
                target_client = payload.get("target_client_id") or payload.get("client_id") or payload.get("student_id") or payload.get("id")
                reason = payload.get("reason", "Removed by instructor")
                if target_client:
                    await ws_manager.kick_client(class_id, str(target_client), reason)
            elif msg_type == "MUTE_ALL":
                for cid, cm in ws_manager.clients_meta.get(class_id, {}).items():
                    if cm.get("role") == "STUDENT":
                        cm["isMicOn"] = False
                        cm["isMicAllowed"] = False
                await ws_manager.broadcast(
                    class_id,
                    {
                        "type": "MUTE_ALL",
                        "payload": {
                            "lock_mic": True,
                            "reason": "The host has muted and locked all student microphones",
                        },
                    },
                )
            elif msg_type == "MUTE_STUDENT":
                payload = data.get("payload") or data.get("data") or {}
                target_id = str(payload.get("target_id") or payload.get("student_id") or payload.get("client_id") or payload.get("id") or "")
                target_client_id, meta = ws_manager.resolve_client_info(class_id, target_id)
                payload_meta = meta or {}
                resolved_user_id = str(payload_meta.get("user_id") or target_id)
                resolved_student_id = str(payload_meta.get("student_id") or payload_meta.get("id") or target_id)
                resolved_client_id = str(target_client_id or target_id)
                resolved_name = str(payload_meta.get("name") or "")

                if target_client_id and class_id in ws_manager.clients_meta and target_client_id in ws_manager.clients_meta[class_id]:
                    ws_manager.clients_meta[class_id][target_client_id]["isMicOn"] = False
                    ws_manager.clients_meta[class_id][target_client_id]["isMicAllowed"] = False

                await ws_manager.broadcast(
                    class_id,
                    {
                        "type": "MUTE_STUDENT",
                        "payload": {
                            "target_id": target_id,
                            "client_id": resolved_client_id,
                            "user_id": resolved_user_id,
                            "student_id": resolved_student_id,
                            "name": resolved_name,
                            "lock_mic": True,
                            "reason": payload.get("reason", "Your microphone was muted and locked by the meeting host"),
                        },
                    },
                )
            elif msg_type == "ALLOW_STUDENT_MIC":
                payload = data.get("payload") or data.get("data") or {}
                target_id = str(payload.get("target_id") or payload.get("student_id") or payload.get("client_id") or payload.get("id") or "")
                target_client_id, meta = ws_manager.resolve_client_info(class_id, target_id)
                payload_meta = meta or {}
                resolved_user_id = str(payload_meta.get("user_id") or target_id)
                resolved_student_id = str(payload_meta.get("student_id") or payload_meta.get("id") or target_id)
                resolved_client_id = str(target_client_id or target_id)
                resolved_name = str(payload_meta.get("name") or "")

                if target_client_id and class_id in ws_manager.clients_meta and target_client_id in ws_manager.clients_meta[class_id]:
                    ws_manager.clients_meta[class_id][target_client_id]["isMicAllowed"] = True

                await ws_manager.broadcast(
                    class_id,
                    {
                        "type": "ALLOW_STUDENT_MIC",
                        "payload": {
                            "target_id": target_id,
                            "client_id": resolved_client_id,
                            "user_id": resolved_user_id,
                            "student_id": resolved_student_id,
                            "name": resolved_name,
                            "allow_mic": True,
                            "reason": "The instructor has permitted you to unmute your microphone",
                        },
                    },
                )
            elif msg_type == "MEDIA_STATE":
                payload = data.get("payload") or data.get("data") or {}
                is_mic = payload.get("isMicOn", payload.get("is_mic_on"))
                is_cam = payload.get("isCameraOn", payload.get("is_cam_on"))
                if class_id in ws_manager.clients_meta and client_id in ws_manager.clients_meta[class_id]:
                    if is_mic is not None:
                        ws_manager.clients_meta[class_id][client_id]["isMicOn"] = bool(is_mic)
                    if is_cam is not None:
                        ws_manager.clients_meta[class_id][client_id]["isCameraOn"] = bool(is_cam)
                meta = ws_manager.clients_meta.get(class_id, {}).get(client_id, {})
                await ws_manager.broadcast(
                    class_id,
                    {
                        "type": "PARTICIPANT_MEDIA_STATE",
                        "payload": {
                            "client_id": client_id,
                            "id": meta.get("id", client_id),
                            "user_id": meta.get("user_id"),
                            "student_id": meta.get("student_id"),
                            "name": meta.get("name"),
                            "isMicOn": is_mic if is_mic is not None else False,
                            "isCameraOn": is_cam if is_cam is not None else False,
                        },
                    },
                    exclude_client_id=client_id,
                )
            elif msg_type == "RECORDING_STATE":
                await ws_manager.broadcast(class_id, data)
            elif msg_type == "CHAT_MESSAGE":
                data["sender_client_id"] = client_id
                data["from"] = client_id
                await ws_manager.broadcast(class_id, data, exclude_client_id=client_id)
            else:
                await ws_manager.broadcast(class_id, data)
    except WebSocketDisconnect:
        left_meta = ws_manager.disconnect(class_id, client_id)
        if left_meta:
            await ws_manager.broadcast(
                class_id,
                {"type": "USER_LEFT", "payload": left_meta},
            )
            if left_meta.get("role") == "TEACHER":
                await ws_manager.broadcast(
                    class_id,
                    {
                        "type": "TEACHER_DISCONNECTED",
                        "payload": {
                            "teacher_name": left_meta.get("name", "Instructor"),
                            "grace_period_seconds": 60,
                        },
                    },
                )
    except Exception:
        left_meta = ws_manager.disconnect(class_id, client_id)
        if left_meta:
            await ws_manager.broadcast(
                class_id,
                {"type": "USER_LEFT", "payload": left_meta},
            )
            if left_meta.get("role") == "TEACHER":
                await ws_manager.broadcast(
                    class_id,
                    {
                        "type": "TEACHER_DISCONNECTED",
                        "payload": {
                            "teacher_name": left_meta.get("name", "Instructor"),
                            "grace_period_seconds": 60,
                        },
                    },
                )
