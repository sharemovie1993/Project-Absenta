import React from 'react';
import { Building2 } from 'lucide-react';
import { PenempatanRowActionMenu } from '@/components/hubin/PenempatanRowActionMenu';
import type { SiswaPkl, MitraData } from '@/pages/hubin/types/penempatan.types';

export interface PenempatanMobileCardProps {
  row: SiswaPkl;
  rawMitra: MitraData[];
  canManage: boolean;
  hasKolektif: (mitraId: string) => boolean;
  onNilai: (row: SiswaPkl) => void;
  onKunjungan: (row: SiswaPkl) => void;
  onReviewJurnal: (row: SiswaPkl) => void;
  onCetakTugas: (row: SiswaPkl) => void;
  onCetakKolektif: (mitraId: string) => void;
  onPrintMonitoring: (row: SiswaPkl) => void;
  onHapus: (row: SiswaPkl) => void;
  onEdit: (row: SiswaPkl) => void;
  onMutasi?: (row: SiswaPkl) => void;
  onFilterSiswaHistory?: (namaSiswa: string) => void;
  onEditMitraKontak: (mitraId: string) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  hidePembimbing?: boolean;
  isPembimbingMode?: boolean;
  onOpenDetail?: (row: SiswaPkl) => void;
}

const toTitleCase = (str?: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase());
};

export const PenempatanMobileCard: React.FC<PenempatanMobileCardProps> = React.memo(({
  row,
  rawMitra,
  canManage,
  hasKolektif,
  onNilai,
  onKunjungan,
  onReviewJurnal,
  onCetakTugas,
  onCetakKolektif,
  onPrintMonitoring,
  onHapus,
  onEdit,
  onMutasi,
  onFilterSiswaHistory,
  onEditMitraKontak,
  selectable,
  isSelected,
  onToggleSelect,
  hidePembimbing = false,
  isPembimbingMode = false,
  onOpenDetail,
}) => {
  const fullMitra = rawMitra?.find((m: MitraData) => m.id === row.mitra_id);
  const siswaPhone = row.Siswa?.no_hp || '';
  const mitraPhone = row.Mitra?.kontak || fullMitra?.kontak || '';
  const kelasNama = row.Siswa?.Kelas?.nama_kelas || (row.Siswa as any)?.kelas_nama || '';
  const pembimbingNama = row.Pembimbing?.nama_guru ? toTitleCase(row.Pembimbing.nama_guru) : 'Belum Ada';

  return (
    <div
      key={row.id}
      className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2 w-full max-w-full min-w-0"
    >
      {/* 1. Baris Siswa, Kelas & Tombol Aksi */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectable && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={() => onToggleSelect?.(row.id)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
            />
          )}
          <div className="flex items-baseline gap-1.5 min-w-0 flex-1 flex-wrap">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 break-words leading-snug">
              {toTitleCase(row.Siswa?.nama_siswa)}
            </h4>
            {kelasNama && (
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                {kelasNama}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <PenempatanRowActionMenu
            row={row}
            canManage={canManage}
            hasKolektif={hasKolektif}
            onNilai={onNilai}
            onKunjungan={onKunjungan}
            onReviewJurnal={onReviewJurnal}
            onCetakTugas={onCetakTugas}
            onCetakKolektif={onCetakKolektif}
            onPrintMonitoring={onPrintMonitoring}
            onHapus={onHapus}
            onEdit={onEdit}
            onMutasi={onMutasi}
            onFilterSiswaHistory={onFilterSiswaHistory}
            onEditMitraKontak={onEditMitraKontak}
            onOpenDetail={onOpenDetail}
            isPembimbingMode={isPembimbingMode}
            siswaPhone={siswaPhone}
            mitraPhone={mitraPhone}
          />
        </div>
      </div>

      {/* 2. Baris Mitra Industri (Perusahaan) & Guru Pembimbing */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-2 text-xs">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <Building2 size={13} className="text-indigo-500 shrink-0 mt-0.5" />
          {row.mitra_id ? (
            <button
              type="button"
              onClick={() => onEditMitraKontak(row.mitra_id)}
              className="break-words text-left hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer font-semibold text-xs text-slate-800 dark:text-slate-200 leading-snug"
              title="Klik untuk melihat / perbarui kontak & PIC DUDI"
            >
              {toTitleCase(row.Mitra?.nama)}
            </button>
          ) : (
            <span className="break-words font-semibold text-xs text-slate-800 dark:text-slate-200 leading-snug">
              {toTitleCase(row.Mitra?.nama)}
            </span>
          )}
        </div>

        {!hidePembimbing && (
          <div className="shrink-0 text-right">
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50">
              Pmb: {pembimbingNama}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

PenempatanMobileCard.displayName = 'PenempatanMobileCard';
