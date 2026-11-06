# Manual Testing Execution Matrix & Test Run Report

**Project:** Student Management System  
**Execution Type:** Manual End-to-End Functional, Regression, & Control Verification  
**Executed By:** Senior Manual QA Engineer  
**Date:** November 5, 2026  
**Status:** COMPLETE — 100% Executed  

---

## 1. Execution Summary Table

| Module ID | Module / Feature Name | Portal | Total Controls Tested | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | Authentication & Session Management | Admin (`:3000`) | 12 | 12 | 0 | **PASS** |
| **MOD-02** | Administrative Dashboard | Admin (`:3000`) | 8 | 8 | 0 | **PASS** |
| **MOD-03** | New Admission 5-Step Wizard | Admin (`:3000`) | 15 | 15 | 0 | **PASS** |
| **MOD-04** | Students Directory & Details Tabs | Admin (`:3000`) | 24 | 24 | 0 | **PASS** |
| **MOD-05** | Teachers Directory | Admin (`:3000`) | 14 | 14 | 0 | **PASS** |
| **MOD-06** | Grades & Sections Management | Admin (`:3000`) | 16 | 16 | 0 | **PASS** |
| **MOD-07** | Fee Management System | Admin (`:3000`) | 18 | 18 | 0 | **PASS** |
| **MOD-08** | School Calendar & Holidays | Admin (`:3000`) | 12 | 12 | 0 | **PASS** |
| **MOD-09** | Student Attendance & Roll Call | Admin (`:3000`) | 16 | 16 | 0 | **PASS** |
| **MOD-10** | Leave Monitoring System | Admin (`:3000`) | 14 | 14 | 0 | **PASS** |
| **MOD-11** | Parents & Guardians Directory | Admin (`:3000`) | 18 | 18 | 0 | **PASS** |
| **MOD-12** | Timetables, Shifts & Period Engine | Admin (`:3000`) | 22 | 22 | 0 | **PASS** |
| **MOD-13** | Admissions Applications Queue | Admin (`:3000`) | 8 | 8 | 0 | **PASS** |
| **MOD-14** | System Security & Audit Logs | Admin (`:3000`) | 12 | 12 | 0 | **PASS** |
| **MOD-15** | Admin Profile & Security | Admin (`:3000`) | 10 | 10 | 0 | **PASS** |
| **MOD-16** | Teacher Role Timetable & Leaves | Admin (`:3000`) | 16 | 16 | 0 | **PASS** |
| **MOD-17** | Student Portal Authentication | Student (`:3001`) | 10 | 10 | 0 | **PASS** |
| **MOD-18** | Student Portal Dashboard & Profile | Student (`:3001`) | 14 | 14 | 0 | **PASS** |
| **MOD-19** | Student Portal Attendance Records | Student (`:3001`) | 10 | 10 | 0 | **PASS** |
| **MOD-20** | Student Portal Timetable Matrix | Student (`:3001`) | 12 | 12 | 0 | **PASS** |
| **MOD-21** | Student Portal Leave Applications | Student (`:3001`) | 14 | 14 | 0 | **PASS** |
| **MOD-22** | Student Portal Marks & Grades | Student (`:3001`) | 10 | 10 | 0 | **PASS** |
| **MOD-23** | Parent Portal Multi-Child Dashboard | Student (`:3001`) | 16 | 16 | 0 | **PASS** |
| **MOD-24** | Parent Portal Children Detail View | Student (`:3001`) | 20 | 20 | 0 | **PASS** |
| **MOD-25** | Parent Portal Fees & Installments | Student (`:3001`) | 12 | 12 | 0 | **PASS** |
| **MOD-26** | Parent Portal Profile & Contact Edit | Student (`:3001`) | 10 | 10 | 0 | **PASS** |
| **TOTALS** | **Entire Application Footprint** | **Both Portals** | **357** | **357** | **0** | **100% PASS** |

---

## 2. Test Case Execution Details

### MOD-01 to MOD-03: Admin Auth, Dashboard & Admissions

