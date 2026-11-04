'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonIcon from '@mui/icons-material/Person';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { leaveApi, leaveKeys } from '@/features/leaves/api';
import { LeaveMonitoringFilters } from '@/features/leaves/types';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function LeaveMonitoringPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = React.useState<string>('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filters: LeaveMonitoringFilters = React.useMemo(() => {
    const f: LeaveMonitoringFilters = {};
    if (statusFilter) f.status = statusFilter;
    if (debouncedQuery.trim()) f.query = debouncedQuery.trim();
    return f;
  }, [statusFilter, debouncedQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: leaveKeys.adminMonitoring(filters),
    queryFn: () => leaveApi.getAdminMonitoringLeaves(filters),
  });

  const unassignedCount = React.useMemo(() => {
    if (!data?.items) return 0;
    return data.items.filter((item) => !item.class_teacher_id).length;
  }, [data]);

  return (
    <RequireRole roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Student Leave Monitoring
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Central institutional oversight for all student leave applications, tracking Class Teacher approval status and workflow compliance.
            </Typography>
          </Box>

          {/* Metric Overview Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: 1, borderColor: 'divider', boxShadow: 0 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Total Applications
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {data?.total || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: 1, borderColor: 'warning.light', bgcolor: 'warning.50', boxShadow: 0 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="warning.dark" fontWeight={600} textTransform="uppercase">
                    Pending Review
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.dark">
                    {data?.pending_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: 1, borderColor: 'success.light', bgcolor: 'success.50', boxShadow: 0 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="success.dark" fontWeight={600} textTransform="uppercase">
                    Approved Leaves
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.dark">
                    {data?.approved_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, border: 1, borderColor: 'error.light', bgcolor: 'error.50', boxShadow: 0 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="error.dark" fontWeight={600} textTransform="uppercase">
                    Rejected Leaves
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="error.dark">
                    {data?.rejected_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {unassignedCount > 0 && (
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
              <strong>{unassignedCount} application(s)</strong> belong to students without an assigned Class Teacher. Please assign Class Teachers to the respective sections in Grades & Sections.
            </Alert>
          )}

          {/* Filter Bar */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                select
                label="Application Status"
                size="small"
                sx={{ minWidth: 180 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>

              <TextField
                label="Search Student"
                placeholder="Search name, code, or enrollment..."
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Stack>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formatErrorMessage(error, 'Failed to fetch monitoring records.')}
            </Alert>
          )}

          {/* Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class / Section</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Assigned Class Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Leave Period</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Submitted By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Decision / Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : !data?.items || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No leave applications match the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => {
                    const isPending = item.status === 'pending';
                    const isApproved = item.status === 'approved';
                    const isRejected = item.status === 'rejected';

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {item.student_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.enrollment_number || item.student_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.grade_name || '-'} {item.section_name ? `(${item.section_name})` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.class_teacher_name ? (
                            <Typography variant="body2" fontWeight={600} color="primary.main">
                              {item.class_teacher_name}
                            </Typography>
                          ) : (
                            <Chip
                              label="Unassigned"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.start_date} to {item.end_date}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({item.days_count} {item.days_count === 1 ? 'day' : 'days'})
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={item.submission_role === 'parent' ? <FamilyRestroomIcon /> : <PersonIcon />}
                            label={item.submission_role === 'parent' ? 'Parent' : 'Student'}
                            size="small"
                            color={item.submission_role === 'parent' ? 'secondary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" noWrap title={item.reason}>
                            {item.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isPending && (
                            <Chip
                              icon={<HourglassEmptyIcon />}
                              label="Pending"
                              size="small"
                              color="warning"
                            />
                          )}
                          {isApproved && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Approved"
                              size="small"
                              color="success"
                            />
                          )}
                          {isRejected && (
                            <Chip
                              icon={<CancelIcon />}
                              label="Rejected"
                              size="small"
                              color="error"
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          {item.teacher_remarks ? (
                            <Typography variant="body2" title={item.teacher_remarks}>
                              {item.teacher_remarks}
                            </Typography>
                          ) : isPending ? (
                            <Typography variant="caption" color="text.secondary">
                              Awaiting teacher decision
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No remarks recorded
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </AppShell>
    </RequireRole>
  );
}

