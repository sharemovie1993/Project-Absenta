import React from 'react';
import { Button, SearchableSelect } from '../../ui';
import { 
  RefreshCw, 
  PanelLeftClose, 
  PanelLeft, 
  UserCheck, 
  BookOpen, 
  GraduationCap, 
  LayoutGrid, 
  Columns, 
  Rows, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Printer
} from 'lucide-react';
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
            {onOpenPrintPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenPrintPreview('roster_teacher', selectedGuruId)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all rounded-xl shadow-xs"
                title="Cetak Berkas Jadwal Mengajar Guru Ini ke PDF"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span>🖨️ Cetak Berkas PDF</span>
              </Button>
            )}
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
            {onOpenPrintPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenPrintPreview('roster', selectedKelasId)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 dark:hover:text-purple-300 transition-all rounded-xl shadow-xs"
                title="Cetak Berkas Jadwal Kelas Ini ke PDF"
              >
                <Printer className="w-3.5 h-3.5 text-purple-500" />
                <span>🖨️ Cetak Berkas PDF</span>
              </Button>
            )}
          </div>
        )}

        {/* LEVEL 2: MAPEL CHIPS (MODERN SEGMENTED PILLS WITH STATUS BADGE) */}
        {viewMode === 'GURU' && guruMapelSelectOptions.length > 0 && setPaintMapelId && (
          <div className="flex items-start gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black shrink-0 border border-emerald-100 dark:border-emerald-900/50 mt-0.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>MAPEL:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {guruMapelSelectOptions.map((m: any) => {
                const isSelected = paintMapelId === m.value;
                const colorStyle = getMapelColor(m.label);
                const status = m.status || 'KOSONG';

                // Modern status-driven badge styling (boxy rounded-md)
                let badgeJsx = null;
                if (status === 'PAS') {
                  badgeJsx = (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-emerald-500 text-white shadow-xs">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{m.rightBadge || '✓ Pas'}</span>
                    </span>
                  );
                } else if (status === 'SISA' || status === 'KOSONG') {
                  badgeJsx = (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-amber-500 text-white shadow-md shadow-amber-500/30 animate-pulse">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{m.rightBadge || '0/2 JP'}</span>
                    </span>
                  );
                } else if (status === 'OVER') {
                  badgeJsx = (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-rose-500 text-white shadow-md shadow-rose-500/30">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>{m.rightBadge || '⚠️ Over'}</span>
                    </span>
                  );
                }

                const isPas = status === 'PAS';

                return (
                  <button
                    key={m.value}
                    type="button"
                    disabled={isPas}
                    onClick={() => !isPas && setPaintMapelId(m.value)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all duration-200 border flex items-center gap-2 shadow-xs group/chip",
                      isPas
                        ? "opacity-60 cursor-not-allowed bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-300/70 dark:border-emerald-800/50"
                        : isSelected
                        ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white border-slate-900 dark:border-indigo-600 shadow-md ring-2 ring-indigo-500/20 scale-[1.02]"
                        : "bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300"
                    )}
                    title={isPas ? `Alokasi ${m.label} sudah PAS (${m.rightBadge}). Sudah selesai.` : `Pilih Mata Pelajaran: ${m.label}`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ring-2 ring-white/50 dark:ring-slate-900/50"
                      style={{ backgroundColor: colorStyle.dotHex }}
                    />
                    <span className="tracking-wide">{m.label}</span>
                    {badgeJsx}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 3: KELAS TUJUAN (UNTUK PROCESS PAINTING) */}
        {viewMode === 'GURU' && toolMode === 'PAINT' && (
          <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-black shrink-0 border border-blue-100 dark:border-blue-900/50">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>KE KELAS:</span>
            </div>
            <SearchableSelect
              value={selectedKelasId}
              onValueChange={setSelectedKelasId}
              options={keKelasSelectOptions}
              placeholder="Pilih Kelas Tujuan Painting..."
              searchPlaceholder="Cari Kelas Tujuan..."
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
              {hariSekolah.map(d => (
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
};
