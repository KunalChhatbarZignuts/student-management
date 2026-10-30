'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { SnackbarProvider } from '@/components/ui/SnackbarProvider';
import AuthBootstrap from '@/components/guards/AuthBootstrap';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRegistry>
        <SnackbarProvider>
          <AuthBootstrap>{children}</AuthBootstrap>
        </SnackbarProvider>
      </ThemeRegistry>
    </QueryClientProvider>
  );
}
