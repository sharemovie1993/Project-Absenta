import React from 'react';
import { Button, SearchableSelect } from '../../ui';
import { RefreshCw, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ViewMode, ToolMode, ColorByMode } from './types';
import { DropdownOption } from '../../../api/dropdown.api';

interface Props {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  toolMode: ToolMode;
  colorByMode: ColorByMode;
  setColorByMode: (m: ColorByMode) => void;
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  selectedGuruId: string;
  setSelectedGuruId: (id: string) => void;
  paintMapelId?: string;
  setPaintMapelId?: (id: string) => void;
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

export const JadwalBuilderHeader: React.FC<Props> = ({
  viewMode,
  setViewMode,
  toolMode,
  colorByMode,
  setColorByMode,
  selectedKelasId,
  setSelectedKelasId,
  selectedGuruId,
  setSelectedGuruId,
  paintMapelId,
  setPaintMapelId,
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
    <div className="pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 relative z-20">
      <div className="flex items-center gap-2 flex-wrap">
        {/* View Switcher with all 4 aSC TimeTables view modes */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setViewMode('GURU')}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
              viewMode === 'GURU' 
                ? "bg-white dark:bg-slate-900 text-purple-600 shadow-sm font-extrabold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            👨‍🏫 Per Guru
          </button>
          <button
            onClick={() => setViewMode('KELAS')}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
              viewMode === 'KELAS' 
                ? "bg-white dark:bg-slate-900 text-purple-600 shadow-sm font-extrabold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            🏫 Per Kelas
          </button>
          <button
            onClick={() => setViewMode('MASTER_GURU')}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
              viewMode === 'MASTER_GURU' 
                ? "bg-purple-600 text-white shadow-sm font-extrabold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
            title="Tabel Raksasa 2D: Semua Guru vs Jam Pelajaran"
          >
            🗺️ Master Grid Guru
          </button>
          <button
            onClick={() => setViewMode('MASTER_KELAS')}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
              viewMode === 'MASTER_KELAS' 
                ? "bg-indigo-600 text-white shadow-sm font-extrabold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
            title="Tabel Raksasa 2D: Semua Kelas vs Jam Pelajaran"
          >
            📊 Master Grid Kelas
          </button>
        </div>

        {/* Dynamic Filter Dropdown / Day Selector */}
        {viewMode === 'KELAS' && (
          <SearchableSelect
            value={selectedKelasId}
            onValueChange={setSelectedKelasId}
            options={kelasList}
            placeholder="Pilih Kelas..."
            searchPlaceholder="Cari Kelas..."
            className="w-[180px] md:w-[220px]"
          />
        )}
        {viewMode === 'GURU' && (
          <>
            <SearchableSelect
              value={selectedGuruId}
              onValueChange={setSelectedGuruId}
              options={guruSelectOptions}
              placeholder="Pilih Guru..."
              searchPlaceholder="Cari Guru..."
              className="w-[240px] md:w-[320px]"
            />
            {guruMapelSelectOptions.length > 0 && setPaintMapelId && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-450 font-bold shrink-0">Mapel:</span>
                <SearchableSelect
                  value={paintMapelId || ''}
                  onValueChange={setPaintMapelId}
                  options={guruMapelSelectOptions}
                  placeholder="Pilih Mapel..."
                  searchPlaceholder="Cari Mapel..."
                  className="w-[160px] md:w-[220px]"
                />
              </div>
            )}
          </>
        )}
        {(viewMode === 'MASTER_GURU' || viewMode === 'MASTER_KELAS') && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
            <span className="text-[10px] font-black text-slate-500 uppercase px-1.5">Hari:</span>
            <button
              onClick={() => setMasterGridHari('SEMUA')}
              className={cn(
                "px-2 py-0.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1",
                masterGridHari === 'SEMUA' 
                  ? "bg-purple-600 text-white shadow-sm font-extrabold" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
              title="Tampilkan Seluruh Hari (Senin - Sabtu) Mingguan Kontinu"
            >
              📅 SEMUA HARI
            </button>
            {hariSekolah.map(d => (
              <button
                key={d}
                onClick={() => setMasterGridHari(d)}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-extrabold rounded-lg transition-all",
                  masterGridHari === d 
                    ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Extra Kelas filter for Guru View to direct painting */}
        {viewMode === 'GURU' && toolMode === 'PAINT' && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-450 font-bold shrink-0">Ke Kelas:</span>
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={setSelectedKelasId}
              options={keKelasSelectOptions}
              placeholder="Pilih Kelas..."
              searchPlaceholder="Cari Kelas..."
              className="w-[180px] md:w-[240px]"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap ml-auto">
        {onOpenPrintPreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const isTeacher = ['GURU', 'MASTER_GURU'].includes(viewMode);
              onOpenPrintPreview(isTeacher ? 'roster_teacher' : 'roster', isTeacher ? selectedGuruId : selectedKelasId);
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-black border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-all shadow-sm"
            title="Buka Pratinjau Cetak & Dokumen PDF Jadwal Pelajaran"
          >
            <span>🖨️ Pratinjau & Cetak PDF</span>
          </Button>
        )}

        {onToggleLeftPanel && (
          <Button
            variant={showLeftPanel ? "outline" : "primary"}
            size="sm"
            onClick={onToggleLeftPanel}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-all",
              !showLeftPanel 
                ? "bg-indigo-600 text-white shadow-md border-none font-extrabold" 
                : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            )}
            title={showLeftPanel ? "Sembunyikan Panel Kiri (Toolbox & Kartu) untuk Melebarkan Tabel ke 100%" : "Tampilkan kembali Panel Kiri (Toolbox & Kartu)"}
          >
            {showLeftPanel ? <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" /> : <PanelLeft className="w-3.5 h-3.5" />}
            <span>{showLeftPanel ? "Sembunyikan Toolbox" : "🛠️ Toolbox"}</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshSchedules}
          disabled={loadingData}
          className="p-1.5 border-slate-200 dark:border-slate-800"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", loadingData && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
};