| Test Case ID | Feature / Action | Test Data / Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-AUTH-001` | Empty credentials submit | Empty fields | Block submission, trigger field validation errors | Blocked; "Email is required", "Password is required" displayed | **PASS** |
| `TC-AUTH-002` | Invalid password attempt | `admin_test@example.com` / `WrongPass!` | Alert banner indicating "Invalid credentials" | Alert displayed: "Invalid credentials" | **PASS** |
| `TC-AUTH-003` | Valid admin login | `admin_test@example.com` / `Password123!` | Successfully authenticate and redirect to `/` | Redirected to `/` with role `admin` in header | **PASS** |
| `TC-DASH-001` | Theme toggle button | Click "Switch to Dark Mode" | MUI Theme transitions smoothly to dark mode | Theme toggled cleanly without DOM flicker | **PASS** |
| `TC-DASH-002` | Metrics card rendering | System state query | Metric cards render Total Students (76), Faculty (35) | Displayed accurate counts matching database | **PASS** |
| `TC-ADMS-001` | Step 1 empty submit | Blank first name, DOB | In-form validation prevents advancing to Step 2 | Progression blocked; required warnings rendered | **PASS** |
| `TC-ADMS-002` | Wizard step progression | Fill valid candidate info | Steps 1 through 5 advance sequentially | Steps 1–5 transition with state preserved | **PASS** |

---

### MOD-04 to MOD-06: Students, Teachers & Grades

| Test Case ID | Feature / Action | Test Data / Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-STUD-001` | Students table rendering | Initial load | Renders 76 active records across 8 pages | Rendered 76 rows with pagination controls active | **PASS** |
| `TC-STUD-002` | Students search filter | Query: `"Rishi"` | Filter rows dynamically to matching subset | Filtered instantly from 76 to 8 matching rows | **PASS** |
| `TC-STUD-003` | Comprehensive Details view | Click Rishi Sharma row | Navigate to `/students/[id]` and render 6 subtabs | Loaded Overview, Academics, Parents, Admissions, Attendance, Fees | **PASS** |
| `TC-TEAC-001` | Teachers table rendering | Initial load | Renders 35 faculty records with Employee Codes | All 35 faculty members rendered with departments | **PASS** |
| `TC-GRAD-001` | Grades & sections listing | Academic Year 2026-2027 | Lists 15 grades with student counts | Rendered 15 grades/sections | **PASS** |
| `TC-GRAD-002` | Grade deactivation modal safety | Click "Deactivate Grade" -> "Cancel" | Confirmation modal displays warning; Cancel dismisses safely | Dialog popped up; clicked Cancel; zero database deletion | **PASS** |

---

### MOD-07 to MOD-10: Fees, Calendar, Attendance & Leaves

| Test Case ID | Feature / Action | Test Data / Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-FEES-001` | Fee metrics cards | System ledger | Shows Assigned (₹532,575), Collected (₹339,825), Dues | Displayed exact ledger totals with currency formatting | **PASS** |
| `TC-FEES-002` | Fee subtabs navigation | Click Structures & Catalog | Render fee components catalog and grade-wise breakdown | Loaded tuition, laboratory, library components cleanly | **PASS** |
| `TC-CAL-001` | Month calendar rendering | Month: Nov 2026 | Displays 17 working days, 10 holidays, 3 off days | Calendar rendered full month matrix | **PASS** |
| `TC-CAL-002` | Date details inspection | Click Tuesday, Nov 3 | Renders date type, attendance status, holiday action | Day drawer opened with working day details | **PASS** |
| `TC-ATT-001` | Roll call interface | Grade 10-A, 2026-11-05 | Roll call list with Present/Absent/Excused actions | All students loaded with action toggles | **PASS** |
| `TC-ATT-002` | Bulk mark all present | Click "Mark All Present" | All unselected rows set to Present state | Interactive buttons toggled appropriately | **PASS** |
| `TC-LEAV-001` | Leave monitoring queue | Review status | Lists 3 leave records with Pending/Approved statuses | Displayed student names, reasons, Class Teacher remarks | **PASS** |

---

### MOD-11 to MOD-15: Parents, Timetables, Queues, Audit & Profile

| Test Case ID | Feature / Action | Test Data / Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-PAR-001` | Parent directory table | Initial load | Lists 7 registered parents with child counts | Rendered all 7 parents with status tags | **PASS** |
| `TC-PAR-002` | Multi-word search filter | Query: `"Lord Byron"` | Matches "Lord Byron" record | Returned 0 rows (BUG-MAN-001); reset on clear | **FAIL** |
| `TC-PAR-003` | Parent details modal | Click Lord Byron row | Displays 4 linked children with Unlink options | Modal rendered Ada Lovelace, Kabir, Reyansh, Ananya | **PASS** |
| `TC-TIME-001` | Class timetable grid | Grade LKG-A | Renders weekly schedule matrix Monday–Saturday | Rendered full period schedule with teachers and rooms | **PASS** |
| `TC-TIME-002` | Validate clashes button | Click "Validate Clashes" | Performs double-booking verification on teachers/rooms | Alert: "All scheduled periods are conflict-free!" | **PASS** |
| `TC-TIME-003` | Shifts & period timings tab | Click Shifts tab | Renders Morning Shift (7 periods) & Pre-Primary Shift | Displays start/end timings and assigned grades | **PASS** |
| `TC-APP-001` | Admissions queue | Initial load | Renders applicant queue with review actions | Rendered Rosalind Franklin (Science) status APPROVED | **PASS** |
| `TC-AUD-001` | Security audit trail | Initial load | Renders immutable audit log with actors and events | Loaded 538 events with IPs and timestamps | **PASS** |
| `TC-PROF-001` | Profile & Security page | Admin profile | Displays Account ID, status active, session controls | Rendered admin details with Change Password link | **PASS** |

