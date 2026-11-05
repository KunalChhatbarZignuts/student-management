'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import { LinkedChildDetail } from '../types';

interface ChildBioTabProps {
  child: LinkedChildDetail;
}

export const ChildBioTab: React.FC<ChildBioTabProps> = ({ child }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Student Bio & Enrollment Record
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">FULL NAME</Typography>
          <Typography variant="body1" fontWeight={600}>
            {child.first_name} {child.last_name}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">STUDENT CODE</Typography>
          <Typography variant="body1" fontWeight={600}>{child.student_code}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">ENROLLMENT NUMBER</Typography>
          <Typography variant="body1" fontWeight={600}>{child.enrollment_number || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">GRADE / CLASS</Typography>
          <Typography variant="body1" fontWeight={600}>{child.class_name}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">SECTION</Typography>
          <Typography variant="body1" fontWeight={600}>{child.section}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">DEPARTMENT</Typography>
          <Typography variant="body1" fontWeight={600}>{child.department || 'General'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">DATE OF BIRTH</Typography>
          <Typography variant="body1" fontWeight={600}>{child.dob ? String(child.dob) : 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">CLASS TEACHER</Typography>
          <Typography variant="body1" fontWeight={600}>{child.class_teacher_name || 'Assigned'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">RELATIONSHIP TYPE</Typography>
          <Typography variant="body1" fontWeight={600}>{child.relationship_type}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">PRIMARY GUARDIAN</Typography>
          <Typography variant="body1" fontWeight={600}>
            {child.is_primary_guardian ? 'Yes (Primary Contact)' : 'Secondary Contact'}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">VERIFICATION STATUS</Typography>
          <Typography variant="body1" fontWeight={600}>{child.verification_status || 'Verified'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="caption" color="text.secondary">LINKED SINCE</Typography>
          <Typography variant="body1" fontWeight={600}>
            {child.linked_at ? new Date(child.linked_at).toLocaleDateString() : 'Active'}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

