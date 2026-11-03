'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { SnackbarProvider } from '@/components/ui/SnackbarProvider';
import AuthBootstrap from '@/components/guards/AuthBootstrap';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRegistry>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <SnackbarProvider>
            <DashboardLayout>
              <AuthBootstrap>{children}</AuthBootstrap>
            </DashboardLayout>
          </SnackbarProvider>
        </LocalizationProvider>
      </ThemeRegistry>
    </QueryClientProvider>
  );
}
