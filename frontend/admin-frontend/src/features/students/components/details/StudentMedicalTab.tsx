'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import BadgeIcon from '@mui/icons-material/Badge';
import SecurityIcon from '@mui/icons-material/Security';
import EditIcon from '@mui/icons-material/Edit';

export interface StudentMedicalTabProps {
  personalInfo: any;
  onOpenEdit?: () => void;
}

export default function StudentMedicalTab({ personalInfo: p, onOpenEdit }: StudentMedicalTabProps) {
  const hasAllergies = Boolean(p.allergies && p.allergies.trim());
  const hasMedicalConditions = Boolean(p.medical_conditions && p.medical_conditions.trim());
  const hasEmergencyContact = Boolean(p.emergency_contact_name || p.emergency_contact_phone);
  const hasAuthorizedPickup = Boolean(p.authorized_pickup_info && p.authorized_pickup_info.trim());

  return (
    <Grid container spacing={3}>
      {/* Allergy & Health Critical Banner */}
      {hasAllergies && (
        <Grid item xs={12}>
          <Alert
            severity="warning"
            icon={<WarningAmberIcon fontSize="inherit" />}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              border: '1px solid #ed6c02',
              backgroundColor: '#fff4e5',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              CRITICAL HEALTH ALERT: Documented Allergies
            </Typography>
            <Typography variant="body2">{p.allergies}</Typography>
          </Alert>
        </Grid>
      )}

      {/* Primary Medical Details Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <MedicalServicesIcon color="error" fontSize="small" /> Medical Profile & Blood Registry
              </Typography>
              {onOpenEdit && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={onOpenEdit}
                  sx={{ textTransform: 'none', borderRadius: 1.5 }}
                >
                  Edit
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Blood Group
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {p.blood_group ? (
                    <Chip
                      label={p.blood_group}
                      color="error"
                      variant="filled"
                      size="small"
                      sx={{ fontWeight: 700, px: 1 }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not Recorded
                    </Typography>
                  )}
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Health Record Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={hasAllergies || hasMedicalConditions ? 'Special Attention' : 'Standard'}
                    color={hasAllergies || hasMedicalConditions ? 'warning' : 'success'}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Known Allergies & Adverse Reactions
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: hasAllergies ? 600 : 400,
                    color: hasAllergies ? 'warning.dark' : 'text.secondary',
                    mt: 0.5,
                  }}
                >
                  {p.allergies || 'No known allergies reported.'}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Chronic Conditions / Medical Care Plan
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    mt: 0.5,
                    whiteSpace: 'pre-line',
                    color: hasMedicalConditions ? 'text.primary' : 'text.secondary',
                  }}
                >
                  {p.medical_conditions || 'No ongoing chronic conditions or medication instructions documented.'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Emergency Contacts & Authorized Pickup Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <SecurityIcon color="primary" fontSize="small" /> Emergency Response & Authorized Pickup
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {/* Emergency Contact Name */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Emergency Contact Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {p.emergency_contact_name || p.guardian_name || '—'}
                </Typography>
              </Grid>

              {/* Emergency Contact Phone */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Emergency Hotline / Phone
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {p.emergency_contact_phone || p.guardian_phone ? (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<PhoneInTalkIcon />}
                      href={`tel:${p.emergency_contact_phone || p.guardian_phone}`}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {p.emergency_contact_phone || p.guardian_phone}
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No emergency phone specified
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* Authorized Pickup List */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BadgeIcon fontSize="small" /> Authorized Dismissal & Pickup Registry
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-line',
                      color: hasAuthorizedPickup ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {p.authorized_pickup_info ||
                      'Only verified primary parents and registered guardians are authorized for campus pickup.'}
                  </Typography>
                </Box>
              </Grid>

              {/* Quick Guidance Note */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Security Protocol: Persons not documented on this registry or registered in the Parent portal
                  will be required to provide photo identification and receive admin clearance before student dismissal.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

