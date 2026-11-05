import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import {
  EventBusy,
  Weekend,
  InfoOutlined,
  CancelOutlined,
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { DayCalendarSkeleton } from '@mui/x-date-pickers/DayCalendarSkeleton';
import { Dayjs } from 'dayjs';

import { MonthlyCalendarDay } from '@/features/calendar/types';

interface CustomDayProps extends PickersDayProps<Dayjs> {
  daysMap?: Record<string, MonthlyCalendarDay>;
}

function CustomCalendarDay(props: CustomDayProps) {
  const { daysMap = {}, day, outsideCurrentMonth, ...other } = props;
  const dateStr = day.format('YYYY-MM-DD');
  const dayInfo = daysMap[dateStr];

  const isHoliday = dayInfo?.day_type === 'holiday';
  const isWeeklyOff = dayInfo?.day_type === 'weekly_off';
  const isSpecial = dayInfo?.day_type === 'special_working_day';

  return (
    <Tooltip
      title={
        dayInfo && !outsideCurrentMonth
          ? `${dayInfo.date} (${dayInfo.day_name}): ${
              isHoliday
                ? dayInfo.label || 'Holiday'
                : isWeeklyOff
                  ? 'Weekly Off'
                  : isSpecial
                    ? dayInfo.label || 'Compensatory Working Day'
                    : 'Normal Working Day'
            }`
          : ''
      }
      arrow
      disableHoverListener={outsideCurrentMonth}
    >
      <Badge
        key={day.toString()}
        overlap="circular"
        badgeContent={
          outsideCurrentMonth ? undefined : isHoliday ? (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'error.main',
                border: '1.5px solid #fff',
              }}
            />
          ) : isSpecial ? (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'warning.main',
                border: '1.5px solid #fff',
              }}
            />
          ) : isWeeklyOff ? (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'text.disabled',
                border: '1.5px solid #fff',
              }}
            />
          ) : undefined
        }
      >
        <PickersDay
          {...other}
          outsideCurrentMonth={outsideCurrentMonth}
          day={day}
          sx={{
            fontWeight: isHoliday || isSpecial ? 700 : 500,
            ...(isHoliday &&
              !outsideCurrentMonth && {
                color: 'error.main',
                bgcolor: 'rgba(211, 47, 47, 0.08)',
                '&:hover': {
                  bgcolor: 'rgba(211, 47, 47, 0.18)',
                },
              }),
            ...(isWeeklyOff &&
              !outsideCurrentMonth && {
                color: 'text.secondary',
                bgcolor: 'rgba(0, 0, 0, 0.03)',
              }),
            ...(isSpecial &&
              !outsideCurrentMonth && {
                color: 'warning.dark',
                bgcolor: 'rgba(237, 108, 2, 0.12)',
                '&:hover': {
                  bgcolor: 'rgba(237, 108, 2, 0.22)',
                },
              }),
          }}
        />
      </Badge>
    </Tooltip>
  );
}

