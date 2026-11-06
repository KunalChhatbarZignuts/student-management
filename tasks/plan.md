# Implementation Plan: Examination & Report Card Management System

## Goal Description
Implement a complete, offline-first **Examination & Report Card Management System** within the existing Student Management platform. 
Examinations are conducted physically at school. The software platform facilitates:
1. **Administrative Setup & Scheduling:** Exam terms, types, subject schedules with conflict validation, and result publication controls.
2. **Class Teacher Conduction & Marks Entry:** Strict class-teacher RBAC authorization, offline conduction logging, marks entry with draft saves, and automatic grade/result calculation.
3. **Student & Parent Portals:** Offline exam timetable/calendar views, schedule reminders, published marks breakdown, and official downloadable Report Card PDFs.
4. **Auditability & Privacy:** Zero leakage of draft/unpublished results, immutability of published records, and comprehensive audit history.

---

## User Review Required

> [!IMPORTANT]
> **Key Architecture Decisions Requiring Confirmation:**
> 1. **PDF Generation Method:** We propose using **`reportlab`** on the FastAPI backend to generate crisp, standard A4 PDF documents with school branding, tables, signatures, and tamper-evident layouts that can be directly downloaded or printed on mobile and desktop.
> 2. **Teacher Workspace:** Teachers currently access their classes and attendance within `admin-frontend` using their role permissions. We propose housing Teacher Examination Management under `/my-examinations` in `admin-frontend` for a unified staff workspace.
> 3. **Absentee Grading Policy:** When a student is marked "Absent" for an exam, they should receive an `ABSENT` status with 0 points scored, an "AB" grade on the report card, and fail/re-exam flag without corrupting numerical percentage denominators.

---

## 1. Existing Project Architecture & Reusable Components

The existing system possesses well-structured relational foundations that we will directly leverage:

| Existing Entity | Model File | Reusable Purpose in Examination Module |
|---|---|---|
| `AcademicYear` | `app/models/academic_structure.py` | Links examinations to academic sessions (e.g. `2026-2027`). |
| `Grade` & `Section` | `app/models/academic_structure.py` | Scopes exams and schedules to specific grades and sections. |
| `Subject` | `app/models/classroom.py` | Curriculum subjects being evaluated. |
| `StudentEnrollment` | `app/models/academic_structure.py` | Active student roster per section, providing roll numbers and names. |
| `TeacherAssignment` | `app/models/classroom.py` | Verifies Class Teacher authorization (`is_class_teacher=True`, `is_active=True`, `section_id`). |
| `ParentStudentLink` | `app/models/parent.py` | Enforces parent-child data isolation for results viewing. |
| `SchoolHoliday` & `Calendar` | `app/models/calendar.py` | Validates exam dates to avoid scheduling on declared school holidays. |
| `AuditLog` | `app/models/audit_log.py` | Audits marks submission, modifications, and publication events. |

---

## 2. Examination Workflow Specification

```mermaid
sequenceDiagram
    autonumber
    actor Admin as School Admin
    actor Teacher as Assigned Class Teacher
    actor Student as Student / Parent
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL Database

    Admin->>Backend: Create Examination (e.g., Unit Test 1, Term 1)
    Admin->>Backend: Create Subject Schedules per Grade/Section with Date, Time, Max/Pass Marks
    Backend->>DB: Validate conflicts (holiday, duplicate slot) & Save
    Note over Admin,Teacher: Physical Exam Conducted Offline at School
    Teacher->>Backend: View Assigned Class Exam Schedule
    Teacher->>Backend: Enter Marks / Mark Absentees (Save Draft)
    Backend->>DB: Save draft marks with auto-calculated percentage & grade
    Teacher->>Backend: Submit Marks for Review
    Backend->>DB: Lock marks from teacher editing; status = SUBMITTED
    Admin->>Backend: Review Section Marks & Performance Summary
    Admin->>Backend: Publish Results
    Backend->>DB: Set status = PUBLISHED; generate notifications
    Student->>Backend: View Published Results & Grades
    Student->>Backend: Download Official Report Card PDF
    Backend-->>Student: Stream Report Card PDF
```

