'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import PersonIcon from '@mui/icons-material/Person';
import { StudentResponse } from '../types';
import { User } from '@/features/auth/types';

interface StudentProfileCardProps {
  user: User | null;
  student?: StudentResponse;
  role?: string;
}

export const StudentProfileCard: React.FC<StudentProfileCardProps> = ({
  user,
  student,
  role,
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
          <PersonIcon sx={{ fontSize: 32 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {student?.first_name
              ? `${student.first_name} ${student.last_name}`
              : user?.student
              ? `${user.student.first_name} ${user.student.last_name}`
              : user?.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Chip label={role || 'STUDENT'} color="primary" size="small" sx={{ ml: 'auto', fontWeight: 600 }} />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            ACCOUNT STATUS
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {user?.status || 'ACTIVE'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            LAST SIGN IN
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {user?.last_login_at
              ? new Date(user.last_login_at).toLocaleString()
              : 'Current session'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            ENROLLMENT NUMBER
          </Typography>
          <Typography variant="body1" fontWeight={700} color="primary.main">
            {student?.enrollment_number || user?.student?.enrollment_number || 'Pending'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            STUDENT CODE / ID
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {student?.student_code || user?.student?.student_code || 'Pending'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            ACADEMIC YEAR
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {student?.current_academic_year || '2026-2027'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            GRADE & SECTION
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {student?.current_grade || student?.class_name || 'N/A'} - Section {student?.current_section || student?.section || 'A'}
          </Typography>
        </Grid>

        {student?.class_teacher_name && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              CLASS TEACHER
            </Typography>
            <Typography variant="body1" fontWeight={600} color="secondary.main">
              {student.class_teacher_name}
            </Typography>
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            DEPARTMENT
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {student?.department || user?.student?.department || 'General'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            DATE OF BIRTH
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {student?.dob || user?.student?.dob || 'N/A'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            GUARDIAN NAME
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {student?.guardian_name || user?.student?.guardian_name || 'Not provided'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            GUARDIAN PHONE
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {student?.guardian_phone || user?.student?.guardian_phone || 'Not provided'}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};
