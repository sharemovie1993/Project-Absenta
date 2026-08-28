import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { RekapBulananKelasRow, ViewMode } from './types';

// ─── Badge style resolver untuk status harian ────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  H: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black',
  T: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black',
  S: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black',
  I: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black',
  D: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-black',
  A: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black',
};

const fallbackBadge = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

// ─── Cell renderers ───────────────────────────────────────────────────────────
const NisCell = (v: unknown) => (
  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
    {v ? String(v) : <span className="text-slate-300 dark:text-slate-600">—</span>}
  </span>
);

const DayCell = (dayStr: string, d: number) => (_: unknown, row: RekapBulananKelasRow) => {
  const code = row.dailyMap?.[dayStr];
  if (!code) return <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>;
  const badge = STATUS_BADGE[code] ?? fallbackBadge;
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] ${badge}`}
      title={`Tanggal ${d}: ${code}`}
    >
      {code}
    </span>
  );
};

const PctCell = (_: unknown, row: RekapBulananKelasRow) => {
  const total = (row.HADIR ?? 0) + (row.IZIN ?? 0) + (row.SAKIT ?? 0) + (row.ALPA ?? 0) + (row.TERLAMBAT ?? 0);
  const pct = total === 0 ? 0 : Math.round((((row.HADIR ?? 0) + (row.TERLAMBAT ?? 0)) / total) * 100);
  const cls = pct >= 85 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-rose-600';
  return <span className={`font-bold text-xs ${cls}`}>{pct}%</span>;
};

// ─── Hook utama ───────────────────────────────────────────────────────────────
export function useRekapBulananKelasColumns(viewMode: ViewMode, dayNumbers: number[]) {
  const navigate = useNavigate();

  const NamaCell = (minW = '') => (v: unknown, row: RekapBulananKelasRow) => (
    <button
      onClick={() => navigate(`/attendance/tracking-siswa?siswa_id=${row.siswa_id}`)}
      className={`font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 text-left transition-all ${minW}`}
      title="Klik untuk Melacak Detail Aktivitas & Sesi Pembelajaran Siswa"
    >
      {String(v ?? '')}
    </button>
  );

  if (viewMode === 'SUMMARY') {
    return [
      { label: 'Nama Siswa', key: 'nama_siswa', render: NamaCell() },
      { label: 'NIS', key: 'nis', className: 'text-center', render: NisCell },
      {
        label: 'Hadir',
        key: 'HADIR',
        className: 'text-center',
        render: (v: unknown) => (
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-bold text-emerald-600">{Number(v) || 0}</span>
          </div>
        )
      },
      { label: 'Izin', key: 'IZIN', className: 'text-center', render: (v: unknown) => <span className="font-bold text-blue-600">{Number(v) || 0}</span> },
      { label: 'Sakit', key: 'SAKIT', className: 'text-center', render: (v: unknown) => <span className="font-bold text-amber-600">{Number(v) || 0}</span> },
      { label: 'Alpa', key: 'ALPA', className: 'text-center', render: (v: unknown) => <span className="font-bold text-rose-600">{Number(v) || 0}</span> },
      { label: 'Terlambat', key: 'TERLAMBAT', className: 'text-center', render: (v: unknown) => <span className="font-bold text-purple-600">{Number(v) || 0}</span> },
      { label: '% Kehadiran', key: 'persentase', className: 'text-center', render: PctCell },
      { label: 'Total Poin', key: 'total_poin', className: 'text-center', render: (v: unknown) => <span className="font-bold text-slate-700 dark:text-slate-300 text-xs font-mono">{Number(v) || 0}</span> },
    ];
  }

  // MATRIX
  const dailyCols = (dayNumbers ?? []).map(d => {
    const dayStr = d.toString();
    return { label: dayStr, key: `day_${d}`, className: 'text-center', render: DayCell(dayStr, d) };
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
  ];
}
