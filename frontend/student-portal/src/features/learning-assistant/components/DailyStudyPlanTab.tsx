'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

import { DailyStudyPlan, StudyPlanItem } from '../types';

interface DailyStudyPlanTabProps {
  plan: DailyStudyPlan;
  onUpdateItem: (itemId: string, payload: { is_completed?: boolean; additional_seconds_spent?: number }) => Promise<void>;
}

export default function DailyStudyPlanTab({ plan, onUpdateItem }: DailyStudyPlanTabProps) {
  const [activeItem, setActiveItem] = useState<StudyPlanItem | null>(
    plan.items.find((i) => !i.is_completed) || null
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    activeItem ? activeItem.duration_minutes * 60 : 1200
  );

  // Sync timer when active item changes
  useEffect(() => {
    if (activeItem) {
      setSecondsRemaining(activeItem.duration_minutes * 60);
      setTimerRunning(false);
    }
  }, [activeItem]);

  // Interval timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && timerRunning) {
      setTimerRunning(false);
      if (activeItem) {
        onUpdateItem(activeItem.id, { is_completed: true, additional_seconds_spent: activeItem.duration_minutes * 60 });
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, secondsRemaining, activeItem, onUpdateItem]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleCompleted = async (item: StudyPlanItem) => {
    await onUpdateItem(item.id, { is_completed: !item.is_completed });
  };

  const progressPct = plan.total_planned_minutes > 0 ? (plan.completed_minutes / plan.total_planned_minutes) * 100 : 0;
  const isAllCompleted = plan.items.length > 0 && plan.items.every((i) => i.is_completed);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Daily Progress */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Today's Personalized Study Routine
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date: {plan.plan_date} | Target: {plan.total_planned_minutes} minutes of focused academic revision.
            </Typography>
          </Box>
          <Chip
            label={isAllCompleted ? 'All Goals Completed' : `${plan.completed_minutes} of ${plan.total_planned_minutes} mins done`}
            color={isAllCompleted ? 'success' : 'primary'}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(progressPct, 100)}
            sx={{ height: 8, borderRadius: 4 }}
            color={isAllCompleted ? 'success' : 'primary'}
          />
        </Box>
      </Paper>

      {/* Completion Banner */}
      {isAllCompleted && (
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: '4px solid',
            borderLeftColor: 'success.main',
            p: 1,
            boxShadow: 'none',
          }}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" gap={2}>
              <EmojiEventsIcon color="success" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  All Goals Completed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You have completed all scheduled learning activities for today.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Active Focus Session Timer */}
      {activeItem && !isAllCompleted && (
        <Card
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: timerRunning ? 'primary.main' : 'divider',
            boxShadow: 'none',
          }}
        >
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={3}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                  <Chip label="Active Focus Timer" size="small" color="primary" sx={{ fontWeight: 600 }} />
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {activeItem.subject_name}
                  </Typography>
                </Stack>
                <Typography variant="h5" fontWeight={700}>
                  {activeItem.topic_title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Activity: {activeItem.activity_type.replace('_', ' ')}
                </Typography>
              </Box>

              {/* Digital Countdown Display */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h2"
                  fontWeight={800}
                  color={timerRunning ? 'primary.main' : 'text.primary'}
                  sx={{ fontFamily: 'monospace', letterSpacing: 2 }}
                >
                  {formatTimer(secondsRemaining)}
                </Typography>
                <Stack direction="row" gap={1.5} justifyContent="center" mt={1}>
                  <Button
                    variant="contained"
                    color={timerRunning ? 'warning' : 'primary'}
                    startIcon={timerRunning ? <PauseIcon /> : <PlayArrowIcon />}
                    onClick={() => setTimerRunning(!timerRunning)}
                    sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
                  >
                    {timerRunning ? 'Pause' : 'Start Focus'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleToggleCompleted(activeItem)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Mark Done
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Daily Checklist */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Today's Activity Checklist
        </Typography>

        <Stack spacing={1.5}>
          {plan.items.map((item, idx) => {
            const isSelected = activeItem?.id === item.id;
            return (
              <Box
                key={item.id}
                onClick={() => setActiveItem(item)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isSelected ? 'rgba(25, 118, 210, 0.05)' : 'background.paper',
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.light' : 'divider',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.2s',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <Checkbox
                    checked={item.is_completed}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleCompleted(item);
                    }}
                    color="success"
                  />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{ textDecoration: item.is_completed ? 'line-through' : 'none', color: item.is_completed ? 'text.secondary' : 'text.primary' }}
                    >
                      {item.topic_title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.subject_name} • {item.activity_type.replace('_', ' ')}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="center" gap={1}>
                  <Chip
                    icon={<TimerIcon fontSize="small" />}
                    label={`${item.duration_minutes}m`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                  {item.is_completed && <Chip label="Done" size="small" color="success" sx={{ fontSize: 11, height: 20 }} />}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    </Box>
  );
}
