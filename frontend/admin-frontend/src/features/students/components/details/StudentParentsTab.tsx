'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

export interface StudentParentsTabProps {
  parents: any[];
}

export default function StudentParentsTab({ parents }: StudentParentsTabProps) {
  if (!parents || parents.length === 0) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info">No linked parent or guardian accounts found for this student.</Alert>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {parents.map((parent) => (
        <Grid item xs={12} sm={6} md={4} key={parent.id}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', position: 'relative' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 44, height: 44 }}>
                  {parent.first_name?.[0] || 'P'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {parent.first_name} {parent.last_name}
                  </Typography>
                  <Chip label={parent.relationship} size="small" color="primary" variant="outlined" />
                </Box>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1} sx={{ fontSize: '0.875rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 18 }} />
                  <span>{parent.phone || '—'}</span>
                </Box>
                {parent.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <span>{parent.email}</span>
                  </Box>
                )}
              </Stack>
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {parent.is_primary_contact && <Chip label="Primary Contact" color="success" size="small" />}
                {parent.is_emergency_contact && <Chip label="Emergency Contact" color="error" size="small" />}
                {parent.can_pickup && <Chip label="Pickup Authorized" variant="outlined" size="small" />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

