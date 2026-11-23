'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeIcon from '@mui/icons-material/Coffee';
import PsychologyIcon from '@mui/icons-material/Psychology';

export const PomodoroStudyBuddy: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Switch mode
      if (mode === 'focus') {
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('focus');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const handleToggleMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (!isOpen) {
    return (
      <Paper
        elevation={4}
        onClick={() => setIsOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
          px: 1.8,
          py: 1,
          borderRadius: 8,
          cursor: 'pointer',
          bgcolor: isRunning ? 'primary.main' : 'background.paper',
          color: isRunning ? '#ffffff' : 'text.primary',
          border: '1.5px solid',
          borderColor: isRunning ? 'primary.main' : 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
      >
        <TimerIcon fontSize="small" sx={{ color: isRunning ? '#ffffff' : 'primary.main' }} />
        <Typography variant="body2" fontWeight={700}>
          {timeFormatted}
        </Typography>
        <Chip
          label={mode === 'focus' ? 'Focus' : 'Break'}
          size="small"
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 800,
            bgcolor: isRunning ? 'rgba(255,255,255,0.2)' : 'action.hover',
            color: isRunning ? '#ffffff' : 'text.primary',
          }}
        />
      </Paper>
    );
  }

  return (
    <Card
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1200,
        width: 290,
        borderRadius: 3.5,
        border: '1.5px solid',
        borderColor: 'primary.light',
        bgcolor: 'background.paper',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TimerIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={800}>
              Study Buddy Timer
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => setIsOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Mode Selector */}
        <Stack direction="row" spacing={0.8} mb={2}>
          <Button
            size="small"
            variant={mode === 'focus' ? 'contained' : 'outlined'}
            startIcon={<PsychologyIcon sx={{ fontSize: 14 }} />}
            onClick={() => handleToggleMode('focus')}
            fullWidth
            sx={{ textTransform: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700 }}
          >
            Focus 25m
          </Button>
          <Button
            size="small"
            variant={mode === 'break' ? 'contained' : 'outlined'}
            color="success"
            startIcon={<CoffeeIcon sx={{ fontSize: 14 }} />}
            onClick={() => handleToggleMode('break')}
            fullWidth
            sx={{ textTransform: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700 }}
          >
            Break 5m
          </Button>
        </Stack>

        {/* Timer Dial */}
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={110}
            thickness={4.5}
            color={mode === 'focus' ? 'primary' : 'success'}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h5" fontWeight={800}>
              {timeFormatted}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {isRunning ? 'IN SESSION' : 'PAUSED'}
            </Typography>
          </Box>
        </Box>

        {/* Action Controls */}
        <Stack direction="row" spacing={1} justifyContent="center" mb={1.5}>
          <Button
            variant="contained"
            color={isRunning ? 'warning' : 'primary'}
            startIcon={isRunning ? <PauseIcon /> : <PlayArrowIcon />}
            onClick={() => setIsRunning(!isRunning)}
            sx={{ borderRadius: 2.5, px: 2.5, fontWeight: 700 }}
          >
            {isRunning ? 'Pause' : 'Start Focus'}
          </Button>
          <Tooltip title="Reset Timer">
            <IconButton onClick={handleReset} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
          {mode === 'focus'
            ? '💡 Focus on one concept at a time. No multitasking.'
            : '🌿 Take a stretch, sip water, and rest your eyes.'}
        </Typography>
      </CardContent>
    </Card>
  );
};
