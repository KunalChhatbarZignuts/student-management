# Real-World Scenario Analysis: Operational Edge Cases in School Management

**Document Code:** SCENARIO-EVAL-2026-V1  
**Author:** Senior Product Analyst & School Operations Specialist  
**System Scope:** Student Management System (FastAPI + Next.js Admin & Student/Parent Portals)  
**Date of Audit:** November 5, 2026  
**Status:** Complete Scenario Simulation & Stress Analysis  

---

## 1. Scenario Evaluation Matrix (23 Real-World School Situations)

---

### Scenario 1: A Student Joins in the Middle of an Academic Year
1. **How the system handles it today:** Admin completes the New Admission wizard (`/admissions/create`). The student is created with `admission_date = today`. A full-year fee structure is attached to their grade.
2. **Can user complete without assistance?** Partially. Admin can admit the student, but cannot automatically prorate fees.
3. **Difficulties or unnecessary steps:** The student receives invoices for months prior to their admission date (e.g. Terms 1 and 2 if admitted in Term 3). Admin must manually calculate and create negative fee adjustment / concession records.
4. **If user makes a mistake:** The student's ledger displays overdue arrears for periods before enrollment, triggering wrongful debt collection warnings on the parent portal.
5. **Information/feedback needed:** A prompt during admission: *"Student is admitted mid-term (Month 7). Apply automated monthly fee proration? [Yes / No]"*.
6. **Impact on related modules:** Attendance roll-call correctly includes the student from admission date, but academic transcripts lack previous school credit transfer.
7. **Proposed improvement:** Add a "Prorated Billing Policy" engine to `StudentFeeAssignment` that calculates `(Remaining Months / Total Term Months) * Annual Fee`.

---

### Scenario 2: A Student Transfers from One Section to Another (e.g., Grade 10-A to 10-B)
1. **How the system handles it today:** Admin opens the Student edit screen and manually changes the text field `section` from "10-A" to "10-B".
2. **Can user complete without assistance?** Yes, but with latent data inconsistency.
3. **Difficulties or unnecessary steps:** The `StudentEnrollment` table and `academic_structure` relationships are bypassed. Previous daily attendance sessions recorded under Section 10-A remain tied to the student, but Section 10-B's class teacher has no record of the transfer reason or effective date.
4. **If user makes a mistake:** The student appears on both teachers' mental rosters, and old roll numbers conflict in Section 10-B.
5. **Information/feedback needed:** A formal "Transfer Section" dialog capturing Effective Date, New Roll Number, Reason for Transfer, and Class Teacher Acknowledgement.
6. **Impact on related modules:** Section 10-A timetable unlinks; Section 10-B timetable applies; leave requests route to the new Class Teacher.
7. **Proposed improvement:** Create a dedicated `POST /api/v1/students/{id}/transfer-section` endpoint that updates `StudentEnrollment.status = TRANSFERRED`, archives the old enrollment, creates a new enrollment record, and logs an audit trail.

---

### Scenario 3: A Student Changes Grades in a New Academic Year (Annual Promotion)
1. **How the system handles it today:** Admin must manually edit each student record individually or re-seed data. There is no bulk academic promotion wizard.
2. **Can user complete without assistance?** Extremely difficult for 500–1000 students; virtually impossible without manual database scripts.
3. **Difficulties or unnecessary steps:** Editing 76 students one by one takes hours of repetitive manual typing and risks typo errors (e.g. promoting a student to Grade 11 while leaving section as Grade 10).
4. **If user makes a mistake:** Retained students (those who failed or repeated) get accidentally promoted, or students are assigned to non-existent sections.
5. **Information/feedback needed:** A Bulk Academic Promotion Screen: Filter by Grade 9-A -> Display student roster with checkboxes -> Select "Promote to Grade 10-A" or "Retain in Grade 9-A" -> One-click batch execution.
6. **Impact on related modules:** Unlocks new fee structures, updates parent portal view, establishes new student enrollment records for the incoming academic year.
7. **Proposed improvement:** Build an "Annual Student Promotion & Rollover Engine" (`/admin/promotions`) with bulk review, pass/retention criteria, and roll-forward automation.

