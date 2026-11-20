import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import BrushIcon from '@mui/icons-material/Brush';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';

interface MeetingControlsBarProps {
  roomName: string;
  elapsedSeconds: number;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isWhiteboardOpen: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  participantCount: number;
  unreadChatCount: number;
  isObserver?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleWhiteboard: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onOpenSettings: () => void;
  onLeaveCall: () => void;
}

export default function MeetingControlsBar({
  roomName,
  elapsedSeconds,
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isWhiteboardOpen,
  isChatOpen,
  isParticipantsOpen,
  participantCount,
  unreadChatCount,
  isObserver = false,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleWhiteboard,
  onToggleChat,
  onToggleParticipants,
  onOpenSettings,
  onLeaveCall,
}: MeetingControlsBarProps) {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        height: 72,
        bgcolor: '#1e1e1e',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 3 },
        zIndex: 10,
      }}
    >
      {/* Left: Meeting duration clock & Room Code */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2, minWidth: 200 }}>
        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
          {formatTime(elapsedSeconds)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
          {roomName}
        </Typography>
      </Box>

      {/* Center: Main Media Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {!isObserver && (
          <>
            {/* Mic Toggle */}
            <Tooltip title={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}>
              <IconButton
                onClick={onToggleMic}
                aria-label={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: isMicOn ? 'rgba(255, 255, 255, 0.15)' : '#ea4335',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: isMicOn ? 'rgba(255, 255, 255, 0.25)' : '#d93025',
                  },
                }}
              >
                {isMicOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>

            {/* Camera Toggle */}
            <Tooltip title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}>
              <IconButton
                onClick={onToggleCamera}
                aria-label={isCameraOn ? 'Turn off Camera' : 'Turn on Camera'}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: isCameraOn ? 'rgba(255, 255, 255, 0.15)' : '#ea4335',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: isCameraOn ? 'rgba(255, 255, 255, 0.25)' : '#d93025',
                  },
                }}
              >
                {isCameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>

            {/* Screen Share Toggle */}
            <Tooltip title={isScreenSharing ? 'Stop sharing screen' : 'Share entire screen'}>
              <IconButton
                onClick={onToggleScreenShare}
                aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: isScreenSharing ? '#1a73e8' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: isScreenSharing ? '#1765c9' : 'rgba(255, 255, 255, 0.25)',
                  },
                }}
              >
                {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            </Tooltip>

            {/* Whiteboard Toggle */}
            <Tooltip title={isWhiteboardOpen ? 'Close whiteboard' : 'Open collaborative whiteboard'}>
              <IconButton
                onClick={onToggleWhiteboard}
                aria-label={isWhiteboardOpen ? 'Close Whiteboard' : 'Open Whiteboard'}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: isWhiteboardOpen ? '#1a73e8' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: isWhiteboardOpen ? '#1765c9' : 'rgba(255, 255, 255, 0.25)',
                  },
                }}
              >
                <BrushIcon />
              </IconButton>
            </Tooltip>
          </>
        )}

        {/* End / Leave Call Red Button */}
        <Tooltip title={isObserver ? 'Leave observation' : 'End or leave class'}>
          <IconButton
            onClick={onLeaveCall}
            aria-label={isObserver ? 'Leave Observation' : 'End Call'}
            sx={{
              width: isObserver ? 44 : 56,
              height: 44,
              borderRadius: isObserver ? '50%' : 5,
              bgcolor: '#ea4335',
              color: '#fff',
              ml: 1,
              '&:hover': { bgcolor: '#d93025' },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Right: Drawer toggles & Settings */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="In-class chat">
          <IconButton
            onClick={onToggleChat}
            aria-label="Toggle In-Class Chat"
            sx={{
              color: isChatOpen ? '#8ab4f8' : '#fff',
              bgcolor: isChatOpen ? 'rgba(138, 180, 248, 0.15)' : 'transparent',
            }}
          >
            <Badge badgeContent={unreadChatCount} color="error">
              <ChatIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Participants list">
          <IconButton
            onClick={onToggleParticipants}
            aria-label="Toggle Participants Drawer"
            sx={{
              color: isParticipantsOpen ? '#8ab4f8' : '#fff',
              bgcolor: isParticipantsOpen ? 'rgba(138, 180, 248, 0.15)' : 'transparent',
            }}
          >
            <Badge badgeContent={participantCount} color="primary">
              <PeopleIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        {!isObserver && (
          <Tooltip title="Classroom settings">
            <IconButton onClick={onOpenSettings} aria-label="Classroom Settings" sx={{ color: '#fff' }}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
