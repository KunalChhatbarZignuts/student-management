'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { DailyChallengeResponse } from '../types';

interface DailyChallengeCardProps {
  challenge: DailyChallengeResponse;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({ challenge }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [streakCount, setStreakCount] = useState(1);

  // Load and update streak from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedCount = localStorage.getItem('student_daily_streak_count');
      if (storedCount) {
        setStreakCount(parseInt(storedCount, 10));
      }
    } catch (e) {
      console.warn('Could not read streak:', e);
    }
  }, []);

  const handleSubmit = () => {
    if (selectedIdx === null) return;
    setIsSubmitted(true);

    if (selectedIdx === challenge.correct_option_index) {
      const newStreak = streakCount + 1;
      setStreakCount(newStreak);
      try {
        localStorage.setItem('student_daily_streak_count', newStreak.toString());
      } catch (e) {
        console.warn('Could not save streak:', e);
      }
    }
  };

  const isCorrect = isSubmitted && selectedIdx === challenge.correct_option_index;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: '1.5px solid',
        borderColor: isSubmitted ? (isCorrect ? 'success.main' : 'error.main') : 'primary.light',
        bgcolor: 'background.paper',
        maxWidth: 620,
        my: 1.5,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalFireDepartmentIcon sx={{ color: '#ff6d00' }} fontSize="small" />
            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
              1-Minute Daily Challenge
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.8} alignItems="center">
            <Chip
              label={`${challenge.subject} • ${challenge.topic}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
            <Chip
              icon={<LocalFireDepartmentIcon style={{ color: '#ff6d00', fontSize: 14 }} />}
              label={`${streakCount} Day Streak`}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: 11,
                bgcolor: '#fff3e0',
                color: '#e65100',
              }}
            />
          </Stack>
        </Stack>

        {/* Question Text */}
        <Typography variant="body2" fontWeight={700} color="text.primary" mb={2}>
          {challenge.question_text}
        </Typography>

        {/* Options */}
        <RadioGroup
          value={selectedIdx !== null ? selectedIdx.toString() : ''}
          onChange={(e) => !isSubmitted && setSelectedIdx(parseInt(e.target.value, 10))}
        >
          <Stack spacing={1} mb={2}>
            {challenge.options.map((opt, idx) => {
              const isOptionCorrect = isSubmitted && idx === challenge.correct_option_index;
              const isOptionWrong = isSubmitted && selectedIdx === idx && idx !== challenge.correct_option_index;

              return (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    px: 1.5,
                    py: 0.8,
                    borderRadius: 2,
                    cursor: isSubmitted ? 'default' : 'pointer',
                    borderColor: isOptionCorrect ? 'success.main' : isOptionWrong ? 'error.main' : 'divider',
                    bgcolor: isOptionCorrect ? 'success.50' : isOptionWrong ? 'error.50' : 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => !isSubmitted && setSelectedIdx(idx)}
                >
                  <FormControlLabel
                    value={idx.toString()}
                    control={<Radio size="small" disabled={isSubmitted} />}
                    label={<Typography variant="body2">{opt}</Typography>}
                    sx={{ width: '100%', m: 0 }}
                  />
                  {isOptionCorrect && <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />}
                  {isOptionWrong && <CancelIcon color="error" sx={{ fontSize: 18 }} />}
                </Paper>
              );
            })}
          </Stack>
        </RadioGroup>

        {/* Actions & Feedback */}
        {!isSubmitted ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Button
              size="small"
              startIcon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
              onClick={() => setShowHint(!showHint)}
              sx={{ textTransform: 'none', fontSize: 12 }}
            >
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </Button>

            <Button
              variant="contained"
              size="small"
              disabled={selectedIdx === null}
              onClick={handleSubmit}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Submit Answer
            </Button>
          </Stack>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isCorrect ? 'success.50' : 'info.50',
              borderColor: isCorrect ? 'success.light' : 'info.light',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              {isCorrect ? <EmojiEventsIcon color="success" /> : <HelpOutlineIcon color="info" />}
              <Typography variant="subtitle2" fontWeight={800} color={isCorrect ? 'success.dark' : 'info.dark'}>
                {isCorrect ? 'Correct! Streak +1 🔥' : 'Good try! Here is the explanation:'}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {challenge.explanation}
            </Typography>
          </Paper>
        )}

        {/* Hint Accordion */}
        <Collapse in={showHint && !isSubmitted}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              mt: 1.5,
              borderStyle: 'dashed',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              💡 <strong>Hint</strong>: {challenge.hint}
            </Typography>
          </Paper>
        </Collapse>
      </CardContent>
    </Card>
  );
};