export interface CalendarMonthViewProps {
  selectedDate: Dayjs;
  onSelectDate: (date: Dayjs) => void;
  isLoadingCalendar: boolean;
  daysMap: Record<string, MonthlyCalendarDay>;
  selectedDayDetails: MonthlyCalendarDay | null;
  isAdmin: boolean;
  onOpenAddHoliday: (presetDate?: string) => void;
  onOpenCompensatory: (presetDate?: string) => void;
  onCancelHolidayByLabel: (label: string) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  selectedDate,
  onSelectDate,
  isLoadingCalendar,
  daysMap,
  selectedDayDetails,
  isAdmin,
  onOpenAddHoliday,
  onOpenCompensatory,
  onCancelHolidayByLabel,
}) => {
  return (
    <Grid container spacing={3}>
      {/* Left: Official MUI DateCalendar */}
      <Grid item xs={12} md={7} lg={7}>
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <DateCalendar
            value={selectedDate}
            onChange={(newVal) => {
              if (newVal) {
                onSelectDate(newVal);
              }
            }}
            onMonthChange={(newMonth) => {
              onSelectDate(newMonth);
            }}
            loading={isLoadingCalendar}
            renderLoading={() => <DayCalendarSkeleton />}
            slots={{
              day: CustomCalendarDay,
            }}
            slotProps={{
              day: {
                daysMap,
              } as any,
            }}
            sx={{
              width: '100%',
              maxWidth: 500,
              '& .MuiPickersCalendarHeader-root': {
                px: 2,
              },
              '& .MuiDayCalendar-header': {
                justifyContent: 'space-around',
              },
              '& .MuiDayCalendar-weekContainer': {
                justifyContent: 'space-around',
                my: 0.5,
              },
              '& .MuiPickersDay-root': {
                width: 44,
                height: 44,
                fontSize: '0.95rem',
              },
            }}
          />

          {/* Legend */}
          <Divider sx={{ width: '100%', my: 2 }} />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 3,
              flexWrap: 'wrap',
              pb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                }}
              />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Holiday / Vacation
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                }}
              />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Compensatory Day
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'text.disabled',
                }}
              />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Weekly Off
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                }}
              />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Working Day
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* Right: Selected Day Details & Quick Actions */}
      <Grid item xs={12} md={5} lg={5}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
          >
            <InfoOutlined color="primary" />
            Day Information
          </Typography>

          <Box sx={{ mb: 2.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {selectedDate.format('dddd, D MMMM YYYY')}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={
                  selectedDayDetails?.day_type === 'holiday'
                    ? 'Official Holiday / Vacation'
                    : selectedDayDetails?.day_type === 'weekly_off'
                      ? 'Weekly Off'
                      : selectedDayDetails?.day_type === 'special_working_day'
                        ? 'Compensatory Working Day'
                        : 'Normal Working Day'
                }
                color={
                  selectedDayDetails?.day_type === 'holiday'
                    ? 'error'
                    : selectedDayDetails?.day_type === 'special_working_day'
                      ? 'warning'
                      : selectedDayDetails?.day_type === 'working_day'
                        ? 'success'
                        : 'default'
                }
                sx={{ fontWeight: 600 }}
              />
              {selectedDayDetails?.category_name && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={selectedDayDetails.category_name}
                />
              )}
            </Box>
          </Box>

          {selectedDayDetails?.label && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                TITLE / EVENT REASON
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                {selectedDayDetails.label}
              </Typography>
              {!selectedDayDetails.is_school_wide && (
                <Chip
                  size="small"
                  variant="outlined"
                  label="Specific Grades Only"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              ATTENDANCE RECORDING
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={selectedDayDetails?.is_working_day ? 'success.main' : 'error.main'}
              sx={{ mt: 0.5 }}
            >
              {selectedDayDetails?.is_working_day
                ? '✓ Enabled — Regular class attendance is recorded.'
                : '✗ Disabled — Non-working day (excluded from student attendance calculations).'}
            </Typography>
          </Box>

          {isAdmin && (
            <Box
              sx={{
                mt: 'auto',
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {selectedDayDetails?.is_working_day && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<EventBusy />}
                  onClick={() => onOpenAddHoliday(selectedDate.format('YYYY-MM-DD'))}
                >
                  Declare Holiday on this Date
                </Button>
              )}
              {selectedDayDetails?.day_type === 'weekly_off' && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="warning"
                  startIcon={<Weekend />}
                  onClick={() => onOpenCompensatory(selectedDate.format('YYYY-MM-DD'))}
                >
                  Set as Compensatory Working Day
                </Button>
              )}
              {selectedDayDetails?.day_type === 'holiday' && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<CancelOutlined />}
                  onClick={() => {
                    if (selectedDayDetails.label) {
                      onCancelHolidayByLabel(selectedDayDetails.label);
                    }
                  }}
                >
                  Cancel Holiday
                </Button>
              )}
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

