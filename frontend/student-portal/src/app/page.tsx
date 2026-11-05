'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/hooks';
import { useMyStudentProfile } from '@/features/students/hooks';
import { useMyChildren, useParentNotifications } from '@/features/parents/hooks';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { academicApi } from '@/features/academic/api';
import {
  DashboardGreetingHeader,
  StudentMetricsGrid,
  ParentChildrenOverview,
  DashboardQuickNavigation,
} from '@/features/dashboard/components';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { data: student, isLoading: loadingStudent, error: studentError } = useMyStudentProfile();
  const { data: children, isLoading: loadingChildren, error: childrenError } = useMyChildren();
  const { data: notifications } = useParentNotifications();

  const isStudent = role === ROLES.STUDENT;
  const isParent = role === ROLES.PARENT;

  const { data: attendance } = useQuery({
    queryKey: ['academic', 'attendance', 'me'],
    queryFn: academicApi.getMyAttendance,
    enabled: isStudent,
  });

  const userName =
    user?.student?.first_name ||
    user?.parent?.first_name ||
    user?.email.split('@')[0] ||
    'User';

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        {/* Welcome Greeting Header */}
        <DashboardGreetingHeader
          name={userName}
          role={role || 'STUDENT'}
          isStudent={isStudent}
        />

        {/* Student View */}
        {isStudent && (
          <StudentMetricsGrid
            student={student}
            attendance={attendance}
            isLoading={loadingStudent}
            error={studentError}
          />
        )}

        {/* Parent View */}
        {isParent && (
          <ParentChildrenOverview
            childrenList={children}
            notifications={notifications}
            isLoading={loadingChildren}
            error={childrenError}
          />
        )}

        {/* Quick Navigation Cards */}
        <DashboardQuickNavigation isParent={isParent} />
      </AppShell>
    </RequireRole>
  );
}
