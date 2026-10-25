import React, { useMemo } from 'react';
import {
  DoorOpen,
  BookOpen,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

export interface MapelMatrixItem {
  id: string;
  nama_mapel: string;
  kode_mapel?: string;
}

export interface DayMatrixRecord {
  date: string;
  day: number;
  day_name: string;
  is_weekend: boolean;
  gerbang?: {
    datang_waktu?: string | null;
    datang_status?: string | null;
    pulang_waktu?: string | null;
    pulang_status?: string | null;
    is_terlambat?: boolean;
    is_tap_gantung?: boolean;
  };
  pembiasaan?: {
    status?: string | null;
    nama?: string | null;
  };
  mapel_sessions: Record<string, {
    status: string;
    waktu?: string | null;
    guru?: string | null;
    jp?: number;
  } | null>;
  pkl?: {
    status?: string | null;
    mitra?: string | null;
  };
  final_status: string;
  anomali?: {
    is_anomali: boolean;
    tipe?: string;
    pesan?: string;
  };
}

export interface MapelMatrixData {
  mapel_list: MapelMatrixItem[];
  dates: string[];
  records: DayMatrixRecord[];
  summary_per_mapel: Record<string, {
    nama_mapel: string;
    total_sesi: number;
    hadir: number;
    alpa: number;
    persentase: number;
  }>;
}

interface MapelMultiChannelMatrixTableProps {
  matrixData?: MapelMatrixData;
  bulan: string;
  selectedDate?: string;
  onDateSelect?: (dateStr: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const MapelMultiChannelMatrixTable: React.FC<MapelMultiChannelMatrixTableProps> = React.memo(({
  matrixData,
  bulan,
  selectedDate,
  onDateSelect,
  isLoading = false,
  className,
}) => {
  const mapelList = matrixData?.mapel_list || [];
  const records = matrixData?.records || [];
  const summaryPerMapel = matrixData?.summary_per_mapel || {};

  // Summary Gate
  const gateSummary = useMemo(() => {
    let hadir = 0;
    let total = 0;
    records.forEach((r) => {
      if (!r.is_weekend && r.final_status !== 'LIBUR') {
        total++;
        if (r.gerbang?.datang_status === 'HADIR' || r.gerbang?.datang_status === 'TERLAMBAT') {
          hadir++;
        }
      }
    });
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 100;
    return { hadir, total, pct };
  }, [records]);

  // Summary Pembiasaan
  const pembiasaanSummary = useMemo(() => {
    let hadir = 0;
    let total = 0;
    records.forEach((r) => {
      if (r.pembiasaan?.status) {
        total++;
        if (r.pembiasaan.status === 'HADIR') hadir++;
      }
    });
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 100;
    return { hadir, total, pct };
  }, [records]);

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="w-8 h-8 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Memuat matriks multi-channel 30 hari...
        </p>
      </div>
    );
  }

  if (!matrixData || records.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
        <Info className="w-8 h-8 mx-auto text-slate-400" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Matriks Presensi Belum Tersedia
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Belum ada jadwal sesi pelajaran atau rekaman presensi pada bulan <span className="font-semibold">{bulan}</span> untuk siswa ini.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 w-full max-w-full min-w-0', className)}>
      {/* HEADER & PANDUAN SIMBOL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Matriks Presensi Multi-Channel 1 Bulan Penuh</span>
          </h4>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Bentang horizontal seluruh sesi KBM mata pelajaran, pembiasaan pagi, gerbang, dan anomali.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 flex-wrap text-[9.5px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold inline-flex items-center justify-center text-[9px]">
              H
            </span>
            Hadir
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold inline-flex items-center justify-center text-[9px]">
              T
            </span>
            Terlambat
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold inline-flex items-center justify-center text-[9px]">
              A
            </span>
            Alpa
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="font-mono font-bold text-slate-400">·</span>
            Non-Jadwal
          </span>
        </div>
      </div>

      {/* HORIZONTAL SCROLLABLE SPREADSHEET TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse text-left text-xs">
            {/* ── THEAD (TANGGAL 01 .. 31) ── */}
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200">
                {/* Kolom Sticky Kiri: Channel / Mapel */}
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 font-black uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 min-w-[210px] max-w-[240px] border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Channel / Sesi Pembelajaran
                </th>

                {/* Kolom Tanggal 1..31 */}
                {records.map((r) => {
                  const isSelected = selectedDate === r.date;
                  return (
                    <th
                      key={r.date}
                      onClick={() => onDateSelect?.(r.date)}
                      className={cn(
                        'px-1 py-1.5 text-center min-w-[34px] max-w-[38px] cursor-pointer transition-colors border-r border-slate-100 dark:border-slate-800/60 group select-none',
                        r.is_weekend
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
                        isSelected &&
                          'bg-primary/10 dark:bg-primary/20 text-primary font-black ring-2 ring-primary ring-inset'
                      )}
                      title={`Klik untuk melihat linimasa tanggal ${r.date}`}
                    >
                      <div className="text-[11px] font-black leading-tight">
                        {String(r.day).padStart(2, '0')}
                      </div>
                      <div className="text-[8px] uppercase tracking-tighter opacity-80">
                        {r.day_name}
                      </div>
                    </th>
                  );
                })}

                {/* Kolom Sticky Kanan: Total / Persentase */}
                <th className="sticky right-0 z-20 bg-slate-50 dark:bg-slate-900 px-2.5 py-2.5 text-center font-black uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 min-w-[95px] border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Total Rekap
                </th>
              </tr>
            </thead>

            {/* ── TBODY ── */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
              {/* ── KATEGORI 1: GERBANG SEKOLAH ── */}
              <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 font-bold text-[10px] text-indigo-700 dark:text-indigo-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-indigo-500"
                >
                  Pintu Gerbang Sekolah
                </td>
              </tr>

              {/* Baris Gerbang Datang */}
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5 truncate">
                  <DoorOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">Tap Masuk Gerbang</span>
                </td>

                {records.map((r) => {
                  const g = r.gerbang;
                  const hasTap = Boolean(g?.datang_waktu);
                  const isLate = Boolean(g?.is_terlambat);
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`g-in-${r.date}`}
                      onClick={() => onDateSelect?.(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-mono text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                        isSelected && 'bg-primary/5 dark:bg-primary/10'
                      )}
                      title={hasTap ? `Tap Masuk: ${g?.datang_waktu} (${g?.datang_status})` : 'Tidak Tap'}
                    >
                      {hasTap ? (
                        <span
                          className={cn(
                            'px-1 py-0.5 rounded font-bold leading-none inline-block text-[8.5px]',
                            isLate
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          )}
                        >
                          {g?.datang_waktu}
                        </span>
                      ) : r.is_weekend ? (
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}

                <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {gateSummary.hadir}/{gateSummary.total} ({gateSummary.pct}%)
                </td>
              </tr>

              {/* Baris Gerbang Pulang */}
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5 truncate">
                  <DoorOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">Tap Pulang Gerbang</span>
                </td>

                {records.map((r) => {
                  const g = r.gerbang;
                  const hasPulang = Boolean(g?.pulang_waktu);
                  const isGantung = Boolean(g?.is_tap_gantung);
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`g-out-${r.date}`}
                      onClick={() => onDateSelect?.(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-mono text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                        isSelected && 'bg-primary/5 dark:bg-primary/10'
                      )}
                      title={
                        hasPulang
                          ? `Tap Pulang: ${g?.pulang_waktu}`
                          : isGantung
                          ? '⚠️ Tap Gantung (Masuk tapi tidak tap pulang)'
                          : '-'
                      }
                    >
                      {hasPulang ? (
                        <span className="px-1 py-0.5 rounded font-bold leading-none inline-block text-[8.5px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {g?.pulang_waktu}
                        </span>
                      ) : isGantung ? (
                        <span className="px-1 py-0.5 rounded font-bold leading-none inline-block text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60">
                          ⚠️
                        </span>
                      ) : r.is_weekend ? (
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}

                <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-semibold text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {records.filter((r) => r.gerbang?.pulang_waktu).length} Tap
                </td>
              </tr>

              {/* ── KATEGORI 2: PEMBIASAAN PAGI ── */}
              <tr className="bg-emerald-50/30 dark:bg-emerald-950/20 font-bold text-[10px] text-emerald-700 dark:text-emerald-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-emerald-500"
                >
                  Pembiasaan Pagi (Dhuha / Upacara / Apel)
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5 truncate">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">Sesi Pembiasaan</span>
                </td>

                {records.map((r) => {
                  const p = r.pembiasaan;
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`p-${r.date}`}
                      onClick={() => onDateSelect?.(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-bold text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                        isSelected && 'bg-primary/5 dark:bg-primary/10'
                      )}
                      title={p?.status ? `Pembiasaan: ${p.nama || 'Dhuha/Apel'} (${p.status})` : 'Tidak Ada Sesi'}
                    >
                      {p?.status === 'HADIR' ? (
                        <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 inline-flex items-center justify-center text-[9px]">
                          H
                        </span>
                      ) : p?.status === 'ALPA' ? (
                        <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 inline-flex items-center justify-center text-[9px]">
                          A
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-mono">·</span>
                      )}
                    </td>
                  );
                })}

                <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {pembiasaanSummary.hadir}/{pembiasaanSummary.total} ({pembiasaanSummary.pct}%)
                </td>
              </tr>

              {/* ── KATEGORI 3: SESI KBM PER MATA PELAJARAN ── */}
              <tr className="bg-amber-50/30 dark:bg-amber-950/20 font-bold text-[10px] text-amber-700 dark:text-amber-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-amber-500"
                >
                  Sesi Belajar KBM per Mata Pelajaran
                </td>
              </tr>

              {mapelList.map((mapel) => {
                const mapelSum = summaryPerMapel[mapel.id] || {
                  total_sesi: 0,
                  hadir: 0,
                  alpa: 0,
                  persentase: 100,
                };

                return (
                  <tr
                    key={mapel.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate max-w-[240px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate" title={mapel.nama_mapel}>
                          {mapel.nama_mapel}
                        </span>
                      </div>
                    </td>

                    {/* Sel Tanggal untuk Mapel ini */}
                    {records.map((r) => {
                      const session = r.mapel_sessions[mapel.id];
                      const isSelected = selectedDate === r.date;

                      return (
                        <td
                          key={`${mapel.id}-${r.date}`}
                          onClick={() => onDateSelect?.(r.date)}
                          className={cn(
                            'px-0.5 py-1 text-center font-bold text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                            r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                            isSelected && 'bg-primary/5 dark:bg-primary/10'
                          )}
                          title={
                            session
                              ? `${mapel.nama_mapel} pada ${r.date}: ${session.status} ${
                                  session.waktu ? `(${session.waktu})` : ''
                                }`
                              : `Tidak ada jadwal ${mapel.nama_mapel} pada tanggal ini`
                          }
                        >
                          {session ? (
                            session.status === 'HADIR' || session.status === 'TEPAT_WAKTU' ? (
                              <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 inline-flex items-center justify-center text-[9px]">
                                H
                              </span>
                            ) : session.status === 'TERLAMBAT' ? (
                              <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 inline-flex items-center justify-center text-[9px]">
                                T
                              </span>
                            ) : session.status === 'ALPA' ? (
                              <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 inline-flex items-center justify-center text-[9px] shadow-2xs">
                                A
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 inline-flex items-center justify-center text-[9px]">
                                {session.status.slice(0, 1)}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-mono">·</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Summary Mapel */}
                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                      <span
                        className={cn(
                          mapelSum.persentase < 85
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-800 dark:text-slate-200'
                        )}
                      >
                        {mapelSum.hadir}/{mapelSum.total_sesi} ({mapelSum.persentase}%)
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* ── KATEGORI 4: REKAP STATUS & ANOMALI ── */}
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-slate-500"
                >
                  Status Harian & Indikasi Anomali
                </td>
              </tr>

              {/* Baris Status Harian */}
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 font-bold">
                <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate">
                  Status Akhir Harian
                </td>

                {records.map((r) => {
                  const isSelected = selectedDate === r.date;
                  return (
                    <td
                      key={`final-${r.date}`}
                      onClick={() => onDateSelect?.(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-black text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'text-slate-300 dark:text-slate-600',
                        isSelected && 'bg-primary/10'
                      )}
                      title={`Status Akhir ${r.date}: ${r.final_status}`}
                    >
                      {r.final_status === 'HADIR' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">H</span>
                      ) : r.final_status === 'TERLAMBAT' ? (
                        <span className="text-purple-600 dark:text-purple-400">T</span>
                      ) : r.final_status === 'ALPA' ? (
                        <span className="text-rose-600 dark:text-rose-400">A</span>
                      ) : r.is_weekend ? (
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  );
                })}

                <td className="sticky right-0 z-10 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-center font-black text-indigo-600 dark:text-indigo-400 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10.5px]">
                  Rekap
                </td>
              </tr>

              {/* Baris Anomali */}
              <tr>
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Deteksi Anomali</span>
                </td>

                {records.map((r) => {
                  const anomali = r.anomali;
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`ano-${r.date}`}
                      onClick={() => onDateSelect?.(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        isSelected && 'bg-primary/5'
                      )}
                      title={anomali?.pesan || 'Normal'}
                    >
                      {anomali?.is_anomali ? (
                        <span
                          className="w-4 h-4 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 inline-flex items-center justify-center text-[9px] font-black animate-pulse"
                          title={anomali.pesan}
                        >
                          !
                        </span>
                      ) : (
                        <span className="text-slate-200 dark:text-slate-800">·</span>
                      )}
                    </td>
                  );
                })}

                <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold text-rose-600 dark:text-rose-400 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {records.filter((r) => r.anomali?.is_anomali).length} Kasus
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

MapelMultiChannelMatrixTable.displayName = 'MapelMultiChannelMatrixTable';
