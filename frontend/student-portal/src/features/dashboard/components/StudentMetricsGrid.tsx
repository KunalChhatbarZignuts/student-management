'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';

import SchoolIcon from '@mui/icons-material/School';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GradeIcon from '@mui/icons-material/Grade';

import { StudentResponse } from '@/features/students/types';
import { AttendanceSummary } from '@/features/academic/api';

interface StudentMetricsGridProps {
  student?: StudentResponse;
  attendance?: AttendanceSummary;
  isLoading: boolean;
  error?: unknown;
}

export const StudentMetricsGrid: React.FC<StudentMetricsGridProps> = ({
  student,
  attendance,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={4} key={i}>
            <Skeleton variant="rounded" height={130} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        Profile details will appear here once your enrollment is finalized by administration.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
              <SchoolIcon />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                ENROLLMENT & CLASS
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {student?.enrollment_number || student?.student_code || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {student?.current_grade || student?.class_name || 'Assigned'} - Section{' '}
                {student?.current_section || student?.section || 'A'}
              </Typography>
              {student?.class_teacher_name && (
                <Typography variant="caption" color="primary.main" display="block">
                  Class Teacher: {student.class_teacher_name}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.main', color: '#fff' }}>
              <EventAvailableIcon />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                ATTENDANCE RATE
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {attendance ? `${attendance.percentage}%` : 'Loading...'}
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight={500}>
                Good standing
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.dark', color: '#fff' }}>
              <GradeIcon />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                CURRENT TERM
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                Term 1 (2026-2027)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Department: {student?.department || 'General'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

