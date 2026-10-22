import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TableIcon,
  CheckCircle2,
  Clock,
  PencilLine,
  AlertCircle,
  ShieldCheck,
  BookOpen,
  Award,
  Layers,
} from 'lucide-react';

import { raporApi } from '@/api/rapor.api';
import {
  getUkkRegulatoryEdition,
  getAvailableRegulatoryEditions,
} from '@/config/ukkRegulatoryRegistry';
import { cn } from '@/lib/utils';

// Semua tahun ajaran yang dikenal sistem
const KNOWN_YEARS = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];

export interface UkkSettingsRekapTableProps {
  jurusanId?: string;
  jurusanNama?: string;
  activeTahunAjaran?: string;
  /** Callback saat user klik "Edit" di baris tertentu */
  onEditYear?: (tahunAjaran: string) => void;
}

interface SummaryRow {
  tahun_ajaran: string;
  edisi_pedoman: string | null;
  skema_sertifikasi: string | null;
  judul_penugasan_id: string | null;
  unit_kompetensi_count: number;
  updated_at?: string | null;
}

const editionOptions = getAvailableRegulatoryEditions();

const edisiLabel = (edisiId?: string | null): string => {
  if (!edisiId) return '—';
  const found = editionOptions.find((e) => e.id === edisiId);
  if (found) return found.label.replace(/\s*\(.*\)/, '');
  return getUkkRegulatoryEdition(edisiId).label.replace(/\s*\(.*\)/, '');
};

const edisiBadge = (edisiId?: string | null): string => {
  if (!edisiId) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  if (edisiId === '2026')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800';
  if (edisiId === '2025')
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 border border-sky-300 dark:border-sky-800';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800';
};

const yearLabel = (tahun: string, activeTahunAjaran?: string): string => {
  if (tahun === activeTahunAjaran) return 'Aktif Berjalan';
  const current = new Date().getFullYear();
  const [y1] = tahun.split('/').map(Number);
  if (y1 > current) return 'Mendatang';
  return 'Arsip Historis';
};

