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
import CampaignIcon from '@mui/icons-material/Campaign';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScheduleIcon from '@mui/icons-material/Schedule';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/hooks';
import { useMyStudentProfile } from '@/features/students/hooks';
import { useMyChildren, useParentNotifications } from '@/features/parents/hooks';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { academicApi } from '@/features/academic/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { data: student, isLoading: loadingStudent, error: studentError } = useMyStudentProfile();
  const { data: children, isLoading: loadingChildren, error: childrenError } = useMyChildren();
  const { data: notifications } = useParentNotifications();

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
                          ENROLLMENT & CLASS
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {student?.enrollment_number || student?.student_code || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {student?.current_grade || student?.class_name || 'Assigned'} - Section {student?.current_section || student?.section || 'A'}
                        </Typography>
                        {student?.class_teacher_name && (
                          <Typography variant="caption" color="primary.main" display="block">
                            Class Teacher: {student.class_teacher_name}
                          </Typography>
                        )}
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FamilyRestroomIcon color="primary" /> Linked Children ({children?.length || 0})
              </Typography>
              <Button component={Link} href="/children" variant="text" size="small">
                Manage & View All Details →
              </Button>
            </Box>

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
                  <Grid item xs={12} sm={6} md={4} key={child.student_id || child.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box>
                            <Typography variant="h6" fontWeight={700}>
                              {child.first_name} {child.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Code: {child.student_code}
                            </Typography>
                          </Box>
                          <Chip
                            label={child.status || 'Active'}
                            color={child.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', my: 1 }}>
                          {child.is_primary_guardian && (
                            <Chip icon={<VerifiedUserIcon />} label="Primary" size="small" color="primary" variant="outlined" />
                          )}
                          <Chip label={child.relationship_type || 'Guardian'} size="small" variant="outlined" />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Class & Section: <strong>{child.class_name} - {child.section}</strong>
                        </Typography>
                        {child.academic_year && (
                          <Typography variant="body2" color="text.secondary">
                            Academic Year: <strong>{child.academic_year}</strong>
                          </Typography>
                        )}
                        {child.class_teacher_name && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Class Teacher: {child.class_teacher_name}
                          </Typography>
                        )}

                        <Box sx={{ mt: 2 }}>
                          <Button
                            component={Link}
                            href="/children"
                            variant="outlined"
                            size="small"
                            fullWidth
                            endIcon={<ArrowForwardIcon />}
                          >
                            View Child Records
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* School Announcements & Notifications */}
            {notifications && notifications.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CampaignIcon color="secondary" /> Recent Announcements & Notifications
                </Typography>
                <Grid container spacing={2}>
                  {notifications.map((notif) => (
                    <Grid item xs={12} md={4} key={notif.id}>
                      <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Chip label={notif.category} size="small" color="secondary" variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            {notif.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {notif.message}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
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

          {isParent ? (
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                  <PaymentsIcon color="primary" sx={{ fontSize: 32 }} />
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
          ) : (
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                  <ScheduleIcon color="primary" sx={{ fontSize: 32 }} />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Class Timetable
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Review weekly class schedules, timings, and teachers.
                  </Typography>
                  <Button component={Link} href="/timetable" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                    View Timetable →
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </AppShell>
    </RequireRole>
  );
}
