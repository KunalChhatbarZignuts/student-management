# Student Management System — Admin & Teacher Frontend

The administrative web application for the Student Management System, serving **SUPER_ADMIN**, **ADMIN**, and **TEACHER** roles. Built with **Next.js 14** (App Router), **React 18**, **TypeScript**, **Material UI v6**, **MUI X-DataGrid**, **MUI X-DatePickers**, **TanStack Query v5**, **Zustand**, and the **Vercel Workflow SDK**.

---

## Tech Stack & Required Versions

| Library / Tool | Specified Version | Installed Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Node.js Runtime** | `18.x` / `20.x` / `22.x` | `v22.23.2` | JavaScript runtime environment |
| **npm** | `10.x+` | `10.9.8` | Package manager |
| **Next.js** | `^14.2.18` | `14.2.35` | React framework with App Router |
| **React** | `^18.3.1` | `18.3.1` | UI rendering library |
| **React DOM** | `^18.3.1` | `18.3.1` | React DOM renderer |
| **TypeScript** | `^5.6.3` | `5.6.3` | Type system |
| **Material-UI (@mui/material)** | `^6.1.6` | `6.1.6` | Component library (MUI v6) |
| **MUI Icons (@mui/icons-material)** | `^6.1.6` | `6.1.6` | Material Design icons |
| **MUI DataGrid (@mui/x-data-grid)** | `^7.22.1` | `7.22.1` | Administrative data tables |
| **MUI Pickers (@mui/x-date-pickers)** | `^7.29.4` | `7.29.4` | Date & time pickers |
| **Emotion (@emotion/react, @emotion/styled)** | `^11.14.0` | `11.14.0` | Styling engine |
| **TanStack React Query** | `^5.60.5` | `5.60.5` | Async server state caching |
| **Zustand** | `^5.0.1` | `5.0.1` | Client state management (Auth store) |
| **Zod** | `^3.23.8` | `3.23.8` | Schema validation |
| **React Hook Form** | `^7.53.2` | `7.53.2` | Form management |
| **Motion** | `^14.14.0` | `14.14.0` | Spring animations |
| **Axios** | `^1.7.7` | `1.7.7` | HTTP REST client |
| **Day.js** | `^1.11.13` | `1.11.13` | Date parsing & formatting |
| **Vitest** | `^2.1.9` | `2.1.9` | Component & unit test runner |

---

## Roles & Route Access Matrix

| Role | Permitted Pages & Capabilities |
| :--- | :--- |
| **SUPER_ADMIN** | Full access to all modules: Dashboard, User Accounts, School Calendar, Attendance, Admissions Wizard, Students, Teachers, Grades & Classes, Fees, Applications, Parent Linking, and Audit Logs |
| **ADMIN** | Dashboard, School Calendar, Attendance Overview, Admissions Wizard, Students, Teachers, Grades & Classes, Fees, Applications, Parent Linking, Audit Logs, Online Classroom Monitoring |
| **TEACHER** | Dashboard, Daily Roll-Call Attendance, My Classes & Sections, Digital School Diary (`/diary`), Online Classroom Host (`/online-classroom`), Report Missing Student, Profile & Security Settings |
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
