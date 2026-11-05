'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Link from 'next/link';

import PersonIcon from '@mui/icons-material/Person';
import GradeIcon from '@mui/icons-material/Grade';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScheduleIcon from '@mui/icons-material/Schedule';

interface DashboardQuickNavigationProps {
  isParent: boolean;
}

export const DashboardQuickNavigation: React.FC<DashboardQuickNavigationProps> = ({ isParent }) => {
  return (
    <>
      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 2 }}>
        Quick Navigation
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <PersonIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                My Profile
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                View personal records, contact information, and manage account security.
              </Typography>
              <Button component={Link} href="/profile" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                Open Profile →
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <GradeIcon color="secondary" sx={{ fontSize: 32 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Marks & Performance
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                Check term reports, graded assessments, and academic transcripts.
              </Typography>
              <Button component={Link} href="/marks" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                View Marks →
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <EventAvailableIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Attendance Records
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                Review month-by-month presence, leaves, and absence logs.
              </Typography>
              <Button component={Link} href="/attendance" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                View Attendance →
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {isParent ? (
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                <PaymentsIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Fees & Invoices
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Inspect tuition fee schedules, payment receipts, and balance dues.
                </Typography>
                <Button component={Link} href="/fees" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                  Check Fees →
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                <ScheduleIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Class Timetable
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Review weekly class schedules, timings, and teachers.
                </Typography>
                <Button component={Link} href="/timetable" size="small" variant="text" sx={{ alignSelf: 'flex-start' }}>
                  View Timetable →
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </>
  );
};