---

## 3. Role and Permission Matrix

| Operation | Super Admin | Admin | Class Teacher | Subject Teacher (Non-Class) | Student | Parent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Create/Edit/Delete Examination** | Yes | Yes | No | No | No | No |
| **Schedule Subject Exam & Timings** | Yes | Yes | No | No | No | No |
| **Configure Grading Scales** | Yes | Yes | No | No | No | No |
| **View Exam Schedules** | All | All | Assigned Classes | Assigned Subjects | Own Class | Linked Children |
| **Enter / Edit Draft Marks** | No | No | **Assigned Class Only** | No | No | No |
| **Mark Student Absent for Exam** | No | No | **Assigned Class Only** | No | No | No |
| **Submit Class Results** | No | No | **Assigned Class Only** | No | No | No |
| **Review & Publish Results** | Yes | Yes | No | No | No | No |
| **View Published Marks & Grades** | Yes | Yes | Yes | Yes | **Own Only** | **Linked Children Only**|
| **View Draft / Unpublished Marks** | Yes (Monitoring) | Yes (Monitoring) | Assigned Class | No | **Forbidden (403)** | **Forbidden (403)** |
| **Download Official Report Card PDF**| Yes | Yes | Assigned Class | No | **Own Published Only** | **Linked Children Published Only** |

---

## 4. Proposed Database Schema

### A. New Models in `app/models/examination.py`

```python
class ExamType(str, enum.Enum):
    UNIT_TEST = "UNIT_TEST"
    MID_TERM = "MID_TERM"
    FINAL = "FINAL"
    QUARTERLY = "QUARTERLY"
    PRACTICAL = "PRACTICAL"

class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MarksStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    PUBLISHED = "PUBLISHED"
```

1. **`GradingScale` (`grading_scales`):**
   - `id`, `name` (e.g. "Standard 10-Point Scale"), `min_percentage`, `max_percentage`, `grade` (A+, A, B, etc.), `grade_point`, `description`, `is_passing`.
2. **`Examination` (`examinations`):**
   - `id`, `name` (e.g. "Mid-Term Examination 2026"), `exam_type`, `academic_year_id`, `term` (e.g. "Term 1"), `description`, `start_date`, `end_date`, `status`, `grading_scale_id`.
3. **`ExaminationSchedule` (`examination_schedules`):**
   - `id`, `examination_id`, `grade_id`, `section_id`, `subject_id`, `exam_date`, `start_time`, `end_time`, `max_marks`, `pass_marks`, `room_number`, `instructions`, `status`.
   - *Constraints:* Unique `(examination_id, section_id, subject_id)` to prevent duplicate exam slots; date checked against `SchoolHoliday`.
4. **`StudentExamMark` (`student_exam_marks`):**
   - `id`, `schedule_id`, `student_id`, `marks_obtained` (Float/Decimal, nullable for absent), `is_absent` (Boolean), `grade` (String), `is_passed` (Boolean), `remarks` (String), `status` (`DRAFT`, `SUBMITTED`, `PUBLISHED`).
   - *Constraints:* Unique `(schedule_id, student_id)`.
5. **`StudentExamResult` (`student_exam_results`):**
   - `id`, `examination_id`, `student_id`, `grade_id`, `section_id`, `total_max_marks`, `total_obtained_marks`, `percentage`, `overall_grade`, `overall_result` (PASS, FAIL, ABSENT, WITHHELD), `teacher_remarks`, `status` (`DRAFT`, `SUBMITTED`, `PUBLISHED`), `published_at`, `published_by_user_id`.
6. **`ExaminationNotification` (`examination_notifications`):**
   - `id`, `user_id`, `student_id`, `title`, `message`, `event_type` (`SCHEDULED`, `RESCHEDULED`, `PUBLISHED`), `is_read`, `created_at`.

---

## 5. Proposed API Endpoints

