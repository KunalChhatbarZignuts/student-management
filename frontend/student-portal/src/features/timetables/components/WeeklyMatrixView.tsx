'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { TimetableDetail } from '../types';

interface DayConfig {
  id: number;
  label: string;
}

interface WeeklyMatrixViewProps {
  timetableData: TimetableDetail;
  activeWorkingDays: DayConfig[];
}

export const WeeklyMatrixView: React.FC<WeeklyMatrixViewProps> = ({
  timetableData,
  activeWorkingDays,
}) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto', boxShadow: 2 }}>
      <Table sx={{ minWidth: 800 }}>
        <TableHead sx={{ bgcolor: 'primary.50' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 140, color: 'primary.dark' }}>
              Period / Time
            </TableCell>
            {activeWorkingDays.map((day) => (
              <TableCell key={day.id} align="center" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                {day.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {timetableData.periods?.map((period) => (
            <TableRow
              key={period.id}
              sx={{
                bgcolor: period.is_break ? 'action.hover' : 'inherit',
                '&:hover': { bgcolor: period.is_break ? 'action.hover' : 'grey.50' },
              }}
            >
              {/* Period Time Column */}
              <TableCell sx={{ verticalAlign: 'middle', borderRight: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {period.name || `Period ${period.number}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {period.start_time} - {period.end_time}
                </Typography>
                {period.is_break && (
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label="Recess" size="small" color="default" sx={{ height: 20 }} />
                  </Box>
                )}
              </TableCell>

              {/* Day Columns */}
              {activeWorkingDays.map((day) => {
                const slot = timetableData.entries?.find(
                  (e) => e.day_of_week === day.id && e.period_id === period.id
                );

                if (period.is_break) {
                  return (
                    <TableCell
                      key={day.id}
                      align="center"
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                        color: 'text.secondary',
                        fontStyle: 'italic',
                      }}
                    >
                      {period.name || 'Break / Recess'}
                    </TableCell>
                  );
                }

                return (
                  <TableCell
                    key={day.id}
                    align="center"
                    sx={{
                      p: 1.25,
                      border: 1,
                      borderColor: 'divider',
                      verticalAlign: 'top',
                    }}
                  >
                    {slot?.subject_name ? (
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          border: 1,
                          borderColor: 'divider',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          textAlign: 'left',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {slot.subject_name}
                          </Typography>
                          {slot.subject_code && (
                            <Chip
                              label={slot.subject_code}
                              size="small"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Instructor: {slot.teacher_name || 'Assigned Staff'}
                        </Typography>
                        {slot.room_number && (
                          <Typography variant="caption" color="text.disabled" display="block">
                            Room: {slot.room_number}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        Free
                      </Typography>
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
};

