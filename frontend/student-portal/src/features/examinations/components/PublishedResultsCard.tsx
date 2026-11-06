import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { StudentResultResponse } from '../types';

interface Props {
  result: StudentResultResponse;
  onDownloadPdf: (examId: string, filename: string) => Promise<void>;
}

export const PublishedResultsCard: React.FC<Props> = ({ result, onDownloadPdf }) => {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const filename = `Report_Card_${result.student_name.replace(' ', '_')}_${result.exam_name.replace(' ', '_')}.pdf`;
      await onDownloadPdf(result.examination_id, filename);
    } finally {
      setDownloading(false);
    }
  };

  const isPassed = result.overall_result === 'PASS';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 2.5,
        mb: 3,
        borderColor: isPassed ? '#bbf7d0' : '#fecaca',
      }}
    >
      {/* Header Banner */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {result.exam_name}
            </Typography>
            <Chip
              icon={<CheckCircleIcon />}
              label="Official Published Result"
              color="success"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Academic Year: <strong>{result.academic_year}</strong> • Term: <strong>{result.term}</strong> • Student: <strong>{result.student_name}</strong> (Roll #{result.roll_no || '1'})
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
          onClick={handleDownload}
          disabled={downloading}
          sx={{ fontWeight: 600 }}
        >
          Download Report Card (PDF)
        </Button>
      </Box>

      {/* Aggregate Score Grid */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc' }}>
            <Typography variant="caption" color="text.secondary">
              Total Score
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {result.total_obtained_marks} / {result.total_max_marks}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc' }}>
            <Typography variant="caption" color="text.secondary">
              Overall Percentage
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {result.percentage.toFixed(1)}%
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc' }}>
            <Typography variant="caption" color="text.secondary">
              Final Grade
            </Typography>
            <Typography
              variant="h6"
              fontWeight={800}
              color={result.overall_grade.startsWith('A') ? 'success.main' : 'primary.main'}
            >
              {result.overall_grade}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              textAlign: 'center',
              bgcolor: isPassed ? '#f0fdf4' : '#fef2f2',
              borderColor: isPassed ? '#86efac' : '#fca5a5',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Academic Result
            </Typography>
            <Typography variant="h6" fontWeight={800} color={isPassed ? 'success.main' : 'error.main'}>
              {result.overall_result}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Subject-wise Marks Table */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Subject-wise Evaluation Breakdown
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, mb: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Max Marks</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Pass Marks</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Marks Obtained</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.subject_marks.map((subj, idx) => (
              <TableRow key={idx} hover sx={{ bgcolor: subj.is_absent ? '#fff7ed' : 'inherit' }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {subj.subject_name}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {subj.subject_code}
                  </Typography>
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>{subj.max_marks}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>{subj.pass_marks}</TableCell>

                <TableCell sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight={700}>
                    {subj.is_absent ? 'ABSENT' : (subj.marks_obtained !== null ? subj.marks_obtained : '—')}
                  </Typography>
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    size="small"
                    label={subj.grade || '—'}
                    color={subj.is_absent ? 'default' : subj.grade?.startsWith('A') ? 'success' : 'primary'}
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>

                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={subj.is_absent ? 'ABSENT' : subj.is_passed ? 'PASS' : 'FAIL'}
                    color={subj.is_absent ? 'warning' : subj.is_passed ? 'success' : 'error'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Teacher Remarks & Verification */}
      <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          CLASS TEACHER REMARKS
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {result.teacher_remarks || 'Consistent academic performance throughout the evaluation term.'}
        </Typography>
        {result.class_teacher_name && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Conducted & Verified by: <strong>{result.class_teacher_name}</strong>
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

