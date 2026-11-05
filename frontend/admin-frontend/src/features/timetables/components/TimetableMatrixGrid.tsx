'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { Shift, Period, TimetableSlot } from '@/features/timetables/types';

export interface DayOfWeekItem {
  id: number;
  label: string;
}

export interface TimetableMatrixGridProps {
  activeShift?: Shift;
  activePeriods: Period[];
  activeWorkingDays: DayOfWeekItem[];
  gridEntries: Record<string, TimetableSlot>;
  shiftsList: Shift[];
  currentGradeName?: string;
  selectedShiftToAssign: string;
  onSelectShiftToAssign: (val: string) => void;
  onAssignShift: (shiftId: string) => void;
  isAssigningShift: boolean;
  onSwitchToShiftsTab: (shiftId?: string) => void;
  onOpenCellEditor: (day: number, period: Period) => void;
}

export default function TimetableMatrixGrid({
  activeShift,
  activePeriods,
  activeWorkingDays,
  gridEntries,
  shiftsList,
  currentGradeName,
  selectedShiftToAssign,
  onSelectShiftToAssign,
  onAssignShift,
  isAssigningShift,
  onSwitchToShiftsTab,
  onOpenCellEditor,
}: TimetableMatrixGridProps) {
  if (!activeShift) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'warning.main',
          bgcolor: 'warning.50',
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 44, color: 'warning.main', mb: 1 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>
          No Shift Assigned to {currentGradeName || 'this Grade'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 540, mx: 'auto' }}>
          Timetables are shift-based. To view the period grid and configure class schedules, assign an existing shift to this grade.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="quick-assign-shift-label">Select Shift</InputLabel>
            <Select
              labelId="quick-assign-shift-label"
              value={selectedShiftToAssign || shiftsList[0]?.id || ''}
              label="Select Shift"
              onChange={(e) => onSelectShiftToAssign(e.target.value)}
            >
              {shiftsList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.start_time} - {s.end_time})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => {
              const targetShiftId = selectedShiftToAssign || shiftsList[0]?.id;
              if (targetShiftId) {
                onAssignShift(targetShiftId);
              } else {
                onSwitchToShiftsTab();
              }
            }}
            disabled={isAssigningShift || !shiftsList.length}
          >
            {isAssigningShift ? 'Assigning...' : 'Assign Shift & Load Grid'}
          </Button>
          <Button variant="outlined" onClick={() => onSwitchToShiftsTab()}>
            Configure New Shift
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (activePeriods.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Periods Configured for Shift &quot;{activeShift.name}&quot;
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please switch to the &quot;Shifts &amp; Period Timings&quot; tab to set up reusable periods for this shift.
        </Typography>
        <Button
          variant="contained"
          onClick={() => onSwitchToShiftsTab(activeShift.id)}
        >
          Configure Periods for {activeShift.name}
        </Button>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
      <Table sx={{ minWidth: 800 }}>
        <TableHead sx={{ bgcolor: 'grey.100' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 140 }}>Period / Time</TableCell>
            {activeWorkingDays.map((day) => (
              <TableCell key={day.id} align="center" sx={{ fontWeight: 700 }}>
                {day.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {activePeriods.map((period) => (
            <TableRow
              key={period.id}
              sx={{
                bgcolor: period.is_break ? 'action.hover' : 'inherit',
                '&:hover': { bgcolor: period.is_break ? 'action.hover' : 'grey.50' },
              }}
            >
              {/* Period Header Column */}
              <TableCell sx={{ verticalAlign: 'middle', borderRight: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {period.name || `Period ${period.number}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {period.start_time} - {period.end_time}
                </Typography>
                {period.is_break && (
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label="Break" size="small" color="default" />
                  </Box>
                )}
              </TableCell>

              {/* Day Columns */}
              {activeWorkingDays.map((day) => {
                const key = `${day.id}_${period.id}`;
                const entry = gridEntries[key];

                if (period.is_break) {
                  return (
                    <TableCell
                      key={day.id}
                      align="center"
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.03)',
                        color: 'text.secondary',
                        fontStyle: 'italic',
                      }}
                    >
                      {period.name || 'Recess / Break'}
                    </TableCell>
                  );
                }

                return (
                  <TableCell
                    key={day.id}
                    align="center"
                    sx={{
                      p: 1,
                      cursor: 'pointer',
                      border: 1,
                      borderColor: 'divider',
                      transition: 'background 0.2s',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                    onClick={() => onOpenCellEditor(day.id, period)}
                  >
                    {entry?.subject_name ? (
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: 'primary.50',
                          border: 1,
                          borderColor: 'primary.200',
                          textAlign: 'left',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {entry.subject_name}
                          </Typography>
                          {entry.subject_code && (
                            <Chip label={entry.subject_code} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {entry.teacher_name || 'Teacher unassigned'}
                        </Typography>
                        {entry.room_number && (
                          <Typography variant="caption" color="text.disabled" display="block">
                            Room: {entry.room_number}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        sx={{ color: 'text.secondary', textTransform: 'none' }}
                      >
                        Assign
                      </Button>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

