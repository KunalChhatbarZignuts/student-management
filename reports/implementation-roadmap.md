# Strategic Implementation Roadmap: Phased System Enhancement Plan

**Document Code:** ROADMAP-EXEC-2026-V1  
**Author:** Senior Product Analyst & Technical Delivery Lead  
**System Scope:** Student Management System (Backend + Dual Portals)  
**Date of Delivery:** November 5, 2026  
**Status:** Multi-Phase Architecture & Delivery Sequencing  

---

## 1. Roadmap Architecture & Delivery Principles

To avoid operational disruption and maintain software stability, the implementation roadmap is structured into **5 sequential phases**. Each phase builds strictly on verified technical foundations and follows a disciplined contract:
1. **Zero Database Destruction:** Schema evolutions use additive migrations; legacy columns are gracefully deprecated.
2. **Backward Compatibility:** All existing 99 backend Pytest cases and Vitest frontend test suites must remain green throughout every phase.
3. **User Approval Gates:** No code implementation commences until specifications and interface designs for that specific phase are approved.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Core Foundation & Data Integrity (Weeks 1–2)                            │
│ ├─ Relational Class & Enrollment Unification                                     │
│ ├─ Emergency Medical & Pickup Registry                                           │
│ └─ 30-Minute Teacher Attendance Amendment Window                                 │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Examination, Gradebook & Report Cards (Weeks 3–5)                       │
│ ├─ Exam Terms & Assessment Types Schema                                          │
│ ├─ Teacher Gradebook Score Entry UI                                              │
│ └─ Automated Report Card PDF Generator                                           │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Daily Operations & Financial Counter (Weeks 6–7)                        │
│ ├─ Daily Teacher Substitution Engine                                             │
│ ├─ Front-Desk Cashier Counter POS & Thermal/A4 Receipt Printing                  │
│ └─ Automated Morning Absence Parent Alerts                                       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Lifecycle Automation & Family Experience (Weeks 8–9)                    │
│ ├─ Annual Student Promotion & Rollover Wizard                                    │
│ ├─ Consolidated Family Fee Ledger & Multi-Child Checkout                         │
│ └─ Compensatory Working Day Schedule Remapping                                   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Mobile Resilience & Governance (Weeks 10–11)                            │
│ ├─ PWA Offline Timetable & Profile Caching                                       │
│ ├─ Structured Before/After JSON Audit Log Diffs                                  │
│ └─ Public Admissions Applicant Tracker                                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Execution Plan

### Phase 1: Core Foundation & Data Integrity (Priority: Critical | Complexity: Medium)
*Objective: Unify relational class structures and eliminate latent data desynchronization before layering advanced features.*

- **Deliverables:**
  1. **Schema Migration:** Enforce direct foreign keys on `students` (`current_grade_id`, `current_section_id`) linking to `grades.id` and `sections.id`. Gracefully backfill existing records.
  2. **Section Transfer Workflow:** Create `POST /api/v1/students/{id}/transfer-section` with audit history.
  3. **Emergency Medical Registry:** Add blood group, allergies, emergency contact, and authorized pickup guardians to `students` table and UI.
  4. **Teacher Attendance Grace Period:** Implement 30-minute self-correction window for teachers with mandatory correction remarks.
- **Dependencies:** None. Operates directly on existing database schema.
- **Verification Gate:** Automated unit tests covering section transfer, attendance window enforcement, and foreign key constraints.

---

### Phase 2: Examination, Gradebook & Report Cards (Priority: Critical | Complexity: High)
*Objective: Supply the primary missing academic capability — enabling teachers to record assessment scores and schools to generate verified Report Cards.*

- **Deliverables:**
  1. **Assessment Schema:** Add tables `exam_terms`, `assessment_types`, `grade_scales`, `student_marks`, and `report_cards`.
  2. **Teacher Gradebook Interface:** Build `/my-classes/[id]/gradebook` in Admin Frontend supporting bulk score entry and spreadsheet paste.
  3. **Official Report Card Generator:** Build PDF report card generator displaying school crest, subject scores, GPA, attendance summary, and principal signature block.
  4. **Student & Parent Portal Integration:** Update `/marks` to display official published term results with download link.
- **Dependencies:** Phase 1 (requires unified grade/section and student enrollment IDs).
- **Verification Gate:** Verification of GPA calculation accuracy, boundary test cases for maximum marks, and PDF rendering fidelity.

---

### Phase 3: Daily Operations & Financial Counter (Priority: High | Complexity: Medium)
*Objective: Resolve daily school pain points: managing absent staff coverage and streamlining front-desk fee collections.*

- **Deliverables:**
  1. **Daily Substitution Engine:** Create `daily_schedule_overrides` table; build "Daily Substitution Manager" screen with automated free-teacher detection during matching periods.
  2. **Front-Desk Cashier Counter POS:** Build `/fees/counter` supporting quick student lookup, partial payment allocation, and instant receipt printing.
  3. **Automated Morning Absence Alerts:** Dispatch automated email and in-app alerts to parents when a student is marked unexcused `ABSENT` upon morning roll call lock.
- **Dependencies:** Phase 1 (for teacher timetable and student contact linkages).
- **Verification Gate:** Substitution clash detection testing; thermal/A4 receipt print test; automated notification trigger test.

---

### Phase 4: Lifecycle Automation & Family Experience (Priority: High | Complexity: Medium)
*Objective: Eliminate annual administrative rollover burden and unify the financial experience for multi-child households.*

- **Deliverables:**
  1. **Annual Student Promotion Wizard:** Build `/admin/promotions` supporting bulk grade rollover, retention handling, and section assignments for new academic years.
  2. **Consolidated Family Fee Ledger:** Enable parents to view combined dues across all linked children and execute single-checkout payments.
  3. **Calendar Compensatory Schedule Remapping:** Add `mapped_day_of_week` option when declaring compensatory working Saturdays.
- **Dependencies:** Phase 1 and Phase 2 (for academic year promotion criteria and fee structures).
- **Verification Gate:** Multi-child payment gateway split reconciliation; batch rollover transaction rollback testing.

---

### Phase 5: Mobile Resilience & Governance (Priority: Medium | Complexity: Low)
*Objective: Harden the system for spotty cellular connectivity and provide advanced administrative audit visibility.*

- **Deliverables:**
  1. **PWA Offline Schedule Caching:** Service worker caching for timetable and profile screens on `student-portal`.
  2. **Structured Audit Log Diffs:** Render before/after JSON comparisons in the `/audit-logs` drawer.
  3. **Public Admission Tracker:** Enable prospective parents to track application status via public portal using application token.
- **Dependencies:** None. Can be delivered independently.
- **Verification Gate:** Offline browser simulation; audit diff visual rendering check.

---

## 3. Resource & Dependency Matrix

| Phase | Estimated Sprint Duration | Backend / DB Effort | Frontend Effort | Testing & Verification Effort | Primary Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | 2 Weeks | 40% | 40% | 20% | Backfilling legacy freeform strings without breaking existing enrollments |
| **Phase 2** | 3 Weeks | 35% | 45% | 20% | Handling custom grade boundary scales and rounding rules across departments |
| **Phase 3** | 2 Weeks | 30% | 50% | 20% | Ensuring daily substitution overrides do not corrupt master weekly timetables |
| **Phase 4** | 2 Weeks | 45% | 35% | 20% | Ensuring atomic rollback if bulk promotion encounters an error halfway |
| **Phase 5** | 1.5 Weeks | 20% | 60% | 20% | Service worker cache invalidation when timetable versions are republished |

