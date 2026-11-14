import React from 'react';
import { Button, SearchableSelect } from '../../ui';
import { 
  UserCheck, 
  GraduationCap, 
  LayoutGrid, 
  Columns, 
  Rows, 
  Clock
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ViewMode, ToolMode, ColorByMode, GridOrientation } from './types';
import { DropdownOption } from '../../../api/dropdown.api';

interface Props {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  gridOrientation?: GridOrientation;
  setGridOrientation?: (g: GridOrientation) => void;
  toolMode: ToolMode;
  colorByMode: ColorByMode;
  setColorByMode: (m: ColorByMode) => void;
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  selectedGuruId: string;
  setSelectedGuruId: (id: string) => void;
  paintMapelId?: string;
  setPaintMapelId?: (id: string) => void;
  paintUnitId?: string;
  setPaintUnitId?: (id: string) => void;
  unitSelectOptions?: DropdownOption[];
  guruMapelSelectOptions?: DropdownOption[];
  masterGridHari: string;
  setMasterGridHari: (day: string) => void;
  kelasList: DropdownOption[];
  guruSelectOptions: DropdownOption[];
  keKelasSelectOptions: DropdownOption[];
  hariSekolah: string[];
  loadingData: boolean;
  onRefreshSchedules: () => void;
  showLeftPanel?: boolean;
  onToggleLeftPanel?: () => void;
  onOpenPrintPreview?: () => void;
}

export const JadwalBuilderHeader: React.FC<Props> = React.memo(({
  viewMode,
  setViewMode,
  gridOrientation = 'VERTICAL_HARI',
  setGridOrientation,
  toolMode,
  colorByMode,
  setColorByMode,
  selectedKelasId,
  setSelectedKelasId,
  selectedGuruId,
  setSelectedGuruId,
  paintMapelId,
  setPaintMapelId,
  paintUnitId,
  setPaintUnitId,
  unitSelectOptions = [],
  guruMapelSelectOptions = [],
  masterGridHari,
  setMasterGridHari,
  kelasList,
  guruSelectOptions,
  keKelasSelectOptions,
  hariSekolah,
  loadingData,
  onRefreshSchedules,
  showLeftPanel = true,
  onToggleLeftPanel,
  onOpenPrintPreview,
}) => {
  return (
    <div className="pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 space-y-3 relative z-20">
      {/* ── BARIS 1: NAVIGATION STUDIO TOOLBAR & ORIENTATION ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented View Switcher */}
          <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1 shadow-inner flex-wrap">
            <button
              onClick={() => setViewMode('GURU')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5",
                viewMode === 'GURU' 
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-900/5 font-black scale-[1.02]" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Per Guru</span>
            </button>
            <button
              onClick={() => setViewMode('KELAS')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5",
                viewMode === 'KELAS' 
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-900/5 font-black scale-[1.02]" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
              <span>Per Kelas</span>
            </button>
            <button
              onClick={() => setViewMode('MASTER_GURU')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5",
                viewMode === 'MASTER_GURU' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-black scale-[1.02]" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
              title="Tabel Raksasa 2D: Semua Guru vs Jam Pelajaran"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Master Grid Guru</span>
            </button>
            <button
              onClick={() => setViewMode('MASTER_KELAS')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5",
                viewMode === 'MASTER_KELAS' 
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 font-black scale-[1.02]" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
              title="Tabel Raksasa 2D: Semua Kelas vs Jam Pelajaran"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Master Grid Kelas</span>
            </button>
          </div>

          {/* Orientation Switcher */}
          {['KELAS', 'GURU'].includes(viewMode) && setGridOrientation && (
            <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setGridOrientation('VERTICAL_HARI')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5",
                  gridOrientation === 'VERTICAL_HARI'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-900/5 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
                title="Layout Hari Vertikal (Hari di Kolom Kiri, Jam Pelajaran di Baris Atas)"
              >
                <Rows className="w-3.5 h-3.5 text-indigo-500" />
                <span>Hari Vertikal</span>
              </button>
              <button
                type="button"
                onClick={() => setGridOrientation('HORIZONTAL_HARI')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5",
                  gridOrientation === 'HORIZONTAL_HARI'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-900/5 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
                title="Layout Hari Horizontal (Hari di Baris Atas, Jam Pelajaran di Kolom Kiri)"
              >
                <Columns className="w-3.5 h-3.5 text-indigo-500" />
                <span>Hari Horizontal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── BARIS 2: SLEEK FLOATING CONTROL PANEL (FILTER NAMA, MAPEL, KELAS) ── */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* LEVEL 1: GURU / KELAS SELECTOR */}
        {viewMode === 'GURU' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-black shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>GURU:</span>
            </div>
            <SearchableSelect
              value={selectedGuruId}
              onValueChange={setSelectedGuruId}
              options={guruSelectOptions}
              placeholder="Pilih Guru Pengampu..."
              searchPlaceholder="Cari Nama Guru..."
              className="w-[280px] md:w-[380px]"
            />
          </div>
        )}

        {viewMode === 'KELAS' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-black shrink-0 border border-purple-100 dark:border-purple-900/50">
              <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>KELAS:</span>
            </div>
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={setSelectedKelasId}
              options={kelasList}
              placeholder="Pilih Kelas Target..."
              searchPlaceholder="Cari Nama Kelas..."
              className="w-[240px] md:w-[320px]"
            />
          </div>
        )}

        {/* MASTER GRID HARI FILTER */}
        {(viewMode === 'MASTER_GURU' || viewMode === 'MASTER_KELAS') && (
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-black shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>FILTER HARI:</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex-wrap">
              <button
                onClick={() => setMasterGridHari('SEMUA')}
                className={cn(
                  "px-3 py-1 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1",
                  masterGridHari === 'SEMUA' 
                    ? "bg-indigo-600 text-white shadow-sm font-black scale-[1.02]" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
                title="Tampilkan Seluruh Hari (Senin - Sabtu) Mingguan Kontinu"
              >
                📅 SEMUA HARI
              </button>
              {hariSekolah?.map(d => (
                <button
                  key={d}
                  onClick={() => setMasterGridHari(d)}
                  className={cn(
                    "px-3 py-1 text-xs font-extrabold rounded-xl transition-all",
                    masterGridHari === d 
                      ? "bg-indigo-600 text-white shadow-sm font-black scale-[1.02]" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
