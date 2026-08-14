import React from 'react';
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Squares2X2Icon,
  UserIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

export interface MeetingTopNavProps {
  roomTitle: string;
  roomId: string;
  meetingDuration: number;
  formatDuration: (seconds: number) => string;
  isCopied: boolean;
  handleCopyLink: () => void;
  viewMode: 'GALLERY' | 'SPEAKER' | 'WHITEBOARD';
  setViewMode: (mode: 'GALLERY' | 'SPEAKER' | 'WHITEBOARD') => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  onFlipCamera?: () => void;
  hasMultipleCameras?: boolean;
  onBackToChat?: () => void;
  networkQuality?: 'good' | 'fair' | 'poor';
}

export const MeetingTopNav: React.FC<MeetingTopNavProps> = ({
  roomTitle,
  roomId,
  meetingDuration,
  formatDuration,
  isCopied,
  handleCopyLink,
  viewMode,
  setViewMode,
  isFullscreen,
  toggleFullscreen,
  onFlipCamera,
  hasMultipleCameras,
  onBackToChat,
  networkQuality = 'good'
}) => {
  return (
    <header className="bg-[#1a1a1a] border-b border-[#333333] z-30 shrink-0 select-none">
      {/* ── ROW 1: Controls (always single line) ─────────────────────────── */}
      <div className="h-11 sm:h-12 px-2 sm:px-4 flex items-center justify-between gap-2">

        {/* Left: Back + REC */}
        <div className="flex items-center gap-2 shrink-0">
          {onBackToChat && (
            <button
              type="button"
              onClick={onBackToChat}
              className="flex items-center gap-1 bg-[#282828] hover:bg-[#333] active:scale-95 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg border border-[#404040] text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Kembali ke Halaman Pesan / Chat"
            >
              <ChevronLeftIcon className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Kembali ke Chat</span>
              <span className="sm:hidden">Kembali</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-[#2a2a2a] px-2 py-1 rounded-lg border border-[#444] shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-slate-200 tracking-wider">REC</span>
            <span className="text-[10px] font-mono text-slate-400 border-l border-slate-600 pl-1.5">
              {formatDuration(meetingDuration)}
            </span>
            {/* Network Quality Indicator */}
            <span
              title={`Kualitas Jaringan: ${networkQuality === 'good' ? 'Baik' : networkQuality === 'fair' ? 'Sedang' : 'Buruk'}`}
              className={`ml-1 w-2 h-2 rounded-full border-l border-slate-600 ml-2 shrink-0 ${
                networkQuality === 'good' ? 'bg-emerald-400' :
                networkQuality === 'fair' ? 'bg-amber-400 animate-pulse' :
                'bg-rose-400 animate-pulse'
              }`}
            />
          </div>
        </div>

        {/* Right: Flip Camera, Layout Switchers & Fullscreen */}
        <div className="flex items-center gap-1 shrink-0">
          {hasMultipleCameras && onFlipCamera && (
            <button
              type="button"
              onClick={onFlipCamera}
              className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333] text-emerald-400 border border-[#404040] transition-colors cursor-pointer"
              title="Balik Kamera Depan / Belakang"
            >
              <span className="text-xs">🔄</span>
            </button>
          )}

          {/* Layout Mode Buttons */}
          <div className="flex items-center bg-[#282828] rounded-lg p-0.5 border border-[#404040]">
            <button
              type="button"
              onClick={() => setViewMode('GALLERY')}
              className={`px-2 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'GALLERY' ? 'bg-[#0E71EB] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Gallery View"
            >
              <Squares2X2Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Gallery</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('SPEAKER')}
              className={`px-2 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'SPEAKER' ? 'bg-[#0E71EB] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Speaker View"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Speaker</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('WHITEBOARD')}
              className={`hidden sm:flex px-2 py-1 text-[10px] font-medium rounded-md items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'WHITEBOARD' ? 'bg-[#0E71EB] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Papan Tulis"
            >
              <PencilSquareIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Papan Tulis</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#333] text-slate-300 hover:text-white border border-[#404040] transition-colors cursor-pointer"
            title="Layar Penuh"
          >
            {isFullscreen
              ? <ArrowsPointingInIcon className="w-3.5 h-3.5" />
              : <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>

      {/* ── ROW 2: Meeting Title (mobile: full width, desktop: hidden as separate row) ── */}
      <div className="sm:hidden px-3 pb-1.5 flex items-center justify-between gap-2 border-t border-[#2a2a2a]">
        <h1 className="text-xs font-bold text-white truncate flex-1 pt-1.5">{roomTitle}</h1>
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 text-[10px] cursor-pointer shrink-0 pt-1.5"
        >
          {isCopied ? (
            <>
              <CheckIcon className="w-3 h-3 text-emerald-400" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <DocumentDuplicateIcon className="w-3 h-3" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      {/* Desktop: title inline under row 1 (hidden on mobile since row 2 handles it) */}
      <div className="hidden sm:flex items-center gap-2 px-4 pb-1.5 border-t border-[#2a2a2a]">
        <h1 className="text-sm font-bold text-white truncate max-w-md pt-1">{roomTitle}</h1>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
          <span className="font-mono">ID: {roomId}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 cursor-pointer"
          >
            {isCopied ? (
              <>
                <CheckIcon className="w-3 h-3 text-emerald-400" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <DocumentDuplicateIcon className="w-3 h-3" />
                <span>Salin Undangan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
