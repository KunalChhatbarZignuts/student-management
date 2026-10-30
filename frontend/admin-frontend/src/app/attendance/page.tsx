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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import {
  teacherPortalApi,
  TeacherAssignment,
  AttendanceRecordPayload,
  AttendanceBulkCreatePayload,
} from '@/features/teacher-portal/api';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<number>(0);

  // Filters for Roll Call
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<string>('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);
  const [selectedPeriod, setSelectedPeriod] = React.useState<number>(1);

  // Attendance in-progress state: { [student_id]: { status, remark } }
  const [marks, setMarks] = React.useState<Record<string, AttendanceRecordPayload>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);

  // Summary filters
  const [fromRange, setFromRange] = React.useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [toRange, setToRange] = React.useState<string>(todayStr);

  // 1. Fetch Teacher's Assigned Classes
  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['teacher', 'assigned-classes'],
    queryFn: teacherPortalApi.getAssignedClasses,
  });

  // Auto-select first assignment
  React.useEffect(() => {
    if (assignments && assignments.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  const currentAssignment = React.useMemo(() => {
    return assignments?.find((a) => a.id === selectedAssignmentId) || null;
  }, [assignments, selectedAssignmentId]);

  // 2. Fetch Class Roster for current assignment
  const { data: rosterData, isLoading: loadingRoster } = useQuery({
    queryKey: ['teacher', 'roster', currentAssignment?.class_id],
    queryFn: () =>
      teacherPortalApi.getClassRoster(currentAssignment!.class_id, {
        page: 1,
        size: 100,
      }),
    enabled: Boolean(currentAssignment?.class_id),
  });

  // Initialize marks to PRESENT when roster changes
  React.useEffect(() => {
    if (rosterData?.items) {
      const initial: Record<string, AttendanceRecordPayload> = {};
      rosterData.items.forEach((s) => {
        initial[s.id] = {
          student_id: s.id,
          status: 'PRESENT',
          remark: '',
        };
      });
      setMarks(initial);
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  }, [rosterData]);

  // 3. Mark All Present helper
  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') => {
    if (!rosterData?.items) return;
    const updated = { ...marks };
    rosterData.items.forEach((s) => {
      updated[s.id] = {
        ...updated[s.id],
        student_id: s.id,
        status,
      };
    });
    setMarks(updated);
  };

  // 4. Update single student status
  const handleStatusChange = (
    studentId: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null
  ) => {
    if (!status) return;
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        status,
      },
    }));
  };

  // 5. Update remark
  const handleRemarkChange = (studentId: string, remark: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        remark,
      },
    }));
  };

  // 6. Submit Attendance Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: AttendanceBulkCreatePayload) => teacherPortalApi.markAttendance(payload),
    onSuccess: () => {
      setSubmitSuccess('Attendance recorded successfully!');
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ['teacher', 'attendance-summary'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to submit attendance.';
      setSubmitError(msg);
      setSubmitSuccess(null);
    },
  });

  const handleSubmit = () => {
    if (!currentAssignment) return;
    const recordsList = Object.values(marks);
    if (recordsList.length === 0) {
      setSubmitError('No students found in this class.');
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);

    submitMutation.mutate({
      class_id: currentAssignment.class_id,
      subject_id: currentAssignment.subject_id,
      date: selectedDate,
      period: selectedPeriod,
      records: recordsList,
    });
  };

  // 7. Summary Query
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['teacher', 'attendance-summary', currentAssignment?.class_id, fromRange, toRange],
    queryFn: () =>
      teacherPortalApi.getAttendanceSummary(currentAssignment!.class_id, fromRange, toRange),
    enabled: Boolean(currentAssignment?.class_id && activeTab === 1),
  });

  return (
    <RequireRole roles={[ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1100, mx: 'auto', p: 1 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Class Attendance Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Conduct live roll call marking, update class attendance records, and review attendance metrics.
            </Typography>
          </Box>

          <Paper sx={{ mb: 3, borderRadius: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab icon={<EventAvailableIcon />} label="Take Attendance (Roll Call)" iconPosition="start" />
              <Tab icon={<AssessmentIcon />} label="Class Summary & Trends" iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Classroom & Filter Selector */}
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <FormControl fullWidth size="small">
                  <InputLabel id="class-select-label">Assigned Class & Subject</InputLabel>
                  <Select
                    labelId="class-select-label"
                    value={selectedAssignmentId}
                    label="Assigned Class & Subject"
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    disabled={loadingAssignments}
                  >
                    {assignments?.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.class_name} ({a.section}) — {a.subject_name} ({a.subject_code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {activeTab === 0 ? (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Attendance Date"
                      InputLabelProps={{ shrink: true }}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="period-select-label">Period</InputLabel>
                      <Select
                        labelId="period-select-label"
                        value={selectedPeriod}
                        label="Period"
                        onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                          <MenuItem key={p} value={p}>
                            Period {p}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      onClick={() => handleMarkAll('PRESENT')}
                    >
                      All Present
                    </Button>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="From Date"
                      InputLabelProps={{ shrink: true }}
                      value={fromRange}
                      onChange={(e) => setFromRange(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="To Date"
                      InputLabelProps={{ shrink: true }}
                      value={toRange}
                      onChange={(e) => setToRange(e.target.value)}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>

          {/* TAB 0: ROLL CALL */}
          {activeTab === 0 && (
            <Box>
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

              {loadingRoster ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !rosterData?.items || rosterData.items.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No active students registered in this class.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell width="15%"><strong>Code</strong></TableCell>
                          <TableCell width="30%"><strong>Student Name</strong></TableCell>
                          <TableCell width="35%"><strong>Attendance Status</strong></TableCell>
                          <TableCell width="20%"><strong>Remark</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rosterData.items.map((student) => {
                          const currentMark = marks[student.id] || { status: 'PRESENT', remark: '' };
                          return (
                            <TableRow key={student.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace' }}>
                                {student.student_code}
                              </TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>
                                <ToggleButtonGroup
                                  size="small"
                                  value={currentMark.status}
                                  exclusive
                                  onChange={(_, val) => handleStatusChange(student.id, val)}
                                  color="primary"
                                >
                                  <ToggleButton value="PRESENT" color="success">Present</ToggleButton>
                                  <ToggleButton value="ABSENT" color="error">Absent</ToggleButton>
                                  <ToggleButton value="LATE" color="warning">Late</ToggleButton>
                                  <ToggleButton value="EXCUSED" color="info">Excused</ToggleButton>
                                </ToggleButtonGroup>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  size="small"
                                  placeholder="Note (optional)"
                                  value={currentMark.remark || ''}
                                  onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                                  fullWidth
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-end', bgcolor: 'background.default' }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<SendIcon />}
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? 'Submitting...' : 'Submit Class Attendance'}
                    </Button>
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {/* TAB 1: SUMMARY */}
          {activeTab === 1 && (
            <Box>
              {loadingSummary ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !summaryData?.items || summaryData.items.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No attendance records found for this period.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {summaryData.class_name} ({summaryData.section}) — Total Recorded Sessions: {summaryData.total_sessions}
                    </Typography>
                    <Chip label={`${fromRange} to ${toRange}`} size="small" variant="outlined" />
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell><strong>Student Code</strong></TableCell>
                          <TableCell><strong>Student Name</strong></TableCell>
                          <TableCell align="center"><strong>Present</strong></TableCell>
                          <TableCell align="center"><strong>Absent</strong></TableCell>
                          <TableCell align="center"><strong>Late</strong></TableCell>
                          <TableCell align="center"><strong>Excused</strong></TableCell>
                          <TableCell align="center"><strong>Attendance %</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summaryData.items.map((row) => (
                          <TableRow key={row.student_id} hover>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{row.student_code}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell align="center">{row.present_count}</TableCell>
                            <TableCell align="center" sx={{ color: row.absent_count > 0 ? 'error.main' : 'inherit' }}>
                              {row.absent_count}
                            </TableCell>
                            <TableCell align="center">{row.late_count}</TableCell>
                            <TableCell align="center">{row.excused_count}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${row.percentage}%`}
                                size="small"
                                color={
                                  row.percentage >= 80
                                    ? 'success'
                                    : row.percentage >= 60
                                    ? 'warning'
                                    : 'error'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}

