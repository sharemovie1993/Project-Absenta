import React, { useState } from 'react';
import {
  Navigation,
  ChevronUp,
  ChevronDown,
  MapPin,
  DoorOpen,
  Calendar,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import type { DenahElementNode } from '../../types/spasial.types';
import { detectNodeTingkat, TINGKAT_STYLES } from './denahTingkatHelper';

interface DenahMobileNavigationSheetProps {
  targetNode: DenahElementNode | null;
  highlightRoomCode?: string | null;
  highlightLabel?: string;
  eventName?: string;
  denahLantai?: number;
  denahGedung?: string | null;
  onCenterRoom: () => void;
  onClose?: () => void;
  isLightMode?: boolean;
}

export const DenahMobileNavigationSheet: React.FC<DenahMobileNavigationSheetProps> = React.memo(({
  targetNode,
  highlightRoomCode,
  highlightLabel,
  eventName = 'Ujian CBT',
  denahLantai = 1,
  denahGedung,
  onCenterRoom,
  onClose,
  isLightMode = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!targetNode && !highlightRoomCode) {
    return null;
  }

  const roomCode = targetNode?.label_utama || highlightRoomCode || 'R.XX';
  const className = targetNode?.label_sub || 'Ruang Ujian Anda';
  const detectedTingkat = targetNode ? detectNodeTingkat(targetNode) : null;
  const tingkatStyle = detectedTingkat ? TINGKAT_STYLES[detectedTingkat] : null;

  return (
    <>
      {/* Floating GPS Action Button (Pusatkan Kamera ke Ruang Saya) */}
      <div className="absolute right-3.5 bottom-24 sm:bottom-28 z-40 flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onCenterRoom}
          className="group relative flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-2xl border-2 border-white/90 dark:border-slate-800 shadow-violet-500/40 cursor-pointer transition-all active:scale-95"
          title="Pusatkan Kamera ke Posisi Ruangan Anda"
        >
          {/* Radar Ripple Animation Effect */}
          <span className="absolute -inset-1 rounded-full bg-violet-500/40 animate-ping pointer-events-none" />
          <Navigation className="w-4 h-4 shrink-0 -rotate-45 group-hover:scale-110 transition-transform" />
          <span>Fokus Ruang Saya</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>

      {/* Shopee-Grade Mobile Floating Bottom Sheet */}
      <div
        className={`absolute inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md bottom-2 z-40 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 pointer-events-auto ${
          isLightMode
            ? 'bg-white/95 border-slate-200/90 text-slate-800'
            : 'bg-slate-900/95 border-slate-700/80 text-white'
        }`}
      >
        {/* Grabber Toggle Handle Bar */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full pt-2 pb-1 flex flex-col items-center justify-center cursor-pointer group"
          title={isExpanded ? 'Ciutkan Detail' : 'Buka Detail Ruangan'}
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-violet-500 transition-colors" />
        </button>

        {/* Collapsed / Peek Header (Compact, High Density) */}
        <div className="px-3.5 pb-2.5 flex items-center justify-between gap-2.5">
          {/* Sisi Kiri: Badge Ruangan & Identitas Rombel */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`shrink-0 flex items-center justify-center px-2.5 py-1.5 rounded-xl border-2 font-mono font-black text-base shadow-sm ${
                tingkatStyle
                  ? `${tingkatStyle.bg} ${tingkatStyle.border} ${tingkatStyle.text}`
                  : 'bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-950/70 dark:border-violet-600 dark:text-violet-200'
              }`}
            >
              <DoorOpen className="w-4 h-4 mr-1 shrink-0" />
              <span>{roomCode}</span>
            </div>

            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{className}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase shrink-0">
                  Ruang Anda
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                <Layers className="w-3 h-3 shrink-0 text-slate-400" />
                <span>Lantai {denahLantai}</span>
                {denahGedung && (
                  <>
                    <span>•</span>
                    <span className="truncate">{denahGedung}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Pusatkan & Chevron Expand */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onCenterRoom}
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors active:scale-95"
              title="Pusatkan Kamera ke Ruangan"
            >
              <Navigation className="w-4 h-4 -rotate-45" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              title={isExpanded ? 'Tutup Rincian' : 'Buka Rincian'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Drawer Details (Informasi Sesi, Panduan Arah, & Tombol Aksi) */}
        {isExpanded && (
          <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5 text-xs animate-in fade-in duration-150">
            {/* Grid Informasi Cepat */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750/70">
                <span className="text-[10px] font-semibold text-slate-400 block">Acara / Sesi</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {eventName}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750/70">
                <span className="text-[10px] font-semibold text-slate-400 block">Kategori Ruang</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {targetNode?.kategori_ruang || 'RUANG UJIAN'}
                </span>
              </div>
            </div>

            {/* Catatan / Panduan Lokasi Ruang */}
            <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-[11px] leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Panduan Lokasi:</span>
                <span>
                  {targetNode?.catatan ||
                    `Ruangan berada di Lantai ${denahLantai}${
                      denahGedung ? ` (${denahGedung})` : ''
                    }. Silakan hadir 15 menit sebelum sesi dimulai.`}
                </span>
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={onCenterRoom}
                className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs shadow-md shadow-violet-500/20 cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 -rotate-45" />
                <span>Pusatkan Peta ke Ruang Ini</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
});

DenahMobileNavigationSheet.displayName = 'DenahMobileNavigationSheet';
