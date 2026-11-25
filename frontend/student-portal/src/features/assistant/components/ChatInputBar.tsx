'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { assistantApi } from '../api';

interface ChatInputBarProps {
  onSendMessage: (message: string) => void;
  onUploadImage?: (file: File) => void;
  onUploadDocument?: (file: File) => void;
  onStopGenerating?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInputBar({
  onSendMessage,
  onUploadImage,
  onUploadDocument,
  onStopGenerating,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask a question about your timetable, attendance, marks, fees, or any general AI topic...',
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isManuallyStoppedRef = useRef<boolean>(false);

  // Clean up streams & recognition on unmount
  useEffect(() => {
    return () => {
      stopAllVoiceTracks();
    };
  }, []);

  const stopAllVoiceTracks = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignored
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignored
      }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // MediaRecorder Fallback when Web Speech API is unavailable or has network errors
  const startMediaRecorderFallback = useCallback((stream: MediaStream) => {
    try {
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          setIsTranscribing(true);
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const response = await assistantApi.transcribeAudio(audioBlob);
            if (response && response.transcript) {
              setText((prev) => (prev ? `${prev.trim()} ${response.transcript.trim()}` : response.transcript.trim()));
              setVoiceError(null);
            }
          } catch (err: any) {
            setVoiceError('Audio transcription failed. Please try speaking again.');
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      recorder.start(500); // Collect in 500ms slices
      mediaRecorderRef.current = recorder;
      setIsListening(true);
      setVoiceError(null);
    } catch (err: any) {
      setVoiceError('Could not initialize audio recorder.');
      stopAllVoiceTracks();
    }
  }, [stopAllVoiceTracks]);

  // Main voice input toggle
  const toggleVoiceInput = async () => {
    if (typeof window === 'undefined') return;

    if (isListening) {
      stopAllVoiceTracks();
      return;
    }

    setVoiceError(null);
    isManuallyStoppedRef.current = false;

    // 1. Request microphone permission
    let stream: MediaStream;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not supported by your browser.');
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone permission denied. Please allow microphone access in your browser address bar.');
      } else {
        setVoiceError(err.message || 'Unable to access your microphone. Please check system permissions.');
      }
      setIsListening(false);
      return;
    }

    // 2. Check for native browser SpeechRecognition API
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Graceful fallback to MediaRecorder + Backend STT
      startMediaRecorderFallback(stream);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let currentFinal = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinal += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (currentFinal) {
          setText((prev) => (prev ? `${prev.trim()} ${currentFinal.trim()}` : currentFinal.trim()));
          setInterimTranscript('');
        } else if (currentInterim) {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Benign error: ignore to keep listening
          return;
        }
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone access blocked. Please permit microphone access in browser settings.');
          stopAllVoiceTracks();
        } else if (event.error === 'network') {
          // Native Web Speech network failed (e.g. offline/restricted), switch to backend STT
          recognition.abort();
          startMediaRecorderFallback(stream);
        } else {
          setVoiceError(`Voice input error (${event.error}). Switching to recording mode.`);
        }
      };

      recognition.onend = () => {
        // If ended unexpectedly while still marked listening, finish
        if (isListening && !isManuallyStoppedRef.current) {
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      // Fallback to MediaRecorder
      startMediaRecorderFallback(stream);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    if (isListening) {
      stopAllVoiceTracks();
    }
    onSendMessage(trimmed);
    setText('');
    setInterimTranscript('');
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
    <Stack spacing={1} sx={{ width: '100%' }}>
      {/* Active Voice Input Listening & Live Transcript Banner */}
      <Collapse in={isListening || isTranscribing}>
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: isTranscribing ? 'info.light' : 'error.light',
            bgcolor: isTranscribing ? 'info.50' : 'rgba(211, 47, 47, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
            {isTranscribing ? (
              <CircularProgress size={20} color="info" />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  color: '#ffffff',
                  animation: 'micPulse 1.2s infinite ease-in-out',
                  '@keyframes micPulse': {
                    '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.7)' },
                    '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 8px rgba(211, 47, 47, 0)' },
                    '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)' },
                  },
                }}
              >
                <GraphicEqIcon sx={{ fontSize: 18 }} />
              </Box>
            )}

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={700} color={isTranscribing ? 'info.main' : 'error.main'}>
                {isTranscribing
                  ? 'Transcribing speech audio...'
                  : 'Listening... Speak your question clearly into your microphone'}
              </Typography>
              {interimTranscript && (
                <Typography
                  variant="caption"
                  color="text.primary"
                  sx={{
                    fontStyle: 'italic',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  &ldquo;{interimTranscript}&rdquo;
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Finish voice input and keep text">
              <IconButton
                size="small"
                color="success"
                onClick={stopAllVoiceTracks}
                aria-label="Finish voice input"
                sx={{ bgcolor: 'success.50', '&:hover': { bgcolor: 'success.100' } }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel voice input">
              <IconButton
                size="small"
                color="default"
                onClick={() => {
                  stopAllVoiceTracks();
                  setInterimTranscript('');
                }}
                aria-label="Cancel voice input"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      </Collapse>

      {/* Voice Input Error Alert */}
      <Collapse in={Boolean(voiceError)}>
        <Alert
          severity="warning"
          onClose={() => setVoiceError(null)}
          sx={{ py: 0.5, borderRadius: 2, fontSize: 13 }}
        >
          {voiceError}
        </Alert>
      </Collapse>

      {/* Main Input Bar */}
      <Paper
        elevation={2}
        sx={{
          p: 1,
          borderRadius: 3,
          border: '1px solid',
          borderColor: isListening ? 'error.main' : 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: 'background.paper',
          transition: 'border-color 0.2s ease',
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

        {/* Text Input with Real-time value */}
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Speak now or type...' : placeholder}
          disabled={disabled || isLoading}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { px: 1, py: 0.5, fontSize: 14 },
          }}
        />

        {/* Voice Input Toggle Button */}
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
                animation: isListening ? 'micButtonPulse 1.2s infinite' : 'none',
                '@keyframes micButtonPulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.2)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}
            >
              {isListening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        {/* Send / Stop Buttons */}
        {isLoading ? (
          <Tooltip title="Stop generating">
            <IconButton
              aria-label="Stop generating"
              color="error"
              onClick={onStopGenerating}
              sx={{
                bgcolor: 'error.main',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: 'error.dark',
                },
                width: 38,
                height: 38,
                flexShrink: 0,
              }}
            >
              <StopCircleOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Send message (Enter)">
            <span>
              <IconButton
                aria-label="Send message"
                color="primary"
                onClick={handleSend}
                disabled={!text.trim() || disabled}
                sx={{
                  bgcolor: text.trim() ? 'primary.main' : 'action.disabledBackground',
                  color: text.trim() ? 'primary.contrastText' : 'action.disabled',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Paper>
    </Stack>
  );
}
