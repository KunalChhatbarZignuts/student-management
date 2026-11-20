# Online Classroom: REST & Real-time API Design

## 1. Authentication & Scoped Token Strategy
- **Standard Authentication**: Standard endpoints consume existing `Authorization: Bearer <access_token>` headers.
- **Meeting Token**: When joining a live classroom, the backend verifies the caller's role and permission, then issues an ephemeral, cryptographically signed room token (e.g. LiveKit JWT).
  - Contains room name, user identity, display name, avatar, and specific permissions (can publish audio, video, data, or subscribe only).
  - Lifespan: Restricted to the scheduled duration plus 1 hour grace buffer.

---

## 2. API Endpoints by Domain

### 2.1 Teacher Endpoints (`/api/v1/teacher/online-classes`)
Protected by `require_roles("teacher")`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List teacher's online classes (with status, date, and search filters). |
| `POST` | `/` | Create/Schedule a new online class. |
| `GET` | `/{class_id}` | Get detailed configuration and participant list. |
| `PUT` | `/{class_id}` | Update class details, schedule, or participant list. |
| `DELETE` | `/{class_id}` | Cancel/delete an unstarted scheduled class. |
| `POST` | `/{class_id}/start` | Start instant or scheduled class (transitions status to `LIVE`). |
| `POST` | `/{class_id}/end` | End live classroom (terminates session for all participants). |
| `POST` | `/{class_id}/token` | Generate teacher live room connection token. |
| `POST` | `/{class_id}/permissions` | Update dynamic in-meeting permissions (mute all, disable student cam/chat). |
| `POST` | `/{class_id}/kick-participant` | Disconnect and block a student from the active room. |
| `POST` | `/{class_id}/recording/start` | Start server-side recording. |
| `POST` | `/{class_id}/recording/stop` | Stop server-side recording and trigger processing. |

### 2.2 Student Endpoints (`/api/v1/student/online-classes`)
Protected by `require_roles("student")`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List student's assigned online classes (upcoming, live, completed). |
| `GET` | `/{class_id}` | Get class overview and pre-join metadata. |
| `POST` | `/{class_id}/join-token` | Validate eligibility and return ephemeral student room token. |
| `GET` | `/recordings` | List available class recordings authorized for the student. |
| `GET` | `/recordings/{recording_id}/stream` | Get signed, time-limited video stream playback URL. |

### 2.3 Administrator Endpoints (`/api/v1/admin/online-classes`)
Protected by `require_roles("super_admin", "admin")`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard-stats` | Macro KPIs: scheduled, live, completed, recording count, storage. |
| `GET` | `/sessions` | Search and filter all classes across the system with pagination. |
| `GET` | `/sessions/{class_id}/live-status` | Real-time participant list, stream telemetry, and duration. |
| `POST` | `/{class_id}/observer-token` | Generate authorized observer token (explicit notification broadcast). |
| `GET` | `/recordings` | Central recording archive with filtering and storage metadata. |
| `DELETE` | `/recordings/{recording_id}` | Archive or delete a recording with mandatory audit reason. |
| `GET` | `/audit-logs` | Retrieve classroom security and moderation audit trails. |

### 2.4 Video Engine Webhooks (`/api/v1/online-classes/webhooks/livekit`)
Secured via LiveKit Webhook Signature verification (`Authorization` header SHA-256).

| Event Name | Backend Action |
| :--- | :--- |
| `room_started` | Records new `online_meeting_sessions` row, updates class status to `LIVE`. |
| `room_finished` | Sets `ended_at`, calculates duration, marks class status as `COMPLETED`. |
| `participant_joined` | Inserts `online_session_attendees` record with timestamp and role. |
| `participant_left` | Updates attendee `left_at` and `total_duration_seconds`. |
| `egress_ended` | Inserts `online_class_recordings` record with S3 key, size, and duration. |

### 2.5 Real-Time WebSocket Endpoint (`/api/v1/online-classes/{class_id}/ws`)
Handles interactive whiteboard synchronizations and in-room chat.
- **Protocol**: JSON-based message framing.
- **Message Types**:
  - `WHITEBOARD_DRAW`: `{ x0, y0, x1, y1, color, size, tool, page }`
  - `WHITEBOARD_SHAPE`: `{ shapeType, x, y, width, height, stroke, fill }`
  - `WHITEBOARD_CLEAR`: `{ page, teacherConfirmed: true }`
  - `CHAT_MESSAGE`: `{ senderName, text, timestamp }`
  - `HAND_RAISE`: `{ studentId, studentName, raised: boolean }`
  - `PERMISSIONS_UPDATE`: `{ micAllowed, camAllowed, whiteboardAllowed }`

---

## 3. Request / Response Contracts (Pydantic Schemas)

```python
class OnlineClassCreateRequest(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    scheduled_date: date
    start_time: time
    expected_duration_minutes: int = Field(60, ge=15, le=360)
    student_ids: list[UUID] = Field(default_factory=list)
    is_recording_enabled: bool = False
    allow_student_mic: bool = True
    allow_student_cam: bool = True
    allow_student_chat: bool = True
    allow_student_whiteboard: bool = False

class OnlineClassDetailResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    room_name: str
    scheduled_date: date
    start_time: time
    expected_duration_minutes: int
    status: str
    teacher_id: UUID
    teacher_name: str
    participant_count: int
    is_recording_enabled: bool
    allow_student_mic: bool
    allow_student_cam: bool
    allow_student_chat: bool
    allow_student_whiteboard: bool
    created_at: datetime

class MeetingTokenResponse(BaseModel):
    token: str
    ws_url: str
    room_name: str
    participant_identity: str
    participant_name: str
    participant_role: str
    expires_at: datetime
```
