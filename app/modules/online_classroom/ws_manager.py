import json
import logging
import uuid
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ClassroomWSManager:
    def __init__(self) -> None:
        # Mapping from class_id -> dict of client_id -> WebSocket
        self.rooms: dict[uuid.UUID, dict[str, WebSocket]] = {}
        # Mapping from class_id -> dict of client_id -> participant metadata
        self.clients_meta: dict[uuid.UUID, dict[str, dict[str, Any]]] = {}
        # Mapping from class_id -> dict of user_id -> client_id for duplicate session eviction
        self.user_to_client: dict[uuid.UUID, dict[str, str]] = {}
        # Whiteboard history buffer: class_id -> list of stroke dicts
        self.whiteboard_history: dict[uuid.UUID, list[dict[str, Any]]] = {}
        # Multi-page whiteboard: class_id -> dict of page_index -> list of strokes
        self.whiteboard_pages: dict[uuid.UUID, dict[int, list[dict[str, Any]]]] = {}
        self.whiteboard_current_page: dict[uuid.UUID, int] = {}
        # Whiteboard open state: class_id -> bool
        self.whiteboard_state: dict[uuid.UUID, bool] = {}
        # Waiting room state: class_id -> bool (enabled or disabled)
        self.waiting_room_enabled: dict[uuid.UUID, bool] = {}
        # Waiting room knocking queue: class_id -> dict of client_id -> meta
        self.waiting_rooms: dict[uuid.UUID, dict[str, dict[str, Any]]] = {}
        # Set of admitted student IDs (so reloads do not need re-knocking)
        self.admitted_users: dict[uuid.UUID, set[str]] = {}
        # Active polls: class_id -> poll dict
        self.active_polls: dict[uuid.UUID, dict[str, Any]] = {}
        # Hand-raise queue: class_id -> list of student meta dicts with timestamp
        self.hand_raise_queue: dict[uuid.UUID, list[dict[str, Any]]] = {}
        # Global dashboard feed subscribers: client_id -> WebSocket
        self.global_subscribers: dict[str, WebSocket] = {}

    async def connect_global(self, client_id: str, websocket: WebSocket) -> None:
        """Register a global dashboard feed subscriber."""
        await websocket.accept()
        self.global_subscribers[client_id] = websocket
        logger.info(f"Global classroom feed subscriber {client_id} connected. Total subscribers: {len(self.global_subscribers)}")

    def disconnect_global(self, client_id: str) -> None:
        """Unregister a global dashboard feed subscriber."""
        self.global_subscribers.pop(client_id, None)
        logger.info(f"Global classroom feed subscriber {client_id} disconnected. Remaining: {len(self.global_subscribers)}")

    async def broadcast_global(self, event_type: str, payload: dict[str, Any] | None = None) -> None:
        """Broadcast a classroom lifecycle event to all dashboard subscribers across Admin, Teacher, and Student portals."""
        if not self.global_subscribers:
            return

        message = {
            "type": event_type,
            "payload": payload or {},
        }
        dead_clients: list[str] = []
        for client_id, ws in list(self.global_subscribers.items()):
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send global feed event to {client_id}: {e}")
                dead_clients.append(client_id)

        for client_id in dead_clients:
            self.global_subscribers.pop(client_id, None)

    async def connect(self, class_id: uuid.UUID, client_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if class_id not in self.rooms:
            self.rooms[class_id] = {}
            self.clients_meta[class_id] = {}
            self.user_to_client[class_id] = {}
            self.whiteboard_history[class_id] = []
            self.whiteboard_state[class_id] = False
        self.rooms[class_id][client_id] = websocket
        logger.info(f"WebSocket client {client_id} connected to class {class_id}. Room size: {len(self.rooms[class_id])}")

    async def register_client_meta(self, class_id: uuid.UUID, client_id: str, meta: dict[str, Any]) -> str | None:
        """Register client metadata. If a duplicate active session exists for the same user, evict the older session."""
        if class_id not in self.clients_meta:
            self.clients_meta[class_id] = {}
        if class_id not in self.user_to_client:
            self.user_to_client[class_id] = {}

        self.clients_meta[class_id][client_id] = meta

        user_id = str(meta.get("user_id") or meta.get("id") or "")
        evicted_client_id: str | None = None
        if user_id:
            old_client_id = self.user_to_client[class_id].get(user_id)
            if old_client_id and old_client_id != client_id and old_client_id in self.rooms.get(class_id, {}):
                evicted_client_id = old_client_id
                logger.info(f"Evicting older duplicate session {old_client_id} for user {user_id} in class {class_id}")
                try:
                    await self.send_to_client(
                        class_id,
                        old_client_id,
                        {
                            "type": "SESSION_TERMINATED_DUPLICATE",
                            "payload": {"message": "You were disconnected because you joined from another tab or device."},
                        },
                    )
                    old_ws = self.rooms[class_id].get(old_client_id)
                    if old_ws:
                        await old_ws.close(code=4409, reason="Duplicate session")
                except Exception as e:
                    logger.warning(f"Error evicting old duplicate session {old_client_id}: {e}")
                self.disconnect(class_id, old_client_id)
            self.user_to_client[class_id][user_id] = client_id

        return evicted_client_id

    def disconnect(self, class_id: uuid.UUID, client_id: str) -> dict[str, Any] | None:
        meta = None
        if class_id in self.rooms:
            self.rooms[class_id].pop(client_id, None)
            if class_id in self.clients_meta:
                meta = self.clients_meta[class_id].pop(client_id, None)
            if class_id in self.user_to_client and meta:
                user_id = str(meta.get("user_id") or meta.get("id") or "")
                if self.user_to_client[class_id].get(user_id) == client_id:
                    self.user_to_client[class_id].pop(user_id, None)
            if not self.rooms[class_id]:
                del self.rooms[class_id]
                self.clients_meta.pop(class_id, None)
                self.user_to_client.pop(class_id, None)
        logger.info(f"WebSocket client {client_id} disconnected from class {class_id}")
        return meta

    def add_whiteboard_stroke(self, class_id: uuid.UUID, stroke: dict[str, Any], page_index: int = 0) -> None:
        if class_id not in self.whiteboard_history:
            self.whiteboard_history[class_id] = []
        self.whiteboard_history[class_id].append(stroke)
        if len(self.whiteboard_history[class_id]) > 10000:
            self.whiteboard_history[class_id] = self.whiteboard_history[class_id][-10000:]

        if class_id not in self.whiteboard_pages:
            self.whiteboard_pages[class_id] = {0: []}
        if page_index not in self.whiteboard_pages[class_id]:
            self.whiteboard_pages[class_id][page_index] = []
        self.whiteboard_pages[class_id][page_index].append(stroke)
        if len(self.whiteboard_pages[class_id][page_index]) > 5000:
            self.whiteboard_pages[class_id][page_index] = self.whiteboard_pages[class_id][page_index][-5000:]

    def clear_whiteboard(self, class_id: uuid.UUID, page_index: int | None = None) -> None:
        if page_index is None:
            self.whiteboard_history[class_id] = []
            self.whiteboard_pages[class_id] = {0: []}
        else:
            if class_id in self.whiteboard_pages and page_index in self.whiteboard_pages[class_id]:
                self.whiteboard_pages[class_id][page_index] = []

    def get_whiteboard_history(self, class_id: uuid.UUID, page_index: int = 0) -> list[dict[str, Any]]:
        if class_id in self.whiteboard_pages and page_index in self.whiteboard_pages[class_id]:
            return list(self.whiteboard_pages[class_id][page_index])
        return list(self.whiteboard_history.get(class_id, []))

    def set_whiteboard_current_page(self, class_id: uuid.UUID, page_index: int) -> int:
        self.whiteboard_current_page[class_id] = page_index
        if class_id not in self.whiteboard_pages:
            self.whiteboard_pages[class_id] = {0: []}
        if page_index not in self.whiteboard_pages[class_id]:
            self.whiteboard_pages[class_id][page_index] = []
        return page_index

    def get_whiteboard_current_page(self, class_id: uuid.UUID) -> int:
        return self.whiteboard_current_page.get(class_id, 0)

    def set_whiteboard_state(self, class_id: uuid.UUID, is_open: bool) -> None:
        self.whiteboard_state[class_id] = is_open

    def get_whiteboard_state(self, class_id: uuid.UUID) -> bool:
        return self.whiteboard_state.get(class_id, False)

    # --- Waiting Room & Admission Control ---
    def set_waiting_room_enabled(self, class_id: uuid.UUID, enabled: bool) -> None:
        self.waiting_room_enabled[class_id] = enabled
        if enabled and class_id not in self.waiting_rooms:
            self.waiting_rooms[class_id] = {}

    def is_waiting_room_enabled(self, class_id: uuid.UUID) -> bool:
        return self.waiting_room_enabled.get(class_id, False)

    def is_user_admitted(self, class_id: uuid.UUID, user_id: str) -> bool:
        return user_id in self.admitted_users.get(class_id, set())

    def add_to_waiting_room(self, class_id: uuid.UUID, client_id: str, meta: dict[str, Any]) -> None:
        if class_id not in self.waiting_rooms:
            self.waiting_rooms[class_id] = {}
        self.waiting_rooms[class_id][client_id] = meta

    def get_waiting_room_students(self, class_id: uuid.UUID) -> list[dict[str, Any]]:
        return list(self.waiting_rooms.get(class_id, {}).values())

    def admit_student(self, class_id: uuid.UUID, client_id: str) -> dict[str, Any] | None:
        if class_id in self.waiting_rooms and client_id in self.waiting_rooms[class_id]:
            meta = self.waiting_rooms[class_id].pop(client_id)
            user_id = str(meta.get("user_id") or meta.get("id") or "")
            if class_id not in self.admitted_users:
                self.admitted_users[class_id] = set()
            if user_id:
                self.admitted_users[class_id].add(user_id)
            return meta
        return None

    def deny_student(self, class_id: uuid.UUID, client_id: str) -> dict[str, Any] | None:
        if class_id in self.waiting_rooms:
            return self.waiting_rooms[class_id].pop(client_id, None)
        return None

    # --- Interactive Live Polls ---
    def create_poll(self, class_id: uuid.UUID, poll: dict[str, Any]) -> dict[str, Any]:
        poll_id = str(uuid.uuid4())
        poll_record = {
            "id": poll_id,
            "question": poll.get("question", ""),
            "options": [{"text": opt, "votes": 0} for opt in poll.get("options", [])],
            "voters": {},  # user_id -> option_index
            "is_active": True,
            "created_at": poll.get("created_at"),
            "duration_seconds": poll.get("duration_seconds", 60),
        }
        self.active_polls[class_id] = poll_record
        return poll_record

    def vote_poll(self, class_id: uuid.UUID, user_id: str, option_index: int) -> dict[str, Any] | None:
        poll = self.active_polls.get(class_id)
        if not poll or not poll.get("is_active"):
            return None
        if user_id in poll["voters"]:
            return poll  # already voted
        if 0 <= option_index < len(poll["options"]):
            poll["options"][option_index]["votes"] += 1
            poll["voters"][user_id] = option_index
        return poll

    def get_poll(self, class_id: uuid.UUID) -> dict[str, Any] | None:
        return self.active_polls.get(class_id)

    def close_poll(self, class_id: uuid.UUID) -> dict[str, Any] | None:
        poll = self.active_polls.get(class_id)
        if poll:
            poll["is_active"] = False
        return poll

    # --- Hand-Raise Queue ---
    def raise_hand(self, class_id: uuid.UUID, student_meta: dict[str, Any]) -> list[dict[str, Any]]:
        if class_id not in self.hand_raise_queue:
            self.hand_raise_queue[class_id] = []
        user_id = student_meta.get("id") or student_meta.get("user_id") or student_meta.get("client_id")
        # Check if already in queue
        if not any((h.get("id") == user_id or h.get("client_id") == student_meta.get("client_id")) for h in self.hand_raise_queue[class_id]):
            import time
            entry = {**student_meta, "raised_at": time.time()}
            self.hand_raise_queue[class_id].append(entry)
        return list(self.hand_raise_queue[class_id])

    def lower_hand(self, class_id: uuid.UUID, target_id: str) -> list[dict[str, Any]]:
        if class_id in self.hand_raise_queue:
            self.hand_raise_queue[class_id] = [
                h for h in self.hand_raise_queue[class_id]
                if h.get("id") != target_id and h.get("client_id") != target_id and h.get("user_id") != target_id
            ]
        return list(self.hand_raise_queue.get(class_id, []))

    def get_hand_raises(self, class_id: uuid.UUID) -> list[dict[str, Any]]:
        return list(self.hand_raise_queue.get(class_id, []))

    def resolve_client_info(self, class_id: uuid.UUID, identifier: str) -> tuple[str | None, dict[str, Any] | None]:
        """Resolve socket client_id and meta given a client_id, user_id, student_id, or name."""
        if class_id not in self.rooms:
            return None, None

        target_client = str(identifier)
        if target_client in self.rooms[class_id]:
            return target_client, self.clients_meta.get(class_id, {}).get(target_client)

        if target_client in self.user_to_client.get(class_id, {}):
            cid = self.user_to_client[class_id][target_client]
            if cid in self.rooms.get(class_id, {}):
                return cid, self.clients_meta.get(class_id, {}).get(cid)

        target_lower = target_client.strip().lower()
        for cid, meta in self.clients_meta.get(class_id, {}).items():
            if (
                str(meta.get("id")) == target_client
                or str(meta.get("user_id")) == target_client
                or str(meta.get("student_id")) == target_client
                or str(meta.get("name", "")).strip().lower() == target_lower
            ):
                return cid, meta

        return None, None

    async def kick_client(self, class_id: uuid.UUID, client_id: str, reason: str = "Removed by instructor") -> None:
        if class_id not in self.rooms:
            return

        target_client, _ = self.resolve_client_info(class_id, client_id)
        if not target_client:
            target_client = client_id

        if target_client in self.rooms[class_id]:
            try:
                await self.send_to_client(
                    class_id,
                    target_client,
                    {
                        "type": "KICKED",
                        "payload": {"reason": reason},
                    },
                )
                ws = self.rooms[class_id].get(target_client)
                if ws:
                    await ws.close(code=4403, reason=reason)
            except Exception as e:
                logger.warning(f"Error kicking client {target_client}: {e}")
            meta = self.disconnect(class_id, target_client)
            if meta:
                await self.broadcast(
                    class_id,
                    {"type": "USER_LEFT", "payload": meta, "data": {"reason": reason}},
                )

    def get_room_participants(self, class_id: uuid.UUID) -> list[dict[str, Any]]:
        return list(self.clients_meta.get(class_id, {}).values())

    async def send_to_client(
        self, class_id: uuid.UUID, client_id: str, message: dict[str, Any]
    ) -> bool:
        if class_id in self.rooms and client_id in self.rooms[class_id]:
            try:
                await self.rooms[class_id][client_id].send_json(message)
                return True
            except Exception as e:
                logger.warning(f"Failed to send to client {client_id}: {e}")
                self.disconnect(class_id, client_id)
        return False

    async def broadcast(
        self,
        class_id: uuid.UUID,
        message: dict[str, Any],
        exclude_client_id: str | None = None,
    ) -> None:
        if class_id not in self.rooms:
            return

        dead_clients: list[str] = []
        for client_id, ws in self.rooms[class_id].items():
            if exclude_client_id and client_id == exclude_client_id:
                continue
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to client {client_id}: {e}")
                dead_clients.append(client_id)

        for client_id in dead_clients:
            self.disconnect(class_id, client_id)

    def get_room_clients_count(self, class_id: uuid.UUID) -> int:
        return len(self.rooms.get(class_id, {}))

    async def terminate_room(
        self,
        class_id: uuid.UUID,
        reason: str = "Teacher has ended the class session for all participants",
    ) -> None:
        """Broadcast CLASS_ENDED, close all active WebSockets for this class only, and flush room memory."""
        if class_id not in self.rooms:
            return

        room_clients = list(self.rooms[class_id].items())
        # First broadcast the termination message to all clients in this room
        for client_id, ws in room_clients:
            try:
                await ws.send_json({
                    "type": "CLASS_ENDED",
                    "payload": {"reason": reason},
                })
            except Exception as e:
                logger.warning(f"Error sending CLASS_ENDED to client {client_id}: {e}")

        # Explicitly close each socket in this room with normal closure code (1000)
        for client_id, ws in room_clients:
            try:
                await ws.close(code=1000, reason=reason)
            except Exception as e:
                logger.warning(f"Error closing socket for client {client_id}: {e}")

        # Flush room state strictly for this class_id, ensuring zero impact on other active rooms
        self.rooms.pop(class_id, None)
        self.clients_meta.pop(class_id, None)
        self.user_to_client.pop(class_id, None)
        self.whiteboard_history.pop(class_id, None)
        self.whiteboard_pages.pop(class_id, None)
        self.whiteboard_current_page.pop(class_id, None)
        self.whiteboard_state.pop(class_id, None)
        self.waiting_room_enabled.pop(class_id, None)
        self.waiting_rooms.pop(class_id, None)
        self.admitted_users.pop(class_id, None)
        self.active_polls.pop(class_id, None)
        self.hand_raise_queue.pop(class_id, None)
        logger.info(f"Classroom {class_id} terminated and flushed. Remaining active rooms: {len(self.rooms)}")


ws_manager = ClassroomWSManager()
