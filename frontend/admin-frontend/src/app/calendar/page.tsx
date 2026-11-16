'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  CalendarMonth,
  Add as AddIcon,
  EventBusy,
  Weekend,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';

import { useAuth } from '@/features/auth/hooks';
import { ROLES } from '@/lib/constants';
import { calendarApi } from '@/features/calendar/api';
import { adminGradeApi } from '@/features/grades/api';
import {
  SchoolHoliday,
  HolidayCategory,
  SchoolHolidayCreatePayload,
  MonthlyCalendarDay,
} from '@/features/calendar/types';

import {
  CalendarSummaryCards,
  CalendarMonthView,
  HolidaysListTable,
  WeeklyOffSettingsPanel,
  HolidayFormDialog,
  CancelHolidayDialog,
  SpecialWorkingDayDialog,
} from '@/features/calendar/components';

export default function SchoolCalendarPage() {
  const { role } = useAuth();
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const isTeacher = role === ROLES.TEACHER;
  const queryClient = useQueryClient();

  // Tab State: 0: "Monthly Calendar", 1: "Holidays & Vacations", 2: "Weekly Offs & Exceptions"
  const [currentTab, setCurrentTab] = useState(0);

  // Selected Date state
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs('2026-11-03'));
  const selectedYear = selectedDate.year();
  const selectedMonth = selectedDate.month() + 1; // 1-12

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
    queryFn: () =>
      calendarApi.getMonthlyCalendar(selectedYear, selectedMonth, undefined, undefined, isTeacher),
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
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      calendarApi.cancelHoliday(id, reason),
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

  // Filtered Holidays List
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        selectedCategoryFilter === 'ALL' || h.category_name === selectedCategoryFilter;
      const matchesStatus =
        selectedStatusFilter === 'ALL' || h.status === selectedStatusFilter;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [holidays, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  // Map of days for fast lookup
  const daysMap = useMemo(() => {
    const map: Record<string, MonthlyCalendarDay> = {};
    if (monthCalendar?.days) {
      for (const d of monthCalendar.days) {
        map[d.date] = d;
      }
    }
    return map;
  }, [monthCalendar]);

  // Keep selectedDayDetails updated when month data loads
  useEffect(() => {
    const curDateStr = selectedDate.format('YYYY-MM-DD');
    if (daysMap[curDateStr]) {
      setSelectedDayDetails(daysMap[curDateStr]);
    }
  }, [daysMap, selectedDate]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
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
          <Tab
            label={`Holidays & Vacations (${holidays.length})`}
            icon={<EventBusy />}
            iconPosition="start"
          />
          {isAdmin && <Tab label="Weekly Offs & Exceptions" icon={<Weekend />} iconPosition="start" />}
        </Tabs>
      </Paper>

      {/* TAB 0: MONTHLY CALENDAR VIEW */}
      {currentTab === 0 && (
        <Box>
          <CalendarSummaryCards
            selectedDate={selectedDate}
            monthCalendar={monthCalendar}
          />
          <CalendarMonthView
            selectedDate={selectedDate}
            onSelectDate={(newDate) => {
              setSelectedDate(newDate);
              const dateStr = newDate.format('YYYY-MM-DD');
              if (daysMap[dateStr]) {
                setSelectedDayDetails(daysMap[dateStr]);
              }
            }}
            isLoadingCalendar={isLoadingCalendar}
            daysMap={daysMap}
            selectedDayDetails={selectedDayDetails}
            isAdmin={isAdmin}
            onOpenAddHoliday={handleOpenAddHoliday}
            onOpenCompensatory={(presetDate) => {
              if (presetDate) setSpecialDate(presetDate);
              setOpenSpecialModal(true);
            }}
            onCancelHolidayByLabel={(label) => {
              const h = holidays.find((item) => item.name === label);
              if (h) {
                setHolidayToCancel(h);
                setOpenCancelModal(true);
              }
            }}
          />
        </Box>
      )}

      {/* TAB 1: HOLIDAYS & VACATIONS LIST VIEW */}
      {currentTab === 1 && (
        <HolidaysListTable
          holidays={holidays}
          filteredHolidays={filteredHolidays}
          categories={categories}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedCategoryFilter={selectedCategoryFilter}
          onCategoryFilterChange={setSelectedCategoryFilter}
          selectedStatusFilter={selectedStatusFilter}
          onStatusFilterChange={setSelectedStatusFilter}
          isLoadingHolidays={isLoadingHolidays}
          isAdmin={isAdmin}
          onOpenCancelModal={(holiday) => {
            setHolidayToCancel(holiday);
            setOpenCancelModal(true);
          }}
          onDeleteHoliday={(id, name) => {
            if (confirm(`Are you sure you want to delete ${name}?`)) {
              deleteHolidayMutation.mutate(id);
            }
          }}
        />
      )}

      {/* TAB 2: WEEKLY OFFS & EXCEPTIONS (ADMIN ONLY) */}
      {currentTab === 2 && isAdmin && (
        <WeeklyOffSettingsPanel
          specialWorkingDays={specialWorkingDays}
          onOpenSpecialModal={() => setOpenSpecialModal(true)}
          onDeleteSpecial={(id) => deleteSpecialMutation.mutate(id)}
        />
      )}

      {/* MODAL: ADD / EDIT HOLIDAY */}
      <HolidayFormDialog
        open={openHolidayModal}
        onClose={() => setOpenHolidayModal(false)}
        editingHoliday={editingHoliday}
        holidayName={holidayName}
        onHolidayNameChange={setHolidayName}
        holidayCategoryId={holidayCategoryId}
        onHolidayCategoryIdChange={setHolidayCategoryId}
        categories={categories}
        holidayStartDate={holidayStartDate}
        onHolidayStartDateChange={setHolidayStartDate}
        holidayEndDate={holidayEndDate}
        onHolidayEndDateChange={setHolidayEndDate}
        holidayDescription={holidayDescription}
        onHolidayDescriptionChange={setHolidayDescription}
        isSchoolWide={isSchoolWide}
        onIsSchoolWideChange={(checked) => {
          setIsSchoolWide(checked);
          if (checked) setSelectedGradeIds([]);
        }}
        selectedGradeIds={selectedGradeIds}
        onToggleGradeId={(id, checked) => {
          if (checked) {
            setSelectedGradeIds((prev) => [...prev, id]);
          } else {
            setSelectedGradeIds((prev) => prev.filter((gid) => gid !== id));
          }
        }}
        grades={grades}
        conflictWarning={conflictWarning}
        onSave={handleSaveHoliday}
        isSaving={createHolidayMutation.isPending}
      />

      {/* MODAL: CANCEL HOLIDAY */}
      <CancelHolidayDialog
        open={openCancelModal}
        onClose={() => setOpenCancelModal(false)}
        holiday={holidayToCancel}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        onConfirm={() => {
          if (holidayToCancel) {
            cancelHolidayMutation.mutate({
              id: holidayToCancel.id,
              reason: cancelReason.trim(),
            });
          }
        }}
        isCancelling={cancelHolidayMutation.isPending}
      />

      {/* MODAL: SPECIAL COMPENSATORY WORKING DAY */}
      <SpecialWorkingDayDialog
        open={openSpecialModal}
        onClose={() => setOpenSpecialModal(false)}
        specialDate={specialDate}
        onSpecialDateChange={setSpecialDate}
        specialReason={specialReason}
        onSpecialReasonChange={setSpecialReason}
        onConfirm={() => {
          createSpecialMutation.mutate({
            academic_year_id:
              holidays[0]?.academic_year_id || 'dc24c02e-a93f-4f7d-ba18-43b375b36059',
            date: specialDate,
            reason: specialReason.trim(),
          });
        }}
        isSaving={createSpecialMutation.isPending}
      />
    </Box>
  );
}
