'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';

import BadgeIcon from '@mui/icons-material/Badge';
import SchoolIcon from '@mui/icons-material/School';

export interface TeacherOverviewTabProps {
  profile: any;
  workload: any;
  classTeacherAssignment: any;
}

export default function TeacherOverviewTab({
  profile: p,
  workload: wl,
  classTeacherAssignment: ct,
}: TeacherOverviewTabProps) {
  return (
    <Grid container spacing={3}>
      {/* Workload Metric Cards */}
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Assigned Subjects</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {wl?.total_assigned_subjects || 0}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Assigned Sections</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {wl?.total_assigned_sections || 0}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Weekly Teaching Periods</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                {wl?.total_weekly_periods || 0}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Class Teacher Role</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {ct ? `${ct.grade_name} (${ct.section_name})` : 'None Assigned'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Professional Details Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BadgeIcon color="primary" fontSize="small" /> Professional Identification
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Employee Code</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{p.employee_code}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Department / Faculty</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.department}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Official Email</Typography>
                <Typography variant="body1">{p.email || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                <Typography variant="body1">{p.phone || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Account Active</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={p.is_active ? 'ACTIVE' : 'INACTIVE'} color={p.is_active ? 'success' : 'error'} size="small" />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Joined Date</Typography>
                <Typography variant="body1">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Class Teacher Duties Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon color="primary" fontSize="small" /> Class Teacher Responsibilities
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {ct ? (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Assigned Grade</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{ct.grade_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Assigned Section</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{ct.section_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                  <Typography variant="body1">{ct.academic_year_name || 'Current Year'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Designation</Typography>
                  <Typography variant="body1">{ct.role}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="success" sx={{ mt: 1 }}>
                    This teacher has full Class Teacher oversight, including reviewing and approving student leave applications for this section.
                  </Alert>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  This faculty member is not currently assigned as a primary Class Teacher for any section.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

