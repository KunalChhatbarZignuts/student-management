'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Link from 'next/link';

import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CampaignIcon from '@mui/icons-material/Campaign';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { LinkedChildDetail, ParentNotificationItem } from '@/features/parents/types';

interface ParentChildrenOverviewProps {
  childrenList?: LinkedChildDetail[];
  notifications?: ParentNotificationItem[];
  isLoading: boolean;
  error?: unknown;
}

export const ParentChildrenOverview: React.FC<ParentChildrenOverviewProps> = ({
  childrenList,
  notifications,
  isLoading,
  error,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FamilyRestroomIcon color="primary" /> Linked Children ({childrenList?.length || 0})
        </Typography>
        <Button component={Link} href="/children" variant="text" size="small">
          Manage & View All Details →
        </Button>
      </Box>

      {isLoading ? (
        <Skeleton variant="rounded" height={140} />
      ) : error ? (
        <Alert severity="info">
          No linked student records found. Please contact administration to link your child’s account.
        </Alert>
      ) : !childrenList || childrenList.length === 0 ? (
        <Alert severity="info">
          No student records are currently linked to your guardian account. Please contact the school office.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {childrenList.map((child) => (
            <Grid item xs={12} sm={6} md={4} key={child.student_id || child.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {child.first_name} {child.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Code: {child.student_code}
                      </Typography>
                    </Box>
                    <Chip
                      label={child.status || 'Active'}
                      color={child.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', my: 1 }}>
                    {child.is_primary_guardian && (
                      <Chip
                        icon={<VerifiedUserIcon />}
                        label="Primary"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    <Chip label={child.relationship_type || 'Guardian'} size="small" variant="outlined" />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Class & Section: <strong>{child.class_name} - {child.section}</strong>
                  </Typography>
                  {child.academic_year && (
                    <Typography variant="body2" color="text.secondary">
                      Academic Year: <strong>{child.academic_year}</strong>
                    </Typography>
                  )}
                  {child.class_teacher_name && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Class Teacher: {child.class_teacher_name}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Button
                      component={Link}
                      href="/children"
                      variant="outlined"
                      size="small"
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                    >
                      View Child Records
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* School Announcements & Notifications */}
      {notifications && notifications.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CampaignIcon color="secondary" /> Recent Announcements & Notifications
          </Typography>
          <Grid container spacing={2}>
            {notifications.map((notif) => (
              <Grid item xs={12} md={4} key={notif.id}>
                <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={notif.category} size="small" color="secondary" variant="outlined" />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      {notif.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {notif.message}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

