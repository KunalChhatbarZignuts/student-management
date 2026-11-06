import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import TimerIcon from '@mui/icons-material/Timer';
import LockIcon from '@mui/icons-material/Lock';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';

import {
  AttendanceStatusType,
  AttendanceRecordItem,
  SectionRosterStudentItem,
  AttendanceSessionResponse,
} from '@/features/attendance/types';

export interface AttendanceRollCallTableProps {
  loadingRoster: boolean;
  loadingSession: boolean;
  roster?: SectionRosterStudentItem[];
  filteredRoster: SectionRosterStudentItem[];
  searchStudentQuery: string;
  onSearchQueryChange: (query: string) => void;
  rollCallStatusFilter: string;
  onRollCallStatusFilterChange: (status: string) => void;
  marks: Record<string, { status: AttendanceStatusType; remark: string }>;
  existingSession?: AttendanceSessionResponse | null;
  isAdmin: boolean;
  isTeacher?: boolean;
  canTeacherEdit?: boolean;
  remainingSeconds?: number;
  isNonWorkingDay: boolean;
  summaryCounters: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
  onStatusChange: (studentId: string, status: AttendanceStatusType | null) => void;
  onRemarkChange: (studentId: string, remark: string) => void;
  onOpenEdit: (rec: AttendanceRecordItem) => void;
  onPromptSubmit: () => void;
  isSubmitting: boolean;
}

export const AttendanceRollCallTable: React.FC<AttendanceRollCallTableProps> = ({
  loadingRoster,
  loadingSession,
  roster,
  filteredRoster,
  searchStudentQuery,
  onSearchQueryChange,
  rollCallStatusFilter,
  onRollCallStatusFilterChange,
  marks,
  existingSession,
  isAdmin,
  isTeacher,
  canTeacherEdit,
  remainingSeconds = 0,
  isNonWorkingDay,
  summaryCounters,
  onStatusChange,
  onRemarkChange,
  onOpenEdit,
  onPromptSubmit,
  isSubmitting,
}) => {
  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isTeacherLocked = Boolean(existingSession) && isTeacher && !canTeacherEdit;
  const isTeacherAmending = Boolean(existingSession) && isTeacher && Boolean(canTeacherEdit);
  if (loadingRoster || loadingSession) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!roster || roster.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No enrolled students found in the selected section.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* Grace Window Live Countdown / Locked Status for Teachers */}
      {isTeacherAmending && (
        <Alert
          severity="warning"
          icon={<TimerIcon fontSize="inherit" />}
          sx={{ m: 2, mb: 1, borderRadius: 2, fontWeight: 600 }}
          action={
            <Chip
              label={`${formatRemaining(remainingSeconds)} left`}
              color={remainingSeconds < 300 ? 'error' : 'warning'}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          }
        >
          Attendance Self-Correction Active: You have {formatRemaining(remainingSeconds)} remaining to amend this roll call. Mandatory reason required on submit.
        </Alert>
      )}

      {isTeacherLocked && (
        <Alert
          severity="info"
          icon={<LockIcon fontSize="inherit" />}
          sx={{ m: 2, mb: 1, borderRadius: 2, fontWeight: 500 }}
        >
          Session Locked: The 30-minute self-correction window for this roll call has ended. To make amendments, please contact your school administrator.
        </Alert>
      )}

      {/* Quick Search & Status Filter bar */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          bgcolor: 'action.hover',
        }}
      >
        <TextField
          size="small"
          placeholder="Search student by name, code, roll no..."
          value={searchStudentQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
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
          onChange={(_, val) => val && onRollCallStatusFilterChange(val)}
          sx={{ bgcolor: 'background.paper' }}
        >
          <ToggleButton value="ALL">All ({roster.length})</ToggleButton>
          <ToggleButton value="PRESENT" color="success">Present</ToggleButton>
          <ToggleButton value="ABSENT" color="error">Absent</ToggleButton>
          <ToggleButton value="LATE" color="warning">Late</ToggleButton>
          <ToggleButton value="EXCUSED" color="info">Excused</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Roster Table */}
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
                <TableCell
                  colSpan={isAdmin && existingSession ? 6 : 5}
                  align="center"
                  sx={{ py: 3, color: 'text.secondary' }}
                >
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
                        onChange={(_, val) => onStatusChange(student.student_id, val)}
                        disabled={isNonWorkingDay || isTeacherLocked}
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
                        onChange={(e) => onRemarkChange(student.student_id, e.target.value)}
                        fullWidth
                        disabled={isNonWorkingDay || isTeacherLocked}
                      />
                    </TableCell>
                    {isAdmin && existingSession && (
                      <TableCell align="center">
                        {existingRecord && (
                          <Tooltip title="Correct Attendance with Reason">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => onOpenEdit(existingRecord)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
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
          startIcon={isTeacherLocked ? <LockIcon /> : <SendIcon />}
          onClick={onPromptSubmit}
          disabled={isSubmitting || isNonWorkingDay || isTeacherLocked}
          color={isNonWorkingDay || isTeacherLocked ? 'inherit' : 'primary'}
        >
          {isNonWorkingDay
            ? 'Disabled (Non-Working Day / Holiday)'
            : isTeacherLocked
            ? 'Attendance Locked (Grace Window Expired)'
            : isTeacherAmending
            ? `Submit Amendments (${formatRemaining(remainingSeconds)})`
            : isSubmitting
            ? 'Submitting...'
            : 'Submit Attendance Session'}
        </Button>
      </Box>
    </Paper>
  );
};

