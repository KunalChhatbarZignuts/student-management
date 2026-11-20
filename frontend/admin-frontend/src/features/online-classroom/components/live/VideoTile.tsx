import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface VideoTileProps {
  name: string;
  isHost?: boolean;
  isSelf?: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
  isSpeaking?: boolean;
  videoStream?: MediaStream | null;
  defaultMirrored?: boolean;
}

export default function VideoTile({
  name,
  isHost = false,
  isSelf = false,
  isCameraOn,
  isMicOn,
  isSpeaking = false,
  videoStream,
  defaultMirrored = false,
}: VideoTileProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isMirrored, setIsMirrored] = useState(defaultMirrored);

  React.useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, isCameraOn]);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 180,
        bgcolor: '#202124',
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isSpeaking ? '2.5px solid #8ab4f8' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isSpeaking ? '0 0 12px rgba(138, 180, 248, 0.4)' : 'none',
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Video Element (when camera is on) */}
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: (isSelf && isMirrored) ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        /* Avatar Placeholder when camera is off */
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              bgcolor: isHost ? '#1976d2' : '#5f6368',
              fontSize: 26,
              fontWeight: 600,
              mb: 1,
            }}
          >
            {initials}
          </Avatar>
        </Box>
      )}

      {/* Top Badges (Host tag) */}
      {isHost && (
        <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
          <Chip
            label="Host"
            size="small"
            sx={{
              bgcolor: 'rgba(25, 118, 210, 0.85)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 11,
              height: 22,
            }}
          />
        </Box>
      )}

      {/* Self View Mirror Toggle Button */}
      {isSelf && isCameraOn && (
        <Tooltip title={isMirrored ? 'Normal orientation (click to un-mirror text)' : 'Mirror video'}>
          <IconButton
            size="small"
            onClick={() => setIsMirrored((prev) => !prev)}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
              zIndex: 2,
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.85)' },
              width: 30,
              height: 30,
            }}
          >
            <SwapHorizIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Bottom Name & Mic status overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.65)',
            color: '#fff',
            px: 1.2,
            py: 0.4,
            borderRadius: 1.5,
            fontWeight: 500,
            maxWidth: '80%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name} {isSelf && '(You)'}
        </Typography>

        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            bgcolor: isMicOn ? 'rgba(0, 0, 0, 0.65)' : '#ea4335',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isMicOn ? (
            <MicIcon sx={{ fontSize: 16, color: '#fff' }} />
          ) : (
            <MicOffIcon sx={{ fontSize: 16, color: '#fff' }} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
