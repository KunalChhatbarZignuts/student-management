'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import BadgeIcon from '@mui/icons-material/Badge';
import SchoolIcon from '@mui/icons-material/School';

import StatusChip from '@/components/ui/StatusChip';

export interface TeacherHeaderCardProps {
  teacherData: any;
}

export default function TeacherHeaderCard({ teacherData }: TeacherHeaderCardProps) {
  const p = teacherData.profile || {};
  const wl = teacherData.workload || teacherData.workload_summary || {};
  const ct = teacherData.class_teacher_role || teacherData.class_teacher_assignment || {};
  const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: { xs: 2.5, md: 3 },
        mb: 3,
        borderRadius: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} sm="auto">
          <Avatar
            src={p.profile_photo || undefined}
            sx={{
              width: { xs: 72, md: 96 },
              height: { xs: 72, md: 96 },
              bgcolor: 'success.main',
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 700,
              boxShadow: 2,
            }}
          >
            {initials}
          </Avatar>
        </Grid>

        <Grid item xs={12} sm>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              {p.first_name} {p.last_name}
            </Typography>
            <StatusChip status={p.user_status} />
            <Chip
              icon={<BusinessIcon fontSize="small" />}
              label={p.department || 'Faculty'}
              color="primary"
              variant="outlined"
              size="small"
            />
            {ct && (
              <Chip
                icon={<SchoolIcon fontSize="small" />}
                label={`Class Teacher: ${ct.grade_name} - ${ct.section_name}`}
                color="secondary"
                size="small"
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Employee Code: <strong>{p.employee_code}</strong> • Faculty Member since <strong>{new Date(p.created_at).toLocaleDateString()}</strong>
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            {p.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailIcon fontSize="small" sx={{ color: 'success.main', fontSize: 18 }} />
                <span>{p.email}</span>
              </Box>
            )}
            {p.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon fontSize="small" sx={{ color: 'success.main', fontSize: 18 }} />
                <span>{p.phone}</span>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <BadgeIcon fontSize="small" sx={{ color: 'success.main', fontSize: 18 }} />
              <span>Weekly Workload: <strong>{wl?.total_weekly_periods || 0} periods</strong></span>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}
