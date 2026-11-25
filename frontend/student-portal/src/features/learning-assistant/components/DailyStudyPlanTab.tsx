'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// Icons
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TuneIcon from '@mui/icons-material/Tune';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TodayIcon from '@mui/icons-material/Today';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FlagIcon from '@mui/icons-material/Flag';
import StopIcon from '@mui/icons-material/Stop';

import {
  DailyStudyPlan,
  StudyPlanItem,
  WeeklyStudyPlan,
  StudentStudySettings,
  StudySession,
  CreateRoutineActivityPayload,
  UpdateRoutineActivityPayload,
} from '../types';
import { learningAssistantApi } from '../api';

const ACTIVITY_TYPES = [
  { value: 'REVISION', label: 'Revision' },
  { value: 'PRACTICE_QUIZ', label: 'Practice Quiz' },
  { value: 'CONCEPT_LEARNING', label: 'Concept Learning' },
  { value: 'HOMEWORK', label: 'Homework' },
  { value: 'READING', label: 'Reading' },
  { value: 'PROBLEM_SOLVING', label: 'Problem Solving' },
  { value: 'MOCK_TEST', label: 'Mock Test' },
  { value: 'FLASHCARDS', label: 'Flashcards' },
  { value: 'CUSTOM_ACTIVITY', label: 'Custom Activity' },
];

const PRIORITIES = [
  { value: 'HIGH', label: 'High Priority', color: 'error' as const },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'warning' as const },
  { value: 'LOW', label: 'Low Priority', color: 'info' as const },
];

interface DailyStudyPlanTabProps {
  plan: DailyStudyPlan;
  weeklyPlan?: WeeklyStudyPlan | null;
  settings?: StudentStudySettings | null;
  onUpdateItem: (itemId: string, payload: { is_completed?: boolean; additional_seconds_spent?: number }) => Promise<void>;
  onRescheduleItem?: (itemId: string, targetDate?: string) => Promise<void>;
  onUpdateSettings?: (payload: Partial<StudentStudySettings>) => Promise<void>;
}

