import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { AssignedSectionItem, AttendanceSessionResponse } from '@/features/attendance/types';

export interface AttendanceSectionHistoryTableProps {
  selectedSectionId: string;
  onSelectSectionId: (id: string) => void;
  teacherSections?: AssignedSectionItem[];
  loadingHistory: boolean;
  sectionHistory?: AttendanceSessionResponse[];
}

export const AttendanceSectionHistoryTable: React.FC<AttendanceSectionHistoryTableProps> = ({
  selectedSectionId,
  onSelectSectionId,
  teacherSections,
  loadingHistory,
  sectionHistory,
}) => {
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <FormControl sx={{ minWidth: 320 }} size="small">
          <InputLabel id="history-section-select-label">Select Assigned Section</InputLabel>
          <Select
            labelId="history-section-select-label"
            value={selectedSectionId}
            label="Select Assigned Section"
            onChange={(e) => onSelectSectionId(e.target.value)}
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
                      <TableCell
                        align="center"
                        sx={{ color: s.absent_count > 0 ? 'error.main' : 'inherit' }}
                      >
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
  );
};