---

### Scenario 4: A Parent Has Two or More Children in Different Grades
1. **How the system handles it today:** The parent portal (`:3001`) features child switcher tabs on `/children`, `/leaves`, and `/fees`.
2. **Can user complete without assistance?** Yes, navigation between children works smoothly.
3. **Difficulties or unnecessary steps:** Fee payments must be conducted through separate individual transactions per child. Sibling discount policies cannot automatically deduct concessions across linked student IDs.
4. **If user makes a mistake:** Parent pays fees for Child 1 thinking they paid for both children, leaving Child 2 in overdue status.
5. **Information/feedback needed:** A consolidated "Family Ledger" summary: *"Total Family Dues: ₹45,000 (Child A: ₹25,000, Child B: ₹20,000) [Pay Consolidated Bill]"*.
6. **Impact on related modules:** Payment transactions split proportionally across child installment records with distinct receipt numbers.
7. **Proposed improvement:** Implement a Family Payment Aggregator and automatic Sibling Concession rule (e.g., 10% tuition concession applied to the younger sibling).

---

### Scenario 5 & 6: A Teacher is Absent Unexpectedly & A Substitute Needs to Take the Class
1. **How the system handles it today:** When a teacher is absent, the admin can only see their absence. The master timetable remains unchanged. There is no substitute teacher assignment workflow.
2. **Can user complete without assistance?** No. School administrators must manage substitutions on paper slips or whiteboards.
3. **Difficulties or unnecessary steps:** To change who teaches Period 3 on Thursday, admin would have to edit the *permanent master timetable*, which permanently alters every future Thursday!
4. **If user makes a mistake:** The master schedule gets corrupted; teachers forget their original permanent assignments.
5. **Information/feedback needed:** A "Daily Substitution Finder": Admin selects Absent Teacher -> System highlights their scheduled classes for today -> Lists free teachers during each period with matching department -> Admin clicks "Assign Substitute".
6. **Impact on related modules:** Substitute teacher gets temporary read/write access to that class's roll call for that single day; the student portal updates with an informative badge: *"Period 3: Math (Covering: Mrs. Bose)"*.
7. **Proposed improvement:** Create a `daily_schedule_overrides` table and a "Daily Class Substitution" panel in the admin timetable module.

---

### Scenario 7: A Teacher is Assigned to Multiple Grades and Subjects
1. **How the system handles it today:** The timetable engine validates clashes via `UniqueConstraint("teacher_id", "day_of_week", "period_id")` and the "Validate Clashes" button.
2. **Can user complete without assistance?** Yes. Clash detection works cleanly.
3. **Difficulties or unnecessary steps:** The teacher's weekly timetable view displays all periods, but lacks a workload balance indicator (e.g. maximum permissible teaching periods per day).
4. **If user makes a mistake:** The system prevents simultaneous double-bookings, but permits assigning 7 consecutive periods without a break.
5. **Information/feedback needed:** A Faculty Workload Gauge: *"Tarun Singhania: 24/25 periods assigned this week. Consecutive periods: 3 (Warning: exceeds 2 period threshold)"*.
6. **Impact on related modules:** Preserves timetable integrity and prevents faculty exhaustion.
7. **Proposed improvement:** Add daily workload distribution rules to the timetable scheduler.

---

### Scenario 8: A Class Has No Available Subject Teacher
1. **How the system handles it today:** Timetable entries permit `teacher_id = NULL` or empty slots.
2. **Can user complete without assistance?** Yes. Empty periods can be left unallocated or labeled as "Self-Study".
3. **Difficulties or unnecessary steps:** The system does not flag unstaffed core subjects when publishing a timetable.
4. **If user makes a mistake:** A grade's timetable is published missing a mandatory subject (e.g. Grade 10 Science), leaving students unsupervised without admin alert.
5. **Information/feedback needed:** Pre-publish verification warning: *"Grade 10-A has 4 unassigned periods. Mandatory curriculum subject 'Physics' is not fully allocated."*
6. **Impact on related modules:** Prevents regulatory and curriculum compliance gaps.
7. **Proposed improvement:** Add a pre-publishing checklist highlighting unassigned curriculum hours.

