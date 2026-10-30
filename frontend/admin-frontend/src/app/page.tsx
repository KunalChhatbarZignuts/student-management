'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ClassIcon from '@mui/icons-material/Class';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/hooks';
import { ADMIN_ALLOWED_ROLES, ROLES } from '@/lib/constants';
import { adminStudentApi } from '@/features/students/api';
import { adminTeacherApi } from '@/features/teachers/api';
import { adminApplicationApi } from '@/features/applications/api';
import { teacherPortalApi } from '@/features/teacher-portal/api';

export default function AdminDashboardPage() {
  const { user, role } = useAuth();
  const isTeacher = role === ROLES.TEACHER;

  // Admin stats
  const { data: studentData, isLoading: loadingStudents } = useQuery({
    queryKey: ['dashboard', 'students-count'],
    queryFn: () => adminStudentApi.listStudents({ limit: 1 }),
    enabled: !isTeacher,
  });

  const { data: teacherData, isLoading: loadingTeachers } = useQuery({
    queryKey: ['dashboard', 'teachers-count'],
    queryFn: () => adminTeacherApi.listTeachers({ limit: 1 }),
    enabled: !isTeacher,
  });

  const { data: pendingInvitesData, isLoading: loadingInvites } = useQuery({
    queryKey: ['dashboard', 'pending-invites'],
    queryFn: () => adminStudentApi.listStudents({ status: 'invited', limit: 1 }),
    enabled: !isTeacher,
  });

  const { data: applications, isLoading: loadingApps } = useQuery({
    queryKey: ['dashboard', 'applications-count'],
    queryFn: adminApplicationApi.listApplications,
    enabled: !isTeacher,
  });

  // Teacher stats
  const { data: teacherClasses, isLoading: loadingClasses } = useQuery({
    queryKey: ['dashboard', 'teacher-classes'],
    queryFn: teacherPortalApi.getMyClasses,
    enabled: isTeacher,
  });

  const pendingAppsCount = applications?.filter((a) => a.status === 'pending').length || 0;

  return (
    <RequireRole roles={ADMIN_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Administration Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {isTeacher
                  ? 'Access your scheduled classes, manage student presence, and submit attendance notifications.'
                  : 'System overview: enrollment records, staff management, and application queues.'}
              </Typography>
            </Box>
            <Chip
              label={`Signed in as ${role}`}
              color="primary"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>

        {!isTeacher ? (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        TOTAL STUDENTS
                      </Typography>
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
                        <SchoolIcon fontSize="small" />
                      </Box>
                    </Box>
                    {loadingStudents ? (
                      <Skeleton width={80} height={40} />
                    ) : (
                      <Typography variant="h4" fontWeight={700}>
                        {studentData?.total ?? 0}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <Link href="/students" style={{ textDecoration: 'none' }}>
                        <Typography variant="caption" color="primary.main" fontWeight={600}>
                          Manage Students →
                        </Typography>
                      </Link>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        TEACHERS & FACULTY
                      </Typography>
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.main', color: '#fff' }}>
                        <PeopleIcon fontSize="small" />
                      </Box>
                    </Box>
                    {loadingTeachers ? (
                      <Skeleton width={80} height={40} />
                    ) : (
                      <Typography variant="h4" fontWeight={700}>
                        {teacherData?.total ?? 0}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <Link href="/teachers" style={{ textDecoration: 'none' }}>
                        <Typography variant="caption" color="secondary.main" fontWeight={600}>
                          View Faculty →
                        </Typography>
                      </Link>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        PENDING INVITES
                      </Typography>
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'warning.main', color: '#fff' }}>
                        <MarkEmailUnreadIcon fontSize="small" />
                      </Box>
                    </Box>
                    {loadingInvites ? (
                      <Skeleton width={80} height={40} />
                    ) : (
                      <Typography variant="h4" fontWeight={700} color="warning.main">
                        {pendingInvitesData?.total ?? 0}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Awaiting user activation
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        PENDING APPLICATIONS
                      </Typography>
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.dark', color: '#fff' }}>
                        <AssignmentTurnedInIcon fontSize="small" />
                      </Box>
                    </Box>
                    {loadingApps ? (
                      <Skeleton width={80} height={40} />
                    ) : (
                      <Typography variant="h4" fontWeight={700} color="primary.main">
                        {pendingAppsCount}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <Link href="/applications" style={{ textDecoration: 'none' }}>
                        <Typography variant="caption" color="primary.main" fontWeight={600}>
                          Review Queue →
                        </Typography>
                      </Link>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Quick Actions for Admins */}
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Administrative Actions
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Student Directory
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
                      Create new students, assign classes, and manage suspension or password resets.
                    </Typography>
                    <Button component={Link} href="/students" variant="outlined" endIcon={<ArrowForwardIcon />}>
                      Go to Students
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Bulk CSV Import
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
                      Upload bulk student and teacher CSVs with dry-run validation preview and error reporting.
                    </Typography>
                    <Button component={Link} href="/bulk-import" variant="outlined" endIcon={<ArrowForwardIcon />}>
                      Bulk Import
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Audit Trail
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
                      Track sensitive actions, staff account creations, suspensions, and security events.
                    </Typography>
                    <Button component={Link} href="/audit-logs" variant="outlined" endIcon={<ArrowForwardIcon />}>
                      View Audit Logs
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : (
          <>
            {/* Teacher Dashboard View */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.main', color: '#fff' }}>
                        <ClassIcon sx={{ fontSize: 32 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          ASSIGNED CLASSES
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {teacherClasses?.classes?.length || 0} Classes
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Button component={Link} href="/my-classes" variant="outlined" size="small">
                        View Schedule & Rosters
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.main', color: '#fff' }}>
                        <ReportProblemIcon sx={{ fontSize: 32 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          ATTENDANCE DISCREPANCY
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          Report Missing Student
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Button component={Link} href="/report-missing" variant="outlined" size="small" color="secondary">
                        File Absence Notice
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </AppShell>
    </RequireRole>
  );
}
