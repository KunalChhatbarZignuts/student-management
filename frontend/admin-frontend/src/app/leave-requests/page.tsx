'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import { ROLES } from '@/lib/constants';
import { leaveApi, leaveKeys } from '@/features/leaves/api';
import { LeaveApplicationItem } from '@/features/leaves/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import LeaveRequestsTable from '@/features/leaves/components/LeaveRequestsTable';
import LeaveApprovalDialog from '@/features/leaves/components/LeaveApprovalDialog';

export default function LeaveRequestsPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [currentTab, setCurrentTab] = React.useState<string>('pending');
  const [activeDialog, setActiveDialog] = React.useState<{
    type: 'approve' | 'reject';
    application: LeaveApplicationItem;
  } | null>(null);

  const statusParam = currentTab === 'all' ? undefined : currentTab;

  const { data, isLoading, error } = useQuery({
    queryKey: leaveKeys.teacherList(statusParam),
    queryFn: () => leaveApi.getTeacherAssignedLeaves(statusParam),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      leaveApi.approveLeave(id, { remarks }),
    onSuccess: (updated) => {
      showSnackbar(`Leave application for ${updated.student_name} approved successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      setActiveDialog(null);
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
      setActiveDialog(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to reject leave application'), 'error');
    },
  });

  const handleConfirmDecision = (remarks: string) => {
    if (!activeDialog) return;
    if (activeDialog.type === 'approve') {
      approveMutation.mutate({
        id: activeDialog.application.id,
        remarks: remarks.trim() || undefined,
      });
    } else {
      rejectMutation.mutate({
        id: activeDialog.application.id,
        remarks: remarks.trim(),
      });
    }
  };

  return (
    <RequireRole roles={[ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          <PageHeader
            title="Class Leave Applications"
            subtitle="Review, approve, or reject student leave requests submitted by enrolled students or their registered parents."
          />

          {/* Status Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2 }} elevation={0} variant="outlined">
            <Tabs
              value={currentTab}
              onChange={(_, val) => setCurrentTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ px: 2 }}
            >
              <Tab
                value="pending"
                label={`Pending Review (${data?.pending_count || 0})`}
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
          <LeaveRequestsTable
            items={data?.items || []}
            isLoading={isLoading}
            onApprove={(item) => setActiveDialog({ type: 'approve', application: item })}
            onReject={(item) => setActiveDialog({ type: 'reject', application: item })}
          />

          {/* Approval / Rejection Modal */}
          {activeDialog && (
            <LeaveApprovalDialog
              type={activeDialog.type}
              application={activeDialog.application}
              onClose={() => setActiveDialog(null)}
              onConfirm={handleConfirmDecision}
              isSubmitting={approveMutation.isPending || rejectMutation.isPending}
            />
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
