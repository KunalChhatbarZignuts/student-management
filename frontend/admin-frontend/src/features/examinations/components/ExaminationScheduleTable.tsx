import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import Link from 'next/link';

import { ExaminationSchedule } from '../types';

interface Props {
  schedules: ExaminationSchedule[];
  isLoading?: boolean;
  onDeleteSchedule?: (id: string) => void;
  isTeacher?: boolean;
}

export const ExaminationScheduleTable: React.FC<Props> = ({
  schedules,
  isLoading,
  onDeleteSchedule,
  isTeacher,
}) => {
  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading examination schedules...</Typography>
      </Paper>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#fafafa' }}>
        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
          No examination schedules configured yet.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Click "Add Subject Slot" to schedule offline exams for specific grades and sections.
        </Typography>
      </Paper>
    );
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Chip size="small" label="Published" color="success" sx={{ fontWeight: 600 }} />;
      case 'SUBMITTED':
        return <Chip size="small" label="Submitted" color="primary" sx={{ fontWeight: 600 }} />;
      case 'DRAFT':
        return <Chip size="small" label="Draft Marks" color="warning" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip size="small" label="Pending Entry" variant="outlined" sx={{ color: 'text.secondary' }} />;
    }
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: '#f8fafc' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date & Timing</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Grade & Section</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
            <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Marks (Max / Pass)</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Venue</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Marks Status</TableCell>
            <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {schedules.map((sch) => (
            <TableRow key={sch.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {sch.exam_date}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {sch.grade_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Section {sch.section_name}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {sch.subject_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Code: {sch.subject_code}
                </Typography>
              </TableCell>

              <TableCell sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={600}>
                  {sch.max_marks} / {sch.pass_marks}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2">{sch.room_number || 'Standard Classroom'}</Typography>
              </TableCell>

              <TableCell>{getStatusChip(sch.marks_entry_status)}</TableCell>

              <TableCell sx={{ textAlign: 'right' }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                  <Tooltip title={isTeacher ? 'Enter / Edit Marks' : 'Review Class Marks'}>
                    <IconButton
                      component={Link}
                      href={`/my-examinations/${sch.id}/marks`}
                      size="small"
                      color="primary"
                    >
                      <EditNoteIcon />
                    </IconButton>
                  </Tooltip>
                  {onDeleteSchedule && sch.marks_entry_status !== 'PUBLISHED' && (
                    <Tooltip title="Delete Slot">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteSchedule(sch.id)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