### Admin Endpoints (`/api/v1/admin/examinations`)
- `GET /examinations` — List exams with metrics (total, upcoming, ongoing, published) & filters.
- `POST /examinations` — Create new examination.
- `GET /examinations/{id}` — Examination details with schedule summary & grade breakdown.
- `PUT /examinations/{id}` — Update examination parameters.
- `POST /examinations/{id}/schedules` — Add subject schedule slot with clash validation.
- `PUT /examinations/{id}/schedules/{schedule_id}` — Edit schedule slot.
- `DELETE /examinations/{id}/schedules/{schedule_id}` — Remove schedule slot.
- `GET /examinations/{id}/results` — Section-wise marks submission progress and performance.
- `POST /examinations/{id}/results/publish` — Publish results for whole exam or specific section.
- `POST /examinations/{id}/results/unpublish` — Revert to draft (with audit remark).
- `GET /admin/grading-scales` & `POST /admin/grading-scales` — Manage configurable grading scales.

### Class Teacher Endpoints (`/api/v1/teacher/examinations`)
- `GET /teacher/examinations` — List exams for assigned class/section.
- `GET /teacher/examinations/schedules/{schedule_id}/roster` — Student roster for marks entry (includes existing marks if saved).
- `POST /teacher/examinations/schedules/{schedule_id}/marks/draft` — Bulk save draft marks.
- `POST /teacher/examinations/schedules/{schedule_id}/marks/submit` — Validate marks, calculate grades, and submit for admin review.
- `GET /teacher/examinations/{id}/my-section-summary` — View section summary before submission.

### Student Portal Endpoints (`/api/v1/students/me`)
- `GET /students/me/examinations/upcoming` — Upcoming offline exams with dates, timings, venues, instructions.
- `GET /students/me/examinations/past` — Completed exams with published status indicator.
- `GET /students/me/examinations/{id}/results` — Detailed published marks and subject breakdown.
- `GET /students/me/examinations/{id}/report-card/pdf` — Stream official PDF report card.

### Parent Portal Endpoints (`/api/v1/parent`)
- `GET /parent/children/{student_id}/examinations/upcoming` — Linked child's upcoming exams.
- `GET /parent/children/{student_id}/examinations/past` — Linked child's completed exams.
- `GET /parent/children/{student_id}/examinations/{id}/results` — Linked child's published results.
- `GET /parent/children/{student_id}/examinations/{id}/report-card/pdf` — Stream child's report card PDF.

---

## 6. Frontend Architecture Plan

```text
frontend/admin-frontend/src/
├── app/
│   ├── examinations/
│   │   ├── page.tsx                     # Admin Exam Dashboard (KPIs, List, Filters)
│   │   ├── [id]/
│   │   │   └── page.tsx                 # Exam Details: Schedule Builder, Status & Publishing
│   │   └── grading-scales/
│   │       └── page.tsx                 # Grading Scales Management
│   └── my-examinations/
│       ├── page.tsx                     # Teacher Exam Overview (My Assigned Classes)
│       └── [scheduleId]/marks/
│           └── page.tsx                 # Full-Screen Marks Entry Sheet & Roster
└── features/examinations/
    ├── components/
    │   ├── ExaminationDashboardCards.tsx
    │   ├── ExaminationScheduleTable.tsx
    │   ├── ExaminationCalendarView.tsx
    │   ├── CreateExaminationDialog.tsx
    │   ├── ScheduleExamSubjectDialog.tsx
    │   ├── MarksEntryTable.tsx          # Tabular marks entry with bounds check & absent toggle
    │   ├── ResultPublicationDialog.tsx
    │   └── ReportCardPreviewDialog.tsx
    ├── api.ts
    ├── types.ts
    └── hooks.ts

frontend/student-portal/src/
├── app/
│   ├── examinations/
│   │   └── page.tsx                     # Student/Parent Exam Portal (Upcoming Schedules & Results)
│   └── marks/
│       └── page.tsx                     # Enhanced with published exam breakdowns & PDF download
└── features/examinations/
    ├── components/
    │   ├── UpcomingExamsList.tsx
    │   ├── ExamScheduleCalendar.tsx
    │   ├── PublishedResultsCard.tsx
    │   └── ReportCardPdfViewer.tsx
    ├── api.ts
    └── types.ts
```

