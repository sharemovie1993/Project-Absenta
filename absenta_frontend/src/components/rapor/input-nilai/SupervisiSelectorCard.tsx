import React, { memo } from 'react';
import { BarChart3, Info } from 'lucide-react';
import { SearchableSelect, SearchableSelectOption } from '../../ui/SearchableSelect';
import { AcademicYear, Semester } from '../../../types/cetakRapor.types';
import { ClassItem } from '../../../types/inputNilai.types';

export interface SupervisiSelectorCardProps {
  selectedKelas: string;
  onSelectKelas: (kelasId: string) => void;
  selectedMapel: string;
  onSelectMapel: (mapelId: string) => void;
  kelasOptions: SearchableSelectOption[];
  isLoadingClasses: boolean;
  smartMapelOptions: SearchableSelectOption[];
  isLoadingClassSubjects: boolean;
  selectedKelasObj?: ClassItem;
  activeYear: AcademicYear | null;
  activeSemester: Semester | null;
  onNavigateDashboard: () => void;
}

export const SupervisiSelectorCard: React.FC<SupervisiSelectorCardProps> = memo(({
  selectedKelas,
  onSelectKelas,
  selectedMapel,
  onSelectMapel,
  kelasOptions,
  isLoadingClasses,
  smartMapelOptions,
  isLoadingClassSubjects,
  selectedKelasObj,
  activeYear,
  activeSemester,
  onNavigateDashboard,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
          <div>
            <label htmlFor="supervisi-select-kelas" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Kelas Rombel:
            </label>
            <SearchableSelect
              id="supervisi-select-kelas"
              aria-label="Pilih kelas rombel supervisi"
              options={kelasOptions}
              value={selectedKelas}
              onValueChange={onSelectKelas}
              placeholder="-- Pilih Kelas --"
              isLoading={isLoadingClasses}
            />
          </div>

          <div>
            <label htmlFor="supervisi-select-mapel" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Mata Pelajaran:
            </label>
            <SearchableSelect
              id="supervisi-select-mapel"
              aria-label="Pilih mata pelajaran supervisi"
              options={smartMapelOptions}
              value={selectedMapel}
              onValueChange={onSelectMapel}
              placeholder={
                !selectedKelas
                  ? '⚠️ Pilih Kelas dahulu'
                  : isLoadingClassSubjects
                  ? 'Memuat mapel...'
                  : smartMapelOptions.length === 0
                  ? 'Tidak ada mapel terjadwal'
                  : '-- Pilih Mata Pelajaran --'
              }
              disabled={!selectedKelas || isLoadingClassSubjects}
              isLoading={isLoadingClassSubjects}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            title="Buka Dashboard Monitoring Rapor"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Dashboard Monitoring</span>
          </button>
        </div>
      </div>

      {/* Alert jika belum ada Jadwal KBM pada TP / Semester terpilih */}
      {selectedKelas && !isLoadingClassSubjects && smartMapelOptions.length === 0 && (
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            Rombel <strong>{selectedKelasObj?.nama_kelas || 'Kelas'}</strong> belum memiliki jadwal KBM untuk <strong>{activeYear?.nama || 'TP Aktif'} • {activeSemester?.nama || 'Semester Aktif'}</strong>.
          </p>
        </div>
      )}
    </div>
  );
});

SupervisiSelectorCard.displayName = 'SupervisiSelectorCard';
