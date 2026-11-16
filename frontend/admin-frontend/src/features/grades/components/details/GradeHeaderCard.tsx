'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';

import StatusChip from '@/components/ui/StatusChip';
import { GradeDetail } from '@/features/grades/types';

export interface GradeHeaderCardProps {
  grade: GradeDetail;
  onAddSection: () => void;
}

export default function GradeHeaderCard({
  grade,
  onAddSection,
}: GradeHeaderCardProps) {
  return (
    <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }} elevation={0} variant="outlined">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography variant="h4" fontWeight={700}>
              {grade.name}
            </Typography>
            <Chip label={grade.code || 'NO-CODE'} variant="outlined" size="small" />
            <StatusChip status={grade.status} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {grade.description || 'No description provided.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Academic Year
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {grade.academic_year_name || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Level
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {grade.level}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Grade Coordinator
              </Typography>
              <Typography variant="body2" fontWeight={600} color={grade.coordinator_name ? 'text.primary' : 'text.secondary'}>
                {grade.coordinator_name || 'Not Assigned'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Total Sections
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {grade.sections?.length || 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Total Students
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {grade.total_students || 0}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddSection}
        >
          Add Section
        </Button>
      </Box>
    </Paper>
  );
}

