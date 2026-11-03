# Changelog

All notable changes to the Student Management System will be documented in this file.

## [Unreleased]
- feat(module-1): implemented classes, subjects, teacher assignments models, migration, services, endpoints, and frontend roster viewer.
- feat(module-2): implemented attendance sessions and records with 24h edit window, bulk marking, 409 conflict checks, student summary calculation, and frontend roll call UI.
- feat(teacher-subjects): extended teacher_subjects with grade, section, academic year scope, admin assignment matrix, teacher profile & subject view, with attendance permissions isolated to class leadership.
- feat(subject-teacher-removal): added curriculum subject deletion & faculty deactivation with safe cascade, subjects tab, and realistic dummy test data seed script.
- feat(subject-department): added department column to subjects table, model, schemas, creation dropdown, and seed data.
- fix(teacher-profile-route): added plural route aliases (/teachers/{id}/profile, /teachers/{id}, /subjects/{id}/teachers) and computed full_name field.