---

## 7. Report Card PDF Design & Structure

The PDF will be generated via a Python service (`app/services/report_card_generator.py`) utilizing `reportlab`:
1. **School Header:** School name ("STUDENT MANAGEMENT ACADEMY"), address, affiliation code, academic year, and official crest/logo.
2. **Student & Examination Details:** Student Full Name, Admission/Enrollment Number, Roll Number, Grade & Section, Examination Title & Term, Class Teacher Name.
3. **Tabular Results Grid:**
   - Subject Name & Code
   - Maximum Marks
   - Passing Marks
   - Marks Obtained (or "AB" if absent)
   - Subject Percentage & Letter Grade
   - Status (PASS / FAIL / ABSENT)
4. **Consolidated Summary:**
   - Total Marks: `Obtained / Maximum`
   - Overall Percentage & Aggregate Grade
   - Result: `PASSED / NEEDS IMPROVEMENT`
   - Class Teacher Remarks
5. **Security & Validation:**
   - Unique Report Card ID (e.g. `RC-2026-T1-XXXX`)
   - Issue Date & Publication Timestamp
   - Official Signatory placeholders (Class Teacher & Principal)
   - Watermark / Verification notice ("Valid system-generated report card").

---

## 8. Realistic Demonstration Data Plan

To make the system immediately demonstrable and intuitive upon opening:
1. **Academic Year:** `2026-2027` (Current).
2. **Examinations:**
   - `Term 1 - Unit Test 1`: **PUBLISHED** (Contains complete marks, calculated grades, and ready-to-download Report Cards for Grade 5-A and Grade 1-A).
   - `Term 1 - Mid-Term Examination`: **SCHEDULED / ONGOING** (Schedules configured with dates in mid-November 2026, draft marks in progress).
   - `Term 2 - Final Examination`: **DRAFT** (Future examination).
3. **Assigned Class Teachers:**
   - Teacher `Sunita Sharma` (`sunita.sharma@school.edu`): Assigned to Grade 1 Section 1-A. She will have live marks entry capabilities for her class.
4. **Student Mix:**
   - Distinction students (>90%), Passing students (60-80%), Marginal students (35-50%), and 1 Absentee student demonstrating "AB" grade handling.

---

## Verification Plan

### Automated Tests
- **Backend Pytest (`app/tests/test_examinations.py`):**
  1. Creation of examinations and schedule slots with holiday & conflict validation.
  2. Strict Class Teacher authorization: Teacher A cannot enter marks for Teacher B's section (403/404).
  3. Marks boundary checks: reject negative marks, reject marks > max_marks (422).
  4. Absent student handling: verify percentage calculation and "AB" grade assignment.
  5. Publication isolation: Students and Parents cannot see draft marks (403/empty); visible only after admin publication.
  6. PDF generator: verify byte stream generation and header integrity.
- **Frontend Vitest (`features/examinations/**/*.test.tsx`):**
  1. Marks entry table calculation tests.
  2. Validation error display for marks > max_marks.
  3. Absent switch disabling mark inputs.

### Manual Live Verification (Chrome DevTools MCP)
1. **Admin Journey:**
   - Log in as Admin -> Open `/examinations` -> Create an examination -> Add subjects with dates -> View conflict-free calendar.
2. **Teacher Journey:**
   - Log in as Teacher Sunita Sharma -> Open `/my-examinations` -> Select scheduled exam for Grade 1-A -> Enter marks for students, mark 1 absent -> Save Draft -> Click Submit Results.
3. **Admin Review & Publication:**
   - Switch to Admin -> Review Grade 1-A results -> Click "Publish Results".
4. **Student & Parent Journey:**
   - Log in as Student -> Open `/examinations` -> View published results -> Click "Download Report Card" -> View rendered PDF.
   - Log in as Parent -> Open `/examinations` -> Switch children -> Verify data isolation and download child report card.
