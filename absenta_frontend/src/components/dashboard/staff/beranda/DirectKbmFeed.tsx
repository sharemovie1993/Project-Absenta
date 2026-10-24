import React from 'react';
import { Clock, Users, FileEdit, CheckCircle2, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { HubCard } from '@/components/ui/hub';
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
      <HubCard className={className} bodyClassName="text-center py-7 px-4 space-y-1.5">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-1">
          <BookOpen size={16} />
        </div>
        <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200">
          Tidak Ada Jadwal KBM Hari Ini
        </h4>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Jadwal Anda bersih atau hari ini merupakan hari libur/kegiatan khusus.
        </p>
      </HubCard>
    );
  }

  // Cari sesi live, upcoming, dan tuntas
  const liveSession = timelineItems.find(i => i.isLive && !i.isFinished);
  const nextSession = timelineItems.find(i => !i.isLive && !i.isFinished);
  const finishedSessions = timelineItems.filter(i => i.isFinished);
  const isAllDone = finishedSessions.length === timelineItems.length;

  return (
    <div className={cn("space-y-2.5 w-full", className)}>
      {/* 1. KBM SEDANG BERLANGSUNG (LIVE ACTIVE CARD) */}
      {liveSession && (
        <HubCard
          className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900"
          headerClassName="border-emerald-500/20"
          title={
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              KBM Sedang Berlangsung
            </span>
          }
          actionLabel={`${liveSession.jam_mulai} - ${liveSession.jam_selesai} WIB`}
        >
          <div className="space-y-3">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                {liveSession.kelas_nama} — {liveSession.kegiatan}
              </h4>
              <p className="text-[11px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                {liveSession.jamLabel ? `${liveSession.jamLabel} • ` : ''}Ruang Kelas / Lab
              </p>
            </div>

            {/* Tombol Aksi Cepat Berdampingan */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onOpenAttendance(liveSession)}
                className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Users size={14} />
                <span>Presensi Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenJournal(liveSession)}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileEdit size={14} />
                <span>Isi Jurnal KBM</span>
              </button>
            </div>
          </div>
        </HubCard>
      )}

      {/* 2. KBM BERIKUTNYA HARI INI */}
      {nextSession && !liveSession && (
        <HubCard noPadding>
          <div className="p-3 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[9.5px] font-semibold text-blue-600 dark:text-blue-400 block">
                Sesi Berikutnya
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {nextSession.kelas_nama} — {nextSession.kegiatan}
              </h4>
              <p className="text-[10.5px] text-slate-400 font-normal flex items-center gap-1">
                <Clock size={11} />
                <span>Mulai {nextSession.jam_mulai} WIB ({nextSession.jamLabel || 'Sesi Terjadwal'})</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAttendance(nextSession)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Presensi</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </HubCard>
      )}

      {/* 3. JIKA SELURUH KBM SUDAH TUNTAS */}
      {isAllDone && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">Seluruh Sesi Mengajar Hari Ini Telah Tuntas</span>
          </div>
          <span className="text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
            {finishedSessions.length} Selesai
          </span>
        </div>
      )}

      {/* 4. DAFTAR SELURUH SESI HARI INI DALAM 1 KARTU INDUK HAIRLINE */}
      <HubCard
        title="Jadwal Mengajar Hari Ini"
        subtitle={`(${timelineItems.length} Sesi)`}
        noPadding
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {timelineItems.map((item, idx) => {
            const isDone = item.isFinished;
            const isCurrent = item.isLive;

            return (
              <div
                key={item.id || idx}
                className={cn(
                  "p-2.5 sm:p-3 flex items-center justify-between gap-2.5 transition-colors text-xs",
                  isCurrent && "bg-emerald-50/40 dark:bg-emerald-950/20"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0",
                    isCurrent ? "bg-emerald-500 text-white" : isDone ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                  )}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[11.5px] sm:text-xs">
                      {item.kelas_nama} • {item.kegiatan}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.jam_mulai} - {item.jam_selesai} WIB
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isDone ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pr-1">
                      <CheckCircle2 size={12} />
                      <span className="hidden sm:inline">Selesai</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenAttendance(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-colors"
                      title="Buka Presensi"
                    >
                      <Users size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenJournal(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer transition-colors"
                    title="Buka Jurnal"
                  >
                    <FileEdit size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </HubCard>
    </div>
  );
});

DirectKbmFeed.displayName = 'DirectKbmFeed';
