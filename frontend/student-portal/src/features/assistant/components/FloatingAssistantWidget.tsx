'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useRouter, usePathname } from 'next/navigation';

import { assistantApi } from '../api';
import { ChatMessage } from '../types';
import ChatMessageFeed from './ChatMessageFeed';
import ChatInputBar from './ChatInputBar';

export default function FloatingAssistantWidget() {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Do not show widget on the full /assistant page itself to avoid duplication
  if (pathname === '/assistant' || pathname?.startsWith('/assistant/')) {
    return null;
  }

  const handleSendMessage = async (text: string) => {
    // Add student optimistic message
    const tempStudentMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      sender: 'STUDENT',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempStudentMsg]);
    setIsLoading(true);

    try {
      const res = await assistantApi.sendMessage(text, activeConversationId);
      setActiveConversationId(res.conversation_id);
      const asstMsg: ChatMessage = {
        id: res.message_id,
        sender: 'ASSISTANT',
        content: res.content,
        tools_used: res.tools_used,
        action_links: res.action_links,
        created_at: res.created_at,
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (err) {
      console.error('Failed to query assistant widget:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Tooltip title="Ask AI Student Assistant" placement="left">
          <Fab
            color="primary"
            onClick={() => setIsOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1200,
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <AutoAwesomeIcon />
          </Fab>
        </Tooltip>
      )}

      {/* Floating Chat Popup Window */}
      {isOpen && (
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100vw - 32px)', sm: 400 },
            height: 520,
            maxHeight: 'calc(100vh - 48px)',
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1300,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
            bgcolor: 'background.paper',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <SmartToyOutlinedIcon fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>
                AI Student Assistant
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title="Open Full Screen">
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/assistant');
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton size="small" color="inherit" onClick={() => setIsOpen(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Chat Feed */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 1, bgcolor: 'background.default' }}>
            {messages.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <AutoAwesomeIcon color="primary" sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  How can I help you today?
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, px: 2 }}>
                  Ask about your timetable, attendance, marks, fees, or lessons.
                </Typography>
              </Box>
            ) : (
              <ChatMessageFeed messages={messages} isLoading={isLoading} />
            )}
          </Box>

          {/* Bottom Input */}
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <ChatInputBar
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder="Ask a question..."
            />
          </Box>
        </Paper>
      )}
    </>
  );
}
