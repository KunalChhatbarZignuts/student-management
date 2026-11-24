'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CircularProgress from '@mui/material/CircularProgress';

import { Recommendation } from '../types';

interface LearningPathTabProps {
  recommendations: Recommendation[];
  onUpdateStatus: (recId: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NEED_PRACTICE') => Promise<void>;
  onRecalculate: () => Promise<void>;
  onStartPractice: (subjectName: string, topicTitle: string) => void;
}

export default function LearningPathTab({
  recommendations,
  onUpdateStatus,
  onRecalculate,
  onStartPractice,
}: LearningPathTabProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredRecs = recommendations.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const handleStatusChange = async (recId: string, event: SelectChangeEvent) => {
    const newStatus = event.target.value as any;
    setUpdatingId(recId);
    try {
      await onUpdateStatus(recId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRecalculateClick = async () => {
    setIsRecalculating(true);
    try {
      await onRecalculate();
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Header & Controls */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Personalized Academic Learning Path
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-sequenced study topics prioritized based on your weak areas and upcoming examination schedules.
          </Typography>
        </Box>

        <Stack direction="row" gap={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter Status</InputLabel>
            <Select
              value={filterStatus}
              label="Filter Status"
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="ALL">All Items ({recommendations.length})</MenuItem>
              <MenuItem value="NOT_STARTED">Not Started</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="NEED_PRACTICE">Need Practice</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={isRecalculating ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRecalculateClick}
            disabled={isRecalculating}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Recalculate
          </Button>
        </Stack>
      </Stack>

      {/* Recommendations List */}
      <Stack spacing={2}>
        {filteredRecs.map((rec, index) => {
          const isUpdating = updatingId === rec.id;
          return (
            <Paper
              key={rec.id}
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderLeft: '4px solid',
                borderColor: 'divider',
                borderLeftColor:
                  rec.priority === 'HIGH'
                    ? 'error.main'
                    : rec.priority === 'MEDIUM'
                    ? 'warning.main'
                    : 'primary.main',
                transition: 'border-color 150ms ease',
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}>
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                    <Chip
                      label={`#${index + 1}`}
                      size="small"
                      sx={{ fontWeight: 700, bgcolor: 'action.hover' }}
                    />
                    <Chip
                      label={rec.subject_name}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      icon={rec.priority === 'HIGH' ? <PriorityHighIcon /> : undefined}
                      label={`Priority: ${rec.priority}`}
                      color={rec.priority === 'HIGH' ? 'error' : rec.priority === 'MEDIUM' ? 'warning' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: 'text.secondary', ml: 1 }}>
                      <AccessTimeIcon fontSize="small" />
                      <Typography variant="caption">{rec.estimated_minutes} mins</Typography>
                    </Stack>
                  </Stack>

                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {rec.topic_title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 750 }}>
                    {rec.reason}
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'row', sm: 'row' }} alignItems="center" gap={1.5} flexShrink={0}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={rec.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(rec.id, e)}
                      sx={{
                        borderRadius: 2,
                        fontSize: 13,
                        fontWeight: 600,
                        bgcolor:
                          rec.status === 'COMPLETED'
                            ? 'rgba(46, 125, 50, 0.08)'
                            : rec.status === 'IN_PROGRESS'
                            ? 'rgba(25, 118, 210, 0.08)'
                            : 'background.paper',
                      }}
                    >
                      <MenuItem value="NOT_STARTED">Not Started</MenuItem>
                      <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                      <MenuItem value="COMPLETED">Completed</MenuItem>
                      <MenuItem value="NEED_PRACTICE">Need Practice</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onStartPractice(rec.subject_name, rec.topic_title)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Practice
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
