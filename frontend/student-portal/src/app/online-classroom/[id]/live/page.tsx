'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ChatIcon from '@mui/icons-material/Chat';
import PanToolIcon from '@mui/icons-material/PanTool';
import SendIcon from '@mui/icons-material/Send';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SchoolIcon from '@mui/icons-material/School';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import WifiIcon from '@mui/icons-material/Wifi';
import PollIcon from '@mui/icons-material/Poll';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import WhiteboardCanvas, { DrawStroke } from '@/features/online-classroom/components/WhiteboardCanvas';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { studentOnlineClassApi, studentOnlineClassKeys } from '@/features/online-classroom/api';
import { useAuth } from '@/features/auth/hooks';

interface ChatMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  timestamp: string;
  is_question?: boolean;
}

export default function StudentLiveClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { user } = useAuth();

  const studentDisplayName = user?.student
    ? `${user.student.first_name || ''} ${user.student.last_name || ''}`.trim()
    : user
    ? (user as any).name || `${(user as any).first_name || ''} ${(user as any).last_name || ''}`.trim() || user.email?.split('@')[0] || 'Student'
    : 'Student';
  const fallbackIdRef = useRef<string>('');
  if (!fallbackIdRef.current) {
    fallbackIdRef.current = `student-${Math.random().toString(36).substring(2, 9)}`;
  }
  const studentId = user?.id || fallbackIdRef.current;

  const { data: onlineClass, isLoading } = useQuery({
    queryKey: studentOnlineClassKeys.detail(classId),
    queryFn: () => studentOnlineClassApi.getClassDetail(classId),
    enabled: Boolean(classId),
  });

  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [externalWhiteboardStrokes, setExternalWhiteboardStrokes] = useState<DrawStroke[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isQuestionMode, setIsQuestionMode] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isClassEndedDialogOpen, setIsClassEndedDialogOpen] = useState(false);
  const [classEndedReason, setClassEndedReason] = useState<string>('');
  const [autoRedirectSeconds, setAutoRedirectSeconds] = useState(3);
  const [activeParticipantsCount, setActiveParticipantsCount] = useState(1);
  const [isMicAllowed, setIsMicAllowed] = useState(true);
  const [isCamAllowed, setIsCamAllowed] = useState(true);
  const [isChatAllowed, setIsChatAllowed] = useState(true);
  const [isWhiteboardAllowed, setIsWhiteboardAllowed] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [rosterStudents, setRosterStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [teacherDisconnectedSeconds, setTeacherDisconnectedSeconds] = useState<number | null>(null);
  const [teacherStream, setTeacherStream] = useState<MediaStream | null>(null);
  const teacherVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Waiting room status
  const [waitingStatus, setWaitingStatus] = useState<'IDLE' | 'WAITING' | 'ADMITTED'>('IDLE');

  // Interactive Poll
  const [activePoll, setActivePoll] = useState<any>(null);
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(null);

  // Multi-page Whiteboard
  const [whiteboardPageIndex, setWhiteboardPageIndex] = useState(0);

  // Network Latency
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Periodic latency ping
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'LATENCY_PING',
            payload: { timestamp: Date.now() },
          })
        );
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleVotePoll = (optionIdx: number) => {
    setSelectedPollOption(optionIdx);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'POLL_VOTE',
          payload: {
            user_id: user?.id || studentId,
            option_index: optionIdx,
          },
        })
      );
    }
  };

  useEffect(() => {
    if (teacherDisconnectedSeconds === null) return;
    if (teacherDisconnectedSeconds <= 0) {
      alert('The instructor did not reconnect in time. The class has concluded.');
      router.push('/online-classroom');
      return;
    }
    const timer = setInterval(() => {
      setTeacherDisconnectedSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [teacherDisconnectedSeconds, router]);

  // Auto-redirect countdown when teacher concludes the class for everyone
  useEffect(() => {
    if (!isClassEndedDialogOpen) return;
    if (autoRedirectSeconds <= 0) {
      router.push('/online-classroom');
      return;
    }
    const timer = setInterval(() => {
      setAutoRedirectSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isClassEndedDialogOpen, autoRedirectSeconds, router]);

  useEffect(() => {
    if (teacherVideoRef.current && teacherStream) {
      teacherVideoRef.current.srcObject = teacherStream;
    }
  }, [teacherStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream && isCameraOn) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOn]);

  // Sync initial permissions from class details
  useEffect(() => {
    if (onlineClass) {
      setIsMicAllowed(Boolean(onlineClass.allow_student_mic));
      setIsCamAllowed(Boolean(onlineClass.allow_student_cam));
      setIsChatAllowed(Boolean(onlineClass.allow_student_chat));
      setIsWhiteboardAllowed(Boolean(onlineClass.allow_student_whiteboard));
    }
  }, [onlineClass]);

  const handleToggleFullscreen = () => {
    if (typeof document !== 'undefined') {
      if (typeof document.documentElement?.requestFullscreen !== 'function') {
        setIsFullscreen(!isFullscreen);
        return;
      }
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const emitMediaState = (micState: boolean, camState: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MEDIA_STATE',
          payload: {
            isMicOn: micState,
            isCameraOn: camState,
            id: user?.id || studentIdRef.current,
            client_id: studentIdRef.current,
            name: studentDisplayNameRef.current,
          },
        })
      );
    }
  };

  const handleToggleMic = async () => {
    if (!isMicAllowed) {
      setSnackbarMessage('Microphone has been disabled by the instructor');
      return;
    }
    if (isMicOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setIsMicOn(false);
      emitMediaState(false, isCameraOn);
    } else {
      try {
        if (!localStreamRef.current) {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isCameraOn,
              });
              setLocalStream(stream);
              setIsMicOn(true);
              emitMediaState(true, isCameraOn);
              return;
            } catch (err) {
              console.warn('Microphone permission or hardware error:', err);
            }
          }
          setIsMicOn(true);
          emitMediaState(true, isCameraOn);
        } else {
          const audioTracks = localStreamRef.current.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks.forEach((t) => (t.enabled = true));
            setIsMicOn(true);
            emitMediaState(true, isCameraOn);
          } else {
            try {
              const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              audioStream.getAudioTracks().forEach((t) => localStreamRef.current?.addTrack(t));
              setIsMicOn(true);
              emitMediaState(true, isCameraOn);
            } catch {
              setIsMicOn(true);
              emitMediaState(true, isCameraOn);
            }
          }
        }
      } catch {
        setIsMicOn(true);
        emitMediaState(true, isCameraOn);
      }
    }
  };

  const handleToggleCamera = async () => {
    if (!isCamAllowed) {
      setSnackbarMessage('Camera has been disabled by the instructor');
      return;
    }
    if (isCameraOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
        const remaining = new MediaStream(localStreamRef.current.getAudioTracks());
        setLocalStream(remaining);
      }
      setIsCameraOn(false);
      emitMediaState(isMicOn, false);
    } else {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480 },
              audio: false,
            });
            const newStream = localStreamRef.current
              ? new MediaStream([...localStreamRef.current.getTracks(), ...videoStream.getVideoTracks()])
              : videoStream;
            setLocalStream(newStream);
            setIsCameraOn(true);
            emitMediaState(isMicOn, true);
            return;
          } catch (err) {
            console.warn('Camera device unavailable or permission denied:', err);
          }
        }
        if (typeof document !== 'undefined') {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          if (ctx && typeof (canvas as any).captureStream === 'function') {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(studentDisplayName, 320, 240);
            const vStream = (canvas as any).captureStream(15);
            const newStream = localStreamRef.current
              ? new MediaStream([...localStreamRef.current.getTracks(), ...vStream.getVideoTracks()])
              : vStream;
            setLocalStream(newStream);
          }
        }
        setIsCameraOn(true);
        emitMediaState(isMicOn, true);
      } catch {
        setIsCameraOn(true);
        emitMediaState(isMicOn, true);
      }
    }
  };

  const studentIdRef = useRef(studentId);
  studentIdRef.current = studentId;
  const studentDisplayNameRef = useRef(studentDisplayName);
  studentDisplayNameRef.current = studentDisplayName;

  // Update presence whenever authenticated user details hydrate
  useEffect(() => {
    if (user && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          payload: {
            id: user.id,
            user_id: user.id,
            student_id: user.student?.id,
            name: studentDisplayName,
            role: 'STUDENT',
          },
        })
      );
    }
  }, [user, studentDisplayName]);

  // WebSocket Live Hub Connection for chat, whiteboard sync & viewer count
  useEffect(() => {
    if (!classId) return;

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.hostname}:8000/api/v1/online-classes/${classId}/ws?client_id=${studentIdRef.current}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        // Announce student presence in the live room
        socket.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            payload: {
              id: studentIdRef.current,
              user_id: user?.id,
              student_id: user?.student?.id,
              name: studentDisplayNameRef.current,
              role: 'STUDENT',
            },
          })
        );
        // Request the teacher's stream
        socket.send(
          JSON.stringify({
            type: 'REQUEST_STREAM',
            payload: {},
          })
        );
      };

      socket.onmessage = async (event) => {
        try {
          const packet = JSON.parse(event.data);
          const eventType = packet.type || packet.event_type;

          switch (eventType) {
            case 'ROOM_ROSTER':
              if (typeof packet.payload?.viewer_count === 'number') {
                setActiveParticipantsCount(packet.payload.viewer_count);
              }
              break;
            case 'USER_JOINED':
              setActiveParticipantsCount((prev) => prev + 1);
              break;
            case 'USER_LEFT':
              setActiveParticipantsCount((prev) => Math.max(1, prev - 1));
              break;
            case 'WEBRTC_OFFER': {
              if (typeof window === 'undefined' || typeof window.RTCPeerConnection === 'undefined') break;
              try {
                if (peerConnectionRef.current) {
                  peerConnectionRef.current.close();
                }
                const pc = new RTCPeerConnection({
                  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                });
                peerConnectionRef.current = pc;

                pc.ontrack = (evt) => {
                  if (evt.streams && evt.streams[0]) {
                    setTeacherStream(evt.streams[0]);
                  }
                };

                pc.onicecandidate = (evt) => {
                  if (evt.candidate && socket.readyState === WebSocket.OPEN) {
                    socket.send(
                      JSON.stringify({
                        type: 'ICE_CANDIDATE',
                        target_client_id: packet.sender_client_id || packet.from,
                        payload: { candidate: evt.candidate },
                      })
                    );
                  }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(packet.payload.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(
                    JSON.stringify({
                      type: 'WEBRTC_ANSWER',
                      target_client_id: packet.sender_client_id || packet.from,
                      payload: { sdp: answer },
                    })
                  );
                }
              } catch (e) {
                console.warn('Student WebRTC offer error:', e);
              }
              break;
            }
            case 'ICE_CANDIDATE': {
              if (peerConnectionRef.current && packet.payload?.candidate) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(packet.payload.candidate)).catch(() => {});
              }
              break;
            }
            case 'CHAT_MESSAGE': {
              const chatData = packet.payload || packet.data || {};
              const incomingId = chatData.message_id || chatData.id;
              const incomingContent = chatData.content || chatData.text || '';
              const incomingSender = chatData.sender_name || chatData.senderName || 'Participant';

              setChatMessages((prev) => {
                // Deduplicate by message ID
                if (incomingId && prev.some((m) => m.id === incomingId)) {
                  return prev;
                }
                // Deduplicate if our own optimistic message was echoed back
                if (
                  incomingSender === studentDisplayName &&
                  prev.some((m) => m.sender_name === 'You' && m.content === incomingContent)
                ) {
                  return prev;
                }
                return [
                  ...prev,
                  {
                    id: incomingId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    sender_name: incomingSender,
                    sender_role: chatData.sender_role || chatData.senderRole || 'STUDENT',
                    content: incomingContent,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    is_question: Boolean(chatData.is_question),
                  },
                ];
              });
              break;
            }
            case 'WHITEBOARD_STATE': {
              const wbData = packet.payload || packet.data || {};
              const isOpen = typeof wbData.isOpen !== 'undefined' ? wbData.isOpen : wbData.is_open;
              if (typeof isOpen === 'boolean') {
                setIsWhiteboardOpen(isOpen);
              }
              break;
            }
            case 'WHITEBOARD_DRAW':
            case 'WHITEBOARD_STROKE': {
              const strokeData = packet.payload || packet.data;
              const stroke = strokeData?.stroke || strokeData;
              if (stroke && (stroke.points || stroke.type)) {
                setExternalWhiteboardStrokes((prev) => [...prev, stroke]);
              }
              break;
            }
            case 'WHITEBOARD_SHAPE': {
              const shapeData = packet.payload || packet.data;
              const shape = shapeData?.shape || shapeData;
              if (shape) {
                setExternalWhiteboardStrokes((prev) => [...prev, shape]);
              }
              break;
            }
            case 'WHITEBOARD_CLEAR':
              setExternalWhiteboardStrokes([]);
              break;
            case 'WHITEBOARD_HISTORY': {
              const historyData = packet.payload?.strokes || packet.data?.strokes || [];
              if (Array.isArray(historyData)) {
                setExternalWhiteboardStrokes(historyData);
              }
              break;
            }
            case 'SESSION_TERMINATED_DUPLICATE': {
              alert(packet.payload?.message || 'You were disconnected because you joined from another tab or device.');
              router.push('/online-classroom');
              break;
            }
            case 'KICKED': {
              if (teacherStream) {
                teacherStream.getTracks().forEach((t) => t.stop());
              }
              if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop());
              }
              setIsMicOn(false);
              setIsCameraOn(false);
              if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
              }
              try {
                socket.close();
              } catch {}
              alert(packet.payload?.reason || 'You were removed from the classroom by the instructor.');
              router.push('/online-classroom');
              break;
            }
            case 'HAND_RAISE_QUEUE': {
              const queue = packet.payload?.queue || [];
              const myId = user?.id || studentIdRef.current || user?.student?.id;
              const inQueue = queue.some(
                (h: any) =>
                  h.id === myId ||
                  h.client_id === studentIdRef.current ||
                  h.student_id === myId ||
                  h.user_id === myId ||
                  h.name === studentDisplayNameRef.current
              );
              setIsHandRaised((prev) => (inQueue ? prev : false));
              break;
            }
            case 'WAITING_ROOM_STATUS': {
              const st = packet.payload?.status;
              if (st === 'WAITING') {
                setWaitingStatus('WAITING');
              } else if (st === 'ADMITTED') {
                setWaitingStatus('ADMITTED');
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({ type: 'REQUEST_STREAM' }));
                }
              } else if (st === 'DENIED') {
                alert(packet.payload?.message || 'Admission request denied by instructor.');
                router.push('/online-classroom');
              }
              break;
            }
            case 'POLL_STARTED':
            case 'POLL_UPDATED':
            case 'POLL_CLOSED': {
              setActivePoll(packet.payload);
              break;
            }
            case 'WHITEBOARD_PAGE_CHANGED': {
              const pIdx = packet.payload?.page_index ?? 0;
              const strokes = packet.payload?.strokes || [];
              setWhiteboardPageIndex(pIdx);
              setExternalWhiteboardStrokes(strokes);
              break;
            }
            case 'LATENCY_PONG': {
              const clientTs = packet.payload?.client_timestamp;
              if (clientTs) {
                setLatencyMs(Math.max(5, Date.now() - clientTs));
              }
              break;
            }
            case 'TEACHER_DISCONNECTED': {
              const seconds = packet.payload?.grace_period_seconds || 60;
              setTeacherDisconnectedSeconds(seconds);
              break;
            }
            case 'TEACHER_RECONNECTED': {
              setTeacherDisconnectedSeconds(null);
              break;
            }
            case 'PERMISSIONS_UPDATED': {
              const perms = packet.payload || {};
              if ('allow_student_mic' in perms || 'allowMic' in perms) {
                const newMic = Boolean(perms.allow_student_mic ?? perms.allowMic);
                setIsMicAllowed(newMic);
                if (!newMic) {
                  setIsMicOn(false);
                  if (localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
                  }
                  setSnackbarMessage('Instructor muted student microphones');
                }
              }
              if ('allow_student_cam' in perms || 'allowCam' in perms) {
                const newCam = Boolean(perms.allow_student_cam ?? perms.allowCam);
                setIsCamAllowed(newCam);
                if (!newCam) {
                  setIsCameraOn(false);
                  if (localStreamRef.current) {
                    localStreamRef.current.getVideoTracks().forEach((t) => {
                      t.enabled = false;
                      t.stop();
                    });
                  }
                  setSnackbarMessage('Instructor disabled student cameras');
                }
              }
              if ('allow_student_chat' in perms || 'allowChat' in perms) {
                setIsChatAllowed(Boolean(perms.allow_student_chat ?? perms.allowChat));
              }
              if ('allow_student_whiteboard' in perms || 'allowWhiteboard' in perms) {
                setIsWhiteboardAllowed(Boolean(perms.allow_student_whiteboard ?? perms.allowWhiteboard));
              }
              break;
            }
            case 'MUTE_ALL': {
              setIsMicOn(false);
              setIsMicAllowed(false);
              if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
              }
              emitMediaState(false, isCameraOn);
              setSnackbarMessage(packet.payload?.reason || 'The meeting host has muted and locked all student microphones');
              break;
            }
            case 'MUTE_STUDENT': {
              const p = packet.payload || {};
              const targets = [p.target_id, p.client_id, p.user_id, p.student_id, p.id, p.name].filter(Boolean).map(String);
              const myIds = [
                studentIdRef.current,
                user?.id,
                user?.student?.id,
                studentDisplayNameRef.current,
              ].filter(Boolean).map(String);

              const isTargeted = targets.some((t) =>
                myIds.some((m) => m === t || m.toLowerCase() === t.toLowerCase())
              );
              if (isTargeted) {
                setIsMicOn(false);
                setIsMicAllowed(false);
                if (localStreamRef.current) {
                  localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
                }
                emitMediaState(false, isCameraOn);
                setSnackbarMessage(p.reason || 'Your microphone was muted and locked by the meeting host');
              }
              break;
            }
            case 'ALLOW_STUDENT_MIC': {
              const p = packet.payload || {};
              const targets = [p.target_id, p.client_id, p.user_id, p.student_id, p.id, p.name].filter(Boolean).map(String);
              const myIds = [
                studentIdRef.current,
                user?.id,
                user?.student?.id,
                studentDisplayNameRef.current,
              ].filter(Boolean).map(String);

              const isTargeted = targets.some((t) =>
                myIds.some((m) => m === t || m.toLowerCase() === t.toLowerCase())
              );
              if (isTargeted) {
                setIsMicAllowed(true);
                setSnackbarMessage(p.reason || 'The instructor has permitted you to speak. You can now unmute your microphone.');
              }
              break;
            }
            case 'CLASS_ENDED': {
              const reason = packet.payload?.reason || 'The instructor has ended this online class session for all participants.';
              if (teacherStream) {
                teacherStream.getTracks().forEach((t) => t.stop());
              }
              if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop());
              }
              setIsMicOn(false);
              setIsCameraOn(false);
              if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
              }
              setClassEndedReason(reason);
              setIsClassEndedDialogOpen(true);
              break;
            }
            default:
              break;
          }
        } catch {
          // Ignore invalid packets
        }
      };

      return () => {
        socket.close();
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
      };
    } catch {
      // Offline fallback
    }
  }, [classId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (typeof chatEndRef.current?.scrollIntoView === 'function') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const toggleHandRaise = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: next ? 'HAND_RAISE' : 'HAND_LOWER',
          payload: {
            id: user?.id || studentId,
            student_id: user?.student?.id,
            name: studentDisplayName,
          },
        })
      );
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !isChatAllowed) return;
    const finalContent = isQuestionMode ? `[QUESTION] ${chatInput.trim()}` : chatInput.trim();
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const msg: ChatMessage = {
      id: msgId,
      sender_name: 'You',
      sender_role: 'STUDENT',
      content: finalContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_question: isQuestionMode,
    };
    setChatMessages((prev) => [...prev, msg]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          event_type: 'CHAT_MESSAGE',
          payload: {
            message_id: msgId,
            text: msg.content,
            senderName: studentDisplayName,
            senderRole: 'STUDENT',
            is_question: isQuestionMode,
          },
          data: {
            message_id: msgId,
            content: msg.content,
            sender_name: studentDisplayName,
            sender_role: 'STUDENT',
            is_question: isQuestionMode,
          },
        })
      );
    }
    setChatInput('');
    setIsQuestionMode(false);
  };

  const sendReaction = (emoji: string) => {
    if (!isChatAllowed) return;
    const msgId = `rxn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const msg: ChatMessage = {
      id: msgId,
      sender_name: 'You',
      sender_role: 'STUDENT',
      content: emoji,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, msg]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          event_type: 'CHAT_MESSAGE',
          payload: {
            message_id: msgId,
            text: emoji,
            senderName: studentDisplayName,
            senderRole: 'STUDENT',
          },
          data: {
            message_id: msgId,
            content: emoji,
            sender_name: studentDisplayName,
            sender_role: 'STUDENT',
          },
        })
      );
    }
  };

  const handleLeaveMeeting = () => {
    router.push('/online-classroom');
  };

  const meetingView = (
    <Box
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        height: isFullscreen ? '100vh' : 'calc(100vh - 120px)',
        width: isFullscreen ? '100vw' : '100%',
        bgcolor: '#0f172a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isFullscreen ? 1400 : 1,
        overflow: 'hidden',
        borderRadius: isFullscreen ? 0 : 3,
        border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isFullscreen ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* 1. Top Broadcast Header Bar */}
      <Box
        sx={{
          height: 60,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          bgcolor: '#1e293b',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: { xs: 160, sm: 320, md: 450 },
            }}
          >
            {onlineClass?.title || 'Live Online Classroom'}
          </Typography>

          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: 10, color: '#ff1744 !important' }} />}
            label="LIVE"
            size="small"
            color="error"
            sx={{ fontWeight: 700, height: 22 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {latencyMs !== null && (
            <Chip
              icon={<WifiIcon sx={{ fontSize: 13, color: `${latencyMs < 150 ? '#22c55e' : latencyMs < 400 ? '#f59e0b' : '#ef4444'} !important` }} />}
              label={`${latencyMs}ms`}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                color: latencyMs < 150 ? '#22c55e' : latencyMs < 400 ? '#f59e0b' : '#ef4444',
                fontWeight: 600,
                fontSize: 11,
              }}
            />
          )}

          {/* Live Viewer Counter */}
          <Chip
            icon={<VisibilityIcon sx={{ fontSize: 16, color: '#38bdf8 !important' }} />}
            label={`${activeParticipantsCount} Watching`}
            size="small"
            sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}
          />

          <Typography variant="body2" sx={{ color: '#94a3b8', display: { xs: 'none', md: 'block' } }}>
            Teacher: <strong style={{ color: '#e2e8f0' }}>{onlineClass?.teacher_name || 'Host'}</strong>
          </Typography>

          {/* Fullscreen Button */}
          <Tooltip title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}>
            <IconButton
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }}
              size="small"
            >
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Chat Toggle button */}
          <Tooltip title={isChatOpen ? 'Hide Live Chat' : 'Show Live Chat'}>
            <IconButton
              onClick={() => setIsChatOpen(!isChatOpen)}
              aria-label="Toggle Chat"
              sx={{ color: isChatOpen ? '#38bdf8' : '#94a3b8', bgcolor: 'rgba(255,255,255,0.05)' }}
              size="small"
            >
              <ChatIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 2. Main Body: Cinema Player (Left) + Persistent Live Chat Stream (Right) */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Cinema Video / Whiteboard Stage (75% on Desktop) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2.5 }, minWidth: 0, overflow: 'hidden' }}>
          {teacherDisconnectedSeconds !== null && (
            <Box
              data-testid="teacher-disconnect-banner"
              sx={{
                bgcolor: '#78350f',
                border: '1px solid #f59e0b',
                color: '#fef3c7',
                px: 2,
                py: 1.25,
                mb: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#f59e0b',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Instructor temporarily disconnected. Waiting for reconnection...
                </Typography>
              </Box>
              <Chip
                label={`${teacherDisconnectedSeconds}s grace remaining`}
                size="small"
                sx={{ bgcolor: '#d97706', color: '#fff', fontWeight: 700 }}
              />
            </Box>
          )}

          <Box
            sx={{
              flex: 1,
              bgcolor: '#020617',
              borderRadius: 3,
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isWhiteboardOpen ? (
              <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <WhiteboardCanvas
                  isReadOnly={!isWhiteboardAllowed}
                  externalStrokes={externalWhiteboardStrokes}
                  onStrokeComplete={(stroke) => {
                    if (!isWhiteboardAllowed) return;
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(
                        JSON.stringify({
                          type: 'WHITEBOARD_STROKE',
                          payload: stroke,
                          data: stroke,
                          page_index: whiteboardPageIndex,
                        })
                      );
                    }
                  }}
                />
                <Chip
                  label={
                    isWhiteboardAllowed
                      ? 'Teacher Whiteboard (Collaboration Allowed)'
                      : 'Teacher Whiteboard Presentation (View Only)'
                  }
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    bgcolor: 'rgba(15, 23, 42, 0.85)',
                    color: isWhiteboardAllowed ? '#4caf50' : '#38bdf8',
                    fontWeight: 600,
                    border: isWhiteboardAllowed
                      ? '1px solid rgba(76, 175, 80, 0.4)'
                      : '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                />
                {teacherStream && (
                  <Box
                    data-testid="whiteboard-pip-container"
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      width: { xs: 140, sm: 220, md: 260 },
                      height: { xs: 80, sm: 130, md: 155 },
                      bgcolor: '#090d16',
                      borderRadius: 2,
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
                      border: '2px solid rgba(56, 189, 248, 0.5)',
                      zIndex: 20,
                    }}
                  >
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(el) => {
                        if (el && teacherStream) {
                          el.srcObject = teacherStream;
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 6,
                        left: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        bgcolor: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                      <Typography sx={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>
                        {onlineClass?.teacher_name || 'Teacher'} • Live
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  p: { xs: 1, sm: 2 },
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(auto-fit, minmax(280px, 1fr))',
                  },
                  gap: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflowY: 'auto',
                }}
              >
                {/* Tile 1: Instructor / Teacher Tile */}
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: { xs: 200, sm: 280 },
                    bgcolor: '#090d16',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {teacherStream ? (
                    <video
                      ref={teacherVideoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <Avatar sx={{ width: 80, height: 80, bgcolor: '#1e293b', mb: 2, mx: 'auto', border: '2px solid #38bdf8' }}>
                        <SchoolIcon sx={{ fontSize: 44, color: '#38bdf8' }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
                        {onlineClass?.teacher_name || 'Teacher'}
                      </Typography>
                      <Chip label="Instructor (Host)" size="small" color="primary" sx={{ fontWeight: 600, fontSize: 11 }} />
                    </Box>
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      bgcolor: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                    <Typography variant="caption" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      {onlineClass?.teacher_name || 'Teacher'} (Host)
                    </Typography>
                  </Box>
                </Box>

                {/* Tile 2: Student Video Tile (You) */}
                <Box
                  data-testid="student-self-tile"
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: { xs: 200, sm: 280 },
                    bgcolor: '#0f172a',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: isCameraOn ? '2px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCameraOn && localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)',
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.dark', mb: 2, mx: 'auto', fontSize: 32, fontWeight: 700 }}>
                        {studentDisplayName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
                        {studentDisplayName}
                      </Typography>
                      <Chip
                        label={isCamAllowed ? 'Camera Off' : 'Camera Disabled'}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.08)',
                          color: isCamAllowed ? '#94a3b8' : '#ef4444',
                          fontWeight: 500,
                          fontSize: 11,
                        }}
                      />
                    </Box>
                  )}

                  {/* Student Tile Status Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      bgcolor: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: isMicOn ? '#22c55e' : '#ef4444',
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                      {studentDisplayName} (You)
                    </Typography>
                    {isMicOn ? (
                      <MicIcon sx={{ fontSize: 13, color: '#22c55e' }} />
                    ) : (
                      <MicOffIcon sx={{ fontSize: 13, color: '#ef4444' }} />
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            {/* Hand Raised Floating Alert */}
            {isHandRaised && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  bgcolor: '#facc15',
                  color: '#000',
                  px: 2,
                  py: 0.75,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  fontWeight: 700,
                  fontSize: 13,
                  zIndex: 20,
                }}
              >
                <PanToolIcon sx={{ fontSize: 16 }} />
                Hand Raised
              </Box>
            )}

            {/* Waiting Room Overlay */}
            {waitingStatus === 'WAITING' && (
              <Box
                data-testid="student-waiting-room"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(2, 6, 23, 0.95)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                  textAlign: 'center',
                  zIndex: 35,
                }}
              >
                <CircularProgress sx={{ color: '#f59e0b', mb: 3 }} size={48} thickness={4} />
                <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                  You're in the Waiting Room
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 440, mb: 2 }}>
                  Please wait, your instructor ({onlineClass?.teacher_name || 'Host'}) will admit you to the live classroom shortly.
                </Typography>
                <Chip
                  label="Host will let you in soon"
                  size="small"
                  sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600 }}
                />
              </Box>
            )}

            {/* Student Live Poll Overlay Card */}
            {activePoll && (
              <Paper
                elevation={8}
                data-testid="student-active-poll"
                sx={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  width: 300,
                  bgcolor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: 2.5,
                  p: 2,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  zIndex: 40,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <PollIcon sx={{ color: '#38bdf8', fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                      Live Poll
                    </Typography>
                  </Box>
                  {!activePoll.is_active && (
                    <Chip label="Closed" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: 10, fontWeight: 700 }} />
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, mb: 1.5 }}>
                  {activePoll.question}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {activePoll.options?.map((opt: any, idx: number) => {
                    const totalVotes = activePoll.options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0);
                    const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                    const isSelected = selectedPollOption === idx;

                    return (
                      <Box
                        key={idx}
                        onClick={() => activePoll.is_active && handleVotePoll(idx)}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                          cursor: activePoll.is_active ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          '&:hover': activePoll.is_active ? { bgcolor: 'rgba(56, 189, 248, 0.12)' } : {},
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#f1f5f9', fontWeight: isSelected ? 700 : 500 }}>
                            {opt.text}
                          </Typography>
                          {(selectedPollOption !== null || !activePoll.is_active) && (
                            <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700 }}>
                              {pct}%
                            </Typography>
                          )}
                        </Box>
                        {(selectedPollOption !== null || !activePoll.is_active) && (
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 1 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            )}
          </Box>

          {/* Interactive Meeting Bottom Controls Bar */}
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: '#1e293b',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            {/* Left: Interactive Media & Classroom Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Mic Toggle Button */}
              <Tooltip title={!isMicAllowed ? 'Microphone disabled by instructor' : isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}>
                <span>
                  <IconButton
                    onClick={handleToggleMic}
                    disabled={!isMicAllowed}
                    aria-label={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                    sx={{
                      bgcolor: !isMicAllowed ? 'rgba(239, 68, 68, 0.15)' : isMicOn ? '#22c55e' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: !isMicAllowed ? 'rgba(239, 68, 68, 0.25)' : isMicOn ? '#16a34a' : 'rgba(255,255,255,0.2)',
                      },
                      '&.Mui-disabled': {
                        color: '#ef4444',
                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                      },
                    }}
                  >
                    {isMicOn ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>

              {/* Camera Toggle Button */}
              <Tooltip title={!isCamAllowed ? 'Camera disabled by instructor' : isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}>
                <span>
                  <IconButton
                    onClick={handleToggleCamera}
                    disabled={!isCamAllowed}
                    aria-label={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                    sx={{
                      bgcolor: !isCamAllowed ? 'rgba(239, 68, 68, 0.15)' : isCameraOn ? 'primary.main' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: !isCamAllowed ? 'rgba(239, 68, 68, 0.25)' : isCameraOn ? 'primary.dark' : 'rgba(255,255,255,0.2)',
                      },
                      '&.Mui-disabled': {
                        color: '#ef4444',
                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                      },
                    }}
                  >
                    {isCameraOn ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>

              {/* Raise Hand Button */}
              <Tooltip title={isHandRaised ? 'Lower Hand' : 'Raise Hand to Ask Question'}>
                <Button
                  variant={isHandRaised ? 'contained' : 'outlined'}
                  color={isHandRaised ? 'warning' : 'inherit'}
                  size="small"
                  startIcon={<PanToolIcon sx={{ fontSize: 16 }} />}
                  onClick={toggleHandRaise}
                  aria-label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    color: isHandRaised ? '#000' : '#e2e8f0',
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  {isHandRaised ? 'Hand Raised' : 'Raise Hand'}
                </Button>
              </Tooltip>
            </Box>

            {/* Center: Quick Emoji Reactions */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5 }}>
              {['👍', '💡', '❓', '👏'].map((emoji) => (
                <IconButton
                  key={emoji}
                  size="small"
                  onClick={() => sendReaction(emoji)}
                  sx={{
                    fontSize: 18,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                  }}
                >
                  {emoji}
                </IconButton>
              ))}
            </Box>

            {/* Right: Leave Meeting */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<CallEndIcon />}
                onClick={() => setIsLeaveDialogOpen(true)}
                aria-label="Leave Meeting"
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                Leave Meeting
              </Button>
            </Box>
          </Box>
        </Box>

        {/* 3. Persistent Live Chat & Questions Stream (Right Panel - 360px on Desktop) */}
        {isChatOpen && (
          <Paper
            variant="outlined"
            sx={{
              width: { xs: '100%', md: 360 },
              bgcolor: '#1e293b',
              color: '#fff',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              borderRight: 'none',
              borderTop: 'none',
              borderBottom: 'none',
              borderRadius: 0,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 30,
            }}
          >
            {/* Chat Panel Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ChatIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                  In-Class Chat
                </Typography>
                <Chip
                  label={`${chatMessages.length}`}
                  size="small"
                  sx={{ height: 20, bgcolor: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11 }}
                />
              </Box>

              <Tooltip title="Close chat panel">
                <IconButton size="small" onClick={() => setIsChatOpen(false)} sx={{ color: '#94a3b8' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Chat Notice / Mute Status */}
            {!isChatAllowed && (
              <Alert severity="warning" sx={{ m: 1.5, py: 0.5, borderRadius: 2 }}>
                Teacher has muted chat for this session.
              </Alert>
            )}

            {/* Chat Messages Feed */}
            <Box sx={{ flex: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {chatMessages.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <QuestionAnswerIcon sx={{ fontSize: 44, color: '#475569', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Welcome to the live lecture!
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Send questions or comments to the teacher and class.
                  </Typography>
                </Box>
              ) : (
                chatMessages.map((msg) => {
                  const isTeacher = msg.sender_role === 'TEACHER';
                  const isYou = msg.sender_name === 'You';

                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: isTeacher
                          ? 'rgba(56, 189, 248, 0.12)'
                          : msg.is_question
                          ? 'rgba(250, 204, 21, 0.12)'
                          : isYou
                          ? 'rgba(255,255,255,0.06)'
                          : '#0f172a',
                        border: isTeacher
                          ? '1px solid rgba(56, 189, 248, 0.25)'
                          : msg.is_question
                          ? '1px solid rgba(250, 204, 21, 0.3)'
                          : '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: isTeacher ? '#38bdf8' : isYou ? '#cbd5e1' : '#94a3b8',
                            }}
                          >
                            {msg.sender_name}
                          </Typography>
                          {isTeacher && (
                            <Chip label="Host" size="small" color="primary" sx={{ height: 16, fontSize: 9, fontWeight: 700 }} />
                          )}
                          {msg.is_question && (
                            <Chip label="Question" size="small" color="warning" sx={{ height: 16, fontSize: 9, fontWeight: 700 }} />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>
                          {msg.timestamp}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#f1f5f9', wordBreak: 'break-word', fontSize: 13.5 }}>
                        {msg.content}
                      </Typography>
                    </Box>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </Box>

            {/* Chat Input & Question Mode Toggle */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: '#1e293b' }}>
              {!isChatAllowed && (
                <Alert
                  severity="warning"
                  data-testid="student-chat-disabled-banner"
                  sx={{
                    mb: 1.5,
                    py: 0.25,
                    fontSize: 12,
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    color: '#fde68a',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  Chat has been disabled by the instructor for this class.
                </Alert>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Chip
                  icon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
                  label="Ask as Question"
                  size="small"
                  clickable={isChatAllowed}
                  onClick={() => isChatAllowed && setIsQuestionMode(!isQuestionMode)}
                  color={isQuestionMode ? 'warning' : 'default'}
                  variant={isQuestionMode ? 'filled' : 'outlined'}
                  disabled={!isChatAllowed}
                  sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                />
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {isChatAllowed ? 'Press Enter to send' : 'Chat locked'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={isChatAllowed ? (isQuestionMode ? 'Type your question...' : 'Send a message...') : 'Chat is disabled by teacher'}
                  disabled={!isChatAllowed}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isChatAllowed) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      bgcolor: '#0f172a',
                      borderRadius: 2,
                      fontSize: 13,
                      '& fieldset': { borderColor: isQuestionMode ? '#facc15' : 'rgba(255,255,255,0.1)' },
                      '&:hover fieldset': { borderColor: isQuestionMode ? '#facc15' : 'rgba(255,255,255,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: isQuestionMode ? '#facc15' : '#38bdf8' },
                    },
                  }}
                />
                <IconButton
                  color={isQuestionMode ? 'warning' : 'primary'}
                  disabled={!chatInput.trim() || !isChatAllowed}
                  onClick={handleSendMessage}
                  aria-label="Send message"
                  sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', borderRadius: 2 }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {/* 4. Leave Stream Confirmation Dialog */}
      <Dialog
        open={isLeaveDialogOpen}
        onClose={() => setIsLeaveDialogOpen(false)}
        disableRestoreFocus
        sx={{ zIndex: 10000 }}
        PaperProps={{ sx: { bgcolor: '#1e293b', color: '#fff', borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Leave Online Classroom?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Are you sure you want to disconnect from this live lecture? You can re-join anytime while the stream is active.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsLeaveDialogOpen(false)} sx={{ color: '#94a3b8' }}>
            Stay in Stream
          </Button>
          <Button variant="contained" color="error" onClick={handleLeaveMeeting} sx={{ borderRadius: 2 }}>
            Leave Class
          </Button>
        </DialogActions>
      </Dialog>

      {/* 5. Class Concluded by Instructor Dialog */}
      <Dialog
        open={isClassEndedDialogOpen}
        disableEscapeKeyDown
        sx={{ zIndex: 10001 }}
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            p: 1,
            minWidth: { xs: 300, sm: 420 },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <SchoolIcon sx={{ color: '#38bdf8' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Class Session Concluded
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: '#cbd5e1', mb: 1 }}>
            {classEndedReason || 'The instructor has ended this online class session for all participants.'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Redirecting to classroom dashboard in {autoRedirectSeconds} seconds...
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => router.push('/online-classroom')}
            sx={{
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' },
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Return to Dashboard
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={3500}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );

  if (isFullscreen) {
    return <RequireRole roles={[ROLES.STUDENT]}>{meetingView}</RequireRole>;
  }

  return (
    <RequireRole roles={[ROLES.STUDENT]}>
      <AppShell>
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {meetingView}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
