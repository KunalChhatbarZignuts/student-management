import * as React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventUpcomingIcon from '@mui/icons-material/EventAvailable';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PublishIcon from '@mui/icons-material/Publish';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PeopleIcon from '@mui/icons-material/People';

import { ExaminationDashboardMetrics } from '../types';

interface Props {
  metrics?: ExaminationDashboardMetrics | null;
  isLoading?: boolean;
}

export const ExaminationDashboardCards: React.FC<Props> = ({ metrics, isLoading }) => {
  const cards = [
    {
      title: 'Total Examinations',
      value: metrics?.total_examinations ?? 0,
      icon: <AssignmentIcon sx={{ color: '#1976d2', fontSize: 32 }} />,
      bgColor: '#e3f2fd',
      borderColor: '#90caf9',
    },
    {
      title: 'Upcoming Exams',
      value: metrics?.upcoming_examinations ?? 0,
      icon: <EventUpcomingIcon sx={{ color: '#0288d1', fontSize: 32 }} />,
      bgColor: '#e1f5fe',
      borderColor: '#81d4fa',
    },
    {
      title: 'Ongoing Sessions',
      value: metrics?.ongoing_examinations ?? 0,
      icon: <PlayCircleOutlineIcon sx={{ color: '#ed6c02', fontSize: 32 }} />,
      bgColor: '#fff3e0',
      borderColor: '#ffcc80',
    },
    {
      title: 'Completed Exams',
      value: metrics?.completed_examinations ?? 0,
      icon: <CheckCircleOutlineIcon sx={{ color: '#2e7d32', fontSize: 32 }} />,
      bgColor: '#e8f5e9',
      borderColor: '#a5d6a7',
    },
    {
      title: 'Results Pending',
      value: metrics?.results_pending ?? 0,
      icon: <HourglassEmptyIcon sx={{ color: '#9c27b0', fontSize: 32 }} />,
      bgColor: '#f3e5f5',
      borderColor: '#ce93d8',
    },
    {
      title: 'Published Results',
      value: metrics?.published_results ?? 0,
      icon: <PublishIcon sx={{ color: '#00796b', fontSize: 32 }} />,
      bgColor: '#e0f2f1',
      borderColor: '#80cbc4',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((c, i) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              borderColor: c.borderColor,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: c.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {c.icon}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {c.title}
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {isLoading ? '—' : c.value}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

