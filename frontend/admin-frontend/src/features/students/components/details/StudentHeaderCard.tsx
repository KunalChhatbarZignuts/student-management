'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';

import StatusChip from '@/components/ui/StatusChip';

export interface StudentHeaderCardProps {
  studentData: any;
  onOpenEdit: () => void;
}

export default function StudentHeaderCard({
  studentData,
  onOpenEdit,
}: StudentHeaderCardProps) {
  const p = studentData.personal_details || studentData.personal_info || {};
  const a = studentData.academic_details || studentData.academic_info || {};
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
              bgcolor: 'primary.main',
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
              {p.first_name} {p.middle_name ? `${p.middle_name} ` : ''}{p.last_name}
            </Typography>
            <StatusChip status={p.user_status} />
            {a?.current_grade && (
              <Chip
                label={`${a.current_grade} - ${a.current_section || 'N/A'}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {p.department && (
              <Chip
                label={p.department}
                color="secondary"
                variant="outlined"
                size="small"
              />
            )}
            {a?.current_academic_year && (
              <Chip
                label={a.current_academic_year}
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Student Code: <strong>{studentData.student_code}</strong> • Enrollment #: <strong>{studentData.enrollment_number || '—'}</strong> • Roll #: <strong>{a?.current_roll_number || '—'}</strong>
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            {p.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 18 }} />
                <span>{p.email}</span>
              </Box>
            )}
            {p.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 18 }} />
                <span>{p.phone}</span>
              </Box>
            )}
            {p.city && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon fontSize="small" sx={{ color: 'primary.main', fontSize: 18 }} />
                <span>{p.city}{p.state ? `, ${p.state}` : ''}</span>
              </Box>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} sm="auto">
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onOpenEdit}
            sx={{ borderRadius: 2 }}
          >
            Edit Profile
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
