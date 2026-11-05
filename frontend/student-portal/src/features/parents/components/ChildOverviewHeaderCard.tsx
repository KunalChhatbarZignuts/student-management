'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import SchoolIcon from '@mui/icons-material/School';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { LinkedChildDetail } from '../types';

interface ChildOverviewHeaderCardProps {
  child: LinkedChildDetail;
}

export const ChildOverviewHeaderCard: React.FC<ChildOverviewHeaderCardProps> = ({ child }) => {
  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, borderLeft: 6, borderColor: 'primary.main' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'primary.light', color: '#fff' }}>
            <SchoolIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h5" fontWeight={700}>
                {child.first_name} {child.last_name}
              </Typography>
              {child.is_primary_guardian && (
                <Chip
                  icon={<VerifiedUserIcon />}
                  label="Primary Guardian"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              <Chip
                label={child.relationship_type || 'Guardian'}
                size="small"
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={child.status || 'Active'}
                size="small"
                color={child.status === 'active' ? 'success' : 'default'}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Student Code: <strong>{child.student_code}</strong>
              {child.enrollment_number ? ` • Enrollment: ${child.enrollment_number}` : ''}
              {child.academic_year ? ` • Academic Year: ${child.academic_year}` : ''}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography variant="caption" color="text.secondary" display="block">
            CLASS & SECTION
          </Typography>
          <Typography variant="h6" fontWeight={700} color="primary.main">
            {child.class_name} - {child.section}
          </Typography>
          {child.class_teacher_name && (
            <Typography variant="caption" color="text.secondary">
              Teacher: {child.class_teacher_name}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

