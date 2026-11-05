'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from 'next/link';
import { SxProps, Theme } from '@mui/material/styles';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  sx,
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2,
        mb: 3,
        ...sx,
      }}
    >
      <Box>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 0.5, fontSize: '0.85rem' }}>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              if (isLast || !crumb.href) {
                return (
                  <Typography key={idx} color="text.primary" variant="caption" sx={{ fontWeight: 600 }}>
                    {crumb.label}
                  </Typography>
                );
              }
              return (
                <Link
                  key={idx}
                  href={crumb.href}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ '&:hover': { textDecoration: 'underline' } }}
                  >
                    {crumb.label}
                  </Typography>
                </Link>
              );
            })}
          </Breadcrumbs>
        )}
        <Typography variant="h5" component="h1" fontWeight={700}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}

