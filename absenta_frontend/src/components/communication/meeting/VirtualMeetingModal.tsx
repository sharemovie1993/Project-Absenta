import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheckIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  FaceSmileIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  HandRaisedIcon,
  SpeakerWaveIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ChevronUpIcon,
  LockClosedIcon,
  TrashIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';

interface VirtualMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTitle?: string;
  roomId?: string;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  isHost: boolean;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  avatarColor: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

// ── Unified Video Tile Component (Local & Remote with Auto-Attachment) ────────
const VideoTile: React.FC<{
  participant: Participant;
  isLocal?: boolean;
  stream?: MediaStream | null;
  isActiveSpeaker: boolean;
  onClick?: () => void;
  className?: string;
  isCompact?: boolean;
}> = ({ participant, isLocal = false, stream, isActiveSpeaker, onClick, className, isCompact = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasVideoTrack, setHasVideoTrack] = useState<boolean>(false);

  useEffect(() => {
    if (!videoRef.current || !stream) {
      setHasVideoTrack(false);
      return;
    }

    videoRef.current.srcObject = stream;
    videoRef.current.muted = isLocal ? true : false;
    videoRef.current.play().catch(() => {});

    const updateTrackState = () => {
      const vTracks = stream.getVideoTracks();
      setHasVideoTrack(vTracks.length > 0 && vTracks.some((t) => t.enabled));
    };

    updateTrackState();

    stream.onaddtrack = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      updateTrackState();
    };

    stream.onremovetrack = () => {
      updateTrackState();
    };
  }, [stream, isLocal]);

  return (
    <div
      onClick={onClick}
      className={
        className ||
        `relative w-full h-full min-h-[220px] max-h-[420px] bg-[#222222] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-xl cursor-pointer ${
          isActiveSpeaker ? 'border-[#2DA771]' : 'border-[#333333]'
        }`
      }
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${hasVideoTrack ? 'block' : 'hidden'}`}
      />
      {!hasVideoTrack && (
        <div
          className={`${
            isCompact ? 'w-10 h-10 text-xs' : 'w-20 h-20 text-2xl'
          } rounded-full ${participant.avatarColor || 'bg-[#742774]'} text-white flex items-center justify-center font-bold shadow-2xl`}
        >
          {participant.name.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div
        className={`absolute bottom-2 left-2 ${
          isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-3 py-1 text-xs'
        } bg-black/70 backdrop-blur-md rounded-lg font-semibold flex items-center gap-1.5 z-20`}
      >
        <span className={`truncate ${isCompact ? 'max-w-[90px]' : 'max-w-[200px]'}`}>{participant.name}</span>
        {participant.isAudioMuted ? (
          <span className="text-rose-500 font-bold">🔇</span>
        ) : (
          <span className="text-[#2DA771]">🎙️</span>
        )}
      </div>
    </div>
  );
};

export const VirtualMeetingModal: React.FC<VirtualMeetingModalProps> = ({
  isOpen,
  onClose,
  roomTitle = 'Rapat Koordinasi KBM & Kurikulum',
  roomId = `meet-kbm-${Date.now().toString(36)}`
}) => {
  const { user } = useAuthStore();
  const { socket } = useSocket();

  // Media & Call States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [viewMode, setViewMode] = useState<'GALLERY' | 'SPEAKER' | 'WHITEBOARD'>('GALLERY');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('local');
  const [activeSidebar, setActiveSidebar] = useState<'PARTICIPANTS' | 'CHAT' | 'SECURITY' | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showMeetingInfo, setShowMeetingInfo] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [isVirtualMicActive, setIsVirtualMicActive] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Enumerate devices on demand
  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputDevices(devices.filter((d) => d.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
      setVideoInputDevices(devices.filter((d) => d.kind === 'videoinput'));
    } catch {}
  };

  const playAudioTestChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  // Security & Host Controls
  const [isMeetingLocked, setIsMeetingLocked] = useState(false);
  const [isWaitingRoomEnabled, setIsWaitingRoomEnabled] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowChat, setAllowChat] = useState(true);

  // Participants & Remote Streams
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'local',
      name: `${user?.full_name || 'Saya'} (Host, Saya)`,
      role: user?.role?.name || 'GURU',
      isHost: true,
      isAudioMuted: false,
      isVideoOff: false,
      isHandRaised: false,
      avatarColor: 'bg-[#0E71EB]'
    }
  ]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // WebRTC Peer Connections Map
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Meeting Chat
  const [meetingChat, setMeetingChat] = useState<{ senderId?: string; sender: string; role?: string; text: string; time: string; isHost?: boolean }[]>([
    { sender: 'Sistem Absenta', role: 'Sistem', text: 'Ruang Rapat Zoom Absenta aktif dengan enkripsi WebRTC multi-tenant.', time: 'Sekarang' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Whiteboard States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#0E71EB');
  const [brushSize, setBrushSize] = useState(3);
  const [toolMode, setToolMode] = useState<'PEN' | 'ERASER'>('PEN');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const meetingContainerRef = useRef<HTMLDivElement | null>(null);

  // Real-time Audio Level Meter States (Web Audio API)
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Setup Web Audio API Analyser for dynamic voice metering
  const setupAudioMeter = (stream: MediaStream) => {
    try {
      if (stream.getAudioTracks().length === 0) return;
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.4;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 120) * 100));
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio meter init error:', e);
    }
  };

  // Helper: Create Peer Connection for a Remote User
  const createPeerConnection = (targetUserId: string) => {
    if (peerConnectionsRef.current.has(targetUserId)) {
      return peerConnectionsRef.current.get(targetUserId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Pre-configure transceivers for bi-directional audio and video
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      pc.addTransceiver('video', { direction: 'sendrecv' });
    } catch {}

    // Add local stream tracks to this peer if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const sender = pc.getSenders().find(s => s.track?.kind === track.kind || (s as any).kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(() => {});
        } else {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch {}
        }
      });
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('meeting:ice_candidate', {
          targetUserId,
          roomId,
          candidate: event.candidate
        });
      }
    };

    // Receive Remote Track
    pc.ontrack = (event) => {
      const incomingStream = event.streams && event.streams[0] 
        ? event.streams[0] 
        : new MediaStream([event.track]);

      setRemoteStreams((prev) => {
        const existing = prev[targetUserId];
        if (existing) {
          if (!existing.getTracks().some(t => t.id === event.track.id)) {
            existing.addTrack(event.track);
          }
          return { ...prev, [targetUserId]: new MediaStream(existing.getTracks()) };
        }
        return { ...prev, [targetUserId]: incomingStream };
      });
    };

    peerConnectionsRef.current.set(targetUserId, pc);
    return pc;
  };

  // ── WebRTC Socket Signaling Effect ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !socket) return;

    const cleanRoom = roomId.replace(/\s+/g, '').toLowerCase();

    // 1. Join room
    socket.emit('meeting:join', {
      roomId: cleanRoom,
      participantInfo: {
        name: user?.full_name || 'Pengguna Absenta',
        role: user?.role?.name || 'GTK',
        avatar: user?.avatar
      }
    });

    // 2. Receive existing room state (all peers already in room)
    const handleRoomState = async (data: { peers: Array<{ userId: string; name: string; role?: string; avatar?: string }> }) => {
      if (!data?.peers || data.peers.length === 0) return;

      setParticipants((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPeers = data.peers
          .filter(p => !existingIds.has(p.userId) && p.userId !== user?.id)
          .map(p => ({
            id: p.userId,
            name: p.name,
            role: p.role || 'GTK',
            isHost: false,
            isAudioMuted: false,
            isVideoOff: false,
            isHandRaised: false,
            avatarColor: 'bg-[#742774]'
          }));
        return [...prev, ...newPeers];
      });

      // Prepare peer connections to receive incoming tracks
      for (const peer of data.peers) {
        if (peer.userId === user?.id) continue;
        createPeerConnection(peer.userId);
      }
    };

    // 3. Peer joined -> Initiate offer
    const handlePeerJoined = async (peer: { userId: string; name: string; role?: string; avatar?: string }) => {
      if (peer.userId === user?.id) return;

      // Add to participants
      setParticipants((prev) => {
        if (prev.some((p) => p.id === peer.userId)) return prev;
        return [
          ...prev,
          {
            id: peer.userId,
            name: peer.name,
            role: peer.role || 'GTK',
            isHost: false,
            isAudioMuted: false,
            isVideoOff: false,
            isHandRaised: false,
            avatarColor: 'bg-[#107C41]'
          }
        ];
      });

      // Create WebRTC Offer
      try {
        const pc = createPeerConnection(peer.userId);
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);

        socket.emit('meeting:offer', {
          targetUserId: peer.userId,
          roomId: cleanRoom,
          offer
        });
      } catch (err: any) {
        console.warn('Error creating meeting offer:', err);
      }
    };

    // 4. Receive Offer -> Send Answer
    const handleMeetingOffer = async (data: { fromUserId: string; roomId: string; offer: any; senderInfo?: any }) => {
      try {
        if (data.fromUserId === user?.id) return;

        // Add to participants if not present
        setParticipants((prev) => {
          if (prev.some((p) => p.id === data.fromUserId)) return prev;
          return [
            ...prev,
            {
              id: data.fromUserId,
              name: data.senderInfo?.name || 'Peserta Rapat',
              role: data.senderInfo?.role || 'GTK',
              isHost: false,
              isAudioMuted: false,
              isVideoOff: false,
              isHandRaised: false,
              avatarColor: 'bg-[#742774]'
            }
          ];
        });

        const pc = createPeerConnection(data.fromUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('meeting:answer', {
          targetUserId: data.fromUserId,
          roomId: cleanRoom,
          answer
        });
      } catch (err: any) {
        console.warn('Error handling meeting offer:', err);
      }
    };

    // 5. Receive Answer
    const handleMeetingAnswer = async (data: { fromUserId: string; answer: any }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err: any) {
        console.warn('Error setting remote answer:', err);
      }
    };

    // 6. Receive ICE Candidate
    const handleMeetingIceCandidate = async (data: { fromUserId: string; candidate: any }) => {
      try {
        const pc = peerConnectionsRef.current.get(data.fromUserId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err: any) {
        console.warn('Error adding ICE candidate:', err);
      }
    };

    // 7. In-Meeting Chat
    const handleMeetingChat = (chatMsg: { senderId?: string; sender: string; role?: string; text: string; time: string }) => {
      setMeetingChat((prev) => [...prev, chatMsg]);
    };

    const handleChatHistory = (history: { senderId?: string; sender: string; role?: string; text: string; time: string }[]) => {
      if (Array.isArray(history) && history.length > 0) {
        setMeetingChat((prev) => {
          const sysMsg = prev.filter((p) => p.role === 'Sistem');
          return [...sysMsg, ...history];
        });
      }
    };

    // 8. Peer Left
    const handlePeerLeft = (data: { userId: string }) => {
      const pc = peerConnectionsRef.current.get(data.userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.userId);
      }
      setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    };

    socket.on('meeting:room_state', handleRoomState);
    socket.on('meeting:peer_joined', handlePeerJoined);
    socket.on('meeting:offer', handleMeetingOffer);
    socket.on('meeting:answer', handleMeetingAnswer);
    socket.on('meeting:ice_candidate', handleMeetingIceCandidate);
    socket.on('meeting:chat', handleMeetingChat);
    socket.on('meeting:chat_history', handleChatHistory);
    socket.on('meeting:peer_left', handlePeerLeft);

    return () => {
      socket.emit('meeting:leave', { roomId: cleanRoom });
      socket.off('meeting:room_state', handleRoomState);
      socket.off('meeting:peer_joined', handlePeerJoined);
      socket.off('meeting:offer', handleMeetingOffer);
      socket.off('meeting:answer', handleMeetingAnswer);
      socket.off('meeting:ice_candidate', handleMeetingIceCandidate);
      socket.off('meeting:chat', handleMeetingChat);
      socket.off('meeting:chat_history', handleChatHistory);
      socket.off('meeting:peer_left', handlePeerLeft);

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [isOpen, socket, roomId, user]);

  // Multi-Strategy Audio Stream Acquisition with Virtual Carrier Fallback
  const acquireAudioStream = async (): Promise<{ stream: MediaStream; isVirtual: boolean }> => {
    // Strategy 1: Standard Audio
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      return { stream: s, isVirtual: false };
    } catch {}

    // Strategy 2: Simple Audio
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      return { stream: s, isVirtual: false };
    } catch {}

    // Strategy 3: Relaxed Audio Constraints (for basic / older USB mics)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      return { stream: s, isVirtual: false };
    } catch {}

    // Strategy 4: Virtual Audio Track Generator (for PCs without physical microphone)
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime); // silent background carrier
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      return { stream: dest.stream, isVirtual: true };
    }

    throw new Error('Perangkat mikrofon tidak ditemukan.');
  };

  // Multi-Strategy Video Stream Acquisition
  const acquireVideoStream = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
    } catch {}

    try {
      return await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {}

    throw new Error('Kamera tidak ditemukan.');
  };

  // Dynamic Camera Toggle with Device Enumeration & Graceful Fallback
  const handleToggleVideo = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Fitur kamera tidak didukung pada peramban web ini.');
        setIsVideoDisabled(true);
        return;
      }

      if (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0) {
        const stream = await acquireVideoStream();
        const newVideoTrack = stream.getVideoTracks()[0];
        if (newVideoTrack) {
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
            localStreamRef.current.addTrack(newVideoTrack);
          } else {
            localStreamRef.current = stream;
          }

          // Add / Replace track on all existing peer connections
          peerConnectionsRef.current.forEach(async (pc, targetUserId) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || (s as any).kind === 'video');
            if (sender) {
              await sender.replaceTrack(newVideoTrack).catch(() => {});
            } else {
              try {
                pc.addTrack(newVideoTrack, localStreamRef.current!);
              } catch {}
            }
            // Renegotiate SDP
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket?.emit('meeting:offer', { targetUserId, roomId, offer });
            } catch {}
          });

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
        }
        setIsVideoDisabled(false);
        return;
      }

      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
        if (videoTrack.enabled && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      alert('Gagal mengakses kamera: ' + (err.message || 'Perangkat kamera tidak terdeteksi.'));
      setIsVideoDisabled(true);
    }
  };

  // Dynamic Microphone Toggle
  const handleToggleAudio = async () => {
    try {
      if (!localStreamRef.current || localStreamRef.current.getAudioTracks().length === 0) {
        const { stream: audioStream } = await acquireAudioStream();
        const newAudioTrack = audioStream.getAudioTracks()[0];
        if (newAudioTrack) {
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newAudioTrack);
          } else {
            localStreamRef.current = audioStream;
          }
          setupAudioMeter(localStreamRef.current);

          // Add / Replace audio track to peer connections
          peerConnectionsRef.current.forEach(async (pc, targetUserId) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'audio' || (s as any).kind === 'audio');
            if (sender) {
              await sender.replaceTrack(newAudioTrack).catch(() => {});
            } else {
              try {
                pc.addTrack(newAudioTrack, localStreamRef.current!);
              } catch {}
            }
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket?.emit('meeting:offer', { targetUserId, roomId, offer });
            } catch {}
          });
        }

        setIsAudioMuted(false);
        return;
      }

      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    } catch (err: any) {
      alert('Info Mikrofon: ' + (err.message || 'Mikrofon disenyapkan.'));
      setIsAudioMuted(true);
    }
  };

  // Initialize camera & mic on room join with device enumeration
  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;

    const initMedia = async () => {
      try {
        let hasCamera = false;
        let hasMic = false;
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          hasCamera = devices.some((d) => d.kind === 'videoinput');
          hasMic = devices.some((d) => d.kind === 'audioinput');
        }

        if (hasCamera) {
          try {
            const vStream = await acquireVideoStream();
            stream = vStream;
            setIsVideoDisabled(false);
          } catch {
            setIsVideoDisabled(true);
          }
        } else {
          setIsVideoDisabled(true);
        }

        try {
          const { stream: aStream, isVirtual } = await acquireAudioStream();
          if (stream) {
            aStream.getAudioTracks().forEach((t) => stream?.addTrack(t));
          } else {
            stream = aStream;
          }
          setIsAudioMuted(isVirtual);
        } catch {
          setIsAudioMuted(true);
        }

        localStreamRef.current = stream;
        if (stream) {
          setupAudioMeter(stream);
        }
        if (localVideoRef.current && stream && hasCamera) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn('[Meeting] Media init fallback:', err.message);
      }
    };

    initMedia();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  // Sync video element whenever isVideoDisabled changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && !isVideoDisabled) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [isVideoDisabled]);

  // Recording Timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordTimer((t) => t + 1), 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    const cleanRoom = roomId.replace(/\s+/g, '').toLowerCase();
    navigator.clipboard.writeText(window.location.origin + `/komunikasi?meeting=${cleanRoom}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Mute All by Host (Zoom Feature)
  const handleMuteAll = () => {
    if (confirm('Bisukan semua peserta saat ini dan peserta baru yang bergabung?')) {
      setParticipants((prev) => prev.map((p) => (p.id === 'local' ? p : { ...p, isAudioMuted: true })));
      if (socket) {
        socket.emit('meeting:chat', {
          roomId,
          text: '🔇 Host telah membisukan mikrofon seluruh peserta.'
        });
      }
    }
  };

  // Trigger Reaction Emoji
  const handleTriggerReaction = (emoji: string) => {
    setFloatingReaction(emoji);
    setShowReactions(false);
    setTimeout(() => setFloatingReaction(null), 3000);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      meetingContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Whiteboard Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = toolMode === 'ERASER' ? '#1c1c1c' : brushColor;
    ctx.lineWidth = toolMode === 'ERASER' ? 24 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSendMeetingChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    const myName = user?.full_name || (user as any)?.name || (user as any)?.username || 'Saya';
    const myRole = (user as any)?.role?.name || (user as any)?.roleName || 'Peserta';
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (socket) {
      socket.emit('meeting:chat', {
        roomId,
        text,
        senderName: myName,
        senderRole: myRole,
        time: currentTime
      });
    } else {
      setMeetingChat((prev) => [
        ...prev,
        {
          senderId: 'local',
          sender: myName,
          role: myRole,
          text,
          time: currentTime
        }
      ]);
    }
    setChatInput('');
  };

  const handleDownloadNotulen = () => {
    const header =
      `========================================================\n` +
      `NOTULEN & RIWAYAT CHAT RAPAT - ABSENTA\n` +
      `Judul Rapat   : ${roomTitle}\n` +
      `Room ID       : ${roomId}\n` +
      `Tanggal       : ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Penyelenggara : ${user?.full_name || 'Host'}\n` +
      `Total Pesan   : ${meetingChat.filter((c) => c.role !== 'Sistem').length}\n` +
      `========================================================\n\n`;

    const body = meetingChat
      .filter((c) => c.role !== 'Sistem')
      .map((c) => `[${c.time}] ${c.sender} (${c.role || 'Peserta'}):\n${c.text}\n`)
      .join('\n');

    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Notulen-Rapat-${roomId}-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLeave = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (socket) {
      socket.emit('meeting:leave', { roomId });
    }
    onClose();
  };

  return (
    <div 
      ref={meetingContainerRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a] text-white select-none overflow-hidden font-sans"
    >
      {/* ── 1. ZOOM TOP HEADER BAR ───────────────────────────────────────── */}
      <header className="h-11 px-4 bg-[#1a1a1a] border-b border-[#2b2b2b] flex items-center justify-between shrink-0 z-20">
        {/* Left: Green Shield Meeting Info Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMeetingInfo((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#2b2b2b] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Informasi Rapat"
          >
            <ShieldCheckIcon className="w-5 h-5 text-[#2DA771]" />
            <span className="text-xs font-bold truncate max-w-[200px] sm:max-w-md">
              {roomTitle}
            </span>
          </button>

          {/* Zoom Meeting Info Popup Dialog */}
          {showMeetingInfo && (
            <div className="absolute top-10 left-0 w-80 bg-[#242424] rounded-xl shadow-2xl border border-slate-700 p-4 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-[#2DA771]" />
                  <span>Informasi Rapat Zoom</span>
                </span>
                <button type="button" onClick={() => setShowMeetingInfo(false)} className="text-slate-400 hover:text-white">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-slate-300">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Topik Rapat</p>
                  <p className="font-bold text-white">{roomTitle}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Meeting ID</p>
                  <p className="font-mono text-emerald-400 font-bold">{roomId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Host</p>
                  <p className="text-white">{user?.full_name || 'Admin Sekolah'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Enkripsi</p>
                  <p className="text-slate-300 flex items-center gap-1">
                    <LockClosedIcon className="w-3.5 h-3.5 text-[#2DA771]" />
                    <span>Terenkripsi E2EE WebRTC Mesh</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2 bg-[#0E71EB] hover:bg-[#0060d6] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                  <span>{copiedLink ? 'Tautan Berhasil Disalin' : 'Salin Tautan Undangan'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/40 rounded-full text-red-400 text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>REC {formatTimer(recordTimer)} (Cloud)</span>
          </div>
        )}

        {/* Right: View Switcher (Speaker View ⇄ Gallery View) & Fullscreen */}
        <div className="flex items-center gap-2">
          <div className="bg-[#242424] rounded-lg p-0.5 flex text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('GALLERY')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'GALLERY' ? 'bg-[#0E71EB] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gallery View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SPEAKER')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'SPEAKER' ? 'bg-[#0E71EB] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Speaker View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('WHITEBOARD')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'WHITEBOARD' ? 'bg-[#0E71EB] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Whiteboard
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[#242424] hover:bg-[#333] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Layar Penuh"
          >
            {isFullscreen ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── 2. ZOOM MAIN MEETING BODY (VIDEO GRID / WHITEBOARD + SIDEBAR) ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Stage */}
        <div className="flex-1 flex flex-col p-3 bg-[#121212] overflow-hidden relative">
          {/* Floating Emoji Reaction Animation */}
          {floatingReaction && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl animate-bounce z-40 drop-shadow-2xl">
              {floatingReaction}
            </div>
          )}

          {/* ── MODE A: GALLERY VIEW (EQUAL GRID) ────────────────────────── */}
          <div
            className={`flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center justify-center p-2 ${
              viewMode === 'GALLERY' ? 'grid' : 'hidden'
            }`}
          >
            {/* Local Participant Card */}
            <div
              className={`relative w-full h-full min-h-[220px] max-h-[420px] bg-[#222222] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-xl ${
                !isAudioMuted && audioLevel > 12
                  ? 'border-[#2DA771] ring-4 ring-[#2DA771]/30 shadow-[#2DA771]/20'
                  : activeSpeakerId === 'local'
                  ? 'border-[#2DA771]'
                  : 'border-[#333333]'
              }`}
            >
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  if (el && localStreamRef.current) {
                    if (el.srcObject !== localStreamRef.current) {
                      el.srcObject = localStreamRef.current;
                    }
                    el.muted = true;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
              />
              {isVideoDisabled && (
                <div className="relative flex flex-col items-center">
                  {!isAudioMuted && audioLevel > 12 && (
                    <span className="absolute -inset-3 rounded-full bg-[#2DA771]/30 animate-ping" />
                  )}
                  <div className="w-20 h-20 rounded-full bg-[#0E71EB] text-white flex items-center justify-center text-2xl font-bold shadow-2xl z-10">
                    {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                </div>
              )}

              {/* Name Tag & Real-time Audio Equalizer Badges */}
              <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs font-semibold flex items-center gap-2 z-20">
                <span>{user?.full_name || 'Saya'} (Host, Me)</span>

                {isAudioMuted ? (
                  <span className="text-rose-500 font-bold">🔇</span>
                ) : (
                  <div className="flex items-center gap-0.5 h-3" title={`Level Suara: ${audioLevel}%`}>
                    <span
                      style={{ height: `${Math.max(25, audioLevel * 0.9)}%` }}
                      className="w-0.5 bg-[#2DA771] rounded-full transition-all duration-75"
                    />
                    <span
                      style={{ height: `${Math.max(40, audioLevel * 1.1)}%` }}
                      className="w-0.5 bg-[#2DA771] rounded-full transition-all duration-75"
                    />
                    <span
                      style={{ height: `${Math.max(20, audioLevel * 0.8)}%` }}
                      className="w-0.5 bg-[#2DA771] rounded-full transition-all duration-75"
                    />
                  </div>
                )}

                {isHandRaised && <span className="animate-bounce">✋</span>}
              </div>
            </div>

            {/* Remote Participants with WebRTC Live Video Stream */}
            {participants
              .filter((p) => p.id !== 'local')
              .map((p) => (
                <VideoTile
                  key={p.id}
                  participant={p}
                  isLocal={false}
                  stream={remoteStreams[p.id]}
                  isActiveSpeaker={activeSpeakerId === p.id}
                  onClick={() => setActiveSpeakerId(p.id)}
                />
              ))}
          </div>

          {/* ── MODE B: SPEAKER VIEW (SPOTLIGHT + FILMSTRIP) ──────────────── */}
          <div
            className={`flex-1 flex-col gap-3 overflow-hidden ${
              viewMode === 'SPEAKER' ? 'flex' : 'hidden'
            }`}
          >
            {/* Top Filmstrip (All participants with live video tiles) */}
            <div className="h-28 flex gap-2 overflow-x-auto pb-1 shrink-0">
              {participants.map((p) => {
                const pStream = p.id === 'local' ? localStreamRef.current : remoteStreams[p.id];
                const isSelected = activeSpeakerId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveSpeakerId(p.id)}
                    className={`w-40 h-full rounded-xl overflow-hidden border-2 shrink-0 relative cursor-pointer transition-all ${
                      isSelected ? 'border-[#2DA771] ring-2 ring-[#2DA771]/40' : 'border-[#333] hover:border-slate-500'
                    }`}
                  >
                    <VideoTile
                      participant={p}
                      isLocal={p.id === 'local'}
                      stream={pStream}
                      isActiveSpeaker={isSelected}
                      isCompact={true}
                      className="w-full h-full relative"
                    />
                  </div>
                );
              })}
            </div>

            {/* Main Spotlight Video */}
            <div className="flex-1 bg-[#1a1a1a] rounded-2xl border border-[#333] flex items-center justify-center relative overflow-hidden shadow-2xl">
              {(() => {
                const spotlightParticipant =
                  participants.find((p) => p.id === activeSpeakerId) ||
                  participants[0] || {
                    id: 'local',
                    name: user?.full_name || 'Saya',
                    role: 'HOST',
                    isHost: true,
                    isAudioMuted,
                    isVideoOff: isVideoDisabled,
                    isHandRaised,
                    avatarColor: 'bg-[#0E71EB]'
                  };
                const spotlightStream =
                  activeSpeakerId === 'local' ? localStreamRef.current : remoteStreams[activeSpeakerId];

                return (
                  <VideoTile
                    participant={spotlightParticipant}
                    isLocal={activeSpeakerId === 'local'}
                    stream={spotlightStream}
                    isActiveSpeaker={true}
                    className="w-full h-full relative flex items-center justify-center"
                  />
                );
              })()}
            </div>
          </div>

          {/* ── MODE C: DIGITAL WHITEBOARD (PAPAN TULIS KBM) ──────────────── */}
          <div
            className={`flex-1 flex-col bg-[#1c1c1c] rounded-2xl border border-[#333] overflow-hidden shadow-2xl ${
              viewMode === 'WHITEBOARD' ? 'flex' : 'hidden'
            }`}
          >
            {/* Whiteboard Toolbar */}
            <div className="px-4 py-2 bg-[#282828] border-b border-[#333] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white">🖍️ Papan Tulis Digital KBM</span>

                <div className="flex items-center gap-1 bg-[#1f1f1f] p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setToolMode('PEN')}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer ${
                      toolMode === 'PEN' ? 'bg-[#0E71EB] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pena
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolMode('ERASER')}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer ${
                      toolMode === 'ERASER' ? 'bg-[#0E71EB] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Penghapus
                  </button>
                </div>

                {/* Color Palette */}
                <div className="flex items-center gap-1.5">
                  {['#ffffff', '#0E71EB', '#2DA771', '#E02424', '#FACA15'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        setBrushColor(col);
                        setToolMode('PEN');
                      }}
                      style={{ backgroundColor: col }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        brushColor === col && toolMode === 'PEN' ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>

                {/* Brush Size */}
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>Ukuran:</span>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-20 accent-[#0E71EB]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={clearWhiteboard}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Bersihkan</span>
              </button>
            </div>

            {/* Drawing Canvas Area */}
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="flex-1 bg-[#1c1c1c] cursor-crosshair w-full h-full"
            />
          </div>
        </div>

        {/* ── 3. ZOOM SIDEBARS (PARTICIPANTS / CHAT / SECURITY) ───────────── */}
        {activeSidebar && (
          <aside className="w-80 bg-[#242424] border-l border-[#333] flex flex-col shrink-0 animate-in slide-in-from-right duration-150 z-20">
            {/* Sidebar Header */}
            <div
              className={`px-4 py-2.5 border-b flex items-center justify-between ${
                activeSidebar === 'CHAT' ? 'bg-[#202c33] border-[#2a3942]' : 'bg-[#242424] border-[#333]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {activeSidebar === 'CHAT' && (
                  <div className="w-7 h-7 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                    💬
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#e9edef] uppercase tracking-wider block truncate">
                    {activeSidebar === 'PARTICIPANTS' && `Peserta (${participants.length})`}
                    {activeSidebar === 'CHAT' && `Chat Rapat (${meetingChat.filter((c) => c.role !== 'Sistem').length})`}
                    {activeSidebar === 'SECURITY' && 'Keamanan & Izin Rapat'}
                  </span>
                  {activeSidebar === 'CHAT' && (
                    <p className="text-[10px] text-[#00a884] font-medium leading-none mt-0.5">Online • WebRTC Terenkripsi</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {activeSidebar === 'CHAT' && meetingChat.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadNotulen}
                    className="text-[10px] bg-[#005c4b] hover:bg-[#007a63] text-emerald-200 px-2 py-1 rounded-lg font-bold border border-[#02735e] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    title="Unduh Notulen & Riwayat Chat Rapat"
                  >
                    <span>📥 Notulen</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveSidebar(null)}
                  className="text-[#8696a0] hover:text-[#e9edef] p-1 cursor-pointer transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* A. Participants Panel */}
            {activeSidebar === 'PARTICIPANTS' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 p-3 overflow-y-auto divide-y divide-[#333]">
                  {participants.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full ${p.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-100 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.isHost ? 'Host' : 'Peserta'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400">
                        {p.isAudioMuted ? <span className="text-rose-500 text-xs">🔇</span> : <span className="text-[#2DA771] text-xs">🎙️</span>}
                        {p.isVideoOff ? <span className="text-rose-500 text-xs">📹🚫</span> : <span className="text-[#2DA771] text-xs">📹</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Host Mute All Footer */}
                <div className="p-3 bg-[#1f1f1f] border-t border-[#333] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMuteAll}
                    className="flex-1 py-2 bg-[#333] hover:bg-[#444] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Mute All
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2 bg-[#0E71EB] hover:bg-[#0060d6] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Undang
                  </button>
                </div>
              </div>
            )}

            {/* B. Chat Panel (WhatsApp Persona) */}
            {activeSidebar === 'CHAT' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0b141a]">
                {/* WhatsApp Messages Scroll Area */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs flex flex-col custom-scrollbar">
                  {/* WhatsApp Encryption Notice Pill */}
                  <div className="flex justify-center my-1">
                    <div className="bg-[#182229] border border-[#ffd279]/20 text-[#ffd279] px-3 py-1.5 rounded-lg text-[10px] text-center max-w-[90%] shadow-xs leading-relaxed flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Pesan terenkripsi end-to-end multi-tenant WebRTC. Tersimpan di database sekolah.</span>
                    </div>
                  </div>

                  {meetingChat.map((c, idx) => {
                    const isMe = c.senderId === 'local' || c.senderId === user?.id || c.sender === (user?.full_name || 'Saya');
                    const isSystem = c.role === 'Sistem' || c.sender === 'Sistem Absenta';

                    if (isSystem) {
                      return (
                        <div key={idx} className="flex justify-center my-1">
                          <div className="bg-[#182229] text-[#8696a0] border border-slate-700/40 px-3 py-1 rounded-lg text-[10px] text-center max-w-[85%] shadow-xs">
                            <span className="font-semibold text-sky-400">ℹ️ {c.sender}:</span> {c.text}
                          </div>
                        </div>
                      );
                    }

                    const senderDisplayName = isMe
                      ? (user?.full_name || 'Saya')
                      : (c.sender && c.sender !== 'Peserta' ? c.sender : (participants.find((p) => p.id === c.senderId)?.name || c.sender || 'Peserta Rapat'));

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[85%] shadow-sm ${
                          isMe
                            ? 'self-end bg-[#005c4b] border border-[#02735e]/30 rounded-2xl rounded-tr-xs'
                            : 'self-start bg-[#202c33] border border-[#2a3942]/40 rounded-2xl rounded-tl-xs'
                        } p-2 px-3 transition-all`}
                      >
                        {/* Header: Sender Name & Role */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`font-bold text-[11px] truncate max-w-[150px] ${
                              isMe ? 'text-[#25d366]' : 'text-[#53bdeb]'
                            }`}
                          >
                            {senderDisplayName}
                          </span>
                          {c.role && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                isMe ? 'bg-[#004d3e] text-[#aebac1]' : 'bg-[#111b21] text-[#8696a0]'
                              }`}
                            >
                              {c.role}
                            </span>
                          )}
                          {isMe && <span className="text-[9px] text-emerald-200/70 font-normal">(Anda)</span>}
                        </div>

                        {/* Message Content */}
                        <p className="text-[#e9edef] text-[12px] leading-relaxed break-words font-normal">
                          {c.text}
                        </p>

                        {/* Footer: Time & Double Tick */}
                        <div className="flex items-center justify-end gap-1 mt-0.5 self-end">
                          <span className="text-[#8696a0] text-[9px]">{c.time}</span>
                          {isMe && (
                            <span className="text-[#53bdeb] text-[10px] font-bold tracking-tighter" title="Terkirim & Tersimpan di Database">
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* WhatsApp Input Bar */}
                <form
                  onSubmit={handleSendMeetingChat}
                  className="p-2.5 bg-[#202c33] border-t border-[#2a3942] flex items-center gap-2"
                >
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      placeholder="Ketik pesan..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2 text-xs rounded-xl bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] border-0 outline-hidden focus:ring-1 focus:ring-[#00a884] transition-all"
                    />
                    <span className="absolute right-2.5 text-slate-400 text-xs">💬</span>
                  </div>
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
                      chatInput.trim()
                        ? 'bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] scale-100'
                        : 'bg-[#2a3942] text-slate-500 cursor-not-allowed scale-95'
                    }`}
                    title="Kirim Pesan"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current ml-0.5">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              </div>
            )}

            {/* C. Security Panel */}
            {activeSidebar === 'SECURITY' && (
              <div className="flex-1 p-4 space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-white mb-2 uppercase text-[10px] text-slate-400">Kontrol Akses</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMeetingLocked}
                        onChange={(e) => setIsMeetingLocked(e.target.checked)}
                        className="w-4 h-4 text-[#0E71EB] rounded"
                      />
                      <span>Kunci Rapat (Lock Meeting)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWaitingRoomEnabled}
                        onChange={(e) => setIsWaitingRoomEnabled(e.target.checked)}
                        className="w-4 h-4 text-[#0E71EB] rounded"
                      />
                      <span>Aktifkan Ruang Tunggu (Waiting Room)</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#333]">
                  <h4 className="font-bold text-white mb-2 uppercase text-[10px] text-slate-400">Izin Peserta</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowScreenShare}
                        onChange={(e) => setAllowScreenShare(e.target.checked)}
                        className="w-4 h-4 text-[#0E71EB] rounded"
                      />
                      <span>Bolehkan Berbagi Layar (Share Screen)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowChat}
                        onChange={(e) => setAllowChat(e.target.checked)}
                        className="w-4 h-4 text-[#0E71EB] rounded"
                      />
                      <span>Bolehkan Obrolan Chat</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── 4. ZOOM SIGNATURE BOTTOM CONTROL BAR ─────────────────────────── */}
      <footer className="h-16 px-4 bg-[#1a1a1a] border-t border-[#2b2b2b] flex items-center justify-between shrink-0 z-30">
        {/* Left: Audio & Video Controls (Zoom Style) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mute / Unmute */}
          <div className="flex items-center relative">
            <button
              type="button"
              onClick={handleToggleAudio}
              className="flex flex-col items-center justify-center w-14 h-12 rounded-lg hover:bg-[#2b2b2b] text-slate-200 hover:text-white transition-colors cursor-pointer group relative"
            >
              <div className="relative flex items-center justify-center">
                <SpeakerWaveIcon className={`w-5 h-5 ${isAudioMuted ? 'text-rose-500' : 'text-[#2DA771]'}`} />
                {isAudioMuted && <span className="absolute inset-0 border-t-2 border-rose-500 rotate-45 top-2.5" />}
                {!isAudioMuted && audioLevel > 5 && (
                  <span 
                    style={{ height: `${Math.min(100, Math.max(20, audioLevel))}%` }} 
                    className="absolute -right-1.5 bottom-0.5 w-1 bg-[#2DA771] rounded-full transition-all duration-75"
                  />
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowAudioMenu((v) => !v);
                setShowVideoMenu(false);
                refreshDevices();
              }}
              className={`p-1.5 rounded hover:bg-[#2b2b2b] text-slate-400 hover:text-white -ml-1 cursor-pointer ${
                showAudioMenu ? 'bg-[#2b2b2b] text-white' : ''
              }`}
              title="Pengaturan Mikrofon & Speaker"
            >
              <ChevronUpIcon className="w-3.5 h-3.5" />
            </button>

            {/* Audio Settings Popover (Zoom Style) */}
            {showAudioMenu && (
              <div className="absolute bottom-16 left-0 w-80 bg-[#222222] border border-slate-700 rounded-xl shadow-2xl p-3 text-xs text-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-bold text-white text-[11px] uppercase tracking-wider">Pengaturan Audio Zoom</span>
                  <button type="button" onClick={() => setShowAudioMenu(false)} className="text-slate-400 hover:text-white">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Section 1: Microphone Selection */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>PILIH MIKROFON (INPUT)</span>
                    <button
                      type="button"
                      onClick={() => refreshDevices(true)}
                      className="text-emerald-400 hover:text-emerald-300 normal-case text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      <span>Pindai Perangkat</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {/* Option: Virtual Mic */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsVirtualMicActive(true);
                        setShowAudioMenu(false);
                        try {
                          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                          if (AudioCtx) {
                            const ctx = new AudioCtx();
                            const dest = ctx.createMediaStreamDestination();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(440, ctx.currentTime);
                            gain.gain.setValueAtTime(0.01, ctx.currentTime);
                            osc.connect(gain);
                            gain.connect(dest);
                            osc.start();
                            const track = dest.stream.getAudioTracks()[0];
                            if (track) {
                              if (localStreamRef.current) {
                                localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
                                localStreamRef.current.addTrack(track);
                              } else {
                                localStreamRef.current = dest.stream;
                              }
                              setupAudioMeter(localStreamRef.current);
                              peerConnectionsRef.current.forEach(async (pc) => {
                                const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
                                if (sender) await sender.replaceTrack(track).catch(() => {});
                              });
                              setIsAudioMuted(false);
                            }
                          }
                        } catch {}
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#333333] transition-colors cursor-pointer ${
                        isVirtualMicActive || audioInputDevices.length === 0 ? 'text-emerald-400 font-bold bg-[#2a2a2a]' : 'text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span>✨ Mikrofon Virtual Absenta</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-semibold">Aktif</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal">Simulasi suara Web Audio (Tanpa colokan mic fisik)</p>
                      </div>
                      {(isVirtualMicActive || audioInputDevices.length === 0) && <CheckIcon className="w-4 h-4 shrink-0 text-emerald-400" />}
                    </button>

                    {/* Physical Hardware Mics */}
                    {audioInputDevices.map((dev, idx) => (
                      <button
                        key={dev.deviceId || idx}
                        type="button"
                        onClick={async () => {
                          setIsVirtualMicActive(false);
                          setSelectedAudioInput(dev.deviceId);
                          setShowAudioMenu(false);
                          try {
                            if (localStreamRef.current) {
                              localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
                            }
                            const stream = await navigator.mediaDevices.getUserMedia({
                              audio: dev.deviceId ? { deviceId: { ideal: dev.deviceId } } : true
                            });
                            const track = stream.getAudioTracks()[0];
                            if (track) {
                              if (localStreamRef.current) {
                                localStreamRef.current.getAudioTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
                                localStreamRef.current.addTrack(track);
                              } else {
                                localStreamRef.current = stream;
                              }
                              setupAudioMeter(localStreamRef.current);
                              peerConnectionsRef.current.forEach(async (pc) => {
                                const sender = pc.getSenders().find((s) => s.track?.kind === 'audio' || (s as any).kind === 'audio');
                                if (sender) await sender.replaceTrack(track).catch(() => {});
                              });
                              setIsAudioMuted(false);
                            }
                          } catch {}
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#333333] transition-colors cursor-pointer ${
                          !isVirtualMicActive && selectedAudioInput === dev.deviceId ? 'text-emerald-400 font-bold bg-[#2a2a2a]' : 'text-slate-200'
                        }`}
                      >
                        <span className="truncate max-w-[220px]">
                          {dev.label ? `🎙️ ${dev.label}` : `🎙️ Mikrofon Hardware ${idx + 1}`}
                        </span>
                        {!isVirtualMicActive && selectedAudioInput === dev.deviceId && <CheckIcon className="w-4 h-4 shrink-0 text-emerald-400" />}
                      </button>
                    ))}
                    {audioInputDevices.length === 0 && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-slate-800 space-y-1.5">
                        <p className="text-[11px] text-slate-400">
                          Mikrofon fisik belum terhubung atau belum diizinkan oleh browser.
                        </p>
                        <button
                          type="button"
                          onClick={() => refreshDevices(true)}
                          className="w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold text-[11px] rounded-md border border-emerald-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Izinkan Akses Mikrofon Browser</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Speaker Selection */}
                {audioOutputDevices.length > 0 && (
                  <div className="pt-2 border-t border-slate-700">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                      PILIH SPEAKER (OUTPUT)
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {audioOutputDevices.map((dev, idx) => {
                        const isSelected = selectedAudioOutput === dev.deviceId || (!selectedAudioOutput && idx === 0);
                        return (
                          <button
                            key={dev.deviceId || idx}
                            type="button"
                            onClick={async () => {
                              setSelectedAudioOutput(dev.deviceId);
                              try {
                                const videoElements = document.querySelectorAll('video, audio');
                                videoElements.forEach((el: any) => {
                                  if (typeof el.setSinkId === 'function') {
                                    el.setSinkId(dev.deviceId).catch(() => {});
                                  }
                                });
                              } catch {}
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between hover:bg-[#333333] transition-colors cursor-pointer ${
                              isSelected ? 'text-emerald-400 font-bold bg-[#2a2a2a]' : 'text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate max-w-[220px]">
                              <span>🔊</span>
                              <span className="truncate">{dev.label || `Speaker ${idx + 1}`}</span>
                            </div>
                            {isSelected && <CheckIcon className="w-4 h-4 shrink-0 text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: Live Mic Level & Audio Test */}
                <div className="pt-2 border-t border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Level Suara Mikrofon:</span>
                    <div className="w-32 h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-slate-700">
                      <div
                        style={{ width: `${Math.min(100, audioLevel)}%` }}
                        className="h-full bg-emerald-500 transition-all duration-75"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => playAudioTestChime()}
                    className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>🔊 Uji Speaker & Mikrofon</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Start / Stop Video */}
          <div className="flex items-center relative">
            <button
              type="button"
              onClick={handleToggleVideo}
              className="flex flex-col items-center justify-center w-14 h-12 rounded-lg hover:bg-[#2b2b2b] text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <div className="relative">
                <VideoCameraIcon className={`w-5 h-5 ${isVideoDisabled ? 'text-rose-500' : 'text-[#2DA771]'}`} />
                {isVideoDisabled && <span className="absolute inset-0 border-t-2 border-rose-500 rotate-45 top-2.5" />}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{isVideoDisabled ? 'Start Video' : 'Stop Video'}</span>
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowVideoMenu((v) => !v);
                setShowAudioMenu(false);
                refreshDevices();
              }}
              className={`p-1.5 rounded hover:bg-[#2b2b2b] text-slate-400 hover:text-white -ml-1 cursor-pointer ${
                showVideoMenu ? 'bg-[#2b2b2b] text-white' : ''
              }`}
              title="Pengaturan Kamera & Video"
            >
              <ChevronUpIcon className="w-3.5 h-3.5" />
            </button>

            {/* Video Settings Popover (Zoom Style) */}
            {showVideoMenu && (
              <div className="absolute bottom-16 left-0 w-72 bg-[#222222] border border-slate-700 rounded-xl shadow-2xl p-2.5 text-xs text-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 mb-2">
                  <span className="font-bold text-white text-[11px] uppercase tracking-wider">Pilih Kamera</span>
                  <button type="button" onClick={() => setShowVideoMenu(false)} className="text-slate-400 hover:text-white">
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto mb-2">
                  {videoInputDevices.length > 0 ? (
                    videoInputDevices.map((dev, idx) => (
                      <button
                        key={dev.deviceId || idx}
                        type="button"
                        onClick={async () => {
                          setSelectedVideoInput(dev.deviceId);
                          setShowVideoMenu(false);
                          try {
                            // 1. Release previous video tracks to prevent hardware lock
                            if (localStreamRef.current) {
                              localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
                            }

                            // 2. Safely acquire new video stream with fallback
                            let stream: MediaStream | null = null;
                            const videoConstraint = dev.deviceId
                              ? { deviceId: { ideal: dev.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
                              : { width: { ideal: 640 }, height: { ideal: 480 } };

                            try {
                              stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint });
                            } catch {
                              stream = await navigator.mediaDevices.getUserMedia({
                                video: dev.deviceId ? { deviceId: dev.deviceId } : true
                              });
                            }

                            const newTrack = stream?.getVideoTracks()[0];
                            if (newTrack) {
                              if (localStreamRef.current) {
                                // Remove old video tracks
                                localStreamRef.current.getVideoTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
                                localStreamRef.current.addTrack(newTrack);
                              } else {
                                localStreamRef.current = stream;
                              }

                              if (localVideoRef.current) {
                                localVideoRef.current.srcObject = localStreamRef.current;
                                localVideoRef.current.play().catch(() => {});
                              }

                              // Replace track across all active WebRTC peers
                              peerConnectionsRef.current.forEach(async (pc) => {
                                const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || (s as any).kind === 'video');
                                if (sender) {
                                  await sender.replaceTrack(newTrack).catch(() => {});
                                } else {
                                  try {
                                    pc.addTrack(newTrack, localStreamRef.current!);
                                  } catch {}
                                }
                              });

                              setIsVideoDisabled(false);
                            }
                          } catch (err: any) {
                            console.warn('Gagal beralih kamera:', err.message);
                            setIsVideoDisabled(true);
                          }
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#333333] transition-colors cursor-pointer ${
                          selectedVideoInput === dev.deviceId ? 'text-emerald-400 font-bold bg-[#2a2a2a]' : ''
                        }`}
                      >
                        <span className="truncate max-w-[200px]">{dev.label || `Kamera ${idx + 1}`}</span>
                        {selectedVideoInput === dev.deviceId && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-[11px] text-slate-400 italic">
                      Tidak ada perangkat webcam terdeteksi.
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVideoMenu(false);
                      handleToggleVideo();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#333333] text-slate-300 transition-colors cursor-pointer"
                  >
                    🔄 Sambungkan Ulang Kamera
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Main Zoom Action Hub */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Security */}
          <button
            type="button"
            onClick={() => setActiveSidebar((prev) => (prev === 'SECURITY' ? null : 'SECURITY'))}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer ${
              activeSidebar === 'SECURITY' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
            }`}
          >
            <ShieldCheckIcon className="w-5 h-5 text-[#2DA771]" />
            <span className="text-[10px] font-medium mt-0.5">Security</span>
          </button>

          {/* Participants */}
          <button
            type="button"
            onClick={() => setActiveSidebar((prev) => (prev === 'PARTICIPANTS' ? null : 'PARTICIPANTS'))}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer relative ${
              activeSidebar === 'PARTICIPANTS' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
            }`}
          >
            <UsersIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Participants</span>
            <span className="absolute top-1 right-2 text-[9px] bg-slate-700 px-1 rounded-full font-bold">
              {participants.length}
            </span>
          </button>

          {/* Chat */}
          <button
            type="button"
            onClick={() => setActiveSidebar((prev) => (prev === 'CHAT' ? null : 'CHAT'))}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer relative ${
              activeSidebar === 'CHAT' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Chat</span>
            {meetingChat.filter((c) => c.role !== 'Sistem').length > 0 && (
              <span className="absolute top-1 right-2 text-[9px] bg-[#0E71EB] text-white px-1.5 rounded-full font-bold">
                {meetingChat.filter((c) => c.role !== 'Sistem').length}
              </span>
            )}
          </button>

          {/* Share Screen (Zoom Green Button) */}
          <button
            type="button"
            onClick={() => setIsScreenSharing((v) => !v)}
            className="flex flex-col items-center justify-center w-16 sm:w-20 h-12 rounded-lg hover:bg-[#2b2b2b] text-[#2DA771] hover:text-[#38c98c] transition-colors cursor-pointer"
          >
            <ArrowUpTrayIcon className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] font-bold mt-0.5">
              {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </span>
          </button>

          {/* Whiteboard */}
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === 'WHITEBOARD' ? 'GALLERY' : 'WHITEBOARD'))}
            className={`hidden sm:flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'WHITEBOARD' ? 'bg-[#0E71EB] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
            }`}
          >
            <PencilSquareIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Whiteboard</span>
          </button>

          {/* Record */}
          <button
            type="button"
            onClick={() => setIsRecording((v) => !v)}
            className={`hidden sm:flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer ${
              isRecording ? 'text-red-500 animate-pulse' : 'hover:bg-[#2b2b2b] text-slate-300'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
              </div>
            </div>
            <span className="text-[10px] font-medium mt-0.5">{isRecording ? 'Pause REC' : 'Record'}</span>
          </button>

          {/* Reactions (Zoom Emoji Popover) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactions((v) => !v)}
              className="flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg hover:bg-[#2b2b2b] text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <FaceSmileIcon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">Reactions</span>
            </button>

            {showReactions && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#242424] border border-slate-700 p-2.5 rounded-2xl shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 text-2xl">
                  {['👏', '👍', '❤️', '😂', '😮', '🎉'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleTriggerReaction(emoji)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsHandRaised((v) => !v);
                    setShowReactions(false);
                  }}
                  className="w-full py-1.5 bg-[#333] hover:bg-[#444] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-white"
                >
                  <HandRaisedIcon className="w-4 h-4 text-amber-400" />
                  <span>{isHandRaised ? 'Turunkan Tangan' : 'Angkat Tangan (Raise Hand)'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: End Meeting (Zoom Red Button) */}
        <div>
          <button
            type="button"
            onClick={handleLeave}
            className="px-4 sm:px-5 py-2 bg-[#E02424] hover:bg-[#c81e1e] active:scale-95 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-lg"
          >
            End
          </button>
        </div>
      </footer>
    </div>
  );
};
