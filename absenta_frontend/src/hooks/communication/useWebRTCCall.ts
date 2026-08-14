import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';

export type CallState = 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED' | 'RECONNECTING' | 'ENDED';
export type CallType = 'AUDIO' | 'VIDEO';

export interface CallerInfo {
  callId: string;
  callerId: string;
  callerName: string;
  callerRole: string;
  callerAvatar?: string;
  callType: CallType;
  offer?: any;
  threadId?: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

export function useWebRTCCall() {
  const { socket } = useSocket();
  const { user } = useAuthStore();

  const [callState, setCallState] = useState<CallState>('IDLE');
  const [callType, setCallType] = useState<CallType>('AUDIO');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<{ id: string; name: string; role?: string; avatar?: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallerInfo | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<any>(null);
  const ringtoneTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 🔔 Web Audio Ringtone Generator (Pure Synthesizer, no external mp3 needed)
  const playRingtone = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // Standard A4
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      };

      playBeep();
      ringtoneTimerRef.current = setInterval(playBeep, 2500);
    } catch {}
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Cleanup WebRTC Peer Connection & Hardware Tracks
  const cleanupCall = useCallback(() => {
    stopRingtone();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setCallState('IDLE');
    setActiveCallId(null);
    setTargetUser(null);
    setIncomingCall(null);
    setIsAudioMuted(false);
    setIsVideoDisabled(false);
    setIsScreenSharing(false);
    setIsMinimized(false);
    setCallDuration(0);
    setThreadId(undefined);
  }, [stopRingtone]);

  // Inisiasi RTCPeerConnection baru
  const createPeerConnection = useCallback((targetUserId: string, callId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 4
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice_candidate', {
          callId,
          targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      event.streams[0].getTracks().forEach(track => {
        remoteStreamRef.current?.addTrack(track);
      });
      setCallState('CONNECTED');
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('CONNECTED');
        stopRingtone();
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, cleanupCall, stopRingtone]);

  // 1. Memulai Panggilan Keluar (Outgoing Call)
  const startCall = async (
    target: { id: string; name: string; role?: string; avatar?: string },
    type: CallType = 'AUDIO',
    threadIdParam?: string
  ) => {
    if (!socket || !user) return;
    cleanupCall();

    try {
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setActiveCallId(callId);
      setTargetUser(target);
      setCallType(type);
      setThreadId(threadIdParam);
      setCallState('CALLING');

      // Ambil Media Stream lokal (Mic & Camera)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'VIDEO' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
      });
      localStreamRef.current = stream;

      const pc = createPeerConnection(target.id, callId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:initiate', {
        callId,
        targetUserId: target.id,
        threadId: threadIdParam,
        callType: type,
        offer,
        callerName: user.full_name,
        callerRole: user.role?.name || 'GTK',
        callerAvatar: user.avatar_url
      });

      playRingtone();
    } catch (err: any) {
      alert('Gagal mengakses mikrofon atau kamera: ' + err.message);
      cleanupCall();
    }
  };

  // 2. Menerima Panggilan Masuk (Answer Incoming Call)
  const acceptCall = async () => {
    if (!incomingCall || !socket || !user) return;
    stopRingtone();

    try {
      const callId = incomingCall.callId;
      setActiveCallId(callId);
      setTargetUser({
        id: incomingCall.callerId,
        name: incomingCall.callerName,
        role: incomingCall.callerRole,
        avatar: incomingCall.callerAvatar
      });
      setCallType(incomingCall.callType);
      setThreadId(incomingCall.threadId);
      setCallState('CONNECTED');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'VIDEO' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
      });
      localStreamRef.current = stream;

      const pc = createPeerConnection(incomingCall.callerId, callId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:accepted', {
        callId,
        targetUserId: incomingCall.callerId,
        answer
      });

      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }
      setIncomingCall(null);
    } catch (err: any) {
      alert('Gagal menerima panggilan: ' + err.message);
      cleanupCall();
    }
  };

  // 3. Menolak Panggilan Masuk (Reject Call)
  const rejectCall = (reason: string = 'Panggilan ditolak') => {
    if (!incomingCall || !socket) return;
    socket.emit('call:rejected', {
      callId: incomingCall.callId,
      targetUserId: incomingCall.callerId,
      reason
    });
    cleanupCall();
  };

  // 4. Mengakhiri Panggilan Aktif (End Call)
  const endCall = () => {
    if (activeCallId && targetUser && socket) {
      socket.emit('call:ended', {
        callId: activeCallId,
        targetUserId: targetUser.id,
        durationSeconds: callDuration,
        threadId,
        callType
      });
    }
    cleanupCall();
  };

  // 5. Toggle Mute Audio
  const toggleMuteAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // 6. Toggle Camera Video
  const toggleDisableVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  // 7. Toggle Screen Sharing (Bagi Layar)
  const toggleScreenShare = async () => {
    if (!pcRef.current || callType !== 'VIDEO') return;

    try {
      if (isScreenSharing) {
        // Balik ke Camera Stream
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender && camTrack) {
          sender.replaceTrack(camTrack);
        }
        setIsScreenSharing(false);
      } else {
        // Mulai Screen Share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender && screenTrack) {
          sender.replaceTrack(screenTrack);
          screenTrack.onended = () => toggleScreenShare();
        }
        setIsScreenSharing(true);
      }
    } catch (err: any) {
      console.warn('Screen sharing cancelled or failed:', err.message);
    }
  };

  // ── Socket WebRTC Event Listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // A. Panggilan Masuk (Incoming Call)
    const handleIncoming = (data: CallerInfo) => {
      setIncomingCall(data);
      playRingtone();
    };

    // B. Panggilan Diterima Lawan Bicara (Call Accepted by Remote)
    const handleAccepted = async (data: { callId: string; answer: any }) => {
      if (pcRef.current && data.answer) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState('CONNECTED');
        stopRingtone();
      }
    };

    // C. Panggilan Ditolak Lawan Bicara
    const handleRejected = (data: { reason: string }) => {
      alert(`Panggilan tidak terjawab: ${data.reason || 'Ditolak'}`);
      cleanupCall();
    };

    // D. ICE Candidate dari Lawan Bicara
    const handleIceCandidate = async (data: { candidate: any }) => {
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {}
      }
    };

    // E. Panggilan Selesai dari Lawan Bicara
    const handleEnded = () => {
      cleanupCall();
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:ice_candidate', handleIceCandidate);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:ice_candidate', handleIceCandidate);
      socket.off('call:ended', handleEnded);
    };
  }, [socket, playRingtone, stopRingtone, cleanupCall]);

  return {
    callState,
    callType,
    activeCallId,
    targetUser,
    incomingCall,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    isMinimized,
    callDuration,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMuteAudio,
    toggleDisableVideo,
    toggleScreenShare,
    setIsMinimized
  };
}
