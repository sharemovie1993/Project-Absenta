import React from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Settings,
  Sparkles,
  MapPin,
  UserCheck,
  FileText,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { RaporSettingSummaryRow } from '@/api/rapor.api';

export interface RaporSettingsRekapTableProps {
  rows: RaporSettingSummaryRow[];
  isLoading: boolean;
  activeTahunAjaran?: string;
  onEditSlot: (row: RaporSettingSummaryRow) => void;
  canManage?: boolean;
}

const formatIndoDate = (dateStr?: string | null) => {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]} ${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return dateStr;
};

export const RaporSettingsRekapTable: React.FC<RaporSettingsRekapTableProps> = React.memo(({
  rows,
  isLoading,
  activeTahunAjaran,
  onEditSlot,
  canManage = true,
}) => {
  return (
    <div className="w-full">
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat ringkasan konfigurasi slot rapor...</span>
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
          <div className="hidden md:block rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="text-left px-3 py-2.5 whitespace-nowrap">Tahun Pelajaran</th>
                  <th className="text-left px-2 py-2.5 whitespace-nowrap">Status</th>
                  <th className="text-left px-2 py-2.5 whitespace-nowrap">Tempat Terbit</th>
                  <th className="text-left px-2.5 py-2.5 whitespace-nowrap">Titimangsa Ganjil</th>
                  <th className="text-left px-2.5 py-2.5 whitespace-nowrap">Titimangsa Genap</th>
                  <th className="text-left px-2.5 py-2.5 whitespace-nowrap">Kepala Sekolah</th>
                  <th className="text-center px-2 py-2.5 whitespace-nowrap">Format Blanko</th>
                  <th className="text-center px-2.5 py-2.5 w-24 shrink-0 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {rows.map((row, idx) => {
                  const isActive = row.is_active || row.tahun_ajaran === activeTahunAjaran;
                  const isConfigured = row.is_configured;

                  const tglGanjil = formatIndoDate(row.tanggal_rapor_ganjil);
                  const tglGenap = formatIndoDate(row.tanggal_rapor_genap);

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
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                          )}
                          <span
                            className={cn(
                              'font-bold text-xs tabular-nums whitespace-nowrap',
                              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                            )}
                          >
                            {row.tahun_ajaran}
                          </span>
                        </div>
                        <div className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium whitespace-nowrap">
                          {isActive ? 'Tahun Ajaran Aktif' : 'Arsip Akademik'}
                        </div>
                      </td>

                      {/* Status Konfigurasi */}
                      <td className="px-2 py-2.5">
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                            Tersimpan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            Belum diatur
                          </span>
                        )}
                      </td>

                      {/* Tempat Terbit */}
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span>{row.tempatTerbit || row.tempat_terbit || 'Purwakarta'}</span>
                        </div>
                      </td>

                      {/* Titimangsa Ganjil */}
                      <td className="px-2.5 py-2.5">
                        {tglGanjil ? (
                          <div className="space-y-0.5 whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              {tglGanjil}
                            </span>
                            {row.tanggal_pts_ganjil && (
                              <span className="text-[9.5px] text-slate-400 block">
                                PTS: {formatIndoDate(row.tanggal_pts_ganjil)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-mono text-[10px] whitespace-nowrap">(belum diset)</span>
                        )}
                      </td>

                      {/* Titimangsa Genap */}
                      <td className="px-2.5 py-2.5">
                        {tglGenap ? (
                          <div className="space-y-0.5 whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              {tglGenap}
                            </span>
                            {row.tanggal_pleno_genap && (
                              <span className="text-[9.5px] text-slate-400 block">
                                Pleno: {formatIndoDate(row.tanggal_pleno_genap)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-mono text-[10px] whitespace-nowrap">(belum diset)</span>
                        )}
                      </td>

                      {/* Kepala Sekolah */}
                      <td className="px-2.5 py-2.5">
                        {row.kepsek_nama ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white block truncate max-w-[140px] lg:max-w-[180px]">
                              {row.kepsek_nama}
                            </span>
                            <span className="text-[9.5px] text-slate-400 block font-mono whitespace-nowrap">
                              NIP. {row.kepsek_nip || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">—</span>
                        )}
                      </td>

                      {/* Format Blanko */}
                      <td className="px-2 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1 justify-center whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded text-[10px] border border-slate-200 dark:border-slate-700">
                            {row.ukuran_kertas || 'A4'}
                          </span>
                          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded text-[9.5px] border border-indigo-200 dark:border-indigo-800">
                            {row.mode_cetak_rapor === 'SUMATIF_AND_CP'
                              ? 'Sumatif + CP'
                              : row.mode_cetak_rapor === 'SUMATIF_ONLY'
                              ? 'Sumatif'
                              : 'CP Only'}
                          </span>
                        </div>
                      </td>

                      {/* Aksi Button */}
                      <td className="px-2.5 py-2.5 text-center shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => onEditSlot(row)}
                          disabled={!canManage}
                          className={cn(
                            'h-6.5 px-2.5 text-[11px] font-bold gap-1 rounded-md shrink-0 whitespace-nowrap',
                            isActive && 'shadow-xs'
                          )}
                        >
                          <Settings className="w-3 h-3" />
                          <span>Atur Slot</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
                          <Settings className="w-3.5 h-3.5" />
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
          <div className="block md:hidden space-y-3">
            {rows.map((row) => {
              const isActive = row.is_active || row.tahun_ajaran === activeTahunAjaran;
              const isConfigured = row.is_configured;
              const tglGanjil = formatIndoDate(row.tanggal_rapor_ganjil);
              const tglGenap = formatIndoDate(row.tanggal_rapor_genap);

              return (
                <div
                  key={row.tahun_pelajaran_id}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all space-y-3 bg-white dark:bg-slate-900',
                    isActive
                      ? 'border-indigo-300 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  {/* Top Bar: Tahun & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      )}
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {row.tahun_ajaran}
                      </span>
                    </div>

                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                        Tersimpan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                        Belum diatur
                      </span>
                    )}
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tgl Rapor Ganjil</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {tglGanjil || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tgl Rapor Genap</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {tglGenap || '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block">Kepala Sekolah</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {row.kepsek_nama || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => onEditSlot(row)}
                    disabled={!canManage}
                    className="w-full h-8 text-xs font-bold gap-1.5 rounded-lg"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Atur Slot {row.tahun_ajaran}</span>
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

RaporSettingsRekapTable.displayName = 'RaporSettingsRekapTable';
