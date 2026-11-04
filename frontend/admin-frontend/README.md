# Student Management System — Admin & Teacher Frontend

The administrative web application for the Student Management System, serving **SUPER_ADMIN**, **ADMIN**, and **TEACHER** roles. Built with **Next.js 14** (App Router), **React 18**, **TypeScript**, **Material UI v6**, **MUI X-DataGrid**, **MUI X-DatePickers**, **TanStack Query v5**, **Zustand**, and the **Vercel Workflow SDK**.

---

## Roles & Route Access Matrix

| Role | Permitted Pages & Capabilities |
| :--- | :--- |
| **SUPER_ADMIN** | Full access to all modules: Dashboard, User Accounts, School Calendar, Attendance, Admissions Wizard, Students, Teachers, Grades & Classes, Fees, Bulk Import, Applications, Parent Linking, and Audit Logs |
| **ADMIN** | Dashboard, School Calendar, Attendance Overview, Admissions Wizard, Students, Teachers, Grades & Classes, Fees, Bulk Import, Applications, Parent Linking, Audit Logs |
| **TEACHER** | Dashboard, Daily Roll-Call Attendance, My Classes & Sections, Report Missing Student, Profile & Security Settings |
| **STUDENT / PARENT** | **Blocked.** Displays *"You don't have access to this portal"* and initiates instant logout. |

---

## Core Feature Modules

### 1. School Calendar & Working Days (`/calendar`)
- **Official MUI DateCalendar:** Implemented using `@mui/x-date-pickers/DateCalendar` with custom `PickersDay` badges:
  - 🟢 **Regular Working Days:** Marked eligible for roll-call attendance.
  - 🔴 **Official Holidays:** Displays school holiday badges and reasons.
  - 🟠 **Compensatory Working Days:** Working weekends/special instruction days.
  - ⚪ **Weekly Offs:** Weekend non-working days.
- **Side Inspector Panel:** Date selection immediately reveals calendar details and working day status in the dedicated side panel without intrusive popup dialogs.
- **Holiday & Compensatory Scheduling:** Admin dialogs to configure single or recurring school holidays and compensatory working days with integrated MUI DatePickers.

### 2. Daily Attendance Management (`/attendance`)
- **Admin School-Wide Overview:** Filter attendance by date, grade, class, and section with real-time presence percentages, total present, absent, and late counts.
- **Teacher Roll-Call Interface:** Interactive student attendance sheet with instant one-click status toggling (`Present`, `Absent`, `Late`, `Excused`) and bulk submission.
- **Calendar-Aware Validation:** Automatic warnings when viewing or attempting attendance marking on non-working days or holidays.

### 3. Unified Material UI Date Pickers (`AppDatePicker`)
- Standardized across all forms (Admissions, Students, Calendar, Attendance) using `@mui/x-date-pickers`.
- Seamlessly configured with Dayjs localization (`LocalizationProvider`).
- Form fields maintain standard 56px input heights matching neighboring textfields, with optional `size="small"` (40px) for compact filter toolbars.

### 4. Multi-Step Student Admissions (`/admissions/create`)
- Guided 3-step admission workflow:
  1. **Personal Information:** Student name, DOB, gender, blood group, contact info.
  2. **Guardian Details:** Parent profile linking with single-parent profile enforcement.
  3. **Academic Allocation:** Grade level, class section, official admission date, and automated enrollment code generation.

### 5. Persistent Layout Shell & Page Transitions
- **DashboardLayout Shell:** Sidebar navigation drawer and top app bar remain mounted during route transitions.
- **Non-blocking Progress Bar:** Slim top progress indicator powered by `nextjs-toploader`.
- **Scoped Content Spinners:** Internal route loading indicators are scoped strictly to the content area (`calc(100vh - 160px)`), keeping navigation controls permanently accessible.

### 6. Durable Workflows (Vercel Workflow SDK)
- Multi-step background workflows configured in `src/workflows/`:
  - `user-signup.ts`: Durable steps for account validation, welcome email dispatch, durable sleep, and onboarding orientation delivery.
  - `student-admission.ts`: Validation, enrollment code assignment, stakeholder notifications, durable sleep, and welcome package generation.
- Flow endpoints: `/.well-known/workflow/v1/*` and `/api/workflow/*`.

### 7. Authentication & Session Architecture
- **In-Memory Access Token:** Kept strictly inside the Zustand auth store (`accessToken`). Never stored in `localStorage` or readable cookies.
- **httpOnly Refresh Cookie:** Issued by backend with `SameSite=Strict`.
- **Single-Flight Refresh Mutex:** Axios response interceptor queues concurrent 401 requests so only one token refresh request fires at a time.
- **Two-Factor Authentication (2FA):** Mandatory 6-digit OTP verification screen during login when 2FA is active.
- **Multi-Tab Sync:** Instant cross-tab logout coordination via browser `BroadcastChannel`.

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
NEXT_PUBLIC_APP_NAME="Student Management System - Admin Portal"
```

### 3. Run Development Server
```bash
npm run dev
```
Runs at: [http://localhost:3000](http://localhost:3000)

### 4. Run Test Suite
```bash
npm run test
```
Executes unit and component tests with Vitest, React Testing Library, and MSW.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## Generating TypeScript API Types
Generate TypeScript schemas matching the FastAPI backend OpenAPI specification:
```bash
npm run gen:api
# Or directly:
npx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts
```
