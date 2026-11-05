'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TodayIcon from '@mui/icons-material/Today';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';

import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { parentApi, parentKeys } from '@/features/parents/api';
import { timetableApi, timetableKeys } from '@/features/timetables/api';
import {
  TimetableHeader,
  ParentChildSelector,
  ClassInfoCards,
  DailyScheduleView,
  WeeklyMatrixView,
  LegacyScheduleView,
} from '@/features/timetables/components';

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

  // View mode: 'date' (calendar-integrated date view) or 'week' (full matrix)
  const [viewTab, setViewTab] = React.useState<number>(0); // 0 = Date / Today, 1 = Full Week Matrix
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);

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
  const activeDateParam = viewTab === 0 ? selectedDate : undefined;
  const {
    data: timetableData,
    isLoading: loadingTimetable,
    error: timetableError,
    refetch,
  } = useQuery({
    queryKey: isParent
      ? timetableKeys.parentChild(selectedChildId, activeDateParam)
      : timetableKeys.studentMy(activeDateParam),
    queryFn: () => {
      if (isParent) {
        return timetableApi.getChildTimetable(selectedChildId, activeDateParam);
      }
      return timetableApi.getStudentMyTimetable(activeDateParam);
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
    return DAYS_OF_WEEK;
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
          <TimetableHeader
            isParent={isParent}
            onRefresh={() => refetch()}
            onPrint={handlePrint}
          />

          {/* Parent Child Switcher Tabs */}
          {isParent && (
            <ParentChildSelector
              childrenList={childrenList}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
              isLoading={loadingChildren}
            />
          )}

          {/* Class Info Cards */}
          <ClassInfoCards
            isParent={isParent}
            timetableData={timetableData}
            selectedChild={selectedChild}
          />

          {/* Errors or Notices */}
          {timetableError && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Timetable has not been published for this class yet. Please check back later or contact school administration.
            </Alert>
          )}

          {/* View Mode Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2 }}>
            <Tabs
              value={viewTab}
              onChange={(_, val) => setViewTab(val)}
              indicatorColor="primary"
              textColor="primary"
              sx={{ px: 2 }}
            >
              <Tab icon={<TodayIcon />} iconPosition="start" label="Daily Schedule & Date Status" />
              <Tab icon={<ViewWeekIcon />} iconPosition="start" label="Full Weekly Schedule Matrix" />
            </Tabs>
          </Paper>

          {/* Loading or Content */}
          {loadingTimetable ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : viewTab === 0 ? (
            <DailyScheduleView
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              todayStr={todayStr}
              timetableData={timetableData}
            />
          ) : !timetableData || ((!timetableData.entries || timetableData.entries.length === 0) && (!timetableData.schedule || timetableData.schedule.length === 0)) ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <CalendarMonthIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Box component="div" sx={{ typography: 'h6', color: 'text.secondary', mb: 1 }}>
                No Timetable Published Yet
              </Box>
              <Box component="div" sx={{ typography: 'body2', color: 'text.secondary' }}>
                The official timetable for this class will be visible once published by the academic office.
              </Box>
            </Paper>
          ) : timetableData.entries && timetableData.entries.length > 0 && timetableData.periods && timetableData.periods.length > 0 ? (
            <WeeklyMatrixView
              timetableData={timetableData}
              activeWorkingDays={activeWorkingDays}
            />
          ) : (
            <LegacyScheduleView schedule={timetableData.schedule} />
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
