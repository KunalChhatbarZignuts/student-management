# Online Classroom: UI/UX Workflow & Component Structure

## 1. UI Design Principles & Google Meet Ergonomics
The virtual classroom interface follows Google Meet's modern, dark-mode focused video conferencing layout while integrating cleanly into the existing Next.js / Material UI (MUI) design system.

### 1.1 Layout Architecture
- **Stage Area (Center)**: Dynamic video layout:
  - Default: Auto-fitting video grid (1 to 25 tiles with responsive flexbox/CSS grid).
  - Presentation Mode: Primary screen-share or whiteboard takes 75% of width; participant video strip docks vertically on the right or horizontally on top.
  - Active Speaker: Subtle primary color border highlight and real-time audio wave indicator.
- **Floating Bottom Action Bar**:
  - Left: Meeting info & duration clock (`00:45:12`), Room ID.
  - Center: Mic toggle (with input selector), Camera toggle (with device selector), Screen Share button, Whiteboard toggle, Hand Raise button (student), Call Leave / End button (red pill button).
  - Right: Recording badge (`REC` with animated red dot), In-call Chat drawer toggle, Participant List drawer toggle, Classroom Settings modal trigger.
- **Side Drawers (Right Panel)**:
  - Slide-in side drawer for Participants or Chat. Opening a drawer cleanly shifts the main stage without overlapping controls.

---

## 2. User Journeys & Screen Wireframes

### 2.1 Teacher Journey

```
Teacher Portal
  └── Online Classroom Dashboard (/my-classes/online or dedicated /online-classroom)
       ├── Schedule Online Class Dialog
       │    ├── Title, Description, Date & Time, Duration
       │    ├── Participant Multi-select (Search by student name or code)
       │    └── Permission toggles (Mic, Cam, Chat, Whiteboard, Auto-record)
       └── Live Classroom Interface
            ├── Pre-flight check (preview camera/mic)
            ├── Launch Classroom (room transitions to LIVE)
            ├── Share Screen (Tab, Window, or Full Screen)
            ├── Open Whiteboard (Full screen or Split stage)
            ├── Control Participants (Mute individual, Mute all, Remove from class)
            └── End Class (Terminates meeting for all participants)
```

### 2.2 Student Journey

```
Student Portal
  └── Online Classroom (/online-classroom)
       ├── Dashboard (Upcoming classes with countdown, recordings tab)
       ├── Pre-Join "Green Room" (/online-classroom/[id]/join)
       │    ├── Live Camera preview
       │    ├── Microphone audio meter (shows green voice level)
       │    ├── Device settings dropdown
       │    └── "Join Now" button (validates status and time window)
       ├── In-Class Experience
       │    ├── Video Grid / Spotlight
       │    ├── Hand Raise indicator
       │    ├── In-class Chat
       │    └── Whiteboard interaction (when teacher enables collaboration)
       └── Post-Class
            └── Recording Library (search, play, seek, adjust playback speed)
```

### 2.3 Admin Monitoring Journey

```
Admin Portal
  └── Online Classroom Management (/admin/online-classroom)
       ├── Macro Metrics (Active classes, total participants, storage used)
       ├── Live Monitoring Table (Status: LIVE, teacher, duration, participant count)
       ├── Join as Authorized Observer
       │    └── Screen displays prominent banner: "Observer Mode: Administrator"
       │    └── Meeting participants receive toast: "Administrator joined as observer"
       └── Recording Management & Retention (/admin/online-classroom/recordings)
            ├── Play recording in secure player modal
            ├── File size, duration, and download link
            └── Archive / Set retention expiration
```

---

## 3. Responsive Breakpoints & Accessibility

| Viewport | Screen Width | Layout Adaptation |
| :--- | :--- | :--- |
| **Desktop** | `>= 1200px` | Full 16:9 video stage, side-by-side whiteboard/screenshare, dockable side drawers. |
| **Tablet** | `768px - 1199px` | 2-4 video tiles per row, collapsible drawer overlay on tap. |
| **Mobile** | `< 768px` | Single active speaker spotlight, thumbnail overlay for teacher, swipeable bottom sheet for chat and participant list. Whiteboard enters full-screen modal with pinch-to-zoom. |

### 3.1 Accessibility Checklist (WCAG 2.2 AA)
- Keyboard shortcuts: `Ctrl+D` (Mute/Unmute Mic), `Ctrl+E` (Toggle Video), `Ctrl+H` (Raise Hand).
- Screen-reader announcements for chat messages, participant join/leave, and hand raises via `aria-live="polite"`.
- Contrast ratio `>= 4.5:1` for all control button labels and indicators.
