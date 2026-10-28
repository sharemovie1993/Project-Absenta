import React from 'react';
import {
  TableIcon,
  CheckCircle2,
  AlertCircle,
  PencilLine,
  Calendar,
  Clock,
  Building2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface HubinSettingSummaryRow {
  tahun_pelajaran_id: string;
  tahun_ajaran: string;
  is_active: boolean;
  is_configured: boolean;
  nomorSuratSertifikat?: string;
  tanggalTerbitSertifikat?: string;
  durasiJp?: string | number;
  tempatTerbit?: string;
  penandatanganNama?: string;
  penandatanganNip?: string;
  assessmentMode?: 'DUDI_ONLY' | 'COMPOSITE';
  weightDudi?: number;
  weightLaporan?: number;
  weightSidang?: number;
  visitCycleTarget?: number;
  visitCycleMode?: 'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM';
  visitRequirePhoto?: boolean;
  visitRequireSignature?: boolean;
  visitRequireJournal?: boolean;
}

export interface HubinSettingsRekapTableProps {
  rows: HubinSettingSummaryRow[];
  isLoading: boolean;
  activeTahunAjaran?: string;
  onEditYear: (row: HubinSettingSummaryRow) => void;
}

const yearLabel = (tahun: string, isActive?: boolean): string => {
  if (isActive) return 'Aktif Berjalan ★';
  const current = new Date().getFullYear();
  const [y1] = tahun.split('/').map(Number);
  if (y1 > current) return 'Mendatang';
  return 'Arsip Historis';
};

export const HubinSettingsRekapTable: React.FC<HubinSettingsRekapTableProps> = React.memo(({
  rows,
  isLoading,
  activeTahunAjaran,
  onEditYear,
}) => {
  const configuredCount = rows.filter((r) => r.is_configured).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      {/* Table Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Slot Referensi Sertifikat Resmi per Angkatan / Tahun Pelajaran
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 w-fit shadow-2xs font-medium">
          <span className="font-bold text-slate-900 dark:text-white">{configuredCount}</span> dari {rows.length} tahun terkonfigurasi
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-xs text-slate-500 gap-2">
          <Clock className="w-4 h-4 animate-spin text-indigo-600" />
          Memuat rekap pengaturan tahun pelajaran...
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          Belum ada data tahun pelajaran di database.
        </div>
      ) : (
        <>
          {/* ========================================================== */}
          {/* 1. DESKTOP & TABLET VIEW (md ke atas)                      */}
          {/* ========================================================== */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="text-left px-4 py-3.5 w-40">Tahun Pelajaran</th>
                  <th className="text-left px-3 py-3.5 w-28">Status</th>
                  <th className="text-left px-3 py-3.5 min-w-[200px]">Nomor Surat Resmi TU</th>
                  <th className="text-left px-3 py-3.5 w-48">Titimangsa &amp; Kota</th>
                  <th className="text-center px-3 py-3.5 w-24">Durasi JP</th>
                  <th className="text-left px-3 py-3.5 min-w-[180px]">Penandatangan Sertifikat</th>
                  <th className="text-center px-4 py-3.5 w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {rows.map((row, idx) => {
                  const isActive = row.is_active || row.tahun_ajaran === activeTahunAjaran;
                  const isConfigured = row.is_configured;

                  const formattedTgl = row.tanggalTerbitSertifikat
                    ? new Date(row.tanggalTerbitSertifikat).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <tr
                      key={row.tahun_pelajaran_id}
                      className={cn(
                        'transition-colors',
                        isActive
                          ? 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50'
                          : idx % 2 === 0
                          ? 'bg-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                          : 'bg-slate-50/30 dark:bg-slate-800/20 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      )}
                    >
                      {/* Tahun Pelajaran */}
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
                          {yearLabel(row.tahun_ajaran, row.is_active)}
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

                      {/* Nomor Surat Resmi TU */}
                      <td className="px-3 py-3.5">
                        {row.nomorSuratSertifikat ? (
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[260px]">
                            {row.nomorSuratSertifikat}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">(belum diset)</span>
                        )}
                      </td>

                      {/* Titimangsa & Kota */}
                      <td className="px-3 py-3.5">
                        {formattedTgl || row.tempatTerbit ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                              {formattedTgl || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {row.tempatTerbit || 'Purwakarta'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-mono">—</span>
                        )}
                      </td>

                      {/* Durasi JP */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold px-2 py-0.5 rounded-lg text-xs tabular-nums">
                          {row.durasiJp || 792} JP
                        </span>
                      </td>

                      {/* Penandatangan Sertifikat */}
                      <td className="px-3 py-3.5">
                        {row.penandatanganNama ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white block truncate max-w-[220px]">
                              {row.penandatanganNama}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              NIP. {row.penandatanganNip || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sesuai profil sekolah</span>
                        )}
                      </td>

                      {/* Aksi Button */}
                      <td className="px-4 py-3.5 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant={isActive ? 'primary' : 'outline'}
                          onClick={() => onEditYear(row)}
                          className="text-xs font-bold rounded-xl h-8 gap-1.5 px-3"
                        >
                          <PencilLine className="w-3.5 h-3.5" />
                          <span>Atur Slot</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========================================================== */}
          {/* 2. MOBILE CARD VIEW (< md)                                 */}
          {/* ========================================================== */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
            {rows.map((row) => {
              const isActive = row.is_active || row.tahun_ajaran === activeTahunAjaran;
              return (
                <div
                  key={row.tahun_pelajaran_id}
                  className={cn(
                    'p-3.5 rounded-xl border space-y-2.5 transition-all',
                    isActive
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {row.tahun_ajaran}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {yearLabel(row.tahun_ajaran, row.is_active)}
                      </span>
                    </div>
                    {row.is_configured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 size={10} /> Tersimpan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200">
                        Belum Diatur
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-slate-600 dark:text-slate-400">
                      <span className="font-bold">Nomor Surat:</span>{' '}
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {row.nomorSuratSertifikat || '(belum diset)'}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>Durasi: {row.durasiJp || 792} JP</span>
                      <span>Kota: {row.tempatTerbit || 'Purwakarta'}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? 'primary' : 'outline'}
                    onClick={() => onEditYear(row)}
                    className="w-full text-xs font-bold rounded-xl h-8 gap-1.5"
                  >
                    <PencilLine size={13} />
                    <span>Atur Konfigurasi {row.tahun_ajaran}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

HubinSettingsRekapTable.displayName = 'HubinSettingsRekapTable';
export default HubinSettingsRekapTable;
