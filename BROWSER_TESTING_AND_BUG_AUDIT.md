# Browser Testing & Bug Audit Report

**Date & Time:** November 4, 2026  
**Tools Used:** Chrome DevTools MCP (`new_page`, `navigate_page`, `take_snapshot`, `take_screenshot`, `list_console_messages`, `list_network_requests`, `evaluate_script`)  
**Tested Portals:**
- Admin Portal: `http://localhost:3000`
- Student & Parent Portal: `http://localhost:3001`
- Backend API Server: `http://localhost:8000`

---

## 1. Summary of Tested Login Roles

| Role | Test Account | Portal | Result |
|---|---|---|---|
| **Admin** | `admin_test@example.com` | Admin Portal (`:3000`) | ✅ PASS: Shift/Period configuration, Timetable grid, Clash validation, Draft & Publish |
| **Teacher** | `teacher_test@example.com` | Admin Portal (`:3000`) | ✅ PASS: Personal schedule (View 1) & Grade-wise highlighted timetable (View 2) |
| **Student** | `student_test@example.com` | Student Portal (`:3001`) | ✅ PASS: Enrolled class schedule, Fee module hidden from sidebar & dashboard, direct `/fees` access blocked |
| **Parent** | `parent_test@example.com` | Student Portal (`:3001`) | ✅ PASS: Multi-child timetable switcher, Fee schedule & online checkout access, unlinked child access blocked |

---

## 2. Identified Bugs, Root Causes & Fixes Applied

### Bug 1: Next.js Development Server Asset Desynchronization (404 Not Found)
- **Type:** Frontend / Dev Server Lifecycle
- **Affected URL:** `http://localhost:3001/login` and other pages
- **Symptom:** Browser console reported 404s for Next.js internal runtime scripts (`main-app.js`, `app-pages-internals.js`, `layout.js`, `error.js`, `loading.js`).
- **Root Cause:** Running `next build` while `next dev` was active in the background overwrote the `.next` directory with production hashes, deleting the dynamic development runtime chunks that the running `next dev` server in memory was attempting to serve.
- **Resolution:** Restarted the development server so Next.js clean-slate regenerated its development cache.

---

### Bug 2: Missing Query Parameter on Admin Timetable Fetch (HTTP 422)
- **Type:** Fullstack API Contract Mismatch
- **Affected Endpoint:** `GET /api/v1/admin/timetables?section_id=...`
- **Symptom:** Network request failed with `422 Unprocessable Entity`:
  ```json
  {"detail":[{"type":"missing","loc":["query","academic_year_id"],"msg":"Field required","input":null}]}
  ```
- **Root Cause:** The backend required `academic_year_id: uuid.UUID = Query(...)`, but the frontend only provided `section_id`.
- **Resolution:**
  1. Updated `app/api/v1/timetables.py` and `app/services/timetable_service.py` to make `academic_year_id: uuid.UUID | None = Query(None)`, defaulting to the active academic year if omitted.
  2. Updated `frontend/admin-frontend/src/features/timetables/api.ts` and `frontend/admin-frontend/src/app/timetable/page.tsx` to supply `selectedAcademicYearId`.

---

### Bug 3: Teacher Forbidden (HTTP 403) from Reading Grades in Grade-wise Timetable View
- **Type:** Backend RBAC Permission Gap
- **Affected Endpoint:** `GET /api/v1/admin/grades?size=100`
- **Symptom:** In Teacher View 2 ("Complete Grade Timetable"), the Grade dropdown remained completely empty. Network monitor showed `HTTP 403 Forbidden`.
- **Root Cause:** `app/api/v1/admin_grades.py` restricted `/admin/grades` and `/admin/grades/{id}` to `[ADMIN, SUPER_ADMIN]`, rejecting teachers who need read-only access to select a grade and section to inspect their class timetable.
- **Resolution:** Added `UserRole.TEACHER.value` to the read-only `GET /admin/grades` and `GET /admin/grades/{id}` endpoints in `app/api/v1/admin_grades.py`.

---

### Bug 4: Teacher Personal Timetable Academic Year Mismatch
- **Type:** Backend Service Query Resolution
- **Affected View:** Teacher View 1 ("Personal Teaching Schedule")
- **Symptom:** Teacher personal schedule showed "0 Periods" when no `academic_year_id` was passed and the active academic year in the database differed from the academic year containing the published timetable.
- **Root Cause:** `get_teacher_personal_schedule` strictly queried the year flagged `is_current=True`, which had no published timetables.
- **Resolution:** Added a smart fallback in `app/services/timetable_service.py` that resolves to the most recent published academic year for that teacher if the current academic year has no published slots.

---

### Bug 5: Fee Module Quick-Link Leak on Student Dashboard Homepage
- **Type:** Frontend Role-Based Visibility
- **Affected Page:** `http://localhost:3001/` (Student Dashboard)
- **Symptom:** Although the Fee Details item was hidden from the sidebar navigation, the homepage quick-navigation grid still displayed a card for "Fees & Invoices" linking to `/fees`. Clicking it displayed an "Access Restricted" alert.
- **Root Cause:** `frontend/student-portal/src/app/page.tsx` unconditionally rendered the "Fees & Invoices" card for both students and parents.
- **Resolution:** Updated `frontend/student-portal/src/app/page.tsx` to render "Class Timetable" (linking to `/timetable`) for students and "Fees & Invoices" (linking to `/fees`) only for parents.

