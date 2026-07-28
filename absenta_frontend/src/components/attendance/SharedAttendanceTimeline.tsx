import React from 'react';
import { Loader, EmptyState } from '../ui';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface AttendanceTimelineItem {
  waktu?: string;
  jenis_kegiatan?: string;
  mapel?: string;
  status?: string;
  keterangan?: string;
  lokasi?: string;
  [key: string]: any;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  HADIR: 'text-emerald-700 bg-emerald-100/90 dark:text-emerald-300 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800',
  TERLAMBAT: 'text-orange-700 bg-orange-100/90 dark:text-orange-300 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800',
  SAKIT: 'text-amber-700 bg-amber-100/90 dark:text-amber-300 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800',
  IZIN: 'text-blue-700 bg-blue-100/90 dark:text-blue-300 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800',
  DISPEN: 'text-violet-700 bg-violet-100/90 dark:text-violet-300 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800',
  ALPA: 'text-rose-700 bg-rose-100/90 dark:text-rose-300 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800',
};

const STATUS_LABELS: Record<string, string> = {
  HADIR: 'Hadir',
  TERLAMBAT: 'Terlambat',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
  DISPEN: 'Dispen',
  ALPA: 'Alpa',
};

interface SharedAttendanceTimelineProps {
  items?: AttendanceTimelineItem[];
  selectedDate?: string;
  isLoading?: boolean;
  title?: string;
  showTitle?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const SharedAttendanceTimeline: React.FC<SharedAttendanceTimelineProps> = ({
  items = [],
  selectedDate,
  isLoading = false,
  title = "Timeline Aktivitas",
  showTitle = true,
  emptyTitle = "Belum Ada Aktivitas",
  emptyDescription = "Tidak ada data presensi untuk tanggal ini. Pilih tanggal lain pada kalender.",
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader />
      </div>
    );
  }

  const formattedDate = selectedDate ? (() => {
    try {
      return format(new Date(selectedDate), 'EEEE, dd MMMM yyyy', { locale: id });
    } catch (e) {
      return selectedDate;
    }
  })() : null;

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight">
            {title}{formattedDate ? `: ${formattedDate}` : ''}
          </h3>
        </div>
      )}

      {Array.isArray(items) && items.length > 0 ? (
        <div className="relative pl-6 py-2">
          {/* Vertical Timeline Gradient Line */}
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-300 via-slate-200 to-transparent dark:from-indigo-700 dark:via-slate-700" />

          <div className="space-y-3">
            {items.map((item, idx) => {
              const st = String(item.status || '').toUpperCase();
              const activityTitle = item.jenis_kegiatan || item.mapel || 'Aktivitas Presensi';
              const isGate = (activityTitle || '').includes('Gerbang');
              
              const dotClass = 
                st === 'HADIR' ? 'bg-emerald-500' :
                st === 'TERLAMBAT' ? 'bg-orange-500' :
                st === 'ALPA' ? 'bg-rose-500' :
                st === 'SAKIT' ? 'bg-amber-500' :
                st === 'IZIN' ? 'bg-blue-500' :
                st === 'DISPEN' ? 'bg-violet-500' :
                'bg-slate-400 dark:bg-slate-600';

              const badgeClass = STATUS_BADGE_COLORS[st] || 'text-slate-600 bg-slate-100 dark:bg-slate-800';

              return (
                <div key={idx} className="relative flex items-start gap-3">
                  {/* Glowing Dot on Timeline Line */}
                  <div className={`absolute -left-[23px] mt-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 shrink-0 ${dotClass} shadow-xs`} />

                  {/* Card Content */}
                  <div className={`flex-1 flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all hover:scale-[1.005] ${
                    isGate
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50'
                      : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wide">{item.waktu || '--:--'}</span>
                        {isGate && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-100/90 dark:bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            Presensi Gerbang
                          </span>
                        )}
                        {item.lokasi && (
                          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                            • {item.lokasi}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {activityTitle}
                      </p>
                      {item.keterangan && item.keterangan.trim() && item.keterangan.toUpperCase() !== 'LOG TRANSAKSI' && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic leading-snug line-clamp-2">
                          "{item.keterangan}"
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl whitespace-nowrap shrink-0 ${badgeClass}`}>
                      {STATUS_LABELS[st] || st || 'Tercatat'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </div>
  );
};
