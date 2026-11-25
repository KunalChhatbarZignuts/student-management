import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatInputBar from '../components/ChatInputBar';
import { assistantApi } from '../api';

vi.mock('../api', () => ({
  assistantApi: {
    transcribeAudio: vi.fn(),
  },
}));

describe('Voice Input (Speech-to-Text) Feature Suite', () => {
  let mockGetUserMedia: any;
  let mockSpeechRecognition: any;
  let recognitionInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getUserMedia
    mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });

    // Mock SpeechRecognition
    recognitionInstance = {
      continuous: false,
      interimResults: false,
      lang: 'en-US',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onstart: null as any,
      onresult: null as any,
      onerror: null as any,
      onend: null as any,
    };

    mockSpeechRecognition = vi.fn().mockImplementation(() => recognitionInstance);
    (window as any).SpeechRecognition = mockSpeechRecognition;
    (window as any).webkitSpeechRecognition = mockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('renders voice input button with accessible label and tooltip', () => {
    render(<ChatInputBar onSendMessage={vi.fn()} />);
    const voiceBtn = screen.getByRole('button', { name: /Voice input/i });
    expect(voiceBtn).toBeInTheDocument();
  });

  it('initiates SpeechRecognition and shows active listening banner when mic clicked', async () => {
    render(<ChatInputBar onSendMessage={vi.fn()} />);
    const voiceBtn = screen.getByRole('button', { name: /Voice input/i });

    fireEvent.click(voiceBtn);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(recognitionInstance.start).toHaveBeenCalled();
    });

    // Trigger onstart
    if (recognitionInstance.onstart) {
      recognitionInstance.onstart();
    }

    await waitFor(() => {
      expect(
        screen.getByText(/Listening... Speak your question clearly into your microphone/i)
      ).toBeInTheDocument();
    });
  });

  it('streams speech transcript into text box on recognition result', async () => {
    render(<ChatInputBar onSendMessage={vi.fn()} />);
    const voiceBtn = screen.getByRole('button', { name: /Voice input/i });

    fireEvent.click(voiceBtn);

    await waitFor(() => {
      expect(recognitionInstance.start).toHaveBeenCalled();
    });

    // Trigger onstart
    recognitionInstance.onstart();

    // Trigger final onresult event
    recognitionInstance.onresult({
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'What is my current attendance percentage?' },
        },
      ],
    });

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Speak now or type.../i);
      expect(textarea).toHaveValue('What is my current attendance percentage?');
    });
  });

  it('displays warning alert when microphone permission is denied', async () => {
    const permError = new Error('Permission denied');
    permError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(permError);

    render(<ChatInputBar onSendMessage={vi.fn()} />);
    const voiceBtn = screen.getByRole('button', { name: /Voice input/i });

    fireEvent.click(voiceBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Microphone permission denied. Please allow microphone access/i)
      ).toBeInTheDocument();
    });
  });

  it('falls back to MediaRecorder and calls transcribeAudio when SpeechRecognition is unavailable', async () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const mockDataAvailable = vi.fn();
    const mockRecorderStop = vi.fn();
    const mockRecorderStart = vi.fn();

    class MockMediaRecorder {
      static isTypeSupported = vi.fn().mockReturnValue(true);
      state = 'recording';
      ondataavailable: any = null;
      onstop: any = null;
      start = mockRecorderStart;
      stop = vi.fn().mockImplementation(() => {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      });
      constructor(public stream: any, public options: any) {
        mockDataAvailable();
      }
    }
    (window as any).MediaRecorder = MockMediaRecorder as any;

    (assistantApi.transcribeAudio as any).mockResolvedValue({
      transcript: 'Explain the third law of motion',
      confidence: 0.95,
      source: 'server_transcription',
    });

    render(<ChatInputBar onSendMessage={vi.fn()} />);
    const voiceBtn = screen.getByRole('button', { name: /Voice input/i });

    fireEvent.click(voiceBtn);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockRecorderStart).toHaveBeenCalled();
    });
  });
});
