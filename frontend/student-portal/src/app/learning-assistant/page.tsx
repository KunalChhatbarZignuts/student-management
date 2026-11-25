'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import DashboardIcon from '@mui/icons-material/Dashboard';
import TodayIcon from '@mui/icons-material/Today';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';

import { learningAssistantApi, learningAssistantKeys } from '@/features/learning-assistant/api';
import { StudentStudySettings } from '@/features/learning-assistant/types';
import LearningOverviewTab from '@/features/learning-assistant/components/LearningOverviewTab';
import DailyStudyPlanTab from '@/features/learning-assistant/components/DailyStudyPlanTab';

export default function AILearningAssistantPage() {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState(0);

  // Queries
  const { data: overview, isLoading: loadingOverview, error: overviewError } = useQuery({
    queryKey: learningAssistantKeys.overview(),
    queryFn: () => learningAssistantApi.getOverview(),
  });

  const { data: dailyPlan, isLoading: loadingPlan } = useQuery({
    queryKey: learningAssistantKeys.dailyPlan(),
    queryFn: () => learningAssistantApi.getDailyPlan(),
  });

  const { data: weeklyPlan } = useQuery({
    queryKey: learningAssistantKeys.weeklyPlan(),
    queryFn: () => learningAssistantApi.getWeeklyPlan(),
  });

  const { data: settings } = useQuery({
    queryKey: learningAssistantKeys.settings(),
    queryFn: () => learningAssistantApi.getSettings(),
  });

  // Mutations
  const updatePlanItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) =>
      learningAssistantApi.updateDailyPlanItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.dailyPlan() });
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.weeklyPlan() });
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.overview() });
    },
  });

  const reschedulePlanItemMutation = useMutation({
    mutationFn: ({ itemId, targetDate }: { itemId: string; targetDate?: string }) =>
      learningAssistantApi.rescheduleDailyPlanItem(itemId, targetDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.dailyPlan() });
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.weeklyPlan() });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: Partial<StudentStudySettings>) =>
      learningAssistantApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.settings() });
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.dailyPlan() });
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.weeklyPlan() });
    },
  });

  // Handlers
  const handleNavigateTab = (tabIndex: number) => {
    setCurrentTab(tabIndex);
  };

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Academic Performance & Study Planner
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Understand your official academic performance, track exam progress, and follow your customized daily study routine.
          </Typography>
        </Box>

        {/* Navigation Tabs */}
        <Tabs
          value={currentTab}
          onChange={(_e, val) => setCurrentTab(val)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<DashboardIcon />} iconPosition="start" label="Academic Overview" />
          <Tab icon={<TodayIcon />} iconPosition="start" label="Study Planner & Routine" />
        </Tabs>

        {/* Error State */}
        {overviewError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            Failed to load learning assistant profile. Please verify your connection or contact school support.
          </Alert>
        )}

        {/* Loading Skeletons */}
        {loadingOverview ? (
          <Stack spacing={2.5}>
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
          </Stack>
        ) : (
          <>
            {/* Tab 0: Academic Overview */}
            {currentTab === 0 && overview && (
              <LearningOverviewTab overview={overview} onNavigateTab={handleNavigateTab} />
            )}

            {/* Tab 1: Daily & Weekly Study Plan */}
            {currentTab === 1 && (
              loadingPlan ? (
                <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3 }} />
              ) : dailyPlan ? (
                <DailyStudyPlanTab
                  plan={dailyPlan}
                  weeklyPlan={weeklyPlan}
                  settings={settings}
                  onUpdateItem={async (itemId, payload) => {
                    await updatePlanItemMutation.mutateAsync({ itemId, payload });
                  }}
                  onRescheduleItem={async (itemId, targetDate) => {
                    await reschedulePlanItemMutation.mutateAsync({ itemId, targetDate });
                  }}
                  onUpdateSettings={async (payload) => {
                    await updateSettingsMutation.mutateAsync(payload);
                  }}
                />
              ) : null
            )}
          </>
        )}
      </Container>
    </AppShell>
  );
}
