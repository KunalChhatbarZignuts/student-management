# Changelog

All notable changes to the Student Management System will be documented in this file.

## [Unreleased]
- feat(examinations-and-report-cards): implemented offline Examination & Report Card Management System across Admin, Teacher, Student, and Parent roles. Includes examination cycle setup, subject scheduling, conflict detection, holiday validation, Class Teacher marks entry workspace with draft autosave and live grade calculation, administrative review and publication gate, and downloadable official school Report Card PDFs generated dynamically via ReportLab.
- feat(student-relational-keys): added relational current_grade_id and current_section_id foreign keys to Student model with zero-downtime dual-write and full data backfill across all 76 student records.
- feat(section-transfer): implemented student section transfer endpoint, enrollment status transition handling, and audit logging with admin dialog UI.
- feat(student-medical-registry): added emergency contact, blood group, allergies, conditions, and authorized pickup fields with Student Details tab and profile integration.
- feat(teacher-attendance-grace-window): implemented 30-minute self-correction window for teachers with mandatory correction remarks, audit history logging, and countdown timer UI.
- fix(parents-search): added full name concatenation search matching multi-token queries in parents list endpoint (BUG-MAN-001).
- fix(modal-accessibility): added autoFocus to dialog action button to eliminate WAI-ARIA aria-hidden focus warnings (BUG-MAN-002).
- fix(parent-fees-empty-state): differentiated unassigned fee session from settled balance in student portal fee summary (BUG-MAN-003).
- feat(student-leave-management): implemented Student Leave Application Management with strict Class Teacher approval, attendance EXCUSED integration, and multi-portal interfaces for Student, Parent, Teacher, and Admin.
- feat(timetable-weekly-dummy-data): generated balanced Monday-Saturday timetables across all 15 grades and 37 sections (1,272 slots, 0 clashes) with strict teacher_subjects certification compliance and full weekly workload distribution.
- refactor(remove-bulk-import): completely removed Bulk CSV User Import feature from backend router, import service, frontend navigation, and dashboard.
- feat(calendar-timetable-integration): integrated School Calendar working-day and holiday status with Timetable Management across backend and all four portals (Admin, Teacher, Student, Parent) with automatic holiday suppression and compensatory working day support.
- feat(timetable-full-school-dummy-data): seeded clash-free published timetables across all 15 grades (Nursery through Grade 12) and 37 sections with dual shifts (Morning & Pre-Primary), complete faculty rotation, and robust student section resolution.
- fix(timetable-shift-linking-and-timepickers): resolved major blocker by enabling shift-to-grade assignment, added MUI TimePicker to shift and period dialogs, resolved fee NaN amounts, fixed teacher RBAC grade lookups, and verified conflict-free publishing across all 4 roles.
- feat(timetable-and-access-restrictions): implemented shift-based timetable configuration, period timings, clash validation, draft versioning & publishing, teacher dual-view schedule with assigned class highlights, student/parent timetable views, and restricted fee module from student access.
- feat(fees-payment-gateway): implemented fee payment transactions, offline payments, webhook processing, Razorpay online checkout, receipts generation, admin monitoring, and student/parent fee portal.
- feat(module-1): implemented classes, subjects, teacher assignments models, migration, services, endpoints, and frontend roster viewer.
- feat(module-2): implemented attendance sessions and records with 24h edit window, bulk marking, 409 conflict checks, student summary calculation, and frontend roll call UI.
- feat(teacher-subjects): extended teacher_subjects with grade, section, academic year scope, admin assignment matrix, teacher profile & subject view, with attendance permissions isolated to class leadership.
- feat(subject-teacher-removal): added curriculum subject deletion & faculty deactivation with safe cascade, subjects tab, and realistic dummy test data seed script.
- feat(subject-department): added department column to subjects table, model, schemas, creation dropdown, and seed data.
- fix(teacher-profile-route): added plural route aliases (/teachers/{id}/profile, /teachers/{id}, /subjects/{id}/teachers) and computed full_name field.

