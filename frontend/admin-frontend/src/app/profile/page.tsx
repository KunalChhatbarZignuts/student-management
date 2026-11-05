'use client';

import * as React from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import LockResetIcon from '@mui/icons-material/LockReset';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { useAuth } from '@/features/auth/hooks';
import { ROLES } from '@/lib/constants';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const ADMIN_ALLOWED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER];

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [confirmLogoutAll, setConfirmLogoutAll] = React.useState(false);

  const handleLogoutAll = async () => {
    setConfirmLogoutAll(false);
    showSnackbar('Logged out from all administrative sessions', 'info');
    await logout();
  };

  return (
    <RequireRole roles={ADMIN_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 880, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              My Administrative Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review your account details and security settings
            </Typography>
          </Box>

          {/* User Information Card */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {user?.teacher
                    ? `${user.teacher.first_name} ${user.teacher.last_name}`
                    : user?.email}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={role || 'STAFF'}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  ACCOUNT ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {user?.id}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  STATUS
                </Typography>
                <Typography variant="body1" fontWeight={600} color="success.main">
                  {user?.status || 'ACTIVE'}
                </Typography>
              </Grid>

              {user?.teacher && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      EMPLOYEE CODE
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="primary.main">
                      {user.teacher.employee_code}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      DEPARTMENT
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {user.teacher.department}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>

          {/* Security & Password Controls */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Security & Password Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Keep your administrator account protected with strong passwords and active session management.
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
          description="This will terminate all active administrator sessions across your browser tabs, mobile devices, and computers."
          confirmLabel="Log Out Everywhere"
          confirmColor="error"
          onConfirm={handleLogoutAll}
          onClose={() => setConfirmLogoutAll(false)}
        />
      </AppShell>
    </RequireRole>
  );
}
