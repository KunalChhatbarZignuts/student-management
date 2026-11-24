'use client';

import React, { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PsychologyIcon from '@mui/icons-material/Psychology';

import { ChatMessage, ChatActionSuggestion } from '../types';

interface AITutorChatTabProps {
  onSendMessage: (message: string) => Promise<{ reply: string; suggested_actions?: ChatActionSuggestion[] }>;
  onExecuteAction: (actionType: string) => void;
}

export default function AITutorChatTab({ onSendMessage, onExecuteAction }: AITutorChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am your AI Personal Learning Assistant. I have analyzed your recent examination results and curriculum syllabus. Ask me how to improve in specific subjects, what to study today, or request tips for your upcoming exams!',
      suggested_actions: [
        { label: "Check Today's Study Plan", action_type: 'NAVIGATE_PLAN' },
        { label: 'Take Practice Quiz', action_type: 'START_PRACTICE' },
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickQuestions = [
    'Why is my Math score low and how do I improve?',
    'What should I study today?',
    'Which chapters should I revise for exams?',
    'Give me practice tips for Science.',
  ];

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsSending(true);

    try {
      const response = await onSendMessage(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        suggested_actions: response.suggested_actions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I could not process that request right now. Please check your connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '650px', maxWidth: 850, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: '12px 12px 0 0',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        <PsychologyIcon color="primary" />
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            AI Academic Coach & Tutor
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Personalized academic guidance grounded in your verified exam records
          </Typography>
        </Box>
      </Paper>

      {/* Message Feed */}
      <Paper
        variant="outlined"
        sx={{
          flexGrow: 1,
          p: 3,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'action.hover',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
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
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: isUser ? 'primary.main' : 'primary.light',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isUser ? <PersonOutlineIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
              </Box>

              <Box sx={{ maxWidth: '75%' }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: isUser ? 'primary.main' : 'background.paper',
                    color: isUser ? '#ffffff' : 'text.primary',
                    border: isUser ? 'none' : '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {msg.text}
                  </Typography>

                  {/* Action suggestions inside message */}
                  {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                    <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                      {msg.suggested_actions.map((act, idx) => (
                        <Button
                          key={idx}
                          size="small"
                          variant="outlined"
                          onClick={() => onExecuteAction(act.action_type)}
                          sx={{
                            borderRadius: 2,
                            fontSize: 11,
                            textTransform: 'none',
                            bgcolor: 'background.paper',
                          }}
                        >
                          {act.label}
                        </Button>
                      ))}
                    </Stack>
                  )}
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, px: 1, textAlign: isUser ? 'right' : 'left' }}>
                  {msg.timestamp}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {isSending && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <CircularProgress size={20} />
            <Typography variant="caption" color="text.secondary">
              AI Tutor is analyzing your academic records...
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {/* Quick Questions & Input Box */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: '0 0 12px 12px', borderTop: 'none' }}>
        {/* Quick prompt chips */}
        <Stack direction="row" gap={1} flexWrap="wrap" mb={1.5}>
          {quickQuestions.map((q, idx) => (
            <Chip
              key={idx}
              label={q}
              size="small"
              clickable
              onClick={() => handleSend(q)}
              sx={{ fontSize: 11 }}
            />
          ))}
        </Stack>

        <Stack direction="row" gap={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask a question about your performance, topics, or study plan..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <IconButton
            color="primary"
            disabled={!inputVal.trim() || isSending}
            onClick={() => handleSend()}
            sx={{ bgcolor: 'primary.main', color: '#ffffff', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2 }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    </Box>
  );
}
