'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { TimetableDetail } from '../types';

interface DailyScheduleViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  todayStr: string;
  timetableData?: TimetableDetail;
}

export const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  selectedDate,
  onDateChange,
  todayStr,
  timetableData,
}) => {
  return (
    <Box>
      {/* Date Selector Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            type="date"
            label="Select Date"
            size="small"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          />
          <Button
            variant={selectedDate === todayStr ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onDateChange(todayStr)}
          >
            Today
          </Button>
        </Box>

        {timetableData?.date_status && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            />
          </Box>
        )}
      </Paper>

      {/* Holiday / Sunday Suppression Card */}
      {timetableData?.is_holiday ? (
        <Paper
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 2,
            bgcolor: '#FFFDF0',
            border: '1px solid #FFE082',
            mb: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <EventBusyIcon sx={{ fontSize: 64, color: '#F57C00', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} color="#E65100" gutterBottom>
            {timetableData.date_status?.holiday_name ||
              (timetableData.date_status?.day_type === 'weekly_off'
                ? 'Weekly Off (Sunday)'
                : 'School Holiday')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 620, mx: 'auto', mb: 2 }}
          >
            {timetableData.date_status?.reason ||
              'No regular classes or teaching sessions scheduled on this date.'}
          </Typography>
          {timetableData.date_status?.holiday_category && (
            <Chip
              label={timetableData.date_status.holiday_category}
              color="warning"
              size="medium"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Paper>
      ) : (
        /* Daily Class List */
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, overflowX: 'auto', boxShadow: 2 }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'primary.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 140, color: 'primary.dark' }}>
                  Period
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160, color: 'primary.dark' }}>
                  Time
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  Subject
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  Teacher
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140, color: 'primary.dark' }}>
                  Room
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timetableData?.periods?.map((period) => {
                const slot = timetableData.entries?.find((e) => e.period_id === period.id);

                if (period.is_break) {
                  return (
                    <TableRow key={period.id} sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {period.name || `Break`}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {period.start_time} - {period.end_time}
                      </TableCell>
                      <TableCell
                        colSpan={3}
                        sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                      >
                        {period.name || 'Break / Recess'}
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={period.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {period.name || `Period ${period.number}`}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {period.start_time} - {period.end_time}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {slot?.subject_name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {slot.subject_name}
                          </Typography>
                          {slot.subject_code && (
                            <Chip
                              label={slot.subject_code}
                              size="small"
                              sx={{ height: 20 }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          Free Period
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {slot?.teacher_name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2">{slot.teacher_name}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{slot?.room_number || '-'}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

