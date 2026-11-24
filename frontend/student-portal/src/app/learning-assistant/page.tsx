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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RouteIcon from '@mui/icons-material/Route';
import TodayIcon from '@mui/icons-material/Today';
import QuizIcon from '@mui/icons-material/Quiz';
import ForumIcon from '@mui/icons-material/Forum';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';

import { learningAssistantApi, learningAssistantKeys } from '@/features/learning-assistant/api';
import { PracticeSession, PracticeEvaluation } from '@/features/learning-assistant/types';
import LearningOverviewTab from '@/features/learning-assistant/components/LearningOverviewTab';
import SubjectAnalysisTab from '@/features/learning-assistant/components/SubjectAnalysisTab';
import LearningPathTab from '@/features/learning-assistant/components/LearningPathTab';
import DailyStudyPlanTab from '@/features/learning-assistant/components/DailyStudyPlanTab';
import PracticeQuizTab from '@/features/learning-assistant/components/PracticeQuizTab';
import AITutorChatTab from '@/features/learning-assistant/components/AITutorChatTab';

export default function AILearningAssistantPage() {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState(0);

  // Active quiz state
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);
  const [quizEvaluation, setQuizEvaluation] = useState<PracticeEvaluation | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Queries
  const { data: overview, isLoading: loadingOverview, error: overviewError } = useQuery({
    queryKey: learningAssistantKeys.overview(),
    queryFn: () => learningAssistantApi.getOverview(),
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: learningAssistantKeys.subjects(),
    queryFn: () => learningAssistantApi.getSubjects(),
  });

  const { data: recommendations = [], isLoading: loadingPath } = useQuery({
    queryKey: learningAssistantKeys.learningPath(),
    queryFn: () => learningAssistantApi.getLearningPath(),
  });

  const { data: dailyPlan, isLoading: loadingPlan } = useQuery({
    queryKey: learningAssistantKeys.dailyPlan(),
    queryFn: () => learningAssistantApi.getDailyPlan(),
  });

  // Mutations
  const updateRecMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) =>
      learningAssistantApi.updateRecommendationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.all });
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => learningAssistantApi.recalculateLearningPath(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.all });
    },
  });

  const updatePlanItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) =>
      learningAssistantApi.updateDailyPlanItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.dailyPlan() });
      queryClient.invalidateQueries({ queryKey: learningAssistantKeys.overview() });
    },
  });

  // Handlers
  const handleNavigateTab = (tabIndex: number, contextPayload?: any) => {
    setCurrentTab(tabIndex);
    if (tabIndex === 4 && contextPayload) {
      handleGenerateQuiz(contextPayload.chapter_id, contextPayload.subject_id, 'MEDIUM');
    }
  };

  const handleGenerateQuiz = async (chapterId?: string, subjectId?: string, difficulty: string = 'MEDIUM') => {
    setIsGeneratingQuiz(true);
    setQuizEvaluation(null);
    try {
      const session = await learningAssistantApi.generatePractice({
        chapter_id: chapterId,
        subject_id: subjectId,
        difficulty,
        num_questions: 5,
      });
      setActiveSession(session);
      setCurrentTab(4); // Switch to Practice Quiz Tab
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSubmitQuiz = async (
    sessionId: string,
    answers: Array<{ question_id: string; selected_option_index: number }>
  ) => {
    const evalRes = await learningAssistantApi.submitPractice(sessionId, answers);
    setQuizEvaluation(evalRes);
    setActiveSession(null);
    queryClient.invalidateQueries({ queryKey: learningAssistantKeys.all });
  };

  const handleResetQuiz = () => {
    setActiveSession(null);
    setQuizEvaluation(null);
  };

  const handleChatAction = (actionType: string) => {
    if (actionType === 'NAVIGATE_PLAN') {
      setCurrentTab(3);
    } else if (actionType === 'START_PRACTICE') {
      setCurrentTab(4);
    } else if (actionType === 'VIEW_SUBJECT') {
      setCurrentTab(1);
    }
  };

  const isLoadingInitial = loadingOverview || loadingSubjects || loadingPath || loadingPlan;

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Page Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              AI Personal Learning Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Understand your academic performance, master key concepts, and follow your customized daily study plan.
            </Typography>
          </Box>

          {/* Navigation Tabs */}
          <Tabs
            value={currentTab}
            onChange={(_e, val) => setCurrentTab(val)}
            variant="scrollable"
            scrollButtons="auto"
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
            <Tab icon={<DashboardIcon />} iconPosition="start" label="Learning Overview" />
            <Tab icon={<MenuBookIcon />} iconPosition="start" label="Subject Analysis" />
            <Tab icon={<RouteIcon />} iconPosition="start" label="My Learning Path" />
            <Tab icon={<TodayIcon />} iconPosition="start" label="Today's Study Plan" />
            <Tab icon={<QuizIcon />} iconPosition="start" label="Practice & Quizzes" />
            <Tab icon={<ForumIcon />} iconPosition="start" label="AI Tutor Chat" />
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
              {/* Tab 0: Overview */}
              {currentTab === 0 && overview && (
                <LearningOverviewTab overview={overview} onNavigateTab={handleNavigateTab} />
              )}

              {/* Tab 1: Subject Analysis */}
              {currentTab === 1 && (
                loadingSubjects ? (
                  <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3 }} />
                ) : (
                  <SubjectAnalysisTab
                    subjects={subjects}
                    onStartChapterPractice={(chId, _title, subjName) => {
                      const subj = subjects.find((s) => s.subject_name === subjName);
                      handleGenerateQuiz(chId, subj?.subject_id, 'MEDIUM');
                    }}
                  />
                )
              )}

              {/* Tab 2: Learning Path */}
              {currentTab === 2 && (
                loadingPath ? (
                  <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3 }} />
                ) : (
                  <LearningPathTab
                    recommendations={recommendations}
                    onUpdateStatus={async (recId, status) => {
                      await updateRecMutation.mutateAsync({ id: recId, status });
                    }}
                    onRecalculate={async () => {
                      await recalcMutation.mutateAsync();
                    }}
                    onStartPractice={(subjName, _topicTitle) => {
                      const subj = subjects.find((s) => s.subject_name === subjName);
                      handleGenerateQuiz(undefined, subj?.subject_id, 'MEDIUM');
                    }}
                  />
                )
              )}

              {/* Tab 3: Daily Study Plan */}
              {currentTab === 3 && (
                loadingPlan ? (
                  <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3 }} />
                ) : dailyPlan ? (
                  <DailyStudyPlanTab
                    plan={dailyPlan}
                    onUpdateItem={async (itemId, payload) => {
                      await updatePlanItemMutation.mutateAsync({ itemId, payload });
                    }}
                  />
                ) : null
              )}

              {/* Tab 4: Practice & Quizzes */}
              {currentTab === 4 && (
                <PracticeQuizTab
                  subjects={subjects}
                  activeSession={activeSession}
                  evaluation={quizEvaluation}
                  isLoading={isGeneratingQuiz}
                  onGenerateQuiz={handleGenerateQuiz}
                  onSubmitQuiz={handleSubmitQuiz}
                  onResetQuiz={handleResetQuiz}
                />
              )}

              {/* Tab 5: AI Tutor Chat */}
              {currentTab === 5 && (
                <AITutorChatTab
                  onSendMessage={async (msg) => {
                    return await learningAssistantApi.sendChatMessage(msg);
                  }}
                  onExecuteAction={handleChatAction}
                />
              )}
            </>
          )}
        </Container>
      </AppShell>
    );
}