---

### Scenario 9: A Timetable Period Needs to be Changed After Publication
1. **How the system handles it today:** Admin changes the grid slot and clicks "Publish". The timetable increments its version (`v1` -> `v2`).
2. **Can user complete without assistance?** Yes. Versioning is natively supported in `timetables` table (`version: Mapped[int]`).
3. **Difficulties or unnecessary steps:** Teachers and students who printed `v1` or rely on memory receive no push notification or in-app notification highlighting *what* changed between `v1` and `v2`.
4. **If user makes a mistake:** Students report to the wrong classroom because they did not know a revision occurred.
5. **Information/feedback needed:** Changelog diff popup upon publish: *"Period 3 swapped from Room 102 to Computer Lab 1. Notify affected students and staff? [Send Notification]"*.
6. **Impact on related modules:** Logs revision in `audit_logs`; notifies parent and student portal feeds.
7. **Proposed improvement:** Add a visual schedule diff viewer and change notification dispatcher upon publishing higher timetable versions.

---

### Scenario 10 & 11: Unexpected Holiday Declared or Holiday Changed to a Working Day
1. **How the system handles it today:** School Calendar (`/calendar`) permits declaring holidays on working days and vice-versa. Attendance sessions and timetables automatically reflect holiday status.
2. **Can user complete without assistance?** Yes, this was verified in manual testing with "Diwali Vacation".
3. **Difficulties or unnecessary steps:** When a holiday is converted to a working day (e.g., a Saturday made working to compensate for a flood day), there is no setting to specify *which weekday's schedule* to follow.
4. **If user makes a mistake:** The system falls back to standard Saturday periods (which are often half-days or sports periods) instead of running the missed Tuesday schedule.
5. **Information/feedback needed:** On compensatory working days, offer a dropdown: *"Follow Timetable of: [Tuesday Schedule]"*.
6. **Impact on related modules:** Automatically shifts room and period allocations for that specific date.
7. **Proposed improvement:** Add `substitute_day_of_week` column to `calendar_days` table.

---

### Scenario 12: Attendance Marked Incorrectly and Needs Correction
1. **How the system handles it today:** Admin attendance API allows updating records, and `attendance_audit_history` captures previous vs. new status. However, teachers cannot correct attendance once submitted.
2. **Can user complete without assistance?** Teachers cannot. They must physically visit or email the school admin.
3. **Difficulties or unnecessary steps:** A minor teacher finger slip (marking a student absent instead of present) generates an official absence on the student's record and locks the teacher out.
4. **If user makes a mistake:** An incorrect absentee record stays in place until an administrator manually intervenes.
5. **Information/feedback needed:** A Teacher "Request Attendance Amendment" button or a 30-minute grace period where teachers can edit their own submission.
6. **Impact on related modules:** Corrects student cumulative rate; sends an automated correction note to parents.
7. **Proposed improvement:** Allow a 30-minute teacher edit window with mandatory remark, followed by an admin approval workflow for past-date changes.

---

### Scenario 13 & 14: Multi-Day Leave Request & Unavailable Class Teacher
1. **How the system handles it today:** Multi-day leave requests work end-to-end (`start_date` to `end_date` with `days_count`). The assigned class teacher reviews the request on `/leave-requests`.
2. **Can user complete without assistance?** Yes, for normal workflow.
3. **Difficulties or unnecessary steps:** If the Class Teacher is sick, on maternity leave, or absent, the leave request sits in `pending` indefinitely.
4. **If user makes a mistake:** Student's multi-day absence goes unapproved and gets marked as unexcused truancy.
5. **Information/feedback needed:** An Admin Leave Override workflow: School Principal or Vice-Principal can view all pending leaves across all grades and approve them on behalf of the absent teacher.
6. **Impact on related modules:** Updates attendance status to `EXCUSED` and notifies student/parent.
7. **Proposed improvement:** Add an "Admin Fallback Approval" button on `/leave-monitoring` for any request pending over 48 hours.

