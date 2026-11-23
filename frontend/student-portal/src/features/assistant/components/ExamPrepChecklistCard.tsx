'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';

import { ExamPrepPlanResponse } from '../types';

interface ExamPrepChecklistCardProps {
  plan: ExamPrepPlanResponse;
}

export default function ExamPrepChecklistCard({ plan }: ExamPrepChecklistCardProps) {
  const [completedMap, setCompletedMap] = useState<Record<number, boolean>>({});

  const handleToggle = (day: number) => {
    setCompletedMap((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const completedCount = Object.values(completedMap).filter(Boolean).length;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        my: 1.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'warning.light',
        bgcolor: 'background.paper',
        maxWidth: 620,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <EventNoteIcon color="warning" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            {plan.exam_name}
          </Typography>
        </Stack>
        <Chip
          label={`${plan.days_remaining} Days Remaining`}
          size="small"
          color="warning"
          sx={{ fontWeight: 700, fontSize: 11 }}
        />
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Scheduled Date: <strong>{plan.exam_date}</strong> • Completed {completedCount} of {plan.checklist.length} milestones
      </Typography>

      {/* Checklist items */}
      <Stack spacing={1} mb={2}>
        {plan.checklist.map((item) => {
          const isDone = !!completedMap[item.day_number];
          return (
            <Paper
              key={item.day_number}
              variant="outlined"
              onClick={() => handleToggle(item.day_number)}
              sx={{
                p: 1.2,
                borderRadius: 2,
                cursor: 'pointer',
                borderColor: isDone ? 'success.light' : 'divider',
                bgcolor: isDone ? 'action.hover' : 'background.paper',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Checkbox
                size="small"
                checked={isDone}
                onClick={(e) => e.stopPropagation()}
                onChange={() => handleToggle(item.day_number)}
                sx={{ p: 0.5, mr: 1 }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isDone ? 'text.secondary' : 'text.primary',
                  }}
                >
                  Day {item.day_number}: {item.topic_name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={0.2}>
                  <Stack direction="row" spacing={0.3} alignItems="center">
                    <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {item.study_duration_minutes}m
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    • Focus: {item.focus_area}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {/* Strategy Tips */}
      {plan.key_tips && plan.key_tips.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'warning.50',
            border: '1px solid',
            borderColor: 'warning.100',
          }}
        >
          <Stack direction="row" spacing={0.8} alignItems="center" mb={0.5}>
            <TipsAndUpdatesOutlinedIcon color="warning" sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight={800} color="warning.dark">
              Pro Exam Revision Tips
            </Typography>
          </Stack>
          {plan.key_tips.map((tip, idx) => (
            <Typography key={idx} variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.3 }}>
              • {tip}
            </Typography>
          ))}
        </Paper>
      )}
    </Paper>
  );
}
