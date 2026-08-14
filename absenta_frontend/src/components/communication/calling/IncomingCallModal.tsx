import React from 'react';
import { 
  PhoneIcon, 
  VideoCameraIcon, 
  XMarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { CallerInfo } from '@/hooks/communication/useWebRTCCall';

interface IncomingCallModalProps {
  incomingCall: CallerInfo | null;
  onAccept: () => void;
  onReject: (reason?: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onReject
}) => {
  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'VIDEO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm bg-[#111b21] text-white rounded-3xl shadow-2xl border border-slate-700/60 p-6 flex flex-col items-center text-center relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00a884]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Pulsing Avatar */}
        <div className="relative mb-5 mt-2">
          <span className="absolute inset-0 rounded-full bg-[#00a884]/40 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-[#00a884] text-white flex items-center justify-center text-2xl font-extrabold shadow-xl border-4 border-[#202c33] overflow-hidden">
            {incomingCall.callerAvatar ? (
              <img src={incomingCall.callerAvatar} alt={incomingCall.callerName} className="w-full h-full object-cover" />
            ) : incomingCall.callerName ? (
              incomingCall.callerName.slice(0, 2).toUpperCase()
            ) : (
              <UserIcon className="w-10 h-10" />
            )}
          </div>
        </div>

        {/* Caller Info */}
        <h3 className="text-lg font-bold text-slate-100 tracking-tight truncate max-w-xs">
          {incomingCall.callerName}
        </h3>
        <p className="text-xs text-[#00a884] font-semibold mt-0.5">
          {incomingCall.callerRole}
        </p>
        <p className="text-[11px] text-[#8696a0] mt-2 flex items-center gap-1">
          {isVideo ? <VideoCameraIcon className="w-3.5 h-3.5 text-[#00a884]" /> : <PhoneIcon className="w-3.5 h-3.5 text-[#00a884]" />}
          <span>Panggilan {isVideo ? 'Video' : 'Suara'} Masuk...</span>
        </p>

        {/* Action Buttons: Accept & Reject */}
        <div className="flex items-center justify-center gap-8 mt-8 w-full">
          {/* Tolak Panggilan */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => onReject('Panggilan ditolak oleh pengguna')}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-90 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
              title="Tolak Panggilan"
            >
              <XMarkIcon className="w-7 h-7 stroke-[2.5]" />
            </button>
            <span className="text-[11px] font-medium text-rose-400">Tolak</span>
          </div>

          {/* Terima Panggilan */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onAccept}
              className="w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#20bd5a] active:scale-90 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer animate-bounce"
              title="Terima Panggilan"
            >
              {isVideo ? (
                <VideoCameraIcon className="w-7 h-7" />
              ) : (
                <PhoneIcon className="w-7 h-7" />
              )}
            </button>
            <span className="text-[11px] font-medium text-emerald-400">Terima</span>
          </div>
        </div>
      </div>
    </div>
  );
};
