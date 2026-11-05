'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export interface StudentOverviewTabProps {
  personalInfo: any;
}

export default function StudentOverviewTab({ personalInfo: p }: StudentOverviewTabProps) {
  return (
    <Grid container spacing={3}>
      {/* Personal Demographics */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" fontSize="small" /> Personal Demographics
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">First Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.first_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Middle Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.middle_name || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Last Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.last_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.dob}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Gender</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.gender || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Department / Stream</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.department || 'General'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Primary Phone</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.phone || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Alternate Phone</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.alternate_phone || '—'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Residential & Account Information */}
      <Grid item xs={12} md={6}>
        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon color="primary" fontSize="small" /> Residential Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Street Address</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.address || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">City</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.city || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">State / Province</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.state || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Country</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.country || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Postal Code</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{p.postal_code || '—'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthIcon color="primary" fontSize="small" /> User Account & System Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Email</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.email || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={(p.user_status || 'active').toUpperCase()} size="small" color={p.user_status === 'active' ? 'success' : 'default'} />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Password Policy</Typography>
                  <Typography variant="body2">{p.must_change_password ? 'Must Change Password on Login' : 'Standard Password Set'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Profile Created</Typography>
                  <Typography variant="body2">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
}

