'use client';

import React, { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import Tooltip from '@mui/material/Tooltip';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

interface ChatInputBarProps {
  onSendMessage: (message: string) => void;
  onUploadImage?: (file: File) => void;
  onUploadDocument?: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInputBar({
  onSendMessage,
  onUploadImage,
  onUploadDocument,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask a question about your timetable, attendance, marks, fees, or lessons...',
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your current browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    onSendMessage(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadDocument) {
      onUploadDocument(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 1,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: 'background.paper',
      }}
    >
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />
      <input
        ref={docInputRef}
        type="file"
        accept="application/pdf,text/plain,text/markdown"
        style={{ display: 'none' }}
        onChange={handleDocFileChange}
      />

      {/* Attachment Actions */}
      {onUploadImage && (
        <Tooltip title="Upload Question Image (PNG/JPEG)">
          <span>
            <IconButton
              size="small"
              aria-label="Upload question image"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || isLoading}
              sx={{ color: 'text.secondary' }}
            >
              <AddPhotoAlternateOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}

      {onUploadDocument && (
        <Tooltip title="Upload Study Notes (PDF/Text)">
          <span>
            <IconButton
              size="small"
              aria-label="Upload study notes"
              onClick={() => docInputRef.current?.click()}
              disabled={disabled || isLoading}
              sx={{ color: 'text.secondary' }}
            >
              <AttachFileOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        variant="standard"
        InputProps={{
          disableUnderline: true,
          sx: { px: 1, py: 0.5, fontSize: 14 },
        }}
      />

      <Tooltip title={isListening ? 'Stop recording voice' : 'Voice input (Speech-to-Text)'}>
        <span>
          <IconButton
            size="small"
            aria-label="Voice input"
            color={isListening ? 'error' : 'default'}
            onClick={toggleVoiceInput}
            disabled={disabled || isLoading}
            sx={{
              color: isListening ? 'error.main' : 'text.secondary',
              animation: isListening ? 'pulse 1.2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.15)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          >
            {isListening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Send message (Enter)">
        <span>
          <IconButton
            aria-label="Send message"
            color="primary"
            onClick={handleSend}
            disabled={!text.trim() || isLoading || disabled}
            sx={{
              bgcolor: text.trim() && !isLoading ? 'primary.main' : 'action.disabledBackground',
              color: text.trim() && !isLoading ? 'primary.contrastText' : 'action.disabled',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              width: 38,
              height: 38,
              flexShrink: 0,
            }}
          >
            {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
}
