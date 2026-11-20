import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { teacherOnlineClassApi, onlineClassroomKeys } from '../api';

interface InstantClassDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function InstantClassDialog({ open, onClose }: InstantClassDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(`Instant Classroom - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  const [duration, setDuration] = useState<number>(45);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // 1. Create class
      const newClass = await teacherOnlineClassApi.createClass({
        title: title.trim() || 'Instant Class',
        scheduled_date: todayStr,
        start_time: timeStr,
        expected_duration_minutes: duration,
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        is_recording_enabled: false,
        settings: { is_instant: true },
      });

      // 2. Start class (transitions to LIVE)
      await teacherOnlineClassApi.startClass(newClass.id);

      // Invalidate queries & redirect to live room
      queryClient.invalidateQueries({ queryKey: onlineClassroomKeys.all });
      router.push(`/online-classroom/${newClass.id}/live`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to start instant class. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <form onSubmit={handleStart}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
          <VideoCameraFrontIcon color="primary" /> Start Instant Online Class
        </DialogTitle>
        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Launches an immediate live room. You can share the meeting link or invite participants inside the room.
          </Typography>

          <TextField
            label="Class Title"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2.5 }}
          />

          <TextField
            select
            label="Expected Duration"
            fullWidth
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <MenuItem value={30}>30 Minutes</MenuItem>
            <MenuItem value={45}>45 Minutes</MenuItem>
            <MenuItem value={60}>60 Minutes (1 Hour)</MenuItem>
            <MenuItem value={90}>90 Minutes (1.5 Hours)</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="success" disabled={loading} startIcon={<VideoCameraFrontIcon />}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Launch & Join Now'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
