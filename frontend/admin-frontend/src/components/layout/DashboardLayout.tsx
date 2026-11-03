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

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}

