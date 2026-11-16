'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { ChildTimetableResponse } from '../types';

interface ChildTimetableTabProps {
  timetable?: ChildTimetableResponse | null;
  isLoading: boolean;
}

export const ChildTimetableTab: React.FC<ChildTimetableTabProps> = ({ timetable, isLoading }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Class Schedule & Timetable
      </Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : !timetable?.schedule || timetable.schedule.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No timetable periods currently assigned for this class.
        </Typography>
      ) : (
        <TableContainer sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timetable.schedule.map((slot, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{slot.subject}</TableCell>
                  <TableCell>{slot.subject_code}</TableCell>
                  <TableCell>{slot.teacher}</TableCell>
                  <TableCell>
                    <Chip label={slot.assignment_type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{slot.schedule}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
