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

const formatCompanyName = (name?: string) => {
  if (!name) return '';
  return toTitleCase(name)
    .replace(/\bPt\b/gi, 'PT')
    .replace(/\bCv\b/gi, 'CV')
    .replace(/\bUd\b/gi, 'UD')
    .replace(/\bTbk\b/gi, 'Tbk')
    .replace(/\bBumn\b/gi, 'BUMN')
    .replace(/\bSmk\b/gi, 'SMK')
    .replace(/\bUptd\b/gi, 'UPTD');
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
  const hasPembimbing = Boolean(row.pembimbing_id && row.Pembimbing?.nama_guru);
  const pembimbingNama = hasPembimbing ? toTitleCase(row.Pembimbing?.nama_guru) : '';

  const studentName = toTitleCase(row.Siswa?.nama_siswa);
  const initial = studentName ? studentName.charAt(0).toUpperCase() : '?';

  return (
    <div
      key={row.id}
      className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5 w-full max-w-full min-w-0 transition-colors"
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
          <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 shrink-0 select-none">
            {initial}
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0 flex-1 flex-wrap">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 break-words leading-snug">
              {studentName}
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
      <div className="flex items-start justify-between gap-2 text-xs">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <Building2 size={13} className="text-indigo-500 shrink-0 mt-0.5" />
          {row.mitra_id ? (
            <button
              type="button"
              onClick={() => onEditMitraKontak(row.mitra_id)}
              className="break-words text-left hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer font-semibold text-xs text-slate-800 dark:text-slate-200 leading-snug"
              title="Klik untuk melihat / perbarui kontak & PIC DUDI"
            >
              {formatCompanyName(row.Mitra?.nama)}
            </button>
          ) : (
            <span className="break-words font-semibold text-xs text-slate-800 dark:text-slate-200 leading-snug">
              {formatCompanyName(row.Mitra?.nama)}
            </span>
          )}
        </div>

        {!hidePembimbing && (
          <div className="shrink-0 text-right">
            {hasPembimbing ? (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50 inline-flex items-center gap-1">
                Pmb: {pembimbingNama}
              </span>
            ) : canManage ? (
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-900/50 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="Klik untuk menugaskan guru pembimbing"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Pmb: Belum Ada</span>
              </button>
            ) : (
              <span className="text-[10px] font-medium text-amber-700/90 dark:text-amber-300/90 bg-amber-50/80 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Pmb: Belum Ada</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PenempatanMobileCard.displayName = 'PenempatanMobileCard';
