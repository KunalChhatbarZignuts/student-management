'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import { ParentProfile } from '@/features/parents/types';
import { User } from '@/features/auth/types';

interface ParentProfileCardProps {
  user: User | null;
  parentProfile?: ParentProfile;
  role?: string;
  onEditClick: () => void;
}

export const ParentProfileCard: React.FC<ParentProfileCardProps> = ({
  user,
  parentProfile,
  role,
  onEditClick,
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
          <PersonIcon sx={{ fontSize: 32 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {parentProfile?.first_name
              ? `${parentProfile.first_name} ${parentProfile.last_name}`
              : user?.parent
              ? `${user.parent.first_name} ${user.parent.last_name}`
              : user?.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Chip label={role || 'PARENT'} color="primary" size="small" sx={{ ml: 'auto', fontWeight: 600 }} />
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
            FIRST NAME
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {parentProfile?.first_name || user?.parent?.first_name || '-'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            LAST NAME
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {parentProfile?.last_name || user?.parent?.last_name || '-'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            PRIMARY PHONE
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {parentProfile?.phone || user?.parent?.phone || 'Not provided'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            TOTAL LINKED CHILDREN
          </Typography>
          <Typography variant="body1" fontWeight={600} color="primary.main">
            {parentProfile?.children_count ?? parentProfile?.children?.length ?? 0}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">
            RESIDENTIAL ADDRESS
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {parentProfile?.address || 'Not provided'}
          </Typography>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={onEditClick}
        >
          Edit Contact Details
        </Button>
      </Box>
    </Paper>
  );
};
