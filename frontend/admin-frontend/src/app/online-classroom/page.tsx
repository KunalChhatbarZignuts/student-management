'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';

import { teacherOnlineClassApi, onlineClassroomKeys } from '@/features/online-classroom/api';
import { useOnlineClassroomFeed } from '@/features/online-classroom/useOnlineClassroomFeed';
import OnlineClassroomStatsCards from '@/features/online-classroom/components/OnlineClassroomStatsCards';
import OnlineClassesTable from '@/features/online-classroom/components/OnlineClassesTable';
import ScheduleClassDialog from '@/features/online-classroom/components/ScheduleClassDialog';
import InstantClassDialog from '@/features/online-classroom/components/InstantClassDialog';

export default function OnlineClassroomPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Real-time WebSocket feed subscription
  useOnlineClassroomFeed();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Dialog states
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [instantOpen, setInstantOpen] = useState(false);
  const [cancelClassId, setCancelClassId] = useState<string | null>(null);

  // Fetch stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: onlineClassroomKeys.stats(),
    queryFn: () => teacherOnlineClassApi.getStats(),
  });

  // Fetch class list
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: onlineClassroomKeys.list({ status: statusFilter, search, page }),
    queryFn: () =>
      teacherOnlineClassApi.listClasses({
        status: statusFilter,
        search: search || undefined,
        page,
        size: 20,
      }),
  });

  // Start class mutation
  const startMutation = useMutation({
    mutationFn: (id: string) => teacherOnlineClassApi.startClass(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: onlineClassroomKeys.all });
      router.push(`/online-classroom/${data.id}/live`);
    },
  });

  // Cancel class mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => teacherOnlineClassApi.cancelClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onlineClassroomKeys.all });
      setCancelClassId(null);
    },
  });

  return (
    <RequireRole roles={[ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VideoCameraFrontIcon color="primary" sx={{ fontSize: 36 }} />
                Online Classroom & Virtual Learning
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Schedule, manage, and conduct live interactive video classes with collaborative whiteboard and recording.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="success"
                startIcon={<FlashOnIcon />}
                onClick={() => setInstantOpen(true)}
              >
                Instant Class
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setScheduleOpen(true)}
              >
                Schedule Class
              </Button>
            </Box>
          </Box>

          {/* Stats KPI Cards */}
          <OnlineClassroomStatsCards stats={stats} loading={loadingStats} />

          {/* Search & Filter Bar */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 3,
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              placeholder="Search classes by title, topic, or room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="SCHEDULED">Scheduled</MenuItem>
              <MenuItem value="LIVE">Live Now</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </TextField>
          </Box>

          {/* Classes Table */}
          <OnlineClassesTable
            classes={classesData?.items || []}
            loading={loadingClasses}
            onStartClass={(id) => startMutation.mutate(id)}
            onCancelClass={(id) => setCancelClassId(id)}
          />

          {/* Dialogs */}
          <ScheduleClassDialog
            open={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
            onSuccess={() => {}}
          />

          <InstantClassDialog
            open={instantOpen}
            onClose={() => setInstantOpen(false)}
          />

          <ConfirmDialog
            open={Boolean(cancelClassId)}
            title="Cancel Online Class?"
            description="Are you sure you want to cancel this scheduled class? Participating students will be notified that this session is cancelled."
            confirmLabel="Yes, Cancel Class"
            confirmColor="error"
            loading={cancelMutation.isPending}
            onConfirm={() => cancelClassId && cancelMutation.mutate(cancelClassId)}
            onClose={() => setCancelClassId(null)}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