export const UkkSettingsRekapTable: React.FC<UkkSettingsRekapTableProps> = ({
  jurusanId,
  jurusanNama,
  activeTahunAjaran,
  onEditYear,
}) => {
  const { data: rawRes, isLoading } = useQuery({
    queryKey: ['ukk-settings-rekap', jurusanId],
    queryFn: () =>
      jurusanId
        ? raporApi.getAllUkkSettingsSummary(jurusanId)
        : Promise.resolve({ data: [] }),
    enabled: !!jurusanId,
    staleTime: 30 * 1000,
  });

  // Normalisasi response
  const savedRows: SummaryRow[] = React.useMemo(() => {
    const list = (rawRes as any)?.data || rawRes || [];
    return Array.isArray(list) ? list : [];
  }, [rawRes]);

  // Gabung dengan KNOWN_YEARS agar semua tahun tampil (meski belum tersimpan)
  const rows = React.useMemo(() => {
    return KNOWN_YEARS.map((tahun) => {
      const saved = savedRows.find((r) => r.tahun_ajaran === tahun);
      return saved ?? {
        tahun_ajaran: tahun,
        edisi_pedoman: null,
        skema_sertifikasi: null,
        judul_penugasan_id: null,
        unit_kompetensi_count: 0,
        updated_at: null,
      };
    });
  }, [savedRows]);

  if (!jurusanId) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Rekap Konfigurasi UKK — {jurusanNama || 'Jurusan'}
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 w-fit shadow-2xs font-medium">
          <span className="font-bold text-slate-900 dark:text-white">{savedRows.length}</span> dari {KNOWN_YEARS.length} tahun dikonfigurasi
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-xs text-slate-500 gap-2">
          <Clock className="w-4 h-4 animate-spin text-indigo-600" />
          Memuat rekap pengaturan...
        </div>
      ) : (
        <>
          {/* ========================================================== */}
          {/* 1. DESKTOP & TABLET VIEW (Layar md ke atas - Luas & Jelas) */}
          {/* ========================================================== */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="text-left px-4 py-3.5 w-36">Tahun Ajaran</th>
                  <th className="text-left px-3 py-3.5 w-28">Status</th>
                  <th className="text-left px-3 py-3.5 w-48">Edisi Regulasi</th>
                  <th className="text-left px-3 py-3.5 min-w-[200px]">Skema Sertifikasi</th>
                  <th className="text-left px-3 py-3.5 min-w-[220px]">Judul Penugasan</th>
                  <th className="text-center px-3 py-3.5 w-24">Unit</th>
                  <th className="text-center px-4 py-3.5 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {rows.map((row, idx) => {
                  const isActive = row.tahun_ajaran === activeTahunAjaran;
                  const isConfigured = !!row.edisi_pedoman || !!row.skema_sertifikasi;
                  return (
                    <tr
                      key={row.tahun_ajaran}
                      className={cn(
                        'transition-colors',
                        isActive
                          ? 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50'
                          : idx % 2 === 0
                          ? 'bg-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                          : 'bg-slate-50/30 dark:bg-slate-800/20 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      )}
                    >
                      {/* Tahun Ajaran */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                          )}
                          <span
                            className={cn(
                              'font-bold text-sm tabular-nums',
                              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                            )}
                          >
                            {row.tahun_ajaran}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                          {yearLabel(row.tahun_ajaran, activeTahunAjaran)}
                        </div>
                      </td>

                      {/* Status Konfigurasi */}
                      <td className="px-3 py-3.5">
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            Tersimpan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Belum diatur
                          </span>
                        )}
                      </td>

                      {/* Edisi Regulasi */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-start gap-1.5">
                          <ShieldCheck
                            className={cn(
                              'w-4 h-4 mt-0.5 shrink-0',
                              row.edisi_pedoman ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
                            )}
                          />
                          <div>
                            <span
                              className={cn(
                                'inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold leading-tight shadow-2xs',
                                edisiBadge(row.edisi_pedoman)
                              )}
                            >
                              {edisiLabel(row.edisi_pedoman)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Skema Sertifikasi */}
                      <td className="px-3 py-3.5">
                        <span
                          className="line-clamp-2 text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
                          title={row.skema_sertifikasi || undefined}
                        >
                          {row.skema_sertifikasi || (
                            <span className="text-slate-400 italic font-normal">Belum diatur</span>
                          )}
                        </span>
                      </td>

                      {/* Judul Penugasan */}
                      <td className="px-3 py-3.5">
                        <span
                          className="line-clamp-2 text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
                          title={row.judul_penugasan_id || undefined}
                        >
                          {row.judul_penugasan_id || (
                            <span className="text-slate-400 italic font-normal">Belum diatur</span>
                          )}
                        </span>
                      </td>

                      {/* Jumlah Unit */}
                      <td className="px-3 py-3.5 text-center">
                        {row.unit_kompetensi_count > 0 ? (
                          <span className="inline-flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold px-2.5 py-0.5 rounded-lg text-xs tabular-nums shadow-2xs">
                            {row.unit_kompetensi_count} Unit
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-center">
                        {onEditYear && (
                          <button
                            type="button"
                            onClick={() => onEditYear(row.tahun_ajaran)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer',
                              isActive
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                            )}
                            title={`Edit pengaturan TA ${row.tahun_ajaran}`}
                          >
                            <PencilLine className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========================================================== */}
          {/* 2. MOBILE / HP CARD VIEW (Layar < 768px - Touch-Friendly) */}
          {/* ========================================================== */}
          <div className="block md:hidden p-3 space-y-3">
            {rows.map((row) => {
              const isActive = row.tahun_ajaran === activeTahunAjaran;
              const isConfigured = !!row.edisi_pedoman || !!row.skema_sertifikasi;
              return (
                <div
                  key={row.tahun_ajaran}
                  className={cn(
                    'p-4 rounded-2xl border transition-all text-xs space-y-2.5 shadow-xs',
                    isActive
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  )}
                >
                  {/* Card Header: Tahun + Tag + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      )}
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        TA {row.tahun_ajaran}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
                        {yearLabel(row.tahun_ajaran, activeTahunAjaran)}
                      </span>
                    </div>

                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Tersimpan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-3 h-3" />
                        Belum diatur
                      </span>
                    )}
                  </div>

                  {/* Edisi Regulasi */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-slate-500 text-[11px] font-medium">Regulasi:</span>
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold truncate shadow-2xs',
                        edisiBadge(row.edisi_pedoman)
                      )}
                    >
                      {edisiLabel(row.edisi_pedoman)}
                    </span>
                  </div>

                  {/* Skema Sertifikasi */}
                  <div className="flex items-start gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-400 font-medium">Skema:</div>
                      <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                        {row.skema_sertifikasi || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Judul Penugasan */}
                  <div className="flex items-start gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-400 font-medium">Judul Penugasan:</div>
                      <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                        {row.judul_penugasan_id || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Unit Count & Tombol Edit */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 gap-2">
                    <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{row.unit_kompetensi_count > 0 ? `${row.unit_kompetensi_count} Unit SKKNI` : '0 Unit'}</span>
                    </div>

                    {onEditYear && (
                      <button
                        type="button"
                        onClick={() => onEditYear(row.tahun_ajaran)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer',
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                        )}
                      >
                        <PencilLine className="w-3.5 h-3.5" />
                        Edit Konfigurasi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Legend Footer */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/20 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Tahun Aktif Berjalan
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Konfigurasi tersimpan
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Belum dikonfigurasi
        </span>
      </div>
    </div>
  );
};
