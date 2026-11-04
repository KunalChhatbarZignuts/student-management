'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import TodayIcon from '@mui/icons-material/Today';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { timetableApi, timetableKeys } from '@/features/timetables/api';
import { TeacherSlotItem } from '@/features/timetables/types';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

export default function TeacherTimetablePage() {
  const [viewMode, setViewMode] = React.useState<number>(0); // 0 = Personal, 1 = Grade-wise
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);

  // Grade-wise selector states
  const [selectedGradeId, setSelectedGradeId] = React.useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');

  // 1. Personal Teaching Timetable Query
  const {
    data: personalData,
    isLoading: loadingPersonal,
    error: personalError,
    refetch: refetchPersonal,
  } = useQuery({
    queryKey: timetableKeys.teacherPersonal(undefined, selectedDate || undefined),
    queryFn: () => timetableApi.getTeacherPersonalSchedule(undefined, selectedDate || undefined),
  });

  // Grades for Grade-wise view
  const { data: gradesData } = useQuery({
    queryKey: gradeKeys.list({}),
    queryFn: () => adminGradeApi.listGrades({ size: 100 }),
  });

  const { data: gradeDetail } = useQuery({
    queryKey: gradeKeys.detail(selectedGradeId),
    queryFn: () => adminGradeApi.getGrade(selectedGradeId),
    enabled: !!selectedGradeId,
  });

  // 2. Grade-wise Timetable Query (with backend-computed is_current_teacher)
  const {
    data: gradeTimetable,
    isLoading: loadingGradeTimetable,
    error: gradeTimetableError,
    refetch: refetchGradeTimetable,
  } = useQuery({
    queryKey: timetableKeys.teacherGrade(selectedSectionId, selectedDate || undefined),
    queryFn: () => timetableApi.getTeacherGradeTimetable(selectedSectionId, selectedDate || undefined),
    enabled: !!selectedSectionId && viewMode === 1,
  });

  // Auto-select grade & section
  React.useEffect(() => {
    if (gradesData?.items && gradesData.items.length > 0 && !selectedGradeId) {
      setSelectedGradeId(gradesData.items[0].id);
    }
  }, [gradesData, selectedGradeId]);

  React.useEffect(() => {
    if (gradeDetail?.sections && gradeDetail.sections.length > 0) {
      setSelectedSectionId(gradeDetail.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  }, [gradeDetail]);

  // Transform personal slots into a day-period lookup map
  const personalSlotsByDayPeriod = React.useMemo(() => {
    const map: Record<string, TeacherSlotItem[]> = {};
    if (personalData?.slots) {
      for (const slot of personalData.slots) {
        const key = `${slot.day_of_week}_${slot.period_number}`;
        if (!map[key]) map[key] = [];
        map[key].push(slot);
      }
    }
    return map;
  }, [personalData]);

  // Unique period numbers from personal slots
  const personalPeriodNumbers = React.useMemo(() => {
    if (!personalData?.slots || personalData.slots.length === 0) return [1, 2, 3, 4, 5, 6];
    const nums = Array.from(new Set(personalData.slots.map((s) => s.period_number))).sort(
      (a, b) => a - b
    );
    return nums.length > 0 ? nums : [1, 2, 3, 4, 5, 6];
  }, [personalData]);

  const workingDays = React.useMemo(() => {
    if (personalData?.working_days && personalData.working_days.length > 0) {
      return DAYS_OF_WEEK.filter((d) => personalData.working_days.includes(d.label));
    }
    return DAYS_OF_WEEK.slice(0, 5);
  }, [personalData]);

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Timetable
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review your personal teaching schedule and explore full grade-wise timetables.
            </Typography>
          </Box>

          {/* Calendar Date Bar */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                type="date"
                label="Select Date Schedule"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 190 }}
              />
              <Button
                variant={selectedDate === todayStr ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </Button>
              <Button
                variant={!selectedDate ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedDate('')}
              >
                Entire Week
              </Button>
            </Box>

            {(personalData?.date_status || gradeTimetable?.date_status) && selectedDate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {(() => {
                  const ds = personalData?.date_status || gradeTimetable?.date_status;
                  if (!ds) return null;
                  return (
                    <Chip
                      label={
                        ds.is_working_day
                          ? (ds.day_type === 'special_working_day'
                              ? 'Compensatory Special Working Day'
                              : 'Regular School Day')
                          : (ds.day_type === 'weekly_off'
                              ? 'Weekly Off (Sunday)'
                              : `Holiday: ${ds.holiday_name || 'School Holiday'}`)
                      }
                      color={
                        ds.is_working_day
                          ? (ds.day_type === 'special_working_day' ? 'success' : 'primary')
                          : 'warning'
                      }
                      icon={ds.is_working_day ? <CheckCircleOutlineIcon /> : <EventBusyIcon />}
                      sx={{ fontWeight: 600 }}
                    />
                  );
                })()}
              </Box>
            )}
          </Paper>

          {/* View Mode Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2 }}>
            <Tabs
              value={viewMode}
              onChange={(_, val) => setViewMode(val)}
              indicatorColor="primary"
              textColor="primary"
              sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab
                label="Personal Teaching Schedule"
                icon={<PersonIcon />}
                iconPosition="start"
                sx={{ fontWeight: 600 }}
              />
              <Tab
                label="Complete Grade Timetable"
                icon={<SchoolIcon />}
                iconPosition="start"
                sx={{ fontWeight: 600 }}
              />
            </Tabs>
          </Paper>

          {/* VIEW 0: Personal Teaching Schedule */}
          {viewMode === 0 && (
            <Box>
              {/* Summary Stats */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Teacher Name
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {personalData?.teacher_name || 'Loading...'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Teaching Periods / Week
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="primary.main">
                        {personalData?.slots?.length || 0} Periods
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Working Days
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {workingDays.length} Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {personalError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to load personal timetable.
                </Alert>
              )}

              {loadingPersonal ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : selectedDate && personalData?.is_holiday ? (
                <Paper
                  sx={{
                    p: 5,
                    textAlign: 'center',
                    borderRadius: 2,
                    bgcolor: '#FFFDF0',
                    border: '1px solid #FFE082',
                    mb: 3,
                  }}
                >
                  <EventBusyIcon sx={{ fontSize: 64, color: '#F57C00', mb: 2 }} />
                  <Typography variant="h5" fontWeight={700} color="#E65100" gutterBottom>
                    {personalData.date_status?.holiday_name ||
                      (personalData.date_status?.day_type === 'weekly_off' ? 'Weekly Off (Sunday)' : 'School Holiday')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620, mx: 'auto', mb: 2 }}>
                    {personalData.date_status?.reason ||
                      'No regular teaching sessions scheduled on this date.'}
                  </Typography>
                  {personalData.date_status?.holiday_category && (
                    <Chip
                      label={personalData.date_status.holiday_category}
                      color="warning"
                      size="medium"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Paper>
              ) : personalData?.slots?.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Teaching Periods Assigned
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You currently have no periods assigned in published class timetables.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Period</TableCell>
                        {workingDays.map((d) => (
                          <TableCell key={d.id} align="center" sx={{ fontWeight: 700 }}>
                            {d.label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {personalPeriodNumbers.map((pNum) => (
                        <TableRow key={pNum} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                          <TableCell sx={{ fontWeight: 600, borderRight: 1, borderColor: 'divider' }}>
                            Period {pNum}
                          </TableCell>
                          {workingDays.map((d) => {
                            const key = `${d.id}_${pNum}`;
                            const slots = personalSlotsByDayPeriod[key] || [];

                            return (
                              <TableCell
                                key={d.id}
                                align="center"
                                sx={{
                                  p: 1,
                                  border: 1,
                                  borderColor: 'divider',
                                  verticalAlign: 'top',
                                }}
                              >
                                {slots.length > 0 ? (
                                  slots.map((s) => (
                                    <Box
                                      key={s.id}
                                      sx={{
                                        p: 1.25,
                                        mb: slots.length > 1 ? 1 : 0,
                                        borderRadius: 1.5,
                                        bgcolor: 'primary.50',
                                        border: 1,
                                        borderColor: 'primary.200',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <Typography variant="body2" fontWeight={700} color="primary.main">
                                        {s.subject_name || 'Subject'}
                                      </Typography>
                                      <Typography variant="caption" fontWeight={600} display="block" color="text.primary">
                                        {s.grade_name} - {s.section_name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        {s.start_time} - {s.end_time}
                                      </Typography>
                                      {s.room_number && (
                                        <Typography variant="caption" color="text.disabled" display="block">
                                          Room: {s.room_number}
                                        </Typography>
                                      )}
                                    </Box>
                                  ))
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
              )}
            </Box>
          )}

          {/* VIEW 1: Complete Grade Timetable with Teacher Highlights */}
          {viewMode === 1 && (
            <Box>
              {/* Selectors */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="grade-sel-label">Grade</InputLabel>
                      <Select
                        labelId="grade-sel-label"
                        value={selectedGradeId}
                        label="Grade"
                        onChange={(e) => setSelectedGradeId(e.target.value)}
                      >
                        {gradesData?.items?.map((g) => (
                          <MenuItem key={g.id} value={g.id}>
                            {g.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="sec-sel-label">Section</InputLabel>
                      <Select
                        labelId="sec-sel-label"
                        value={selectedSectionId}
                        label="Section"
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                      >
                        {gradeDetail?.sections?.map((sec) => (
                          <MenuItem key={sec.id} value={sec.id}>
                            {sec.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4} sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => refetchGradeTimetable()}
                      size="small"
                    >
                      Refresh
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Legend Banner */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip
                  icon={<StarIcon sx={{ color: 'primary.contrastText !important' }} />}
                  label="Your Assigned Classes (Highlighted)"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
                <Chip label="Other Classes" variant="outlined" />
                <Chip label="Recess / Break" color="default" />
              </Box>

              {gradeTimetableError && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Timetable has not been published for this section yet.
                </Alert>
              )}

              {loadingGradeTimetable ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : selectedDate && gradeTimetable?.is_holiday ? (
                <Paper
                  sx={{
                    p: 5,
                    textAlign: 'center',
                    borderRadius: 2,
                    bgcolor: '#FFFDF0',
                    border: '1px solid #FFE082',
                    mb: 3,
                  }}
                >
                  <EventBusyIcon sx={{ fontSize: 64, color: '#F57C00', mb: 2 }} />
                  <Typography variant="h5" fontWeight={700} color="#E65100" gutterBottom>
                    {gradeTimetable.date_status?.holiday_name ||
                      (gradeTimetable.date_status?.day_type === 'weekly_off' ? 'Weekly Off (Sunday)' : 'School Holiday')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620, mx: 'auto', mb: 2 }}>
                    {gradeTimetable.date_status?.reason ||
                      'No regular classes scheduled for this grade on this date.'}
                  </Typography>
                  {gradeTimetable.date_status?.holiday_category && (
                    <Chip
                      label={gradeTimetable.date_status.holiday_category}
                      color="warning"
                      size="medium"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Paper>
              ) : !gradeTimetable ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    Please select a Grade and Section above to view its timetable.
                  </Typography>
                </Paper>
              ) : (
                /* Matrix Grid for Grade */
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Period / Time</TableCell>
                        {gradeTimetable.working_days?.map((dayName, idx) => (
                          <TableCell key={idx} align="center" sx={{ fontWeight: 700 }}>
                            {dayName}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gradeTimetable.periods?.map((period) => (
                        <TableRow
                          key={period.id}
                          sx={{
                            bgcolor: period.is_break ? 'action.hover' : 'inherit',
                          }}
                        >
                          <TableCell sx={{ borderRight: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {period.name || `Period ${period.number}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {period.start_time} - {period.end_time}
                            </Typography>
                          </TableCell>

                          {gradeTimetable.working_days?.map((dayName) => {
                            const dayObj = DAYS_OF_WEEK.find((d) => d.label === dayName);
                            const dayId = dayObj ? dayObj.id : 1;
                            const slot = gradeTimetable.entries?.find(
                              (e) => e.day_of_week === dayId && e.period_id === period.id
                            );

                            if (period.is_break) {
                              return (
                                <TableCell
                                  key={dayName}
                                  align="center"
                                  sx={{
                                    bgcolor: 'rgba(0,0,0,0.03)',
                                    color: 'text.secondary',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  {period.name || 'Break'}
                                </TableCell>
                              );
                            }

                            const isMine = slot?.is_current_teacher === true;

                            return (
                              <TableCell
                                key={dayName}
                                align="center"
                                sx={{
                                  p: 1,
                                  border: 1,
                                  borderColor: isMine ? 'primary.main' : 'divider',
                                  bgcolor: isMine ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                                }}
                              >
                                {slot?.subject_name ? (
                                  <Box
                                    sx={{
                                      p: 1,
                                      borderRadius: 1.5,
                                      bgcolor: isMine ? 'primary.light' : 'grey.100',
                                      color: isMine ? 'primary.contrastText' : 'text.primary',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography variant="body2" fontWeight={700}>
                                        {slot.subject_name}
                                      </Typography>
                                      {isMine && (
                                        <Chip
                                          label="You"
                                          size="small"
                                          color="primary"
                                          sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'primary.dark' }}
                                        />
                                      )}
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      sx={{ color: isMine ? 'white' : 'text.secondary' }}
                                    >
                                      {slot.teacher_name || 'Staff'}
                                    </Typography>
                                    {slot.room_number && (
                                      <Typography
                                        variant="caption"
                                        display="block"
                                        sx={{ color: isMine ? 'rgba(255,255,255,0.8)' : 'text.disabled' }}
                                      >
                                        Room: {slot.room_number}
                                      </Typography>
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">
                                    -
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
              )}
            </Box>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}

