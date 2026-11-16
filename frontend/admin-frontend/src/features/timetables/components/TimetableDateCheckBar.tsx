'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';

import TodayIcon from '@mui/icons-material/Today';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventBusyIcon from '@mui/icons-material/EventBusy';

import { TimetableDetail } from '@/features/timetables/types';

export interface TimetableDateCheckBarProps {
  previewDate: string;
  onPreviewDateChange: (val: string) => void;
  timetableData?: TimetableDetail | null;
}

export default function TimetableDateCheckBar({
  previewDate,
  onPreviewDateChange,
  timetableData,
}: TimetableDateCheckBarProps) {
  return (
    <>
      <Paper
        sx={{
          p: 1.5,
          mb: 2,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TodayIcon color="action" fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            Calendar Date Check:
          </Typography>
          <TextField
            type="date"
            size="small"
            value={previewDate}
            onChange={(e) => onPreviewDateChange(e.target.value)}
            sx={{ width: 170 }}
          />
          {previewDate && (
            <Button size="small" variant="text" onClick={() => onPreviewDateChange('')}>
              Clear
            </Button>
          )}
        </Box>

        {timetableData?.date_status && previewDate && (
          <Chip
            label={
              timetableData.date_status.is_working_day
                ? timetableData.date_status.day_type === 'special_working_day'
                  ? 'Compensatory Special Working Day'
                  : 'Regular School Day'
                : timetableData.date_status.day_type === 'weekly_off'
                ? 'Weekly Off (Sunday)'
                : `Holiday: ${timetableData.date_status.holiday_name || 'School Holiday'}`
            }
            color={
              timetableData.date_status.is_working_day
                ? timetableData.date_status.day_type === 'special_working_day'
                  ? 'success'
                  : 'primary'
                : 'warning'
            }
            icon={
              timetableData.date_status.is_working_day ? (
                <CheckCircleOutlineIcon />
              ) : (
                <EventBusyIcon />
              )
            }
            sx={{ fontWeight: 600 }}
            size="small"
          />
        )}
      </Paper>

      {previewDate && timetableData?.is_holiday && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Notice:</strong> The selected date ({previewDate}) is marked as a{' '}
          {timetableData.date_status?.day_type === 'weekly_off'
            ? 'Weekly Off (Sunday)'
            : 'School Holiday'}{' '}
          ({timetableData.date_status?.holiday_name || 'Holiday'}). Regular classes are automatically
          suspended on this date.
        </Alert>
      )}
    </>
  );
}
