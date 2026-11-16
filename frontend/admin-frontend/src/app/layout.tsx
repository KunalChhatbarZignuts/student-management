import type { Metadata } from 'next';
import * as React from 'react';
import AppProviders from '@/components/providers/AppProviders';
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: 'Student Management System - Admin Portal',
  description: 'Enterprise Student Management System Administration Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
      </head>
      <body>
        <NextTopLoader
          color="#1976d2"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #1976d2,0 0 5px #1976d2"
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
