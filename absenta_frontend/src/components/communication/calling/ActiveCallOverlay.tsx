import React, { useEffect, useRef } from 'react';
import { 
  PhoneXMarkIcon, 
  MicrophoneIcon, 
  VideoCameraIcon, 
  TvIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { CallState, CallType } from '@/hooks/communication/useWebRTCCall';

interface ActiveCallOverlayProps {
  callState: CallState;
  callType: CallType;
  targetUser: { id: string; name: string; role?: string; avatar?: string } | null;
  callDuration: number;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  isScreenSharing: boolean;
  isMinimized: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMuteAudio: () => void;
  onToggleDisableVideo: () => void;
  onToggleScreenShare: () => void;
  onSetMinimized: (val: boolean) => void;
}

export const ActiveCallOverlay: React.FC<ActiveCallOverlayProps> = ({
  callState,
  callType,
  targetUser,
  callDuration,
  isAudioMuted,
  isVideoDisabled,
  isScreenSharing,
  isMinimized,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMuteAudio,
  onToggleDisableVideo,
  onToggleScreenShare,
  onSetMinimized
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video/audio element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'IDLE' || !targetUser) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── 1. MINIMIZED PICTURE-IN-PICTURE (PIP) FLOATING BADGE ────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-24 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#111b21]/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-emerald-500/40">
          <div className="relative">
            <span className="w-2.5 h-2.5 bg-[#25d366] rounded-full absolute -top-0.5 -right-0.5 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xs font-bold overflow-hidden">
              {targetUser.avatar ? (
                <img src={targetUser.avatar} alt={targetUser.name} className="w-full h-full object-cover" />
              ) : (
                targetUser.name.slice(0, 2).toUpperCase()
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold truncate max-w-[120px]">{targetUser.name}</p>
            <p className="text-[10px] text-emerald-400 font-semibold font-mono">
              {callState === 'CALLING' ? 'Memanggil...' : formatDuration(callDuration)}
            </p>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => onSetMinimized(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Perbesar Layar"
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onEndCall}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              title="Akhiri Panggilan"
            >
              <PhoneXMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hidden Audio for PiP */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
      </div>
    );
  }

  // ── 2. FULL CALL WINDOW OVERLAY ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl h-[580px] bg-[#111b21] text-white rounded-3xl shadow-2xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md">
              {targetUser.name}
            </h3>
            <p className="text-xs text-[#00a884] font-medium">
              {targetUser.role || 'GTK'} • {callState === 'CALLING' ? 'Menghubungkan...' : formatDuration(callDuration)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSetMinimized(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Kecilkan Layar (Picture-in-Picture)"
          >
            <ArrowsPointingInIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Call Content Area: Voice Waveform or Video Streams */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {callType === 'VIDEO' ? (
            <div className="w-full h-full relative bg-black flex items-center justify-center">
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video Thumbnail (PiP in Bottom-Right) */}
              <div className="absolute bottom-4 right-4 w-36 h-28 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
                />
                {isVideoDisabled && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px]">
                    <VideoCameraIcon className="w-6 h-6 mb-1 text-slate-500" />
                    <span>Kamera Mati</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Voice Call Waveform & Avatar */
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                {callState === 'CONNECTED' && (
                  <div className="absolute inset-0 rounded-full bg-[#00a884]/20 animate-ping" />
                )}
                <div className="relative w-28 h-28 rounded-full bg-[#00a884] text-white flex items-center justify-center text-3xl font-extrabold shadow-2xl border-4 border-[#202c33] overflow-hidden">
                  {targetUser.avatar ? (
                    <img src={targetUser.avatar} alt={targetUser.name} className="w-full h-full object-cover" />
                  ) : targetUser.name ? (
                    targetUser.name.slice(0, 2).toUpperCase()
                  ) : (
                    <UserIcon className="w-12 h-12" />
                  )}
                </div>
              </div>

              {/* Sound Wave Bars */}
              {callState === 'CONNECTED' && (
                <div className="flex items-center gap-1 h-8 mt-2">
                  {[20, 45, 80, 100, 60, 30, 75, 90, 50, 25, 65, 85, 40].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1.5 bg-[#00a884] rounded-full animate-pulse"
                    />
                  ))}
                </div>
              )}

              <audio ref={remoteAudioRef} autoPlay playsInline />
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="px-6 py-6 flex items-center justify-center gap-4 z-10 bg-gradient-to-t from-black/80 to-transparent">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={onToggleMuteAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isAudioMuted 
                ? 'bg-rose-600/80 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isAudioMuted ? 'Nyalakan Mikrofon' : 'Matikan Mikrofon'}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>

          {/* Toggle Video */}
          {callType === 'VIDEO' && (
            <button
              type="button"
              onClick={onToggleDisableVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isVideoDisabled 
                  ? 'bg-rose-600/80 text-white' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isVideoDisabled ? 'Nyalakan Kamera' : 'Matikan Kamera'}
            >
              <VideoCameraIcon className="w-5 h-5" />
            </button>
          )}

          {/* Screen Share */}
          {callType === 'VIDEO' && (
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isScreenSharing 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isScreenSharing ? 'Hentikan Berbagi Layar' : 'Berbagi Layar (Screen Share)'}
            >
              <TvIcon className="w-5 h-5" />
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xl transition-all cursor-pointer"
            title="Akhiri Panggilan"
          >
            <PhoneXMarkIcon className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
