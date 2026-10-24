import React from 'react';
import { Clock, Users, FileEdit, CheckCircle2, ArrowRight, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { TimelineItem } from '../tabs/StaffKbmAbsenTab';

interface DirectKbmFeedProps {
  timelineItems: TimelineItem[];
  onOpenAttendance: (item: TimelineItem) => void;
  onOpenJournal: (item: TimelineItem) => void;
  onOpenPhoto?: (item: TimelineItem) => void;
  className?: string;
}

export const DirectKbmFeed: React.FC<DirectKbmFeedProps> = React.memo(({
  timelineItems = [],
  onOpenAttendance,
  onOpenJournal,
  onOpenPhoto,
  className,
}) => {
  if (timelineItems.length === 0) {
    return (
      <div className={cn("p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center space-y-1.5 shadow-xs", className)}>
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <BookOpen size={16} />
        </div>
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Jadwal KBM Hari Ini</h4>
        <p className="text-[11px] text-slate-400">Jadwal Anda bersih atau hari ini merupakan hari libur/kegiatan khusus.</p>
      </div>
    );
  }

  // Cari sesi live, upcoming, dan tuntas
  const liveSession = timelineItems.find(i => i.isLive && !i.isFinished);
  const nextSession = timelineItems.find(i => !i.isLive && !i.isFinished);
  const finishedSessions = timelineItems.filter(i => i.isFinished);
  const isAllDone = finishedSessions.length === timelineItems.length;

  return (
    <div className={cn("space-y-3 w-full", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span>Jadwal Mengajar Hari Ini</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            {timelineItems.length} Sesi
          </span>
        </h3>
      </div>

      {/* 1. KBM SEDANG BERLANGSUNG (LIVE ACTIVE CARD) */}
      {liveSession && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-500/60 shadow-md space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wider animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              KBM Sedang Live
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
              <Clock size={12} />
              {liveSession.jam_mulai} - {liveSession.jam_selesai} WIB
            </span>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-black text-white leading-tight">
              {liveSession.kelas_nama} — {liveSession.kegiatan}
            </h4>
            <p className="text-[11px] font-medium text-slate-300">
              {liveSession.jamLabel ? `${liveSession.jamLabel} • ` : ''}Ruang Kelas / Lab
            </p>
          </div>

          {/* Tombol Aksi Cepat Berdampingan */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenAttendance(liveSession)}
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <Users size={14} />
              <span>Presensi Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenJournal(liveSession)}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <FileEdit size={14} />
              <span>Isi Jurnal KBM</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. KBM BERIKUTNYA HARI INI */}
      {nextSession && !liveSession && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-500/30 shadow-xs flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              Sesi Berikutnya
            </span>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              {nextSession.kelas_nama} — {nextSession.kegiatan}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Clock size={11} />
              <span>Mulai {nextSession.jam_mulai} WIB ({nextSession.jamLabel || 'Sesi Terjadwal'})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenAttendance(nextSession)}
            className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-black shrink-0 flex items-center gap-1 cursor-pointer transition-all"
          >
            <span>Siapkan</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* 3. JIKA SELURUH KBM SUDAH TUNTAS */}
      {isAllDone && (
        <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="font-bold">Seluruh Sesi Mengajar Hari Ini Telah Tuntas!</span>
          </div>
          <span className="text-[11px] font-black bg-emerald-500/20 px-2 py-0.5 rounded-lg shrink-0">
            {finishedSessions.length} Sesi Selesai
          </span>
        </div>
      )}

      {/* 4. DAFTAR RINGKAS SELURUH SESI HARI INI */}
      <div className="space-y-1.5 pt-1">
        {timelineItems.map((item, idx) => {
          const isDone = item.isFinished;
          const isCurrent = item.isLive;

          return (
            <div
              key={item.id || idx}
              className={cn(
                "p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all text-xs",
                isCurrent 
                  ? "bg-emerald-500/5 border-emerald-500/40" 
                  : isDone
                  ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 opacity-80"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0",
                  isCurrent ? "bg-emerald-500 text-white" : isDone ? "bg-slate-200 dark:bg-slate-800 text-slate-500" : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                )}>
                  {idx + 1}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-black text-slate-900 dark:text-white truncate">
                    {item.kelas_nama} • {item.kegiatan}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {item.jam_mulai} - {item.jam_selesai} WIB
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isDone ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span className="hidden sm:inline">Selesai</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAttendance(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                    title="Buka Presensi"
                  >
                    <Users size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenJournal(item)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                  title="Buka Jurnal"
                >
                  <FileEdit size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

DirectKbmFeed.displayName = 'DirectKbmFeed';
