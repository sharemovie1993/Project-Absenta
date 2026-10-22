import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TableIcon,
  CheckCircle2,
  Clock,
  PencilLine,
  AlertCircle,
  ShieldCheck,
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
  if (found) return found.label;
  // Fallback: resolve from registry
  return getUkkRegulatoryEdition(edisiId).label;
};

const edisiBadge = (edisiId?: string | null): string => {
  if (!edisiId) return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  if (edisiId === '2026')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  if (edisiId === '2025')
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
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
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <TableIcon className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Rekap Konfigurasi UKK — {jurusanNama || 'Jurusan'}
        </h4>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {savedRows.length} dari {KNOWN_YEARS.length} tahun dikonfigurasi
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
          <Clock className="w-4 h-4 animate-spin" />
          Memuat rekap...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20 text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-semibold w-32">Tahun Ajaran</th>
                <th className="text-left px-3 py-2.5 font-semibold w-28">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold">Edisi Regulasi</th>
                <th className="text-left px-3 py-2.5 font-semibold">Skema Sertifikasi</th>
                <th className="text-left px-3 py-2.5 font-semibold">Judul Penugasan</th>
                <th className="text-center px-3 py-2.5 font-semibold w-20">Unit</th>
                <th className="text-center px-3 py-2.5 font-semibold w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isActive = row.tahun_ajaran === activeTahunAjaran;
                const isConfigured = !!row.edisi_pedoman || !!row.skema_sertifikasi;
                return (
                  <tr
                    key={row.tahun_ajaran}
                    className={cn(
                      'border-b last:border-b-0 transition-colors',
                      isActive
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : idx % 2 === 0
                        ? 'bg-transparent hover:bg-muted/30'
                        : 'bg-muted/10 hover:bg-muted/30'
                    )}
                  >
                    {/* Tahun Ajaran */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'font-bold tabular-nums',
                            isActive ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {row.tahun_ajaran}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {yearLabel(row.tahun_ajaran, activeTahunAjaran)}
                      </div>
                    </td>

                    {/* Status Konfigurasi */}
                    <td className="px-3 py-3">
                      {isConfigured ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Tersimpan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Belum diatur
                        </span>
                      )}
                    </td>

                    {/* Edisi Regulasi */}
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-1.5">
                        <ShieldCheck
                          className={cn(
                            'w-3.5 h-3.5 mt-0.5 shrink-0',
                            row.edisi_pedoman ? 'text-primary' : 'text-muted-foreground/40'
                          )}
                        />
                        <div>
                          <span
                            className={cn(
                              'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight',
                              edisiBadge(row.edisi_pedoman)
                            )}
                          >
                            {row.edisi_pedoman
                              ? (() => {
                                  const found = editionOptions.find(
                                    (e) => e.id === row.edisi_pedoman
                                  );
                                  if (found) {
                                    // Ambil label singkat: "Pedoman Kemendikdasmen 2026"
                                    return found.label.replace(/\s*\(.*\)/, '');
                                  }
                                  return row.edisi_pedoman;
                                })()
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Skema Sertifikasi */}
                    <td className="px-3 py-3 max-w-[180px]">
                      <span
                        className="block truncate text-foreground/80"
                        title={row.skema_sertifikasi || undefined}
                      >
                        {row.skema_sertifikasi || (
                          <span className="text-muted-foreground/50 italic">—</span>
                        )}
                      </span>
                    </td>

                    {/* Judul Penugasan */}
                    <td className="px-3 py-3 max-w-[200px]">
                      <span
                        className="block truncate text-foreground/80"
                        title={row.judul_penugasan_id || undefined}
                      >
                        {row.judul_penugasan_id || (
                          <span className="text-muted-foreground/50 italic">—</span>
                        )}
                      </span>
                    </td>

                    {/* Jumlah Unit */}
                    <td className="px-3 py-3 text-center">
                      {row.unit_kompetensi_count > 0 ? (
                        <span className="inline-block font-bold text-foreground tabular-nums">
                          {row.unit_kompetensi_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-3 py-3 text-center">
                      {onEditYear && (
                        <button
                          type="button"
                          onClick={() => onEditYear(row.tahun_ajaran)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary'
                          )}
                          title={`Edit pengaturan TA ${row.tahun_ajaran}`}
                        >
                          <PencilLine className="w-3 h-3" />
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
      )}

      {/* Legend */}
      <div className="px-4 py-2 border-t bg-muted/10 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif Berjalan
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Konfigurasi tersimpan
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-slate-400" /> Belum dikonfigurasi
        </span>
      </div>
    </div>
  );
};
