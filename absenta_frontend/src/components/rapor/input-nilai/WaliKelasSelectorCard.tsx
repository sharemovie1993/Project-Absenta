import React, { memo } from 'react';
import { UserCheck, Printer, Sparkles, Info } from 'lucide-react';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';
import { Badge } from '../../ui/Badge';
import { AcademicYear, Semester } from '../../../types/cetakRapor.types';

export interface WaliKelasSelectorCardProps {
  waliKelasNama: string;
  waliKelasId: string | null;
  selectedMapel: string;
  onSelectMapel: (mapelId: string) => void;
  smartMapelOptions: SearchableSelectOption[];
  isLoadingClassSubjects: boolean;
  tampilkanKokurikuler: boolean;
  activeYear: AcademicYear | null;
  activeSemester: Semester | null;
  onNavigateCetak: () => void;
}

export const WaliKelasSelectorCard: React.FC<WaliKelasSelectorCardProps> = memo(({
  waliKelasNama,
  waliKelasId,
  selectedMapel,
  onSelectMapel,
  smartMapelOptions,
  isLoadingClassSubjects,
  tampilkanKokurikuler,
  activeYear,
  activeSemester,
  onNavigateCetak,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-blue-100 dark:border-blue-950/60 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1 max-w-xl">
          <label htmlFor="walikelas-select-mapel" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Mata Pelajaran di Kelas {waliKelasNama}:
          </label>
          <SearchableSelect
            id="walikelas-select-mapel"
            aria-label="Pilih mata pelajaran kelas binaan"
            options={smartMapelOptions}
            value={selectedMapel}
            onValueChange={onSelectMapel}
            placeholder={
              isLoadingClassSubjects
                ? 'Memuat mata pelajaran...'
                : smartMapelOptions.length === 0
                ? 'Tidak ada mapel terjadwal di kelas ini'
                : '-- Pilih Mata Pelajaran --'
            }
            disabled={!waliKelasId || isLoadingClassSubjects}
            isLoading={isLoadingClassSubjects}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={onNavigateCetak}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Buka Lembar Pengisian Catatan Rapor & Kokurikuler Siswa"
          >
            <UserCheck size={14} />
            <span>{tampilkanKokurikuler ? 'Isi Catatan & Kokurikuler' : 'Isi Catatan Rapor'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateCetak}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/60 dark:border-indigo-800 transition-all cursor-pointer"
            title="Buka Leger & Cetak Rapor"
          >
            <Printer size={14} />
            <span>Leger &amp; Cetak Rapor</span>
          </button>
        </div>
      </div>

      {/* Panduan Kelengkapan Rapor Wali Kelas (Hormat pada Saklar Kokurikuler) */}
      <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start justify-between gap-3 text-xs">
        <div className="flex items-start gap-2 text-indigo-950 dark:text-indigo-200">
          <Sparkles size={15} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold">Kelengkapan Rapor Kelas Binaan:</span>{' '}
            {tampilkanKokurikuler
              ? 'Selain nilai mapel, Anda bertugas mengisi Presensi, Catatan Wali Kelas, dan Evaluasi Kokurikuler (Pembiasaan Pagi). Klik tombol di atas untuk mengisi.'
              : 'Selain nilai mapel, Anda bertugas mengisi Presensi & Catatan Wali Kelas (Evaluasi kokurikuler dinonaktifkan pada pengaturan dokumen tahun ajaran ini).'}
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] font-bold border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shrink-0">
          {tampilkanKokurikuler ? 'Kokurikuler: Aktif' : 'Kokurikuler: Nonaktif'}
        </Badge>
      </div>

      {/* Alert jika belum ada Jadwal KBM pada TP / Semester terpilih */}
      {selectedMapel && !isLoadingClassSubjects && smartMapelOptions.length === 0 && (
        <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
          <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300">
            Kelas binaan <strong>{waliKelasNama}</strong> belum memiliki jadwal KBM pada <strong>{activeYear?.nama || 'TP Aktif'} • {activeSemester?.nama || 'Semester Aktif'}</strong>.
          </p>
        </div>
      )}
    </div>
  );
});

WaliKelasSelectorCard.displayName = 'WaliKelasSelectorCard';
