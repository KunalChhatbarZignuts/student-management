'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import HistoryIcon from '@mui/icons-material/History';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { studentOnlineClassApi, studentOnlineClassKeys } from '@/features/online-classroom/api';
import { useOnlineClassroomFeed } from '@/features/online-classroom/useOnlineClassroomFeed';
import StudentClassCard from '@/features/online-classroom/components/StudentClassCard';

export default function StudentOnlineClassroomPage() {
  const router = useRouter();

  // Real-time WebSocket feed subscription
  useOnlineClassroomFeed();

  const [tabIndex, setTabIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [pastPage, setPastPage] = useState(1);
  const pastPageSize = 8;

  const { data, isLoading, error } = useQuery({
    queryKey: studentOnlineClassKeys.list(),
    queryFn: () => studentOnlineClassApi.getClasses(),
  });
  const classes = data?.items || [];

  const liveClasses = classes.filter((c) => c.status === 'LIVE');
  const upcomingClasses = classes.filter((c) => c.status === 'SCHEDULED');
  const pastClasses = classes.filter((c) => c.status === 'COMPLETED' || c.status === 'CANCELLED');

  const activeLiveClass = liveClasses.length > 0 ? liveClasses[0] : null;

  // Search filtering logic
  const filterBySearch = (list: typeof classes) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.teacher_name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  };

  const filteredUpcomingAndLive = filterBySearch([...liveClasses, ...upcomingClasses]);
  const filteredPastClasses = filterBySearch(pastClasses);

  const totalPastPages = Math.ceil(filteredPastClasses.length / pastPageSize);
  const paginatedPastClasses = filteredPastClasses.slice(
    (pastPage - 1) * pastPageSize,
    pastPage * pastPageSize
  );

  return (
    <RequireRole roles={[ROLES.STUDENT]}>
      <AppShell>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VideoCameraFrontIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Online Classroom
              </Typography>
            </Box>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Join live video lectures, collaborate with teachers, and review your completed class history.
          </Typography>
        </Box>

        {/* Live Now Urgent Banner */}
        {activeLiveClass && (
          <Alert
            severity="error"
            icon={<LiveTvIcon fontSize="inherit" />}
            action={
              <Button
                color="inherit"
                size="small"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push(`/online-classroom/${activeLiveClass.id}/join`)}
                sx={{
                  bgcolor: '#d32f2f',
                  color: '#fff',
                  '&:hover': { bgcolor: '#b71c1c' },
                  fontWeight: 700,
                  textTransform: 'none',
                }}
              >
                Join Classroom
              </Button>
            }
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <strong>Class in Session:</strong> &quot;{activeLiveClass.title}&quot; by {activeLiveClass.teacher_name} is LIVE right now!
          </Alert>
        )}

        {/* Metric Stat Cards */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: liveClasses.length > 0 ? 'error.light' : 'action.hover' }}>
                  <LiveTvIcon color={liveClasses.length > 0 ? 'error' : 'action'} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {liveClasses.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Live Right Now
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light' }}>
                  <EventAvailableIcon color="primary" />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {upcomingClasses.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Classes
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <HistoryIcon color="action" />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {pastClasses.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed Classes
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs Bar & Search Input Container */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
            pb: 0.5,
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(_, val) => {
              setTabIndex(val);
              setPastPage(1);
            }}
            aria-label="online classroom tabs"
          >
            <Tab
              label={`Upcoming & Live (${liveClasses.length + upcomingClasses.length})`}
              icon={<LiveTvIcon fontSize="small" />}
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              label={`Past Sessions (${pastClasses.length})`}
              icon={<HistoryIcon fontSize="small" />}
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>

          <TextField
            size="small"
            placeholder="Search title or teacher..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPastPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              width: { xs: '100%', sm: 280 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'background.paper',
              },
            }}
          />
        </Box>

        {/* Loading & Error States */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load online classes. Please try refreshing the page.
          </Alert>
        )}

        {/* Tab Panels */}
        {!isLoading && !error && (
          <>
            {/* Tab 0: Upcoming & Live */}
            {tabIndex === 0 && (
              <Box>
                {filteredUpcomingAndLive.length === 0 ? (
                  <Box
                    sx={{
                      py: 8,
                      textAlign: 'center',
                      bgcolor: 'background.paper',
                      borderRadius: 3,
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <VideoCameraFrontIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      {searchQuery ? 'No Matching Classes Found' : 'No Scheduled Online Classes'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: searchQuery ? 2 : 0 }}>
                      {searchQuery
                        ? `No upcoming classes matched "${searchQuery}".`
                        : 'You have no upcoming or live classes scheduled at this time.'}
                    </Typography>
                    {searchQuery && (
                      <Button size="small" variant="outlined" onClick={() => setSearchQuery('')} sx={{ textTransform: 'none' }}>
                        Clear Search
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {filteredUpcomingAndLive.map((cls) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={cls.id} sx={{ display: 'flex' }}>
                        <StudentClassCard onlineClass={cls} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Tab 1: Past Sessions */}
            {tabIndex === 1 && (
              <Box>
                {filteredPastClasses.length === 0 ? (
                  <Box
                    sx={{
                      py: 8,
                      textAlign: 'center',
                      bgcolor: 'background.paper',
                      borderRadius: 3,
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      {searchQuery ? 'No Matching Past Sessions Found' : 'No Past Sessions'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: searchQuery ? 2 : 0 }}>
                      {searchQuery
                        ? `No completed sessions matched "${searchQuery}".`
                        : 'You have no concluded sessions in your history yet.'}
                    </Typography>
                    {searchQuery && (
                      <Button size="small" variant="outlined" onClick={() => setSearchQuery('')} sx={{ textTransform: 'none' }}>
                        Clear Search
                      </Button>
                    )}
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={2}>
                      {paginatedPastClasses.map((cls) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={cls.id} sx={{ display: 'flex' }}>
                          <StudentClassCard onlineClass={cls} />
                        </Grid>
                      ))}
                    </Grid>

                    {/* Pagination Controls */}
                    {totalPastPages > 1 && (
                      <Box
                        sx={{
                          mt: 4,
                          pt: 2,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 2,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Showing {(pastPage - 1) * pastPageSize + 1}–{Math.min(pastPage * pastPageSize, filteredPastClasses.length)} of {filteredPastClasses.length} completed sessions
                        </Typography>
                        <Pagination
                          count={totalPastPages}
                          page={pastPage}
                          onChange={(_, val) => setPastPage(val)}
                          color="primary"
                          shape="rounded"
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </AppShell>
  </RequireRole>
);
}