---

### Scenario 15: A Student is Admitted with a Fee Concession (Scholarship / Sibling Discount)
1. **How the system handles it today:** Backend has `FeeConcession` model. Admin can assign concessions to fee assignments.
2. **Can user complete without assistance?** Backend supports it, but Admin Frontend lacks a dedicated "Manage Scholarships & Concessions" UI.
3. **Difficulties or unnecessary steps:** Admin must manually calculate net figures or apply custom discounts without a documented concession category (e.g., "Sports Scholarship - 25% Tuition Waiver").
4. **If user makes a mistake:** Accounting audits fail because discretionary discounts lack category tags or approving authority notes.
5. **Information/feedback needed:** A structured Concession Category Catalog (Merit, Staff Child, Sibling, EWS/Financial Aid) with approval documentation upload.
6. **Impact on related modules:** Deducts strictly from tuition component, leaving mandatory lab/library fees intact.
7. **Proposed improvement:** Expose a standardized Concession Management interface in `/fees`.

---

### Scenario 16 & 17: Partial Fee Payments & Failed / Erroneous Payment Records
1. **How the system handles it today:** `FeePayment` records amount, installment ID, and payment method. `PaymentWebhookEvent` handles Razorpay gateway callbacks.
2. **Can user complete without assistance?** Online payment gateway works. Manual partial payments require careful installment assignment.
3. **Difficulties or unnecessary steps:** If a parent pays ₹10,000 towards a ₹15,000 installment, the remaining ₹5,000 balance remains open, but the receipt only shows the partial payment. If a transaction is duplicated, admin cannot void or refund with a single button.
4. **If user makes a mistake:** A duplicated payment artificially inflates the school ledger and requires manual database correction.
5. **Information/feedback needed:** "Void / Refund Payment" action with mandatory reason, restoring installment balance automatically and logging to audit trail.
6. **Impact on related modules:** Adjusts student ledger, updates parent portal outstanding balance, records audit entry.
7. **Proposed improvement:** Add an explicit "Void Payment & Reopen Installment" workflow with supervisor PIN / authorization.

---

### Scenario 18: A Student Leaves the School with Outstanding Fees (Transfer Certificate / TC)
1. **How the system handles it today:** Student status can be set to `left` or `transferred` in `students` table.
2. **Can user complete without assistance?** Yes, by editing student status.
3. **Difficulties or unnecessary steps:** The system does not perform a "Clearance Check" before deactivating the student. A student can be marked `left` even if they owe ₹50,000 in unpaid tuition or hold unreturned library books.
4. **If user makes a mistake:** School suffers unrecoverable revenue loss because Transfer Certificates are issued before dues are cleared.
5. **Information/feedback needed:** A Transfer Certificate (TC) & Clearance Workflow: Verifies Fee Dues == ₹0, Library Clearance == Approved, Laboratory Clearance == Approved before generating the official TC.
6. **Impact on related modules:** Deactivates student account, unlinks active parent invitations, closes open fee ledger.
7. **Proposed improvement:** Build a formal "Student Exit & Transfer Certificate (TC)" module.

---

### Scenario 19: A Teacher Changes Employment Status (Resignation / Termination)
1. **How the system handles it today:** Teacher status can be set to `inactive`.
2. **Can user complete without assistance?** Partially. Admin can deactivate the user account.
3. **Difficulties or unnecessary steps:** Deactivating a teacher who is actively assigned as a Class Teacher or Subject Teacher creates orphaned assignments across active timetables and leave request workflows.
4. **If user makes a mistake:** Sections lose their class teacher, leave requests freeze, and timetable slots show invalid teacher references.
5. **Information/feedback needed:** A Teacher Offboarding Handover Wizard: *"Teacher Alan Turing is currently Class Teacher of 10-A and teaches 18 periods of Computer Science. Select replacement faculty for: [Class Teacher], [Timetable Periods]"*.
6. **Impact on related modules:** Reassigns all classes and periods atomically before deactivation.
7. **Proposed improvement:** Add a Teacher Offboarding Reassignment Wizard.

