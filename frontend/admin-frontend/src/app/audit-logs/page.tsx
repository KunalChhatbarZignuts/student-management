'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { adminAuditApi } from '@/features/audit-logs/api';

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

          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by actor email..."
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Action Filter"
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="login_success">Login Success</MenuItem>
                  <MenuItem value="login_failure">Login Failure</MenuItem>
                  <MenuItem value="user_created">User Created</MenuItem>
                  <MenuItem value="user_suspended">User Suspended</MenuItem>
                  <MenuItem value="user_activated">User Activated</MenuItem>
                  <MenuItem value="parent_created">Parent Created</MenuItem>
                  <MenuItem value="parent_student_linked">Parent-Student Linked</MenuItem>
                  <MenuItem value="application_approved">Application Approved</MenuItem>
                  <MenuItem value="bulk_import_completed">Bulk Imported</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action Event</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Target Entity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Entity ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Loading live audit trail...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No matching audit log records found in database.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.actor_email || 'System'}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.action}
                          size="small"
                          color={
                            row.action.includes('suspended') || row.action.includes('failure')
                              ? 'error'
                              : row.action.includes('created') || row.action.includes('approved')
                              ? 'success'
                              : 'primary'
                          }
                        />
                      </TableCell>
                      <TableCell>{row.entity_type}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{row.entity_id || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{row.ip || '127.0.0.1'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={total}
              rowsPerPage={pageSize}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
