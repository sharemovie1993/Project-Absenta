import React from 'react';
import { ArrowUpRight, Compass, Building2 } from 'lucide-react';
import type { RekapBulananPklRow } from '@/api/hubin.api';

export type ViewMode = 'SUMMARY' | 'MATRIX';

const STATUS_BADGE: Record<string, string> = {
  H: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black',
  T: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black',
  S: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black',
  I: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black',
  D: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-black',
  A: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black',
};

const fallbackBadge = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

const NisCell = (v: unknown) => (
  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
    {v ? String(v) : <span className="text-slate-300 dark:text-slate-600">—</span>}
  </span>
);

const DayCell = (dayStr: string, d: number) => (_: unknown, row: RekapBulananPklRow) => {
  const code = row.dailyMap?.[dayStr];
  if (!code) return <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>;
  const badge = STATUS_BADGE[code] ?? fallbackBadge;
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] ${badge}`}
      title={`Tanggal ${d}: ${code === 'D' ? 'Dinas Luar' : code}`}
    >
      {code}
    </span>
  );
};

const PctCell = (_: unknown, row: RekapBulananPklRow) => {
  const pct = row.persentase ?? 0;
  const cls = pct >= 85 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-rose-600';
  return <span className={`font-bold text-xs ${cls}`}>{pct}%</span>;
};

export function useRekapPklColumns({
  viewMode,
  dayNumbers,
  onNavigateDetail,
}: {
  viewMode: ViewMode;
  dayNumbers: number[];
  onNavigateDetail?: (row: RekapBulananPklRow) => void;
}) {
  const NamaCell = (minW = '') => (v: unknown, row: RekapBulananPklRow) => (
    <button
      type="button"
      onClick={() => onNavigateDetail?.(row)}
      className={`group/name inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline text-left transition-all cursor-pointer ${minW}`}
      title="Klik untuk Melihat Detail Siswa PKL"
    >
      <span className="truncate">{String(v ?? '')}</span>
      <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover/name:opacity-100 group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 transition-all text-indigo-500 shrink-0" />
    </button>
  );

  const MitraCell = (v: unknown) => (
    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="truncate">{String(v || '-')}</span>
    </div>
  );

  const AksiCell = (_: unknown, row: RekapBulananPklRow) => (
    <button
      type="button"
      onClick={() => onNavigateDetail?.(row)}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer shadow-2xs"
      title="Buka Detail Aktivitas Siswa"
    >
      <Compass className="w-3 h-3 text-indigo-500" />
      <span>Lacak</span>
    </button>
  );

  if (viewMode === 'SUMMARY') {
    return [
      { label: 'Nama Siswa', key: 'nama_siswa', render: NamaCell() },
      { label: 'NIS', key: 'nis', className: 'text-center', render: NisCell },
      { label: 'Mitra DUDI', key: 'nama_mitra', render: MitraCell },
      { label: 'Kelas', key: 'nama_kelas', className: 'text-center' },
      {
        label: 'Hadir',
        key: 'HADIR',
        className: 'text-center',
        render: (v: unknown) => (
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-bold text-emerald-600">{Number(v) || 0}</span>
          </div>
        ),
      },
      { label: 'Izin', key: 'IZIN', className: 'text-center', render: (v: unknown) => <span className="font-bold text-blue-600">{Number(v) || 0}</span> },
      { label: 'Sakit', key: 'SAKIT', className: 'text-center', render: (v: unknown) => <span className="font-bold text-amber-600">{Number(v) || 0}</span> },
      { label: 'Alpa', key: 'ALPA', className: 'text-center', render: (v: unknown) => <span className="font-bold text-rose-600">{Number(v) || 0}</span> },
      { label: 'Terlambat', key: 'TERLAMBAT', className: 'text-center', render: (v: unknown) => <span className="font-bold text-purple-600">{Number(v) || 0}</span> },
      { label: '% Kehadiran', key: 'persentase', className: 'text-center', render: PctCell },
      { label: 'POIN', key: 'total_poin', className: 'text-center', render: (v: unknown) => <span className="font-bold text-slate-700 dark:text-slate-300 text-xs font-mono">{Number(v) || 0}</span> },
      { label: 'Aksi', key: 'aksi', className: 'text-center w-20', render: AksiCell },
    ];
  }

  // MATRIX VIEW
  const dailyCols = (dayNumbers ?? []).map((d) => {
    const dayStr = d.toString();
    return {
      label: dayStr,
      key: `day_${d}`,
      className: 'text-center p-1',
      render: DayCell(dayStr, d),
    };
  });

  return [
    { label: 'Nama Siswa', key: 'nama_siswa', render: NamaCell('whitespace-nowrap min-w-[140px]') },
    { label: 'NIS', key: 'nis', className: 'text-center', render: NisCell },
    ...dailyCols,
    { label: 'H', key: 'HADIR', className: 'text-center', render: (v: unknown) => <span className="font-bold text-emerald-600 text-xs">{Number(v) || 0}</span> },
    { label: 'S', key: 'SAKIT', className: 'text-center', render: (v: unknown) => <span className="font-bold text-amber-600 text-xs">{Number(v) || 0}</span> },
    { label: 'I', key: 'IZIN', className: 'text-center', render: (v: unknown) => <span className="font-bold text-blue-600 text-xs">{Number(v) || 0}</span> },
    { label: 'A', key: 'ALPA', className: 'text-center', render: (v: unknown) => <span className="font-bold text-rose-600 text-xs">{Number(v) || 0}</span> },
    { label: 'T', key: 'TERLAMBAT', className: 'text-center', render: (v: unknown) => <span className="font-bold text-purple-600 text-xs">{Number(v) || 0}</span> },
    { label: 'POIN', key: 'total_poin', className: 'text-center', render: (v: unknown) => <span className="font-bold text-slate-700 dark:text-slate-300 text-xs font-mono">{Number(v) || 0}</span> },
    { label: 'Lacak', key: 'aksi', className: 'text-center w-14', render: AksiCell },
  ];
}
