'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
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
import { MarksTable } from '@/features/academic/components';

export default function MarksPage() {
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  const { data: children } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const selectedChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  const { data: marks, isLoading } = useQuery({
    queryKey: ['academic', 'marks', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return [];
        return academicApi.getChildMarks(selectedChild.id);
      }
      return academicApi.getMyMarks();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <PageHeader
            title="Marks & Academic Evaluation"
            subtitle="Current term grading reports and subject evaluation breakdowns."
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

          <MarksTable marks={marks} isLoading={isLoading} />

          <Alert severity="info">
            Official semester grade sheets and transcripts are published by the academic board at the close of every evaluation cycle.
          </Alert>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
