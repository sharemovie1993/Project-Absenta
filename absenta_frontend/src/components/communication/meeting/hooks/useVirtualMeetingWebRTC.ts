import { useState, useEffect, useRef } from 'react';
import type { Participant, AudioDevice } from '../types';

interface UseVirtualMeetingWebRTCOptions {
  isOpen: boolean;
  roomId: string;
  roomTitle: string;
  user: any;
  socket: any;
}

export function useVirtualMeetingWebRTC({
  isOpen,
  roomId,
  roomTitle,
  user,
  socket,
}: UseVirtualMeetingWebRTCOptions) {
  // ── Audio/Video Mute States (Persisted) ──────────────────────────────────────
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('absenta_meet_audio_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('absenta_meet_video_disabled') === 'true';
    } catch {
      return false;
    }
  });

  // ── Network Quality & Devices ───────────────────────────────────────────────
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const netQualityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [audioInputDevices, setAudioInputDevices] = useState<AudioDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioDevice[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<AudioDevice[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [mobileFacingMode, setMobileFacingMode] = useState<'user' | 'environment'>('user');

  // ── Participants & Streams ──────────────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'local',
      name: user?.full_name || 'Saya (Host)',
      role: user?.role?.name || user?.roleName || 'HOST',
      avatarColor: 'bg-[#0E71EB]',
      isHost: true,
      isAudioMuted: false,
      isVideoOff: false,
      isHandRaised: false
    }
  ]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('local');
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // ── References ──────────────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidateQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // ── Dynamic STUN/Coturn ICE Servers ─────────────────────────────────────────
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchIceConfig = async () => {
      try {
        const res = await fetch('/api/v1/communication/ice-servers');
        const json = await res.json();
        if (json?.success && Array.isArray(json?.data?.iceServers) && json.data.iceServers.length > 0) {
          setIceServers(json.data.iceServers);
          console.info(`[ICE Config] Loaded ${json.data.iceServers.length} ICE server definitions (Coturn: ${json.data.coturnEnabled ? 'ON' : 'OFF'})`);
        }
      } catch {
        console.info('[ICE Config] Using default Google STUN servers');
      }
    };
    fetchIceConfig();
  }, [isOpen]);

  // ── Audio/Video Constraints Builders ────────────────────────────────────────
  const buildAudioConstraints = (deviceId?: string): MediaTrackConstraints => ({
    ...(deviceId && deviceId !== 'virtual-mic' ? { deviceId: { exact: deviceId } } : {}),
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl:  { ideal: true },
    sampleRate:       { ideal: 48000 },
    channelCount:     { ideal: 1 },
    latency:          { ideal: 0.01 },
  });

  const buildVideoConstraints = (deviceId?: string, facingMode: 'user' | 'environment' = 'user'): MediaTrackConstraints => ({
    ...(deviceId ? { deviceId: { ideal: deviceId } } : {}),
    width:     { min: 320, ideal: 640,  max: 1280 },
    height:    { min: 240, ideal: 480,  max: 720  },
    frameRate: { min: 15,  ideal: 24,  max: 30   },
    facingMode: { ideal: facingMode },
  });

  // ── Device Enumeration ──────────────────────────────────────────────────────
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioIns = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Mikrofon', kind: d.kind }));
      const audioOuts = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Speaker Sistem', kind: d.kind }));
      const videoIns = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Kamera / Webcam', kind: d.kind }));

      if (audioIns.length === 0) {
        audioIns.push({ deviceId: 'virtual-mic', label: '✨ Mikrofon Virtual Absenta', kind: 'audioinput' });
      }

      setAudioInputDevices(audioIns);
      setAudioOutputDevices(audioOuts);
      setVideoInputDevices(videoIns);

      if (!selectedAudioInput && audioIns[0]) setSelectedAudioInput(audioIns[0].deviceId);
      if (!selectedAudioOutput && audioOuts[0]) setSelectedAudioOutput(audioOuts[0].deviceId);
      if (!selectedVideoInput && videoIns[0]) setSelectedVideoInput(videoIns[0].deviceId);
    } catch (err: any) {
      console.warn('Gagal memuat daftar perangkat keras media:', err.message);
    }
  };

  const playAudioTestChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch {}
  };

  const attachVideoElement = (stream: MediaStream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.playsInline = true;
      localVideoRef.current.play().catch(() => {});
    }
  };

  // ── Hardware Setup on Mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const startLocalHardware = async () => {
      try {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: buildVideoConstraints(undefined, 'user'),
            audio: buildAudioConstraints(),
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: buildAudioConstraints(),
            });
            setIsVideoDisabled(true);
          } catch {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#0E71EB';
              ctx.fillRect(0, 0, 640, 480);
            }
            stream = (canvas as any).captureStream(15);
            setIsAudioMuted(true);
            setIsVideoDisabled(true);
          }
        }

        if (stream) {
          const savedVideoDisabled = localStorage.getItem('absenta_meet_video_disabled') === 'true';
          const savedAudioMuted = localStorage.getItem('absenta_meet_audio_muted') === 'true';
          if (savedVideoDisabled) {
            stream.getVideoTracks().forEach((t) => { t.enabled = false; });
          }
          if (savedAudioMuted) {
            stream.getAudioTracks().forEach((t) => { t.enabled = false; });
          }

          localStreamRef.current = stream;
          attachVideoElement(stream);

          // Distribute new tracks to all existing peer connections immediately
          peerConnectionsRef.current.forEach(async (pc) => {
            stream.getTracks().forEach((track) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
              if (sender) {
                sender.replaceTrack(track).catch(() => {});
              } else {
                try { pc.addTrack(track, stream); } catch {}
              }
            });
          });

          // Auto-recovery
          stream.getVideoTracks().forEach((track) => {
            track.addEventListener('ended', () => {
              console.warn('[WebRTC] Video track ended unexpectedly — attempting recovery');
              handleReconnectCamera();
            });
          });
          stream.getAudioTracks().forEach((track) => {
            track.addEventListener('ended', () => {
              console.warn('[WebRTC] Audio track ended unexpectedly — attempting recovery');
              navigator.mediaDevices.getUserMedia({ audio: buildAudioConstraints(selectedAudioInput) })
                .then((newStream) => {
                  const newTrack = newStream.getAudioTracks()[0];
                  if (newTrack && localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
                    localStreamRef.current.addTrack(newTrack);
                    peerConnectionsRef.current.forEach(async (pc) => {
                      const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
                      if (sender) await sender.replaceTrack(newTrack).catch(() => {});
                    });
                    setIsAudioMuted(false);
                  }
                })
                .catch(() => {});
            });
          });

          // Audio Analyser Setup (48kHz, fftSize 256, smoothing 0.8)
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass({ sampleRate: 48000 });
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            if (stream.getAudioTracks().length > 0) {
              const source = audioCtx.createMediaStreamSource(stream);
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const checkAudio = () => {
                if (analyserRef.current) {
                  analyserRef.current.getByteFrequencyData(dataArray);
                  const sum = dataArray.reduce((a, b) => a + b, 0);
                  const avg = sum / dataArray.length;
                  setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                }
                animationFrameRef.current = requestAnimationFrame(checkAudio);
              };
              checkAudio();
            }
          } catch {}

          // Network Quality Polling via RTCStatsReport
          netQualityTimerRef.current = setInterval(async () => {
            try {
              const pcs = Array.from(peerConnectionsRef.current.values());
              if (pcs.length === 0) return;
              const pc = pcs[0];
              const stats = await pc.getStats();
              let totalLost = 0;
              let totalSent = 0;
              stats.forEach((report) => {
                if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
                  totalLost += report.retransmittedPacketsSent ?? 0;
                  totalSent += report.packetsSent ?? 1;
                }
              });
              const lossRatio = totalSent > 0 ? totalLost / totalSent : 0;
              if (lossRatio < 0.02) setNetworkQuality('good');
              else if (lossRatio < 0.08) setNetworkQuality('fair');
              else setNetworkQuality('poor');
            } catch {}
          }, 5000);
        }
      } catch (err: any) {
        console.warn('Inisialisasi perangkat keras WebRTC dilewati:', err.message);
      }

      await refreshDevices();
    };

    startLocalHardware();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (netQualityTimerRef.current) {
        clearInterval(netQualityTimerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isOpen]);

  // ── Create Hardened RTCPeerConnection (STUN + Bandwidth + ICE Restart) ─────
  const createHardenedPeerConnection = (remoteUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: iceServers,
      iceCandidatePoolSize: 10,
    });

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.info(`[ICE] ${remoteUserId} → ${state}`);
      if (state === 'failed') {
        console.warn(`[ICE] Connection failed to ${remoteUserId} — restarting ICE`);
        pc.restartIce();
      }
      if (state === 'disconnected') {
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            console.warn(`[ICE] Still disconnected from ${remoteUserId} — restarting ICE`);
            pc.restartIce();
          }
        }, 4000);
      }
    };

    const applyBandwidthLimits = async () => {
      try {
        for (const sender of pc.getSenders()) {
          if (!sender.track) continue;
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          if (sender.track.kind === 'video') {
            params.encodings[0].maxBitrate = 500_000;
            params.encodings[0].maxFramerate = 24;
          } else if (sender.track.kind === 'audio') {
            params.encodings[0].maxBitrate = 64_000;
          }
          await sender.setParameters(params).catch(() => {});
        }
      } catch {}
    };

    pc.onnegotiationneeded = () => {
      setTimeout(applyBandwidthLimits, 500);
    };

    // Remote stream capture with native MediaStream binding
    pc.ontrack = (event) => {
      console.info(`[WebRTC] ontrack received from ${remoteUserId}:`, event.track.kind, event.streams);
      const incomingStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      setRemoteStreams((prev) => ({
        ...prev,
        [remoteUserId]: incomingStream
      }));
    };

    if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch {}
    }

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  };

  // ── WebRTC Socket Signaling ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !socket) return;

    const myName = user?.full_name || user?.name || user?.username || 'Saya';
    const myRole = user?.role?.name || user?.roleName || 'HOST';

    socket.emit('meeting:join', {
      roomId,
      roomTitle,
      participantInfo: {
        name: myName,
        role: myRole
      }
    });

    const handleRoomState = async (data: { peers: Array<{ userId: string; name: string; role?: string; avatar?: string }> }) => {
      const existingPeers = data.peers || [];
      const remoteUsers: Participant[] = existingPeers
        .filter((p) => p.userId !== user?.id && p.userId !== 'local')
        .map((p, idx) => ({
          id: p.userId,
          name: p.name || `Peserta ${idx + 1}`,
          role: p.role || 'PESERTA',
          avatarColor: ['bg-[#2DA771]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]'][idx % 4],
          isHost: false,
          isAudioMuted: false,
          isVideoOff: false,
          isHandRaised: false
        }));

      const mySelf: Participant = {
        id: 'local',
        name: `${myName} (Host, Me)`,
        role: myRole,
        avatarColor: 'bg-[#0E71EB]',
        isHost: true,
        isAudioMuted,
        isVideoOff: isVideoDisabled,
        isHandRaised: false
      };

      setParticipants([mySelf, ...remoteUsers]);

      for (const peer of remoteUsers) {
        try {
          const pc = createHardenedPeerConnection(peer.id);
          pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
              socket.emit('meeting:ice_candidate', {
                targetUserId: peer.id,
                roomId,
                candidate: event.candidate
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('meeting:offer', {
            targetUserId: peer.id,
            roomId,
            offer
          });
        } catch (err: any) {
          console.warn(`[WebRTC] Failed to create offer for peer ${peer.id}:`, err.message);
        }
      }
    };

    const handlePeerJoined = (peer: { userId: string; name?: string; role?: string }) => {
      if (!peer?.userId || peer.userId === user?.id || peer.userId === 'local') return;
      setParticipants((prev) => {
        if (prev.some((p) => p.id === peer.userId)) return prev;
        return [
          ...prev,
          {
            id: peer.userId,
            name: peer.name || `Peserta ${prev.length}`,
            role: peer.role || 'PESERTA',
            avatarColor: ['bg-[#2DA771]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]'][prev.length % 4],
            isHost: false,
            isAudioMuted: false,
            isVideoOff: false,
            isHandRaised: false
          }
        ];
      });
    };

    const handleOffer = async (data: {
      fromUserId: string;
      roomId: string;
      offer: RTCSessionDescriptionInit;
      senderInfo?: { name: string; role?: string };
    }) => {
      if (!data?.fromUserId || data.fromUserId === user?.id) return;

      setParticipants((prev) => {
        if (prev.some((p) => p.id === data.fromUserId)) return prev;
        return [
          ...prev,
          {
            id: data.fromUserId,
            name: data.senderInfo?.name || `Peserta ${prev.length}`,
            role: data.senderInfo?.role || 'PESERTA',
            avatarColor: ['bg-[#2DA771]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]'][prev.length % 4],
            isHost: false,
            isAudioMuted: false,
            isVideoOff: false,
            isHandRaised: false
          }
        ];
      });

      try {
        let pc = peerConnectionsRef.current.get(data.fromUserId);
        if (!pc) {
          pc = createHardenedPeerConnection(data.fromUserId);
        }

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            const sender = pc!.getSenders().find((s) => s.track?.kind === track.kind);
            if (!sender) {
              try { pc!.addTrack(track, localStreamRef.current!); } catch {}
            }
          });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('meeting:ice_candidate', {
              targetUserId: data.fromUserId,
              roomId,
              candidate: event.candidate
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const queuedOfferCandidates = candidateQueueRef.current.get(data.fromUserId) || [];
        for (const cand of queuedOfferCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }
        candidateQueueRef.current.delete(data.fromUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('meeting:answer', {
          targetUserId: data.fromUserId,
          roomId,
          answer
        });
      } catch (err: any) {
        console.warn(`[WebRTC] Failed to handle offer from ${data.fromUserId}:`, err.message);
      }
    };

    const handleAnswer = async (data: { fromUserId: string; roomId: string; answer: RTCSessionDescriptionInit }) => {
      if (!data?.fromUserId || data.fromUserId === user?.id) return;
      try {
        const pc = peerConnectionsRef.current.get(data.fromUserId);
        if (pc && pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          const queuedAnswerCandidates = candidateQueueRef.current.get(data.fromUserId) || [];
          for (const cand of queuedAnswerCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
          candidateQueueRef.current.delete(data.fromUserId);
        }
      } catch (err: any) {
        console.warn(`[WebRTC] Failed to handle answer from ${data.fromUserId}:`, err.message);
      }
    };

    const handleIceCandidate = async (data: { fromUserId: string; roomId: string; candidate: RTCIceCandidateInit }) => {
      if (!data?.fromUserId || data.fromUserId === user?.id) return;
      try {
        const pc = peerConnectionsRef.current.get(data.fromUserId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          const queue = candidateQueueRef.current.get(data.fromUserId) || [];
          queue.push(data.candidate);
          candidateQueueRef.current.set(data.fromUserId, queue);
        }
      } catch (err: any) {
        console.warn(`[WebRTC] Failed to add ICE candidate from ${data.fromUserId}:`, err.message);
      }
    };

    const handlePeerLeft = (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
      const pc = peerConnectionsRef.current.get(data.userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.userId);
      }
    };

    const handleMuteAll = () => {
      setIsAudioMuted(true);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    };

    socket.on('meeting:room_state', handleRoomState);
    socket.on('meeting:peer_joined', handlePeerJoined);
    socket.on('meeting:offer', handleOffer);
    socket.on('meeting:answer', handleAnswer);
    socket.on('meeting:ice_candidate', handleIceCandidate);
    socket.on('meeting:peer_left', handlePeerLeft);
    socket.on('meeting:mute_all', handleMuteAll);

    return () => {
      socket.off('meeting:room_state', handleRoomState);
      socket.off('meeting:peer_joined', handlePeerJoined);
      socket.off('meeting:offer', handleOffer);
      socket.off('meeting:answer', handleAnswer);
      socket.off('meeting:ice_candidate', handleIceCandidate);
      socket.off('meeting:peer_left', handlePeerLeft);
      socket.off('meeting:mute_all', handleMuteAll);
    };
  }, [isOpen, roomId, socket]);

  // ── Actions & Handlers ──────────────────────────────────────────────────────
  const handleToggleAudio = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('absenta_meet_audio_muted', String(next));
      } catch {}
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const handleToggleVideo = () => {
    setIsVideoDisabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('absenta_meet_video_disabled', String(next));
      } catch {}
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const handleSelectMicrophone = async (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    try {
      if (deviceId === 'virtual-mic') {
        setIsAudioMuted(false);
        return;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: buildAudioConstraints(deviceId)
      });
      const newTrack = stream.getAudioTracks()[0];
      if (newTrack && localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
        localStreamRef.current.addTrack(newTrack);
        setIsAudioMuted(false);
        peerConnectionsRef.current.forEach(async (pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (sender) await sender.replaceTrack(newTrack).catch(() => {});
        });
      }
    } catch (err: any) {
      console.warn('Gagal beralih mikrofon:', err.message);
    }
  };

  const handleSelectSpeaker = async (deviceId: string) => {
    setSelectedAudioOutput(deviceId);
    try {
      if (localVideoRef.current && 'setSinkId' in localVideoRef.current) {
        await (localVideoRef.current as any).setSinkId(deviceId === 'default' ? '' : deviceId);
      }
      playAudioTestChime();
    } catch (err: any) {
      console.warn('Audio output routing sinkId gagal:', err.message);
    }
  };

  const handleFlipCamera = async () => {
    const nextMode = mobileFacingMode === 'user' ? 'environment' : 'user';
    setMobileFacingMode(nextMode);
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { exact: nextMode }, width: { ideal: 640 }, height: { ideal: 480 } }
        })
        .catch(async () => {
          return await navigator.mediaDevices.getUserMedia({
            video: { facingMode: nextMode }
          });
        });

      const newTrack = stream?.getVideoTracks()[0];
      if (newTrack) {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
          localStreamRef.current.addTrack(newTrack);
        } else {
          localStreamRef.current = stream;
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }

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
      console.warn('Gagal membalik kamera HP:', err.message);
    }
  };

  const handleSelectCamera = async (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: buildVideoConstraints(deviceId) });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId } : true
        });
      }

      const newTrack = stream?.getVideoTracks()[0];
      if (newTrack) {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
          localStreamRef.current.addTrack(newTrack);
        } else {
          localStreamRef.current = stream;
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }

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
    }
  };

  const handleReconnectCamera = () => {
    handleSelectCamera(selectedVideoInput);
  };

  return {
    isAudioMuted,
    isVideoDisabled,
    setIsAudioMuted,
    setIsVideoDisabled,
    handleToggleAudio,
    handleToggleVideo,
    networkQuality,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    audioLevel,
    mobileFacingMode,
    refreshDevices,
    playAudioTestChime,
    handleSelectMicrophone,
    handleSelectSpeaker,
    handleSelectCamera,
    handleFlipCamera,
    handleReconnectCamera,
    participants,
    setParticipants,
    activeSpeakerId,
    setActiveSpeakerId,
    remoteStreams,
    localVideoRef,
    localStreamRef,
  };
}
