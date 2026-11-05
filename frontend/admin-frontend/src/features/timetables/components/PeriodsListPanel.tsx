'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';

import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';

import { Shift } from '@/features/timetables/types';

export interface PeriodsListPanelProps {
  selectedShiftDetails?: Shift;
  onOpenAssignGrades: () => void;
  onOpenAddPeriod: () => void;
}

export default function PeriodsListPanel({
  selectedShiftDetails,
  onOpenAssignGrades,
  onOpenAddPeriod,
}: PeriodsListPanelProps) {
  const sortedPeriods = selectedShiftDetails?.periods
    ? [...selectedShiftDetails.periods].sort((a, b) => a.number - b.number)
    : [];

  return (
    <Paper sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Periods: {selectedShiftDetails?.name || 'Select a shift'}
          </Typography>
          {selectedShiftDetails && (
            <Typography variant="body2" color="text.secondary">
              Reusable period template for shift ({selectedShiftDetails.start_time} - {selectedShiftDetails.end_time})
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkIcon />}
            disabled={!selectedShiftDetails}
            onClick={onOpenAssignGrades}
          >
            Assign Grades
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!selectedShiftDetails}
            onClick={onOpenAddPeriod}
          >
            Add Period
          </Button>
        </Stack>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Period Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Start Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>End Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPeriods.length > 0 ? (
              sortedPeriods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.number}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.name || `Period ${p.number}`}</TableCell>
                  <TableCell>{p.start_time}</TableCell>
                  <TableCell>{p.end_time}</TableCell>
                  <TableCell>
                    {p.is_break ? (
                      <Chip label="Break / Recess" color="warning" size="small" />
                    ) : (
                      <Chip label="Teaching Period" color="primary" size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No periods created yet for this shift. Click &quot;Add Period&quot; to configure timings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

