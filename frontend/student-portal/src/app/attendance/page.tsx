'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { PageHeader } from '@/components/ui/PageHeader';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { academicApi } from '@/features/academic/api';
import {
  AttendanceSummaryCards,
  AttendanceLogTable,
  AttendancePolicyNotice,
} from '@/features/attendance/components';

export default function AttendancePage() {
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  // For parent, fetch linked children
  const { data: children } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const selectedChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['academic', 'attendance', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return null;
        return academicApi.getChildAttendance(selectedChild.id);
      }
      return academicApi.getMyAttendance();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  const percentage = attendance?.percentage ?? 100;
  const attended = attendance?.attended_classes ?? 0;
  const total = attendance?.total_classes ?? 0;
  const excused = attendance?.excused_absences ?? 0;
  const records = attendance?.records ?? [];

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <PageHeader
            title="Attendance Record"
            subtitle="Academic term attendance summary and daily roll call verification."
          />

          {isParent && children && children.length > 1 && (
            <Tabs
              value={selectedChildIndex}
              onChange={(_, val) => setSelectedChildIndex(val)}
              sx={{ mb: 3 }}
            >
              {children.map((child, idx) => (
                <Tab key={child.id || idx} label={`${child.first_name} ${child.last_name}`} />
              ))}
            </Tabs>
          )}

          {isLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={36} />
            </Box>
          ) : (
            <>
              {/* Summary Metric Cards */}
              <AttendanceSummaryCards
                percentage={percentage}
                attended={attended}
                total={total}
                excused={excused}
              />

              {/* Attendance Log Table */}
              <AttendanceLogTable records={records} />

              {/* Attendance Policy Notice */}
              <AttendancePolicyNotice />
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
