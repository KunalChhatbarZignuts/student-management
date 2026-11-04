# Changelog

All notable changes to the Student Management System will be documented in this file.

## [Unreleased]
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

