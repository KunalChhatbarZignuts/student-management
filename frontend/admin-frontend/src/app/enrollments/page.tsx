'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddTaskIcon from '@mui/icons-material/AddTask';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SchoolIcon from '@mui/icons-material/School';
import {
  EnrollmentDashboardCards,
  UnassignedStudentsTable,
  BulkEnrollmentDialog,
} from '@/features/enrollments/components';
import { enrollmentsApi } from '@/features/enrollments/api';

export default function AcademicEnrollmentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState(0);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = React.useState<string[]>([]);
  const [isBulkOpen, setIsBulkOpen] = React.useState(false);

  // Queries
  const { data: metrics, isLoading: isMetricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['enrollment-dashboard'],
    queryFn: () => enrollmentsApi.getDashboardMetrics(),
  });

  const { data: unassigned = [], isLoading: isUnassignedLoading, refetch: refetchUnassigned } = useQuery({
    queryKey: ['unassigned-students'],
    queryFn: () => enrollmentsApi.getUnassignedStudents(),
  });

  const { data: transfers = [], isLoading: isTransfersLoading } = useQuery({
    queryKey: ['transfer-records-all'],
    queryFn: () => enrollmentsApi.getTransferRecords(),
  });

  return (
    <RequireRole roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Academic Enrollment & Transfer Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maintain accurate linkages between students, academic years, grades, and sections with full transfer history.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<TrendingUpIcon />}
                onClick={() => router.push('/enrollments/promotions')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                Promotion Wizard
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddTaskIcon />}
                disabled={unassigned.length === 0}
                onClick={() => {
                  setSelectedUnassignedIds(unassigned.map((s) => s.student_id));
                  setIsBulkOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                Bulk Assign Students
              </Button>
            </Stack>
          </Box>

          {/* Metric KPI Cards */}
          {isMetricsLoading ? (
            <Grid container spacing={2}>
              {[1, 2, 3, 4, 5].map((key) => (
                <Grid item xs={12} sm={6} md={2.4} key={key}>
                  <Card elevation={0} variant="outlined" sx={{ borderRadius: 3, p: 1 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Skeleton variant="circular" width={48} height={48} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" width="60%" height={20} />
                        <Skeleton variant="text" width="40%" height={32} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : metrics ? (
            <EnrollmentDashboardCards metrics={metrics} />
          ) : null}

          {/* Workspace Tabs */}
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, mt: 3, overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label={`Unassigned Students (${unassigned.length})`} />
              <Tab label={`Section Capacities & Roster (${metrics?.section_distribution.length || 0})`} />
              <Tab label={`Transfer History Ledger (${transfers.length})`} />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Tab 0: Unassigned Students */}
              {activeTab === 0 && (
                <UnassignedStudentsTable
                  students={unassigned}
                  selectedIds={selectedUnassignedIds}
                  onSelect={setSelectedUnassignedIds}
                  onOpenBulkEnroll={() => setIsBulkOpen(true)}
                  isLoading={isUnassignedLoading}
                />
              )}

              {/* Tab 1: Section Capacities */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Grade & Section Enrollment Distribution
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Class Teacher</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Enrolled / Capacity</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Available Seats</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Capacity Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {isMetricsLoading ? (
                          [1, 2, 3, 4, 5].map((row) => (
                            <TableRow key={row}>
                              <TableCell><Skeleton width={80} height={20} /></TableCell>
                              <TableCell><Skeleton width={40} height={20} /></TableCell>
                              <TableCell><Skeleton width={120} height={20} /></TableCell>
                              <TableCell><Skeleton width={70} height={20} /></TableCell>
                              <TableCell><Skeleton width={50} height={20} /></TableCell>
                              <TableCell><Skeleton width={90} height={24} /></TableCell>
                            </TableRow>
                          ))
                        ) : metrics?.section_distribution.map((sec) => {
                          const cap = sec.capacity ?? 30;
                          const avail = cap - sec.enrolled_count;
                          const isFull = avail <= 0;
                          return (
                            <TableRow key={sec.section_id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{sec.grade_name}</TableCell>
                              <TableCell>{sec.section_name}</TableCell>
                              <TableCell>{sec.class_teacher_name || '—'}</TableCell>
                              <TableCell>
                                <strong>{sec.enrolled_count}</strong> / {sec.capacity ?? 'No limit'}
                              </TableCell>
                              <TableCell>{sec.capacity ? Math.max(0, avail) : 'Unlimited'}</TableCell>
                              <TableCell>
                                {isFull ? (
                                  <Chip label="Section Full" color="error" size="small" sx={{ fontWeight: 600 }} />
                                ) : avail <= 3 ? (
                                  <Chip label="Near Capacity" color="warning" size="small" sx={{ fontWeight: 600 }} />
                                ) : (
                                  <Chip label="Seats Available" color="success" size="small" sx={{ fontWeight: 600 }} />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Tab 2: Transfer Ledger */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Student Transfer & Relocation Audit Ledger
                  </Typography>
                  {isTransfersLoading ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>From Class</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>To Class</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Mandatory Reason</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Admin Actor</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {[1, 2, 3, 4, 5].map((row) => (
                            <TableRow key={row}>
                              <TableCell><Skeleton width={80} height={20} /></TableCell>
                              <TableCell><Skeleton width={130} height={20} /></TableCell>
                              <TableCell><Skeleton width={90} height={20} /></TableCell>
                              <TableCell><Skeleton width={90} height={20} /></TableCell>
                              <TableCell><Skeleton width={70} height={24} /></TableCell>
                              <TableCell><Skeleton width={140} height={20} /></TableCell>
                              <TableCell><Skeleton width={80} height={20} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : transfers.length === 0 ? (
                    <Alert severity="info">No student transfer records found in the audit ledger.</Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>From Class</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>To Class</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Mandatory Reason</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Admin Actor</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {transfers.map((tr) => (
                            <TableRow key={tr.id} hover>
                              <TableCell>{tr.transfer_date}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {tr.student_name} ({tr.student_code})
                              </TableCell>
                              <TableCell>
                                {tr.from_grade_name || ''} - {tr.from_section_name || ''}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {tr.to_grade_name || ''} - {tr.to_section_name || ''}
                              </TableCell>
                              <TableCell>
                                <Chip label={tr.transfer_type.replace('_', ' ')} size="small" />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 220 }}>
                                <Typography variant="caption" fontWeight={600} display="block">
                                  {tr.reason}
                                </Typography>
                                {tr.remarks && (
                                  <Typography variant="caption" color="text.secondary">
                                    {tr.remarks}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>{tr.performed_by_name || 'Admin'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </Box>
          </Paper>

          {/* Bulk Enrollment Dialog */}
          <BulkEnrollmentDialog
            open={isBulkOpen}
            onClose={() => setIsBulkOpen(false)}
            selectedStudentIds={selectedUnassignedIds}
            onSuccess={() => {
              refetchMetrics();
              refetchUnassigned();
              setSelectedUnassignedIds([]);
            }}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
