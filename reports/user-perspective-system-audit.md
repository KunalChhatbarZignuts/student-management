# User-Perspective System Audit: Real-World School Operations Analysis

**Document Code:** AUDIT-UX-2026-V1  
**Author:** Senior Product Analyst, UX Researcher & School Operations Domain Specialist  
**System Scope:** Student Management System (FastAPI + Next.js Admin & Student/Parent Portals)  
**Date of Audit:** November 5, 2026  
**Status:** Complete Analytical Evaluation (Non-Destructive Inspection)  

---

## 1. Executive Context & Audit Philosophy

A school management system is not simply an administrative CRUD database; it is the **operational spine of an educational institution**. In a real school, software is used under time pressure:
- Teachers have only 3–5 minutes between class bells to mark attendance.
- Administrators handle frantic morning calls from parents, unexpected faculty absences, mid-session admissions, and fee disputes.
- Parents need instant clarity on whether their child arrived safely, when term fees are due, and how their child is performing.
- Students need a fast, reliable mobile view of daily timetables, homework, exam schedules, and holiday announcements.

This audit evaluates the entire existing codebase through the lived experience of these stakeholders.

---

## 2. Super Admin Perspective

### 2.1 Core Responsibilities & Workflows
- Overseeing school-wide governance, multiple campuses or branch networks.
- Managing administrative staff credentials, system roles, and high-level configuration.
- Auditing operational compliance, financial collections across terms, and security event logs.

### 2.2 Current System Capabilities (Source of Truth)
- Dedicated Security Audit Trail (`/audit-logs`) with 538+ tracked events, IP addresses, actor emails, and entity IDs.
- User management and role provisioning backend (`/api/v1/admin/users`).
- Academic year configuration (`academic_years` table) supporting multi-year historical records.

### 2.3 Real-World Operational Gaps & Friction Points
1. **Absence of Multi-Campus / Branch Scoping:**
   - The current database schema lacks a `branch_id` or `campus_id` tenant identifier in core tables (`students`, `teachers`, `fee_structures`, `academic_years`).
   - For an educational trust operating multiple branches (e.g. "City Campus" vs. "Junior Wing"), Super Admins cannot filter or compare performance, admissions, or fee revenue across branches.
2. **Missing Executive Operational Dashboard:**
   - The administrative dashboard displays raw counters (Total Students: 76, Faculty: 35) but lacks high-level school health metrics:
     - School-wide daily attendance rate (e.g. 93.4% present today across all grades).
     - Financial collection velocity (Total billed vs. collected vs. overdue aged debt).
     - Staff vacancy and class coverage ratios.
3. **Role Permission Granularity:**
   - Permissions currently default to coarse role strings (`super_admin`, `admin`, `teacher`, `student`, `parent`). Real schools require granular functional permissions (e.g. *Accountant* who can manage fees but cannot alter grades; *Admissions Counselor* who can review applications but cannot alter fee structures).

---

## 3. School Administrator (Admin) Perspective

### 3.1 Core Responsibilities & Workflows
- Managing daily admissions, student enrollment, section allocations, and withdrawals.
- Timetable planning, room assignments, teacher subject allocations, and shift configurations.
- Fee structure definition, fee assignments, concession approvals, and daily payment recording.
- Reviewing attendance roll-calls, calendar holiday declarations, and leave monitoring.

### 3.2 Current System Capabilities
- 5-step Admission Wizard (`/admissions/create`) with candidate bio, guardian data, previous academic records, and document upload stubs.
- Student Directory (`/students`) with search, pagination, and multi-tab profile details (`Overview`, `Academics`, `Parents`, `Admissions`, `Attendance`, `Fees`).
- Conflict-free timetable engine with automatic teacher clash detection and multi-shift period configuration (`/timetable`).
- Fee component catalog and grade-wise fee structure builder (`/fees`).
- School calendar with interactive holiday declaration (`/calendar`).

### 3.3 Real-World Operational Gaps & Friction Points
1. **Dual Representation of Academic Classes:**
   - The system maintains two disconnected representations of classes:
     - `app/models/classroom.py` (`Class` with freeform string `name`, `section`, `department`).
     - `app/models/academic_structure.py` (`Grade`, `Section`, `AcademicYear`, `StudentEnrollment`).
   - Furthermore, `Student.class_name` and `Student.section` are stored as unlinked strings.
   - *Real-World Hazard:* Changing a student's grade in one place does not cleanly synchronize with `StudentEnrollment` or update historical fee ledger mappings.
2. **Section Reassignment / Student Transfer Workflow:**
   - Real schools frequently transfer students between sections (e.g. Grade 10-A to Grade 10-B due to elective subject changes or disciplinary balancing).
   - Currently, there is no formal "Transfer Section" dialog that updates the enrollment record, preserves past attendance taken in Section A, and reassigns class teacher oversight.
3. **Prorated Mid-Year Fee Billing:**
   - When a student is admitted in the second term (e.g. November), the system assigns the standard annual fee structure without automatic monthly proration, requiring manual discount overrides.
4. **Front-Desk Offline Cashier Counter:**
   - Real parents frequently pay fees via Cash, Cheque, or POS Card Swipe at the school accounting window.
   - While `FeePayment` supports cash/cheque in the backend, the Admin Frontend lacks a dedicated "Fee Cashier Counter" interface that prints a standardized paper fee receipt with school seal and signature line.

---

## 4. Teacher Perspective

### 4.1 Core Responsibilities & Workflows
- Daily morning roll-call attendance within a strict 5-minute time window.
- Viewing today's teaching schedule, room numbers, and assigned subjects.
- Reviewing student leave requests and entering teacher remarks.
- Monitoring student attendance anomalies and reporting missing students.
- Recording marks and assessment grades.

