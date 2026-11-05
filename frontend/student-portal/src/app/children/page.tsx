'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';

import SchoolIcon from '@mui/icons-material/School';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GradeIcon from '@mui/icons-material/Grade';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BadgeIcon from '@mui/icons-material/Badge';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useMyChildren,
  useChildAttendance,
  useChildMarks,
  useChildFees,
  useChildTimetable,
  useChildAssignments,
} from '@/features/parents/hooks';
import {
  ChildOverviewHeaderCard,
  ChildSelectorTabs,
  ChildBioTab,
  ChildAttendanceTab,
  ChildMarksTab,
  ChildTimetableTab,
  ChildAssignmentsTab,
  ChildFeesTab,
} from '@/features/parents/components';

export default function ChildrenPage() {
  const { data: children, isLoading, error } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState(0);

  const activeChild = children && children.length > 0 ? children[selectedChildIndex] : null;
  const childId = activeChild?.student_id || activeChild?.id;

  // Academic queries for active child
  const { data: attendance, isLoading: loadingAttendance } = useChildAttendance(childId);
  const { data: marks, isLoading: loadingMarks } = useChildMarks(childId);
  const { data: fees, isLoading: loadingFees } = useChildFees(childId);
  const { data: timetable, isLoading: loadingTimetable } = useChildTimetable(childId);
  const { data: assignments, isLoading: loadingAssignments } = useChildAssignments(childId);

  return (
    <RequireRole roles={[ROLES.PARENT]}>
      <AppShell>
        <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 6 }}>
          <PageHeader
            title="My Children"
            subtitle="Comprehensive academic monitoring, attendance tracking, and performance records for your linked students."
          />

          {isLoading ? (
            <Skeleton variant="rounded" height={320} />
          ) : error ? (
            <Alert severity="error">
              Unable to load linked child records. Please try again later.
            </Alert>
          ) : !children || children.length === 0 ? (
            <EmptyState
              title="No Linked Children Found"
              description="No student accounts have been linked to your guardian profile yet. Please reach out to the school administrative office to link your student."
              icon={<SchoolIcon sx={{ fontSize: 48 }} />}
            />
          ) : (
            <>
              {/* Multi-child selector tabs */}
              <ChildSelectorTabs
                childrenList={children}
                selectedIndex={selectedChildIndex}
                onSelectChild={(idx) => {
                  setSelectedChildIndex(idx);
                  setActiveTab(0);
                }}
              />

              {activeChild && (
                <>
                  {/* Child Overview Header Card */}
                  <ChildOverviewHeaderCard child={activeChild} />

                  {/* Navigation Sub-Tabs */}
                  <Paper sx={{ mb: 3, borderRadius: 2 }}>
                    <Tabs
                      value={activeTab}
                      onChange={(_, val) => setActiveTab(val)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Tab icon={<BadgeIcon />} iconPosition="start" label="Profile & Bio" />
                      <Tab icon={<EventAvailableIcon />} iconPosition="start" label="Attendance" />
                      <Tab icon={<GradeIcon />} iconPosition="start" label="Marks & Grades" />
                      <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Timetable" />
                      <Tab icon={<AssignmentIcon />} iconPosition="start" label="Assignments" />
                      <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Fees & Invoices" />
                    </Tabs>
                  </Paper>

                  {/* Tab Panels */}
                  {activeTab === 0 && <ChildBioTab child={activeChild} />}
                  {activeTab === 1 && (
                    <ChildAttendanceTab
                      attendance={attendance}
                      isLoading={loadingAttendance}
                    />
                  )}
                  {activeTab === 2 && (
                    <ChildMarksTab marks={marks} isLoading={loadingMarks} />
                  )}
                  {activeTab === 3 && (
                    <ChildTimetableTab
                      timetable={timetable}
                      isLoading={loadingTimetable}
                    />
                  )}
                  {activeTab === 4 && (
                    <ChildAssignmentsTab
                      assignments={assignments}
                      isLoading={loadingAssignments}
                    />
                  )}
                  {activeTab === 5 && (
                    <ChildFeesTab fees={fees} isLoading={loadingFees} />
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
