'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ShieldIcon from '@mui/icons-material/Shield';
import { useRouter } from 'next/navigation';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { ROLES } from '@/lib/constants';
import {
  adminOnlineClassApi,
  onlineClassroomKeys,
  OnlineClass,
} from '@/features/online-classroom/api';
import { useOnlineClassroomFeed } from '@/features/online-classroom/useOnlineClassroomFeed';

export default function AdminOnlineClassroomMonitoringPage() {
  const router = useRouter();

  // Real-time WebSocket feed subscription
  useOnlineClassroomFeed();

  // Observer mode dialog state
  const [selectedClassForObserver, setSelectedClassForObserver] = useState<OnlineClass | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch admin stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: onlineClassroomKeys.adminStats(),
    queryFn: () => adminOnlineClassApi.getStats(),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Fetch admin classes
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: onlineClassroomKeys.adminClasses(),
    queryFn: () => adminOnlineClassApi.listClasses(),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Observer token mutation
  const observerMutation = useMutation({
    mutationFn: (classId: string) => adminOnlineClassApi.getObserverToken(classId),
    onSuccess: (_, classId) => {
      setSelectedClassForObserver(null);
      router.push(`/online-classroom/${classId}/live?mode=observer`);
    },
    onError: (err: any) => {
      setToastMessage(err.response?.data?.detail || 'Failed to connect as observer');
    },
  });

  const classes = classesData?.items || [];

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 4,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <ShieldIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                  Online Classroom Governance & Monitoring
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary">
                Real-time oversight of live virtual classrooms across the school. Join active sessions as an authorized observer.
              </Typography>
            </Box>
          </Box>

          {/* Metric Stats Cards */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (stats?.live_classes || 0) > 0 ? 'error.light' : 'action.hover' }}>
                    <LiveTvIcon color={(stats?.live_classes || 0) > 0 ? 'error' : 'action'} />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {loadingStats ? <CircularProgress size={20} /> : stats?.live_classes ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Live Now (Ongoing)
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light' }}>
                    <EventAvailableIcon color="primary" />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {loadingStats ? <CircularProgress size={20} /> : stats?.upcoming_classes ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upcoming Scheduled
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <HistoryIcon color="action" />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {loadingStats ? <CircularProgress size={20} /> : stats?.completed_classes ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed Sessions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Class Sessions Monitor Table */}
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {loadingClasses ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : classes.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No online classes found in the system.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Class Title</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Teacher (Host)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Participants</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Observer Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classes.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{c.title}</TableCell>
                        <TableCell>{c.teacher_name}</TableCell>
                        <TableCell>
                          {c.scheduled_date} at {c.start_time.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          {c.status === 'LIVE' ? (
                            <Chip
                              icon={<FiberManualRecordIcon sx={{ fontSize: 10, color: '#ff1744 !important' }} />}
                              label={c.live_participants_count && c.live_participants_count > 0 ? `LIVE NOW (${c.live_participants_count})` : 'LIVE NOW'}
                              color="error"
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          ) : c.status === 'SCHEDULED' ? (
                            <Chip label="Scheduled" color="primary" variant="outlined" size="small" />
                          ) : (
                            <Chip label={c.status} size="small" />
                          )}
                        </TableCell>
                        <TableCell>{c.participant_count} enrolled</TableCell>
                        <TableCell align="right">
                          {c.status === 'LIVE' ? (
                            <Button
                              variant="contained"
                              color="warning"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => setSelectedClassForObserver(c)}
                              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                            >
                              Join as Observer
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {c.status === 'COMPLETED'
                                ? 'Completed'
                                : 'Awaiting Live'}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Observer Mode Join Dialog */}
          <Dialog
            open={Boolean(selectedClassForObserver)}
            onClose={() => setSelectedClassForObserver(null)}
            disableRestoreFocus
          >
            {selectedClassForObserver && (
              <>
                <DialogTitle sx={{ fontWeight: 600 }}>Enter Class as Authorized Observer</DialogTitle>
                <DialogContent>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Per school virtual learning guidelines, your entry will be announced to the teacher and students as an authorized observer.
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    You are observing: <strong>{selectedClassForObserver.title}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teacher: {selectedClassForObserver.teacher_name}
                  </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setSelectedClassForObserver(null)} color="inherit">
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    disabled={observerMutation.isPending}
                    onClick={() => observerMutation.mutate(selectedClassForObserver.id)}
                  >
                    {observerMutation.isPending ? 'Connecting...' : 'Proceed to Room'}
                  </Button>
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* Feedback Toast */}
          <Snackbar
            open={Boolean(toastMessage)}
            autoHideDuration={4000}
            onClose={() => setToastMessage(null)}
            message={toastMessage}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}

