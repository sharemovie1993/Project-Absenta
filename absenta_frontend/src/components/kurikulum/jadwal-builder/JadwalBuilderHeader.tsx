import React from 'react';
import { Button, SearchableSelect } from '../../ui';
import { RefreshCw, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ViewMode, ToolMode, ColorByMode, GridOrientation } from './types';
import { DropdownOption } from '../../../api/dropdown.api';
import { getMapelColor } from '../../../utils/mapelColorHelper';

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
      {/* ── BARIS 1: TOOLBAR & SWITCHER ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher */}
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

          {/* Orientation Switcher */}
          {['KELAS', 'GURU'].includes(viewMode) && setGridOrientation && (
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGridOrientation('VERTICAL_HARI')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
                  gridOrientation === 'VERTICAL_HARI'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
                title="Layout Hari Vertikal (Hari di Kolom Kiri, Jam Pelajaran di Baris Atas)"
              >
                📅 Hari Vertikal
              </button>
              <button
                type="button"
                onClick={() => setGridOrientation('HORIZONTAL_HARI')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1",
                  gridOrientation === 'HORIZONTAL_HARI'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
                title="Layout Hari Horizontal (Hari di Baris Atas, Jam Pelajaran di Kolom Kiri)"
              >
                🗓️ Hari Horizontal
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
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

      {/* ── BARIS 2: KONTROL FILTER (NAMA, MAPEL, KELAS TERPISAH PER BARIS) ── */}
      <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
        {/* BARIS 1 (ENTER): NAMA GURU ATAU NAMA KELAS */}
        {viewMode === 'GURU' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-24 shrink-0 uppercase tracking-wider">
              NAMA GURU:
            </span>
            <SearchableSelect
              value={selectedGuruId}
              onValueChange={setSelectedGuruId}
              options={guruSelectOptions}
              placeholder="Pilih Guru..."
              searchPlaceholder="Cari Guru..."
              className="w-[280px] md:w-[360px]"
            />
          </div>
        )}

        {viewMode === 'KELAS' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-24 shrink-0 uppercase tracking-wider">
              NAMA KELAS:
            </span>
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={setSelectedKelasId}
              options={kelasList}
              placeholder="Pilih Kelas..."
              searchPlaceholder="Cari Kelas..."
              className="w-[220px] md:w-[280px]"
            />
          </div>
        )}

        {/* BARIS 2 (ENTER): MATA PELAJARAN PENGAMPU (DITAMPILKAN TERBUKA DENGAN HASIL KALKULASI JP) */}
        {viewMode === 'GURU' && guruMapelSelectOptions.length > 0 && setPaintMapelId && (
          <div className="flex items-start gap-2.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex-wrap">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-24 shrink-0 uppercase tracking-wider pt-1">
              MAPEL:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {guruMapelSelectOptions.map((m: any) => {
                const isSelected = paintMapelId === m.value;
                const colorStyle = getMapelColor(m.label);
                const status = m.status || 'KOSONG';

                // Status Theme styling for button container when NOT selected
                let statusButtonTheme = "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700";
                if (status === 'PAS') {
                  statusButtonTheme = "bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/70";
                } else if (status === 'SISA' || status === 'KOSONG') {
                  statusButtonTheme = "bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 shadow-xs hover:bg-amber-100";
                } else if (status === 'OVER') {
                  statusButtonTheme = "bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-700 hover:bg-rose-100";
                }

                // Status Theme styling for badge when NOT selected
                let statusBadgeTheme = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold";
                if (status === 'PAS') {
                  statusBadgeTheme = "bg-emerald-600 text-white font-extrabold shadow-xs";
                } else if (status === 'SISA' || status === 'KOSONG') {
                  statusBadgeTheme = "bg-amber-500 text-white font-black shadow-sm ring-1 ring-amber-300 dark:ring-amber-600";
                } else if (status === 'OVER') {
                  statusBadgeTheme = "bg-rose-600 text-white font-black shadow-sm ring-1 ring-rose-300 dark:ring-rose-600";
                }

                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaintMapelId(m.value)}
                    className={cn(
                      "px-3 py-1 text-xs font-extrabold rounded-xl transition-all border flex items-center gap-1.5 shadow-sm",
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300 dark:ring-indigo-800 scale-105"
                        : statusButtonTheme
                    )}
                    title={`Pilih ${m.label} ${m.rightBadge ? `(${m.rightBadge})` : ''}`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: colorStyle.dotHex }}
                    />
                    <span>{m.label}</span>
                    {m.rightBadge && (
                      <span
                        className={cn(
                          "text-[9.5px] px-1.5 py-0.5 rounded-md shrink-0 ml-0.5 leading-none transition-colors",
                          isSelected
                            ? "bg-white/20 text-white font-black"
                            : statusBadgeTheme
                        )}
                      >
                        {m.rightBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BARIS 3 (ENTER): KELAS TUJUAN (UNTUK PROSES PAINTING) */}
        {viewMode === 'GURU' && toolMode === 'PAINT' && (
          <div className="flex items-center gap-2.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex-wrap">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-24 shrink-0 uppercase tracking-wider">
              KE KELAS:
            </span>
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={setSelectedKelasId}
              options={keKelasSelectOptions}
              placeholder="Pilih Kelas Tujuan..."
              searchPlaceholder="Cari Kelas Tujuan..."
              className="w-[220px] md:w-[280px]"
            />
          </div>
        )}

        {/* MASTER GRID HARI FILTER */}
        {(viewMode === 'MASTER_GURU' || viewMode === 'MASTER_KELAS') && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              FILTER HARI:
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
              <button
                onClick={() => setMasterGridHari('SEMUA')}
                className={cn(
                  "px-2.5 py-0.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1",
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
                    "px-2.5 py-0.5 text-xs font-extrabold rounded-lg transition-all",
                    masterGridHari === d 
                      ? "bg-indigo-600 text-white shadow-sm font-extrabold" 
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
};
