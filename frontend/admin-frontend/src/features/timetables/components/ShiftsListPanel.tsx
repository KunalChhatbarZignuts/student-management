'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';

import AddIcon from '@mui/icons-material/Add';

import { Shift } from '@/features/timetables/types';

export interface ShiftsListPanelProps {
  shiftsList: Shift[];
  selectedShiftId: string;
  onSelectShift: (id: string) => void;
  onOpenCreateShift: () => void;
}

export default function ShiftsListPanel({
  shiftsList,
  selectedShiftId,
  onSelectShift,
  onOpenCreateShift,
}: ShiftsListPanelProps) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          School Shifts
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onOpenCreateShift}
        >
          New Shift
        </Button>
      </Box>

      <Stack spacing={1.5}>
        {shiftsList.map((shift) => (
          <Card
            key={shift.id}
            variant={selectedShiftId === shift.id ? 'elevation' : 'outlined'}
            sx={{
              cursor: 'pointer',
              borderColor: selectedShiftId === shift.id ? 'primary.main' : 'divider',
              borderWidth: selectedShiftId === shift.id ? 2 : 1,
            }}
            onClick={() => onSelectShift(shift.id)}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {shift.name}
                </Typography>
                <Chip
                  label={shift.status}
                  size="small"
                  color={shift.status === 'active' ? 'success' : 'default'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Timings: {shift.start_time} - {shift.end_time}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Working Days: {shift.working_days || 'Monday-Friday'}
              </Typography>
              <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ mt: 0.5, display: 'block' }}>
                {shift.periods?.length || 0} periods configured
              </Typography>

              {shift.assigned_grade_names && shift.assigned_grade_names.length > 0 ? (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Grades:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {shift.assigned_grade_names.map((gname, idx) => (
                      <Chip
                        key={idx}
                        label={gname}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  No grades assigned yet
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Paper>
  );
}

