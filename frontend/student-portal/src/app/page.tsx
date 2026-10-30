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

import SchoolIcon from '@mui/icons-material/School';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GradeIcon from '@mui/icons-material/Grade';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import PersonIcon from '@mui/icons-material/Person';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/hooks';
import { useMyStudentProfile } from '@/features/students/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { academicApi } from '@/features/academic/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { data: student, isLoading: loadingStudent, error: studentError } = useMyStudentProfile();
  const { data: children, isLoading: loadingChildren, error: childrenError } = useMyChildren();

  const isStudent = role === ROLES.STUDENT;
  const isParent = role === ROLES.PARENT;

  const { data: attendance } = useQuery({
    queryKey: ['academic', 'attendance', 'me'],
    queryFn: academicApi.getMyAttendance,
    enabled: isStudent,
  });

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Welcome back, {user?.student?.first_name || user?.parent?.first_name || user?.email.split('@')[0]}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {isStudent
                  ? 'Access your academic records, attendance summary, and class updates.'
                  : 'Monitor your children’s educational progress, attendance, and fee notices.'}
              </Typography>
            </Box>
            <Chip
              label={`Logged in as ${role}`}
              color="primary"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>

        {isStudent && (
          <>
            {loadingStudent ? (
              <Grid container spacing={3}>
                {[1, 2, 3].map((i) => (
                  <Grid item xs={12} sm={4} key={i}>
                    <Skeleton variant="rounded" height={130} />
                  </Grid>
                ))}
              </Grid>
            ) : studentError ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Profile details will appear here once your enrollment is finalized by administration.
              </Alert>
            ) : (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
                        <SchoolIcon />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          STUDENT ID & CLASS
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {student?.student_code || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Class: {student?.class_name || 'Assigned'} ({student?.section || 'A'})
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.main', color: '#fff' }}>
                        <EventAvailableIcon />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          ATTENDANCE RATE
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {attendance ? `${attendance.percentage}%` : 'Loading...'}
                        </Typography>
                        <Typography variant="body2" color="success.main" fontWeight={500}>
                          Good standing
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.dark', color: '#fff' }}>
                        <GradeIcon />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          CURRENT TERM
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          Term 1 (2026-2027)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Department: {student?.department || 'General'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        )}

        {isParent && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FamilyRestroomIcon color="primary" /> Linked Children
            </Typography>
            {loadingChildren ? (
              <Skeleton variant="rounded" height={140} />
            ) : childrenError ? (
              <Alert severity="info">
                No linked student records found. Please contact administration to link your child’s account.
              </Alert>
            ) : !children || children.length === 0 ? (
              <Alert severity="info">
                No student records are currently linked to your guardian account. Please contact the school office.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {children.map((child) => (
                  <Grid item xs={12} sm={6} md={4} key={child.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="h6" fontWeight={700}>
                            {child.first_name} {child.last_name}
                          </Typography>
                          <Chip label={child.status} color="success" size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Student Code: <strong>{child.student_code}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Class: {child.class_name} ({child.section})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Department: {child.department}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            component={Link}
                            href={`/children`}
                            variant="outlined"
                            size="small"
                            fullWidth
                            endIcon={<ArrowForwardIcon />}
                          >
                            View Child Details
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 2 }}>
          Quick Navigation
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                <PersonIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  My Profile
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  View personal records, contact information, and manage account security.
                </Typography>
                <Button component={Link} href="/profile" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                  Open Profile →
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                <GradeIcon color="secondary" sx={{ fontSize: 32 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Marks & Performance
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Check term reports, graded assessments, and academic transcripts.
                </Typography>
                <Button component={Link} href="/marks" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                  View Marks →
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                <EventAvailableIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Attendance Records
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Review month-by-month presence, leaves, and absence logs.
                </Typography>
                <Button component={Link} href="/attendance" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                  View Attendance →
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Fees & Invoices
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Inspect tuition fee schedules, payment receipts, and balance dues.
                </Typography>
                <Button component={Link} href="/fees" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                  Check Fees →
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </AppShell>
    </RequireRole>
  );
}
