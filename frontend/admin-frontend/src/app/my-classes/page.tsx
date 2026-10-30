'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useQuery } from '@tanstack/react-query';

import ClassIcon from '@mui/icons-material/Class';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { teacherPortalApi } from '@/features/teacher-portal/api';

export default function MyClassesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher', 'classes'],
    queryFn: teacherPortalApi.getMyClasses,
  });

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <AppShell>
        <Box sx={{ maxWidth: 880, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Classes & Teaching Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review assigned classes, enrolled student rosters, and sections for the active academic term.
            </Typography>
          </Box>

          {error && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No assigned teaching sections found. Please consult the academic coordinator.
            </Alert>
          )}

          {isLoading ? (
            <Grid container spacing={3}>
              {[1, 2].map((i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Skeleton variant="rounded" height={160} />
                </Grid>
              ))}
            </Grid>
          ) : !data?.classes || data.classes.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <ClassIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                No Classes Assigned
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You do not currently have any active classrooms assigned.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {data.classes.map((cls, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
                            <ClassIcon fontSize="small" />
                          </Box>
                          <Typography variant="h6" fontWeight={700}>
                            {cls.class_name}
                          </Typography>
                        </Box>
                        <Chip label={`Section ${cls.section}`} color="primary" size="small" />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleAltIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Enrolled Students: <strong>{cls.student_count}</strong>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}

