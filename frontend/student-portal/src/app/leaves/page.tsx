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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { leaveApi, leaveKeys } from '@/features/leaves/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function LeaveApplicationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const isParent = user?.role === ROLES.PARENT;

  // For parents: fetch linked children
  const { data: childrenList, isLoading: loadingChildren } = useMyChildren();
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');

  React.useEffect(() => {
    if (isParent && childrenList && childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [isParent, childrenList, selectedChildId]);

  // Dialog State
  const [openApplyDialog, setOpenApplyDialog] = React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');

  // 1. Student query
  const {
    data: studentApplications,
    isLoading: loadingStudentApps,
    error: studentError,
  } = useQuery({
    queryKey: leaveKeys.studentList(),
    queryFn: leaveApi.getMyLeaveApplications,
    enabled: !isParent,
  });

  // 2. Parent query
  const {
    data: parentApplications,
    isLoading: loadingParentApps,
    error: parentError,
  } = useQuery({
    queryKey: leaveKeys.parentList(selectedChildId || undefined),
    queryFn: () => leaveApi.getChildLeaveApplications(selectedChildId || undefined),
    enabled: isParent && Boolean(selectedChildId),
  });

  const applications = isParent ? parentApplications : studentApplications;
  const isLoading = isParent ? loadingChildren || loadingParentApps : loadingStudentApps;
  const error = isParent ? parentError : studentError;

  // Mutations
  const applyStudentMutation = useMutation({
    mutationFn: leaveApi.applyStudentLeave,
    onSuccess: () => {
      showSnackbar('Leave application submitted successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      handleCloseDialog();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to submit leave application'), 'error');
    },
  });

  const applyParentMutation = useMutation({
    mutationFn: leaveApi.applyParentLeave,
    onSuccess: () => {
      showSnackbar('Leave application submitted on behalf of your child!', 'success');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      handleCloseDialog();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to submit leave application'), 'error');
    },
  });

  const handleOpenDialog = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setStartDate(dateStr);
    setEndDate(dateStr);
    setReason('');
    setOpenApplyDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenApplyDialog(false);
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const handleSubmitApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      showSnackbar('Please complete all required fields.', 'error');
      return;
    }
    if (endDate < startDate) {
      showSnackbar('End date cannot be earlier than start date.', 'error');
      return;
    }

    if (isParent) {
      if (!selectedChildId) {
        showSnackbar('Please select a child first.', 'error');
        return;
      }
      applyParentMutation.mutate({
        student_id: selectedChildId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
    } else {
      applyStudentMutation.mutate({
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
    }
  };

  const isSubmitting = applyStudentMutation.isPending || applyParentMutation.isPending;

  return (
    <RequireRole roles={[ROLES.STUDENT, ROLES.PARENT]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Leave Applications
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {isParent
                  ? 'Submit leave requests for your linked children and track Class Teacher approvals.'
                  : 'Submit planned absence requests and monitor your Class Teacher’s review.'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{ borderRadius: 2 }}
            >
              Apply for Leave
            </Button>
          </Box>

          {/* Parent Child Selector Tabs */}
          {isParent && childrenList && childrenList.length > 0 && (
            <Paper sx={{ mb: 3, borderRadius: 2 }}>
              <Tabs
                value={selectedChildId}
                onChange={(_, val) => setSelectedChildId(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 2, pt: 1 }}
              >
                {childrenList.map((child) => (
                  <Tab
                    key={child.id}
                    value={child.id}
                    label={`${child.first_name} ${child.last_name}`}
                  />
                ))}
              </Tabs>
            </Paper>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formatErrorMessage(error, 'Failed to load leave applications.')}
            </Alert>
          )}

          {/* Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Requested Dates</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Assigned Class Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Teacher Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : !applications || applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      <EventNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body1">No leave applications recorded.</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Click "Apply for Leave" above to submit a new request.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((item) => {
                    const isPending = item.status === 'pending';
                    const isApproved = item.status === 'approved';
                    const isRejected = item.status === 'rejected';

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.start_date} to {item.end_date}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted: {new Date(item.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${item.days_count} ${item.days_count === 1 ? 'day' : 'days'}`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2">
                            {item.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary.main">
                            {item.class_teacher_name || 'Pending Assignment'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isPending && (
                            <Chip
                              icon={<HourglassEmptyIcon />}
                              label="Pending Review"
                              size="small"
                              color="warning"
                            />
                          )}
                          {isApproved && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Approved"
                              size="small"
                              color="success"
                            />
                          )}
                          {isRejected && (
                            <Chip
                              icon={<CancelIcon />}
                              label="Rejected"
                              size="small"
                              color="error"
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          {item.teacher_remarks ? (
                            <Typography variant="body2">
                              {item.teacher_remarks}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {isPending ? 'Awaiting teacher decision' : 'No remarks'}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* New Leave Application Dialog */}
          <Dialog
            open={openApplyDialog}
            onClose={handleCloseDialog}
            maxWidth="sm"
            fullWidth
            component="form"
            onSubmit={handleSubmitApply}
          >
            <DialogTitle>
              {isParent ? 'Submit Leave Request for Child' : 'New Leave Application'}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Box>

                <TextField
                  label="Reason for Leave"
                  placeholder="Please state the specific reason for your absence (e.g., family wedding, medical appointment)..."
                  multiline
                  rows={4}
                  required
                  fullWidth
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  helperText="Your assigned Class Teacher will review this request."
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </AppShell>
    </RequireRole>
  );
}

