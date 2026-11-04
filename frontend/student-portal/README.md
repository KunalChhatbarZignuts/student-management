# Student Management System — Student & Parent Portal

The learner and guardian web application for the Student Management System, serving **STUDENT** and **PARENT** roles. Built with **Next.js 14** (App Router), **React 18**, **TypeScript**, **Material UI v6**, **TanStack Query v5**, **Zustand**, and **Axios**.

---

## Roles & Route Access Matrix

| Role | Permitted Areas & Capabilities |
| :--- | :--- |
| **STUDENT** | Personal Dashboard, My Attendance, Marks & Grades, Fee Details, Profile & Security Settings |
| **PARENT** | Parent Dashboard, Multi-Child Switcher, Linked Children Directory, Child Attendance Records, Child Marks & Report Cards, Child Fee Invoices & Payment History |
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
