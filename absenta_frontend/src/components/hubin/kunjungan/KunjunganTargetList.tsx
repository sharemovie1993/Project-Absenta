import React from 'react';
import {
  Building2,
  Calendar,
  Plus,
  History,
  Printer,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { HubCard } from '@/components/ui/hub';
import type { MitraTargetGroup, SiswaTargetItem } from './types';
import { KunjunganMitraLifecycleStrip } from './KunjunganMitraLifecycleStrip';

interface KunjunganTargetListProps {
  groups: MitraTargetGroup[];
  readOnly?: boolean;
  onRecordVisit: (target: SiswaTargetItem) => void;
  onViewHistory: (target: SiswaTargetItem) => void;
  onPrint: (target: SiswaTargetItem) => void;
  onBulkRecordVisit?: (group: MitraTargetGroup) => void;
  onPrintMitraGroup?: (group: MitraTargetGroup) => void;
}

export const KunjunganTargetList: React.FC<KunjunganTargetListProps> = React.memo(({
  groups,
  readOnly = false,
  onRecordVisit,
  onViewHistory,
  onPrint,
  onBulkRecordVisit,
  onPrintMitraGroup,
}) => {
  if (groups.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs">
        <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Tidak Ada Data Siswa / Mitra Industri
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Tidak ditemukan data penempatan siswa bimbingan atau mitra industri yang sesuai dengan kriteria pencarian/filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {groups.map((group) => {
        const lastVisitFormatted = group.lastVisitDate
          ? new Date(group.lastVisitDate).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : null;

        return (
          <HubCard
            key={group.mitra_id}
            noPadding
            title={
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Building2 size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate capitalize">
                      {group.nama_mitra.toLowerCase()}
                    </h3>
                    {group.totalVisits === 0 ? (
                      <Badge variant="danger" className="text-[9px] font-extrabold uppercase px-1.5 py-0 gap-1">
                        <AlertCircle size={10} /> Belum Pernah
                      </Badge>
                    ) : group.hasUnvisited ? (
                      <Badge variant="warning" className="text-[9px] font-extrabold uppercase px-1.5 py-0 gap-1">
                        <Clock size={10} /> Parsial ({group.totalVisits}x)
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[9px] font-extrabold uppercase px-1.5 py-0 gap-1">
                        <CheckCircle2 size={10} /> {group.totalVisits}x Selesai
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                    {group.siswaList.length} Siswa Bimbingan
                    {group.alamat_mitra ? ` • ${group.alamat_mitra}` : ''}
                    {lastVisitFormatted ? ` • Kunjungan: ${lastVisitFormatted}` : ''}
                  </p>
                </div>
              </div>
            }
            actionLabel={
              !readOnly && onBulkRecordVisit && group.siswaList.length > 0
                ? `Kolektif (${group.siswaList.length})`
                : undefined
            }
            onAction={
              !readOnly && onBulkRecordVisit && group.siswaList.length > 0
                ? () => onBulkRecordVisit(group)
                : undefined
            }
          >
            {/* 1. Lifecycle Strip Operasional Datar */}
            <div className="px-3 sm:px-4 py-2 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
              <KunjunganMitraLifecycleStrip totalVisits={group.totalVisits} />
            </div>

            {/* 2. Flat List Rows Siswa Bimbingan (Shopee-Grade Hairline Dividers) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {group.siswaList.map((siswa) => {
                const isNeverVisited = siswa.visitsCount === 0;
                const formattedSiswaVisitDate = siswa.lastVisitDate
                  ? new Date(siswa.lastVisitDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : null;

                return (
                  <div
                    key={siswa.penempatan_id}
                    className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Identitas Siswa */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                          isNeverVisited
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {siswa.nama_siswa.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white capitalize truncate">
                            {siswa.nama_siswa.toLowerCase()}
                          </span>
                          {isNeverVisited ? (
                            <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.2 rounded border border-rose-200/80 dark:border-rose-900/40">
                              0x Kunjungan
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200/80 dark:border-emerald-900/40">
                              {siswa.visitsCount}x {formattedSiswaVisitDate ? `(${formattedSiswaVisitDate})` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                          NIS: {siswa.nis} • {siswa.kelas}
                        </p>
                      </div>
                    </div>

                    {/* Tombol Aksi Mikro Siswa */}
                    <div className="flex items-center justify-end gap-1.5 shrink-0 ml-auto sm:ml-0">
                      {siswa.visitsCount > 0 && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onPrint(siswa)}
                            className="text-[11px] font-bold rounded-xl h-7 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1 cursor-pointer"
                            title="Cetak Berita Acara Supervisi"
                          >
                            <Printer size={12} />
                            <span className="hidden sm:inline">Cetak</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onViewHistory(siswa)}
                            className="text-[11px] font-bold rounded-xl h-7 px-2 text-indigo-600 dark:text-indigo-400 gap-1 cursor-pointer border-indigo-200 dark:border-indigo-900/50"
                            title="Buka Riwayat Catatan Kunjungan"
                          >
                            <History size={12} />
                            <span>Riwayat</span>
                          </Button>
                        </>
                      )}

                      {!readOnly && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => onRecordVisit(siswa)}
                          className="text-[11px] font-bold rounded-xl h-7 px-2.5 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Catat</span>
                          <span className="hidden sm:inline"> Supervisi</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Cetak Berita Acara Mitra */}
            {onPrintMitraGroup && (
              <div className="p-2.5 sm:p-3 bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-400">
                  Dokumentasi Mitra DU/DI
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onPrintMitraGroup(group)}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl h-7 px-2.5 gap-1"
                >
                  <Printer size={12} />
                  <span>Cetak Berita Acara ({group.nama_mitra})</span>
                </Button>
              </div>
            )}
          </HubCard>
        );
      })}
    </div>
  );
});

KunjunganTargetList.displayName = 'KunjunganTargetList';
      })}
    </div>
  );
});

KunjunganTargetList.displayName = 'KunjunganTargetList';
