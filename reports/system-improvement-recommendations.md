# System Improvement Recommendations: Prioritized Backlog & Technical Blueprint

**Document Code:** REC-IMPROVE-2026-V1  
**Author:** Senior Product Analyst & Software Architect  
**System Scope:** Student Management System (FastAPI + Next.js Admin & Student/Parent Portals)  
**Date of Assessment:** November 5, 2026  
**Status:** Comprehensive Improvement Proposal  

---

## 1. Prioritization Taxonomy

All recommendations are classified into four impact tiers:
- **CRITICAL:** Prevents financial errors, severe data corruption, unauthorized access, or complete operational failure in daily school management.
- **HIGH:** Dramatically streamlines daily school administrative operations, eliminates major manual friction, or delivers core missing school capabilities.
- **MEDIUM:** Enhances user efficiency, reduces data entry mistakes, improves communication clarity, and delivers better user experience.
- **LOW:** Visual refinements, convenient shortcuts, and optional quality-of-life enhancements.

---

## 2. Comprehensive Recommendations Catalog

---

### REC-01 [CRITICAL]: Unified Examination, Assessment & Report Card Engine

- **Classification:** Missing Core Feature / Business-Rule & Academic Architecture
- **Current Behavior:** The student portal has a static `/marks` page. The backend has no database models for exams, terms, assessment types, grade scales, or report cards.
- **User Problem:** Teachers cannot enter test or exam marks into the system. Schools cannot calculate term grades, GPA, or class ranks, and cannot generate printed or digital Report Cards for parents.
- **Real-World Example:** End of Term 1 arrives. Teachers must calculate scores on external Excel sheets and manually print paper report cards outside the software. Parents cannot see official verified marks or teacher qualitative comments on the portal.
- **Proposed Improvement:**
  1. Create database models: `ExamTerm` (Term 1, Term 2), `AssessmentType` (Unit Test 20%, Mid-Term 30%, Final Exam 50%), `GradeScale` (A1: 91–100, A2: 81–90, etc.), `StudentMark`, and `ReportCard`.
  2. Build a Teacher Gradebook entry screen (`/my-classes/[id]/grades`) with bulk score entry, spreadsheet copy-paste support, and validation against maximum marks.
  3. Build an automated Report Card PDF generator with school crest, grading legend, teacher signature block, and student attendance summary.
- **Expected User Experience:**
  1. Admin sets up Term 1 with assessment weightages (Mid-Term: 40, Finals: 60).
  2. Teacher opens their class gradebook on the portal, enters scores for their subject, and clicks "Submit for Verification".
  3. Principal verifies scores and clicks "Publish Report Cards".
  4. Parents and students instantly see the verified grades and can download the official signed PDF report card.
- **Affected Modules:** Academics, Teacher Portal, Student Portal, Parent Portal.
- **Affected Roles:** Super Admin, Admin, Teacher, Student, Parent.
- **Technical Impact:**
  - Database: Add 5 new tables (`exam_terms`, `assessment_types`, `grade_scales`, `student_marks`, `report_cards`).
  - Backend: REST endpoints in `app/api/v1/exams.py` and `app/api/v1/report_cards.py`.
  - Frontend: New Gradebook entry component in `admin-frontend` and enhanced marks view in `student-portal`.
- **Priority & Complexity:** **CRITICAL** | Complexity: **High**

---

### REC-02 [CRITICAL]: Unified Academic Class & Student Enrollment Linkage

- **Classification:** Architectural & Data Consistency Improvement
- **Current Behavior:** `Student.class_name` and `Student.section` are stored as freeform text strings in `students` table, while `academic_structure.py` contains formal `Grade` and `Section` entities with `StudentEnrollment`.
- **User Problem:** When a student's grade or section is updated, it creates desynchronization between freeform text fields and relational enrollment records, breaking timetable assignments, attendance roll calls, and fee assignments.
- **Real-World Example:** An admin corrects a student's section from "10-A" to "10-B" in the student profile edit screen. The student still appears on Section 10-A's attendance sheet because the relational `student_enrollments` record was not updated.
- **Proposed Improvement:**
  1. Deprecate freeform string columns `class_name` and `section` on the `students` table.
  2. Enforce foreign keys `current_grade_id` and `current_section_id` linking directly to `grades.id` and `sections.id`.
  3. Require all section changes to proceed through a formal `POST /api/v1/students/{id}/transfer-section` endpoint that updates the relational enrollment record and maintains historical continuity.
