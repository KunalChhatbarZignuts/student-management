'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apiClient } from '@/lib/axios';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import {
  AbsentTeacherCoverageResponse,
  AffectedTimetableSlot,
  SubstitutionResponse,
} from '@/features/substitutions/types';
import { substitutionApi } from '@/features/substitutions/api';
import { AssignSubstituteModal } from '@/features/substitutions/components/AssignSubstituteModal';

interface TeacherOption {
  id: string;
  name: string;
  employee_code?: string;
  department?: string;
}

export default function TeacherSubstitutionsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const queryClient = useQueryClient();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [tabIndex, setTabIndex] = useState(0);

  // Modal state
  const [activeSlot, setActiveSlot] = useState<AffectedTimetableSlot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Cached teacher catalog
  const { data: teachers = [] } = useQuery<TeacherOption[]>({
    queryKey: ['admin', 'teachers', 'options'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/teachers');
      const raw = res.data?.data || res.data || [];
      return raw.map((t: any) => ({
        id: t.id,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.name || 'Teacher',
        employee_code: t.employee_code,
        department: t.department,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Default to first teacher
  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  // Cached coverage schedule for teacher and date
  const {
    data: coverageData = null,
    isLoading: loadingCoverage,
    refetch: loadCoverage,
  } = useQuery<AbsentTeacherCoverageResponse | null>({
    queryKey: ['substitutions', 'coverage', selectedTeacherId, selectedDate],
    queryFn: () => substitutionApi.getAbsentTeacherCoverage(selectedTeacherId, selectedDate),
    enabled: !!selectedTeacherId && !!selectedDate && tabIndex === 0,
    staleTime: 60 * 1000,
  });

  // Cached substitution history
  const {
    data: historyList = [],
    isLoading: loadingHistory,
    refetch: loadHistory,
  } = useQuery<SubstitutionResponse[]>({
    queryKey: ['substitutions', 'history', selectedDate],
    queryFn: () => substitutionApi.listSubstitutions({ date: selectedDate }),
    enabled: !!selectedDate && tabIndex === 1,
    staleTime: 60 * 1000,
  });

  const handleCancelSub = async (subId: string) => {
    if (!confirm('Are you sure you want to cancel this assigned substitution?')) return;
    try {
      await substitutionApi.cancelSubstitution(subId, 'Admin cancelled from console');
      queryClient.invalidateQueries({ queryKey: ['substitutions'] });
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to cancel substitution');
    }
  };

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Teacher Substitution Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track absent faculty, inspect impacted periods, and assign verified substitute teachers without timetable conflicts.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              if (tabIndex === 0) loadCoverage();
              else loadHistory();
            }}
          >
            Refresh
          </Button>
        </Box>

        {/* Global Controls Card */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Select Date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  select
                  label="Absent / Inspected Teacher"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  fullWidth
                  size="small"
                >
                  {teachers.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} {t.employee_code ? `(${t.employee_code})` : ''} — {t.department || 'General'}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)}>
            <Tab label="Impacted Timetable Slots" />
            <Tab label="Daily Substitution Audit History" />
          </Tabs>
        </Box>

        {/* Tab 0: Impacted Slots */}
        {tabIndex === 0 && (
          <>
            {/* KPI Cards */}
            {coverageData && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ bgcolor: 'grey.50', border: '1px solid #e2e8f0' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        TOTAL SCHEDULED PERIODS
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {coverageData.total_slots_count}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ bgcolor: 'success.50', border: '1px solid #bbf7d0' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="caption" color="success.dark" fontWeight={600}>
                        SUBSTITUTES ASSIGNED
                      </Typography>
                      <Typography variant="h4" color="success.main" fontWeight={700}>
                        {coverageData.covered_slots_count}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ bgcolor: 'error.50', border: '1px solid #fecaca' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="caption" color="error.dark" fontWeight={600}>
                        UNCOVERED CLASSES
                      </Typography>
                      <Typography variant="h4" color="error.main" fontWeight={700}>
                        {coverageData.total_slots_count - coverageData.covered_slots_count}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {loadingCoverage ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : coverageData && coverageData.affected_slots.length > 0 ? (
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Period / Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Grade & Section</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Coverage Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Assigned Substitute</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {coverageData.affected_slots.map((slot) => {
                      const isCovered = !!slot.current_substitution_id;
                      return (
                        <TableRow key={slot.timetable_entry_id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {slot.period_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {slot.start_time} - {slot.end_time}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {slot.grade_name} • {slot.section_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={slot.subject_name || 'General'} variant="outlined" />
                          </TableCell>
                          <TableCell>
                            {isCovered ? (
                              <Chip
                                size="small"
                                color="success"
                                label="Covered"
                                icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                              />
                            ) : (
                              <Chip
                                size="small"
                                color="error"
                                label="Unassigned"
                                icon={<EventBusyIcon sx={{ fontSize: '14px !important' }} />}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {slot.current_substitute_name ? (
                              <Typography variant="body2" fontWeight={600} color="primary.main">
                                {slot.current_substitute_name}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {isCovered ? (
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={() => handleCancelSub(slot.current_substitution_id!)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                color="primary"
                                variant="contained"
                                startIcon={<PersonAddAlt1Icon />}
                                onClick={() => {
                                  setActiveSlot(slot);
                                  setModalOpen(true);
                                }}
                              >
                                Assign Substitute
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No scheduled timetable classes found for this teacher on {selectedDate}.
              </Alert>
            )}
          </>
        )}

        {/* Tab 1: Audit History */}
        {tabIndex === 1 && (
          <>
            {loadingHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : historyList.length > 0 ? (
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Period & Class</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Original Teacher</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Substitute Teacher</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes / Reason</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyList.map((h) => (
                      <TableRow key={h.id} hover>
                        <TableCell>{h.date}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {h.period_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {h.grade_name} - {h.section_name} • {h.subject_name || 'General'}
                          </Typography>
                        </TableCell>
                        <TableCell>{h.original_teacher_name}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {h.substitute_teacher_name}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={h.status === 'ASSIGNED' ? 'success' : 'default'}
                            label={h.status}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="caption" color="text.secondary">
                            {h.reason || h.notes || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {h.status === 'ASSIGNED' && (
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              onClick={() => handleCancelSub(h.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No substitutions recorded for {selectedDate}.
              </Alert>
            )}
          </>
        )}

        {/* Modal */}
        <AssignSubstituteModal
          open={modalOpen}
          slot={activeSlot}
          date={selectedDate}
          onClose={() => {
            setModalOpen(false);
            setActiveSlot(null);
          }}
          onAssigned={() => {
            queryClient.invalidateQueries({ queryKey: ['substitutions'] });
          }}
        />
      </Box>
    </RequireRole>
  );
}
