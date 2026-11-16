'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { leaveApi, leaveKeys } from '@/features/leaves/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import {
  LeaveApplicationsHeader,
  LeaveParentChildSelector,
  LeaveApplicationsTable,
  ApplyLeaveDialog,
} from '@/features/leaves/components';

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
      setOpenApplyDialog(false);
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
      setOpenApplyDialog(false);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to submit leave application'), 'error');
    },
  });

  const handleSubmitApply = (data: { startDate: string; endDate: string; reason: string }) => {
    const { startDate, endDate, reason } = data;
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
          <LeaveApplicationsHeader
            isParent={isParent}
            onApplyClick={() => setOpenApplyDialog(true)}
          />

          {/* Parent Child Selector Tabs */}
          {isParent && (
            <LeaveParentChildSelector
              childrenList={childrenList}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
            />
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formatErrorMessage(error, 'Failed to load leave applications.')}
            </Alert>
          )}

          {/* Applications Table */}
          <LeaveApplicationsTable
            applications={applications}
            isLoading={isLoading}
          />

          {/* New Leave Application Dialog */}
          <ApplyLeaveDialog
            open={openApplyDialog}
            onClose={() => setOpenApplyDialog(false)}
            isParent={isParent}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitApply}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