- **Expected User Experience:**
  1. In the Student Details screen, the admin clicks "Transfer / Reassign Section".
  2. A modal prompts for Target Section, Effective Date, and Transfer Reason.
  3. The system confirms no fee or attendance conflicts, transfers the student cleanly, and logs the change in the audit trail.
- **Affected Modules:** Student Management, Attendance, Timetable, Fees.
- **Affected Roles:** Admin, Teacher.
- **Technical Impact:**
  - Database: Foreign key constraints on `students` table; migration script to backfill existing records.
  - Backend: Validation in `student_service.py` to prevent orphaned enrollment states.
  - Frontend: Dropdown-based grade/section pickers replacing text inputs across all forms.
- **Priority & Complexity:** **CRITICAL** | Complexity: **Medium**

---

### REC-03 [HIGH]: Daily Teacher Substitution & Emergency Class Coverage Engine

- **Classification:** Missing Core Feature / Operational Timetable Workflow
- **Current Behavior:** Timetables are strictly master-weekly (`timetables` and `timetable_entries`). When a teacher calls in sick, there is no way to assign a substitute teacher for that single day without permanently editing the master weekly timetable.
- **User Problem:** School administrators must manage daily substitutions using physical slips or phone calls. Substitute teachers have no access to the class roster, and students have no idea who is teaching their period.
- **Real-World Example:** Mr. Ravi Kumar (English, Grade 10-B) falls ill on Wednesday morning. The Vice-Principal must urgently find an available teacher for Period 2. Currently, the system provides zero assistance, and the master timetable cannot be touched.
- **Proposed Improvement:**
  1. Create a `daily_schedule_overrides` table (`id`, `date`, `timetable_entry_id`, `original_teacher_id`, `substitute_teacher_id`, `status`, `remarks`).
  2. Build a "Daily Substitution Manager" screen in Admin Timetable module:
     - Select date -> System lists absent teachers -> Shows their scheduled classes -> Automatically identifies available teachers with matching subject competence who have a free period.
     - One-click "Assign Substitute" action.
  3. Update Teacher and Student portals to display the daily substitution banner for that date only.
- **Expected User Experience:**
  1. Teacher files unplanned absence or Admin marks teacher absent on `/attendance`.
  2. Substitution Manager flags 4 unstaffed periods for today.
  3. For Period 2, the system lists 3 teachers who are currently free.
  4. Admin selects Mrs. Deepa Menon and clicks "Assign".
  5. Mrs. Menon's teacher portal immediately updates with temporary roll-call access for Grade 10-B Period 2.
- **Affected Modules:** Timetable, Teacher Portal, Student Portal, Attendance.
- **Affected Roles:** Admin, Teacher, Student.
- **Technical Impact:**
  - Database: New table `daily_schedule_overrides`.
  - Backend: Endpoints in `app/api/v1/timetables.py` for query overrides by date.
  - Frontend: Interactive substitution matrix in Admin Portal and badges in Student Portal.
- **Priority & Complexity:** **HIGH** | Complexity: **Medium**

---

### REC-04 [HIGH]: Front-Desk Cashier Counter POS & Itemized Receipt Printing

