'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Link from 'next/link';

import PersonIcon from '@mui/icons-material/Person';
import LockResetIcon from '@mui/icons-material/LockReset';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/auth/hooks';
import { useMyStudentProfile } from '@/features/students/hooks';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const { data: student } = useMyStudentProfile();
  const { showSnackbar } = useSnackbar();

  const [confirmLogoutAll, setConfirmLogoutAll] = React.useState(false);

  const isStudent = role === ROLES.STUDENT;

  const handleLogoutAll = async () => {
    setConfirmLogoutAll(false);
    showSnackbar('Logged out from all sessions', 'info');
    await logout();
  };

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review personal information, enrollment details, and security preferences.
            </Typography>
          </Box>

          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
                <PersonIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {user?.student
                    ? `${user.student.first_name} ${user.student.last_name}`
                    : user?.parent
                    ? `${user.parent.first_name} ${user.parent.last_name}`
                    : user?.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <Chip label={role} color="primary" size="small" sx={{ ml: 'auto', fontWeight: 600 }} />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  ACCOUNT STATUS
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {user?.status || 'ACTIVE'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  LAST SIGN IN
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {user?.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : 'Current session'}
                </Typography>
              </Grid>

              {isStudent && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      STUDENT ID
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="primary.main">
                      {student?.student_code || user?.student?.student_code || 'Pending'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      CLASS & SECTION
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.class_name || user?.student?.class_name || 'N/A'} (
                      {student?.section || user?.student?.section || 'A'})
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      DEPARTMENT
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.department || user?.student?.department || 'General'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      DATE OF BIRTH
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.dob || user?.student?.dob || 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      GUARDIAN NAME
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.guardian_name || user?.student?.guardian_name || 'Not provided'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      GUARDIAN PHONE
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.guardian_phone || user?.student?.guardian_phone || 'Not provided'}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>

          {/* Security & Password Settings */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Security Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage password updates and active sessions across devices.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button
                component={Link}
                href="/change-password"
                variant="outlined"
                startIcon={<LockResetIcon />}
              >
                Change Password
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DevicesOtherIcon />}
                onClick={() => setConfirmLogoutAll(true)}
              >
                Log Out from All Devices
              </Button>
            </Box>
          </Paper>
        </Box>

        <ConfirmDialog
          open={confirmLogoutAll}
          title="Log Out from All Devices?"
          description="This will terminate all active login sessions across your browser tabs, mobile devices, and computers."
          confirmLabel="Log Out Everywhere"
          confirmColor="error"
          onConfirm={handleLogoutAll}
          onClose={() => setConfirmLogoutAll(false)}
        />
      </AppShell>
    </RequireRole>
  );
}
