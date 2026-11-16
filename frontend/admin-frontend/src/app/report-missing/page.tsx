'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { teacherPortalApi } from '@/features/teacher-portal/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import { ReportMissingForm, ReportMissingFormData } from '@/features/teacher-portal/components';

export default function ReportMissingPage() {
  const { showSnackbar } = useSnackbar();

  const mutation = useMutation({
    mutationFn: (data: ReportMissingFormData) => teacherPortalApi.reportMissingStudent(data),
    onSuccess: () => {
      showSnackbar('Missing student notification filed with administration office!', 'success');
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to file report'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <AppShell>
        <Box sx={{ maxWidth: 680, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Report Missing Student
            </Typography>
            <Typography variant="body2" color="text.secondary">
              File an official notice if an enrolled student has an unexcused or prolonged absence from classroom roll call.
            </Typography>
          </Box>

          <ReportMissingForm
            onSubmit={(data) => mutation.mutate(data)}
            isSubmitting={mutation.isPending}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
