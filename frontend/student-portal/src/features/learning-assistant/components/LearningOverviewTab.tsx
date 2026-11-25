'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PsychologyIcon from '@mui/icons-material/Psychology';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { LearningOverview } from '../types';

interface LearningOverviewTabProps {
  overview: LearningOverview;
  onNavigateTab: (tabIndex: number, contextPayload?: any) => void;
}

export default function LearningOverviewTab({ overview, onNavigateTab }: LearningOverviewTabProps) {
  const topRec = overview.top_recommendation;
  const today = overview.today_plan_summary;
  const todayProgress = today.total_minutes > 0 ? (today.completed_minutes / today.total_minutes) * 100 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Hero Welcome & Top Recommendation */}
      {topRec && (
        <Card
          variant="outlined"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: '4px solid',
            borderLeftColor: 'primary.main',
            borderRadius: 2,
            p: 1,
            boxShadow: 'none',
          }}
        >
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                  <Chip
                    icon={<PsychologyIcon />}
                    label="AI Recommended Next Topic"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    label={`Priority: ${topRec.priority}`}
                    color={topRec.priority === 'HIGH' ? 'error' : 'warning'}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                  {topRec.subject_name}: {topRec.topic_title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 700 }}>
                  {topRec.reason}
                </Typography>
              </Box>
              <Stack direction="row" gap={1.5} flexShrink={0}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => onNavigateTab(1)}
                  sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
                >
                  View Study Plan
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* KPI Overview Grid */}
      <Grid container spacing={2.5}>
        {/* KPI 1: Overall Average */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Overall Exam Average
              </Typography>
              <SchoolIcon color="primary" />
            </Stack>
            <Typography variant="h4" fontWeight={700}>
              {overview.overall_exam_average}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Based on official published results
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 2: Today's Routine */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Today's Study Plan
              </Typography>
              <AutoStoriesIcon color="primary" />
            </Stack>
            <Typography variant="h4" fontWeight={700}>
              {today.completed_minutes} <Typography component="span" variant="body1" color="text.secondary">/ {today.total_minutes}m</Typography>
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={Math.min(todayProgress, 100)} sx={{ height: 6, borderRadius: 3 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {today.completed_items} of {today.items_count} activities finished
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 3: Learning Path Completion */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Recommendations
              </Typography>
              <CheckCircleIcon color="success" />
            </Stack>
            <Typography variant="h4" fontWeight={700}>
              {overview.recommendations_summary.completion_percentage}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {overview.recommendations_summary.completed_count} of {overview.recommendations_summary.total_recommendations} completed
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 4: Weak Focus Areas */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Focus Areas
              </Typography>
              <WarningAmberIcon color="warning" />
            </Stack>
            <Typography variant="h4" fontWeight={700}>
              {overview.weak_subjects.length} <Typography component="span" variant="body1" color="text.secondary">Subject{overview.weak_subjects.length !== 1 ? 's' : ''}</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Requiring targeted concept practice
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Strong vs Weak Subjects Breakdown */}
      <Grid container spacing={2.5}>
        {/* Strong Subjects */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" fontSize="small" /> Strong Subjects
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Subjects where your examination performance is excelling (≥65%).
            </Typography>

            {overview.strong_subjects.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Complete more official examinations to establish baseline strengths!
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                {overview.strong_subjects.map((s) => (
                  <Box
                    key={s.subject_name}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {s.subject_name}
                      </Typography>
                      <Stack direction="row" alignItems="center" gap={1} mt={0.5}>
                        <Chip label={s.status} size="small" color="success" sx={{ fontSize: 11, height: 20 }} />
                        <Chip
                          icon={s.trend === 'IMPROVING' ? <TrendingUpIcon /> : undefined}
                          label={s.trend}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 11, height: 20 }}
                        />
                      </Stack>
                    </Box>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {s.average_marks}%
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Weak Subjects */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberIcon color="error" fontSize="small" /> Subjects Requiring Improvement
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Identified academic gaps prioritized in your personalized learning path.
            </Typography>

            {overview.weak_subjects.length === 0 ? (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Outstanding! No subjects currently fall below passing thresholds.
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                {overview.weak_subjects.map((s) => (
                  <Box
                    key={s.subject_name}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: '4px solid',
                      borderColor: s.status === 'CRITICAL_ATTENTION' ? 'error.main' : 'warning.main',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {s.subject_name}
                      </Typography>
                      <Stack direction="row" alignItems="center" gap={1} mt={0.5}>
                        <Chip
                          label={s.status.replace('_', ' ')}
                          size="small"
                          color={s.status === 'CRITICAL_ATTENTION' ? 'error' : 'warning'}
                          sx={{ fontSize: 11, height: 20 }}
                        />
                        <Chip
                          icon={s.trend === 'DECLINING' ? <TrendingDownIcon /> : undefined}
                          label={s.trend}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 11, height: 20 }}
                        />
                      </Stack>
                    </Box>
                    <Typography variant="h6" fontWeight={700} color={s.status === 'CRITICAL_ATTENTION' ? 'error.main' : 'warning.main'}>
                      {s.average_marks}%
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Historical Performance Timeline */}
      {overview.historical_improvement.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Historical Examination Trajectory
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Track your official academic progress term by term.
          </Typography>
          <Stack spacing={2}>
            {overview.historical_improvement.map((item, idx) => (
              <Box key={idx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {item.exam_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Date: {item.date} | Grade: {item.grade}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {item.percentage}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={item.percentage}
                  color={item.percentage >= 75 ? 'success' : item.percentage >= 50 ? 'primary' : 'error'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Data Attribution Boundary Footer */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.default',
          borderStyle: 'dashed',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <VerifiedUserIcon color="primary" fontSize="small" />
        <Typography variant="caption" color="text.secondary">
          <strong>Data Attribution Boundary:</strong> Examination scores are derived directly from verified official school report card records. Formative chapter progress, difficulty mastery, and quizzes are diagnostic AI estimates designed for study guidance and do not modify official grades.
        </Typography>
      </Paper>
    </Box>
  );
}
