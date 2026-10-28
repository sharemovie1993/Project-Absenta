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
  User,
  MapPin,
  Users,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type { MitraTargetGroup, SiswaTargetItem } from './types';

interface KunjunganTargetListProps {
  groups: MitraTargetGroup[];
  readOnly?: boolean;
  onRecordVisit: (target: SiswaTargetItem) => void;
  onViewHistory: (target: SiswaTargetItem) => void;
  onPrint: (target: SiswaTargetItem) => void;
  onBulkRecordVisit?: (group: MitraTargetGroup) => void;
}

export const KunjunganTargetList: React.FC<KunjunganTargetListProps> = React.memo(({
  groups,
  readOnly = false,
  onRecordVisit,
  onViewHistory,
  onPrint,
  onBulkRecordVisit,
}) => {
  if (groups.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
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
    <div className="space-y-4">
      {groups.map((group) => {
        const lastVisitFormatted = group.lastVisitDate
          ? new Date(group.lastVisitDate).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : null;

        return (
          <div
            key={group.mitra_id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 transition-all"
          >
            {/* Header Mitra Industri */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    {group.nama_mitra}
                  </span>
                  {group.totalVisits === 0 ? (
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase px-2 py-0.5 gap-1">
                      <AlertCircle size={11} /> Belum Pernah Disupervisi
                    </Badge>
                  ) : group.hasUnvisited ? (
                    <Badge variant="warning" className="text-[10px] font-extrabold uppercase px-2 py-0.5 gap-1">
                      <Clock size={11} /> Sebagian Belum Dikunjungi
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px] font-extrabold uppercase px-2 py-0.5 gap-1">
                      <CheckCircle2 size={11} /> Supervisi Memadai ({group.totalVisits}x)
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                  {group.alamat_mitra && (
                    <span className="flex items-center gap-1 text-slate-400 max-w-md truncate">
                      <MapPin size={12} className="shrink-0" />
                      {group.alamat_mitra}
                    </span>
                  )}
                  {group.alamat_mitra && <span>•</span>}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {group.siswaList.length} Siswa Bimbingan
                  </span>
                  {lastVisitFormatted && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400">Kunjungan Terakhir: {lastVisitFormatted}</span>
                    </>
                  )}
                </div>
              </div>

              {!readOnly && onBulkRecordVisit && group.siswaList.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onBulkRecordVisit(group)}
                  className="text-xs font-bold rounded-xl gap-1.5 shrink-0 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-2xs h-9"
                  title={`Catat satu kali supervisi kolektif untuk seluruh ${group.siswaList.length} siswa di ${group.nama_mitra}`}
                >
                  <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Kunjungan Kolektif ({group.siswaList.length} Siswa)</span>
                </Button>
              )}
            </div>

            {/* List Siswa di Mitra ini */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-3 ${
                      isNeverVisited
                        ? 'border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10'
                        : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                            isNeverVisited
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          }`}
                        >
                          {siswa.nama_siswa.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {siswa.nama_siswa}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            NIS: {siswa.nis} • {siswa.kelas}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isNeverVisited ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg">
                            <AlertCircle size={10} /> 0x Kunjungan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 size={10} /> {siswa.visitsCount}x ({formattedSiswaVisitDate})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for this student */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      {siswa.visitsCount > 0 && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onPrint(siswa)}
                            className="text-[11px] font-bold rounded-lg h-7 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1"
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
                            className="text-[11px] font-bold rounded-lg h-7 px-2 text-indigo-600 dark:text-indigo-400 gap-1"
                            title="Buka Riwayat Catatan Kunjungan"
                          >
                            <History size={12} />
                            <span>Riwayat ({siswa.visitsCount})</span>
                          </Button>
                        </>
                      )}

                      {!readOnly && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => onRecordVisit(siswa)}
                          className="text-[11px] font-bold rounded-lg h-7 px-2.5 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        >
                          <Plus size={13} />
                          <span>Catat Supervisi</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

KunjunganTargetList.displayName = 'KunjunganTargetList';
