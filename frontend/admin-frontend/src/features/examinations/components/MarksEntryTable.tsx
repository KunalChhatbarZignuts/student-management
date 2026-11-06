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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';

import { ScheduleRosterResponse, StudentRosterMarkItem } from '../types';

interface Props {
  roster: ScheduleRosterResponse;
  onSaveDraft: (marks: StudentRosterMarkItem[], teacherRemarks: string) => Promise<void>;
  onSubmitMarks: (marks: StudentRosterMarkItem[], teacherRemarks: string) => Promise<void>;
  isSaving: boolean;
  isSubmitting: boolean;
}

export const MarksEntryTable: React.FC<Props> = ({
  roster,
  onSaveDraft,
  onSubmitMarks,
  isSaving,
  isSubmitting,
}) => {
  const [marksState, setMarksState] = React.useState<StudentRosterMarkItem[]>(roster.students || []);
  const [teacherRemarks, setTeacherRemarks] = React.useState<string>('');
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMarksState(roster.students || []);
  }, [roster]);

  const maxMarks = roster.max_marks;
  const passMarks = roster.pass_marks;

  // Calculate live grade
  const computeGrade = (score: number | null | undefined, isAbsent: boolean) => {
    if (isAbsent) return { grade: 'AB', isPassed: false };
    if (score === null || score === undefined || isNaN(score)) return { grade: '—', isPassed: false };
    const pct = (score / maxMarks) * 100;
    const isPassed = score >= passMarks;
    if (pct >= 90) return { grade: 'A+', isPassed };
    if (pct >= 80) return { grade: 'A', isPassed };
    if (pct >= 70) return { grade: 'B+', isPassed };
    if (pct >= 60) return { grade: 'B', isPassed };
    if (pct >= 50) return { grade: 'C', isPassed };
    if (pct >= 35) return { grade: 'D', isPassed };
    return { grade: 'F', isPassed: false };
  };

  const handleScoreChange = (studentId: string, val: string) => {
    setValidationError(null);
    const num = val === '' ? null : parseFloat(val);

    if (num !== null && (num < 0 || num > maxMarks)) {
      setValidationError(`Score must be between 0 and maximum marks (${maxMarks}).`);
    }

    setMarksState((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const { grade, isPassed } = computeGrade(num, s.is_absent);
          return {
            ...s,
            marks_obtained: num,
            grade,
            is_passed: isPassed,
          };
        }
        return s;
      })
    );
  };

  const handleAbsentToggle = (studentId: string, checked: boolean) => {
    setValidationError(null);
    setMarksState((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const { grade, isPassed } = computeGrade(checked ? 0 : s.marks_obtained, checked);
          return {
            ...s,
            is_absent: checked,
            marks_obtained: checked ? 0 : s.marks_obtained,
            grade,
            is_passed: isPassed,
          };
        }
        return s;
      })
    );
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    setMarksState((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks: remark } : s))
    );
  };

  const validateAll = () => {
    for (const s of marksState) {
      if (!s.is_absent && (s.marks_obtained === null || s.marks_obtained === undefined || isNaN(s.marks_obtained))) {
        setValidationError(`Please enter marks or mark as absent for student: ${s.student_name}`);
        return false;
      }
      if (!s.is_absent && (s.marks_obtained! < 0 || s.marks_obtained! > maxMarks)) {
        setValidationError(`Marks for ${s.student_name} must be between 0 and ${maxMarks}`);
        return false;
      }
    }
    return true;
  };

  const handleSave = () => {
    onSaveDraft(marksState, teacherRemarks);
  };

  const handleSubmit = () => {
    if (!validateAll()) return;
    if (window.confirm('Submit marks to administration? Once submitted, results will be queued for official review and publication.')) {
      onSubmitMarks(marksState, teacherRemarks);
    }
  };

  return (
    <Box>
      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 60 }}>Roll #</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Enrollment No.</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 140 }}>
                Absent?
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 150 }}>
                Marks (Max: {maxMarks})
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 90 }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 100 }}>Result</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Individual Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {marksState.map((stu) => {
              const { grade, isPassed } = computeGrade(stu.marks_obtained, stu.is_absent);
              return (
                <TableRow key={stu.student_id} hover sx={{ bgcolor: stu.is_absent ? '#fff7ed' : 'inherit' }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {stu.roll_no}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {stu.student_name}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {stu.enrollment_number || '—'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          color="warning"
                          checked={stu.is_absent}
                          onChange={(e) => handleAbsentToggle(stu.student_id, e.target.checked)}
                        />
                      }
                      label={<Typography variant="caption">{stu.is_absent ? 'ABSENT' : 'Present'}</Typography>}
                    />
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <TextField
                      type="number"
                      size="small"
                      placeholder="0.0"
                      disabled={stu.is_absent}
                      value={stu.is_absent ? 0 : (stu.marks_obtained ?? '')}
                      onChange={(e) => handleScoreChange(stu.student_id, e.target.value)}
                      inputProps={{ min: 0, max: maxMarks, step: 0.5 }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <Chip
                      size="small"
                      label={grade}
                      color={
                        stu.is_absent ? 'default' : grade.startsWith('A') ? 'success' : grade === 'F' ? 'error' : 'primary'
                      }
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={stu.is_absent ? 'ABSENT' : isPassed ? 'PASS' : 'FAIL'}
                      color={stu.is_absent ? 'warning' : isPassed ? 'success' : 'error'}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Optional notes or feedback..."
                      value={stu.remarks || ''}
                      onChange={(e) => handleRemarkChange(stu.student_id, e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Class Teacher Section Performance Remarks
        </Typography>
        <TextField
          multiline
          rows={2}
          fullWidth
          placeholder="Overall observations regarding examination conduct, preparation, or exceptional achievements..."
          value={teacherRemarks}
          onChange={(e) => setTeacherRemarks(e.target.value)}
        />
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={18} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving || isSubmitting}
        >
          Save Draft
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          onClick={handleSubmit}
          disabled={isSaving || isSubmitting}
        >
          Submit Marks for Approval
        </Button>
      </Box>
    </Box>
  );
};

