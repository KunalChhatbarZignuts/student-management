import React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import { useRouter } from 'next/navigation';
import { OnlineClass } from '../types';

interface OnlineClassesTableProps {
  classes: OnlineClass[];
  loading: boolean;
  onStartClass: (id: string) => void;
  onCancelClass: (id: string) => void;
}

export default function OnlineClassesTable({
  classes,
  loading,
  onStartClass,
  onCancelClass,
}: OnlineClassesTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Status</TableCell>
              <TableCell>Class Title</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Students</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton width={80} height={24} /></TableCell>
                <TableCell><Skeleton width={200} height={24} /></TableCell>
                <TableCell><Skeleton width={120} height={24} /></TableCell>
                <TableCell><Skeleton width={60} height={24} /></TableCell>
                <TableCell><Skeleton width={50} height={24} /></TableCell>
                <TableCell align="right"><Skeleton width={120} height={36} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
        No online classes found for this filter. Use the buttons above to schedule or start a class.
      </Alert>
    );
  }

  const renderStatusChip = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#fff !important', animation: 'pulse 1.5s infinite' }} />}
            label="LIVE NOW"
            size="small"
            color="success"
            sx={{ fontWeight: 700 }}
          />
        );
      case 'SCHEDULED':
        return <Chip label="Scheduled" size="small" color="info" variant="outlined" sx={{ fontWeight: 600 }} />;
      case 'COMPLETED':
        return <Chip label="Completed" size="small" color="default" sx={{ fontWeight: 500 }} />;
      case 'CANCELLED':
        return <Chip label="Cancelled" size="small" color="error" variant="outlined" sx={{ fontWeight: 500 }} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Class Title & Room</strong></TableCell>
            <TableCell><strong>Date & Start Time</strong></TableCell>
            <TableCell><strong>Duration</strong></TableCell>
            <TableCell><strong>Enrolled</strong></TableCell>
            <TableCell align="right"><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {classes.map((cls) => (
            <TableRow key={cls.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell>{renderStatusChip(cls.status)}</TableCell>

              <TableCell>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {cls.title}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                  {cls.room_name}
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2">{cls.scheduled_date}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {cls.start_time.slice(0, 5)}
                </Typography>
              </TableCell>

              <TableCell>{cls.expected_duration_minutes} min</TableCell>

              <TableCell>
                <Chip label={`${cls.participant_count} Students`} size="small" variant="outlined" />
              </TableCell>

              <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  {cls.status === 'LIVE' && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<VideoCameraFrontIcon />}
                      onClick={() => router.push(`/online-classroom/${cls.id}/live`)}
                    >
                      Join Live Room
                    </Button>
                  )}

                  {cls.status === 'SCHEDULED' && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => onStartClass(cls.id)}
                      >
                        Start Now
                      </Button>
                      <Tooltip title="Cancel Class">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => onCancelClass(cls.id)}
                          aria-label={`Cancel ${cls.title}`}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
