'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Link from 'next/link';

import PersonIcon from '@mui/icons-material/Person';
import LockResetIcon from '@mui/icons-material/LockReset';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import SecurityIcon from '@mui/icons-material/Security';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/auth/hooks';
import { authApi } from '@/features/auth/api';
import { ADMIN_ALLOWED_ROLES, ROLES } from '@/lib/constants';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function AdminProfilePage() {
  const { user, role, logout } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [confirmLogoutAll, setConfirmLogoutAll] = React.useState(false);

  // 2FA Dialog & State
  const [open2FADialog, setOpen2FADialog] = React.useState(false);
  const [setupData, setSetupData] = React.useState<{ secret: string; otpauth_url: string } | null>(null);
  const [totpCode, setTotpCode] = React.useState('');
  const [loading2FA, setLoading2FA] = React.useState(false);
  const [error2FA, setError2FA] = React.useState<string | null>(null);

  const canUse2FA = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

  const handleStart2FASetup = async () => {
    setError2FA(null);
    setLoading2FA(true);
    setOpen2FADialog(true);
    try {
      const res = await authApi.setup2FA();
      setSetupData(res);
    } catch (err: unknown) {
      setError2FA(formatErrorMessage(err, 'Failed to initialize 2FA setup.'));
    } finally {
      setLoading2FA(false);
    }
  };

  const handleVerifyAndEnable2FA = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setError2FA('Please enter a valid 6-digit code');
      return;
    }
    setError2FA(null);
    setLoading2FA(true);
    try {
      await authApi.enable2FA({ code: totpCode });
      showSnackbar('Two-Factor Authentication has been enabled successfully!', 'success');
      setOpen2FADialog(false);
      setTotpCode('');
      if (user) {
        user.totp_enabled = true;
      }
    } catch (err: unknown) {
      setError2FA(formatErrorMessage(err, 'Invalid verification code. Please check your authenticator app.'));
    } finally {
      setLoading2FA(false);
    }
  };

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
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Profile & Security
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review staff credentials, active authorizations, and configure Two-Factor Authentication.
            </Typography>
          </Box>

          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
                <PersonIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {user?.teacher
                    ? `${user.teacher.first_name} ${user.teacher.last_name}`
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
                  TWO-FACTOR AUTHENTICATION
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={user?.totp_enabled ? 'ENABLED' : 'NOT CONFIGURED'}
                    color={user?.totp_enabled ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
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

          {/* Security & 2FA Controls */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Security Credentials & Multi-Factor Auth
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Keep your administrator account protected with hardware-based TOTP and strong passwords.
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

              {canUse2FA && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SecurityIcon />}
                  onClick={handleStart2FASetup}
                  disabled={user?.totp_enabled}
                >
                  {user?.totp_enabled ? '2FA Enabled' : 'Configure 2FA Authenticator'}
                </Button>
              )}

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

        {/* 2FA Setup Modal */}
        <Dialog open={open2FADialog} onClose={() => setOpen2FADialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Two-Factor Authentication Setup</DialogTitle>
          <DialogContent>
            {loading2FA && !setupData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Scan this secret key or enter it manually into Google Authenticator or 1Password:
                </Typography>

                {setupData && (
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.100' }}>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={700}>
                      {setupData.secret}
                    </Typography>
                  </Paper>
                )}

                {error2FA && <Alert severity="error">{error2FA}</Alert>}

                <TextField
                  label="Enter 6-digit confirmation code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.trim())}
                  inputProps={{ maxLength: 6 }}
                  fullWidth
                  autoFocus
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOpen2FADialog(false)} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleVerifyAndEnable2FA}
              variant="contained"
              disabled={loading2FA || totpCode.length !== 6}
            >
              Verify & Activate
            </Button>
          </DialogActions>
        </Dialog>

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

