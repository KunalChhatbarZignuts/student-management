'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ChatIcon from '@mui/icons-material/Chat';
import PanToolIcon from '@mui/icons-material/PanTool';
import SchoolIcon from '@mui/icons-material/School';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { studentOnlineClassApi, studentOnlineClassKeys } from '@/features/online-classroom/api';

export default function PreJoinClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const { data: preJoin, isLoading, error } = useQuery({
    queryKey: studentOnlineClassKeys.preJoin(classId),
    queryFn: () => studentOnlineClassApi.getPreJoinInfo(classId),
    enabled: Boolean(classId),
  });

  const [testedAudio, setTestedAudio] = useState(false);

  const handleTestAudio = () => {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio test fallback
    }
    setTestedAudio(true);
  };

  const handleEnterLiveClass = () => {
    sessionStorage.setItem('preferred_mic', 'false');
    sessionStorage.setItem('preferred_cam', 'false');
    router.push(`/online-classroom/${classId}/live`);
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !preJoin) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: '#f8fafc' }}>
        <Card sx={{ maxWidth: 480, width: '100%', p: 2, borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load classroom details or you are not authorized to attend this session.
            </Alert>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push('/online-classroom')}>
              Back to Online Classroom
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Blocked state (Class not in session or student not allowed)
  if (!preJoin.can_join) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: '#f8fafc' }}>
        <Card sx={{ maxWidth: 540, width: '100%', borderRadius: 4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: '#fee2e2', color: '#ef4444', mx: 'auto', mb: 2 }}>
              <BlockIcon sx={{ fontSize: 36 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Cannot Join Classroom
            </Typography>
            <Chip label={preJoin.status} size="small" color="default" sx={{ mb: 2 }} />
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left', borderRadius: 2 }}>
              {preJoin.block_reason || 'This class is not currently open for entry. Please check the scheduled start time.'}
            </Alert>
            <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2, mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {preJoin.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Teacher: {preJoin.teacher_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scheduled: {preJoin.scheduled_date} at {preJoin.start_time.slice(0, 5)}
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => router.push('/online-classroom')} sx={{ borderRadius: 2 }}>
              Back to Online Classroom
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Stream-ready Green Room
  return (
    <RequireRole roles={[ROLES.STUDENT]}>
      <AppShell>
      <Box sx={{ minHeight: 'calc(100vh - 120px)', bgcolor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 }, borderRadius: 3 }}>
        <Box sx={{ maxWidth: 860, width: '100%' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/online-classroom')}
          sx={{ color: '#94a3b8', mb: 3, textTransform: 'none', '&:hover': { color: '#fff' } }}
        >
          Back to Classroom Dashboard
        </Button>

        <Card sx={{ bgcolor: '#1e293b', color: '#fff', borderRadius: 4, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Left: Stream Preview Stage Banner */}
            <Box
              sx={{
                flex: 1.2,
                p: { xs: 3, md: 4 },
                bgcolor: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRight: { md: '1px solid rgba(255,255,255,0.08)' },
                borderBottom: { xs: '1px solid rgba(255,255,255,0.08)', md: 'none' },
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Chip
                    icon={<LiveTvIcon sx={{ fontSize: 16, color: '#ff1744 !important' }} />}
                    label="LIVE BROADCAST"
                    size="small"
                    sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700 }}
                  />
                  <Chip
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#4ade80 !important' }} />}
                    label="READY TO JOIN"
                    size="small"
                    sx={{ bgcolor: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', fontWeight: 600 }}
                  />
                </Box>

                <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1, color: '#f8fafc' }}>
                  {preJoin.title}
                </Typography>

                {preJoin.description && (
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2, lineHeight: 1.6 }}>
                    {preJoin.description}
                  </Typography>
                )}
              </Box>

              {/* Stream Viewer Mode Info Box */}
              <Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <SchoolIcon sx={{ color: '#38bdf8' }} />
                  <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                    Teacher: {preJoin.teacher_name}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
                  Class is in progress. Ready to connect.
                </Typography>

                {/* Audio Output Check */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VolumeUpIcon sx={{ fontSize: 18, color: '#a78bfa' }} />
                    <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                      Audio Output (Speakers/Headphones)
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={testedAudio ? 'outlined' : 'text'}
                    color="secondary"
                    onClick={handleTestAudio}
                    sx={{ textTransform: 'none', py: 0.2, fontSize: 11 }}
                  >
                    {testedAudio ? '✓ Audio Tested' : 'Test Sound'}
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Right: Viewer Permissions & Join CTA */}
            <Box sx={{ flex: 1, p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, mb: 2 }}>
                  Classroom Interaction Rules
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                      <LiveTvIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f5f9' }}>
                        High-Definition Video Stream
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Watch host presentation, whiteboard, and screen share
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}>
                      <ChatIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f5f9' }}>
                        Live Text Chat & Questions
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Interact with teacher & classmates in real time
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(250, 204, 21, 0.15)', color: '#facc15' }}>
                      <PanToolIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f5f9' }}>
                        Raise Hand Alert
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Flag urgent questions to the teacher instantly
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Alert severity="info" sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 2, mb: 3 }}>
                  You will join with microphone and camera muted. You can unmute and turn on camera during the meeting when permitted.
                </Alert>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<LiveTvIcon />}
                  onClick={handleEnterLiveClass}
                  sx={{
                    py: 1.5,
                    borderRadius: 2.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: 16,
                    bgcolor: '#2563eb',
                    '&:hover': { bgcolor: '#1d4ed8' },
                  }}
                >
                  Join Live Class Now
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => router.push('/online-classroom')}
                  sx={{ borderRadius: 2.5, textTransform: 'none', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  </AppShell>
  </RequireRole>
  );
}