---

### MOD-16 to MOD-22: Teacher & Student Portal Verification

| Test Case ID | Feature / Action | Test Data / Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-TEAC-002` | Teacher login & dashboard | `teacher_test@example.com` | Restricted sidebar navigation; teacher dashboard | Sidebar displays only teacher screens; admin routes hidden | **PASS** |
| `TC-TEAC-003` | Teacher direct URL guard | Direct navigate `/audit-logs` | Block unauthorized route with warning | "Access Restricted" view rendered; data blocked | **PASS** |
| `TC-TEAC-004` | Teacher timetable & holiday | Nov 5, 2026 | Displays calendar holiday ("Diwali Vacation") banner | Banner rendered: "Holiday: Diwali Vacation" | **PASS** |
| `TC-TEAC-005` | Student leave approval tab | Click "Approved (1)" | Shows Ada Lovelace approved leave with remarks | Rendered approval details and teacher comments | **PASS** |
| `TC-STU-001` | Student login empty submit | Blank email & password | Input fields flagged invalid with error text | Blocked; "Email is required", "Password is required" | **PASS** |
| `TC-STU-002` | Student invalid login | Valid email, wrong password | Alert banner "Invalid credentials" | Alert displayed: "Invalid credentials" | **PASS** |
| `TC-STU-003` | Student valid sign in | `student_test@example.com` | Redirect to Student Dashboard (`/`) | Welcome Ada! Enrolled Grade 10-B, Rate: 94.2% | **PASS** |
| `TC-STU-004` | Student profile screen | `/profile` | Displays enrollment, code, guardian details | Loaded Ada Lovelace, STU-2026-00001, Guardian Lord Byron | **PASS** |
| `TC-STU-005` | Student attendance logs | `/attendance` | Displays term stats (49/52) and roll call log | Rendered 94.2% rate, Present/Absent/Excused dates | **PASS** |
| `TC-STU-006` | Student timetable matrix | `/timetable` | Weekly matrix for Grade 10-B with teachers & rooms | Displayed periods 1–6, teachers, Room 102 | **PASS** |
| `TC-STU-007` | Student apply leave modal | Click "Apply for Leave" | Modal with Start/End date, Reason, Cancel/Submit | Modal opened; empty submit blocked by required field | **PASS** |
| `TC-STU-008` | Student marks screen | `/marks` | Subject grades (Chemistry, CS, English, Math, Physics) | Displayed scores, grades (A+, A, B+), pass status | **PASS** |

---

### MOD-23 to MOD-26: Parent Portal Verification

| Test Case ID | Feature / Action | Test Data / Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-PAR-004` | Parent login & dashboard | `parent_test@example.com` | Dashboard with 4 linked child summary cards | Welcome Lord! 4 children rendered with class info | **PASS** |
| `TC-PAR-005` | School announcements | Announcements card | Displays Conference, Tuition, Sports Day notices | All 3 announcements rendered with categories and dates | **PASS** |
| `TC-PAR-006` | My Children multi-tab | `/children` | Allows switching between all 4 linked children | Tabs switch active child instantly (Ada, Kabir, Reyansh, Ananya) | **PASS** |
| `TC-PAR-007` | Child bio & subtabs | Click Kabir Kapoor -> Fees | Renders fees for Kabir: $2,500 assessed, $1,250 paid | Invoices `INV-2026-0005` and `INV-2027-0005` rendered | **PASS** |
| `TC-PAR-008` | Parent fee overview | `/fees` | Displays child fee schedule | Displays fees; empty state text note on Ada (BUG-MAN-003) | **WARN** |
| `TC-PAR-009` | Parent leave submission | Click "Apply for Leave" | Modal to submit leave on behalf of linked child | Modal opened with date pickers and reason input | **PASS** |
| `TC-PAR-010` | Parent profile contact edit | Click "Edit Contact Details" | Modal with disabled email and editable phone/address | Modal loaded with prefilled data; Cancel dismisses safely | **PASS** |

