import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useSocket } from '../../../hooks/useSocket';
import type { ChatMessage, VirtualMeetingModalProps } from './types';
import { MeetingTopNav } from './MeetingTopNav';
import { MeetingToolbar } from './MeetingToolbar';
import { MeetingChatSidebar } from './MeetingChatSidebar';
import { MeetingParticipantsSidebar } from './MeetingParticipantsSidebar';
import { MeetingSecuritySidebar } from './MeetingSecuritySidebar';
import { MeetingWhiteboard } from './MeetingWhiteboard';
import { MeetingGalleryView } from './views/MeetingGalleryView';
import { MeetingSpeakerView } from './views/MeetingSpeakerView';
import { useVirtualMeetingWebRTC } from './hooks/useVirtualMeetingWebRTC';

export const VirtualMeetingModal: React.FC<VirtualMeetingModalProps> = ({
  isOpen,
  onClose,
  roomTitle = 'Rapat Koordinasi KBM & Kurikulum',
  roomId = `meet-kbm-${Date.now().toString(36)}`
}) => {
  const { user } = useAuthStore();
  const { socket } = useSocket();

  // ── Meeting Layout & Feature States ─────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'GALLERY' | 'SPEAKER' | 'WHITEBOARD'>('GALLERY');
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [activeSidebar, setActiveSidebar] = useState<'PARTICIPANTS' | 'CHAT' | 'SECURITY' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [meetingDuration, setMeetingDuration] = useState<number>(0);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [showReactionMenu, setShowReactionMenu] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [notulenSavedToDb, setNotulenSavedToDb] = useState<boolean>(false);

  // ── Device Popover Menu States ──────────────────────────────────────────────
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [showVideoMenu, setShowVideoMenu] = useState<boolean>(false);

  // ── Whiteboard Canvas References ────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [toolMode, setToolMode] = useState<'PEN' | 'ERASER'>('PEN');
  const [brushColor, setBrushColor] = useState<string>('#0E71EB');
  const [brushSize, setBrushSize] = useState<number>(3);

  // ── Chat State ──────────────────────────────────────────────────────────────
  const [meetingChat, setMeetingChat] = useState<ChatMessage[]>([
    {
      sender: 'Sistem Absenta',
      role: 'Sistem',
      text: `Selamat datang di ruang rapat virtual: ${roomTitle}. Semua aktivitas percakapan tersimpan otomatis di database sekolah.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  // ── Core WebRTC & Signaling Hook ────────────────────────────────────────────
  const {
    isAudioMuted,
    isVideoDisabled,
    setIsAudioMuted,
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
  } = useVirtualMeetingWebRTC({
    isOpen,
    roomId,
    roomTitle,
    user,
    socket,
  });

  // ── Meeting Duration Timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setMeetingDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Meeting Socket Listeners (Chat, Reaction, Notulen) ──────────────────────
  useEffect(() => {
    if (!isOpen || !socket) return;

    const handleMeetingChat = (chatMsg: any) => {
      setMeetingChat((prev) => [
        ...prev,
        {
          senderId: chatMsg.senderId,
          sender: chatMsg.senderName || 'Peserta',
          role: chatMsg.senderRole,
          text: chatMsg.text,
          time: chatMsg.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    };

    const handleChatHistory = (history: any[]) => {
      if (!Array.isArray(history) || history.length === 0) return;
      const parsedHistory: ChatMessage[] = history.map((item) => ({
        senderId: item.sender_id,
        sender: item.sender_name || 'Peserta Rapat',
        role: item.sender_role,
        text: item.message,
        time: item.created_at
          ? new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }));

      setMeetingChat((prev) => {
        const systemMessages = prev.filter((p) => p.role === 'Sistem');
        const unique = [...systemMessages];
        for (const h of parsedHistory) {
          if (!unique.some((u) => u.senderId === h.senderId && u.text === h.text && u.time === h.time)) {
            unique.push(h);
          }
        }
        return unique;
      });
    };

    const handleMeetingReaction = (data: { emoji: string; userName?: string }) => {
      setFloatingReaction(data.emoji);
      setTimeout(() => setFloatingReaction(null), 2500);
    };

    const handleRaiseHand = (data: { userId: string; isRaised: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === data.userId ? { ...p, isHandRaised: data.isRaised } : p))
      );
    };

    socket.on('meeting:chat', handleMeetingChat);
    socket.on('meeting:chat_history', handleChatHistory);
    socket.on('meeting:reaction', handleMeetingReaction);
    socket.on('meeting:raise_hand', handleRaiseHand);
    socket.on('meeting:notulen_saved', (res: any) => {
      if (res?.success) setNotulenSavedToDb(true);
    });

    return () => {
      socket.off('meeting:chat', handleMeetingChat);
      socket.off('meeting:chat_history', handleChatHistory);
      socket.off('meeting:reaction', handleMeetingReaction);
      socket.off('meeting:raise_hand', handleRaiseHand);
      socket.off('meeting:notulen_saved');
    };
  }, [isOpen, socket]);

  // ── Actions & Handlers ──────────────────────────────────────────────────────
  const handleToggleHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socket) {
      socket.emit('meeting:raise_hand', { roomId, isRaised: nextState });
    }
  };

  const sendReaction = (emoji: string) => {
    setFloatingReaction(emoji);
    setShowReactionMenu(false);
    if (socket) {
      socket.emit('meeting:reaction', { roomId, emoji });
    }
    setTimeout(() => setFloatingReaction(null), 2500);
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/meet?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleLeave = () => {
    if (socket) {
      socket.emit('meeting:leave', { roomId });
    }
    saveNotulenToDatabase();
    onClose();
  };

  const handleMuteAll = () => {
    setIsAudioMuted(true);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    if (socket) {
      socket.emit('meeting:mute_all', { roomId });
    }
  };

  const handleSendMeetingChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    const myName = user?.full_name || 'Saya';
    const myRole = user?.role?.name || user?.roleName || 'Peserta';
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
      `Durasi Rapat  : ${Math.floor(meetingDuration / 60)} menit ${meetingDuration % 60} detik\n` +
      `Total Peserta : ${participants.length} orang\n` +
      `Total Pesan   : ${meetingChat.filter((c) => c.role !== 'Sistem').length}\n` +
      (notulenSavedToDb ? `Status DB     : ✅ Tersimpan ke database sekolah\n` : `Status DB     : ⚠️  Belum tersimpan ke database\n`) +
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

    if (!notulenSavedToDb) {
      saveNotulenToDatabase();
    }
  };

  const saveNotulenToDatabase = async () => {
    const chatMessages = meetingChat.filter((c) => c.role !== 'Sistem');
    if (chatMessages.length === 0) return;

    const payload = {
      roomId,
      roomTitle,
      hostName: user?.full_name || 'Host',
      hostId: user?.id,
      tanggal: new Date().toISOString().slice(0, 10),
      durasi: meetingDuration,
      totalPeserta: participants.length,
      peserta: participants.map((p) => ({ id: p.id, nama: p.name, peran: p.role })),
      percakapan: chatMessages.map((c) => ({
        pengirim: c.sender,
        peran: c.role || 'Peserta',
        pesan: c.text,
        waktu: c.time
      })),
      ringkasan: `Rapat ${roomTitle} selesai dengan ${participants.length} peserta.`
    };

    if (socket) {
      socket.emit('meeting:save_notulen', payload);
    }
  };

  // ── Whiteboard Canvas Handlers ──────────────────────────────────────────────
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
    ctx.lineWidth = toolMode === 'ERASER' ? brushSize * 4 : brushSize;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#121212] text-white flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
      {/* ── 1. TOP NAVIGATION BAR ────────────────────────────────────────── */}
      <MeetingTopNav
        roomTitle={roomTitle}
        roomId={roomId}
        meetingDuration={meetingDuration}
        formatDuration={formatDuration}
        isCopied={isCopied}
        handleCopyLink={handleCopyLink}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        onFlipCamera={handleFlipCamera}
        hasMultipleCameras={videoInputDevices.length > 1 || (typeof window !== 'undefined' && 'ontouchstart' in window)}
        onBackToChat={handleLeave}
        networkQuality={networkQuality}
      />

      {/* ── 2. MAIN MEETING STAGE & SIDEBARS ─────────────────────────────── */}
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
          <MeetingGalleryView
            isVisible={viewMode === 'GALLERY'}
            participants={participants}
            user={user}
            isAudioMuted={isAudioMuted}
            isVideoDisabled={isVideoDisabled}
            audioLevel={audioLevel}
            activeSpeakerId={activeSpeakerId}
            setActiveSpeakerId={setActiveSpeakerId}
            localVideoRef={localVideoRef}
            localStreamRef={localStreamRef}
            remoteStreams={remoteStreams}
            isHandRaised={isHandRaised}
          />

          {/* ── MODE B: SPEAKER VIEW (SPOTLIGHT + FILMSTRIP) ──────────────── */}
          <MeetingSpeakerView
            isVisible={viewMode === 'SPEAKER'}
            participants={participants}
            user={user}
            isAudioMuted={isAudioMuted}
            isVideoDisabled={isVideoDisabled}
            activeSpeakerId={activeSpeakerId}
            setActiveSpeakerId={setActiveSpeakerId}
            localStreamRef={localStreamRef}
            remoteStreams={remoteStreams}
            isHandRaised={isHandRaised}
          />

          {/* ── MODE C: DIGITAL WHITEBOARD (PAPAN TULIS KBM) ──────────────── */}
          <MeetingWhiteboard
            canvasRef={canvasRef}
            toolMode={toolMode}
            setToolMode={setToolMode}
            brushColor={brushColor}
            setBrushColor={setBrushColor}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            clearWhiteboard={clearWhiteboard}
            startDrawing={startDrawing}
            draw={draw}
            stopDrawing={stopDrawing}
            isVisible={viewMode === 'WHITEBOARD'}
          />
        </div>

        {/* ── 3. ZOOM SIDEBARS (PARTICIPANTS / CHAT / SECURITY) ───────────── */}
        {activeSidebar === 'PARTICIPANTS' && (
          <MeetingParticipantsSidebar
            participants={participants}
            handleMuteAll={handleMuteAll}
            handleCopyLink={handleCopyLink}
            onClose={() => setActiveSidebar(null)}
          />
        )}

        {activeSidebar === 'CHAT' && (
          <MeetingChatSidebar
            meetingChat={meetingChat}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendMeetingChat={handleSendMeetingChat}
            handleDownloadNotulen={handleDownloadNotulen}
            onClose={() => setActiveSidebar(null)}
            participants={participants}
            currentUser={user}
          />
        )}

        {activeSidebar === 'SECURITY' && (
          <MeetingSecuritySidebar onClose={() => setActiveSidebar(null)} />
        )}
      </div>

      {/* ── 4. BOTTOM TOOLBAR CONTROLS ─────────────────────────────────────── */}
      <MeetingToolbar
        isAudioMuted={isAudioMuted}
        isVideoDisabled={isVideoDisabled}
        handleToggleAudio={handleToggleAudio}
        handleToggleVideo={handleToggleVideo}
        showAudioMenu={showAudioMenu}
        setShowAudioMenu={setShowAudioMenu}
        showVideoMenu={showVideoMenu}
        setShowVideoMenu={setShowVideoMenu}
        showReactionMenu={showReactionMenu}
        setShowReactionMenu={setShowReactionMenu}
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
        participantsCount={participants.length}
        chatCount={meetingChat.filter((c) => c.role !== 'Sistem').length}
        isScreenSharing={isScreenSharing}
        setIsScreenSharing={setIsScreenSharing}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isHandRaised={isHandRaised}
        handleToggleHand={handleToggleHand}
        sendReaction={sendReaction}
        handleLeave={handleLeave}
        audioInputDevices={audioInputDevices}
        audioOutputDevices={audioOutputDevices}
        videoInputDevices={videoInputDevices}
        selectedAudioInput={selectedAudioInput}
        selectedAudioOutput={selectedAudioOutput}
        selectedVideoInput={selectedVideoInput}
        audioLevel={audioLevel}
        handleSelectMicrophone={handleSelectMicrophone}
        handleSelectSpeaker={handleSelectSpeaker}
        handleSelectCamera={handleSelectCamera}
        refreshDevices={refreshDevices}
        playAudioTestChime={playAudioTestChime}
        handleReconnectCamera={handleReconnectCamera}
      />
    </div>
  );
};
