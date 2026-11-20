'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';

const PUBLIC_ROUTES = [
  '/login',
  '/accept-invite',
  '/forgot-password',
  '/reset-password',
  '/change-password',
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname?.startsWith(route)
  );

  // Live video streaming classroom runs in immersive full-window mode without sidebar/app shell
  const isImmersiveLiveRoute = Boolean(
    pathname?.includes('/online-classroom/') && pathname?.endsWith('/live')
  );

  if (isPublicRoute || isImmersiveLiveRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}

