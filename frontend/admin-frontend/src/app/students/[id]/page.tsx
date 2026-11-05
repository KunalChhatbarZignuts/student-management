'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentsIcon from '@mui/icons-material/Payments';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { ROLES } from '@/lib/constants';
import { adminStudentApi, studentKeys } from '@/features/students/api';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import AppDatePicker from '@/components/ui/AppDatePicker';
import { StudentUpdatePayload } from '@/features/students/types';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-details-tabpanel-${index}`}
      aria-labelledby={`student-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const studentId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const [currentTab, setCurrentTab] = React.useState(0);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editTab, setEditTab] = React.useState(0);
  const [editFormData, setEditFormData] = React.useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    department: 'General',
    status: 'active',
    phone: '',
    alternate_phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    previous_school_name: '',
    previous_school_details: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    target_academic_year_id: '',
    target_grade_id: '',
    target_section_id: '',
    transfer_reason: '',
  });

  const {
    data: studentData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: studentKeys.details(studentId),
    queryFn: () => adminStudentApi.getStudentComprehensiveDetails(studentId),
    enabled: Boolean(studentId),
  });

  const [timetableMode, setTimetableMode] = React.useState<'calendar' | 'table'>('calendar');

  const studentTimetableDays = React.useMemo(() => {
    const defaultDays = [
      { key: 'MONDAY', label: 'Monday' },
      { key: 'TUESDAY', label: 'Tuesday' },
      { key: 'WEDNESDAY', label: 'Wednesday' },
      { key: 'THURSDAY', label: 'Thursday' },
      { key: 'FRIDAY', label: 'Friday' },
      { key: 'SATURDAY', label: 'Saturday' },
    ];
    if (!studentData?.timetable?.length) return defaultDays.slice(0, 5);
    const hasSat = studentData.timetable.some((s) => s.day_of_week?.toUpperCase() === 'SATURDAY');
    const hasSun = studentData.timetable.some((s) => s.day_of_week?.toUpperCase() === 'SUNDAY');
    let list = hasSat ? defaultDays : defaultDays.slice(0, 5);
    if (hasSun) list = [...list, { key: 'SUNDAY', label: 'Sunday' }];
    return list;
  }, [studentData?.timetable]);

  const studentTimetablePeriods = React.useMemo(() => {
    if (!studentData?.timetable?.length) return [];
    const map = new Map<string, { period_name: string; start_time: string; end_time: string; sort_key: number }>();
    studentData.timetable.forEach((s) => {
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
  }, [studentData?.timetable]);

  const studentSlotsByDayPeriod = React.useMemo(() => {
    const lookup: Record<string, NonNullable<typeof studentData>['timetable']> = {};
    (studentData?.timetable || []).forEach((s) => {
      const dKey = s.day_of_week?.toUpperCase() || '';
      const pKey = s.period_name || `${s.start_time}-${s.end_time}`;
      const composite = `${dKey}__${pKey}`;
      if (!lookup[composite]) {
        lookup[composite] = [];
      }
      lookup[composite].push(s);
    });
    return lookup;
  }, [studentData?.timetable]);

  // Queries for Academic Transfer options
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years-for-edit'],
    queryFn: adminGradeApi.listAcademicYears,
    enabled: isEditOpen,
  });

  const { data: rawGradesList } = useQuery({
    queryKey: gradeKeys.list({ academic_year_id: editFormData.target_academic_year_id, status: 'active', size: 100 }),
    queryFn: () => adminGradeApi.listGrades({ academic_year_id: editFormData.target_academic_year_id, status: 'active', size: 100 }),
    enabled: Boolean(editFormData.target_academic_year_id),
  });
  const gradesList: any[] = Array.isArray(rawGradesList)
    ? rawGradesList
    : ((rawGradesList as any)?.items || []);

  const { data: rawSectionsList = [] } = useQuery({
    queryKey: ['sections-for-edit-grade', editFormData.target_grade_id],
    queryFn: () => adminGradeApi.getGradeSections(editFormData.target_grade_id),
    enabled: Boolean(editFormData.target_grade_id),
  });

  const sectionsList: any[] = Array.isArray(rawSectionsList)
    ? rawSectionsList
    : ((rawSectionsList as any)?.items || []);

  const p = studentData?.personal_details;
  const a = studentData?.academic_details;
  const adm = studentData?.admission_details;
  const att = studentData?.attendance_summary;
  const fee = studentData?.fees;

  const initials = p ? `${p.first_name[0] || ''}${p.last_name[0] || ''}`.toUpperCase() : 'ST';

  // Open Edit Modal with current data
  const handleOpenEdit = () => {
    if (!studentData || !p) return;
    const parentPrimary = studentData.parents?.find((pt) => pt.is_primary_contact) || studentData.parents?.[0];

    setEditFormData({
      first_name: p.first_name || '',
      middle_name: p.middle_name || '',
      last_name: p.last_name || '',
      dob: p.dob || '',
      gender: p.gender || 'Male',
      department: p.department || 'General',
      status: p.status || 'active',
      phone: p.phone || '',
      alternate_phone: p.alternate_phone || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      country: p.country || '',
      postal_code: p.postal_code || '',
      previous_school_name: adm?.previous_school_name || '',
      previous_school_details: adm?.previous_school_details || '',
      guardian_name: parentPrimary ? `${parentPrimary.first_name} ${parentPrimary.last_name}` : '',
      guardian_phone: parentPrimary ? parentPrimary.phone : '',
      guardian_email: parentPrimary ? parentPrimary.email || '' : '',
      target_academic_year_id: '',
      target_grade_id: '',
      target_section_id: '',
      transfer_reason: '',
    });
    setEditTab(0);
    setIsEditOpen(true);
  };

  // Mutation for saving changes
  const updateMutation = useMutation({
    mutationFn: async (payload: StudentUpdatePayload) => {
      return adminStudentApi.updateStudent(studentId, payload);
    },
    onSuccess: () => {
      showSnackbar('Student profile updated successfully', 'success');
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: studentKeys.details(studentId) });
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to update student profile'), 'error');
    },
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.first_name.trim() || !editFormData.last_name.trim()) {
      showSnackbar('First name and Last name are required', 'warning');
      return;
    }

    const payload: StudentUpdatePayload = {
      first_name: editFormData.first_name.trim(),
      middle_name: editFormData.middle_name.trim() || undefined,
      last_name: editFormData.last_name.trim(),
      dob: editFormData.dob || undefined,
      gender: editFormData.gender,
      department: editFormData.department.trim() || 'General',
      status: editFormData.status,
      phone: editFormData.phone.trim() || undefined,
      alternate_phone: editFormData.alternate_phone.trim() || undefined,
      address: editFormData.address.trim() || undefined,
      city: editFormData.city.trim() || undefined,
      state: editFormData.state.trim() || undefined,
      country: editFormData.country.trim() || undefined,
      postal_code: editFormData.postal_code.trim() || undefined,
      previous_school_name: editFormData.previous_school_name.trim() || undefined,
      previous_school_details: editFormData.previous_school_details.trim() || undefined,
      guardian_name: editFormData.guardian_name.trim() || undefined,
      guardian_phone: editFormData.guardian_phone.trim() || undefined,
      guardian_email: editFormData.guardian_email.trim() || undefined,
    };

    if (editFormData.target_section_id) {
      if (!editFormData.transfer_reason.trim()) {
        showSnackbar('Please specify a transfer reason when moving student to another section', 'warning');
        return;
      }
      payload.target_academic_year_id = editFormData.target_academic_year_id;
      payload.target_grade_id = editFormData.target_grade_id;
      payload.target_section_id = editFormData.target_section_id;
      payload.transfer_reason = editFormData.transfer_reason.trim();
    }

    updateMutation.mutate(payload);
  };

  return (
    <RequireRole roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
          {/* Top Navigation & Back Action */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/students')}
              sx={{ textTransform: 'none' }}
            >
              Back to Students
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleOpenEdit}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Edit Student Profile
              </Button>
            </Box>
          </Box>

          {/* Loading and Error States */}
          {isLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
              <CircularProgress size={48} />
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading comprehensive student profile...
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
              {(error as any)?.response?.data?.detail || 'Failed to load student details.'}
            </Alert>
          )}

          {studentData && p && (
            <>
              {/* Profile Header Card */}
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  mb: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.01) 100%)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm="auto">
                    <Avatar
                      src={p.profile_photo || undefined}
                      sx={{
                        width: { xs: 72, md: 96 },
                        height: { xs: 72, md: 96 },
                        bgcolor: 'primary.main',
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
                        {p.first_name} {p.middle_name ? `${p.middle_name} ` : ''}{p.last_name}
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
                      {a?.current_grade && (
                        <Chip
                          label={`${a.current_grade} - ${a.current_section || 'N/A'}`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {p.department && (
                        <Chip
                          label={p.department}
                          color="secondary"
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {a?.current_academic_year && (
                        <Chip
                          label={a.current_academic_year}
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Student Code: <strong>{studentData.student_code}</strong> • Enrollment #: <strong>{studentData.enrollment_number || '—'}</strong> • Roll #: <strong>{a?.current_roll_number || '—'}</strong>
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {p.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 18 }} />
                          <span>{p.email}</span>
                        </Box>
                      )}
                      {p.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 18 }} />
                          <span>{p.phone}</span>
                        </Box>
                      )}
                      {p.city && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOnIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 18 }} />
                          <span>{p.city}{p.state ? `, ${p.state}` : ''}</span>
                        </Box>
                      )}
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
                    aria-label="Student details tabs"
                  >
                    <Tab icon={<PersonIcon />} iconPosition="start" label="Overview & Personal" />
                    <Tab icon={<SchoolIcon />} iconPosition="start" label="Academics & Schedule" />
                    <Tab icon={<FamilyRestroomIcon />} iconPosition="start" label={`Parents (${studentData.parents.length})`} />
                    <Tab icon={<AssignmentIcon />} iconPosition="start" label="Admissions" />
                    <Tab icon={<EventAvailableIcon />} iconPosition="start" label="Attendance & Leaves" />
                    <Tab icon={<PaymentsIcon />} iconPosition="start" label="Fees & Ledger" />
                  </Tabs>
                </Box>

                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  {/* TAB 0: OVERVIEW & PERSONAL */}
                  <TabPanel value={currentTab} index={0}>
                    <Grid container spacing={3}>
                      {/* Personal Demographics */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon color="primary" fontSize="small" /> Personal Demographics
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">First Name</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.first_name}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Middle Name</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.middle_name || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Last Name</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.last_name}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.dob}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Gender</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.gender || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Department / Stream</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.department || 'General'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Primary Phone</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.phone || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Alternate Phone</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.alternate_phone || '—'}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Residential & Account Information */}
                      <Grid item xs={12} md={6}>
                        <Stack spacing={3}>
                          <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOnIcon color="primary" fontSize="small" /> Residential Address
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <Typography variant="caption" color="text.secondary">Street Address</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.address || '—'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">City</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.city || '—'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">State / Province</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.state || '—'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Country</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.country || '—'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Postal Code</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.postal_code || '—'}</Typography>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>

                          <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarMonthIcon color="primary" fontSize="small" /> User Account & System Status
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Account Email</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.email || '—'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Account Status</Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip label={(p.user_status || 'active').toUpperCase()} size="small" color={p.user_status === 'active' ? 'success' : 'default'} />
                                  </Box>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Password Policy</Typography>
                                  <Typography variant="body2">{p.must_change_password ? 'Must Change Password on Login' : 'Standard Password Set'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Profile Created</Typography>
                                  <Typography variant="body2">{new Date(p.created_at).toLocaleDateString()}</Typography>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Stack>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* TAB 1: ACADEMICS & SCHEDULE */}
                  <TabPanel value={currentTab} index={1}>
                    <Grid container spacing={3}>
                      {/* Current Academic Status Card */}
                      <Grid item xs={12}>
                        <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.default' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Current Academic Assignment</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{a?.current_academic_year || '—'}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">Grade & Section</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{a?.current_grade || '—'} - {a?.current_section || '—'}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">Class Teacher</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{a?.class_teacher_name || 'Unassigned'}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">Roll Number</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>#{a?.current_roll_number || '—'}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Active Subjects Table */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Assigned Subjects</Typography>
                            {a?.active_subjects && a.active_subjects.length > 0 ? (
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {a.active_subjects.map((sub) => (
                                      <TableRow key={sub.id}>
                                        <TableCell sx={{ fontWeight: 500 }}>{sub.name}</TableCell>
                                        <TableCell><Chip label={sub.code} size="small" variant="outlined" /></TableCell>
                                        <TableCell>{sub.teacher_name || '—'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Alert severity="info">No active subject allocations recorded for this section.</Alert>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Enrollment History Progression */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Enrollment Progression History</Typography>
                            {a?.enrollment_history && a.enrollment_history.length > 0 ? (
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Grade/Section</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {a.enrollment_history.map((hist) => (
                                      <TableRow key={hist.id}>
                                        <TableCell>{hist.academic_year_name}</TableCell>
                                        <TableCell>{hist.grade_name} - {hist.section_name}</TableCell>
                                        <TableCell>
                                          <Chip label={hist.status.toUpperCase()} size="small" color={hist.status.toLowerCase() === 'active' ? 'success' : 'default'} />
                                        </TableCell>
                                        <TableCell>{new Date(hist.enrolled_at).toLocaleDateString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Alert severity="info">No historical enrollments found.</Alert>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Weekly Timetable Schedule */}
                      <Grid item xs={12}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Class Timetable</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Schedule for Grade {studentData.academic_details?.current_grade || '—'} - Section {studentData.academic_details?.current_section || '—'}
                                </Typography>
                              </Box>

                              {studentData.timetable && studentData.timetable.length > 0 && (
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

                            {studentData.timetable && studentData.timetable.length > 0 ? (
                              timetableMode === 'calendar' ? (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                                  <Table sx={{ minWidth: 860, borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <TableHead>
                                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell sx={{ fontWeight: 700, width: 140, borderRight: 1, borderColor: 'divider', py: 1.5 }}>
                                          Period / Time
                                        </TableCell>
                                        {studentTimetableDays.map((d) => (
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
                                      {studentTimetablePeriods.map((period) => (
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

                                          {studentTimetableDays.map((d) => {
                                            const slots = studentSlotsByDayPeriod[`${d.key}__${period.period_name}`] || [];
                                            return (
                                              <TableCell
                                                key={d.key}
                                                sx={{
                                                  p: 1,
                                                  borderRight: 1,
                                                  borderColor: 'divider',
                                                  verticalAlign: 'top',
                                                  bgcolor: slots.length > 0 ? 'background.paper' : 'grey.25',
                                                  width: `${100 / (studentTimetableDays.length + 1)}%`,
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
                                                          bgcolor: '#F0F7FF',
                                                          border: '1px solid #C2E0FF',
                                                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                          transition: 'all 0.15s ease-in-out',
                                                          '&:hover': {
                                                            boxShadow: '0 2px 6px rgba(25, 118, 210, 0.15)',
                                                            borderColor: 'primary.main',
                                                          },
                                                        }}
                                                      >
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5, mb: 0.5 }}>
                                                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark', lineHeight: 1.2 }}>
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
                                                                border: '1px solid #90CAF9',
                                                                color: 'primary.main',
                                                              }}
                                                            />
                                                          )}
                                                        </Box>

                                                        {s.teacher_name && (
                                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                                            <PersonIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                                            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.725rem' }}>
                                                              {s.teacher_name}
                                                            </Typography>
                                                          </Box>
                                                        )}

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
                                        <TableCell sx={{ fontWeight: 600 }}>Day</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Room</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {studentData.timetable.map((slot, idx) => (
                                        <TableRow key={idx} hover>
                                          <TableCell sx={{ fontWeight: 600 }}>{slot.day_of_week}</TableCell>
                                          <TableCell>{slot.period_name}</TableCell>
                                          <TableCell>{slot.start_time} - {slot.end_time}</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>{slot.subject_name}</TableCell>
                                          <TableCell>{slot.teacher_name || '—'}</TableCell>
                                          <TableCell>{slot.room_number || '—'}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              )
                            ) : (
                              <Alert severity="info">No published timetable schedule available for this student's section.</Alert>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* TAB 2: PARENTS & GUARDIANS */}
                  <TabPanel value={currentTab} index={2}>
                    <Grid container spacing={3}>
                      {studentData.parents && studentData.parents.length > 0 ? (
                        studentData.parents.map((parent) => (
                          <Grid item xs={12} sm={6} md={4} key={parent.id}>
                            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', position: 'relative' }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                  <Avatar sx={{ bgcolor: 'secondary.main', width: 44, height: 44 }}>
                                    {parent.first_name[0] || 'P'}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                      {parent.first_name} {parent.last_name}
                                    </Typography>
                                    <Chip label={parent.relationship} size="small" color="primary" variant="outlined" />
                                  </Box>
                                </Box>
                                <Divider sx={{ my: 1.5 }} />
                                <Stack spacing={1} sx={{ fontSize: '0.875rem' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PhoneIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 18 }} />
                                    <span>{parent.phone}</span>
                                  </Box>
                                  {parent.email && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <EmailIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 18 }} />
                                      <span>{parent.email}</span>
                                    </Box>
                                  )}
                                </Stack>
                                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {parent.is_primary_contact && <Chip label="Primary Contact" color="success" size="small" />}
                                  {parent.is_emergency_contact && <Chip label="Emergency Contact" color="error" size="small" />}
                                  {parent.can_pickup && <Chip label="Pickup Authorized" variant="outlined" size="small" />}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      ) : (
                        <Grid item xs={12}>
                          <Alert severity="info">No linked parent or guardian accounts found for this student.</Alert>
                        </Grid>
                      )}
                    </Grid>
                  </TabPanel>

                  {/* TAB 3: ADMISSIONS */}
                  <TabPanel value={currentTab} index={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Admission Application Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Application Number</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{adm?.application_number || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Admission Status</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                  <Chip label={(adm?.status || p.status).toUpperCase()} color="success" size="small" />
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Admission Date</Typography>
                                <Typography variant="body1">{adm?.admission_date || p.admission_date || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                                <Typography variant="body1">{adm?.academic_year_name || '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Application Submitted</Typography>
                                <Typography variant="body2">{adm?.submitted_at ? new Date(adm.submitted_at).toLocaleDateString() : '—'}</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Admission Approved</Typography>
                                <Typography variant="body2">{adm?.approved_at ? new Date(adm.approved_at).toLocaleDateString() : '—'}</Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Prior School Background</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Previous Institution Name</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{adm?.previous_school_name || 'No prior school recorded'}</Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Transfer & Academic Notes</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                                  {adm?.previous_school_details || 'No additional previous records or documents attached.'}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* TAB 4: ATTENDANCE & LEAVES */}
                  <TabPanel value={currentTab} index={4}>
                    <Grid container spacing={3}>
                      {/* Analytics Header Metrics */}
                      <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={6} sm={2.4}>
                              <Typography variant="caption" color="text.secondary">Total Sessions</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700 }}>{att?.total_days || 0}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                              <Typography variant="caption" color="text.secondary">Days Present</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{att?.present_days || 0}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                              <Typography variant="caption" color="text.secondary">Days Absent</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>{att?.absent_days || 0}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                              <Typography variant="caption" color="text.secondary">Late / Excused</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>{(att?.late_days || 0) + (att?.excused_days || 0)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={2.4}>
                              <Typography variant="caption" color="text.secondary">Attendance Rate</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{att?.attendance_rate_percentage || 0}%</Typography>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(att?.attendance_rate_percentage || 0, 100)}
                                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                              />
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Recent Attendance Records */}
                      <Grid item xs={12} md={7}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Recent Daily Attendance (Last 30 Records)</Typography>
                            {att?.recent_history && att.recent_history.length > 0 ? (
                              <TableContainer sx={{ maxHeight: 360 }}>
                                <Table size="small" stickyHeader>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Period / Subject</TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {att.recent_history.map((rec, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>{rec.date}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={rec.status}
                                            size="small"
                                            color={
                                              rec.status === 'PRESENT'
                                                ? 'success'
                                                : rec.status === 'ABSENT'
                                                  ? 'error'
                                                  : 'warning'
                                            }
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {rec.period_slot || 'Daily'}{rec.subject_name ? ` • ${rec.subject_name}` : ''}
                                        </TableCell>
                                        <TableCell>{rec.remarks || '—'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Alert severity="info">No attendance records logged for this student yet.</Alert>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Leave Applications */}
                      <Grid item xs={12} md={5}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Leave Applications</Typography>
                            {studentData.leave_applications && studentData.leave_applications.length > 0 ? (
                              <Stack spacing={2}>
                                {studentData.leave_applications.map((lv) => (
                                  <Paper key={lv.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {lv.start_date} to {lv.end_date} ({lv.days_count} day{lv.days_count > 1 ? 's' : ''})
                                      </Typography>
                                      <Chip
                                        label={lv.status}
                                        size="small"
                                        color={lv.status === 'APPROVED' ? 'success' : lv.status === 'REJECTED' ? 'error' : 'warning'}
                                      />
                                    </Box>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                      <strong>Reason:</strong> {lv.reason}
                                    </Typography>
                                    {lv.reviewed_by_teacher_name && (
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Reviewed by: {lv.reviewed_by_teacher_name} {lv.rejection_reason ? `(${lv.rejection_reason})` : ''}
                                      </Typography>
                                    )}
                                  </Paper>
                                ))}
                              </Stack>
                            ) : (
                              <Alert severity="info">No leave applications filed by this student.</Alert>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* TAB 5: FEES & LEDGER */}
                  <TabPanel value={currentTab} index={5}>
                    <Grid container spacing={3}>
                      {fee?.has_fee_assignment ? (
                        <>
                          {/* Financial Metric Cards */}
                          <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
                              <Grid container spacing={2}>
                                <Grid item xs={6} sm={2.4}>
                                  <Typography variant="caption" color="text.secondary">Structure</Typography>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fee.fee_structure_name}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={2.4}>
                                  <Typography variant="caption" color="text.secondary">Net Payable</Typography>
                                  <Typography variant="h5" sx={{ fontWeight: 700 }}>${Number(fee.net_amount).toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={2.4}>
                                  <Typography variant="caption" color="text.secondary">Total Paid</Typography>
                                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>${Number(fee.paid_amount).toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={2.4}>
                                  <Typography variant="caption" color="text.secondary">Outstanding Balance</Typography>
                                  <Typography variant="h5" sx={{ fontWeight: 700, color: Number(fee.outstanding_balance) > 0 ? 'error.main' : 'text.primary' }}>
                                    ${Number(fee.outstanding_balance).toFixed(2)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={2.4}>
                                  <Typography variant="caption" color="text.secondary">Account Status</Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip label={fee.status || 'ACTIVE'} color={fee.status === 'PAID' ? 'success' : 'warning'} />
                                  </Box>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>

                          {/* Installments Table */}
                          <Grid item xs={12} md={7}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Installment Schedule</Typography>
                                <TableContainer>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Balance</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {fee.installments.map((inst) => (
                                        <TableRow key={inst.id}>
                                          <TableCell>{inst.installment_number}</TableCell>
                                          <TableCell>{inst.due_date}</TableCell>
                                          <TableCell>${Number(inst.amount).toFixed(2)}</TableCell>
                                          <TableCell>${Number(inst.paid_amount).toFixed(2)}</TableCell>
                                          <TableCell>${Number(inst.balance).toFixed(2)}</TableCell>
                                          <TableCell>
                                            <Chip
                                              label={inst.status}
                                              size="small"
                                              color={inst.status === 'PAID' ? 'success' : inst.status === 'OVERDUE' ? 'error' : 'warning'}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </CardContent>
                            </Card>
                          </Grid>

                          {/* Payment Transactions */}
                          <Grid item xs={12} md={5}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Payment History & Receipts</Typography>
                                {fee.payments && fee.payments.length > 0 ? (
                                  <TableContainer>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell sx={{ fontWeight: 600 }}>Receipt #</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {fee.payments.map((pmt) => (
                                          <TableRow key={pmt.id}>
                                            <TableCell sx={{ fontWeight: 600 }}>{pmt.receipt_number || '—'}</TableCell>
                                            <TableCell>{new Date(pmt.payment_date).toLocaleDateString()}</TableCell>
                                            <TableCell>{pmt.payment_method}</TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                                              ${Number(pmt.amount).toFixed(2)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                ) : (
                                  <Alert severity="info">No payments recorded for this account yet.</Alert>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        </>
                      ) : (
                        <Grid item xs={12}>
                          <Alert severity="info">No fee structures or fee assignments configured for this student.</Alert>
                        </Grid>
                      )}
                    </Grid>
                  </TabPanel>
                </Box>
              </Paper>

              {/* COMPREHENSIVE EDIT STUDENT DIALOG */}
              <Dialog
                open={isEditOpen}
                onClose={() => !updateMutation.isPending && setIsEditOpen(false)}
                maxWidth="md"
                fullWidth
              >
                <form onSubmit={handleSaveEdit}>
                  <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                      Edit Student Profile: {p.first_name} {p.last_name} ({studentData.student_code})
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setIsEditOpen(false)}
                      disabled={updateMutation.isPending}
                      sx={{ minWidth: 'auto', p: 0.5 }}
                    >
                      <CloseIcon />
                    </Button>
                  </DialogTitle>

                  <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                    <Tabs
                      value={editTab}
                      onChange={(_, v) => setEditTab(v)}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      <Tab label="Personal Details" />
                      <Tab label="Address & Contact" />
                      <Tab label="Prior Education" />
                      <Tab label="Emergency Guardian" />
                      <Tab label="Academic Transfer" />
                    </Tabs>
                  </Box>

                  <DialogContent dividers sx={{ p: 3 }}>
                    {/* EDIT TAB 0: PERSONAL DETAILS */}
                    {editTab === 0 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="First Name"
                            required
                            fullWidth
                            value={editFormData.first_name}
                            onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Middle Name"
                            fullWidth
                            value={editFormData.middle_name}
                            onChange={(e) => setEditFormData({ ...editFormData, middle_name: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Last Name"
                            required
                            fullWidth
                            value={editFormData.last_name}
                            onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <AppDatePicker
                            label="Date of Birth"
                            required
                            value={editFormData.dob}
                            onChange={(val) => setEditFormData({ ...editFormData, dob: val })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth required>
                            <InputLabel>Gender</InputLabel>
                            <Select
                              label="Gender"
                              value={editFormData.gender}
                              onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                            >
                              <MenuItem value="Male">Male</MenuItem>
                              <MenuItem value="Female">Female</MenuItem>
                              <MenuItem value="Other">Other</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Department / Stream</InputLabel>
                            <Select
                              label="Department / Stream"
                              value={editFormData.department || 'General'}
                              onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            >
                              <MenuItem value="General">General</MenuItem>
                              <MenuItem value="Science">Science</MenuItem>
                              <MenuItem value="Commerce">Commerce</MenuItem>
                              <MenuItem value="Arts">Arts</MenuItem>
                              <MenuItem value="Humanities">Humanities</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Student Status</InputLabel>
                            <Select
                              label="Student Status"
                              value={editFormData.status}
                              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                            >
                              <MenuItem value="active">Active</MenuItem>
                              <MenuItem value="inactive">Inactive</MenuItem>
                              <MenuItem value="transferred">Transferred</MenuItem>
                              <MenuItem value="withdrawn">Withdrawn</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    )}

                    {/* EDIT TAB 1: ADDRESS & CONTACT */}
                    {editTab === 1 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Primary Phone"
                            fullWidth
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Alternate Phone"
                            fullWidth
                            value={editFormData.alternate_phone}
                            onChange={(e) => setEditFormData({ ...editFormData, alternate_phone: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Street Address"
                            fullWidth
                            value={editFormData.address}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="City"
                            fullWidth
                            value={editFormData.city}
                            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="State / Province"
                            fullWidth
                            value={editFormData.state}
                            onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Country"
                            fullWidth
                            value={editFormData.country}
                            onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Postal Code"
                            fullWidth
                            value={editFormData.postal_code}
                            onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                          />
                        </Grid>
                      </Grid>
                    )}

                    {/* EDIT TAB 2: PRIOR EDUCATION */}
                    {editTab === 2 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            label="Previous School Name"
                            fullWidth
                            value={editFormData.previous_school_name}
                            onChange={(e) => setEditFormData({ ...editFormData, previous_school_name: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Previous School Details / Transfer Notes"
                            fullWidth
                            multiline
                            rows={4}
                            value={editFormData.previous_school_details}
                            onChange={(e) => setEditFormData({ ...editFormData, previous_school_details: e.target.value })}
                          />
                        </Grid>
                      </Grid>
                    )}

                    {/* EDIT TAB 3: EMERGENCY GUARDIAN */}
                    {editTab === 3 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Alert severity="info" sx={{ mb: 1 }}>
                            These contacts serve as the immediate emergency fallback on the student record.
                          </Alert>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Emergency Guardian Name"
                            fullWidth
                            value={editFormData.guardian_name}
                            onChange={(e) => setEditFormData({ ...editFormData, guardian_name: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Guardian Phone"
                            fullWidth
                            value={editFormData.guardian_phone}
                            onChange={(e) => setEditFormData({ ...editFormData, guardian_phone: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Guardian Email"
                            type="email"
                            fullWidth
                            value={editFormData.guardian_email}
                            onChange={(e) => setEditFormData({ ...editFormData, guardian_email: e.target.value })}
                          />
                        </Grid>
                      </Grid>
                    )}

                    {/* EDIT TAB 4: ACADEMIC TRANSFER */}
                    {editTab === 4 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Alert severity="warning" sx={{ mb: 1 }}>
                            Only select a target section if transferring the student to a new section. A new academic enrollment record will be created preserving the student's historical progression.
                          </Alert>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth>
                            <InputLabel>Academic Year</InputLabel>
                            <Select
                              label="Academic Year"
                              value={editFormData.target_academic_year_id}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  target_academic_year_id: e.target.value,
                                  target_grade_id: '',
                                  target_section_id: '',
                                })
                              }
                            >
                              <MenuItem value="">
                                <em>None (Keep Current)</em>
                              </MenuItem>
                              {academicYears.map((ay: any) => (
                                <MenuItem key={ay.id} value={ay.id}>
                                  {ay.name} {ay.is_current ? '(Current)' : ''}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth disabled={!editFormData.target_academic_year_id}>
                            <InputLabel>Target Grade</InputLabel>
                            <Select
                              label="Target Grade"
                              value={editFormData.target_grade_id}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  target_grade_id: e.target.value,
                                  target_section_id: '',
                                })
                              }
                            >
                              <MenuItem value="">
                                <em>Select Grade</em>
                              </MenuItem>
                              {gradesList.map((g: any) => (
                                <MenuItem key={g.id} value={g.id}>
                                  {g.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth disabled={!editFormData.target_grade_id}>
                            <InputLabel>Target Section</InputLabel>
                            <Select
                              label="Target Section"
                              value={editFormData.target_section_id}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  target_section_id: e.target.value,
                                })
                              }
                            >
                              <MenuItem value="">
                                <em>Select Section</em>
                              </MenuItem>
                              {sectionsList.map((s: any) => (
                                <MenuItem key={s.id} value={s.id}>
                                  {s.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        {editFormData.target_section_id && (
                          <Grid item xs={12}>
                            <TextField
                              label="Transfer Reason"
                              required
                              fullWidth
                              multiline
                              rows={2}
                              placeholder="Reason for section reassignment..."
                              value={editFormData.transfer_reason}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  transfer_reason: e.target.value,
                                })
                              }
                            />
                          </Grid>
                        )}
                      </Grid>
                    )}
                  </DialogContent>

                  <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                      onClick={() => setIsEditOpen(false)}
                      disabled={updateMutation.isPending}
                      sx={{ textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      disabled={updateMutation.isPending}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {updateMutation.isPending ? 'Saving Changes...' : 'Save Profile Changes'}
                    </Button>
                  </DialogActions>
                </form>
              </Dialog>
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
