import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

export interface ParticipantItem {
  id: string;
  name: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN_OBSERVER';
  isMicOn: boolean;
  isCameraOn: boolean;
  isSelf?: boolean;
  isMicAllowed?: boolean;
}

export interface WaitingStudent {
  client_id: string;
  id: string;
  name: string;
  user_id?: string;
}

export interface HandRaiseItem {
  id: string;
  client_id?: string;
  name: string;
  raised_at?: number;
}

interface ParticipantsDrawerProps {
  open: boolean;
  onClose: () => void;
  participants: ParticipantItem[];
  waitingStudents?: WaitingStudent[];
  handRaises?: HandRaiseItem[];
  onAdmitStudent?: (clientId: string) => void;
  onDenyStudent?: (clientId: string) => void;
  onAdmitAll?: () => void;
  onLowerHand?: (studentId: string) => void;
  isWaitingRoomEnabled?: boolean;
  onToggleWaitingRoom?: (enabled: boolean) => void;
  onMuteParticipant?: (id: string) => void;
  onAllowParticipantMic?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onMuteAll?: () => void;
}

export default function ParticipantsDrawer({
  open,
  onClose,
  participants,
  waitingStudents = [],
  handRaises = [],
  onAdmitStudent,
  onDenyStudent,
  onAdmitAll,
  onLowerHand,
  isWaitingRoomEnabled,
  onToggleWaitingRoom,
  onMuteParticipant,
  onAllowParticipantMic,
  onRemoveParticipant,
  onMuteAll,
}: ParticipantsDrawerProps) {
  const [search, setSearch] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | { el: HTMLElement; participant: ParticipantItem }>(null);

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="temporary"
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 360 },
          bgcolor: '#28292c',
          color: '#fff',
          p: 2,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          People ({participants.length})
        </Typography>
        <IconButton onClick={onClose} aria-label="Close Participants Drawer" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Host Action: Mute All */}
      {onMuteAll && (
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<VolumeOffIcon />}
          onClick={onMuteAll}
          sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)', '&:hover': { borderColor: '#fff' } }}
        >
          Mute Everyone
        </Button>
      )}

      {/* Waiting Room Knocking Queue */}
      {waitingStudents.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#fbbf24', fontWeight: 700 }}>
              Waiting Room ({waitingStudents.length})
            </Typography>
            {onAdmitAll && (
              <Button size="small" variant="text" sx={{ color: '#38bdf8', fontSize: '12px', fontWeight: 600, p: 0 }} onClick={onAdmitAll}>
                Admit All
              </Button>
            )}
          </Box>
          <List dense disablePadding>
            {waitingStudents.map((ws) => (
              <ListItem
                key={ws.client_id}
                disableGutters
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => onAdmitStudent?.(ws.client_id)}
                      sx={{ fontSize: '11px', px: 1, py: 0.25, minWidth: 'auto' }}
                    >
                      Admit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => onDenyStudent?.(ws.client_id)}
                      sx={{ fontSize: '11px', px: 1, py: 0.25, minWidth: 'auto' }}
                    >
                      Deny
                    </Button>
                  </Box>
                }
              >
                <ListItemAvatar sx={{ minWidth: 36 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '12px', bgcolor: '#d97706' }}>
                    {ws.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ color: '#fff', fontSize: '13px' }}>{ws.name}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Hand Raises Ordered Queue */}
      {handRaises.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#38bdf8', fontWeight: 700, mb: 1 }}>
            Raised Hands ({handRaises.length})
          </Typography>
          <List dense disablePadding>
            {handRaises.map((hr, idx) => (
              <ListItem
                key={hr.id || hr.client_id || idx}
                disableGutters
                secondaryAction={
                  <Button
                    size="small"
                    variant="text"
                    sx={{ color: '#94a3b8', fontSize: '11px' }}
                    onClick={() => onLowerHand?.(hr.id || hr.client_id || '')}
                  >
                    Lower Hand
                  </Button>
                }
              >
                <ListItemAvatar sx={{ minWidth: 32 }}>
                  <Chip label={`#${idx + 1}`} size="small" sx={{ height: 20, fontSize: '11px', bgcolor: '#38bdf8', color: '#000', fontWeight: 700 }} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ color: '#fff', fontSize: '13px' }}>{hr.name}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Search Input */}
      <TextField
        size="small"
        fullWidth
        placeholder="Search participants..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255,255,255,0.08)',
            color: '#fff',
            borderRadius: 2,
            '& fieldset': { borderColor: 'transparent' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
            </InputAdornment>
          ),
        }}
      />

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1 }} />

      {/* Participant List */}
      <List sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {filtered.map((p) => (
          <ListItem
            key={p.id}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {p.isMicOn ? (
                  <MicIcon sx={{ fontSize: 18, color: '#8ab4f8' }} />
                ) : (
                  <MicOffIcon sx={{ fontSize: 18, color: '#ea4335' }} />
                )}

                {!p.isSelf && p.role === 'STUDENT' && (Boolean(onMuteParticipant) || Boolean(onRemoveParticipant)) && (
                  <IconButton
                    size="small"
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                    onClick={(e) => setMenuAnchor({ el: e.currentTarget, participant: p })}
                    aria-label={`Participant options for ${p.name}`}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            }
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: p.role === 'TEACHER' ? '#1976d2' : '#5f6368',
                  width: 36,
                  height: 36,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 160 }}>
                    {p.name}
                  </Typography>
                  {p.isSelf && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      (You)
                    </Typography>
                  )}
                  {p.role === 'TEACHER' && (
                    <Chip label="Host" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#1976d2', color: '#fff' }} />
                  )}
                  {p.role === 'ADMIN_OBSERVER' && (
                    <Chip label="Observer" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#fbbc04', color: '#000' }} />
                  )}
                  {p.role === 'STUDENT' && (
                    <Chip
                      label={p.isMicAllowed === false ? 'Mic Locked' : 'Viewer (Chat)'}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        color: p.isMicAllowed === false ? '#ea4335' : '#38bdf8',
                        borderColor: p.isMicAllowed === false ? 'rgba(234, 67, 53, 0.5)' : 'rgba(56, 189, 248, 0.4)',
                        bgcolor: p.isMicAllowed === false ? 'rgba(234, 67, 53, 0.1)' : undefined,
                      }}
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {/* Participant Actions Context Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: { bgcolor: '#303134', color: '#fff', minWidth: 170 },
        }}
      >
        {menuAnchor?.participant.isMicAllowed === false ? (
          <MenuItem
            onClick={() => {
              if (menuAnchor && onAllowParticipantMic) {
                onAllowParticipantMic(menuAnchor.participant.id);
              }
              setMenuAnchor(null);
            }}
          >
            <MicIcon fontSize="small" sx={{ mr: 1, color: '#4caf50' }} /> Allow to Speak
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              if (menuAnchor && onMuteParticipant) {
                onMuteParticipant(menuAnchor.participant.id);
              }
              setMenuAnchor(null);
            }}
          >
            <VolumeOffIcon fontSize="small" sx={{ mr: 1, color: '#ea4335' }} /> Mute Student
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (menuAnchor && onRemoveParticipant) {
              onRemoveParticipant(menuAnchor.participant.id);
            }
            setMenuAnchor(null);
          }}
          sx={{ color: '#ea4335' }}
        >
          <PersonRemoveIcon fontSize="small" sx={{ mr: 1 }} /> Remove from Class
        </MenuItem>
      </Menu>
    </Drawer>
  );
}
