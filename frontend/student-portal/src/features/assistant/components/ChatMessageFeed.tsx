'use client';

import React, { useRef, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useRouter } from 'next/navigation';

import { ChatMessage } from '../types';
import FormattedMessageContent from './FormattedMessageContent';

interface ChatMessageFeedProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export default function ChatMessageFeed({ messages, isLoading = false }: ChatMessageFeedProps) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSpeak = (id: string, content: string) => {
    if (
      typeof window === 'undefined' ||
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      return;
    }

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = content
      .replace(/[#*_`~>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2 }}>
      {messages.map((msg) => {
        const isUser = msg.sender === 'STUDENT';
        const formattedTime = new Date(msg.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              gap: 1.5,
              flexDirection: isUser ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar */}
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                bgcolor: isUser ? 'primary.main' : 'primary.light',
                color: isUser ? '#ffffff' : 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {isUser ? <PersonOutlineIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
            </Box>

            {/* Content & Metadata */}
            <Box sx={{ maxWidth: { xs: '88%', sm: '80%', md: '75%' } }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  bgcolor: isUser ? 'primary.main' : 'background.paper',
                  color: isUser ? '#ffffff' : 'text.primary',
                  border: isUser ? 'none' : '1px solid',
                  borderColor: 'divider',
                  boxShadow: isUser
                    ? '0 3px 10px rgba(0,0,0,0.12)'
                    : '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                {/* Tools Used Badge (Assistant only) */}
                {!isUser && msg.tools_used && msg.tools_used.length > 0 && (
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" gap={0.5} sx={{ mb: 1.5 }}>
                    {msg.tools_used.map((tool) => (
                      <Chip
                        key={tool}
                        icon={<BuildCircleOutlinedIcon style={{ fontSize: 13 }} />}
                        label={`Verified via ${tool.replace('get_student_', '').replace('get_school_', '')}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: 11, height: 22 }}
                      />
                    ))}
                  </Stack>
                )}

                {/* Formatted Text Content */}
                <FormattedMessageContent content={msg.content} isUser={isUser} />

                {/* Portal Deep-Action Links */}
                {!isUser && msg.action_links && msg.action_links.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    {msg.action_links.map((link) => (
                      <Button
                        key={link.url}
                        size="small"
                        variant="contained"
                        color="primary"
                        endIcon={<LaunchIcon style={{ fontSize: 13 }} />}
                        onClick={() => router.push(link.url)}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: 12 }}
                      >
                        {link.label}
                      </Button>
                    ))}
                  </Stack>
                )}
              </Paper>

              {/* Timestamp & Voice Readout */}
              <Stack
                direction="row"
                spacing={0.8}
                alignItems="center"
                mt={0.5}
                px={0.5}
                justifyContent={isUser ? 'flex-end' : 'flex-start'}
              >
                <Typography variant="caption" color="text.disabled">
                  {formattedTime}
                </Typography>
                {!isUser && (
                  <Tooltip title={speakingMsgId === msg.id ? 'Stop audio' : 'Listen with Voice Tutor'}>
                    <IconButton
                      size="small"
                      aria-label="Read message aloud"
                      onClick={() => handleSpeak(msg.id, msg.content)}
                      sx={{
                        p: 0.3,
                        color: speakingMsgId === msg.id ? 'primary.main' : 'text.disabled',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {speakingMsgId === msg.id ? (
                        <VolumeOffIcon sx={{ fontSize: 15 }} />
                      ) : (
                        <VolumeUpIcon sx={{ fontSize: 15 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </Box>
        );
      })}

      {/* Loading state indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <SmartToyOutlinedIcon fontSize="small" />
          </Box>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '4px 16px 16px 16px',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <CircularProgress size={16} color="primary" />
            <Typography variant="body2" color="text.secondary">
              Consulting verified school tools and preparing response...
            </Typography>
          </Paper>
        </Box>
      )}

      <div ref={bottomRef} />
    </Box>
  );
}
