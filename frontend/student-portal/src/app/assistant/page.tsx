'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';

import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/hooks';

import { assistantApi, assistantKeys } from '@/features/assistant/api';
import { ChatMessage } from '@/features/assistant/types';
import ConversationDrawer from '@/features/assistant/components/ConversationDrawer';
import WelcomeCardGrid from '@/features/assistant/components/WelcomeCardGrid';
import ChatMessageFeed from '@/features/assistant/components/ChatMessageFeed';
import ChatInputBar from '@/features/assistant/components/ChatInputBar';
import { MorningBriefingBanner } from '@/features/assistant/components/MorningBriefingBanner';
import { PomodoroStudyBuddy } from '@/features/assistant/components/PomodoroStudyBuddy';

export default function StudentAssistantPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Queries
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: assistantKeys.conversations(),
    queryFn: () => assistantApi.getConversations(),
  });

  const { data: activeDetail, isLoading: loadingDetail } = useQuery({
    queryKey: assistantKeys.conversation(activeConversationId || ''),
    queryFn: () => assistantApi.getConversationDetail(activeConversationId!),
    enabled: !!activeConversationId,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: assistantKeys.suggestions(),
    queryFn: () => assistantApi.getSuggestions(),
  });

  const { data: briefing } = useQuery({
    queryKey: assistantKeys.briefing(),
    queryFn: () => assistantApi.getMorningBriefing(),
  });

  // Mutations
  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      assistantApi.renameConversation(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assistantApi.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() });
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
      }
    },
  });

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    setIsSending(true);
    try {
      const res = await assistantApi.sendMessage(text, activeConversationId);
      if (!activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversation(res.conversation_id) });
    } catch (err) {
      console.error('Failed to send assistant message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    setIsSending(true);
    try {
      const imgRes = await assistantApi.uploadImage(file);
      const textPrompt = `[Uploaded Image: ${imgRes.filename}] Analyze this ${imgRes.detected_subject} problem.`;
      
      // Send as chat message to record into conversation
      const res = await assistantApi.sendMessage(textPrompt, activeConversationId);
      if (!activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversation(res.conversation_id) });
    } catch (err) {
      console.error('Image question upload failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadDocument = async (file: File) => {
    setIsSending(true);
    try {
      const docRes = await assistantApi.uploadDocument(file);
      const textPrompt = `[Uploaded Document: ${docRes.filename}] Summarize these study notes and highlight key definitions.`;
      
      const res = await assistantApi.sendMessage(textPrompt, activeConversationId);
      if (!activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversation(res.conversation_id) });
    } catch (err) {
      console.error('Document upload failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  const messages: ChatMessage[] = activeDetail?.messages || [];

  return (
    <AppShell>
        <Box
          sx={{
            height: 'calc(100vh - 65px)',
            display: 'flex',
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          {/* Desktop Left Sidebar */}
          {!isMobile && (
            <Box sx={{ width: 320, flexShrink: 0, height: '100%' }}>
              <ConversationDrawer
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onRenameConversation={async (id, title) => {
                  await renameMutation.mutateAsync({ id, title });
                }}
                onDeleteConversation={async (id) => {
                  await deleteMutation.mutateAsync(id);
                }}
              />
            </Box>
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <Drawer
              anchor="left"
              open={mobileDrawerOpen}
              onClose={() => setMobileDrawerOpen(false)}
              sx={{ '& .MuiDrawer-paper': { width: 300 } }}
            >
              <ConversationDrawer
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onRenameConversation={async (id, title) => {
                  await renameMutation.mutateAsync({ id, title });
                }}
                onDeleteConversation={async (id) => {
                  await deleteMutation.mutateAsync(id);
                }}
              />
            </Drawer>
          )}

          {/* Main Chat Stage */}
          <Box
            sx={{
              flexGrow: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.default',
              overflow: 'hidden',
            }}
          >
            {/* Top Stage Header */}
            <Paper
              elevation={0}
              sx={{
                px: 3,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper',
                zIndex: 1,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                {isMobile && (
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={() => setMobileDrawerOpen(true)}
                    sx={{ mr: 0.5 }}
                  >
                    <HistoryIcon />
                  </IconButton>
                )}

                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AutoAwesomeIcon fontSize="small" />
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                    AI Student Assistant
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activeDetail?.title || 'Personal Digital School Copilot'}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label="Online • Verified Data"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: 11 }}
                />

                {activeConversationId && (
                  <Tooltip title="Start New Chat">
                    <IconButton size="small" color="primary" onClick={handleNewConversation}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Paper>

            {/* Chat Body: Welcome Grid or Message Feed */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                px: { xs: 2, sm: 3, md: 4 },
                py: 2,
              }}
            >
              <Box sx={{ maxWidth: 880, mx: 'auto' }}>
                {briefing && <MorningBriefingBanner briefing={briefing} />}

                {!activeConversationId && messages.length === 0 ? (
                  <WelcomeCardGrid
                    studentName={user?.first_name}
                    suggestions={suggestions}
                    onSelectPrompt={(prompt) => handleSendMessage(prompt)}
                  />
                ) : (
                  <ChatMessageFeed messages={messages} isLoading={isSending || loadingDetail} />
                )}
              </Box>
            </Box>

            {/* Bottom Pinned Input Bar */}
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: 'background.paper',
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ maxWidth: 880, mx: 'auto' }}>
                {/* Academic Quick Feature Shortcuts */}
                <Stack
                  direction="row"
                  spacing={1}
                  mb={1.5}
                  sx={{
                    overflowX: 'auto',
                    pb: 0.5,
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  <Chip
                    label="🎯 Practice Quiz"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Generate an interactive practice quiz for Mathematics')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="🗂️ Flashcards"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Create revision flashcards for Science')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="📅 Exam Prep"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Generate my exam revision checklist and countdown')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="💡 Homework Help"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Help me solve my homework problem step by step with Socratic hints')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="💬 English Practice"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Check my English grammar and sentence: He go to school everyday.')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="⚖️ AI Debate"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage("Let's debate about whether AI helps students learn, I am on affirmative side.")}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="🗺️ Concept Map"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Generate an interactive concept map for Photosynthesis')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="📝 Class Notes"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Show my class revision notes for Mathematics')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="☀️ Morning Briefing"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('What is my morning briefing today?')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="🔥 Daily Challenge"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('Give me the daily knowledge challenge')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                  <Chip
                    label="🧭 Career Discovery"
                    size="small"
                    clickable
                    onClick={() => handleSendMessage('What career pathways match my subject strengths?')}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                </Stack>

                <ChatInputBar
                  onSendMessage={handleSendMessage}
                  onUploadImage={handleUploadImage}
                  onUploadDocument={handleUploadDocument}
                  isLoading={isSending}
                  disabled={loadingDetail}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Floating Pomodoro Study Buddy Widget */}
        <PomodoroStudyBuddy />
      </AppShell>
  );
}
