'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { adminAuditApi } from '@/features/audit-logs/api';
import { AuditLogFilterBar, AuditLogTable } from '@/features/audit-logs/components';

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = React.useState('');
  const [actorFilter, setActorFilter] = React.useState('');
  const [debouncedActor, setDebouncedActor] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedActor(actorFilter);
      setPage(0);
    }, 400);
    return () => clearTimeout(handler);
  }, [actorFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { action: actionFilter, actor_email: debouncedActor, page, pageSize }],
    queryFn: () =>
      adminAuditApi.listLogs({
        action: actionFilter || undefined,
        actor_email: debouncedActor || undefined,
        skip: page * pageSize,
        limit: pageSize,
      }),
  });

  const logs = data?.items || [];
  const total = data?.total || 0;

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              System Security & Audit Trail
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Immutable ledger of sensitive administrative operations, logins, user provisioning, and role changes.
            </Typography>
          </Box>

          <AuditLogFilterBar
            actorFilter={actorFilter}
            onActorFilterChange={setActorFilter}
            actionFilter={actionFilter}
            onActionFilterChange={(val) => {
              setActionFilter(val);
              setPage(0);
            }}
          />

          <AuditLogTable
            isLoading={isLoading}
            logs={logs}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(0);
            }}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
