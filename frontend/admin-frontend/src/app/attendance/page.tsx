'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { attendanceApi } from '@/features/attendance/api';
import { calendarApi } from '@/features/calendar/api';
import { adminGradeApi } from '@/features/grades/api';
import {
  AttendanceStatusType,
  AssignedSectionItem,
  SectionDailyOverviewItem,
  StudentAttendanceHistoryResponse,
  AttendanceAuditItemResponse,
  AttendanceRecordItem,
} from '@/features/attendance/types';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  const isTeacher = role === ROLES.TEACHER;
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  // Tabs:
  // For Teacher: 0: "Roll Call", 1: "Section History"
  // For Admin: 0: "Overview", 1: "Roll Call / Override", 2: "Audit Trail & Student History"
  const [activeTab, setActiveTab] = React.useState<number>(0);

  // Common filters
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);
  const [selectedPeriod, setSelectedPeriod] = React.useState<number>(1);
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

  // 1. Fetch Teacher Assigned Sections (if teacher or admin testing)
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
  const {
    data: overviewData,
    isLoading: loadingOverview,
    refetch: refetchOverview,
  } = useQuery({
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
    queryFn: () => calendarApi.checkDateStatus(selectedDate, undefined, selectedSectionId || undefined, isTeacher),
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
    onSuccess: (updated) => {
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

          {/* Top Tabs */}
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

          {/* ============================================================== */}
          {/* TEACHER TAB 0 OR ADMIN TAB 1: ROLL CALL TABLE & SUBMISSION */}
          {/* ============================================================== */}
          {((isTeacher && activeTab === 0) || (isAdmin && activeTab === 1)) && (
            <Box>
              {/* Filter Bar */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="assigned-section-select-label">
                        {isTeacher ? 'My Assigned Section' : 'Select Grade & Section'}
                      </InputLabel>
                      <Select
                        labelId="assigned-section-select-label"
                        value={selectedSectionId}
                        label={isTeacher ? 'My Assigned Section' : 'Select Grade & Section'}
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                        disabled={isTeacher ? loadingTeacherSections : false}
                      >
                        {isTeacher
                          ? teacherSections?.map((s) => (
                              <MenuItem key={s.section_id} value={s.section_id}>
                                {s.grade_name} – Section {s.section_name} ({s.role || 'Teacher'}) [
                                {s.enrolled_students_count} Students]
                              </MenuItem>
                            ))
                          : adminSections?.map((s) => (
                              <MenuItem key={s.id} value={s.id}>
                                {s.name}
                              </MenuItem>
                            ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Attendance Date"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ max: todayStr }}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      fullWidth
                      disabled={isNonWorkingDay}
                      onClick={() => handleMarkAll('PRESENT')}
                    >
                      All Present
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      fullWidth
                      disabled={isNonWorkingDay}
                      onClick={() => handleMarkAll('ABSENT')}
                    >
                      All Absent
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

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

              {/* Summary Counter Metrics Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Students
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {summaryCounters.total}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{ borderRadius: 2, bgcolor: 'success.50' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="success.dark">
                        Present
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {summaryCounters.present}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{ borderRadius: 2, bgcolor: 'error.50' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="error.dark">
                        Absent
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="error.main">
                        {summaryCounters.absent}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{ borderRadius: 2, bgcolor: 'warning.50' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="warning.dark">
                        Late
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="warning.main">
                        {summaryCounters.late}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Card sx={{ borderRadius: 2, bgcolor: 'info.50' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="info.dark">
                        Excused
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="info.main">
                        {summaryCounters.excused}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <Card sx={{ borderRadius: 2, bgcolor: 'primary.50' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="primary.dark">
                        Attendance Rate
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="primary.main">
                        {summaryCounters.percentage}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Roster & Roll Call Table */}
              {loadingRoster || loadingSession ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : !roster || roster.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No enrolled students found in the selected section.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'action.hover' }}>
                    <TextField
                      size="small"
                      placeholder="Search student by name, code, roll no..."
                      value={searchStudentQuery}
                      onChange={(e) => setSearchStudentQuery(e.target.value)}
                      sx={{ flex: 1, minWidth: 240, bgcolor: 'background.paper', borderRadius: 1 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <ToggleButtonGroup
                      size="small"
                      value={rollCallStatusFilter}
                      exclusive
                      onChange={(_, val) => val && setRollCallStatusFilter(val)}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <ToggleButton value="ALL">All ({roster.length})</ToggleButton>
                      <ToggleButton value="PRESENT" color="success">Present</ToggleButton>
                      <ToggleButton value="ABSENT" color="error">Absent</ToggleButton>
                      <ToggleButton value="LATE" color="warning">Late</ToggleButton>
                      <ToggleButton value="EXCUSED" color="info">Excused</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell width="8%">
                            <strong>Roll No</strong>
                          </TableCell>
                          <TableCell width="25%">
                            <strong>Student Details</strong>
                          </TableCell>
                          <TableCell width="15%">
                            <strong>Enrollment No</strong>
                          </TableCell>
                          <TableCell width="32%">
                            <strong>Attendance Status</strong>
                          </TableCell>
                          <TableCell width="20%">
                            <strong>Remarks</strong>
                          </TableCell>
                          {isAdmin && existingSession && (
                            <TableCell width="5%" align="center">
                              <strong>Audit</strong>
                            </TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredRoster.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isAdmin && existingSession ? 6 : 5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              No students match the current search or status filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRoster.map((student) => {
                          const currentMark = marks[student.student_id] || {
                            status: 'PRESENT',
                            remark: '',
                          };
                          const existingRecord = existingSession?.records.find(
                            (r) => r.student_id === student.student_id
                          );

                          return (
                            <TableRow key={student.student_id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {student.roll_no != null ? `#${student.roll_no}` : '—'}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {student.student_name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontFamily: 'monospace' }}
                                >
                                  {student.student_code}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                {student.enrollment_number || '—'}
                              </TableCell>
                              <TableCell>
                                <ToggleButtonGroup
                                  size="small"
                                  value={currentMark.status}
                                  exclusive
                                  onChange={(_, val) => handleStatusChange(student.student_id, val)}
                                >
                                  <ToggleButton
                                    value="PRESENT"
                                    sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      fontWeight: currentMark.status === 'PRESENT' ? 700 : 500,
                                      bgcolor:
                                        currentMark.status === 'PRESENT' ? 'success.100' : undefined,
                                      color:
                                        currentMark.status === 'PRESENT'
                                          ? 'success.dark'
                                          : 'text.secondary',
                                    }}
                                  >
                                    Present
                                  </ToggleButton>
                                  <ToggleButton
                                    value="ABSENT"
                                    sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      fontWeight: currentMark.status === 'ABSENT' ? 700 : 500,
                                      bgcolor:
                                        currentMark.status === 'ABSENT' ? 'error.100' : undefined,
                                      color:
                                        currentMark.status === 'ABSENT'
                                          ? 'error.dark'
                                          : 'text.secondary',
                                    }}
                                  >
                                    Absent
                                  </ToggleButton>
                                  <ToggleButton
                                    value="LATE"
                                    sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      fontWeight: currentMark.status === 'LATE' ? 700 : 500,
                                      bgcolor:
                                        currentMark.status === 'LATE' ? 'warning.100' : undefined,
                                      color:
                                        currentMark.status === 'LATE'
                                          ? 'warning.dark'
                                          : 'text.secondary',
                                    }}
                                  >
                                    Late
                                  </ToggleButton>
                                  <ToggleButton
                                    value="EXCUSED"
                                    sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      fontWeight: currentMark.status === 'EXCUSED' ? 700 : 500,
                                      bgcolor:
                                        currentMark.status === 'EXCUSED' ? 'info.100' : undefined,
                                      color:
                                        currentMark.status === 'EXCUSED'
                                          ? 'info.dark'
                                          : 'text.secondary',
                                    }}
                                  >
                                    Excused
                                  </ToggleButton>
                                </ToggleButtonGroup>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  placeholder="Note (optional)"
                                  value={currentMark.remark}
                                  onChange={(e) =>
                                    handleRemarkChange(student.student_id, e.target.value)
                                  }
                                  fullWidth
                                />
                              </TableCell>
                              {isAdmin && existingSession && (
                                <TableCell align="center">
                                  {existingRecord && (
                                    <Tooltip title="Correct Attendance with Reason">
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleOpenEdit(existingRecord)}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        }))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Submission Footer */}
                  <Box
                    sx={{
                      p: 2.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: 'background.default',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Ready to submit: <strong>{summaryCounters.total}</strong> students marked.
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<SendIcon />}
                      onClick={handlePromptSubmit}
                      disabled={submitMutation.isPending || isNonWorkingDay}
                      color={isNonWorkingDay ? 'inherit' : 'primary'}
                    >
                      {isNonWorkingDay
                        ? 'Disabled (Non-Working Day / Holiday)'
                        : submitMutation.isPending
                        ? 'Submitting...'
                        : 'Submit Attendance Session'}
                    </Button>
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {/* ============================================================== */}
          {/* TEACHER TAB 1: SECTION ATTENDANCE HISTORY */}
          {/* ============================================================== */}
          {isTeacher && activeTab === 1 && (
            <Box>
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
                <FormControl sx={{ minWidth: 320 }} size="small">
                  <InputLabel id="history-section-select-label">Select Assigned Section</InputLabel>
                  <Select
                    labelId="history-section-select-label"
                    value={selectedSectionId}
                    label="Select Assigned Section"
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                  >
                    {teacherSections?.map((s) => (
                      <MenuItem key={s.section_id} value={s.section_id}>
                        {s.grade_name} – Section {s.section_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>

              {loadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !sectionHistory || sectionHistory.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No historical attendance sessions recorded yet for this section.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell>
                            <strong>Date</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Total</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Present</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Absent</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Late</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Excused</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Attendance Rate</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Marked By</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sectionHistory.map((s) => {
                          const denom = Math.max(1, s.present_count + s.absent_count + s.late_count);
                          const rate = Math.round(((s.present_count + s.late_count) / denom) * 1000) / 10;
                          return (
                            <TableRow key={s.id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{s.date}</TableCell>
                              <TableCell align="center">{s.total_students}</TableCell>
                              <TableCell align="center" sx={{ color: 'success.main', fontWeight: 600 }}>
                                {s.present_count}
                              </TableCell>
                              <TableCell align="center" sx={{ color: s.absent_count > 0 ? 'error.main' : 'inherit' }}>
                                {s.absent_count}
                              </TableCell>
                              <TableCell align="center">{s.late_count}</TableCell>
                              <TableCell align="center">{s.excused_count}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={`${rate}%`}
                                  size="small"
                                  color={rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'error'}
                                />
                              </TableCell>
                              <TableCell>{s.teacher_name || 'Staff'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </Box>
          )}

          {/* ============================================================== */}
          {/* ADMIN TAB 0: INSTITUTIONAL DAILY OVERVIEW */}
          {/* ============================================================== */}
          {isAdmin && activeTab === 0 && (
            <Box>
              {/* Filter controls */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Select Overview Date"
                      InputLabelProps={{ shrink: true }}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="grade-filter-label">Filter by Grade</InputLabel>
                      <Select
                        labelId="grade-filter-label"
                        value={selectedGradeId}
                        label="Filter by Grade"
                        onChange={(e) => setSelectedGradeId(e.target.value)}
                      >
                        <MenuItem value="">All Grades</MenuItem>
                        {adminGrades?.map((g: any) => (
                          <MenuItem key={g.id} value={g.id}>
                            {g.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="status-filter-label">Attendance Status</InputLabel>
                      <Select
                        labelId="status-filter-label"
                        value={overviewStatusFilter}
                        label="Attendance Status"
                        onChange={(e) => setOverviewStatusFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">All Sections (Marked & Unmarked)</MenuItem>
                        <MenuItem value="Marked">Marked Only</MenuItem>
                        <MenuItem value="Unmarked">Unmarked Only</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search section or grade..."
                      value={searchSectionQuery}
                      onChange={(e) => setSearchSectionQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {loadingOverview ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : !overviewData ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No overview data available.
                  </Typography>
                </Paper>
              ) : (
                <Box>
                  {/* Overview Cards */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={4} md={2}>
                      <Card sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">
                            Total Sections
                          </Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {overviewData.total_sections}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Card sx={{ borderRadius: 2, bgcolor: 'primary.50' }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="primary.dark">
                            Marked Sections
                          </Typography>
                          <Typography variant="h5" fontWeight={700} color="primary.main">
                            {overviewData.marked_sections} / {overviewData.total_sections}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Card sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary">
                            Enrolled Students
                          </Typography>
                          <Typography variant="h5" fontWeight={700}>
                            {overviewData.total_students}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Card sx={{ borderRadius: 2, bgcolor: 'success.50' }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="success.dark">
                            Present
                          </Typography>
                          <Typography variant="h5" fontWeight={700} color="success.main">
                            {overviewData.total_present}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Card sx={{ borderRadius: 2, bgcolor: 'error.50' }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="error.dark">
                            Absent
                          </Typography>
                          <Typography variant="h5" fontWeight={700} color="error.main">
                            {overviewData.total_absent}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4} md={2}>
                      <Card sx={{ borderRadius: 2, bgcolor: 'info.50' }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="info.dark">
                            Overall Attendance %
                          </Typography>
                          <Typography variant="h5" fontWeight={700} color="info.main">
                            {overviewData.overall_percentage}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Section-Wise Status Table */}
                  <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell>
                              <strong>Grade & Section</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Status</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Students</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Present</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Absent</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Late</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Excused</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Attendance %</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Marked By</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Action</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredOverviewSections.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                No sections match the selected filter criteria.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredOverviewSections.map((item) => (
                              <TableRow key={item.section_id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {item.grade_name} – Section {item.section_name}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={item.status}
                                  size="small"
                                  color={item.status === 'Marked' ? 'success' : 'warning'}
                                />
                              </TableCell>
                              <TableCell align="center">{item.total_students}</TableCell>
                              <TableCell align="center" sx={{ color: 'success.main', fontWeight: 600 }}>
                                {item.present}
                              </TableCell>
                              <TableCell align="center" sx={{ color: item.absent > 0 ? 'error.main' : 'inherit' }}>
                                {item.absent}
                              </TableCell>
                              <TableCell align="center">{item.late}</TableCell>
                              <TableCell align="center">{item.excused}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={`${item.attendance_percentage}%`}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    item.attendance_percentage >= 80
                                      ? 'success'
                                      : item.attendance_percentage >= 60
                                      ? 'warning'
                                      : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>{item.marked_by || '—'}</TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => {
                                    setSelectedSectionId(item.section_id);
                                    setActiveTab(1);
                                  }}
                                >
                                  {item.status === 'Marked' ? 'View / Edit' : 'Take Attendance'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Box>
              )}
            </Box>
          )}

          {/* ============================================================== */}
          {/* ADMIN TAB 2: AUDIT TRAIL & STUDENT ATTENDANCE HISTORY */}
          {/* ============================================================== */}
          {isAdmin && activeTab === 2 && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Attendance Audit Trail
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Immutable record of all corrections made to attendance records, including the previous status, new status, modifier, and mandatory reason.
                </Typography>
              </Box>

              {loadingAudits ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !auditLogs || auditLogs.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No attendance corrections recorded in the audit trail yet.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <TextField
                      size="small"
                      placeholder="Search audit trail by student, reason, or admin..."
                      value={searchAuditQuery}
                      onChange={(e) => setSearchAuditQuery(e.target.value)}
                      sx={{ maxWidth: 450, width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell>
                            <strong>Timestamp</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Student</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Previous</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Corrected To</strong>
                          </TableCell>
                          <TableCell width="35%">
                            <strong>Mandatory Reason</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Modified By</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Student History</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAuditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              No audit logs match the search query.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAuditLogs.map((log) => (
                            <TableRow key={log.id} hover>
                            <TableCell sx={{ fontSize: '0.85rem' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {log.student_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {log.enrollment_number || ''}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={log.previous_status} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={log.new_status}
                                size="small"
                                color={
                                  log.new_status === 'PRESENT'
                                    ? 'success'
                                    : log.new_status === 'ABSENT'
                                    ? 'error'
                                    : 'info'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{log.reason}</Typography>
                            </TableCell>
                            <TableCell>{log.modified_by_name || 'Admin'}</TableCell>
                            <TableCell align="center">
                              <Tooltip title="View Student Attendance History">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedStudentId(log.student_id);
                                    setHistoryDrawerOpen(true);
                                  }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </Box>
          )}

          {/* ============================================================== */}
          {/* CONFIRMATION DIALOG (Mandatory Step 7) */}
          {/* ============================================================== */}
          <Dialog
            open={confirmDialogOpen}
            onClose={() => setConfirmDialogOpen(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle fontWeight={700}>Confirm Attendance Submission</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Please review the attendance summary before submitting for Section on {selectedDate}:
              </DialogContentText>
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 1 }}>
                <Typography variant="body2">
                  Total Students: <strong>{summaryCounters.total}</strong>
                </Typography>
                <Typography variant="body2" color="success.main">
                  Present: <strong>{summaryCounters.present}</strong>
                </Typography>
                <Typography variant="body2" color="error.main">
                  Absent: <strong>{summaryCounters.absent}</strong>
                </Typography>
                <Typography variant="body2" color="warning.main">
                  Late: <strong>{summaryCounters.late}</strong>
                </Typography>
                <Typography variant="body2" color="info.main">
                  Excused: <strong>{summaryCounters.excused}</strong>
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" fontWeight={700}>
                  Calculated Attendance Rate: {summaryCounters.percentage}%
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={executeSubmission}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Confirm & Save'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ============================================================== */}
          {/* EDIT RECORD MODAL WITH MANDATORY REASON */}
          {/* ============================================================== */}
          <Dialog
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle fontWeight={700}>Correct Attendance Record</DialogTitle>
            <DialogContent>
              {editError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEditError(null)}>
                  {editError}
                </Alert>
              )}
              {recordToEdit && (
                <Box sx={{ pt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Student: <strong>{recordToEdit.student_name}</strong> (
                    {recordToEdit.enrollment_number || recordToEdit.student_code})
                  </Typography>

                  <Box sx={{ my: 2 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      New Attendance Status:
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      value={editStatus}
                      exclusive
                      onChange={(_, val) => val && setEditStatus(val)}
                      fullWidth
                    >
                      <ToggleButton value="PRESENT" color="success">
                        Present
                      </ToggleButton>
                      <ToggleButton value="ABSENT" color="error">
                        Absent
                      </ToggleButton>
                      <ToggleButton value="LATE" color="warning">
                        Late
                      </ToggleButton>
                      <ToggleButton value="EXCUSED" color="info">
                        Excused
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    label="Mandatory Reason for Correction *"
                    placeholder="e.g. Doctor's medical certificate submitted by parent"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Optional Remark"
                    placeholder="e.g. Approved medical leave"
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSaveEdit}
                disabled={editMutation.isPending || !editReason.trim()}
              >
                {editMutation.isPending ? 'Saving...' : 'Save Correction'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ============================================================== */}
          {/* STUDENT ATTENDANCE HISTORY DRAWER */}
          {/* ============================================================== */}
          <Drawer
            anchor="right"
            open={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, p: 3 } }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Student Attendance History
              </Typography>
              <IconButton onClick={() => setHistoryDrawerOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {loadingStudentHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : !studentHistory ? (
              <Typography variant="body2" color="text.secondary">
                No attendance records found for this student.
              </Typography>
            ) : (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6">{studentHistory.student_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {studentHistory.grade_name} – {studentHistory.section_name} |{' '}
                    {studentHistory.enrollment_number || studentHistory.student_code}
                  </Typography>
                </Box>

                {/* Metrics */}
                <Grid container spacing={1} sx={{ mb: 3 }}>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover' }}>
                      <Typography variant="caption">Total Sessions</Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {studentHistory.total_working_days}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.50' }}>
                      <Typography variant="caption" color="success.dark">
                        Present
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="success.main">
                        {studentHistory.present_days}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'error.50' }}>
                      <Typography variant="caption" color="error.dark">
                        Absent
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="error.main">
                        {studentHistory.absent_days}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.50' }}>
                      <Typography variant="caption" color="primary.dark">
                        Overall Attendance Percentage
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="primary.main">
                        {studentHistory.attendance_percentage}%
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Session Timeline
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>
                          <strong>Date</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Status</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Remarks</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentHistory.records.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{r.date}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={r.status}
                              size="small"
                              color={
                                r.status === 'PRESENT'
                                ? 'success'
                                : r.status === 'ABSENT'
                                ? 'error'
                                : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{r.remark || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Drawer>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
