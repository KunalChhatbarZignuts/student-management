'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SchoolIcon from '@mui/icons-material/School';
import PaymentIcon from '@mui/icons-material/Payment';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';

import { SuggestionCard } from '../types';

interface WelcomeCardGridProps {
  studentName?: string;
  suggestions: SuggestionCard[];
  onSelectPrompt: (prompt: string) => void;
}

const DEFAULT_SUGGESTIONS: SuggestionCard[] = [
  {
    id: 'sug-1',
    label: "Today's Timetable",
    prompt: 'What is my timetable today and who is teaching?',
    category: 'TIMETABLE',
    icon: 'Schedule',
  },
  {
    id: 'sug-2',
    label: 'Next Upcoming Class',
    prompt: 'What is my next class right now?',
    category: 'TIMETABLE',
    icon: 'Schedule',
  },
  {
    id: 'sug-3',
    label: 'Attendance Rate',
    prompt: 'What is my current attendance percentage and absence summary?',
    category: 'ATTENDANCE',
    icon: 'CheckCircle',
  },
  {
    id: 'sug-4',
    label: 'Upcoming Exams',
    prompt: 'When is my next examination and what is the schedule?',
    category: 'EXAMS',
    icon: 'Assignment',
  },
  {
    id: 'sug-5',
    label: 'Recent Exam Marks',
    prompt: 'Show my latest published examination marks and report card.',
    category: 'RESULTS',
    icon: 'School',
  },
  {
    id: 'sug-6',
    label: 'School Holidays',
    prompt: 'Is tomorrow a holiday and when is the next school break?',
    category: 'CALENDAR',
    icon: 'Calendar',
  },
  {
    id: 'sug-7',
    label: 'Tuition Fee Balance',
    prompt: 'How much fee is pending and when is the next due date?',
    category: 'FEES',
    icon: 'Payment',
  },
  {
    id: 'sug-8',
    label: 'Science Explainer',
    prompt: "Explain Newton's third law of motion with a real-world example.",
    category: 'ACADEMIC',
    icon: 'AutoAwesome',
  },
];

export default function WelcomeCardGrid({
  studentName,
  suggestions,
  onSelectPrompt,
}: WelcomeCardGridProps) {
  const displayCards = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;

  const renderIcon = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'TIMETABLE':
        return <ScheduleIcon color="primary" fontSize="small" />;
      case 'ATTENDANCE':
        return <CheckCircleOutlineIcon color="success" fontSize="small" />;
      case 'EXAMS':
      case 'RESULTS':
        return <SchoolIcon color="info" fontSize="small" />;
      case 'FEES':
        return <PaymentIcon color="warning" fontSize="small" />;
      case 'CALENDAR':
        return <CalendarMonthIcon color="secondary" fontSize="small" />;
      default:
        return <AutoAwesomeIcon color="primary" fontSize="small" />;
    }
  };

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', py: 4, px: 2 }}>
      {/* Welcome Banner */}
      <Stack spacing={1} textAlign="center" mb={4}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'divider',
            mx: 'auto',
            mb: 1,
          }}
        >
          <SchoolIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          How can I help you today?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 540, mx: 'auto', lineHeight: 1.6 }}>
          Ask about your timetable, attendance, marks, fees, or lessons.
        </Typography>
      </Stack>

      {/* Suggested Questions Grid */}
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
        Common Questions to Get Started:
      </Typography>

      <Grid container spacing={2}>
        {displayCards.map((card) => (
          <Grid item xs={12} sm={6} key={card.id}>
            <Paper
              elevation={0}
              onClick={() => onSelectPrompt(card.prompt)}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.8}>
                {renderIcon(card.category)}
                <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                  {card.label}
                </Typography>
                <Chip
                  label={card.category}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 'auto !important', fontSize: 10, height: 20, borderRadius: 1 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, lineHeight: 1.5 }}>
                "{card.prompt}"
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
