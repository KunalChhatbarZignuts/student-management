# Student Management System — Student & Parent Portal

The learner and guardian web application for the Student Management System, serving **STUDENT** and **PARENT** roles. Built with **Next.js 14** (App Router), **React 18**, **TypeScript**, **Material UI v6**, **TanStack Query v5**, **Zustand**, and **Axios**.

---

## Tech Stack & Required Versions

| Library / Tool | Specified Version | Installed Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Node.js Runtime** | `18.x` / `20.x` / `22.x` | `v22.23.2` | JavaScript runtime environment |
| **npm** | `10.x+` | `10.9.8` | Package manager |
| **Next.js** | `^14.2.18` | `14.2.35` | React framework with App Router |
| **React** | `^18.3.1` | `18.3.1` | UI rendering library |
| **React DOM** | `^18.3.1` | `18.3.1` | React DOM renderer |
| **TypeScript** | `^5.6.3` | `5.6.3` | Static typing compiler |
| **Material-UI (@mui/material)** | `^6.1.6` | `6.1.6` | Component library (MUI v6) |
| **MUI Icons (@mui/icons-material)** | `^6.1.6` | `6.1.6` | Material Design icon set |
| **MUI DataGrid (@mui/x-data-grid)** | `^7.22.1` | `7.22.1` | Data tables |
| **Emotion (@emotion/react, @emotion/styled)** | `^11.14.0` | `11.14.0` | Styling engine |
| **TanStack React Query** | `^5.60.5` | `5.60.5` | Server state caching & mutations |
| **Zustand** | `^5.0.1` | `5.0.1` | Global client store (Auth & children) |
| **Zod** | `^3.23.8` | `3.23.8` | Client schema validation |
| **React Hook Form** | `^7.53.2` | `7.53.2` | Form management |
| **Motion** | `^14.14.0` | `14.14.0` | Micro-interactions & animations |
| **Axios** | `^1.7.7` | `1.7.7` | HTTP REST client |
| **Day.js** | `^1.11.13` | `1.11.13` | Date parsing & formatting |
| **Vitest** | `^2.1.9` | `2.1.9` | Unit & component testing |
| **Playwright (@playwright/test)** | `^1.65.1` | `1.65.1` | Visual regression testing |

---

## Roles & Route Access Matrix

| Role | Permitted Areas & Capabilities |
| :--- | :--- |
| **STUDENT** | Personal Dashboard, My Attendance, Marks & Grades, Fee Details, Digital Diary (`/diary`), Online Classroom (`/online-classroom`), AI Student Assistant (`/assistant`), AI Study Planner (`/learning-assistant`), Profile & Security Settings |
| **PARENT** | Parent Dashboard, Multi-Child Switcher, Linked Children Directory (`/children`), Child Attendance Records, Child Marks & Report Cards, Digital Diary Signatures & Discussions (`/diary`), Online Fee Payments via Razorpay (`/fees`) |
| **STAFF / ADMIN** | **Blocked.** Displays *"You don't have access to this portal"* and initiates instant logout to protect role boundaries. |

---

## Core Feature Modules

### 1. Student User Journey

- **Personal Dashboard:** Summary metrics showcasing overall attendance percentage, upcoming fee payment due dates, and latest exam performances.
- **Attendance Records (`/attendance`):**
  - Cumulative attendance percentage calculation.
  - Breakdown of total days `Present`, `Absent`, `Late`, and `Excused`.
  - Monthly attendance history with status badges.
- **Marks & Examination Results (`/marks`):**
  - Subject-by-subject score sheets with letter grades and teacher remarks.
  - Term-wise academic progress reports.
- **Fee Details & Invoices (`/fees`):**
  - Itemized term tuition, lab, and activity fee statements.
  - Payment status indicators (`PAID`, `PENDING`, `OVERDUE`).
  - Invoice receipt history and transaction records.
- **Profile & Security (`/profile`):**
  - View verified student profile details (Student Code, Enrollment Date, Grade, Section).
  - Self-service password change and active session management.

---

### 2. Parent & Guardian User Journey

- **Multi-Child Switcher:**
  - Dynamic selector in the portal header enabling parents with multiple enrolled children to switch contexts instantly.
  - Automatically updates attendance, academic marks, and fee invoices to the selected child.
- **Linked Children Directory (`/children`):**
  - Overview cards displaying each ward's current grade, class section, student code, and quick status indicator.
- **Ward Attendance Monitoring:**
  - Real-time review of children's daily roll-call attendance records and absence alerts.
- **Ward Academic Performance:**
  - View detailed marks, term report cards, and subject evaluation for each linked child.
- **Child Fee Management:**
  - Review outstanding tuition fee balances, download fee receipts, and monitor payment schedules per child.
  - 1-click Razorpay checkout for pending fee installments.

---

### 3. Digital School Diary (`/diary`)
- **Student View:** Feed of homework updates, behavioral remarks, attendance notes, and teacher announcements with automatic read-receipt dispatch.
- **Parent View:** Multi-child diary feed with verified 1-click digital signature acknowledgements.
- **1-on-1 Discussions:** Contextual inquiry drawer allowing parents to direct questions to the teacher for any specific diary remark.

---

### 4. Interactive Online Classroom (`/online-classroom`)
- **Pre-Join Green Room (`/join`):** Device verification screen (camera, microphone, speaker test).
- **Live Classroom Meeting (`/live`):** Interactive WebRTC video and audio powered by LiveKit SFU, in-class chat, raise-hand queue, and live shared whiteboard view.

---

### 5. Conversational AI Student Assistant (`/assistant`)
- **Dual-Intelligence Architecture:** General conversational knowledge + grounded database tools (timetable, marks, attendance, leaves, fees, syllabus).
- **School Policy RAG:** Semantic similarity search over school handbooks and policies powered by PostgreSQL `pgvector`.
- **Interactive Tools:** Audio transcription, voice tutor speech synthesis, 3-round AI debate partner, and interactive SVG concept maps.

---

### 6. AI Academic Performance & Study Planner (`/learning-assistant`)
- **Academic Analytics:** Automated subject strength and weakness discovery from published exam marks.
- **Study Routine Checklist:** Daily tasks and customized study time goals with a persistent focus timer.
- **Exam Horizon Lookahead:** 14-day upcoming examination scheduler.

---

## Security & Architecture

- **In-Memory Access Token:** Kept strictly inside the client-side Zustand store. Tokens are never written to `localStorage` or readable cookies.
- **httpOnly Refresh Cookie:** Sent directly by the FastAPI backend as an `httpOnly`, `SameSite=Strict` cookie (`refresh_token`).
- **Next.js Proxy Rewrite:** Next.js proxies all `/api/*` browser requests to the backend server (`http://localhost:8000`), ensuring the refresh cookie remains first-party.
- **Single-Flight Refresh:** Axios response interceptor uses a mutex lock so that simultaneous 401 responses trigger **only a single refresh call**, queueing dependent requests and retrying seamlessly once refreshed.
- **Multi-Tab Sync:** Active sessions coordinate logout using the browser `BroadcastChannel` API.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Key environment variables:
```env
API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Student Management System - Student Portal"
```

### 3. Run Development Server
```bash
npm run dev
```
Runs at: [http://localhost:3001](http://localhost:3001) *(Port 3001 allows running concurrently with `admin-frontend` on port 3000)*.

### 4. Run Test Suite
```bash
npm run test
```
Executes unit and integration tests using Vitest, React Testing Library, and MSW.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## Generating TypeScript API Types
When the FastAPI backend is running, generate TypeScript schemas matching the backend models:
```bash
npm run gen:api
# Or directly:
npx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts
```
