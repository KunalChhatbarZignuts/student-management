'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PhoneDisabledIcon from '@mui/icons-material/PhoneDisabled';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import {
  AbsenceNotificationLogItem,
  absenceNotificationsApi,
} from '@/features/attendance/api/absenceNotificationsApi';

export default function AbsenceNotificationsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('');

  const {
    data: logs = [],
    isLoading: loading,
    refetch: loadLogs,
  } = useQuery<AbsenceNotificationLogItem[]>({
    queryKey: ['absence-notifications', selectedDate, statusFilter],
    queryFn: () =>
      absenceNotificationsApi.getLogs({
        date: selectedDate || undefined,
        status: statusFilter || undefined,
        limit: 100,
      }),
    staleTime: 60 * 1000,
  });

  const sentCount = logs.filter((l) => l.status === 'SENT').length;
  const holidaySuppressed = logs.filter((l) => l.status === 'SUPPRESSED_HOLIDAY').length;
  const noContactSuppressed = logs.filter((l) => l.status === 'SUPPRESSED_NO_CONTACT').length;

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER]}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NotificationsActiveIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Automated Absence Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Audit dispatch history for parent alerts automatically triggered during daily classroom roll call.
              </Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadLogs(); }}>
            Refresh
          </Button>
        </Box>

        {/* KPI Metric Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: 'success.50', border: '1px solid #bbf7d0', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="success.dark" fontWeight={600}>
                  NOTIFICATIONS DISPATCHED (SENT)
                </Typography>
                <Typography variant="h4" color="success.main" fontWeight={700}>
                  {sentCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: 'info.50', border: '1px solid #bfdbfe', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="info.dark" fontWeight={600}>
                  SUPPRESSED ON HOLIDAY / WEEKEND
                </Typography>
                <Typography variant="h4" color="info.main" fontWeight={700}>
                  {holidaySuppressed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: 'warning.50', border: '1px solid #fde68a', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="warning.dark" fontWeight={600}>
                  SUPPRESSED (MISSING CONTACT)
                </Typography>
                <Typography variant="h4" color="warning.dark" fontWeight={700}>
                  {noContactSuppressed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters Card */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Filter by Date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Filter by Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="SENT">Delivered / Sent</MenuItem>
                  <MenuItem value="SUPPRESSED_HOLIDAY">Suppressed (Holiday)</MenuItem>
                  <MenuItem value="SUPPRESSED_NO_CONTACT">Suppressed (No Contact)</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="text"
                  onClick={() => {
                    setSelectedDate('');
                    setStatusFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Logs Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : logs.length > 0 ? (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Student & Class</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Roll Call Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Parent / Recipient</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Dispatch Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Personalized Alert Message</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => {
                  let statusChip = <Chip size="small" label={log.status} />;
                  if (log.status === 'SENT') {
                    statusChip = (
                      <Chip
                        size="small"
                        color="success"
                        label="Delivered"
                        icon={<SendIcon sx={{ fontSize: '13px !important' }} />}
                      />
                    );
                  } else if (log.status === 'SUPPRESSED_HOLIDAY') {
                    statusChip = (
                      <Chip
                        size="small"
                        color="info"
                        label="Holiday Suppressed"
                        icon={<EventBusyIcon sx={{ fontSize: '13px !important' }} />}
                      />
                    );
                  } else if (log.status === 'SUPPRESSED_NO_CONTACT') {
                    statusChip = (
                      <Chip
                        size="small"
                        color="warning"
                        label="Missing Contact"
                        icon={<PhoneDisabledIcon sx={{ fontSize: '13px !important' }} />}
                      />
                    );
                  }

                  return (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {log.student_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.admission_number} • {log.grade_name} - {log.section_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.date}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Period {log.period}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.parent_name || 'Primary Guardian'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.recipient || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={log.channel} />
                      </TableCell>
                      <TableCell>{statusChip}</TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.825rem' }}>
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.sent_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No absence notifications found matching the selected filters.
          </Alert>
        )}
      </Box>
    </RequireRole>
  );
}
