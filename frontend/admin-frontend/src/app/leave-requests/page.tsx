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
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonIcon from '@mui/icons-material/Person';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { leaveApi, leaveKeys } from '@/features/leaves/api';
import { LeaveApplicationItem } from '@/features/leaves/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function LeaveRequestsPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [currentTab, setCurrentTab] = React.useState<string>('pending');
  const [approveDialog, setApproveDialog] = React.useState<LeaveApplicationItem | null>(null);
  const [approvalRemarks, setApprovalRemarks] = React.useState<string>('');

  const [rejectDialog, setRejectDialog] = React.useState<LeaveApplicationItem | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = React.useState<string>('');

  const statusParam = currentTab === 'all' ? undefined : currentTab;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: leaveKeys.teacherList(statusParam),
    queryFn: () => leaveApi.getTeacherAssignedLeaves(statusParam),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      leaveApi.approveLeave(id, { remarks }),
    onSuccess: (updated) => {
      showSnackbar(`Leave application for ${updated.student_name} approved successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      setApproveDialog(null);
      setApprovalRemarks('');
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to approve leave application'), 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      leaveApi.rejectLeave(id, { remarks }),
    onSuccess: (updated) => {
      showSnackbar(`Leave application for ${updated.student_name} rejected.`, 'info');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      setRejectDialog(null);
      setRejectionRemarks('');
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to reject leave application'), 'error');
    },
  });

  const handleOpenApprove = (app: LeaveApplicationItem) => {
    setApprovalRemarks('');
    setApproveDialog(app);
  };

  const handleOpenReject = (app: LeaveApplicationItem) => {
    setRejectionRemarks('');
    setRejectDialog(app);
  };

  const handleConfirmApprove = () => {
    if (!approveDialog) return;
    approveMutation.mutate({ id: approveDialog.id, remarks: approvalRemarks.trim() || undefined });
  };

  const handleConfirmReject = () => {
    if (!rejectDialog) return;
    if (!rejectionRemarks.trim()) {
      showSnackbar('Please enter a rejection reason or remarks.', 'error');
      return;
    }
    rejectMutation.mutate({ id: rejectDialog.id, remarks: rejectionRemarks.trim() });
  };

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Student Leave Requests
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review, approve, or reject student leave requests for sections where you are assigned as Class Teacher.
            </Typography>
          </Box>

          {/* Status Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2 }}>
            <Tabs
              value={currentTab}
              onChange={(_, val) => setCurrentTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 2, pt: 1 }}
            >
              <Tab
                value="pending"
                label={
                  <Badge
                    badgeContent={data?.pending_count || 0}
                    color="warning"
                    sx={{ pr: 1 }}
                  >
                    Pending Review
                  </Badge>
                }
              />
              <Tab
                value="approved"
                label={`Approved (${data?.approved_count || 0})`}
              />
              <Tab
                value="rejected"
                label={`Rejected (${data?.rejected_count || 0})`}
              />
              <Tab
                value="all"
                label={`All Requests (${data?.total || 0})`}
              />
            </Tabs>
          </Paper>

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
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class / Section</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Leave Period</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Submitted By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : !data?.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No leave requests found for this status tab.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => {
                    const isPending = item.status === 'pending';
                    const isApproved = item.status === 'approved';
                    const isRejected = item.status === 'rejected';

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {item.student_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.enrollment_number || item.student_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.grade_name || '-'} {item.section_name ? `(${item.section_name})` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.start_date} to {item.end_date}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Applied: {new Date(item.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${item.days_count} ${item.days_count === 1 ? 'day' : 'days'}`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={item.submission_role === 'parent' ? <FamilyRestroomIcon /> : <PersonIcon />}
                            label={item.submission_role === 'parent' ? 'Parent' : 'Student'}
                            size="small"
                            color={item.submission_role === 'parent' ? 'secondary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" noWrap title={item.reason}>
                            {item.reason}
                          </Typography>
                          {item.teacher_remarks && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              <strong>Remarks:</strong> {item.teacher_remarks}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPending && (
                            <Chip
                              icon={<HourglassEmptyIcon />}
                              label="Pending"
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
                        <TableCell align="right">
                          {isPending ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleOpenApprove(item)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleOpenReject(item)}
                              >
                                Reject
                              </Button>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {item.decided_at
                                ? `Decided ${new Date(item.decided_at).toLocaleDateString()}`
                                : 'Completed'}
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

          {/* Approve Dialog */}
          <Dialog
            open={Boolean(approveDialog)}
            onClose={() => setApproveDialog(null)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Approve Student Leave Request</DialogTitle>
            <DialogContent dividers>
              {approveDialog && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body1">
                    Are you sure you want to approve <strong>{approveDialog.days_count} day(s)</strong> of leave for <strong>{approveDialog.student_name}</strong>?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dates: {approveDialog.start_date} to {approveDialog.end_date}
                    <br />
                    Reason: {approveDialog.reason}
                  </Typography>
                  <TextField
                    label="Teacher Remarks / Instructions (Optional)"
                    placeholder="e.g. Approved. Please complete missed assignments on return."
                    multiline
                    rows={3}
                    fullWidth
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setApproveDialog(null)}>Cancel</Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleConfirmApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Reject Dialog */}
          <Dialog
            open={Boolean(rejectDialog)}
            onClose={() => setRejectDialog(null)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Reject Student Leave Request</DialogTitle>
            <DialogContent dividers>
              {rejectDialog && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body1">
                    Reject leave application for <strong>{rejectDialog.student_name}</strong> ({rejectDialog.start_date} to {rejectDialog.end_date})?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reason provided: {rejectDialog.reason}
                  </Typography>
                  <TextField
                    label="Rejection Reason / Remarks (Required)"
                    placeholder="e.g. Crucial examination scheduled during this period. Please reschedule."
                    multiline
                    rows={3}
                    fullWidth
                    required
                    value={rejectionRemarks}
                    onChange={(e) => setRejectionRemarks(e.target.value)}
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </AppShell>
    </RequireRole>
  );
}