export default function DailyStudyPlanTab({
  plan: initialPlan,
  weeklyPlan,
  settings,
  onUpdateItem,
  onRescheduleItem,
  onUpdateSettings,
}: DailyStudyPlanTabProps) {
  // Current view state
  const [viewMode, setViewMode] = useState<'TODAY' | 'WEEKLY'>('TODAY');
  const [currentDate, setCurrentDate] = useState<string>(initialPlan.plan_date || new Date().toISOString().split('T')[0]);
  const [routine, setRoutine] = useState<DailyStudyPlan>(initialPlan);
  const [loadingRoutine, setLoadingRoutine] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Focus timer persistent session state
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number>(0);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState<number>(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<StudyPlanItem | null>(null);
  const [openSettings, setOpenSettings] = useState<boolean>(false);
  const [openDuplicateDialog, setOpenDuplicateDialog] = useState<boolean>(false);
  const [duplicateTargetDate, setDuplicateTargetDate] = useState<string>('');
  const [includeCompletedInDup, setIncludeCompletedInDup] = useState<boolean>(false);
  const [openFinishDialog, setOpenFinishDialog] = useState<boolean>(false);
  const [finishMarkCompleted, setFinishMarkCompleted] = useState<boolean>(true);
  const [finishNotes, setFinishNotes] = useState<string>('');

  // Item action menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetItem, setMenuTargetItem] = useState<StudyPlanItem | null>(null);

  // Settings form states
  const [weekdayMins, setWeekdayMins] = useState(settings?.weekday_daily_minutes || 45);
  const [weekendMins, setWeekendMins] = useState(settings?.weekend_daily_minutes || 90);
  const [prefTime, setPrefTime] = useState(settings?.preferred_study_time || 'EVENING');

  // Activity Form state
  const [formSubject, setFormSubject] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('CONCEPT_LEARNING');
  const [formDuration, setFormDuration] = useState(25);
  const [formPriority, setFormPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [formStartTime, setFormStartTime] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formResourceUrl, setFormResourceUrl] = useState('');

  // Sync routine with prop on initial load
  useEffect(() => {
    if (initialPlan) {
      setRoutine(initialPlan);
      setCurrentDate(initialPlan.plan_date);
    }
  }, [initialPlan]);

  // Fetch active study session from server on mount
  const fetchActiveSession = useCallback(async () => {
    try {
      const session = await learningAssistantApi.getActiveStudySession();
      setActiveSession(session);
      if (session) {
        setTimerSecondsRemaining(session.remaining_seconds);
        setTimerElapsedSeconds(session.elapsed_seconds);
      }
    } catch {
      // Ignored if unauthenticated or offline
    }
  }, []);

  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  // Timer interval ticker for ACTIVE session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeSession && activeSession.status === 'ACTIVE') {
      interval = setInterval(() => {
        setTimerSecondsRemaining((prev) => Math.max(0, prev - 1));
        setTimerElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Routine Fetch for a specific date
  const loadRoutineForDate = async (dateStr: string) => {
    setLoadingRoutine(true);
    setErrorMessage(null);
    try {
      const data = await learningAssistantApi.getDailyRoutine(dateStr);
      setRoutine(data);
      setCurrentDate(dateStr);
      await fetchActiveSession();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load study routine';
      setErrorMessage(msg);
    } finally {
      setLoadingRoutine(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    loadRoutineForDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    loadRoutineForDate(d.toISOString().split('T')[0]);
  };

  const handleJumpToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    loadRoutineForDate(today);
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormSubject('Mathematics');
    setFormTopic('');
    setFormTitle('');
    setFormDescription('');
    setFormType('PRACTICE_QUIZ');
    setFormDuration(25);
    setFormPriority('MEDIUM');
    setFormStartTime('18:00');
    setFormNotes('');
    setFormResourceUrl('');
    setOpenAddDialog(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: StudyPlanItem) => {
    setEditingItem(item);
    setFormSubject(item.subject_name);
    setFormTopic(item.topic_title);
    setFormTitle(item.title || item.topic_title);
    setFormDescription(item.description || '');
    setFormType(item.activity_type || 'CONCEPT_LEARNING');
    setFormDuration(item.duration_minutes);
    setFormPriority(item.priority || 'MEDIUM');
    setFormStartTime(item.start_time || '');
    setFormNotes(item.notes || '');
    setFormResourceUrl(item.recommended_resource_url || '');
    setOpenAddDialog(true);
    setMenuAnchorEl(null);
  };

  // Submit Activity Form (Create or Update)
  const handleSaveActivity = async () => {
    if (!formSubject.trim() || !formTopic.trim()) {
      setErrorMessage('Subject and Topic are required.');
      return;
    }
    setLoadingRoutine(true);
    try {
      if (editingItem) {
        const payload: UpdateRoutineActivityPayload = {
          subject_name: formSubject,
          topic_title: formTopic,
          title: formTitle || formTopic,
          description: formDescription,
          activity_type: formType,
          duration_minutes: formDuration,
          priority: formPriority,
          start_time: formStartTime,
          notes: formNotes,
          recommended_resource_url: formResourceUrl,
        };
        const updated = await learningAssistantApi.updateRoutineActivity(editingItem.id, payload);
        setRoutine(updated);
      } else {
        const payload: CreateRoutineActivityPayload = {
          subject_name: formSubject,
          topic_title: formTopic,
          title: formTitle || formTopic,
          description: formDescription,
          activity_type: formType,
          duration_minutes: formDuration,
          priority: formPriority,
          start_time: formStartTime,
          notes: formNotes,
          recommended_resource_url: formResourceUrl,
          target_date: currentDate,
        };
        const updated = await learningAssistantApi.createRoutineActivity(payload);
        setRoutine(updated);
      }
      setOpenAddDialog(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error saving activity');
    } finally {
      setLoadingRoutine(false);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (itemId: string) => {
    setLoadingRoutine(true);
    try {
      const updated = await learningAssistantApi.deleteRoutineActivity(itemId);
      setRoutine(updated);
      setMenuAnchorEl(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error deleting activity');
    } finally {
      setLoadingRoutine(false);
    }
  };

  // Toggle status / completion checkbox
  const handleToggleCompleted = async (item: StudyPlanItem) => {
    try {
      const newCompleted = !item.is_completed;
      const newStatus = newCompleted ? 'COMPLETED' : 'PENDING';
      if (onUpdateItem) {
        await onUpdateItem(item.id, {
          is_completed: newCompleted,
          additional_seconds_spent: newCompleted ? item.duration_minutes * 60 : 0,
        });
      }
      try {
        const updated = await learningAssistantApi.updateActivityStatus(item.id, {
          status: newStatus,
          additional_seconds_spent: newCompleted ? item.duration_minutes * 60 : 0,
        });
        setRoutine(updated);
      } catch {
        // Fallback for mock environments
        setRoutine((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, is_completed: newCompleted, status: newStatus } : i
          ),
        }));
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Change status from menu
  const handleChangeStatus = async (item: StudyPlanItem, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'SKIPPED') => {
    try {
      const updated = await learningAssistantApi.updateActivityStatus(item.id, { status });
      setRoutine(updated);
      setMenuAnchorEl(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Focus Timer actions
  const handleStartSession = async (item: StudyPlanItem) => {
    setErrorMessage(null);
    try {
      const session = await learningAssistantApi.startStudySession({
        plan_item_id: item.id,
        target_duration_seconds: item.duration_minutes * 60,
      });
      setActiveSession(session);
      setTimerSecondsRemaining(session.remaining_seconds);
      setTimerElapsedSeconds(session.elapsed_seconds);
      // Refresh routine items to reflect IN_PROGRESS status
      const updated = await learningAssistantApi.getDailyRoutine(currentDate);
      setRoutine(updated);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not start session');
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;
    try {
      const session = await learningAssistantApi.pauseStudySession(activeSession.id);
      setActiveSession(session);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not pause session');
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    try {
      const session = await learningAssistantApi.resumeStudySession(activeSession.id);
      setActiveSession(session);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not resume session');
    }
  };

  const handleOpenFinishDialog = () => {
    setFinishMarkCompleted(true);
    setFinishNotes('');
    setOpenFinishDialog(true);
  };

  const handleConfirmFinishSession = async () => {
    if (!activeSession) return;
    try {
      await learningAssistantApi.finishStudySession(activeSession.id, {
        mark_activity_completed: finishMarkCompleted,
        notes: finishNotes || undefined,
      });
      setActiveSession(null);
      setOpenFinishDialog(false);
      const updated = await learningAssistantApi.getDailyRoutine(currentDate);
      setRoutine(updated);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not finish session');
    }
  };

  const handleCancelSession = async () => {
    if (!activeSession) return;
    try {
      await learningAssistantApi.cancelStudySession(activeSession.id);
      setActiveSession(null);
      const updated = await learningAssistantApi.getDailyRoutine(currentDate);
      setRoutine(updated);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not cancel session');
    }
  };

  // Routine Duplication
  const handleOpenDuplicate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDuplicateTargetDate(tomorrow.toISOString().split('T')[0]);
    setIncludeCompletedInDup(false);
    setOpenDuplicateDialog(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicateTargetDate) return;
    try {
      const updated = await learningAssistantApi.duplicateRoutine({
        source_date: currentDate,
        target_date: duplicateTargetDate,
        include_completed: includeCompletedInDup,
      });
      setOpenDuplicateDialog(false);
      // Switch view to target date
      setRoutine(updated);
      setCurrentDate(duplicateTargetDate);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not duplicate routine');
    }
  };

  // Preferences save
  const handleSaveSettings = async () => {
    if (onUpdateSettings) {
      await onUpdateSettings({
        weekday_daily_minutes: weekdayMins,
        weekend_daily_minutes: weekendMins,
        preferred_study_time: prefTime,
      });
    }
    setOpenSettings(false);
  };

  // Overview metrics calculation
  const totalPlanned = routine.total_planned_minutes || 0;
  const completedMinutes = routine.completed_minutes || 0;
  const remainingMinutes = Math.max(0, totalPlanned - completedMinutes);
  const progressPct = totalPlanned > 0 ? (completedMinutes / totalPlanned) * 100 : 0;
  const isAllCompleted = routine.items.length > 0 && routine.items.every((i) => i.is_completed);

  // Active item for the timer session
  const sessionItem = useMemo(() => {
    if (!activeSession) return null;
    return routine.items.find((i) => i.id === activeSession.plan_item_id) || null;
  }, [activeSession, routine.items]);

  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      return routine.items.find((i) => i.id === selectedItemId) || null;
    }
    return routine.items.find((i) => !i.is_completed) || routine.items[0] || null;
  }, [selectedItemId, routine.items]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Error alert */}
      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Date Navigation & Primary Actions Bar */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Tooltip title="Previous Day">
              <IconButton onClick={handlePrevDay} size="small">
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 140, textAlign: 'center' }}>
              {new Date(currentDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
            <Tooltip title="Next Day">
              <IconButton onClick={handleNextDay} size="small">
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="text"
              startIcon={<TodayIcon />}
              onClick={handleJumpToToday}
              sx={{ textTransform: 'none', fontWeight: 600, ml: 1 }}
            >
              Current Day
            </Button>
          </Stack>

          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Button
              size="small"
              variant={viewMode === 'TODAY' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('TODAY')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Today
            </Button>
            <Button
              size="small"
              variant={viewMode === 'WEEKLY' ? 'contained' : 'outlined'}
              startIcon={<CalendarMonthIcon fontSize="small" />}
              onClick={() => setViewMode('WEEKLY')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Weekly
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={handleOpenDuplicate}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Duplicate
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<TuneIcon fontSize="small" />}
              onClick={() => setOpenSettings(true)}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Preferences
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2 }}
            >
              Add Activity
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Daily Overview KPI Summary Card */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2} mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Daily Routine Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preferred Study Window: <strong>{settings?.preferred_study_time || 'Evening'}</strong> • Date: {currentDate}
            </Typography>
          </Box>
          <Stack direction="row" gap={1.5} alignItems="center">
            <Chip
              label={`${routine.completed_activities_count ?? routine.items.filter((i) => i.is_completed).length} of ${routine.items.length} Activities Completed`}
              color={isAllCompleted ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label={`${Math.round(progressPct)}% Complete`}
              color={progressPct >= 100 ? 'success' : 'primary'}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                DAILY STUDY GOAL
              </Typography>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                {totalPlanned} mins
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                COMPLETED TIME
              </Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">
                {completedMinutes} mins
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                REMAINING TIME
              </Typography>
              <Typography variant="h6" fontWeight={800} color="text.primary">
                {remainingMinutes} mins
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                PENDING TASKS
              </Typography>
              <Typography variant="h6" fontWeight={800} color="warning.main">
                {routine.items.filter((i) => !i.is_completed).length} items
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 1 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Daily Target Progress
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {completedMinutes} / {totalPlanned} mins
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(progressPct, 100)}
            sx={{ height: 10, borderRadius: 5 }}
            color={isAllCompleted ? 'success' : 'primary'}
          />
        </Box>
      </Paper>

      {/* Weekly View (Collapsible) */}
      {viewMode === 'WEEKLY' && weeklyPlan && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                7-Day Weekly Curriculum Schedule
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Week starting: {weeklyPlan.week_start_date} • {weeklyPlan.upcoming_exams_count} upcoming exams integrated
              </Typography>
            </Box>
            <Chip
              label={`${weeklyPlan.completion_percentage}% Weekly Completion`}
              color="success"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Stack spacing={1.5}>
            {weeklyPlan.daily_plans.map((dp) => (
              <Box
                key={dp.id}
                onClick={() => loadRoutineForDate(dp.plan_date)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: dp.plan_date === currentDate ? 'primary.main' : 'divider',
                  bgcolor: dp.plan_date === currentDate ? 'rgba(25, 118, 210, 0.05)' : 'background.paper',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {dp.plan_date} {dp.plan_date === currentDate ? '(Viewing)' : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dp.items.length} activities • {dp.items.map((i) => i.subject_name).join(', ')}
                  </Typography>
                </Box>
                <Chip
                  label={`${dp.completed_minutes} / ${dp.total_planned_minutes}m`}
                  size="small"
                  variant="outlined"
                  color={dp.status === 'COMPLETED' ? 'success' : 'default'}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Goal Completed Celebration Banner */}
      {isAllCompleted && (
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: '5px solid',
            borderLeftColor: 'success.main',
            p: 1,
            bgcolor: 'background.paper',
          }}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" gap={2}>
              <EmojiEventsIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" fontWeight={800} color="text.primary">
                  All Today's Goals Completed! 🎉
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Great job! You have completed every scheduled activity in your study routine for today.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Persistent Focus Timer Card */}
      {activeSession && (
        <Card
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'action.hover',
            border: '2px solid',
            borderColor: activeSession.status === 'ACTIVE' ? 'primary.main' : 'warning.main',
            boxShadow: 'none',
          }}
        >
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={3}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                  <Chip
                    label={activeSession.status === 'ACTIVE' ? 'Timer Running' : 'Timer Paused'}
                    size="small"
                    color={activeSession.status === 'ACTIVE' ? 'primary' : 'warning'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    {sessionItem?.subject_name || activeSession.subject_name || 'Study Focus'}
                  </Typography>
                </Stack>
                <Typography variant="h5" fontWeight={800}>
                  {sessionItem?.title || sessionItem?.topic_title || activeSession.activity_title || 'Active Focus Session'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Session Time: {formatTimer(timerElapsedSeconds)} elapsed
                </Typography>
                {timerSecondsRemaining === 0 && (
                  <Typography variant="body2" color="success.main" fontWeight={700} sx={{ mt: 0.5 }}>
                    Target duration reached! Finish when ready or keep studying.
                  </Typography>
                )}
              </Box>

              {/* Digital Countdown Timer Display */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h2"
                  fontWeight={800}
                  color={activeSession.status === 'ACTIVE' ? 'primary.main' : 'warning.main'}
                  sx={{ fontFamily: 'monospace', letterSpacing: 2 }}
                >
                  {formatTimer(timerSecondsRemaining)}
                </Typography>

                <Stack direction="row" gap={1.5} justifyContent="center" mt={1}>
                  {activeSession.status === 'ACTIVE' ? (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<PauseIcon />}
                      onClick={handlePauseSession}
                      sx={{ borderRadius: 2, px: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleResumeSession}
                      sx={{ borderRadius: 2, px: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleOpenFinishDialog}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Finish Session
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={handleCancelSession}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Focus Timer card when no server session is active */}
      {!activeSession && selectedItem && !isAllCompleted && (
        <Card
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={3}>
              <Box>
                <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                  <Chip label="Active Focus Timer" size="small" color="primary" sx={{ fontWeight: 600 }} />
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {selectedItem.subject_name}
                  </Typography>
                </Stack>
                <Typography variant="h5" fontWeight={700}>
                  {selectedItem.title || selectedItem.topic_title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Activity: {selectedItem.activity_type.replace(/_/g, ' ')}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h2"
                  fontWeight={800}
                  color="text.primary"
                  sx={{ fontFamily: 'monospace', letterSpacing: 2 }}
                >
                  {formatTimer(selectedItem.duration_minutes * 60)}
                </Typography>

                <Stack direction="row" gap={1.5} justifyContent="center" mt={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleStartSession(selectedItem)}
                    sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
                  >
                    Start Focus
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleToggleCompleted(selectedItem)}
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

      {/* Today's Activity Checklist */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              Today's Personalized Study Routine & Activity Checklist
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Check off tasks, launch focus sessions, or customize your activities.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Add Item
          </Button>
        </Stack>

        {loadingRoutine ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : routine.items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body1" fontWeight={600} color="text.secondary">
              No study activities scheduled for this date.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{ mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Add Your First Activity
            </Button>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {routine.items.map((item) => {
              const isSessionRunningOnItem = activeSession?.plan_item_id === item.id;
              const priorityInfo = PRIORITIES.find((p) => p.value === item.priority) || PRIORITIES[1];

              return (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: isSessionRunningOnItem
                      ? 'rgba(25, 118, 210, 0.06)'
                      : item.is_completed
                      ? 'action.hover'
                      : 'background.paper',
                    border: '1px solid',
                    borderColor: isSessionRunningOnItem
                      ? 'primary.main'
                      : item.is_completed
                      ? 'divider'
                      : 'divider',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.light' },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ flex: 1 }}>
                    <Checkbox
                      checked={item.is_completed}
                      onChange={() => handleToggleCompleted(item)}
                      color="success"
                      sx={{ mt: -0.5 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          sx={{
                            textDecoration: item.is_completed ? 'line-through' : 'none',
                            color: item.is_completed ? 'text.secondary' : 'text.primary',
                          }}
                        >
                          {item.title || item.topic_title}
                        </Typography>

                        {/* Priority Badge */}
                        <Chip
                          icon={<FlagIcon sx={{ fontSize: '12px !important' }} />}
                          label={item.priority || 'MEDIUM'}
                          size="small"
                          color={priorityInfo.color}
                          variant="outlined"
                          sx={{ fontSize: 10, height: 20, fontWeight: 700 }}
                        />

                        {/* Custom vs AI origin */}
                        {item.is_custom ? (
                          <Chip label="Custom" size="small" variant="filled" sx={{ fontSize: 10, height: 18, bgcolor: 'action.selected' }} />
                        ) : (
                          <Chip label="AI Recommended" size="small" variant="outlined" color="primary" sx={{ fontSize: 10, height: 18 }} />
                        )}

                        {/* Status Chip */}
                        <Chip
                          label={item.status || (item.is_completed ? 'COMPLETED' : 'PENDING')}
                          size="small"
                          color={item.is_completed ? 'success' : item.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                          sx={{ fontSize: 10, height: 18, fontWeight: 600 }}
                        />
                      </Stack>

                      {/* Subject & Activity Type Subtitles */}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        <strong>{item.subject_name}</strong> • {item.activity_type.replace(/_/g, ' ')}
                        {item.topic_title !== item.title && ` • ${item.topic_title}`}
                      </Typography>

                      {/* Scheduled Time & Notes */}
                      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" mt={0.5}>
                        {item.start_time && (
                          <Chip
                            label={`${item.start_time}${item.end_time ? ' - ' + item.end_time : ''}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 18 }}
                          />
                        )}
                        {item.time_spent_seconds > 0 && (
                          <Chip
                            icon={<TimerIcon sx={{ fontSize: '12px !important' }} />}
                            label={`${Math.round(item.time_spent_seconds / 60)}m spent`}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 18 }}
                          />
                        )}
                        {item.recommended_resource_url && (
                          <Button
                            href={item.recommended_resource_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                            sx={{ fontSize: 10, p: 0, textTransform: 'none', minWidth: 'auto' }}
                          >
                            Resource
                          </Button>
                        )}
                      </Stack>

                      {item.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                          Note: {item.notes}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {/* Actions Area */}
                  <Stack direction="row" alignItems="center" gap={1} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                    <Chip
                      icon={<TimerIcon fontSize="small" />}
                      label={`${item.duration_minutes}m`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />

                    {!item.is_completed && !activeSession && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleStartSession(item)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: 12, py: 0.5 }}
                      >
                        Start Focus
                      </Button>
                    )}

                    {!item.is_completed && onRescheduleItem && (
                      <Tooltip title="Postpone to tomorrow">
                        <IconButton
                          size="small"
                          onClick={() => onRescheduleItem(item.id)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <ScheduleSendIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    {/* Overflow Menu */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setMenuAnchorEl(e.currentTarget);
                        setMenuTargetItem(item);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Overflow Item Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        {menuTargetItem && (
          <>
            <MenuItem onClick={() => handleOpenEdit(menuTargetItem)}>
              <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit Activity
            </MenuItem>
            <MenuItem onClick={() => handleChangeStatus(menuTargetItem, 'PENDING')}>
              Mark as Pending
            </MenuItem>
            <MenuItem onClick={() => handleChangeStatus(menuTargetItem, 'IN_PROGRESS')}>
              Mark In Progress
            </MenuItem>
            <MenuItem onClick={() => handleChangeStatus(menuTargetItem, 'COMPLETED')}>
              Mark as Completed
            </MenuItem>
            <MenuItem onClick={() => handleChangeStatus(menuTargetItem, 'SKIPPED')}>
              Mark as Skipped
            </MenuItem>
            <MenuItem
              onClick={() => handleDeleteActivity(menuTargetItem.id)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete Activity
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Add / Edit Activity Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingItem ? 'Edit Study Activity' : 'Add Activity to Routine'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <TextField
              label="Subject *"
              size="small"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="e.g. Mathematics, Science, English"
              fullWidth
              required
            />
            <TextField
              label="Topic / Chapter *"
              size="small"
              value={formTopic}
              onChange={(e) => setFormTopic(e.target.value)}
              placeholder="e.g. Real Numbers & Rational Exponents"
              fullWidth
              required
            />
            <TextField
              label="Activity Title (Optional)"
              size="small"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Chapter 1 Practice Quiz"
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Activity Type"
                select
                size="small"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                sx={{ flex: 1 }}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Priority"
                select
                size="small"
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                sx={{ flex: 1 }}
              >
                {PRIORITIES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Duration (Minutes)"
                type="number"
                size="small"
                value={formDuration}
                onChange={(e) => setFormDuration(Math.max(5, parseInt(e.target.value) || 25))}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Scheduled Start Time"
                type="time"
                size="small"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Stack>

            {/* Quick Duration Presets */}
            <Stack direction="row" gap={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Quick Presets:
              </Typography>
              {[15, 25, 45, 60].map((mins) => (
                <Chip
                  key={mins}
                  label={`${mins}m`}
                  size="small"
                  clickable
                  variant={formDuration === mins ? 'filled' : 'outlined'}
                  color={formDuration === mins ? 'primary' : 'default'}
                  onClick={() => setFormDuration(mins)}
                />
              ))}
            </Stack>

            <TextField
              label="Description / Instructions"
              size="small"
              multiline
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Specific exercises, chapter pages, or focus areas..."
              fullWidth
            />
            <TextField
              label="Learning Resource URL (Optional)"
              size="small"
              value={formResourceUrl}
              onChange={(e) => setFormResourceUrl(e.target.value)}
              placeholder="https://..."
              fullWidth
            />
            <TextField
              label="Personal Notes"
              size="small"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Focus on tricky negative exponents"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveActivity} sx={{ fontWeight: 700 }}>
            {editingItem ? 'Update Activity' : 'Add Activity'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finish Session Confirmation Dialog */}
      <Dialog open={openFinishDialog} onClose={() => setOpenFinishDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Finish Study Session</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <Typography variant="body2" color="text.secondary">
              Total session study time: <strong>{formatTimer(timerElapsedSeconds)}</strong>
            </Typography>
            <Stack direction="row" alignItems="center" gap={1}>
              <Checkbox
                checked={finishMarkCompleted}
                onChange={(e) => setFinishMarkCompleted(e.target.checked)}
                color="success"
              />
              <Typography variant="body2" fontWeight={600}>
                Mark activity as completed
              </Typography>
            </Stack>
            <TextField
              label="Study Reflection Notes (Optional)"
              size="small"
              multiline
              rows={3}
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
              placeholder="What did you master? Any doubts to revisit?"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenFinishDialog(false)}>Keep Timer Open</Button>
          <Button variant="contained" color="success" onClick={handleConfirmFinishSession} sx={{ fontWeight: 700 }}>
            Save & Finish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Routine Dialog */}
      <Dialog open={openDuplicateDialog} onClose={() => setOpenDuplicateDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Duplicate Routine</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <Typography variant="body2" color="text.secondary">
              Copy activities from {currentDate} to another date.
            </Typography>
            <TextField
              label="Target Date"
              type="date"
              size="small"
              value={duplicateTargetDate}
              onChange={(e) => setDuplicateTargetDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Stack direction="row" alignItems="center" gap={1}>
              <Checkbox
                checked={includeCompletedInDup}
                onChange={(e) => setIncludeCompletedInDup(e.target.checked)}
              />
              <Typography variant="body2">Include already completed activities</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDuplicateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmDuplicate} sx={{ fontWeight: 700 }}>
            Duplicate Routine
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={openSettings} onClose={() => setOpenSettings(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Study Plan Preferences</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <TextField
              label="Weekday Daily Target (Minutes)"
              type="number"
              size="small"
              value={weekdayMins}
              onChange={(e) => setWeekdayMins(parseInt(e.target.value) || 45)}
              fullWidth
            />
            <TextField
              label="Weekend Daily Target (Minutes)"
              type="number"
              size="small"
              value={weekendMins}
              onChange={(e) => setWeekendMins(parseInt(e.target.value) || 90)}
              fullWidth
            />
            <TextField
              label="Preferred Study Time"
              select
              size="small"
              value={prefTime}
              onChange={(e) => setPrefTime(e.target.value)}
              fullWidth
            >
              <MenuItem value="MORNING">Morning (07:00 AM)</MenuItem>
              <MenuItem value="AFTERNOON">Afternoon (03:00 PM)</MenuItem>
              <MenuItem value="EVENING">Evening (05:30 PM)</MenuItem>
              <MenuItem value="NIGHT">Night (07:30 PM)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenSettings(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSettings} sx={{ fontWeight: 700 }}>
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