### 4.2 Current System Capabilities
- Dedicated teacher dashboard displaying assigned classes and timetable links.
- Class Timetable view (`/my-timetable`) with personal teaching schedule and calendar holiday integration (e.g. Diwali Vacation auto-display).
- Class attendance roll-call interface with Present, Absent, Excused, Late buttons and bulk "Mark All Present" action.
- Class Leave Applications queue (`/leave-requests`) with tabs for Pending, Approved, and Rejected requests.
- Report Missing Student screen (`/report-missing`).

### 4.3 Real-World Operational Gaps & Friction Points
1. **Attendance Lockout & Past-Date Corrections:**
   - Teachers occasionally hit the wrong toggle when marking roll call on a phone or tablet.
   - Once submitted, there is no teacher-facing "Request Attendance Revision" workflow. An accidental absence triggers unjustified parent panic unless corrected immediately.
2. **Substitute Teacher Allocation:**
   - When a colleague is sick, the teacher covering the class has no access to the absent teacher's class roster or attendance register.
   - The master timetable cannot be temporarily assigned to a substitute for a single day without corrupting the permanent weekly timetable.
3. **Assessment & Grading Entry Interface:**
   - While the student portal displays a marks page, there is no teacher interface to enter exam scores, test weights, or grading comments for their assigned classes.

---

## 5. Parent Perspective

### 5.1 Core Responsibilities & Workflows
- Monitoring multiple children across different grade levels from a single login.
- Checking daily attendance presence and receiving prompt absence notices.
- Applying for student leave in advance and monitoring Class Teacher approvals.
- Viewing tuition installment due dates, downloading official payment receipts, and paying online.
- Tracking school calendar events, parent-teacher conferences, and exam dates.

### 5.2 Current System Capabilities
- Multi-child switching tabs (`/children`) displaying child-specific bio, attendance, marks, timetable, assignments, and invoices.
- Multi-child leave applications (`/leaves`) enabling parents to apply on behalf of any enrolled child.
- Parent profile management with editable contact phone and address (`/profile`).
- School announcements feed covering academic conferences, fees, and sports events.

### 5.3 Real-World Operational Gaps & Friction Points
1. **Consolidated Family Fee Payment:**
   - A parent with 3 children currently must review and pay fees through 3 separate disconnected child screens.
   - Real parents expect a single "Pay All Family Dues" option with a consolidated itemized receipt.
2. **Absence Notification Speed:**
   - When a child is marked `ABSENT` during morning roll call, real parents expect an instant automated push notification or SMS alert to confirm safety, rather than waiting to manually check the portal hours later.
3. **Emergency Medical & Guardian Pickup Authorization:**
   - The parent portal lacks an area to record emergency contacts, doctor details, allergy information, or authorized relatives allowed to pick up a primary/nursery child from school.

---

## 6. Student Perspective

### 6.1 Core Responsibilities & Workflows
- Checking daily class schedule, classroom numbers, and teacher names.
- Monitoring cumulative attendance percentage to avoid falling below mandatory thresholds (e.g. 85%).
- Checking term assessment marks, exam grades, and teacher remarks.
- Viewing upcoming school holidays, vacations, and special events.

### 6.2 Current System Capabilities
- Mobile-responsive Student Portal with dark/light mode toggle.
- Personal Dashboard displaying enrollment number (`STU-2026-00001`), Section (10-B), and real-time attendance rate (94.2%).
- Daily schedule and full weekly matrix view with rooms and instructor names (`/timetable`).
- Itemized attendance logs with dates and status badges (`/attendance`).
- Subject-wise grading breakdown with letter grades and pass status (`/marks`).

### 6.3 Real-World Operational Gaps & Friction Points
1. **Homework & Assignment Submission:**
   - The portal navigation references "Assignments", but there is no operational workflow for students to download homework attachments, submit digital assignments, or view teacher grading rubrics.
2. **Upcoming Examination Schedule & Syllabus:**
   - Students cannot view upcoming exam dates, syllabus topics, or exam room seating arrangements.
3. **Offline Schedule Caching (PWA):**
   - Students frequently check their timetable on mobile devices in school corridors with weak cellular data connectivity. The portal lacks Progressive Web App (PWA) offline schedule caching.

---

## 7. Comparative Operational Summary

| Dimension | Real School Requirement | Current System Status | Operational Friction |
| :--- | :--- | :--- | :--- |
| **Admissions** | Mid-year enrollments, prorated fees, document verification | 5-step wizard exists; lacks fee proration & document verification workflow | Medium |
| **Academic Hierarchy** | Unified Grade → Section → Student linkage with historical tracking | Dual representation (`Class` vs `Grade`/`Section`); freeform strings on Student | High |
| **Timetable** | Weekly schedule + Emergency daily teacher substitution | Weekly timetable conflict-free; zero daily substitution mechanism | High |
| **Attendance** | Roll-call + Instant absence alerts + Controlled teacher edit window | Fast roll call works; lacks automated notifications & teacher correction window | High |
| **Exams & Marks** | Term exams, test weightages, teacher grade entry, report card PDFs | Student marks screen is static; zero teacher gradebook or report card generation | Critical |
| **Fees & Payments** | Online gateway + Front-desk Cashier counter + Sibling concessions | Online fees & ledger exist; lacks counter cashier POS screen & family payment | High |
| **Parent Experience** | Multi-child switching + Safety alerts + Emergency contacts | Multi-child tabs work; lacks instant absence alerts & medical pickup data | Medium |

