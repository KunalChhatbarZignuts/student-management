'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';

import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import SchoolIcon from '@mui/icons-material/School';

export interface TeacherTimetableTabProps {
  timetable: any[];
}

export default function TeacherTimetableTab({ timetable = [] }: TeacherTimetableTabProps) {
  const [timetableMode, setTimetableMode] = React.useState<'calendar' | 'table'>('calendar');

  const teacherTimetableDays = React.useMemo(() => {
    const defaultDays = [
      { key: 'MONDAY', label: 'Monday' },
      { key: 'TUESDAY', label: 'Tuesday' },
      { key: 'WEDNESDAY', label: 'Wednesday' },
      { key: 'THURSDAY', label: 'Thursday' },
      { key: 'FRIDAY', label: 'Friday' },
      { key: 'SATURDAY', label: 'Saturday' },
    ];
    if (!timetable?.length) return defaultDays.slice(0, 5);
    const hasSat = timetable.some((s) => s.day_of_week?.toUpperCase() === 'SATURDAY');
    const hasSun = timetable.some((s) => s.day_of_week?.toUpperCase() === 'SUNDAY');
    let list = hasSat ? defaultDays : defaultDays.slice(0, 5);
    if (hasSun) list = [...list, { key: 'SUNDAY', label: 'Sunday' }];
    return list;
  }, [timetable]);

  const teacherTimetablePeriods = React.useMemo(() => {
    if (!timetable?.length) return [];
    const map = new Map<string, { period_name: string; start_time: string; end_time: string; sort_key: number }>();
    timetable.forEach((s) => {
      const key = s.period_name || `${s.start_time}-${s.end_time}`;
      if (!map.has(key)) {
        const timeParts = (s.start_time || '00:00').split(':').map(Number);
        const sortKey = (timeParts[0] || 0) * 60 + (timeParts[1] || 0);
        map.set(key, {
          period_name: s.period_name || 'Period',
          start_time: s.start_time || '',
          end_time: s.end_time || '',
          sort_key: sortKey,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.sort_key - b.sort_key);
  }, [timetable]);

  const teacherSlotsByDayPeriod = React.useMemo(() => {
    const lookup: Record<string, any[]> = {};
    (timetable || []).forEach((s) => {
      const dKey = s.day_of_week?.toUpperCase() || '';
      const pKey = s.period_name || `${s.start_time}-${s.end_time}`;
      const composite = `${dKey}__${pKey}`;
      if (!lookup[composite]) {
        lookup[composite] = [];
      }
      lookup[composite].push(s);
    });
    return lookup;
  }, [timetable]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Teaching Schedule</Typography>
                <Typography variant="body2" color="text.secondary">
                  {timetable?.length || 0} teaching periods scheduled across classes
                </Typography>
              </Box>

              {timetable && timetable.length > 0 && (
                <ToggleButtonGroup
                  value={timetableMode}
                  exclusive
                  size="small"
                  onChange={(_, next) => {
                    if (next !== null) setTimetableMode(next);
                  }}
                  aria-label="timetable view mode"
                >
                  <ToggleButton value="calendar" sx={{ px: 1.5, py: 0.5, textTransform: 'none', fontWeight: 600 }}>
                    <CalendarViewWeekIcon sx={{ fontSize: 18, mr: 0.75 }} />
                    Calendar View
                  </ToggleButton>
                  <ToggleButton value="table" sx={{ px: 1.5, py: 0.5, textTransform: 'none', fontWeight: 600 }}>
                    <ViewListIcon sx={{ fontSize: 18, mr: 0.75 }} />
                    Table View
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>

            {timetable && timetable.length > 0 ? (
              timetableMode === 'calendar' ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 860, borderCollapse: 'separate', borderSpacing: 0 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, width: 140, borderRight: 1, borderColor: 'divider', py: 1.5 }}>
                          Period / Time
                        </TableCell>
                        {teacherTimetableDays.map((d) => (
                          <TableCell
                            key={d.key}
                            align="center"
                            sx={{ fontWeight: 700, py: 1.5, borderRight: 1, borderColor: 'divider' }}
                          >
                            {d.label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teacherTimetablePeriods.map((period) => (
                        <TableRow key={period.period_name} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell
                            sx={{
                              bgcolor: 'action.hover',
                              borderRight: 1,
                              borderColor: 'divider',
                              verticalAlign: 'middle',
                              py: 1.5,
                              px: 1.5,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {period.period_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <AccessTimeIcon sx={{ fontSize: 12 }} />
                              {period.start_time} - {period.end_time}
                            </Typography>
                          </TableCell>

                          {teacherTimetableDays.map((d) => {
                            const slots = teacherSlotsByDayPeriod[`${d.key}__${period.period_name}`] || [];
                            return (
                              <TableCell
                                key={d.key}
                                sx={{
                                  p: 1,
                                  borderRight: 1,
                                  borderColor: 'divider',
                                  verticalAlign: 'top',
                                  bgcolor: slots.length > 0 ? 'background.paper' : 'action.selected',
                                  width: `${100 / (teacherTimetableDays.length + 1)}%`,
                                }}
                              >
                                {slots.length > 0 ? (
                                  <Stack spacing={1}>
                                    {slots.map((s: any, idx: number) => (
                                      <Box
                                        key={s.id || idx}
                                        sx={{
                                          p: 1.25,
                                          borderRadius: 1.5,
                                          bgcolor: 'success.50',
                                          border: '1px solid',
                                          borderColor: 'success.light',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5, mb: 0.5 }}>
                                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.2 }}>
                                            {s.subject_name}
                                          </Typography>
                                          {s.subject_code && (
                                            <Chip
                                              label={s.subject_code}
                                              size="small"
                                              sx={{
                                                height: 18,
                                                fontSize: '0.625rem',
                                                fontWeight: 700,
                                              }}
                                            />
                                          )}
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                          <SchoolIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                          <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.725rem' }}>
                                            {s.grade_name} - {s.section_name}
                                          </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                                          {s.room_number ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              <MeetingRoomIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                                {s.room_number.toLowerCase().includes('room') ? s.room_number : `Room ${s.room_number}`}
                                              </Typography>
                                            </Box>
                                          ) : <Box />}

                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                            <AccessTimeIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.675rem' }}>
                                              {s.start_time} - {s.end_time}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                    ))}
                                  </Stack>
                                ) : (
                                  <Box
                                    sx={{
                                      height: '100%',
                                      minHeight: 70,
                                      borderRadius: 1.5,
                                      border: '1px dashed #E0E0E0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.7rem' }}>
                                      Free
                                    </Typography>
                                  </Box>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Day of Week</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Period Slot</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Class / Section</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timetable.map((slot: any, idx: number) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{slot.day_of_week}</TableCell>
                          <TableCell>{slot.period_name}</TableCell>
                          <TableCell>{slot.start_time} - {slot.end_time}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{slot.grade_name} - {slot.section_name}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{slot.subject_name}</TableCell>
                          <TableCell>{slot.room_number || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            ) : (
              <Alert severity="info">No published timetable slots currently assigned to this teacher.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

