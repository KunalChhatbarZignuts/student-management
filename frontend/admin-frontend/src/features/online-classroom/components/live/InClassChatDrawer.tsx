import React, { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole?: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
}

interface InClassChatDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  allowChat?: boolean;
  isObserver?: boolean;
}

export default function InClassChatDrawer({
  open,
  onClose,
  messages,
  onSendMessage,
  allowChat = true,
  isObserver = false,
}: InClassChatDrawerProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !allowChat) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

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
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          In-call Messages
        </Typography>
        <IconButton onClick={onClose} aria-label="Close Chat Drawer" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, display: 'block' }}>
        Messages are visible only to people in the call and are deleted when the call ends.
      </Typography>

      {/* Messages List Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          pr: 0.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          mb: 2,
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ my: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <Typography variant="body2">No messages yet. Say hello!</Typography>
          </Box>
        ) : (
          messages.map((msg) => (
            <Paper
              key={msg.id}
              sx={{
                p: 1.5,
                bgcolor: msg.isSelf ? '#1976d2' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                borderRadius: 2,
                maxWidth: '90%',
                alignSelf: msg.isSelf ? 'flex-end' : 'flex-start',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" fontWeight={600} sx={{ color: msg.isSelf ? '#e3f2fd' : '#8ab4f8' }}>
                  {msg.isSelf ? 'You' : msg.senderName}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
                  {msg.timestamp}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </Typography>
            </Paper>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      {isObserver ? (
        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            Observer mode — Chat is view-only
          </Typography>
        </Box>
      ) : allowChat ? (
        <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Send a message to everyone..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: 2,
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              },
            }}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={!inputText.trim()}
            aria-label="Send Message"
            sx={{
              bgcolor: inputText.trim() ? '#1a73e8' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              '&:hover': { bgcolor: '#1765c9' },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          In-call chat has been disabled by the teacher.
        </Typography>
      )}
    </Drawer>
  );
}
