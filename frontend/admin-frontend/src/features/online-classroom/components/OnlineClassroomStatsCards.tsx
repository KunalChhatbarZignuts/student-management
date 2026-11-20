import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { OnlineClassStats } from '../types';

interface OnlineClassroomStatsCardsProps {
  stats?: OnlineClassStats;
  loading: boolean;
}

export default function OnlineClassroomStatsCards({ stats, loading }: OnlineClassroomStatsCardsProps) {
  const cards = [
    {
      title: 'Upcoming Classes',
      value: stats?.upcoming_classes ?? 0,
      icon: <UpcomingIcon sx={{ fontSize: 32, color: 'info.main' }} />,
      bgColor: 'info.lighter',
      color: 'info.main',
    },
    {
      title: 'Active Live Classes',
      value: stats?.live_classes ?? 0,
      icon: <VideoCameraFrontIcon sx={{ fontSize: 32, color: 'success.main' }} />,
      bgColor: 'success.lighter',
      color: 'success.main',
    },
    {
      title: 'Completed Classes',
      value: stats?.completed_classes ?? 0,
      icon: <CheckCircleIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
      bgColor: 'primary.lighter',
      color: 'primary.main',
    },
    {
      title: 'Total Participants',
      value: stats?.total_participants ?? 0,
      icon: <PeopleIcon sx={{ fontSize: 32, color: 'warning.main' }} />,
      bgColor: 'warning.lighter',
      color: 'warning.main',
    },
  ];

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      {cards.map((card, idx) => (
        <Grid item xs={12} sm={6} md={3} key={idx}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              boxShadow: (theme) => `0 2px 8px ${theme.palette.divider}`,
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 2 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  mr: 2,
                }}
              >
                {card.icon}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {card.title}
                </Typography>
                {loading ? (
                  <Skeleton width={40} height={32} />
                ) : (
                  <Typography variant="h5" fontWeight={700}>
                    {card.value}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
