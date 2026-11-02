'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material';
import {
  CalendarMonth,
  Add as AddIcon,
  ChevronLeft,
  ChevronRight,
  EventBusy,
  CheckCircle,
  Weekend,
  WorkOutline,
  FilterList,
  DeleteOutline,
  CancelOutlined,
  EditOutlined,
  WarningAmber,
  InfoOutlined,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks';
import { ROLES } from '@/lib/constants';
import { calendarApi } from '@/features/calendar/api';
import {
  SchoolHoliday,
  HolidayCategory,
  SchoolHolidayCreatePayload,
  MonthlyCalendarDay,
} from '@/features/calendar/types';
import { adminGradeApi } from '@/features/grades/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SchoolCalendarPage() {
  const { role } = useAuth();
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const isTeacher = role === ROLES.TEACHER;
  const queryClient = useQueryClient();

  // Tab State
  const [currentTab, setCurrentTab] = useState(0);

  // Month & Year state (default to November 2026 as per workspace current date)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(11); // 1-12

  // Filter state for Holiday list
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals state
  const [openHolidayModal, setOpenHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<SchoolHoliday | null>(null);
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [holidayToCancel, setHolidayToCancel] = useState<SchoolHoliday | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [openSpecialModal, setOpenSpecialModal] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState<MonthlyCalendarDay | null>(null);

  // Holiday Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayCategoryId, setHolidayCategoryId] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');
  const [isSchoolWide, setIsSchoolWide] = useState(true);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Special Working Day form
  const [specialDate, setSpecialDate] = useState('');
  const [specialReason, setSpecialReason] = useState('');

  // Queries
  const { data: categories = [] } = useQuery<HolidayCategory[]>({
    queryKey: ['calendar-categories'],
    queryFn: () => calendarApi.getCategories(),
    enabled: isAdmin,
  });

  const { data: gradesData } = useQuery({
    queryKey: ['calendar-grades'],
    queryFn: () => adminGradeApi.listGrades({ size: 100 }),
    enabled: isAdmin,
  });
  const grades = gradesData?.items || [];

  const { data: holidays = [], isLoading: isLoadingHolidays } = useQuery<SchoolHoliday[]>({
    queryKey: ['school-holidays', isAdmin],
    queryFn: () => (isAdmin ? calendarApi.getAdminHolidays() : calendarApi.getTeacherHolidays()),
  });

  const { data: monthCalendar, isLoading: isLoadingCalendar } = useQuery({
    queryKey: ['calendar-monthly', selectedYear, selectedMonth, isTeacher],
    queryFn: () => calendarApi.getMonthlyCalendar(selectedYear, selectedMonth, undefined, undefined, isTeacher),
  });

  const { data: calendarSettings } = useQuery({
    queryKey: ['calendar-settings'],
    queryFn: () => calendarApi.getSettings(),
    enabled: isAdmin,
  });

  const { data: specialWorkingDays = [] } = useQuery({
    queryKey: ['special-working-days'],
    queryFn: () => calendarApi.getSpecialWorkingDays(),
    enabled: isAdmin,
  });

  // Mutations
  const createHolidayMutation = useMutation({
    mutationFn: (payload: SchoolHolidayCreatePayload) => calendarApi.createHoliday(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-monthly'] });
      setOpenHolidayModal(false);
      resetHolidayForm();
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object' && detail?.requires_confirmation) {
        setConflictWarning(detail.message);
      } else {
        alert(detail || 'Failed to save holiday');
      }
    },
  });

  const cancelHolidayMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => calendarApi.cancelHoliday(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-monthly'] });
      setOpenCancelModal(false);
      setHolidayToCancel(null);
      setCancelReason('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to cancel holiday');
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: string) => calendarApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-monthly'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Cannot delete holiday with existing records. Cancel it instead.');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (weekly_off_days: number[]) => calendarApi.updateSettings({ weekly_off_days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-settings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-monthly'] });
      alert('Weekly offs updated successfully');
    },
  });

  const createSpecialMutation = useMutation({
    mutationFn: (payload: { academic_year_id: string; date: string; reason: string }) =>
      calendarApi.createSpecialWorkingDay(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-working-days'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-monthly'] });
      setOpenSpecialModal(false);
      setSpecialDate('');
      setSpecialReason('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to add compensatory working day');
    },
  });

  const deleteSpecialMutation = useMutation({
    mutationFn: (id: string) => calendarApi.deleteSpecialWorkingDay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-working-days'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-monthly'] });
    },
  });

  // Helpers
  const resetHolidayForm = () => {
    setHolidayName('');
    setHolidayCategoryId(categories[0]?.id || '');
    setHolidayStartDate('');
    setHolidayEndDate('');
    setHolidayDescription('');
    setIsSchoolWide(true);
    setSelectedGradeIds([]);
    setEditingHoliday(null);
    setConflictWarning(null);
  };

  const handleOpenAddHoliday = (presetDate?: string) => {
    resetHolidayForm();
    if (categories.length > 0) {
      setHolidayCategoryId(categories[0].id);
    }
    if (presetDate) {
      setHolidayStartDate(presetDate);
      setHolidayEndDate(presetDate);
    }
    setOpenHolidayModal(true);
  };

  const handleSaveHoliday = (forceOverride: boolean = false) => {
    if (!holidayName.trim() || !holidayCategoryId || !holidayStartDate || !holidayEndDate) {
      alert('Please fill in Holiday Name, Category, Start Date, and End Date.');
      return;
    }

    const payload: SchoolHolidayCreatePayload = {
      name: holidayName.trim(),
      category_id: holidayCategoryId,
      academic_year_id: holidays[0]?.academic_year_id || 'dc24c02e-a93f-4f7d-ba18-43b375b36059',
      start_date: holidayStartDate,
      end_date: holidayEndDate,
      description: holidayDescription.trim() || undefined,
      grade_ids: isSchoolWide ? [] : selectedGradeIds,
      confirm_attendance_override: forceOverride,
    };

    createHolidayMutation.mutate(payload);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Filtered Holidays List
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategoryFilter === 'ALL' || h.category_name === selectedCategoryFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || h.status === selectedStatusFilter;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [holidays, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  // Calendar day cells with leading offset
  const calendarGridDays = useMemo(() => {
    if (!monthCalendar || !monthCalendar.days || monthCalendar.days.length === 0) return [];
    const firstDayWeekday = monthCalendar.days[0].day_of_week; // 0=Mon, 6=Sun
    const emptyLeadingDays = Array.from({ length: firstDayWeekday }, (_, i) => null);
    return [...emptyLeadingDays, ...monthCalendar.days];
  }, [monthCalendar]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" fontSize="large" />
            School Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin
              ? 'Configure institution holidays, vacation periods, and weekly non-working days.'
              : 'View institutional school calendar, upcoming vacations, and official holidays.'}
          </Typography>
        </Box>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<Weekend />}
              onClick={() => setOpenSpecialModal(true)}
              sx={{ textTransform: 'none' }}
            >
              Compensatory Working Day
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenAddHoliday()}
              sx={{ textTransform: 'none', px: 2.5 }}
            >
              Add Holiday
            </Button>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Monthly Calendar" icon={<CalendarMonth />} iconPosition="start" />
          <Tab label={`Holidays & Vacations (${holidays.length})`} icon={<EventBusy />} iconPosition="start" />
          {isAdmin && <Tab label="Weekly Offs & Exceptions" icon={<Weekend />} iconPosition="start" />}
        </Tabs>
      </Paper>

      {/* TAB 0: MONTHLY CALENDAR VIEW */}
      {currentTab === 0 && (
        <Box>
          {/* Month Selector Bar & Summary Stats */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={handlePrevMonth} size="small" sx={{ border: '1px solid #e0e0e0' }}>
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6" fontWeight={700} sx={{ minWidth: 180, textAlign: 'center' }}>
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </Typography>
                <IconButton onClick={handleNextMonth} size="small" sx={{ border: '1px solid #e0e0e0' }}>
                  <ChevronRight />
                </IconButton>
              </Grid>

              {/* Month KPI Badges */}
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<WorkOutline />}
                    label={`Working Days: ${monthCalendar?.working_days ?? 0}`}
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    icon={<EventBusy />}
                    label={`Holidays: ${monthCalendar?.holidays ?? 0}`}
                    color="error"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    icon={<Weekend />}
                    label={`Weekly Offs: ${monthCalendar?.weekly_offs ?? 0}`}
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={`Total Days: ${monthCalendar?.total_days ?? 0}`}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Calendar Grid */}
          {isLoadingCalendar ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
              {/* Day-of-week headers */}
              <Grid container sx={{ bgcolor: 'action.hover', borderBottom: '1px solid #e0e0e0' }}>
                {WEEKDAY_HEADERS.map((dayName, idx) => (
                  <Grid
                    key={dayName}
                    item
                    xs={12 / 7}
                    sx={{
                      py: 1.5,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: idx >= 5 ? 'error.main' : 'text.primary',
                      borderRight: idx < 6 ? '1px solid #e0e0e0' : 'none',
                    }}
                  >
                    {dayName}
                  </Grid>
                ))}
              </Grid>

              {/* Calendar Days Matrix */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                {calendarGridDays.map((dayItem, idx) => {
                  if (!dayItem) {
                    return (
                      <Box
                        key={`empty-${idx}`}
                        sx={{
                          width: `${100 / 7}%`,
                          minHeight: 110,
                          bgcolor: 'action.disabledBackground',
                          borderRight: (idx + 1) % 7 !== 0 ? '1px solid #e0e0e0' : 'none',
                          borderBottom: '1px solid #e0e0e0',
                        }}
                      />
                    );
                  }

                  const isHoliday = dayItem.day_type === 'holiday';
                  const isWeeklyOff = dayItem.day_type === 'weekly_off';
                  const isSpecial = dayItem.day_type === 'special_working_day';
                  const dayDateNum = parseInt(dayItem.date.split('-')[2], 10);

                  return (
                    <Box
                      key={dayItem.date}
                      onClick={() => {
                        setSelectedDayDetails(dayItem);
                      }}
                      sx={{
                        width: `${100 / 7}%`,
                        minHeight: 110,
                        p: 1,
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        bgcolor: isHoliday
                          ? 'error.lighter'
                          : isWeeklyOff
                            ? 'action.hover'
                            : isSpecial
                              ? 'warning.lighter'
                              : 'background.paper',
                        borderRight: (idx + 1) % 7 !== 0 ? '1px solid #e0e0e0' : 'none',
                        borderBottom: '1px solid #e0e0e0',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={isHoliday ? 'error.main' : isWeeklyOff ? 'text.secondary' : 'text.primary'}
                        >
                          {dayDateNum}
                        </Typography>
                        {isHoliday && <Chip size="small" label="Holiday" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />}
                        {isWeeklyOff && <Chip size="small" label="Off" sx={{ height: 18, fontSize: '0.65rem' }} />}
                        {isSpecial && <Chip size="small" label="Special" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />}
                      </Box>

                      {/* Label details */}
                      {dayItem.label && dayItem.day_type !== 'working_day' && (
                        <Box sx={{ mt: 1 }}>
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              color: isHoliday ? 'error.dark' : 'text.secondary',
                            }}
                          >
                            {dayItem.label}
                          </Typography>
                          {!dayItem.is_school_wide && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label="Specific Grades"
                              sx={{ mt: 0.5, height: 16, fontSize: '0.6rem' }}
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {/* TAB 1: HOLIDAYS & VACATIONS LIST VIEW */}
      {currentTab === 1 && (
        <Box>
          {/* Filters Bar */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search holidays by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategoryFilter}
                    label="Category"
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.name}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatusFilter}
                    label="Status"
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredHolidays.length} entries
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Holiday Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Duration / Dates</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Applicability</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingHolidays ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : filteredHolidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 6 }}>
                      <EventBusy sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                      <Typography color="text.secondary">No holidays found matching criteria</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHolidays.map((h) => {
                    const isMultiDay = h.start_date !== h.end_date;
                    const isActive = h.status === 'active';

                    return (
                      <TableRow key={h.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{h.name}</Typography>
                          {h.description && (
                            <Typography variant="caption" color="text.secondary">
                              {h.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={h.category_name} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {isMultiDay ? `${h.start_date} to ${h.end_date}` : h.start_date}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {h.is_school_wide ? (
                            <Chip size="small" label="School-Wide (All Grades)" color="info" />
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {h.applicable_grades.map((g) => (
                                <Chip key={g.id} size="small" label={g.name} variant="outlined" />
                              ))}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={h.status.toUpperCase()}
                            color={isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            {isActive && (
                              <Tooltip title="Cancel Holiday">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => {
                                    setHolidayToCancel(h);
                                    setOpenCancelModal(true);
                                  }}
                                >
                                  <CancelOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete (If no attendance history)">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${h.name}?`)) {
                                    deleteHolidayMutation.mutate(h.id);
                                  }
                                }}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 2: WEEKLY OFFS & EXCEPTIONS (ADMIN ONLY) */}
      {currentTab === 2 && isAdmin && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Weekend color="primary" />
                  Institutional Weekly Non-Working Days
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Select days of the week when regular school attendance is not conducted.
                </Typography>

                <FormGroup sx={{ mb: 3 }}>
                  {[
                    { dayNum: 6, label: 'Sunday (Standard Weekly Off)' },
                    { dayNum: 5, label: 'Saturday (Weekend Off)' },
                    { dayNum: 4, label: 'Friday' },
                    { dayNum: 0, label: 'Monday' },
                  ].map((d) => {
                    const isChecked = calendarSettings?.weekly_off_days.includes(d.dayNum);
                    return (
                      <FormControlLabel
                        key={d.dayNum}
                        control={
                          <Checkbox
                            checked={isChecked}
                            onChange={(e) => {
                              const cur = calendarSettings?.weekly_off_days || [6];
                              const updated = e.target.checked
                                ? [...cur, d.dayNum]
                                : cur.filter((num) => num !== d.dayNum);
                              updateSettingsMutation.mutate(updated);
                            }}
                          />
                        }
                        label={d.label}
                      />
                    );
                  })}
                </FormGroup>

                <Alert severity="info">
                  Weekly non-working days are automatically excluded from student attendance percentages and do not count toward total school working days.
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkOutline color="warning" />
                    Compensatory Special Working Days
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenSpecialModal(true)}
                  >
                    Add
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Special days (such as Saturday or Sunday) when school is declared open to compensate for unexpected closures.
                </Typography>

                {specialWorkingDays.length === 0 ? (
                  <Alert severity="success">No compensatory working days declared.</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {specialWorkingDays.map((sp) => (
                          <TableRow key={sp.id}>
                            <TableCell sx={{ fontWeight: 600 }}>{sp.date}</TableCell>
                            <TableCell>{sp.reason}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteSpecialMutation.mutate(sp.id)}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* MODAL: ADD / EDIT HOLIDAY */}
      <Dialog open={openHolidayModal} onClose={() => setOpenHolidayModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingHoliday ? 'Edit School Holiday' : 'Create School Holiday'}
        </DialogTitle>
        <DialogContent dividers>
          {conflictWarning && (
            <Alert
              severity="warning"
              icon={<WarningAmber />}
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => handleSaveHoliday(true)}>
                  Override & Save
                </Button>
              }
            >
              {conflictWarning}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Holiday / Vacation Name"
                placeholder="e.g. Diwali Vacation, Republic Day"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={holidayCategoryId}
                  label="Category"
                  onChange={(e) => setHolidayCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={holidayStartDate}
                onChange={(e) => setHolidayStartDate(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={holidayEndDate}
                onChange={(e) => setHolidayEndDate(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description / Circular Ref"
                placeholder="Brief reason or circular details..."
                multiline
                rows={2}
                value={holidayDescription}
                onChange={(e) => setHolidayDescription(e.target.value)}
              />
            </Grid>

            {/* Scope selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Applicability Scope
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isSchoolWide}
                    onChange={(e) => {
                      setIsSchoolWide(e.target.checked);
                      if (e.target.checked) setSelectedGradeIds([]);
                    }}
                  />
                }
                label="School-Wide (Applies to all grades & sections)"
              />

              {!isSchoolWide && (
                <Box sx={{ mt: 1, pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                  <Typography variant="caption" color="text.secondary">
                    Select specific grades this holiday applies to:
                  </Typography>
                  <FormGroup row sx={{ mt: 1 }}>
                    {grades.map((g: any) => (
                      <FormControlLabel
                        key={g.id}
                        control={
                          <Checkbox
                            checked={selectedGradeIds.includes(g.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGradeIds((prev) => [...prev, g.id]);
                              } else {
                                setSelectedGradeIds((prev) => prev.filter((id) => id !== g.id));
                              }
                            }}
                          />
                        }
                        label={g.name}
                      />
                    ))}
                  </FormGroup>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenHolidayModal(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSaveHoliday(false)}
            disabled={createHolidayMutation.isPending}
          >
            {createHolidayMutation.isPending ? 'Saving...' : 'Save Holiday'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: CANCEL HOLIDAY */}
      <Dialog open={openCancelModal} onClose={() => setOpenCancelModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Holiday</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Cancelling <strong>{holidayToCancel?.name}</strong> will reinstate these dates as regular working school days. An audit log entry will be preserved.
          </Typography>
          <TextField
            fullWidth
            label="Cancellation Reason"
            placeholder="e.g. Government advisory revoked, exam rescheduled"
            multiline
            rows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCancelModal(false)} color="inherit">
            Back
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!cancelReason.trim() || cancelHolidayMutation.isPending}
            onClick={() => {
              if (holidayToCancel) {
                cancelHolidayMutation.mutate({ id: holidayToCancel.id, reason: cancelReason.trim() });
              }
            }}
          >
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: SPECIAL COMPENSATORY WORKING DAY */}
      <Dialog open={openSpecialModal} onClose={() => setOpenSpecialModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Compensatory Working Day</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Declaring a weekend as working enables attendance roll-calls on that day.
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={specialDate}
            onChange={(e) => setSpecialDate(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Compensatory Reason"
            placeholder="e.g. Compensation for heavy rain day"
            multiline
            rows={2}
            value={specialReason}
            onChange={(e) => setSpecialReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenSpecialModal(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!specialDate || !specialReason.trim() || createSpecialMutation.isPending}
            onClick={() => {
              createSpecialMutation.mutate({
                academic_year_id: holidays[0]?.academic_year_id || 'dc24c02e-a93f-4f7d-ba18-43b375b36059',
                date: specialDate,
                reason: specialReason.trim(),
              });
            }}
          >
            Add Working Day
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: DAY INSPECTOR DIALOG */}
      <Dialog open={Boolean(selectedDayDetails)} onClose={() => setSelectedDayDetails(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlined color="primary" />
          {selectedDayDetails?.date} ({selectedDayDetails?.day_name})
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Day Status:
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={
                  selectedDayDetails?.day_type === 'holiday'
                    ? 'Official Holiday / Vacation'
                    : selectedDayDetails?.day_type === 'weekly_off'
                      ? 'Weekly Off'
                      : selectedDayDetails?.day_type === 'special_working_day'
                        ? 'Compensatory Working Day'
                        : 'Normal School Working Day'
                }
                color={
                  selectedDayDetails?.day_type === 'holiday'
                    ? 'error'
                    : selectedDayDetails?.day_type === 'special_working_day'
                      ? 'warning'
                      : selectedDayDetails?.day_type === 'working_day'
                        ? 'success'
                        : 'default'
                }
              />
            </Box>
          </Box>

          {selectedDayDetails?.label && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Title / Reason:
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {selectedDayDetails.label}
              </Typography>
              {selectedDayDetails.category_name && (
                <Chip size="small" label={selectedDayDetails.category_name} variant="outlined" sx={{ mt: 0.5 }} />
              )}
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Attendance Marking:
            </Typography>
            <Typography variant="body2" fontWeight={600} color={selectedDayDetails?.is_working_day ? 'success.main' : 'error.main'}>
              {selectedDayDetails?.is_working_day ? '✓ Enabled (Working Day)' : '✗ Disabled (Non-working day / Holiday)'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {isAdmin && selectedDayDetails?.is_working_day && (
            <Button
              size="small"
              color="error"
              onClick={() => {
                const date = selectedDayDetails.date;
                setSelectedDayDetails(null);
                handleOpenAddHoliday(date);
              }}
            >
              Declare Holiday
            </Button>
          )}
          <Button onClick={() => setSelectedDayDetails(null)} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
