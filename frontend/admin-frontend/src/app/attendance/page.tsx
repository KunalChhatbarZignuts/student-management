'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { attendanceApi } from '@/features/attendance/api';
import { calendarApi } from '@/features/calendar/api';
import { adminGradeApi } from '@/features/grades/api';
import {
  AttendanceStatusType,
  AttendanceRecordItem,
} from '@/features/attendance/types';

import {
  AttendanceSummaryCards,
  AttendanceFilterBar,
  AttendanceRollCallTable,
  AttendanceAdminOverview,
  AttendanceSectionHistoryTable,
  AttendanceAuditTable,
  AdminEditAttendanceDialog,
  AttendanceConfirmDialog,
  StudentAttendanceHistoryDrawer,
} from '@/features/attendance/components';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const isTeacher = role === ROLES.TEACHER;
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  // Tabs:
  // For Teacher: 0: "Roll Call", 1: "Section History"
  // For Admin: 0: "Overview", 1: "Roll Call / Override", 2: "Audit Trail & Student History"
  const [activeTab, setActiveTab] = React.useState<number>(0);

  // Common filters
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);
  const [selectedPeriod] = React.useState<number>(1);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [selectedGradeId, setSelectedGradeId] = React.useState<string>('');

  // Search and Quick Filters
  const [searchSectionQuery, setSearchSectionQuery] = React.useState<string>('');
  const [overviewStatusFilter, setOverviewStatusFilter] = React.useState<string>('ALL');
  const [searchStudentQuery, setSearchStudentQuery] = React.useState<string>('');
  const [rollCallStatusFilter, setRollCallStatusFilter] = React.useState<string>('ALL');
  const [searchAuditQuery, setSearchAuditQuery] = React.useState<string>('');

  // Attendance Form State
  const [marks, setMarks] = React.useState<
    Record<string, { status: AttendanceStatusType; remark: string }>
  >({});
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);

  // Admin Edit Record Dialog State
  const [editDialogOpen, setEditDialogOpen] = React.useState<boolean>(false);
  const [recordToEdit, setRecordToEdit] = React.useState<AttendanceRecordItem | null>(null);
  const [editStatus, setEditStatus] = React.useState<AttendanceStatusType>('PRESENT');
  const [editReason, setEditReason] = React.useState<string>('');
  const [editRemark, setEditRemark] = React.useState<string>('');
  const [editError, setEditError] = React.useState<string | null>(null);

  // Student Attendance History Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = React.useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);

  // 1. Fetch Teacher Assigned Sections (if teacher)
  const { data: teacherSections, isLoading: loadingTeacherSections } = useQuery({
    queryKey: ['teacher', 'assigned-sections'],
    queryFn: attendanceApi.getTeacherAssignedSections,
    enabled: isTeacher,
  });

  // 2. Fetch Admin All Grades and Sections (if admin)
  const { data: gradesData } = useQuery({
    queryKey: ['admin', 'grades-list'],
    queryFn: () => adminGradeApi.listGrades({ size: 100 }),
    enabled: isAdmin,
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['admin', 'sections-list'],
    queryFn: () => adminGradeApi.listSections({ size: 100 }),
    enabled: isAdmin,
  });

  const adminGrades = gradesData?.items || [];

  // Flat list of admin sections
  const adminSections = React.useMemo(() => {
    if (!sectionsData?.items) return [];
    return sectionsData.items.map((sec) => ({
      id: sec.id,
      name: sec.grade_name ? `${sec.grade_name} - ${sec.name}` : sec.name,
      gradeName: sec.grade_name || 'Grade',
      gradeId: sec.grade_id,
    }));
  }, [sectionsData]);

  // Set default section when available
  React.useEffect(() => {
    if (isTeacher && teacherSections && teacherSections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(teacherSections[0].section_id);
    } else if (isAdmin && adminSections && adminSections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(adminSections[0].id);
    }
  }, [isTeacher, isAdmin, teacherSections, adminSections, selectedSectionId]);

  // 3. Fetch Admin Daily Overview
  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['admin', 'attendance-overview', selectedDate, selectedGradeId],
    queryFn: () =>
      attendanceApi.getAdminDailyOverview({
        date: selectedDate,
        grade_id: selectedGradeId || undefined,
      }),
    enabled: isAdmin && activeTab === 0,
  });

  // 4. Fetch Roster for Selected Section
  const { data: roster, isLoading: loadingRoster } = useQuery({
    queryKey: ['attendance', 'roster', selectedSectionId, isAdmin],
    queryFn: () =>
      isAdmin
        ? attendanceApi.getAdminSectionRoster(selectedSectionId)
        : attendanceApi.getSectionRoster(selectedSectionId),
    enabled: Boolean(selectedSectionId && (isTeacher ? activeTab === 0 : activeTab === 1)),
  });

  // 4b. Check Date Working Status (School Calendar & Holidays)
  const { data: dateStatus } = useQuery({
    queryKey: ['calendar', 'date-status', selectedDate, selectedSectionId, isTeacher],
    queryFn: () =>
      calendarApi.checkDateStatus(selectedDate, undefined, selectedSectionId || undefined, isTeacher),
    enabled: Boolean(selectedDate),
  });
  const isNonWorkingDay = dateStatus ? !dateStatus.is_working_day : false;

  // 5. Fetch Existing Session (if any) for Selected Section & Date
  const { data: existingSession, isLoading: loadingSession } = useQuery({
    queryKey: ['attendance', 'session', selectedSectionId, selectedDate, selectedPeriod, isAdmin],
    queryFn: () =>
      isAdmin
        ? attendanceApi.getAdminSectionAttendanceSession(selectedSectionId, selectedDate, selectedPeriod)
        : attendanceApi.getSectionAttendanceSession(selectedSectionId, selectedDate, selectedPeriod),
    enabled: Boolean(selectedSectionId && selectedDate && (isTeacher ? activeTab === 0 : activeTab === 1)),
  });

  // Populate marks from existing session OR initialize default PRESENT
  React.useEffect(() => {
    if (existingSession && existingSession.records && existingSession.records.length > 0) {
      const loaded: Record<string, { status: AttendanceStatusType; remark: string }> = {};
      existingSession.records.forEach((rec) => {
        loaded[rec.student_id] = {
          status: rec.status,
          remark: rec.remark || '',
        };
      });
      setMarks(loaded);
    } else if (roster && roster.length > 0) {
      const init: Record<string, { status: AttendanceStatusType; remark: string }> = {};
      roster.forEach((s) => {
        init[s.student_id] = {
          status: 'PRESENT',
          remark: '',
        };
      });
      setMarks(init);
    }
  }, [existingSession, roster]);

  // Live Summary Counters
  const summaryCounters = React.useMemo(() => {
    const list = Object.values(marks);
    const total = list.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    list.forEach((m) => {
      if (m.status === 'PRESENT') present++;
      else if (m.status === 'ABSENT') absent++;
      else if (m.status === 'LATE') late++;
      else if (m.status === 'EXCUSED') excused++;
    });
    const denom = Math.max(1, present + absent + late);
    const pct = total > 0 ? Math.round(((present + late) / denom) * 1000) / 10 : 100.0;
    return { total, present, absent, late, excused, percentage: pct };
  }, [marks]);

  // Client-Side Search & Filtered Lists
  const filteredOverviewSections = React.useMemo(() => {
    if (!overviewData?.sections) return [];
    return overviewData.sections.filter((item) => {
      const matchSearch =
        !searchSectionQuery.trim() ||
        item.grade_name.toLowerCase().includes(searchSectionQuery.toLowerCase()) ||
        item.section_name.toLowerCase().includes(searchSectionQuery.toLowerCase()) ||
        (item.marked_by && item.marked_by.toLowerCase().includes(searchSectionQuery.toLowerCase()));

      const matchStatus =
        overviewStatusFilter === 'ALL' || item.status === overviewStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [overviewData, searchSectionQuery, overviewStatusFilter]);

  const filteredRoster = React.useMemo(() => {
    if (!roster) return [];
    return roster.filter((student) => {
      const q = searchStudentQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        student.student_name.toLowerCase().includes(q) ||
        student.student_code.toLowerCase().includes(q) ||
        (student.enrollment_number && student.enrollment_number.toLowerCase().includes(q)) ||
        (student.roll_no != null && String(student.roll_no).includes(q));

      const currentStatus = marks[student.student_id]?.status || 'PRESENT';
      const matchStatus =
        rollCallStatusFilter === 'ALL' || currentStatus === rollCallStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [roster, searchStudentQuery, rollCallStatusFilter, marks]);

  // Actions
  const handleMarkAll = (status: AttendanceStatusType) => {
    if (!roster || isNonWorkingDay) return;
    const next: Record<string, { status: AttendanceStatusType; remark: string }> = {};
    roster.forEach((s) => {
      next[s.student_id] = {
        status,
        remark: marks[s.student_id]?.remark || '',
      };
    });
    setMarks(next);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatusType | null) => {
    if (!status || isNonWorkingDay) return;
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    if (isNonWorkingDay) return;
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remark,
      },
    }));
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: { date: string; period: number; records: any[] }) =>
      isAdmin
        ? attendanceApi.markAdminSectionAttendance(selectedSectionId, payload)
        : attendanceApi.markSectionAttendance(selectedSectionId, payload),
    onSuccess: () => {
      setConfirmDialogOpen(false);
      setSubmitSuccess('Attendance submitted and locked for the session successfully!');
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance-overview'] });
    },
    onError: (err: any) => {
      setConfirmDialogOpen(false);
      const msg = err.response?.data?.detail || 'Failed to submit attendance. Please try again.';
      setSubmitError(msg);
      setSubmitSuccess(null);
    },
  });

  const handlePromptSubmit = () => {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (isNonWorkingDay) {
      setSubmitError(
        `Cannot submit attendance on a non-working day or holiday: ${
          dateStatus?.reason || dateStatus?.holiday_name || 'Non-working day'
        }`
      );
      return;
    }
    if (!selectedSectionId) {
      setSubmitError('Please select a valid section first.');
      return;
    }
    if (Object.keys(marks).length === 0) {
      setSubmitError('No students found to mark attendance for.');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const executeSubmission = () => {
    const recordsPayload = Object.entries(marks).map(([studentId, data]) => ({
      student_id: studentId,
      status: data.status,
      remark: data.remark?.trim() || null,
    }));

    submitMutation.mutate({
      date: selectedDate,
      period: selectedPeriod,
      records: recordsPayload,
    });
  };

  // Section History Query
  const { data: sectionHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['attendance', 'history', selectedSectionId, isAdmin],
    queryFn: () =>
      isAdmin
        ? attendanceApi.getAdminSectionHistory(selectedSectionId)
        : attendanceApi.getSectionHistory(selectedSectionId),
    enabled: Boolean(selectedSectionId && (isTeacher ? activeTab === 1 : false)),
  });

  // Admin Audit History Query
  const { data: auditLogs, isLoading: loadingAudits } = useQuery({
    queryKey: ['admin', 'audit-history'],
    queryFn: () => attendanceApi.getAuditHistory(),
    enabled: isAdmin && activeTab === 2,
  });

  const filteredAuditLogs = React.useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs.filter((log) => {
      const q = searchAuditQuery.trim().toLowerCase();
      return (
        !q ||
        log.student_name.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q) ||
        (log.enrollment_number && log.enrollment_number.toLowerCase().includes(q)) ||
        (log.modified_by_name && log.modified_by_name.toLowerCase().includes(q))
      );
    });
  }, [auditLogs, searchAuditQuery]);

  // Admin Student Attendance History Query
  const { data: studentHistory, isLoading: loadingStudentHistory } = useQuery({
    queryKey: ['admin', 'student-history', selectedStudentId],
    queryFn: () => attendanceApi.getStudentAttendanceHistory(selectedStudentId!),
    enabled: Boolean(selectedStudentId && historyDrawerOpen),
  });

  // Edit Record Mutation
  const editMutation = useMutation({
    mutationFn: (vars: { id: string; status: AttendanceStatusType; reason: string; remark?: string }) =>
      attendanceApi.editAttendanceRecord(vars.id, {
        status: vars.status,
        reason: vars.reason,
        remark: vars.remark || null,
      }),
    onSuccess: () => {
      setEditDialogOpen(false);
      setEditReason('');
      setEditRemark('');
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-history'] });
      if (selectedStudentId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'student-history', selectedStudentId] });
      }
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.detail || 'Failed to update record.');
    },
  });

  const handleOpenEdit = (rec: AttendanceRecordItem) => {
    setRecordToEdit(rec);
    setEditStatus(rec.status);
    setEditRemark(rec.remark || '');
    setEditReason('');
    setEditError(null);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!recordToEdit) return;
    if (!editReason.trim()) {
      setEditError('A mandatory reason is required to correct attendance records.');
      return;
    }
    editMutation.mutate({
      id: recordToEdit.id,
      status: editStatus,
      reason: editReason.trim(),
      remark: editRemark.trim(),
    });
  };

  return (
    <RequireRole roles={[ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1280, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Class Attendance Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isAdmin
                ? 'Institutional grade & section attendance oversight, live roll call submission, record corrections with audit trail.'
                : 'Take daily attendance for your assigned sections, review attendance counters, and track class history.'}
            </Typography>
          </Box>

          {/* Top Navigation Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => {
                setActiveTab(val);
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              variant="scrollable"
              scrollButtons="auto"
              indicatorColor="primary"
              textColor="primary"
            >
              {isTeacher && (
                <Tab
                  icon={<EventAvailableIcon />}
                  label="Take Attendance (Roll Call)"
                  iconPosition="start"
                />
              )}
              {isTeacher && (
                <Tab
                  icon={<HistoryIcon />}
                  label="Section Attendance History"
                  iconPosition="start"
                />
              )}

              {isAdmin && (
                <Tab
                  icon={<AssessmentIcon />}
                  label="Institutional Overview"
                  iconPosition="start"
                />
              )}
              {isAdmin && (
                <Tab
                  icon={<EventAvailableIcon />}
                  label="Roll Call & Section Attendance"
                  iconPosition="start"
                />
              )}
              {isAdmin && (
                <Tab
                  icon={<FactCheckIcon />}
                  label="Audit Trail & Corrections"
                  iconPosition="start"
                />
              )}
            </Tabs>
          </Paper>

          {/* TAB: ROLL CALL TABLE & SUBMISSION (Teacher Tab 0, Admin Tab 1) */}
          {((isTeacher && activeTab === 0) || (isAdmin && activeTab === 1)) && (
            <Box>
              <AttendanceFilterBar
                isTeacher={isTeacher}
                selectedSectionId={selectedSectionId}
                onSectionChange={setSelectedSectionId}
                teacherSections={teacherSections}
                adminSections={adminSections}
                loadingTeacherSections={loadingTeacherSections}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                todayStr={todayStr}
                isNonWorkingDay={isNonWorkingDay}
                onMarkAll={handleMarkAll}
              />

              {/* Holiday & Non-Working Day Banner */}
              {isNonWorkingDay && (
                <Alert
                  severity="warning"
                  icon={<EventBusyIcon />}
                  sx={{ mb: 2, borderRadius: 2, fontWeight: 500 }}
                >
                  <strong>Non-Working Day / Holiday: </strong>
                  {dateStatus?.reason || dateStatus?.holiday_name || 'Attendance roll-call is disabled for this date.'}
                </Alert>
              )}

              {/* Status & Feedback Alerts */}
              {submitError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
                  {submitError}
                </Alert>
              )}
              {submitSuccess && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitSuccess(null)}>
                  {submitSuccess}
                </Alert>
              )}

              {existingSession && (
                <Alert
                  severity="info"
                  sx={{ mb: 2.5, borderRadius: 2 }}
                  icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                >
                  <strong>Attendance Session Already Recorded:</strong> Marked by{' '}
                  <strong>{existingSession.teacher_name || 'Staff'}</strong> on{' '}
                  {existingSession.date} at{' '}
                  {new Date(existingSession.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  .{isAdmin ? ' As an administrator, you may correct or re-submit if needed.' : ''}
                </Alert>
              )}

              <AttendanceSummaryCards counters={summaryCounters} />

              <AttendanceRollCallTable
                loadingRoster={loadingRoster}
                loadingSession={loadingSession}
                roster={roster}
                filteredRoster={filteredRoster}
                searchStudentQuery={searchStudentQuery}
                onSearchQueryChange={setSearchStudentQuery}
                rollCallStatusFilter={rollCallStatusFilter}
                onRollCallStatusFilterChange={setRollCallStatusFilter}
                marks={marks}
                existingSession={existingSession}
                isAdmin={isAdmin}
                isNonWorkingDay={isNonWorkingDay}
                summaryCounters={summaryCounters}
                onStatusChange={handleStatusChange}
                onRemarkChange={handleRemarkChange}
                onOpenEdit={handleOpenEdit}
                onPromptSubmit={handlePromptSubmit}
                isSubmitting={submitMutation.isPending}
              />
            </Box>
          )}

          {/* TAB: TEACHER SECTION HISTORY (Teacher Tab 1) */}
          {isTeacher && activeTab === 1 && (
            <AttendanceSectionHistoryTable
              selectedSectionId={selectedSectionId}
              onSelectSectionId={setSelectedSectionId}
              teacherSections={teacherSections}
              loadingHistory={loadingHistory}
              sectionHistory={sectionHistory}
            />
          )}

          {/* TAB: ADMIN INSTITUTIONAL OVERVIEW (Admin Tab 0) */}
          {isAdmin && activeTab === 0 && (
            <AttendanceAdminOverview
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedGradeId={selectedGradeId}
              onGradeChange={setSelectedGradeId}
              grades={adminGrades}
              overviewStatusFilter={overviewStatusFilter}
              onOverviewStatusFilterChange={setOverviewStatusFilter}
              searchSectionQuery={searchSectionQuery}
              onSearchSectionQueryChange={setSearchSectionQuery}
              loadingOverview={loadingOverview}
              overviewData={overviewData}
              filteredSections={filteredOverviewSections}
              onSelectSection={(sectionId) => {
                setSelectedSectionId(sectionId);
                setActiveTab(1);
              }}
            />
          )}

          {/* TAB: ADMIN AUDIT TRAIL & CORRECTIONS (Admin Tab 2) */}
          {isAdmin && activeTab === 2 && (
            <AttendanceAuditTable
              loadingAudits={loadingAudits}
              auditLogs={auditLogs}
              filteredAuditLogs={filteredAuditLogs}
              searchAuditQuery={searchAuditQuery}
              onSearchAuditQueryChange={setSearchAuditQuery}
              onViewStudentHistory={(studentId) => {
                setSelectedStudentId(studentId);
                setHistoryDrawerOpen(true);
              }}
            />
          )}

          {/* Confirmation Dialog */}
          <AttendanceConfirmDialog
            open={confirmDialogOpen}
            onClose={() => setConfirmDialogOpen(false)}
            selectedDate={selectedDate}
            summaryCounters={summaryCounters}
            onConfirm={executeSubmission}
            isSubmitting={submitMutation.isPending}
          />

          {/* Edit Record Modal with Mandatory Reason */}
          <AdminEditAttendanceDialog
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            recordToEdit={recordToEdit}
            editStatus={editStatus}
            onStatusChange={setEditStatus}
            editReason={editReason}
            onReasonChange={setEditReason}
            editRemark={editRemark}
            onRemarkChange={setEditRemark}
            editError={editError}
            onClearError={() => setEditError(null)}
            onSave={handleSaveEdit}
            isSaving={editMutation.isPending}
          />

          {/* Student Attendance History Drawer */}
          <StudentAttendanceHistoryDrawer
            open={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            loading={loadingStudentHistory}
            studentHistory={studentHistory}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
