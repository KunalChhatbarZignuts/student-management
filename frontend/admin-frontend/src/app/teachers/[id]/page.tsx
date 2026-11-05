'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HowToRegIcon from '@mui/icons-material/HowToReg';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { ROLES } from '@/lib/constants';
import { adminTeacherApi, teacherKeys } from '@/features/teachers/api';

import TeacherHeaderCard from '@/features/teachers/components/details/TeacherHeaderCard';
import TeacherOverviewTab from '@/features/teachers/components/details/TeacherOverviewTab';
import TeacherSubjectsTab from '@/features/teachers/components/details/TeacherSubjectsTab';
import TeacherTimetableTab from '@/features/teachers/components/details/TeacherTimetableTab';
import TeacherAttendanceTab from '@/features/teachers/components/details/TeacherAttendanceTab';

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

  return (
    <RequireRole roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
          {/* Top Navigation & Back Action */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/teachers')}
              sx={{ textTransform: 'none' }}
            >
              Back to Teachers
            </Button>
          </Box>

          {/* Loading and Error States */}
          {isLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
              <CircularProgress size={48} />
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading faculty member profile...
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
              {(error as any)?.response?.data?.detail || 'Failed to load faculty member details.'}
            </Alert>
          )}

          {teacherData && teacherData.profile && (
            <>
              {/* Profile Overview Card */}
              <TeacherHeaderCard teacherData={teacherData} />

              {/* Navigation Tabs */}
              <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                  <Tabs
                    value={currentTab}
                    onChange={(_, val) => setCurrentTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Teacher details tabs"
                  >
                    <Tab icon={<PersonIcon />} iconPosition="start" label="Overview & Profile" />
                    <Tab icon={<MenuBookIcon />} iconPosition="start" label={`Assigned Subjects (${teacherData.subject_allocations?.length || 0})`} />
                    <Tab icon={<CalendarMonthIcon />} iconPosition="start" label={`Weekly Timetable (${teacherData.timetable?.length || 0})`} />
                    <Tab icon={<HowToRegIcon />} iconPosition="start" label="Attendance Marked" />
                  </Tabs>
                </Box>

                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  {/* TAB 0: OVERVIEW & PROFILE */}
                  <TabPanel value={currentTab} index={0}>
                    <TeacherOverviewTab
                      profile={teacherData.profile}
                      workload={teacherData.workload}
                      classTeacherAssignment={teacherData.class_teacher_role}
                    />
                  </TabPanel>

                  {/* TAB 1: ASSIGNED SUBJECTS */}
                  <TabPanel value={currentTab} index={1}>
                    <TeacherSubjectsTab subjectAllocations={teacherData.subject_allocations || []} />
                  </TabPanel>

                  {/* TAB 2: WEEKLY TIMETABLE */}
                  <TabPanel value={currentTab} index={2}>
                    <TeacherTimetableTab timetable={teacherData.timetable || []} />
                  </TabPanel>

                  {/* TAB 3: ATTENDANCE MARKED */}
                  <TabPanel value={currentTab} index={3}>
                    <TeacherAttendanceTab
                      hrNotice={teacherData.hr_notice}
                      attendanceActivity={teacherData.attendance_activity || []}
                    />
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
