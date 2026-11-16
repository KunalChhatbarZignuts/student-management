'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import SchoolIcon from '@mui/icons-material/School';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { examinationsApi } from '@/features/examinations/api';
import {
  PublishedResultsCard,
  UpcomingExamsList,
} from '@/features/examinations/components';

export default function StudentExaminationsPage() {
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  // Parent child selector
  const { data: children } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const selectedChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  const [activeTab, setActiveTab] = React.useState(0);

  // 1. Fetch Upcoming Exams
  const { data: upcomingExams, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ['examinations', 'upcoming', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return [];
        return examinationsApi.getParentChildUpcomingExams(selectedChild.id);
      }
      return examinationsApi.getStudentUpcomingExams();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  // 2. Fetch Published Results
  const { data: results, isLoading: isResultsLoading } = useQuery({
    queryKey: ['examinations', 'results', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return [];
        return examinationsApi.getParentChildResults(selectedChild.id);
      }
      return examinationsApi.getStudentResults();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  const handleDownloadPdf = async (examId: string, filename: string) => {
    if (isParent && selectedChild?.id) {
      await examinationsApi.downloadParentChildReportCard(selectedChild.id, examId, filename);
    } else {
      await examinationsApi.downloadStudentReportCard(examId, filename);
    }
  };

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 3 } }}>
          <PageHeader
            title="Examinations & Official Report Cards"
            subtitle="View physical offline examination schedules, subject evaluation breakdowns, and download school report cards."
          />

          <Alert
            severity="info"
            icon={<SchoolIcon fontSize="inherit" />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <strong>Important School Notice:</strong> Examinations are conducted <strong>OFFLINE</strong> at school.
            Students must physically report to their designated examination rooms with valid identification.
          </Alert>

          {/* Parent Child Switcher */}
          {isParent && children && children.length > 1 && (
            <Paper variant="outlined" sx={{ p: 1, mb: 3, borderRadius: 2 }}>
              <Tabs
                value={selectedChildIndex}
                onChange={(_, val) => setSelectedChildIndex(val)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {children.map((child, idx) => (
                  <Tab
                    key={child.id || idx}
                    label={`${child.first_name} ${child.last_name} (${child.class_name || 'Student'})`}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Tabs>
            </Paper>
          )}

          {/* View Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<CalendarMonthIcon />}
              iconPosition="start"
              label={`Upcoming Exam Timetable (${upcomingExams?.length || 0})`}
              sx={{ fontWeight: 600 }}
            />
            <Tab
              icon={<WorkspacePremiumIcon />}
              iconPosition="start"
              label={`Published Results & Report Cards (${results?.length || 0})`}
              sx={{ fontWeight: 600 }}
            />
          </Tabs>

          {/* Tab 0: Upcoming Schedule */}
          {activeTab === 0 && (
            <UpcomingExamsList
              schedules={upcomingExams || []}
              isLoading={isUpcomingLoading}
            />
          )}

          {/* Tab 1: Published Results & Report Cards */}
          {activeTab === 1 && (
            <Box>
              {isResultsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !results || results.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#fafafa', borderRadius: 2 }}>
                  <WorkspacePremiumIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600} color="text.secondary">
                    No examination results published yet.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    When your class teacher submits marks and administration approves publication, official report cards will appear here.
                  </Typography>
                </Paper>
              ) : (
                results.map((res) => (
                  <PublishedResultsCard
                    key={res.id}
                    result={res}
                    onDownloadPdf={handleDownloadPdf}
                  />
                ))
              )}
            </Box>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
