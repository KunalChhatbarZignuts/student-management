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
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/auth/hooks';
import { useMyStudentProfile } from '@/features/students/hooks';
import { useParentProfile, useUpdateParentProfile } from '@/features/parents/hooks';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const { data: student } = useMyStudentProfile();
  const { data: parentProfile } = useParentProfile();
  const updateParentMutation = useUpdateParentProfile();
  const { showSnackbar } = useSnackbar();

  const [confirmLogoutAll, setConfirmLogoutAll] = React.useState(false);
  const [openEditParent, setOpenEditParent] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
  });

  const isStudent = role === ROLES.STUDENT;
  const isParent = role === ROLES.PARENT;

  React.useEffect(() => {
    if (parentProfile) {
      setEditForm({
        first_name: parentProfile.first_name || '',
        last_name: parentProfile.last_name || '',
        phone: parentProfile.phone || '',
        address: parentProfile.address || '',
      });
    }
  }, [parentProfile]);

  const handleSaveParentProfile = async () => {
    try {
      await updateParentMutation.mutateAsync(editForm);
      showSnackbar('Profile details updated successfully', 'success');
      setOpenEditParent(false);
    } catch {
      showSnackbar('Failed to update profile details', 'error');
    }
  };

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
                      ENROLLMENT NUMBER
                    </Typography>
                    <Typography variant="body1" fontWeight={700} color="primary.main">
                      {student?.enrollment_number || user?.student?.enrollment_number || 'Pending'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      STUDENT CODE / ID
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.student_code || user?.student?.student_code || 'Pending'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      ACADEMIC YEAR
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.current_academic_year || '2026-2027'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      GRADE & SECTION
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {student?.current_grade || student?.class_name || 'N/A'} - Section {student?.current_section || student?.section || 'A'}
                    </Typography>
                  </Grid>

                  {student?.class_teacher_name && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        CLASS TEACHER
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="secondary.main">
                        {student.class_teacher_name}
                      </Typography>
                    </Grid>
                  )}

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

              {isParent && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      FIRST NAME
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {parentProfile?.first_name || user?.parent?.first_name || '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      LAST NAME
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {parentProfile?.last_name || user?.parent?.last_name || '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      PRIMARY PHONE
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {parentProfile?.phone || user?.parent?.phone || 'Not provided'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      TOTAL LINKED CHILDREN
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="primary.main">
                      {parentProfile?.children_count ?? parentProfile?.children?.length ?? 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      RESIDENTIAL ADDRESS
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {parentProfile?.address || 'Not provided'}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>

            {isParent && (
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => setOpenEditParent(true)}
                >
                  Edit Contact Details
                </Button>
              </Box>
            )}
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

        {/* Edit Parent Profile Dialog */}
        <Dialog open={openEditParent} onClose={() => setOpenEditParent(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Update Guardian Profile</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Registered Email"
                value={user?.email || ''}
                disabled
                helperText="Email address cannot be modified directly"
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="First Name"
                  required
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Last Name"
                  required
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  fullWidth
                />
              </Box>
              <TextField
                label="Contact Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+1 555-0199"
                fullWidth
              />
              <TextField
                label="Residential Address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="123 Maple Street, City, State"
                multiline
                rows={2}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenEditParent(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveParentProfile}
              disabled={updateParentMutation.isPending || !editForm.first_name.trim() || !editForm.last_name.trim()}
              startIcon={updateParentMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {updateParentMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      </AppShell>
    </RequireRole>
  );
}