---

### Bug 6: Parent Fee Schedule KPI Cards Rendered `₹NaN`
- **Type:** Fullstack Schema Field Name Discrepancy
- **Affected Page:** `http://localhost:3001/fees`
- **Symptom:** Parent portal fee cards displayed:
  - `TOTAL PAYABLE FEE ₹NaN`
  - `Base: ₹NaN`
  - `SETTLED & PAID ₹NaN`
  - `OUTSTANDING BALANCE ₹NaN`
- **Root Cause:** Backend `StudentPortalFeeScheduleResponse` returned `base_amount`, `final_payable_amount`, `total_paid_amount`, and `total_outstanding_amount`. The frontend attempted to parse `net_payable_fee`, `total_annual_fee`, `total_paid`, and `total_outstanding`. In JavaScript, `Number(undefined)` evaluated to `NaN`.
- **Resolution:**
  1. Added `@computed_field` properties in `app/schemas/fee.py` for `net_payable_fee`, `total_annual_fee`, `total_paid`, and `total_outstanding`.
  2. Updated `frontend/student-portal/src/app/fees/page.tsx` with safe fallback arithmetic `(Number(schedule.net_payable_fee ?? schedule.final_payable_amount) || 0).toLocaleString()`.

---

### Bug 7: MUI Tabs Invalid Value Warning on Parent Timetable Page
- **Type:** Frontend Console Warning / State Initialization
- **Affected Page:** `http://localhost:3001/timetable`
- **Symptom:** Console error:
  ```
  MUI: The `value` provided to the Tabs component is invalid. None of the Tabs' children match with "".
  ```
- **Root Cause:** On component mount, `selectedChildId` was initialized to `""`, causing a mismatch with the child UUID values until `childrenList` loaded.
- **Resolution:** Updated the Tabs component in `frontend/student-portal/src/app/timetable/page.tsx` to use:
  ```tsx
  value={selectedChildId || (childrenList && childrenList.length > 0 ? childrenList[0].id : false)}
  ```

---

### Bug 8: Major Blocker - Grade-Shift Linkage Missing & Raw Time Inputs
- **Type:** Major Functional Blocker & UX Improvement
- **Affected Area:** Admin Timetable Management (`http://localhost:3000/timetable`)
- **Symptom:**
  1. When an Admin navigated to Tab 0 ("Class Timetables"), grades without an assigned shift showed "No Periods Configured for this Shift. Configure Shift Periods". However, after navigating to Tab 1 and configuring the shift, there was no option anywhere to link the Shift to the Grade, leaving the timetable grid permanently inaccessible.
  2. Start and end time inputs in the Shift creation and Period creation dialogs were raw HTML/text inputs rather than standard MUI TimePicker components.
- **Root Cause:**
  1. The backend model `Grade.shift_id` existed, but there were no explicit endpoints or UI controls allowing an admin to select or change a grade's shift directly from the timetable page or assign grades during shift creation.
  2. Dialogs used `<TextField placeholder="07:00" />` instead of `@mui/x-date-pickers/TimePicker`.
- **Resolution:**
  1. **Backend Endpoints & Logic:**
     - Created `PUT /api/v1/admin/grades/{grade_id}/shift` to link/unlink a grade to a shift.
     - Created `POST /api/v1/admin/shifts/{shift_id}/assign-grades` for batch grade assignments.
     - Enhanced `list_shifts` and `get_shift_detail` to return `assigned_grade_ids` and `assigned_grade_names`.
     - Added comprehensive unit tests in `app/tests/test_timetables_and_shifts.py` (**5/5 passed**).
  2. **Frontend UI & MUI TimePicker:**
     - Built `frontend/admin-frontend/src/components/ui/AppTimePicker.tsx` wrapping `@mui/x-date-pickers/TimePicker`.
     - Replaced all raw time textfields in "Create Shift" and "Add Period" dialogs with `<AppTimePicker />`.
     - Added an interactive **"Assigned Shift" selector** to Tab 0's top filter bar so the admin can link or switch shifts with 1 click.
     - Added an interactive **"No Shift Assigned" banner** in Tab 0 with a quick-select dropdown and "Assign Shift & Load Grid" button.
     - Added **"Assign to Grades" multi-select** in the "Create Shift" dialog.
     - Added **"Assign Grades" management dialog** in Tab 1 for each configured shift.

---

## 3. Verification & Quality Gate Results

- **Automated Backend Pytest Suites:**
  - `app/tests/test_timetables_and_shifts.py`: **5/5 passed (100% green)**
  - Full suite (`app/tests/`): **90/90 passed (100% green)**
- **Frontend Code Quality & Compilation:**
  - `npx tsc --noEmit`: **0 errors**
  - Dev servers running cleanly on ports `:3000` and `:3001`
- **Chrome DevTools Live Sessions:**
  - Admin session (`:3000`): **Verified - Shift assignment, period grid, draft saving, clash validation, and publication verified live**
  - Teacher session (`:3000`): **Verified - View 1 personal schedule & View 2 grade-wise schedule with "You" highlight verified live**
  - Student session (`:3001`): **Verified - Fee module hidden from navigation/dashboard, direct URL blocked with 403 Access Restricted, Timetable accessible**
  - Parent session (`:3001`): **Verified - Fee schedule accessible with proper ₹ formatting, Timetable accessible for all linked children**

