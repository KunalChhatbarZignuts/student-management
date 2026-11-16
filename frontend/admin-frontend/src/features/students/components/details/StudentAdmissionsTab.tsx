'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

export interface StudentAdmissionsTabProps {
  admissionInfo: any;
  personalInfo: any;
}

export default function StudentAdmissionsTab({
  admissionInfo: adm,
  personalInfo: p,
}: StudentAdmissionsTabProps) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Admission Application Information</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Application Number</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{adm?.application_number || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Admission Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={(adm?.status || p.status || 'Active').toUpperCase()} color="success" size="small" />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Admission Date</Typography>
                <Typography variant="body1">{adm?.admission_date || p.admission_date || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                <Typography variant="body1">{adm?.academic_year_name || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Application Submitted</Typography>
                <Typography variant="body2">{adm?.submitted_at ? new Date(adm.submitted_at).toLocaleDateString() : '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Admission Approved</Typography>
                <Typography variant="body2">{adm?.approved_at ? new Date(adm.approved_at).toLocaleDateString() : '—'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Prior School Background</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Previous Institution Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{adm?.previous_school_name || 'No prior school recorded'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Transfer & Academic Notes</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {adm?.previous_school_details || 'No additional previous records or documents attached.'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

