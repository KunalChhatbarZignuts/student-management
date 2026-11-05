'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import { TimetableDetail } from '../types';
import { LinkedChildDetail } from '@/features/parents/types';

interface ClassInfoCardsProps {
  isParent: boolean;
  timetableData?: TimetableDetail;
  selectedChild?: LinkedChildDetail;
}

export const ClassInfoCards: React.FC<ClassInfoCardsProps> = ({
  isParent,
  timetableData,
  selectedChild,
}) => {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={4}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary">
              {isParent ? 'Student & Class' : 'Your Enrolled Class'}
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {timetableData?.grade_name || selectedChild?.class_name || 'Class'}
              {timetableData?.section_name || selectedChild?.section
                ? ` - ${timetableData?.section_name || selectedChild?.section}`
                : ''}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary">
              Academic Shift
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {timetableData?.shift_name || 'Standard Shift'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={
                  timetableData?.status === 'published'
                    ? `Official Timetable (v${timetableData.version || 1})`
                    : 'Active Schedule'
                }
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

