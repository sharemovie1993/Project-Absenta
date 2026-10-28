import React from 'react';
import { Send, Activity, LogOut, CheckCircle2, Clock } from 'lucide-react';

export interface KunjunganMitraLifecycleStripProps {
  totalVisits: number;
  hasPengantaran?: boolean;
  monitoringCount?: number;
  hasPenjemputan?: boolean;
  isNearEnd?: boolean;
}

export const KunjunganMitraLifecycleStrip: React.FC<KunjunganMitraLifecycleStripProps> = React.memo(({
  totalVisits,
  hasPengantaran = false,
  monitoringCount = 0,
  hasPenjemputan = false,
  isNearEnd = false,
}) => {
  // Infer states if not explicitly tagged
  const isPengantaranDone = hasPengantaran || totalVisits >= 1;
  const isMonitoringDone = monitoringCount > 0 || totalVisits >= 2;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] overflow-x-auto no-scrollbar">
      {/* 1. Pengantaran */}
      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold shrink-0 transition-colors ${
          isPengantaranDone
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-300'
        }`}
      >
        <Send size={11} className="shrink-0" />
        <span>1. Pengantaran:</span>
        <span className="font-bold">
          {isPengantaranDone ? '✓ Selesai' : 'Perlu Diantar'}
        </span>
      </div>

      <span className="text-slate-300 dark:text-slate-700">→</span>

      {/* 2. Monitoring */}
      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold shrink-0 transition-colors ${
          isMonitoringDone
            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
            : isPengantaranDone
            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            : 'bg-slate-50 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-800 text-slate-400'
        }`}
      >
        <Activity size={11} className="shrink-0" />
        <span>2. Monitoring:</span>
        <span className="font-bold">
          {isMonitoringDone ? `${Math.max(1, totalVisits - (hasPenjemputan ? 2 : 1))}x Selesai` : 'Menunggu'}
        </span>
      </div>

      <span className="text-slate-300 dark:text-slate-700">→</span>

      {/* 3. Penjemputan */}
      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold shrink-0 transition-colors ${
          hasPenjemputan
            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800 text-purple-800 dark:text-purple-300'
            : isNearEnd
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-pulse'
            : 'bg-slate-50 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-800 text-slate-400'
        }`}
      >
        <LogOut size={11} className="shrink-0" />
        <span>3. Penjemputan:</span>
        <span className="font-bold">
          {hasPenjemputan ? '✓ Selesai' : isNearEnd ? 'Siap Dijemput' : 'Menunggu Akhir'}
        </span>
      </div>
    </div>
  );
});

export default KunjunganMitraLifecycleStrip;
