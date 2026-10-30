'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { adminApplicationApi, applicationKeys, ApplicationItem } from '@/features/applications/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [approveDialog, setApproveDialog] = React.useState<ApplicationItem | null>(null);
  const [rejectDialog, setRejectDialog] = React.useState<ApplicationItem | null>(null);

  const { data: applications, isLoading, error } = useQuery({
    queryKey: applicationKeys.list(),
    queryFn: adminApplicationApi.listApplications,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApplicationApi.approveApplication(id),
    onSuccess: () => {
      showSnackbar('Application approved and student account created!', 'success');
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      setApproveDialog(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to approve application'), 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApplicationApi.rejectApplication(id),
    onSuccess: () => {
      showSnackbar('Application has been rejected.', 'info');
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      setRejectDialog(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to reject application'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Admissions Applications Queue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review prospect admissions, assign classes, and approve or reject submissions.
            </Typography>
          </Box>

          {error && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Online admissions applications are currently offline or disabled in system settings.
            </Alert>
          )}

          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Applicant Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>DOB</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : !applications || applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No applications currently in queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {app.first_name} {app.last_name}
                      </TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>{app.department}</TableCell>
                      <TableCell>{app.dob}</TableCell>
                      <TableCell>
                        <Chip
                          label={app.status.toUpperCase()}
                          color={
                            app.status === 'approved'
                              ? 'success'
                              : app.status === 'rejected'
                              ? 'error'
                              : 'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {app.status === 'pending' && (
                          <Box sx={{ display: 'inline-flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => setApproveDialog(app)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<CloseIcon />}
                              onClick={() => setRejectDialog(app)}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Approve Modal */}
        {approveDialog && (
          <Dialog open={Boolean(approveDialog)} onClose={() => setApproveDialog(null)} maxWidth="xs" fullWidth>
            <DialogTitle fontWeight={700}>Approve Student Application</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary">
                Are you sure you want to approve the application for <strong>{approveDialog.first_name} {approveDialog.last_name}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This will automatically generate a student code, provision a student account, and send an invitation email to <strong>{approveDialog.email}</strong>.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setApproveDialog(null)} color="inherit">
                Cancel
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(approveDialog.id)}
              >
                Confirm Approval
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Reject Modal */}
        {rejectDialog && (
          <Dialog open={Boolean(rejectDialog)} onClose={() => setRejectDialog(null)} maxWidth="xs" fullWidth>
            <DialogTitle fontWeight={700}>Reject Application</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary">
                Are you sure you want to reject the application for <strong>{rejectDialog.first_name} {rejectDialog.last_name}</strong>?
              </Typography>
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setRejectDialog(null)} color="inherit">
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(rejectDialog.id)}
              >
                Confirm Rejection
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </AppShell>
    </RequireRole>
  );
}

