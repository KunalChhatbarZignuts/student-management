'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ForumIcon from '@mui/icons-material/Forum';

import { ConversationSummary } from '../types';

interface ConversationDrawerProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
}

export default function ConversationDrawer({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationDrawerProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [targetConv, setTargetConv] = useState<ConversationSummary | null>(null);

  // Dialog state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, conv: ConversationSummary) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setTargetConv(conv);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleStartRename = () => {
    if (!targetConv) return;
    setRenameTitle(targetConv.title);
    setRenameOpen(true);
    handleCloseMenu();
  };

  const handleConfirmRename = async () => {
    if (!targetConv || !renameTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onRenameConversation(targetConv.id, renameTitle.trim());
      setRenameOpen(false);
    } finally {
      setIsSubmitting(false);
      setTargetConv(null);
    }
  };

  const handleStartDelete = () => {
    setDeleteOpen(true);
    handleCloseMenu();
  };

  const handleConfirmDelete = async () => {
    if (!targetConv) return;
    setIsSubmitting(true);
    try {
      await onDeleteConversation(targetConv.id);
      setDeleteOpen(false);
    } finally {
      setIsSubmitting(false);
      setTargetConv(null);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header & New Chat Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onNewConversation}
          sx={{
            py: 1.2,
            borderRadius: 2.5,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          New Conversation
        </Button>
      </Box>

      <Divider />

      {/* Conversations List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 1.5, py: 1, display: 'block' }}>
          Recent Conversations ({conversations.length})
        </Typography>

        {conversations.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <ForumIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No conversations yet.
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Start by asking a question!
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {conversations.map((conv) => {
              const isSelected = conv.id === activeConversationId;
              const dateStr = new Date(conv.updated_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <ListItemButton
                  key={conv.id}
                  selected={isSelected}
                  onClick={() => onSelectConversation(conv.id)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    px: 1.5,
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.light' },
                      '& .MuiTypography-root': { color: 'inherit' },
                      '& .MuiSvgIcon-root': { color: 'inherit' },
                    },
                  }}
                >
                  <ChatBubbleOutlineIcon fontSize="small" sx={{ mr: 1.5, flexShrink: 0, color: isSelected ? 'inherit' : 'text.secondary' }} />
                  <ListItemText
                    primary={conv.title}
                    secondary={conv.last_message_preview || dateStr}
                    primaryTypographyProps={{
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      noWrap: true,
                    }}
                    secondaryTypographyProps={{
                      fontSize: 11,
                      noWrap: true,
                      color: isSelected ? 'inherit' : 'text.secondary',
                      opacity: isSelected ? 0.8 : 1,
                    }}
                  />
                  <IconButton
                    size="small"
                    aria-label="Conversation options"
                    onClick={(e) => handleOpenMenu(e, conv)}
                    sx={{ color: isSelected ? 'inherit' : 'text.secondary', ml: 0.5 }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleStartRename} sx={{ fontSize: 13, gap: 1 }}>
          <EditIcon fontSize="small" color="action" /> Rename
        </MenuItem>
        <MenuItem onClick={handleStartDelete} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
          <DeleteOutlineIcon fontSize="small" color="error" /> Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Conversation Title"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmRename} disabled={!renameTitle.trim() || isSubmitting}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: 'error.main' }}>Delete Conversation?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <strong>"{targetConv?.title}"</strong>? All messages in this conversation will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={isSubmitting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
