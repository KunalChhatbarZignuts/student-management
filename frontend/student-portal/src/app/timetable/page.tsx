'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { parentApi, parentKeys } from '@/features/parents/api';
import { timetableApi, timetableKeys } from '@/features/timetables/api';
import { TimetableDetail } from '@/features/timetables/types';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

export default function StudentParentTimetablePage() {
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  // Parent specific state: selected child id
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');

  // 1. Parent: Fetch linked children
  const { data: childrenList, isLoading: loadingChildren } = useQuery({
    queryKey: parentKeys.children(),
    queryFn: parentApi.getMyChildren,
    enabled: isParent,
  });

  // Auto-select first child for parent
  React.useEffect(() => {
    if (isParent && childrenList && childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [isParent, childrenList, selectedChildId]);

  // 2. Fetch timetable: Student's own OR Child's timetable
  const {
    data: timetableData,
    isLoading: loadingTimetable,
    error: timetableError,
    refetch,
  } = useQuery({
    queryKey: isParent
      ? timetableKeys.parentChild(selectedChildId)
      : timetableKeys.studentMy,
    queryFn: () => {
      if (isParent) {
        return timetableApi.getChildTimetable(selectedChildId);
      }
      return timetableApi.getStudentMyTimetable();
    },
    enabled: isParent ? !!selectedChildId : true,
  });

  const selectedChild = React.useMemo(() => {
    return childrenList?.find((c) => c.id === selectedChildId);
  }, [childrenList, selectedChildId]);

  const activeWorkingDays = React.useMemo(() => {
    if (timetableData?.working_days && timetableData.working_days.length > 0) {
      return DAYS_OF_WEEK.filter((d) => timetableData.working_days?.includes(d.label));
    }
    return DAYS_OF_WEEK.slice(0, 5);
  }, [timetableData]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Class Timetable
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {isParent
                  ? "View your child's weekly schedule, subject timings, and teacher assignments."
                  : 'View your weekly class schedule, subject timings, and classroom locations.'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => refetch()}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                size="small"
              >
                Print Schedule
              </Button>
            </Stack>
          </Box>

          {/* Parent Child Switcher Tabs */}
          {isParent && (
            <Paper sx={{ mb: 3, p: 1.5, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
                SELECT STUDENT / CHILD:
              </Typography>
              {loadingChildren ? (
                <CircularProgress size={24} sx={{ m: 1 }} />
              ) : (
                <Tabs
                  value={selectedChildId || (childrenList && childrenList.length > 0 ? childrenList[0].id : false)}
                  onChange={(_, val) => setSelectedChildId(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mt: 0.5 }}
                >
                  {childrenList?.map((child) => (
                    <Tab
                      key={child.id}
                      value={child.id}
                      icon={
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.8rem',
                            bgcolor: selectedChildId === child.id ? 'primary.main' : 'grey.400',
                          }}
                        >
                          {child.first_name[0]}
                        </Avatar>
                      }
                      iconPosition="start"
                      label={`${child.first_name} ${child.last_name} (${child.class_name || 'Class'})`}
                      sx={{ fontWeight: 600, textTransform: 'none' }}
                    />
                  ))}
                </Tabs>
              )}
            </Paper>
          )}

          {/* Class Info Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" color="text.secondary">
                    {isParent ? 'Student & Class' : 'Your Enrolled Class'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {timetableData?.grade_name || selectedChild?.class_name || 'Class'}
                    {timetableData?.section_name || selectedChild?.section
                      ? ` - ${timetableData?.section_name || selectedChild?.section}`
                      : ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" color="text.secondary">
                    Academic Shift
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {timetableData?.shift_name || 'Standard Shift'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={
                        timetableData?.status === 'published'
                          ? `Official Timetable (v${timetableData.version || 1})`
                          : 'Active Schedule'
                      }
                      color="success"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Errors or Notices */}
          {timetableError && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Timetable has not been published for this class yet. Please check back later or contact school administration.
            </Alert>
          )}

          {/* Loading or Timetable Matrix Grid */}
          {loadingTimetable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : !timetableData || ((!timetableData.entries || timetableData.entries.length === 0) && (!timetableData.schedule || timetableData.schedule.length === 0)) ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <CalendarMonthIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Timetable Published Yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The official timetable for this class will be visible once published by the academic office.
              </Typography>
            </Paper>
          ) : timetableData.entries && timetableData.entries.length > 0 && timetableData.periods && timetableData.periods.length > 0 ? (
            /* Matrix Timetable Grid */
            <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto', boxShadow: 2 }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead sx={{ bgcolor: 'primary.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 140, color: 'primary.dark' }}>
                      Period / Time
                    </TableCell>
                    {activeWorkingDays.map((day) => (
                      <TableCell key={day.id} align="center" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        {day.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timetableData.periods.map((period) => (
                    <TableRow
                      key={period.id}
                      sx={{
                        bgcolor: period.is_break ? 'action.hover' : 'inherit',
                        '&:hover': { bgcolor: period.is_break ? 'action.hover' : 'grey.50' },
                      }}
                    >
                      {/* Period Time Column */}
                      <TableCell sx={{ verticalAlign: 'middle', borderRight: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {period.name || `Period ${period.number}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {period.start_time} - {period.end_time}
                        </Typography>
                        {period.is_break && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip label="Recess" size="small" color="default" sx={{ height: 20 }} />
                          </Box>
                        )}
                      </TableCell>

                      {/* Day Columns */}
                      {activeWorkingDays.map((day) => {
                        const slot = timetableData.entries?.find(
                          (e) => e.day_of_week === day.id && e.period_id === period.id
                        );

                        if (period.is_break) {
                          return (
                            <TableCell
                              key={day.id}
                              align="center"
                              sx={{
                                bgcolor: 'rgba(0, 0, 0, 0.02)',
                                color: 'text.secondary',
                                fontStyle: 'italic',
                              }}
                            >
                              {period.name || 'Break / Recess'}
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell
                            key={day.id}
                            align="center"
                            sx={{
                              p: 1.25,
                              border: 1,
                              borderColor: 'divider',
                              verticalAlign: 'top',
                            }}
                          >
                            {slot?.subject_name ? (
                              <Box
                                sx={{
                                  p: 1.25,
                                  borderRadius: 1.5,
                                  bgcolor: 'background.paper',
                                  border: 1,
                                  borderColor: 'divider',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                  textAlign: 'left',
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" fontWeight={700} color="primary.main">
                                    {slot.subject_name}
                                  </Typography>
                                  {slot.subject_code && (
                                    <Chip
                                      label={slot.subject_code}
                                      size="small"
                                      sx={{ height: 18, fontSize: '0.65rem' }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                  Instructor: {slot.teacher_name || 'Assigned Staff'}
                                </Typography>
                                {slot.room_number && (
                                  <Typography variant="caption" color="text.disabled" display="block">
                                    Room: {slot.room_number}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.disabled">
                                Free
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Fallback Schedule Table (legacy compatibility) */
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timetableData.schedule?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.subject}</TableCell>
                      <TableCell>
                        <Chip label={item.subject_code} size="small" />
                      </TableCell>
                      <TableCell>{item.teacher}</TableCell>
                      <TableCell>{item.schedule}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
