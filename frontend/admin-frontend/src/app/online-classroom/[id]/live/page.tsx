'use client';

import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SchoolIcon from '@mui/icons-material/School';
import WifiIcon from '@mui/icons-material/Wifi';
import PollIcon from '@mui/icons-material/Poll';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import PanToolIcon from '@mui/icons-material/PanTool';
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { teacherOnlineClassApi, adminOnlineClassApi, onlineClassroomKeys } from '@/features/online-classroom/api';
import VideoTile from '@/features/online-classroom/components/live/VideoTile';
import WhiteboardCanvas, { DrawStroke } from '@/features/online-classroom/components/live/WhiteboardCanvas';
import MeetingControlsBar from '@/features/online-classroom/components/live/MeetingControlsBar';
import ParticipantsDrawer, {
  ParticipantItem,
  WaitingStudent,
  HandRaiseItem,
} from '@/features/online-classroom/components/live/ParticipantsDrawer';
import InClassChatDrawer, { ChatMessage } from '@/features/online-classroom/components/live/InClassChatDrawer';
import MeetingSettingsDialog from '@/features/online-classroom/components/live/MeetingSettingsDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function LiveClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const classId = params.id as string;
  const isObserver = searchParams?.get('mode') === 'observer';
  const dashboardPath = isObserver ? '/admin/online-classroom' : '/online-classroom';

  // Class detail query (switches to admin endpoint when observing to prevent 403)
  const { data: classDetail, isLoading: loadingClass, error } = useQuery({
    queryKey: [...onlineClassroomKeys.detail(classId), isObserver ? 'observer' : 'teacher'],
    queryFn: () => (isObserver ? adminOnlineClassApi.getClassDetail(classId) : teacherOnlineClassApi.getClassDetail(classId)),
    enabled: Boolean(classId),
  });

  // Media states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const isWhiteboardOpenRef = useRef(false);
  useEffect(() => {
    isWhiteboardOpenRef.current = isWhiteboardOpen;
  }, [isWhiteboardOpen]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [teacherStream, setTeacherStream] = useState<MediaStream | null>(null);
  const teacherStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    teacherStreamRef.current = teacherStream;
  }, [teacherStream]);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const observerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Initialize teacher's camera/microphone stream (with virtual canvas lecture fallback)
  useEffect(() => {
    if (isObserver) return;
    let active = true;
    let streamToClean: MediaStream | null = null;

    const startTeacherMedia = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: 1280, height: 720 },
              audio: true,
            });
            if (active) {
              setLocalStream(stream);
              streamToClean = stream;
              return;
            }
          } catch (e) {
            // Permission denied or no camera hardware: fallback to animated canvas stream
          }
        }

        if (typeof document !== 'undefined') {
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          const ctx = canvas.getContext('2d');
          if (ctx && typeof (canvas as any).captureStream === 'function') {
            let animId = 0;
            const renderCanvas = () => {
              if (!active) return;
              const grad = ctx.createLinearGradient(0, 0, 1280, 720);
              grad.addColorStop(0, '#090d16');
              grad.addColorStop(1, '#1e293b');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, 1280, 720);

              // Grid lines
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
              ctx.lineWidth = 1;
              for (let x = 0; x < 1280; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, 720);
                ctx.stroke();
              }

              // Teacher Title & Live Badge
              ctx.fillStyle = '#38bdf8';
              ctx.font = 'bold 38px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('ONLINE CLASSROOM LIVE STREAM', 640, 310);

              ctx.fillStyle = '#e2e8f0';
              ctx.font = '600 24px sans-serif';
              ctx.fillText(classDetail?.title || 'Interactive Virtual Class', 640, 360);

              ctx.fillStyle = '#94a3b8';
              ctx.font = '18px sans-serif';
              ctx.fillText(`Instructor: ${classDetail?.teacher_name || 'Host'} • Broadcasting HD`, 640, 400);

              // Pulsing live dot
              const pulse = (Math.sin(Date.now() / 250) + 1) / 2;
              ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
              ctx.beginPath();
              ctx.arc(580, 450, 8, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#ef4444';
              ctx.font = 'bold 16px sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText(`LIVE • ${new Date().toLocaleTimeString()}`, 600, 456);

              animId = requestAnimationFrame(renderCanvas);
            };
            animId = requestAnimationFrame(renderCanvas);
            const stream = (canvas as any).captureStream(30);
            if (active) {
              setLocalStream(stream);
              streamToClean = stream;
            }
          }
        }
      } catch (err) {
        // Fallback catch
      }
    };

    startTeacherMedia();

    return () => {
      active = false;
      if (streamToClean) {
        streamToClean.getTracks().forEach((t) => t.stop());
      }
    };
  }, [classDetail?.title, classDetail?.teacher_name]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setScreenStream(stream);
          setIsScreenSharing(true);
          const track = stream.getVideoTracks()[0];
          if (track) {
            track.onended = () => {
              setIsScreenSharing(false);
              setScreenStream(null);
            };
          }
        } else {
          setIsScreenSharing(true);
        }
      } catch {
        setIsScreenSharing(false);
      }
    }
  };

  const handleToggleWhiteboard = () => {
    setIsWhiteboardOpen((prev) => {
      const nextState = !prev;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'WHITEBOARD_STATE',
            payload: { isOpen: nextState },
            data: { is_open: nextState, isOpen: nextState },
          })
        );
      }
      return nextState;
    });
  };

  const handleStrokeComplete = (stroke: DrawStroke) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'WHITEBOARD_DRAW',
          payload: stroke,
          data: { stroke },
        })
      );
    }
  };

  const handleClearBoard = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'WHITEBOARD_CLEAR',
          payload: {},
          data: {},
        })
      );
    }
  };

  // Drawer states
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);

  // Time & Chat state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Synced whiteboard strokes
  const [teacherWhiteboardStrokes, setTeacherWhiteboardStrokes] = useState<DrawStroke[]>([]);

  // Waiting room & Knocking state
  const [waitingStudents, setWaitingStudents] = useState<WaitingStudent[]>([]);
  const [isWaitingRoomEnabled, setIsWaitingRoomEnabled] = useState(false);

  // Hand-raise queue
  const [handRaises, setHandRaises] = useState<HandRaiseItem[]>([]);

  // Live Polls
  const [activePoll, setActivePoll] = useState<any>(null);
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['Option A', 'Option B']);

  // Multi-page whiteboard
  const [whiteboardPageIndex, setWhiteboardPageIndex] = useState(0);
  const [whiteboardTotalPages, setWhiteboardTotalPages] = useState(1);

  // Network quality & latency
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Class ended by host state
  const [classEndedReason, setClassEndedReason] = useState<string | null>(null);
  const [isClassEndedDialogOpen, setIsClassEndedDialogOpen] = useState(false);
  const [classEndedCountdown, setClassEndedCountdown] = useState(3);

  const handleExitToDashboard = () => {
    queryClient.invalidateQueries({ queryKey: onlineClassroomKeys.all });
    router.push(dashboardPath);
  };

  // Auto-redirect countdown when class is ended by host
  useEffect(() => {
    if (!isClassEndedDialogOpen) return;
    const interval = setInterval(() => {
      setClassEndedCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: onlineClassroomKeys.all });
          router.push(dashboardPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isClassEndedDialogOpen, router, dashboardPath, queryClient]);

  // Simulated participants list (seeded from actual class participants)
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  // Classroom dynamic permissions state
  const [permissions, setPermissions] = useState({
    allowMic: true,
    allowCam: true,
    allowChat: true,
    allowWhiteboard: false,
  });

  useEffect(() => {
    if (classDetail) {
      setPermissions({
        allowMic: Boolean(classDetail.allow_student_mic),
        allowCam: Boolean(classDetail.allow_student_cam),
        allowChat: Boolean(classDetail.allow_student_chat),
        allowWhiteboard: Boolean(classDetail.allow_student_whiteboard),
      });
    }
  }, [classDetail]);

  const handleUpdatePermissions = (newPerms: {
    allowMic: boolean;
    allowCam: boolean;
    allowChat: boolean;
    allowWhiteboard: boolean;
  }) => {
    setPermissions(newPerms);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_PERMISSIONS',
          payload: {
            allowMic: newPerms.allowMic,
            allowCam: newPerms.allowCam,
            allowChat: newPerms.allowChat,
            allowWhiteboard: newPerms.allowWhiteboard,
            allow_student_mic: newPerms.allowMic,
            allow_student_cam: newPerms.allowCam,
            allow_student_chat: newPerms.allowChat,
            allow_student_whiteboard: newPerms.allowWhiteboard,
          },
        })
      );
    }
  };

  const wsRef = useRef<WebSocket | null>(null);

  // Periodic latency measurement
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

  const handleAdmitStudent = (targetClientId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'ADMIT_STUDENT',
          payload: { client_id: targetClientId },
        })
      );
    }
    setWaitingStudents((prev) => prev.filter((s) => s.client_id !== targetClientId));
  };

  const handleDenyStudent = (targetClientId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'DENY_STUDENT',
          payload: { client_id: targetClientId },
        })
      );
    }
    setWaitingStudents((prev) => prev.filter((s) => s.client_id !== targetClientId));
  };

  const handleAdmitAll = () => {
    waitingStudents.forEach((ws) => {
      handleAdmitStudent(ws.client_id);
    });
  };

  const handleLowerHand = (studentId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'HAND_LOWER',
          payload: { student_id: studentId },
        })
      );
    }
    setHandRaises((prev) => prev.filter((h) => h.id !== studentId && h.client_id !== studentId));
  };

  const handleCreatePoll = () => {
    if (!newPollQuestion.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'POLL_CREATE',
          payload: {
            question: newPollQuestion,
            options: newPollOptions.filter((o) => o.trim() !== ''),
            duration_seconds: 60,
          },
        })
      );
    }
    setIsPollDialogOpen(false);
    setNewPollQuestion('');
  };

  const handleClosePoll = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'POLL_CLOSE',
          payload: {},
        })
      );
    }
  };

  const handleWhiteboardPageChange = (newPage: number) => {
    setWhiteboardPageIndex(newPage);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'WHITEBOARD_PAGE_CHANGE',
          payload: { page_index: newPage },
        })
      );
    }
  };

  const handleAddWhiteboardPage = () => {
    const nextTotal = whiteboardTotalPages + 1;
    const nextIndex = whiteboardTotalPages;
    setWhiteboardTotalPages(nextTotal);
    handleWhiteboardPageChange(nextIndex);
  };

  const handleKickParticipant = (participantId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'KICK_PARTICIPANT',
          payload: {
            client_id: participantId,
            target_client_id: participantId,
            student_id: participantId,
            id: participantId,
            reason: 'Removed by instructor',
          },
        })
      );
    }
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const handleMuteAll = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MUTE_ALL',
          payload: { reason: 'Instructor muted all participants', lock_mic: true },
        })
      );
    }
    setParticipants((prev) =>
      prev.map((p) => (p.role === 'STUDENT' ? { ...p, isMicOn: false, isMicAllowed: false } : p))
    );
  };

  const handleMuteParticipant = (participantId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MUTE_STUDENT',
          payload: {
            target_id: participantId,
            client_id: participantId,
            student_id: participantId,
            id: participantId,
            lock_mic: true,
            reason: 'Instructor muted and locked your microphone',
          },
        })
      );
    }
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, isMicOn: false, isMicAllowed: false } : p))
    );
  };

  const handleAllowParticipantMic = (participantId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'ALLOW_STUDENT_MIC',
          payload: {
            target_id: participantId,
            client_id: participantId,
            student_id: participantId,
            id: participantId,
            allow_mic: true,
            reason: 'The instructor has permitted you to speak',
          },
        })
      );
    }
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, isMicAllowed: true } : p))
    );
  };

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize teacher and observer in participants list
  useEffect(() => {
    if (classDetail) {
      setParticipants((prev) => {
        const joinedStudents = prev.filter((p) => p.role === 'STUDENT');
        const teacherItem: ParticipantItem = {
          id: classDetail.teacher_id,
          name: classDetail.teacher_name || 'Teacher (Host)',
          role: 'TEACHER',
          isMicOn: isObserver ? true : isMicOn,
          isCameraOn: isObserver ? true : isCameraOn,
          isSelf: !isObserver,
        };
        const observerItem: ParticipantItem[] = isObserver
          ? [
              {
                id: 'observer-self',
                name: 'Administrator (Observer)',
                role: 'ADMIN_OBSERVER',
                isMicOn: false,
                isCameraOn: false,
                isSelf: true,
              },
            ]
          : [];
        return [teacherItem, ...observerItem, ...joinedStudents];
      });
    }
  }, [classDetail, isObserver]);

  // Update self participant mic/cam states (only when host teacher)
  useEffect(() => {
    if (isObserver) return;
    setParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, isMicOn, isCameraOn } : p))
    );
  }, [isMicOn, isCameraOn, isObserver]);

  // WebSocket connection for in-room events
  useEffect(() => {
    if (!classId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const clientId = isObserver ? `observer-${classId}-${Date.now()}` : `teacher-${classId}`;
    // Connect to backend websocket endpoint
    const wsUrl = `${protocol}//${window.location.hostname}:8000/api/v1/online-classes/${classId}/ws?client_id=${clientId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const sendWebRtcOffer = async (targetClientId: string) => {
        if (typeof window === 'undefined' || typeof window.RTCPeerConnection === 'undefined') return;
        const stream = isScreenSharing && screenStream ? screenStream : localStream;
        if (!stream) return;

        try {
          const existing = peerConnectionsRef.current.get(targetClientId);
          if (existing) existing.close();

          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
          peerConnectionsRef.current.set(targetClientId, pc);

          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          pc.onicecandidate = (event) => {
            if (event.candidate && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'ICE_CANDIDATE',
                  target_client_id: targetClientId,
                  payload: { candidate: event.candidate },
                })
              );
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'WEBRTC_OFFER',
                target_client_id: targetClientId,
                payload: { sdp: offer },
              })
            );
          }
        } catch (e) {
          console.warn('WebRTC offer error:', e);
        }
      };

      ws.onopen = () => {
        // Announce user in room (Teacher Host or Admin Observer)
        ws.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            payload: isObserver
              ? {
                  id: clientId,
                  name: 'Administrator (Observer)',
                  role: 'ADMIN_OBSERVER',
                }
              : {
                  id: classDetail?.teacher_id || `teacher-${classId}`,
                  name: classDetail?.teacher_name || 'Teacher (Host)',
                  role: 'TEACHER',
                },
          })
        );
        if (isObserver) {
          ws.send(
            JSON.stringify({
              type: 'REQUEST_STREAM',
              payload: {},
            })
          );
        }
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          const msgType = data.type || data.event_type;

          if (msgType === 'ROOM_ROSTER') {
            const roster = data.payload?.participants || [];
            const joinedStudents: ParticipantItem[] = roster
              .filter((u: any) => u.role === 'STUDENT')
              .map((u: any) => ({
                id: u.id || u.client_id,
                name: u.name || 'Student',
                role: 'STUDENT',
                isMicOn: false,
                isCameraOn: false,
              }));
            setParticipants((prev) => {
              const teacher = prev.find((p) => p.role === 'TEACHER') || {
                id: classDetail?.teacher_id || 'teacher',
                name: classDetail?.teacher_name || 'Teacher (Host)',
                role: 'TEACHER' as const,
                isMicOn: isObserver ? true : isMicOn,
                isCameraOn: isObserver ? true : isCameraOn,
                isSelf: !isObserver,
              };
              const selfObserver: ParticipantItem[] = isObserver
                ? [
                    {
                      id: clientId,
                      name: 'Administrator (Observer)',
                      role: 'ADMIN_OBSERVER' as const,
                      isMicOn: false,
                      isCameraOn: false,
                      isSelf: true,
                    },
                  ]
                : [];
              return [teacher, ...selfObserver, ...joinedStudents];
            });

            // Offer stream to all active students in room (teacher host only)
            if (!isObserver) {
              roster.forEach((u: any) => {
                if (u.role === 'STUDENT' && u.client_id) {
                  sendWebRtcOffer(u.client_id);
                }
              });
            }
          } else if (msgType === 'USER_JOINED') {
            const user = data.payload || data.data;
            if (user && user.role === 'STUDENT') {
              const userId = user.id || user.client_id;
              const studentName = user.name || 'Student';
              setParticipants((prev) => {
                const existingIdx = prev.findIndex((p) => p.id === userId);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = { ...updated[existingIdx], name: studentName };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: userId,
                    name: studentName,
                    role: 'STUDENT',
                    isMicOn: false,
                    isCameraOn: false,
                  },
                ];
              });
              setJoinNotification(`${studentName} joined the classroom`);
              if (!isObserver && user.client_id) {
                sendWebRtcOffer(user.client_id);
              }
              if (isWhiteboardOpenRef.current && ws.readyState === WebSocket.OPEN && !isObserver) {
                ws.send(
                  JSON.stringify({
                    type: 'WHITEBOARD_STATE',
                    payload: { isOpen: true },
                    data: { is_open: true, isOpen: true },
                  })
                );
              }
            }
          } else if (msgType === 'PARTICIPANT_MEDIA_STATE') {
            const user = data.payload || data.data;
            if (user) {
              const uid = user.id || user.client_id || user.user_id || user.student_id;
              setParticipants((prev) =>
                prev.map((p) =>
                  p.id === uid || p.id === user.client_id || p.name === user.name
                    ? {
                        ...p,
                        isMicOn: typeof user.isMicOn === 'boolean' ? user.isMicOn : p.isMicOn,
                        isCameraOn: typeof user.isCameraOn === 'boolean' ? user.isCameraOn : p.isCameraOn,
                      }
                    : p
                )
              );
            }
          } else if (msgType === 'USER_LEFT') {
            const user = data.payload || data.data;
            if (user) {
              const userId = user.id || user.client_id;
              setParticipants((prev) => prev.filter((p) => p.id !== userId));
              const pc = peerConnectionsRef.current.get(user.client_id || userId);
              if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(user.client_id || userId);
              }
            }
          } else if (msgType === 'WEBRTC_OFFER' && isObserver) {
            const senderId = data.sender_client_id || data.from;
            if (typeof window !== 'undefined' && typeof window.RTCPeerConnection !== 'undefined') {
              try {
                if (observerPeerConnectionRef.current) {
                  observerPeerConnectionRef.current.close();
                }
                const pc = new RTCPeerConnection({
                  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                });
                observerPeerConnectionRef.current = pc;

                pc.ontrack = (evt) => {
                  if (evt.streams && evt.streams[0]) {
                    setTeacherStream(evt.streams[0]);
                  }
                };

                pc.onicecandidate = (event) => {
                  if (event.candidate && ws.readyState === WebSocket.OPEN) {
                    ws.send(
                      JSON.stringify({
                        type: 'ICE_CANDIDATE',
                        target_client_id: senderId,
                        payload: { candidate: event.candidate },
                      })
                    );
                  }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data.payload.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'WEBRTC_ANSWER',
                      target_client_id: senderId,
                      payload: { sdp: answer },
                    })
                  );
                }
              } catch (err) {
                console.warn('Observer WebRTC offer handling error:', err);
              }
            }
          } else if (msgType === 'WEBRTC_ANSWER') {
            const senderId = data.sender_client_id || data.from;
            const pc = peerConnectionsRef.current.get(senderId);
            if (pc && data.payload?.sdp) {
              pc.setRemoteDescription(new RTCSessionDescription(data.payload.sdp)).catch(() => { });
            }
          } else if (msgType === 'ICE_CANDIDATE') {
            const senderId = data.sender_client_id || data.from;
            if (isObserver && observerPeerConnectionRef.current && data.payload?.candidate) {
              observerPeerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.payload.candidate)).catch(() => { });
            } else {
              const pc = peerConnectionsRef.current.get(senderId);
              if (pc && data.payload?.candidate) {
                pc.addIceCandidate(new RTCIceCandidate(data.payload.candidate)).catch(() => { });
              }
            }
          } else if (msgType === 'REQUEST_STREAM') {
            const senderId = data.sender_client_id || data.from;
            if (!isObserver && senderId) {
              sendWebRtcOffer(senderId);
            }
          } else if (msgType === 'CHAT_MESSAGE') {
            const payload = data.payload || data.data || {};
            const incomingId = payload.message_id || payload.id;
            const incomingText = payload.text || payload.content || '';
            const incomingSender = payload.senderName || payload.sender_name || 'Participant';
            const teacherName = classDetail?.teacher_name || 'Teacher';

            setChatMessages((prev) => {
              if (incomingId && prev.some((m) => m.id === incomingId)) {
                return prev;
              }
              if (incomingSender === teacherName && prev.some((m) => m.isSelf && m.text === incomingText)) {
                return prev;
              }
              const newMsg: ChatMessage = {
                id: incomingId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                senderName: incomingSender,
                text: incomingText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSelf: false,
              };
              return [...prev, newMsg];
            });
            if (!isChatOpen) {
              setUnreadChatCount((prev) => prev + 1);
            }
          } else if (msgType === 'WHITEBOARD_HISTORY') {
            const historyData = data.payload?.strokes || data.data?.strokes || [];
            if (Array.isArray(historyData)) {
              setTeacherWhiteboardStrokes(historyData);
            }
          } else if (msgType === 'RECORDING_STATE') {
            const isRec = Boolean(data.payload?.isRecording ?? data.data?.isRecording);
          } else if (msgType === 'STUDENT_KNOCKING') {
            const student = data.payload;
            if (student) {
              setWaitingStudents((prev) => {
                if (prev.some((s) => s.client_id === student.client_id)) return prev;
                return [...prev, student];
              });
              setJoinNotification(`${student.name || 'A student'} is waiting to join`);
            }
          } else if (msgType === 'WAITING_ROOM_LIST') {
            const list = data.payload?.students || [];
            setWaitingStudents(list);
          } else if (msgType === 'WAITING_ROOM_CONFIG') {
            setIsWaitingRoomEnabled(Boolean(data.payload?.enabled));
          } else if (msgType === 'HAND_RAISE_QUEUE') {
            const queue = data.payload?.queue || [];
            setHandRaises(queue);
          } else if (msgType === 'PERMISSIONS_UPDATED') {
            const p = data.payload || {};
            setPermissions({
              allowMic: Boolean(p.allow_student_mic ?? p.allowMic),
              allowCam: Boolean(p.allow_student_cam ?? p.allowCam),
              allowChat: Boolean(p.allow_student_chat ?? p.allowChat),
              allowWhiteboard: Boolean(p.allow_student_whiteboard ?? p.allowWhiteboard),
            });
          } else if (msgType === 'POLL_STARTED' || msgType === 'POLL_UPDATED' || msgType === 'POLL_CLOSED') {
            setActivePoll(data.payload);
          } else if (msgType === 'WHITEBOARD_PAGE_CHANGED') {
            const pIndex = data.payload?.page_index ?? 0;
            const strokes = data.payload?.strokes || [];
            setWhiteboardPageIndex(pIndex);
            setTeacherWhiteboardStrokes(strokes);
          } else if (msgType === 'LATENCY_PONG') {
            const clientTs = data.payload?.client_timestamp;
            if (clientTs) {
              setLatencyMs(Math.max(5, Date.now() - clientTs));
            }
          } else if (msgType === 'CLASS_ENDED') {
            const reason = data.payload?.reason || 'The instructor has ended this online class session for all participants.';
            if (teacherStreamRef.current) {
              teacherStreamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (observerPeerConnectionRef.current) {
              observerPeerConnectionRef.current.close();
              observerPeerConnectionRef.current = null;
            }
            setClassEndedReason(reason);
            setIsClassEndedDialogOpen(true);
          }
        } catch (e) {
          // ignore malformed message
        }
      };

      ws.onclose = (event) => {
        if (isObserver && (event.code === 1000 || event.code === 4403)) {
          if (teacherStreamRef.current) {
            teacherStreamRef.current.getTracks().forEach((t) => t.stop());
          }
          if (observerPeerConnectionRef.current) {
            observerPeerConnectionRef.current.close();
            observerPeerConnectionRef.current = null;
          }
          setClassEndedReason('The instructor has ended this online class session for all participants.');
          setIsClassEndedDialogOpen(true);
        }
      };

      return () => {
        if (observerPeerConnectionRef.current) {
          observerPeerConnectionRef.current.close();
          observerPeerConnectionRef.current = null;
        }
        ws.close();
      };
    } catch (e) {
      // WS fallback
    }
  }, [classId, classDetail?.teacher_id, classDetail?.teacher_name]);

  // End class mutation
  const endClassMutation = useMutation({
    mutationFn: () => teacherOnlineClassApi.endClass(classId),
    onSuccess: () => {
      setLeaveConfirmOpen(false);
      router.push(dashboardPath);
    },
    onError: () => {
      setLeaveConfirmOpen(false);
      router.push(dashboardPath);
    },
  });

  const handleSendMessage = (text: string) => {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      senderName: classDetail?.teacher_name || 'Teacher',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };
    setChatMessages((prev) => [...prev, newMsg]);

    // Send through WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          payload: {
            message_id: msgId,
            senderName: classDetail?.teacher_name || 'Teacher',
            text,
          },
        })
      );
    }
  };

  const handleToggleFullscreen = () => {
    if (typeof document.documentElement?.requestFullscreen !== 'function') {
      setIsFullscreen(!isFullscreen);
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  };

  if (loadingClass) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#121212' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !classDetail) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#121212', color: '#fff', p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load online classroom session. Please check your network or room status.
        </Alert>
        <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => router.push(dashboardPath)}>
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        height: '100vh',
        width: '100vw',
        bgcolor: '#0f172a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {/* Top Meeting Header Bar */}
      <Box
        sx={{
          height: 56,
          px: { xs: 1.5, sm: 3 },
          bgcolor: '#1e1e1e',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title="Back to Dashboard">
            <IconButton onClick={() => router.push(dashboardPath)} sx={{ color: '#fff' }} size="small">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ maxWidth: { xs: 180, sm: 400 } }}>
            {classDetail.title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

          {waitingStudents.length > 0 && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={() => setIsParticipantsOpen(true)}
              sx={{ fontWeight: 700, fontSize: 11, px: 1, py: 0.25 }}
            >
              Waiting ({waitingStudents.length})
            </Button>
          )}

          {handRaises.length > 0 && (
            <Chip
              icon={<PanToolIcon sx={{ fontSize: 13, color: '#38bdf8 !important' }} />}
              label={`${handRaises.length} Hand${handRaises.length > 1 ? 's' : ''}`}
              size="small"
              color="primary"
              onClick={() => setIsParticipantsOpen(true)}
              sx={{ fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
            />
          )}

          {!isObserver && (
            <Tooltip title="Launch Live Poll">
              <IconButton
                onClick={() => setIsPollDialogOpen(true)}
                aria-label="Launch Live Poll"
                sx={{ color: activePoll?.is_active ? '#38bdf8' : '#fff', bgcolor: 'rgba(255,255,255,0.06)' }}
                size="small"
              >
                <PollIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Chip
            icon={<VisibilityIcon sx={{ fontSize: 16, color: '#38bdf8 !important' }} />}
            label={`${participants.filter((p) => p.role === 'STUDENT').length} Watching`}
            size="small"
            sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}
          />
          <Chip
            label={isObserver ? 'Observer Mode' : 'Host Mode'}
            size="small"
            color={isObserver ? 'warning' : 'primary'}
            sx={{ fontWeight: 600 }}
          />
          <Tooltip title={isFullscreen ? 'Exit full screen' : 'Full screen'}>
            <IconButton onClick={handleToggleFullscreen} sx={{ color: '#fff' }} size="small">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Video & Collaborative Stage */}
      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isWhiteboardOpen ? (
          <Box sx={{ flex: 1, height: '100%', display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, height: '100%', minWidth: 0 }}>
              <WhiteboardCanvas
                onStrokeComplete={isObserver ? () => {} : handleStrokeComplete}
                onClearBoard={isObserver ? () => {} : handleClearBoard}
                externalStrokes={teacherWhiteboardStrokes}
                pageIndex={whiteboardPageIndex}
                totalPages={whiteboardTotalPages}
                onPageChange={isObserver ? () => {} : handleWhiteboardPageChange}
                onAddPage={isObserver ? () => {} : handleAddWhiteboardPage}
                isReadOnly={isObserver}
              />
            </Box>
            <Box sx={{ width: 220, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto' }}>
              {participants.map((p) => (
                <Box key={p.id} sx={{ height: 130, minHeight: 130 }}>
                  <VideoTile
                    name={p.name}
                    isHost={p.role === 'TEACHER'}
                    isSelf={p.isSelf}
                    isCameraOn={p.isCameraOn}
                    isMicOn={p.isMicOn}
                    isSpeaking={p.isMicOn && p.isSelf}
                    videoStream={p.role === 'TEACHER' ? (isObserver ? teacherStream : localStream) : p.isSelf ? localStream : null}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ) : isScreenSharing ? (
          <Box sx={{ flex: 1, height: '100%', display: 'flex', gap: 2 }}>
            <Box
              sx={{
                flex: 1,
                height: '100%',
                bgcolor: '#000',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </Box>
            <Box sx={{ width: 220, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto' }}>
              {participants.map((p) => (
                <Box key={p.id} sx={{ height: 130, minHeight: 130 }}>
                  <VideoTile
                    name={p.name}
                    isHost={p.role === 'TEACHER'}
                    isSelf={p.isSelf}
                    isCameraOn={p.isCameraOn}
                    isMicOn={p.isMicOn}
                    isSpeaking={p.isMicOn && p.isSelf}
                    videoStream={p.role === 'TEACHER' ? (isObserver ? teacherStream : localStream) : p.isSelf ? localStream : null}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: participants.length <= 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
              },
              gridAutoRows: '1fr',
              maxHeight: '100%',
            }}
          >
            {participants.map((p) => (
              <VideoTile
                key={p.id}
                name={p.name}
                isHost={p.role === 'TEACHER'}
                isSelf={p.isSelf}
                isCameraOn={p.isCameraOn}
                isMicOn={p.isMicOn}
                isSpeaking={p.isMicOn && p.isSelf}
                videoStream={p.role === 'TEACHER' ? (isObserver ? teacherStream : localStream) : p.isSelf ? localStream : null}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Floating Bottom Action Bar */}
      <MeetingControlsBar
        roomName={classDetail.room_name}
        elapsedSeconds={elapsedSeconds}
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        isWhiteboardOpen={isWhiteboardOpen}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        participantCount={participants.length}
        unreadChatCount={unreadChatCount}
        isObserver={isObserver}
        onToggleMic={() => setIsMicOn((prev) => !prev)}
        onToggleCamera={() => setIsCameraOn((prev) => !prev)}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleWhiteboard={handleToggleWhiteboard}
        onToggleChat={() => {
          setIsChatOpen((prev) => !prev);
          setUnreadChatCount(0);
        }}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLeaveCall={() => setLeaveConfirmOpen(true)}
      />

      {/* Drawers & Dialogs */}
      <ParticipantsDrawer
        open={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={participants}
        waitingStudents={isObserver ? [] : waitingStudents}
        handRaises={handRaises}
        onAdmitStudent={isObserver ? undefined : handleAdmitStudent}
        onDenyStudent={isObserver ? undefined : handleDenyStudent}
        onAdmitAll={isObserver ? undefined : handleAdmitAll}
        onLowerHand={isObserver ? undefined : handleLowerHand}
        onMuteAll={isObserver ? undefined : handleMuteAll}
        onMuteParticipant={isObserver ? undefined : handleMuteParticipant}
        onAllowParticipantMic={isObserver ? undefined : handleAllowParticipantMic}
        onRemoveParticipant={isObserver ? undefined : handleKickParticipant}
      />

      {/* Poll Creation Modal */}
      <Dialog open={isPollDialogOpen} onClose={() => setIsPollDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Launch Live Poll / Quiz</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Poll Question"
            size="small"
            value={newPollQuestion}
            onChange={(e) => setNewPollQuestion(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          {newPollOptions.map((opt, i) => (
            <TextField
              key={i}
              fullWidth
              size="small"
              label={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const updated = [...newPollOptions];
                updated[i] = e.target.value;
                setNewPollOptions(updated);
              }}
              sx={{ mb: 1.5 }}
            />
          ))}
          {newPollOptions.length < 4 && (
            <Button
              size="small"
              variant="text"
              onClick={() => setNewPollOptions([...newPollOptions, `Option ${String.fromCharCode(65 + newPollOptions.length)}`])}
            >
              + Add Option
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPollDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePoll} disabled={!newPollQuestion.trim()}>
            Start Poll
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Active Poll Results HUD */}
      {activePoll && (
        <Box
          data-testid="teacher-active-poll"
          sx={{
            position: 'absolute',
            top: 76,
            right: 20,
            width: 300,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 2,
            p: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 1200,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <PollIcon sx={{ color: '#38bdf8', fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                Live Poll {activePoll.is_active ? '(Active)' : '(Closed)'}
              </Typography>
            </Box>
            {activePoll.is_active ? (
              !isObserver && (
                <Button size="small" color="error" sx={{ fontSize: 11, py: 0.25 }} onClick={handleClosePoll}>
                  End Poll
                </Button>
              )
            ) : (
              <IconButton size="small" onClick={() => setActivePoll(null)} sx={{ color: '#94a3b8' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, mb: 1.5 }}>
            {activePoll.question}
          </Typography>
          {activePoll.options?.map((opt: any, idx: number) => {
            const totalVotes = activePoll.options.reduce((sum: number, o: any) => sum + (o.votes || 0), 0);
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            return (
              <Box key={idx} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                    {opt.text}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700 }}>
                    {opt.votes} ({pct}%)
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 1 }} />
              </Box>
            );
          })}
        </Box>
      )}

      <InClassChatDrawer
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        allowChat={!isObserver}
        isObserver={isObserver}
      />

      <MeetingSettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isHost={true}
        permissions={permissions}
        onUpdatePermissions={handleUpdatePermissions}
      />

      <ConfirmDialog
        open={leaveConfirmOpen}
        title={isObserver ? 'Leave Observation?' : 'End Class for Everyone?'}
        description={
          isObserver
            ? 'Are you sure you want to exit observing this online class session?'
            : 'Are you sure you want to end this live class? This will conclude the session for all participating students.'
        }
        confirmLabel={isObserver ? 'Leave' : 'End Class for All'}
        confirmColor={isObserver ? 'warning' : 'error'}
        loading={isObserver ? false : endClassMutation.isPending}
        onConfirm={() => {
          if (isObserver) {
            setLeaveConfirmOpen(false);
            handleExitToDashboard();
          } else {
            endClassMutation.mutate();
          }
        }}
        onClose={() => setLeaveConfirmOpen(false)}
      />

      {/* Real-time Student Joined Toast Notification */}
      <Snackbar
        open={Boolean(joinNotification)}
        autoHideDuration={4000}
        onClose={() => setJoinNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setJoinNotification(null)}
          severity="info"
          icon={<SchoolIcon fontSize="inherit" />}
          sx={{
            width: '100%',
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            color: '#38bdf8',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontWeight: 600,
          }}
        >
          {joinNotification}
        </Alert>
      </Snackbar>

      {/* Class Session Concluded Dialog for Observer */}
      <Dialog
        open={isClassEndedDialogOpen}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            color: '#f8fafc',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 3,
            p: 1,
            backdropFilter: 'blur(12px)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LiveTvIcon sx={{ color: '#38bdf8' }} />
          Class Session Concluded
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2 }}>
            {classEndedReason || 'The instructor has ended this online class session for all participants.'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Redirecting to Online Classroom Governance in {classEndedCountdown}s...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExitToDashboard}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Return to Dashboard Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
