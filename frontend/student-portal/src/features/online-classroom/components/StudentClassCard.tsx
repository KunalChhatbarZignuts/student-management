'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import VideocamIcon from '@mui/icons-material/Videocam';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import MicIcon from '@mui/icons-material/Mic';
import ChatIcon from '@mui/icons-material/Chat';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRouter } from 'next/navigation';
import { PulseLiveBadge } from '@/components/ui/animated/PulseLiveBadge';
import { OnlineClass } from '../types';

interface StudentClassCardProps {
  onlineClass: OnlineClass;
}

export default function StudentClassCard({ onlineClass }: StudentClassCardProps) {
  const router = useRouter();
  const isLive = onlineClass.status === 'LIVE';
  const isScheduled = onlineClass.status === 'SCHEDULED';
  const isCompleted = onlineClass.status === 'COMPLETED';

  const handleJoin = () => {
    router.push(`/online-classroom/${onlineClass.id}/join`);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderColor: isLive ? 'primary.main' : 'divider',
        boxShadow: isLive ? '0 4px 16px rgba(25, 118, 210, 0.15)' : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
        },
      }}
    >
      <CardContent
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          '&:last-child': { pb: 2 },
        }}
      >
        {/* Header: Title and Status Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ pr: 1, flexGrow: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                fontSize: '0.95rem',
                lineHeight: 1.3,
                mb: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.6em',
              }}
            >
              {onlineClass.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Avatar sx={{ width: 18, height: 18, bgcolor: 'primary.light', fontSize: 11 }}>
                <PersonIcon sx={{ fontSize: 12 }} />
              </Avatar>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }} color="text.secondary">
                Teacher: <strong>{onlineClass.teacher_name}</strong>
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            {isLive ? (
              <PulseLiveBadge variant="live" label="LIVE NOW" pulse={true} />
            ) : isScheduled ? (
              <PulseLiveBadge variant="scheduled" label="Upcoming" pulse={false} />
            ) : isCompleted ? (
              <PulseLiveBadge variant="completed" label="Completed" pulse={false} />
            ) : (
              <Chip label={onlineClass.status} color="default" size="small" sx={{ fontSize: 10, height: 22 }} />
            )}
          </Box>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: '0.8rem',
            lineHeight: 1.35,
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.7em',
          }}
        >
          {onlineClass.description || 'No additional session description provided.'}
        </Typography>

        {/* Schedule & Duration Meta */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            py: 1,
            mb: 1.5,
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {onlineClass.scheduled_date}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {onlineClass.start_time.slice(0, 5)} ({onlineClass.expected_duration_minutes} mins)
            </Typography>
          </Box>
        </Box>

        {/* Footer: Permission Badges & Join Action / Completion Indicator (pushed to bottom) */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 'auto',
            pt: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            {!isCompleted && onlineClass.allow_student_mic && (
              <Chip
                size="small"
                icon={<MicIcon sx={{ fontSize: '12px !important' }} />}
                label="Mic On"
                variant="outlined"
                sx={{ fontSize: 10, height: 20, bgcolor: 'action.hover' }}
              />
            )}
            {!isCompleted && onlineClass.allow_student_chat && (
              <Chip
                size="small"
                icon={<ChatIcon sx={{ fontSize: '12px !important' }} />}
                label="Chat"
                variant="outlined"
                sx={{ fontSize: 10, height: 20, bgcolor: 'action.hover' }}
              />
            )}
          </Box>

          {isLive ? (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<VideocamIcon sx={{ fontSize: 16 }} />}
              onClick={handleJoin}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1.5,
                px: 1.5,
                py: 0.5,
                fontSize: 12,
              }}
            >
              Join Live Now
            </Button>
          ) : isScheduled ? (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<VideocamIcon sx={{ fontSize: 16 }} />}
              onClick={handleJoin}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1.5,
                px: 1.5,
                py: 0.5,
                fontSize: 12,
              }}
            >
              Pre-Join
            </Button>
          ) : (
            <Chip
              icon={<CheckCircleOutlineIcon sx={{ fontSize: '13px !important', color: 'text.secondary' }} />}
              label="Concluded"
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 500,
                fontSize: 11,
                color: 'text.secondary',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                height: 22,
                px: 0.5,
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
