import React from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import type { RekapBulananPklRow } from '@/api/hubin.api';
import type { ViewMode } from './rekapPklColumns';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  H: { bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80', text: 'text-emerald-600', label: 'Hadir' },
  T: { bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80', text: 'text-purple-600', label: 'Terlambat' },
  S: { bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80', text: 'text-amber-600', label: 'Sakit' },
  I: { bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80', text: 'text-blue-600', label: 'Izin' },
  D: { bg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200/80', text: 'text-cyan-600', label: 'Dinas Luar' },
  A: { bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80', text: 'text-rose-600', label: 'Alpa' },
};

const toTitleCase = (str?: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase());
};

export interface RekapPresensiMobileCardProps {
  row: RekapBulananPklRow;
  dayNumbers: number[];
  viewMode: ViewMode;
  onNavigateDetail?: (row: RekapBulananPklRow) => void;
}

export const RekapPresensiMobileCard: React.FC<RekapPresensiMobileCardProps> = React.memo(({
  row,
  dayNumbers,
  viewMode,
  onNavigateDetail,
}) => {
  const pct = row.persentase ?? 0;
  const pctBadgeClass =
    pct >= 85
      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80'
      : pct >= 75
      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80'
      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80';

  return (
    <div
      onClick={() => onNavigateDetail?.(row)}
      className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs hover:border-slate-200 transition-all cursor-pointer space-y-2.5 w-full min-w-0"
    >
      {/* Header: Siswa & Persentase */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {toTitleCase(row.nama_siswa)}
            </h4>
            <ChevronRight size={13} className="text-slate-400 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
            <span>{row.nis || 'NIS —'}</span>
            <span>•</span>
            <span className="font-semibold text-slate-500">{row.nama_kelas || 'Kelas —'}</span>
          </div>
        </div>

        {/* Persentase Badge */}
        <div className={`px-2 py-0.5 rounded-full border text-[11px] font-black shrink-0 ${pctBadgeClass}`}>
          {pct}%
        </div>
      </div>

      {/* Info Mitra DUDI */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate bg-slate-50/70 dark:bg-slate-800/30 px-2.5 py-1.5 rounded-xl border border-slate-100/80 dark:border-slate-800/60">
        <Building2 size={12} className="text-indigo-500 shrink-0" />
        <span className="truncate">{toTitleCase(row.nama_mitra) || 'Mitra DU/DI'}</span>
      </div>

      {/* Akumulasi Chips (Hadir, Sakit, Izin, Alpa, Terlambat) */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
          H: {row.HADIR || 0}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60">
          T: {row.TERLAMBAT || 0}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60">
          S: {row.SAKIT || 0}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60">
          I: {row.IZIN || 0}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60">
          A: {row.ALPA || 0}
        </span>
      </div>

      {/* Mode Harian (Jika ViewMode === 'MATRIX'): Horizontal Date Chips */}
      {viewMode === 'MATRIX' && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1.5">
            <span>Riwayat Tanggal Harian</span>
            <span>{dayNumbers.length} Hari</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {dayNumbers.map((d) => {
              const code = row.dailyMap?.[String(d)];
              const badge = code ? STATUS_BADGE[code] : null;

              return (
                <div
                  key={d}
                  className={`flex flex-col items-center justify-center shrink-0 w-6 h-8 rounded-lg border text-[9px] font-bold transition-all ${
                    badge
                      ? `${badge.bg} border-slate-200/60 dark:border-slate-700`
                      : 'bg-slate-50/50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800'
                  }`}
                  title={`Tanggal ${d}: ${code ? badge?.label || code : 'Kosong'}`}
                >
                  <span className="text-[8px] opacity-70 font-mono">{d}</span>
                  <span className="text-[9.5px] font-black">{code || '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

RekapPresensiMobileCard.displayName = 'RekapPresensiMobileCard';
export default RekapPresensiMobileCard;
