'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import BadgeIcon from '@mui/icons-material/Badge';
import SchoolIcon from '@mui/icons-material/School';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { ROLES } from '@/lib/constants';
import { adminTeacherApi, teacherKeys } from '@/features/teachers/api';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`teacher-details-tabpanel-${index}`}
      aria-labelledby={`teacher-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function TeacherDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const [currentTab, setCurrentTab] = React.useState(0);

  const {
    data: teacherData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: teacherKeys.details(teacherId),
    queryFn: () => adminTeacherApi.getTeacherComprehensiveDetails(teacherId),
    enabled: Boolean(teacherId),
  });

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
    if (!teacherData?.timetable?.length) return defaultDays.slice(0, 5);
    const hasSat = teacherData.timetable.some((s) => s.day_of_week?.toUpperCase() === 'SATURDAY');
    const hasSun = teacherData.timetable.some((s) => s.day_of_week?.toUpperCase() === 'SUNDAY');
    let list = hasSat ? defaultDays : defaultDays.slice(0, 5);
    if (hasSun) list = [...list, { key: 'SUNDAY', label: 'Sunday' }];
    return list;
  }, [teacherData?.timetable]);

  const teacherTimetablePeriods = React.useMemo(() => {
    if (!teacherData?.timetable?.length) return [];
    const map = new Map<string, { period_name: string; start_time: string; end_time: string; sort_key: number }>();
    teacherData.timetable.forEach((s) => {
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
  }, [teacherData?.timetable]);

  const teacherSlotsByDayPeriod = React.useMemo(() => {
    const lookup: Record<string, NonNullable<typeof teacherData>['timetable']> = {};
    (teacherData?.timetable || []).forEach((s) => {
      const dKey = s.day_of_week?.toUpperCase() || '';
      const pKey = s.period_name || `${s.start_time}-${s.end_time}`;
      const composite = `${dKey}__${pKey}`;
      if (!lookup[composite]) {
        lookup[composite] = [];
      }
      lookup[composite].push(s);
    });
    return lookup;
  }, [teacherData?.timetable]);

  const p = teacherData?.profile;
  const wl = teacherData?.workload;
  const ct = teacherData?.class_teacher_role;

  const initials = p ? `${p.first_name[0] || ''}${p.last_name[0] || ''}`.toUpperCase() : 'TC';

  return (
    <RequireRole roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
          {/* Top Navigation & Back Action */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/teachers')}
              sx={{ textTransform: 'none' }}
            >
              Back to Teachers
            </Button>
            <Typography variant="body2" color="text.secondary">
              Teacher ID: <code style={{ fontWeight: 600 }}>{teacherId}</code>
            </Typography>
          </Box>

          {/* Loading and Error States */}
          {isLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
              <CircularProgress size={48} />
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading comprehensive teacher profile...
              </Typography>
            </Box>
          )}

          {isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Retry
                </Button>
              }
              sx={{ my: 4 }}
            >
              {(error as any)?.response?.data?.detail || 'Failed to load teacher details.'}
            </Alert>
          )}

          {teacherData && p && (
            <>
              {/* Profile Header Card */}
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  mb: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(46, 125, 50, 0.01) 100%)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm="auto">
                    <Avatar
                      sx={{
                        width: { xs: 72, md: 96 },
                        height: { xs: 72, md: 96 },
                        bgcolor: 'success.main',
                        fontSize: { xs: '1.75rem', md: '2.25rem' },
                        fontWeight: 700,
                        boxShadow: 2,
                      }}
                    >
                      {initials}
                    </Avatar>
                  </Grid>

                  <Grid item xs={12} sm>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                        {p.first_name} {p.last_name}
                      </Typography>
                      <Chip
                        label={p.user_status ? p.user_status.toUpperCase() : 'ACTIVE'}
                        color={
                          p.user_status === 'active'
                            ? 'success'
                            : p.user_status === 'invited'
                              ? 'warning'
                              : 'default'
                        }
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        icon={<BusinessIcon fontSize="small" />}
                        label={p.department || 'Faculty'}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                      {ct && (
                        <Chip
                          icon={<SchoolIcon fontSize="small" />}
                          label={`Class Teacher: ${ct.grade_name} - ${ct.section_name}`}
                          color="secondary"
                          size="small"
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Employee Code: <strong>{p.employee_code}</strong> • Faculty Member since <strong>{new Date(p.created_at).toLocaleDateString()}</strong>
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {p.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" sx={{ color: 'success.main', fontSize: 18 }} />
                          <span>{p.email}</span>
                        </Box>
                      )}
                      {p.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" sx={{ color: 'success.main', fontSize: 18 }} />
                          <span>{p.phone}</span>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BadgeIcon fontSize="small" sx={{ color: 'success.main', fontSize: 18 }} />
                        <span>Weekly Workload: <strong>{wl?.total_weekly_periods || 0} periods</strong></span>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>

              {/* Navigation Tabs */}
              <Paper elevation={1} sx={{ borderRadius: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                  <Tabs
                    value={currentTab}
                    onChange={(_, val) => setCurrentTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Teacher details tabs"
                  >
                    <Tab icon={<PersonIcon />} iconPosition="start" label="Overview & Profile" />
                    <Tab icon={<MenuBookIcon />} iconPosition="start" label={`Assigned Subjects (${teacherData.subject_allocations.length})`} />
                    <Tab icon={<CalendarMonthIcon />} iconPosition="start" label={`Weekly Timetable (${teacherData.timetable.length})`} />
                    <Tab icon={<HowToRegIcon />} iconPosition="start" label="Attendance Marked" />
                  </Tabs>
                </Box>

                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  {/* TAB 0: OVERVIEW & PROFILE */}
                  <TabPanel value={currentTab} index={0}>
                    <Grid container spacing={3}>
                      {/* Workload Metric Cards */}
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
                          <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">Assigned Subjects</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {wl?.total_assigned_subjects || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">Assigned Sections</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                {wl?.total_assigned_sections || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">Weekly Teaching Periods</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                                {wl?.total_weekly_periods || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" color="text.secondary">Class Teacher Role</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {ct ? `${ct.grade_name} (${ct.section_name})` : 'None Assigned'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Professional Details Card */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <BadgeIcon color="primary" fontSize="small" /> Professional Identification
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Employee Code</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{p.employee_code}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Department / Faculty</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.department}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Official Email</Typography>
                                <Typography variant="body1">{p.email || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                                <Typography variant="body1">{p.phone || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Account Active</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                  <Chip label={p.is_active ? 'ACTIVE' : 'INACTIVE'} color={p.is_active ? 'success' : 'error'} size="small" />
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Joined Date</Typography>
                                <Typography variant="body1">{new Date(p.created_at).toLocaleDateString()}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Class Teacher Duties Card */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SchoolIcon color="primary" fontSize="small" /> Class Teacher Responsibilities
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {ct ? (
                              <Grid container spacing={2}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Assigned Grade</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{ct.grade_name}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Assigned Section</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{ct.section_name}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                                  <Typography variant="body1">{ct.academic_year_name || 'Current Year'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Designation</Typography>
                                  <Typography variant="body1">{ct.role}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Alert severity="success" sx={{ mt: 1 }}>
                                    This teacher has full Class Teacher oversight, including reviewing and approving student leave applications for this section.
                                  </Alert>
                                </Grid>
                              </Grid>
                            ) : (
                              <Box sx={{ py: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  This faculty member is not currently assigned as a primary Class Teacher for any section.
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* TAB 1: ASSIGNED SUBJECTS & CLASSES */}
                  <TabPanel value={currentTab} index={1}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Subject Allocations across Grades & Sections</Typography>
                            {teacherData.subject_allocations && teacherData.subject_allocations.length > 0 ? (
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600 }}>Subject Name</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Subject Code</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {teacherData.subject_allocations.map((alloc) => (
                                      <TableRow key={alloc.id}>
                                        <TableCell sx={{ fontWeight: 500 }}>{alloc.subject_name}</TableCell>
                                        <TableCell>
                                          <Chip label={alloc.subject_code} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>{alloc.grade_name}</TableCell>
                                        <TableCell>{alloc.section_name}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={alloc.status.toUpperCase()}
                                            size="small"
                                            color={alloc.status === 'active' ? 'success' : 'default'}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Alert severity="info">No subject assignments currently configured for this teacher.</Alert>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* TAB 2: WEEKLY TIMETABLE */}
                  <TabPanel value={currentTab} index={2}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Teaching Schedule</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {teacherData.timetable?.length || 0} teaching periods scheduled across classes
                                </Typography>
                              </Box>

                              {teacherData.timetable && teacherData.timetable.length > 0 && (
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

                            {teacherData.timetable && teacherData.timetable.length > 0 ? (
                              timetableMode === 'calendar' ? (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                                  <Table sx={{ minWidth: 860, borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <TableHead>
                                      <TableRow sx={{ bgcolor: 'grey.50' }}>
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
                                              bgcolor: 'grey.50',
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
                                                  bgcolor: slots.length > 0 ? 'background.paper' : 'grey.25',
                                                  width: `${100 / (teacherTimetableDays.length + 1)}%`,
                                                }}
                                              >
                                                {slots.length > 0 ? (
                                                  <Stack spacing={1}>
                                                    {slots.map((s, idx) => (
                                                      <Box
                                                        key={s.id || idx}
                                                        sx={{
                                                          p: 1.25,
                                                          borderRadius: 1.5,
                                                          bgcolor: '#F3F8F2',
                                                          border: '1px solid #C8E6C9',
                                                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                          transition: 'all 0.15s ease-in-out',
                                                          '&:hover': {
                                                            boxShadow: '0 2px 6px rgba(46, 125, 50, 0.15)',
                                                            borderColor: 'success.main',
                                                          },
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
                                                                bgcolor: 'white',
                                                                border: '1px solid #A5D6A7',
                                                                color: 'success.dark',
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
                                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Day of Week</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Period Slot</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Class / Section</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {teacherData.timetable.map((slot, idx) => (
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
                  </TabPanel>

                  {/* TAB 3: ATTENDANCE MARKED */}
                  <TabPanel value={currentTab} index={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mb: 3 }}>
                          {teacherData.hr_notice}
                        </Alert>
                      </Grid>

                      <Grid item xs={12}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Student Attendance Sessions Recorded by Teacher</Typography>
                            {teacherData.attendance_activity && teacherData.attendance_activity.length > 0 ? (
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600 }}>Session Date</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Grade & Section</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Students Present</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Recorded Timestamp</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {teacherData.attendance_activity.map((act) => (
                                      <TableRow key={act.id}>
                                        <TableCell sx={{ fontWeight: 500 }}>{act.date}</TableCell>
                                        <TableCell>{act.grade_name} - {act.section_name}</TableCell>
                                        <TableCell>{act.subject_name || 'Class Roll-Call'}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={`${act.present_count} / ${act.total_students} Present`}
                                            size="small"
                                            color={act.present_count === act.total_students ? 'success' : 'default'}
                                          />
                                        </TableCell>
                                        <TableCell>{new Date(act.recorded_at).toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Alert severity="info">No student attendance sessions conducted by this teacher recorded yet.</Alert>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </TabPanel>
                </Box>
              </Paper>
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}

