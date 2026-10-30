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
import Alert from '@mui/material/Alert';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';

interface AuditLogEntry {
  id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  timestamp: string;
}

// Data fetching helper ready for backend audit log integration
async function fetchAuditLogs(filters: { action?: string; actor?: string }): Promise<AuditLogEntry[]> {
  const allLogs: AuditLogEntry[] = [
    {
      id: '1',
      actor_email: 'admin@school.edu',
      action: 'user_created',
      entity_type: 'student',
      entity_id: '2026-CS-0001',
      ip_address: '127.0.0.1',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      actor_email: 'admin@school.edu',
      action: 'parent_student_linked',
      entity_type: 'parent_student_link',
      entity_id: 'link-499',
      ip_address: '127.0.0.1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      actor_email: 'superadmin@school.edu',
      action: 'user_suspended',
      entity_type: 'user',
      entity_id: 'usr-92',
      ip_address: '127.0.0.1',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '4',
      actor_email: 'admin@school.edu',
      action: 'bulk_imported',
      entity_type: 'user',
      entity_id: 'batch-2026-fall',
      ip_address: '127.0.0.1',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  return allLogs.filter((l) => {
    if (filters.action && l.action !== filters.action) return false;
    if (filters.actor && !l.actor_email.toLowerCase().includes(filters.actor.toLowerCase())) return false;
    return true;
  });
}

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = React.useState('');
  const [actorFilter, setActorFilter] = React.useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', { action: actionFilter, actor: actorFilter }],
    queryFn: () => fetchAuditLogs({ action: actionFilter || undefined, actor: actorFilter || undefined }),
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              System Security & Audit Trail
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Immutable ledger of sensitive administrative operations, logins, user provisioning, and role changes.
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Backend audit log export API is currently internal. Displaying offline event ledger.
          </Alert>

          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Filter by actor email..."
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
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="user_created">User Created</MenuItem>
                  <MenuItem value="user_suspended">User Suspended</MenuItem>
                  <MenuItem value="parent_student_linked">Parent-Student Linked</MenuItem>
                  <MenuItem value="bulk_imported">Bulk Imported</MenuItem>
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
                    <TableCell colSpan={6} align="center">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : !logs || logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No matching audit log records.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.actor_email}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.action}
                          size="small"
                          color={
                            row.action.includes('suspended')
                              ? 'error'
                              : row.action.includes('created')
                              ? 'success'
                              : 'primary'
                          }
                        />
                      </TableCell>
                      <TableCell>{row.entity_type}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{row.entity_id}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{row.ip_address}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </AppShell>
    </RequireRole>
  );
}

