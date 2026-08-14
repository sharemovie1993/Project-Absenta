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
  EllipsisVerticalIcon,
  TrashIcon,
  VideoCameraIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';

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

export const VirtualMeetingModal: React.FC<VirtualMeetingModalProps> = ({
  isOpen,
  onClose,
  roomTitle = 'Rapat Koordinasi KBM & Kurikulum',
  roomId = `892 4102 ${Math.floor(1000 + Math.random() * 9000)}`
}) => {
  const { user } = useAuthStore();

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
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Security & Host Controls
  const [isMeetingLocked, setIsMeetingLocked] = useState(false);
  const [isWaitingRoomEnabled, setIsWaitingRoomEnabled] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowChat, setAllowChat] = useState(true);

  // Simulated Participants
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
    },
    {
      id: 'p1',
      name: 'TRISNAWATI, S.T. (Waka Kurikulum)',
      role: 'WAKA',
      isHost: false,
      isAudioMuted: false,
      isVideoOff: false,
      isHandRaised: false,
      avatarColor: 'bg-[#107C41]'
    },
    {
      id: 'p2',
      name: 'DEWI SINTAWATI, S.Pd. (Guru Mapel)',
      role: 'GURU',
      isHost: false,
      isAudioMuted: true,
      isVideoOff: false,
      isHandRaised: false,
      avatarColor: 'bg-[#742774]'
    }
  ]);

  // Meeting Chat
  const [meetingChat, setMeetingChat] = useState<{ sender: string; text: string; time: string; isHost?: boolean }[]>([
    { sender: 'Sistem Absenta', text: 'Ruang Rapat Zoom Absenta dimulai dengan enkripsi multi-tenant.', time: 'Sekarang' },
    { sender: 'TRISNAWATI, S.T.', text: 'Selamat pagi Bapak/Ibu guru sekalian, mari kita mulai koordinasi.', time: '08:00' }
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

  // Initialize camera & mic on room join
  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 640 }, height: { ideal: 480 } }
    }).then((s) => {
      stream = s;
      localStreamRef.current = s;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s;
      }
    }).catch(() => {
      setIsVideoDisabled(true);
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  // Recording Timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordTimer(t => t + 1), 1000);
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
    navigator.clipboard.writeText(window.location.origin + `/komunikasi?meeting=${roomId.replace(/\s+/g, '')}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Mute All by Host (Zoom Feature)
  const handleMuteAll = () => {
    if (confirm('Bisukan semua peserta saat ini dan peserta baru yang bergabung?')) {
      setParticipants(prev => prev.map(p => p.id === 'local' ? p : { ...p, isAudioMuted: true }));
      setMeetingChat(prev => [
        ...prev,
        { sender: 'Host', text: '🔇 Host telah membisukan mikrofon seluruh peserta.', time: 'Sekarang', isHost: true }
      ]);
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
    setMeetingChat(prev => [
      ...prev,
      {
        sender: user?.full_name || 'Saya',
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatInput('');
  };

  const handleLeave = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
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
            onClick={() => setShowMeetingInfo(v => !v)}
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
                    <span>Terenkripsi E2EE Multi-Tenant</span>
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
          {viewMode === 'GALLERY' && (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center justify-center p-2">
              {/* Local Participant Card */}
              <div className={`relative w-full h-full min-h-[220px] max-h-[420px] bg-[#222222] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-xl ${
                activeSpeakerId === 'local' ? 'border-[#2DA771]' : 'border-[#333333]'
              }`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
                />
                {isVideoDisabled && (
                  <div className="w-20 h-20 rounded-full bg-[#0E71EB] text-white flex items-center justify-center text-2xl font-bold shadow-2xl">
                    {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                )}
                {/* Name Tag & Status Badges */}
                <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs font-semibold flex items-center gap-2">
                  <span>{user?.full_name || 'Saya'} (Host, Me)</span>
                  {isAudioMuted ? <span className="text-rose-500 font-bold">🔇</span> : <span className="text-[#2DA771]">🎙️</span>}
                  {isHandRaised && <span className="animate-bounce">✋</span>}
                </div>
              </div>

              {/* Remote Participants */}
              {participants.filter(p => p.id !== 'local').map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveSpeakerId(p.id)}
                  className={`relative w-full h-full min-h-[220px] max-h-[420px] bg-[#222222] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-xl cursor-pointer ${
                    activeSpeakerId === p.id ? 'border-[#2DA771]' : 'border-[#333333]'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-full ${p.avatarColor} text-white flex items-center justify-center text-2xl font-bold shadow-2xl`}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs font-semibold flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{p.name}</span>
                    {p.isAudioMuted ? <span className="text-rose-500">🔇</span> : <span className="text-[#2DA771]">🎙️</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── MODE B: SPEAKER VIEW (SPOTLIGHT + FILMSTRIP) ──────────────── */}
          {viewMode === 'SPEAKER' && (
            <div className="flex-1 flex flex-col gap-3">
              {/* Top Filmstrip */}
              <div className="h-28 flex gap-2 overflow-x-auto pb-1">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActiveSpeakerId(p.id)}
                    className={`w-40 h-full bg-[#222] rounded-xl overflow-hidden border-2 shrink-0 flex items-center justify-center relative cursor-pointer ${
                      activeSpeakerId === p.id ? 'border-[#2DA771]' : 'border-[#333]'
                    }`}
                  >
                    <span className="text-xs font-bold">{p.name.slice(0, 2).toUpperCase()}</span>
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Main Spotlight Video */}
              <div className="flex-1 bg-[#1a1a1a] rounded-2xl border border-[#333] flex items-center justify-center relative overflow-hidden shadow-2xl">
                {activeSpeakerId === 'local' ? (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-[#0E71EB] text-white flex items-center justify-center text-4xl font-bold">
                    {participants.find(p => p.id === activeSpeakerId)?.name.slice(0, 2).toUpperCase() || 'SP'}
                  </div>
                )}
                <div className="absolute bottom-4 left-4 px-4 py-1.5 bg-black/70 backdrop-blur-md rounded-xl text-sm font-bold">
                  {participants.find(p => p.id === activeSpeakerId)?.name || 'Active Speaker'}
                </div>
              </div>
            </div>
          )}

          {/* ── MODE C: DIGITAL WHITEBOARD (PAPAN TULIS KBM) ──────────────── */}
          {viewMode === 'WHITEBOARD' && (
            <div className="flex-1 flex flex-col bg-[#1c1c1c] rounded-2xl border border-[#333] overflow-hidden shadow-2xl">
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
                      onChange={e => setBrushSize(Number(e.target.value))}
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
          )}
        </div>

        {/* ── 3. ZOOM SIDEBARS (PARTICIPANTS / CHAT / SECURITY) ───────────── */}
        {activeSidebar && (
          <aside className="w-80 bg-[#242424] border-l border-[#333] flex flex-col shrink-0 animate-in slide-in-from-right duration-150 z-20">
            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {activeSidebar === 'PARTICIPANTS' && `Peserta (${participants.length})`}
                {activeSidebar === 'CHAT' && 'Chat Rapat'}
                {activeSidebar === 'SECURITY' && 'Keamanan & Izin Rapat'}
              </span>
              <button
                type="button"
                onClick={() => setActiveSidebar(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
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

            {/* B. Chat Panel */}
            {activeSidebar === 'CHAT' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                  {meetingChat.map((c, idx) => (
                    <div key={idx} className="bg-[#2e2e2e] p-2.5 rounded-xl border border-slate-700/50">
                      <div className="flex items-center justify-between text-[10px] text-[#2D8CFF] font-bold mb-1">
                        <span>{c.sender}</span>
                        <span className="text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-slate-100">{c.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMeetingChat} className="p-2.5 bg-[#1f1f1f] border-t border-[#333] flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Kirim pesan ke Semua..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[#2e2e2e] text-white placeholder-slate-400 border border-slate-700 outline-hidden focus:border-[#0E71EB]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#0E71EB] hover:bg-[#0060d6] text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Kirim
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
                        onChange={e => setIsMeetingLocked(e.target.checked)}
                        className="w-4 h-4 text-[#0E71EB] rounded"
                      />
                      <span>Kunci Rapat (Lock Meeting)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWaitingRoomEnabled}
                        onChange={e => setIsWaitingRoomEnabled(e.target.checked)}
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
                        onChange={e => setAllowScreenShare(e.target.checked)}
                        className="w-4 h-4 text-[#0E71EB] rounded"
                      />
                      <span>Bolehkan Berbagi Layar (Share Screen)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowChat}
                        onChange={e => setAllowChat(e.target.checked)}
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
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (localStreamRef.current) {
                  const track = localStreamRef.current.getAudioTracks()[0];
                  if (track) {
                    track.enabled = !track.enabled;
                    setIsAudioMuted(!track.enabled);
                  }
                }
              }}
              className="flex flex-col items-center justify-center w-14 h-12 rounded-lg hover:bg-[#2b2b2b] text-slate-200 hover:text-white transition-colors cursor-pointer group"
            >
              <div className="relative">
                <SpeakerWaveIcon className={`w-5 h-5 ${isAudioMuted ? 'text-rose-500' : 'text-[#2DA771]'}`} />
                {isAudioMuted && <span className="absolute inset-0 border-t-2 border-rose-500 rotate-45 top-2.5" />}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button type="button" className="p-1 text-slate-400 hover:text-white -ml-1">
              <ChevronUpIcon className="w-3 h-3" />
            </button>
          </div>

          {/* Start / Stop Video */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (localStreamRef.current) {
                  const track = localStreamRef.current.getVideoTracks()[0];
                  if (track) {
                    track.enabled = !track.enabled;
                    setIsVideoDisabled(!track.enabled);
                  }
                }
              }}
              className="flex flex-col items-center justify-center w-14 h-12 rounded-lg hover:bg-[#2b2b2b] text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <div className="relative">
                <VideoCameraIcon className={`w-5 h-5 ${isVideoDisabled ? 'text-rose-500' : 'text-[#2DA771]'}`} />
                {isVideoDisabled && <span className="absolute inset-0 border-t-2 border-rose-500 rotate-45 top-2.5" />}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{isVideoDisabled ? 'Start Video' : 'Stop Video'}</span>
            </button>
            <button type="button" className="p-1 text-slate-400 hover:text-white -ml-1">
              <ChevronUpIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center: Main Zoom Action Hub */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Security */}
          <button
            type="button"
            onClick={() => setActiveSidebar(prev => prev === 'SECURITY' ? null : 'SECURITY')}
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
            onClick={() => setActiveSidebar(prev => prev === 'PARTICIPANTS' ? null : 'PARTICIPANTS')}
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
            onClick={() => setActiveSidebar(prev => prev === 'CHAT' ? null : 'CHAT')}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-12 rounded-lg transition-colors cursor-pointer ${
              activeSidebar === 'CHAT' ? 'bg-[#2b2b2b] text-white' : 'hover:bg-[#2b2b2b] text-slate-300'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5">Chat</span>
          </button>

          {/* Share Screen (Zoom Green Button) */}
          <button
            type="button"
            onClick={() => setIsScreenSharing(v => !v)}
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
            onClick={() => setViewMode(v => v === 'WHITEBOARD' ? 'GALLERY' : 'WHITEBOARD')}
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
            onClick={() => setIsRecording(v => !v)}
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
              onClick={() => setShowReactions(v => !v)}
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
                    setIsHandRaised(v => !v);
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