- **Classification:** Existing Feature Requiring Workflow Improvement
- **Current Behavior:** `FeePayment` records transactions in the database, but there is no dedicated Front-Desk Cashier Counter interface to accept in-person cash, cheque, or bank drafts with instant printable official fee receipts.
- **User Problem:** Parents queuing at the school accounts window must wait while staff navigate multiple complex screens to record a payment, and the software cannot produce a print-ready school fee receipt.
- **Real-World Example:** A parent arrives with ₹15,000 cash to pay their child's tuition installment. The accountant needs to select the student, collect the cash, allocate it to Term 1 tuition, and print an official receipt with school seal and signature line in under 60 seconds.
- **Proposed Improvement:**
  1. Build a "Fee Counter Cashiering Screen" (`/fees/counter`):
     - Quick student search by enrollment number or barcode.
     - Displays outstanding installments with checkboxes.
     - Supports Partial Payment (allocates amount across oldest overdue installments first).
     - Records payment method (Cash, Cheque # + Bank, DD, Card Swipe).
     - Instant modal preview with 1-click "Print Official Receipt" (standard A4 / thermal format).
- **Expected User Experience:**
  1. Accountant types `STU-2026-00001` -> Student info and ₹15,000 due appears.
  2. Accountant enters ₹15,000 cash received -> clicks "Process Payment & Print".
  3. Thermal or A4 receipt prints with Receipt Number, Student Name, Grade, Date, Itemized Breakdown, and Balance Due: ₹0.
- **Affected Modules:** Fee Management, Admin Portal, Audit Logs.
- **Affected Roles:** Admin (Accountant), Parent.
- **Technical Impact:**
  - Backend: Endpoint `POST /api/v1/fees/counter-payment` supporting partial installment allocation.
  - Frontend: Cashier POS screen and print stylesheet in `admin-frontend/src/features/fees`.
- **Priority & Complexity:** **HIGH** | Complexity: **Medium**

---

### REC-05 [HIGH]: Automated Multi-Channel Absence & Emergency Alert System

- **Classification:** Missing Core Feature / Parent Safety Communication
- **Current Behavior:** Attendance status is saved to the database. Parents only discover their child was marked absent if they proactively log into the portal.
- **User Problem:** If a child encounters an emergency on the way to school and does not arrive, parents receive no timely alert, creating serious child safety risks.
- **Real-World Example:** An 8th-grade student leaves home for school but does not arrive. The teacher marks the student `ABSENT` at 08:45 AM. The parents assume the child is in class until late afternoon because no automated notification was dispatched.
- **Proposed Improvement:**
  1. Implement an automated post-roll-call notification dispatcher.
  2. When a morning roll call is locked/submitted, any student with status `ABSENT` (and no pre-approved leave) triggers an automated notification (Email + In-App Notification + SMS/WhatsApp webhook stub).
  3. Parent receives immediate notification: *"Attendance Alert: [Student Name] was marked Absent on [Date] for morning roll call. If this is an error, please contact school office."*
- **Expected User Experience:**
  1. Teacher completes roll call and clicks "Submit Attendance".
  2. System shows summary: *"Roll call submitted: 28 Present, 2 Absent. 2 parent absence notifications queued for dispatch."*
  3. Parents receive notification within 2 minutes.
- **Affected Modules:** Attendance, Parent Portal, Notifications, Background Workers.
- **Affected Roles:** Admin, Teacher, Parent.
- **Technical Impact:**
  - Backend: Background event handler triggered on attendance session submission.
  - Integrations: SMS / Email webhook templates.
- **Priority & Complexity:** **HIGH** | Complexity: **Medium**

---

### REC-06 [HIGH]: Annual Student Promotion, Graduation & Rollover Wizard

- **Classification:** Missing Core Feature / Annual Academic Lifecycle
- **Current Behavior:** Moving students from Grade 1 to Grade 2 at the start of a new school year requires manual database updates or editing individual student profiles one by one.
- **User Problem:** At the start of every academic year, school administrators face a catastrophic manual workload attempting to re-enroll hundreds of continuing students into their next grade level.
- **Real-World Example:** The school year 2026-2027 concludes. 500 students must be promoted to the 2027-2028 academic year. Grade 12 students must be graduated/archived, and students who failed must be retained in their current grade.
- **Proposed Improvement:**
  1. Build an "Annual Student Promotion & Rollover Wizard" (`/admin/promotions`):
     - Step 1: Select Source Academic Year (`2026-2027`) and Target Academic Year (`2027-2028`).
     - Step 2: Select Grade (e.g. Grade 9-A) -> Roster loads with checkboxes and promotion status (Promoted to 10-A, Retained in 9-A, Withdrawn).
     - Step 3: Preview new section allocations and fee structure assignments.
     - Step 4: Execute Batch Rollover atomically inside a database transaction.
- **Expected User Experience:**
  1. Admin selects Grade 10 -> System pre-selects all passing students for Grade 11.
  2. Admin adjusts 2 retained students to repeat Grade 10.
  3. Admin clicks "Execute Promotion".
  4. System creates new `StudentEnrollment` records in `2027-2028` and archives old enrollments.
- **Affected Modules:** Academic Structure, Student Management, Admissions, Fees.
- **Affected Roles:** Super Admin, Admin.
- **Technical Impact:**
  - Backend: Bulk transaction service in `app/services/promotion_service.py`.
  - Frontend: Multi-step promotion wizard in `admin-frontend`.
- **Priority & Complexity:** **HIGH** | Complexity: **Medium**

---

### REC-07 [MEDIUM]: Teacher Attendance Revision Window & Audit Correction Workflow

- **Classification:** Business-Rule & Usability Improvement
- **Current Behavior:** Once an attendance session is submitted, it is locked. Teachers cannot modify mistaken entries without administrative database intervention.
- **User Problem:** Accidental mis-clicks on mobile devices permanently lock incorrect attendance states, leading to parent complaints and inaccurate records.
- **Real-World Example:** A teacher accidentally marks a student `ABSENT` instead of `PRESENT`. The teacher notices the error 5 minutes later, but the submit button is locked.
- **Proposed Improvement:**
  1. Introduce a configurable "Teacher Amendment Grace Period" (default: 30 minutes after initial submission).
  2. Within 30 minutes, the teacher can edit their own roll call with a mandatory "Correction Remark".
  3. After 30 minutes, the session is strictly locked, and any past-date modification requires an "Admin Attendance Amendment Request" with formal audit logging in `attendance_audit_history`.
- **Expected User Experience:**
  1. Teacher clicks on submitted roll call within 30 minutes.
  2. A banner displays: *"Attendance submitted 6 minutes ago. You may correct records for another 24 minutes."*
  3. Teacher changes status to `PRESENT`, types remark *"Corrected typo"*, and saves.
- **Affected Modules:** Attendance, Teacher Portal, Audit Trail.
- **Affected Roles:** Teacher, Admin, Parent.
- **Technical Impact:**
  - Backend: Time-window logic in `attendance_service.py` checking `locked_at + timedelta(minutes=30)`.
  - Frontend: Editable view with timer indicator on `admin-frontend/src/app/attendance`.
- **Priority & Complexity:** **MEDIUM** | Complexity: **Low**

---

### REC-08 [MEDIUM]: Consolidated Family Fee Ledger & Multi-Child Payment

- **Classification:** Parent Portal UX & Financial Accounting Improvement
- **Current Behavior:** Parents with multiple children must view and pay fees across separate, independent child screens.
- **User Problem:** Parents with 2 or 3 enrolled children must initiate multiple credit card or bank payments, paying extra transaction fees and increasing the risk of missing a sibling's installment.
- **Real-World Example:** Lord Byron has 4 children in the school. He currently has to complete 4 separate payment transactions across 4 tabs to settle the term fees.
- **Proposed Improvement:**
  1. Create a "Family Fee Summary" tab in the Parent Portal:
     - Aggregates all open installments across all linked children.
     - Offers a single "Pay Combined Family Balance" button.
  2. Backend splits the single gateway order across the respective child installment records upon successful webhook confirmation.
- **Expected User Experience:**
  1. Parent navigates to `/fees` on Student Portal.
  2. Screen shows: *"Family Summary: 4 Children. Total Dues: ₹42,500"*.
  3. Parent clicks "Pay Entire Family Bill", enters payment once, and receives an itemized family receipt.
- **Affected Modules:** Fees, Parent Portal, Payment Gateway.
- **Affected Roles:** Parent, Admin (Accountant).
- **Technical Impact:**
  - Backend: Composite payment transaction handler in `app/services/fee_service.py`.
  - Frontend: Family fee overview card in `student-portal/src/app/fees`.
- **Priority & Complexity:** **MEDIUM** | Complexity: **Medium**

---

### REC-09 [MEDIUM]: Emergency Medical, Allergy & Authorized Pickup Registry

- **Classification:** Missing Student Safety Feature
- **Current Behavior:** `Student` model stores basic contact info (phone, address, guardian name) but lacks health, allergy, emergency doctor, and authorized guardian pickup information.
- **User Problem:** In nursery and primary schools, teachers and nurses have no quick way to look up student allergies, dietary restrictions, or verify if an adult arriving at the school gate is authorized to collect the child.
- **Real-World Example:** A 1st-grade student suffers a severe peanut allergy reaction during lunch. The teacher needs immediate access to emergency medical info and pediatrician phone numbers.
- **Proposed Improvement:**
  1. Add medical and emergency pickup fields to `Student` and `StudentProfile`:
     - Blood Group, Known Allergies, Chronic Conditions, Emergency Doctor Name & Phone.
     - Authorized Pickup Persons (Name, Photo, Relation, Phone).
  2. Display an "Emergency & Medical Card" badge on the student detail view and teacher class roster.
- **Expected User Experience:**
  1. Teacher taps student name on class roster -> Emergency health badge displays *"Allergic to Peanuts; Epipen in Nurse Office"*.
  2. Gate security or front desk can verify authorized pickup guardians directly on the portal.
- **Affected Modules:** Student Management, Admissions, Teacher Portal, Parent Portal.
- **Affected Roles:** Admin, Teacher, Parent.
- **Technical Impact:**
  - Database: Add medical and pickup columns to `students` table.
  - Frontend: Emergency tab in student profile and quick badge on teacher rosters.
- **Priority & Complexity:** **MEDIUM** | Complexity: **Low**

---

### REC-10 [MEDIUM]: Compensatory Working Day Schedule Remapping

- **Classification:** School Calendar & Timetable Operational Feature
- **Current Behavior:** Converting a Saturday into a working day defaults to Saturday's standard period timings, which are often sports or half-days.
- **User Problem:** When a school loses a Tuesday to heavy rains or an unexpected civic holiday, the school typically runs "Tuesday's schedule on Saturday" to ensure core curriculum hours are balanced.
- **Real-World Example:** Tuesday was declared an unexpected storm holiday. The school declares Saturday, November 14 as a compensatory working day. Currently, the system has no way to tell teachers and students to bring their Tuesday books and follow Tuesday's timetable.
- **Proposed Improvement:**
  1. In the School Calendar holiday declaration dialog, when marking a non-working day as "Special Working Day", provide an option: *"Timetable to Follow: [Default / Follow Monday / Follow Tuesday / ...]"*.
  2. Teacher and student timetable portals dynamically render that specific weekday's periods for that calendar date.
- **Expected User Experience:**
  1. Admin opens `/calendar`, clicks Saturday, selects "Convert to Special Working Day".
  2. Selects "Follow Tuesday Timetable".
  3. All teacher and student portals display Saturday with Tuesday's periods and classes.
- **Affected Modules:** Calendar, Timetable, Teacher Portal, Student Portal.
- **Affected Roles:** Admin, Teacher, Student, Parent.
- **Technical Impact:**
  - Database: Add `mapped_day_of_week` column to `calendar_days`.
  - Backend: Timetable resolution query checks `mapped_day_of_week` when resolving date schedules.
- **Priority & Complexity:** **MEDIUM** | Complexity: **Low**