---

### Scenario 20: An Administrator Accidentally Enters Incorrect Information
1. **How the system handles it today:** Edit screens permit updating records. Sensitive operations are recorded in `audit_logs`.
2. **Can user complete without assistance?** Yes, for editable fields.
3. **Difficulties or unnecessary steps:** There is no "Undo" or "Restore Historical Version" button. Admin must manually re-type previous values from memory or consult audit logs.
4. **If user makes a mistake:** Subtle typos in DOB, student code, or guardian phone go unnoticed until examinations or emergency calls fail.
5. **Information/feedback needed:** Field-level change preview: *"Changing Date of Birth from 2008-12-10 to 2008-10-12. Confirm change? [Confirm]"*.
6. **Impact on related modules:** Updates audit logs with before/after diffs.
7. **Proposed improvement:** Store structured JSON before/after snapshots in `audit_logs` and display revision history on student and faculty detail pages.

---

### Scenario 21: A User Loses Access to an Account or Changes Contact Information
1. **How the system handles it today:** Password reset tokens (`/reset-password`, `/forgot-password`) exist. Admin can trigger invites and reset passwords.
2. **Can user complete without assistance?** Parents and students can use forgot password if email is working. If email changed, admin must update it.
3. **Difficulties or unnecessary steps:** Real students and younger children often do not have active personal email addresses; they rely on Student ID + School PIN or Parent phone OTP.
4. **If user makes a mistake:** Account lockouts occur after consecutive failed attempts.
5. **Information/feedback needed:** One-click Admin "Generate Temporary PIN & Reset Link" action to help parents and students on the spot at the front office.
6. **Impact on related modules:** Invalidates prior refresh tokens and issues secure single-use credentials.
7. **Proposed improvement:** Add a Quick Credential Recovery tool in the Admin User Management screen.

---

### Scenario 22: Multiple Administrators Update the Same Record Simultaneously
1. **How the system handles it today:** Standard database updates without optimistic concurrency locks (`version_id`). Last write wins.
2. **Can user complete without assistance?** Silent overwrite occurs.
3. **Difficulties or unnecessary steps:** If Admin A is editing fees while Admin B is updating parent contact info on the same student, Admin B's submit might overwrite Admin A's changes depending on the payload.
4. **If user makes a mistake:** Silent loss of updated data without warning.
5. **Information/feedback needed:** Optimistic locking warning: *"This record was modified by admin_b@school.edu at 14:32. Please refresh before saving."*
6. **Impact on related modules:** Prevents race conditions and unintended overwrites.
7. **Proposed improvement:** Introduce `version_id` / `updated_at` check on critical administrative updates.

---

### Scenario 23: A User Has a Slow Internet Connection or Uses a Small Mobile Screen
1. **How the system handles it today:** Pages are responsive, and data grids adapt to mobile screens.
2. **Can user complete without assistance?** Yes, mobile views render cleanly.
3. **Difficulties or unnecessary steps:** Heavy client-side bundles and full API refetches on slow 3G cellular connections can cause sluggish table rendering. If offline, the student cannot view today's timetable.
4. **If user makes a mistake:** Frustrated users tap submit multiple times, risking duplicate submissions if buttons lack debouncing.
5. **Information/feedback needed:** Client-side button disabling during in-flight mutations (which was verified to work properly on login) extended to all forms. Service worker caching for timetable and profile.
6. **Impact on related modules:** Reduces server load and improves mobile reliability.
7. **Proposed improvement:** Add Service Worker / PWA caching for offline timetable and attendance reading on the Student Portal.

