import React from 'react';
import { Card, Button, SearchableSelect } from '../../ui';
import { Calendar, Users, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ViewMode, ToolMode } from './types';
import { DropdownOption } from '../../../api/dropdown.api';

interface Props {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  toolMode: ToolMode;
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  selectedGuruId: string;
  setSelectedGuruId: (id: string) => void;
  masterGridHari: string;
  setMasterGridHari: (day: string) => void;
  kelasList: DropdownOption[];
  guruSelectOptions: DropdownOption[];
  keKelasSelectOptions: DropdownOption[];
  hariSekolah: string[];
  loadingData: boolean;
  onRefreshSchedules: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const JadwalBuilderHeader: React.FC<Props> = ({
  viewMode,
  setViewMode,
  toolMode,
  selectedKelasId,
  setSelectedKelasId,
  selectedGuruId,
  setSelectedGuruId,
  masterGridHari,
  setMasterGridHari,
  kelasList,
  guruSelectOptions,
  keKelasSelectOptions,
  hariSekolah,
  loadingData,
  onRefreshSchedules,
  onOpenBebanModal,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  return (
    <Card className="p-4 border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 relative z-20 !overflow-visible">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-purple-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Visual Grid Timetable</h3>
          <p className="text-xs text-slate-500">Tampilkan jadwal KBM aktif untuk penempatan.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* View Switcher with all 4 aSC TimeTables view modes */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setViewMode('KELAS')}
            className={cn(
              "px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
              viewMode === 'KELAS' 
                ? "bg-white dark:bg-slate-900 text-purple-600 shadow-sm font-extrabold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            🏫 Per Kelas
          </button>
          <button
            onClick={() => setViewMode('GURU')}
            className={cn(
              "px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
              viewMode === 'GURU' 
                ? "bg-white dark:bg-slate-900 text-purple-600 shadow-sm font-extrabold" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            👨‍🏫 Per Guru
          </button>
          <button
            onClick={() => setViewMode('MASTER_GURU')}
            className={cn(
              "px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
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
              "px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
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
            className="w-[180px] md:w-[240px]"
          />
        )}
        {viewMode === 'GURU' && (
          <SearchableSelect
            value={selectedGuruId}
            onValueChange={setSelectedGuruId}
            options={guruSelectOptions}
            placeholder="Pilih Guru..."
            searchPlaceholder="Cari Guru..."
            className="w-[240px] md:w-[320px]"
          />
        )}
        {(viewMode === 'MASTER_GURU' || viewMode === 'MASTER_KELAS') && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
            <span className="text-[10px] font-black text-slate-500 uppercase px-1.5">Hari:</span>
            <button
              onClick={() => setMasterGridHari('SEMUA')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1",
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
                  "px-2 py-1 text-[11px] font-extrabold rounded-lg transition-all",
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
              className="w-[150px] md:w-[180px]"
            />
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenBebanModal}
          className="flex items-center gap-1.5 px-3 py-2 border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350"
          title="Statistik Beban Mengajar Guru"
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Beban JP Guru</span>
        </Button>

        {onToggleFocusMode && (
          <Button
            variant={isFocusMode ? "primary" : "outline"}
            size="sm"
            onClick={onToggleFocusMode}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all",
              isFocusMode
                ? "bg-purple-600 text-white shadow-md border-none font-extrabold"
                : "border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            )}
            title={isFocusMode ? "Keluar dari Mode Fokus Layar Penuh (Esc)" : "Masuk ke Mode Fokus Layar Penuh Bebas Gangguan"}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFocusMode ? "Keluar Fokus" : "Mode Fokus"}</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshSchedules}
          disabled={loadingData}
          className="p-2 border-slate-200 dark:border-slate-800"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", loadingData && "animate-spin")} />
        </Button>
      </div>
    </Card>
  );
};
