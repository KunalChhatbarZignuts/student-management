import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

interface MeetingSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  isHost?: boolean;
  permissions?: {
    allowMic: boolean;
    allowCam: boolean;
    allowChat: boolean;
    allowWhiteboard: boolean;
  };
  onUpdatePermissions?: (newPermissions: {
    allowMic: boolean;
    allowCam: boolean;
    allowChat: boolean;
    allowWhiteboard: boolean;
  }) => void;
}

export default function MeetingSettingsDialog({
  open,
  onClose,
  isHost = false,
  permissions = { allowMic: true, allowCam: true, allowChat: true, allowWhiteboard: false },
  onUpdatePermissions,
}: MeetingSettingsDialogProps) {
  const [micPermission, setMicPermission] = useState(permissions.allowMic);
  const [camPermission, setCamPermission] = useState(permissions.allowCam);
  const [chatPermission, setChatPermission] = useState(permissions.allowChat);
  const [whiteboardPermission, setWhiteboardPermission] = useState(permissions.allowWhiteboard);

  const handleSave = () => {
    if (onUpdatePermissions) {
      onUpdatePermissions({
        allowMic: micPermission,
        allowCam: camPermission,
        allowChat: chatPermission,
        allowWhiteboard: whiteboardPermission,
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle sx={{ fontWeight: 600 }}>Classroom Settings</DialogTitle>
      <DialogContent dividers>
        {/* Device Settings */}
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Hardware & Devices
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <TextField select label="Microphone" fullWidth defaultValue="default">
              <MenuItem value="default">Default - Internal Microphone</MenuItem>
              <MenuItem value="external">External USB Audio Device</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField select label="Camera" fullWidth defaultValue="default">
              <MenuItem value="default">FaceTime HD Camera (Built-in)</MenuItem>
              <MenuItem value="virtual">Virtual Webcam</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField select label="Speakers" fullWidth defaultValue="default">
              <MenuItem value="default">Default - System Audio</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {/* Host Controls */}
        {isHost && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Student Permissions in This Session
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={micPermission} onChange={(e) => setMicPermission(e.target.checked)} color="primary" />}
                    label="Allow students to turn on microphone"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={camPermission} onChange={(e) => setCamPermission(e.target.checked)} color="primary" />}
                    label="Allow students to turn on camera"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={chatPermission} onChange={(e) => setChatPermission(e.target.checked)} color="primary" />}
                    label="Allow students to send in-call chat"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={whiteboardPermission} onChange={(e) => setWhiteboardPermission(e.target.checked)} color="primary" />}
                    label="Allow students to draw on the whiteboard"
                  />
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
