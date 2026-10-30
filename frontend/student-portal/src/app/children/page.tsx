'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';

import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { useMyChildren } from '@/features/parents/hooks';
import { ROLES } from '@/lib/constants';

export default function ChildrenPage() {
  const { data: children, isLoading, error } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);

  const activeChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  return (
    <RequireRole roles={[ROLES.PARENT]}>
      <AppShell>
        <Box sx={{ maxWidth: 880, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Children
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review enrollment records, academic classes, and student details for your children.
            </Typography>
          </Box>

          {isLoading ? (
            <Skeleton variant="rounded" height={280} />
          ) : error ? (
            <Alert severity="error">
              Unable to load linked child records. Please try again later.
            </Alert>
          ) : !children || children.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                No Linked Children Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No student accounts have been linked to this guardian profile yet. Please reach out to the school administrative office.
              </Typography>
            </Paper>
          ) : (
            <>
              {children.length > 1 && (
                <Tabs
                  value={selectedChildIndex}
                  onChange={(_, val) => setSelectedChildIndex(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  {children.map((child, idx) => (
                    <Tab
                      key={child.id}
                      label={`${child.first_name} ${child.last_name}`}
                      icon={<PersonIcon />}
                      iconPosition="start"
                    />
                  ))}
                </Tabs>
              )}

              {activeChild && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: '#fff' }}>
                      <SchoolIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {activeChild.first_name} {activeChild.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Student ID: <strong>{activeChild.student_code}</strong>
                      </Typography>
                    </Box>
                    <Chip label={activeChild.status} color="success" size="small" sx={{ ml: 'auto' }} />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        CLASS & SECTION
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {activeChild.class_name} ({activeChild.section})
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        DEPARTMENT
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {activeChild.department}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        DATE OF BIRTH
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {activeChild.dob}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        ADMISSION DATE
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {activeChild.admission_date}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        GUARDIAN NAME RECORDED
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {activeChild.guardian_name || 'N/A'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        EMERGENCY CONTACT PHONE
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {activeChild.guardian_phone || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
