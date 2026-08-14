import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  MicrophoneIcon, 
  VideoCameraIcon, 
  TvIcon, 
  ChatBubbleLeftRightIcon, 
  UsersIcon,
  PhoneXMarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';

interface VirtualMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTitle?: string;
  roomId?: string;
}

export const VirtualMeetingModal: React.FC<VirtualMeetingModalProps> = ({
  isOpen,
  onClose,
  roomTitle = 'Rapat Dewan Guru & Kurikulum',
  roomId = `meet-${Date.now().toString(36)}`
}) => {
  const { user } = useAuthStore();

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [meetingChat, setMeetingChat] = useState<{ sender: string; text: string; time: string }[]>([
    { sender: 'Sistem', text: 'Selamat datang di Ruang Rapat Virtual Absenta.', time: 'Sekarang' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

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

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/komunikasi?meeting=${roomId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full h-full max-w-6xl max-h-[92vh] bg-[#111b21] text-white rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
        {/* Meeting Header Bar */}
        <header className="px-6 py-3.5 bg-[#202c33] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{roomTitle}</span>
                <span className="px-2 py-0.5 rounded-md bg-[#00a884]/20 text-[#00a884] text-[10px] font-mono">
                  {roomId}
                </span>
              </h2>
              <p className="text-[11px] text-[#8696a0]">
                Terenkripsi End-to-End • Tenant Scope Terkunci
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedLink ? <CheckIcon className="w-4 h-4 text-[#25d366]" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              <span>{copiedLink ? 'Tautan Disalin' : 'Salin Tautan Rapat'}</span>
            </button>
            <button
              type="button"
              onClick={handleLeave}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Meeting Main Content: Video Grid & Chat Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Video Grid */}
          <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto">
            {/* Local Video Card */}
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[200px] shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
              />
              {isVideoDisabled && (
                <div className="w-16 h-16 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xl font-bold shadow-xl">
                  {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'ME'}
                </div>
              )}
              {/* Participant Name Badge */}
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <span>{user?.full_name || 'Saya'} (Host)</span>
                {isAudioMuted && <span className="text-rose-400">🔇</span>}
                {isHandRaised && <span>✋</span>}
              </div>
            </div>

            {/* Simulated Remote Participants */}
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[200px] shadow-lg">
              <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-xl">
                TS
              </div>
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <span>TRISNAWATI, S.T. (Waka Kurikulum)</span>
              </div>
            </div>

            <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[200px] shadow-lg">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-xl">
                DS
              </div>
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <span>DEWI SINTAWATI, S.Pd. (Guru)</span>
              </div>
            </div>
          </div>

          {/* Meeting In-Call Chat Sidebar */}
          {isChatOpen && (
            <aside className="w-80 bg-[#202c33] border-l border-slate-800 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Pesan Dalam Rapat</span>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                {meetingChat.map((c, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-[10px] text-[#00a884] font-bold mb-1">
                      <span>{c.sender}</span>
                      <span className="text-slate-400">{c.time}</span>
                    </div>
                    <p className="text-slate-200">{c.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMeetingChat} className="p-2.5 border-t border-slate-800 flex gap-1.5">
                <input
                  type="text"
                  placeholder="Kirim pesan ke semua..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-900 text-white placeholder-slate-400 border border-slate-700 outline-hidden focus:border-[#00a884]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#00a884] text-white font-bold rounded-xl text-xs"
                >
                  Kirim
                </button>
              </form>
            </aside>
          )}
        </div>

        {/* Meeting Bottom Control Bar */}
        <footer className="px-6 py-4 bg-[#202c33] border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8696a0]">
            <UsersIcon className="w-4 h-4 text-[#00a884]" />
            <span>3 Peserta Hadir</span>
          </div>

          {/* Center Action Controls */}
          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            {/* Mic */}
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
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isAudioMuted ? 'bg-rose-600/80 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isAudioMuted ? 'Nyalakan Mic' : 'Matikan Mic'}
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>

            {/* Video */}
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
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isVideoDisabled ? 'bg-rose-600/80 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isVideoDisabled ? 'Nyalakan Kamera' : 'Matikan Kamera'}
            >
              <VideoCameraIcon className="w-5 h-5" />
            </button>

            {/* Screen Share */}
            <button
              type="button"
              onClick={() => setIsScreenSharing(v => !v)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isScreenSharing ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Berbagi Layar"
            >
              <TvIcon className="w-5 h-5" />
            </button>

            {/* Hand Raise */}
            <button
              type="button"
              onClick={() => setIsHandRaised(v => !v)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isHandRaised ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Angkat Tangan"
            >
              <HandRaisedIcon className="w-5 h-5" />
            </button>

            {/* In-Call Chat */}
            <button
              type="button"
              onClick={() => setIsChatOpen(v => !v)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isChatOpen ? 'bg-[#00a884] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Buka Chat Rapat"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </button>

            {/* Leave Room Button */}
            <button
              type="button"
              onClick={handleLeave}
              className="px-5 h-11 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ml-2"
              title="Keluar dari Rapat"
            >
              <PhoneXMarkIcon className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </div>

          <div className="hidden sm:block w-24" />
        </footer>
      </div>
    </div>
  );
};
