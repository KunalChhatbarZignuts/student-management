import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { WorkOutline, EventBusy, Weekend } from '@mui/icons-material';
import { Dayjs } from 'dayjs';
import { MonthlyCalendarResponse } from '@/features/calendar/types';

export interface CalendarSummaryCardsProps {
  selectedDate: Dayjs;
  monthCalendar?: MonthlyCalendarResponse | null;
}

export const CalendarSummaryCards: React.FC<CalendarSummaryCardsProps> = ({
  selectedDate,
  monthCalendar,
}) => {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {selectedDate.format('MMMM YYYY')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Chip
            icon={<WorkOutline />}
            label={`Working Days: ${monthCalendar?.working_days ?? 0}`}
            color="success"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<EventBusy />}
            label={`Holidays: ${monthCalendar?.holidays ?? 0}`}
            color="error"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<Weekend />}
            label={`Weekly Offs: ${monthCalendar?.weekly_offs ?? 0}`}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`Total Days: ${monthCalendar?.total_days ?? 0}`}
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

