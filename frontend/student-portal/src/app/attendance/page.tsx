'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import { useQuery } from '@tanstack/react-query';

import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';

interface AttendanceSummary {
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  excusedAbsences: number;
}

// Ready to connect to backend endpoint when available
async function fetchAttendance(): Promise<AttendanceSummary> {
  return {
    totalClasses: 142,
    attendedClasses: 137,
    percentage: 96.5,
    excusedAbsences: 3,
  };
}

export default function AttendancePage() {
  const { data: attendance } = useQuery({
    queryKey: ['academic', 'attendance'],
    queryFn: fetchAttendance,
  });

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 880, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Attendance Record
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Academic term attendance summary and monthly presence tracking.
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    OVERALL PERCENTAGE
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {attendance?.percentage || 0}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={attendance?.percentage || 0}
                    color="primary"
                    sx={{ height: 8, borderRadius: 4, mt: 1.5 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    CLASSES ATTENDED
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {attendance?.attendedClasses} / {attendance?.totalClasses}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Session 2026-2027
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    EXCUSED ABSENCES
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="secondary.main">
                    {attendance?.excusedAbsences}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Medical & official leave granted
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <EventAvailableIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Attendance Policy Notice
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              A minimum threshold of 85% attendance across all registered courses is mandatory for exam qualification.
              Any discrepancies should be reported to your class tutor.
            </Typography>
          </Paper>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
