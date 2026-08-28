import React, { Suspense, lazy } from 'react';
import { Button, Input } from '../../ui';
import { FileText, Printer, BookOpen, Layers } from 'lucide-react';
import type { DropdownOption } from '../../../api/dropdown.api';
import type { ViewMode } from './types';

const SearchableSelect = lazy(() =>
  import('../../ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);

export interface MapelClassCard {
  id: string;
  mapelId: string;
  mapelName: string;
  kelasId: string;
  kelasName: string;
}

export interface ClassMapelItem {
  mapelId: string;
  mapelName: string;
  guruName?: string;
}

interface RekapBulananMapelToolbarProps {
  kelasId: string;
  mapelId: string;
  bulan: string;
  tahunPelajaranId: string;
  viewMode: ViewMode;
  isManagement: boolean;
  isAllSelected: boolean;
  cards: MapelClassCard[];
  classMapelList: ClassMapelItem[];
  kelasOptions: DropdownOption[];
  mapelOptions: DropdownOption[];
  tahunOptions: DropdownOption[];
  selectedMapelLabel: string;
  selectedKelasLabel: string;
  totalSesi: number;
  hasData?: boolean;
  setKelasId: (v: string) => void;
  setMapelId: (v: string) => void;
  setBulan: (v: string) => void;
  setTahunPelajaranId: (v: string) => void;
  setViewMode: (v: ViewMode) => void;
  onSelectCard: (card: MapelClassCard) => void;
  onSelectAll: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

const ViewModeSwitcher = ({
  viewMode,
  setViewMode,
  compact = false,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  compact?: boolean;
}) => (
  <div className={`flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${compact ? 'h-10' : ''}`}>
    <button
      type="button"
      onClick={() => setViewMode('SUMMARY')}
      className={`${compact ? 'flex-1 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]'} rounded-lg font-black uppercase tracking-wider transition-all ${
        viewMode === 'SUMMARY'
          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {compact ? 'Akumulasi' : '📊 Total Akumulasi'}
    </button>
    <button
      type="button"
      onClick={() => setViewMode('MATRIX')}
      className={`${compact ? 'flex-1 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]'} rounded-lg font-black uppercase tracking-wider transition-all ${
        viewMode === 'MATRIX'
          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {compact ? 'Per Hari' : '📅 Detail Per Hari'}
    </button>
  </div>
);

const SuspenseFallback = () => (
  <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
);

export const RekapBulananMapelToolbar = React.memo(function RekapBulananMapelToolbar({
  kelasId,
  mapelId,
  bulan,
  tahunPelajaranId,
  viewMode,
  isManagement,
  isAllSelected,
  cards,
  classMapelList,
  kelasOptions,
  mapelOptions,
  tahunOptions,
  selectedMapelLabel,
  selectedKelasLabel,
  totalSesi,
  hasData = false,
  setKelasId,
  setMapelId,
  setBulan,
  setTahunPelajaranId,
  setViewMode,
  onSelectCard,
  onSelectAll,
  onExportExcel,
  onExportPdf,
}: RekapBulananMapelToolbarProps) {
  const canExport = Boolean(mapelId && kelasId && hasData);
  const exportTooltip = !mapelId || !kelasId
    ? "Pilih mata pelajaran dan kelas terlebih dahulu untuk mengekspor"
    : !hasData
      ? "Tidak ada data presensi pada periode ini untuk diekspor"
      : undefined;

  return (
    <div className="space-y-3.5">
      {/* ─── 1. KONTEKS GLOBAL: Tahun Pelajaran & Bulan Laporan ───────────────── */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="space-y-1">
          <label htmlFor="filter-tahun-mapel-select" className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
            📅 1. Tahun Pelajaran (Konteks Induk)
          </label>
          <Suspense fallback={<SuspenseFallback />}>
            <SearchableSelect
              id="filter-tahun-mapel-select"
              aria-label="Pilih Tahun Pelajaran"
              value={tahunPelajaranId}
              onValueChange={setTahunPelajaranId}
              options={tahunOptions ?? []}
              placeholder="Pilih Tahun Pelajaran..."
              triggerClassName="h-9.5 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold shadow-2xs"
            />
          </Suspense>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-bulan-mapel-input" className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
            🗓️ 2. Bulan Laporan
          </label>
          <Input
            id="filter-bulan-mapel-input"
            aria-label="Pilih Bulan Laporan Mapel"
            type="month"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="h-9.5 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold shadow-2xs"
          />
        </div>
      </div>

      {/* ─── 2. OBJEK KBM: Pemilihan Mapel & Kelas ───────────────────────────── */}
      <div className="space-y-1">
        <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 ml-1">
          3. Pilih Mata Pelajaran &amp; Kelas
        </label>
        <div className="flex flex-wrap items-stretch gap-1.5">
          {/* Tombol ALL untuk Manajemen (Kepsek/Kurikulum) */}
          {isManagement && (
            <button
              type="button"
              onClick={onSelectAll}
              className={`group flex flex-col items-center justify-center py-2 px-1.5 w-[76px] sm:w-[84px] rounded-xl border text-center transition-all ${
                isAllSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-400/40'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
              }`}
            >
              <div className={`p-1.5 rounded-lg mb-1 transition-transform ${isAllSelected ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-105'}`}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="text-[9.5px] font-black uppercase tracking-tight line-clamp-1 leading-tight">
                SEMUA
              </div>
              <div className={`text-[8px] font-bold mt-0.5 line-clamp-1 leading-tight ${isAllSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                (Supervisi)
              </div>
            </button>
          )}

          {/* Kartu Tombol Guru Mapel Pribadi (App-Launcher Style) */}
          {cards.length > 0 ? (
            cards.map((card) => {
              const isActive = !isAllSelected && card.mapelId === mapelId && card.kelasId === kelasId;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelectCard(card)}
                  className={`group flex flex-col items-center justify-center py-2 px-1.5 w-[76px] sm:w-[84px] rounded-xl border text-center transition-all ${
                    isActive
                      ? 'bg-indigo-50/95 dark:bg-indigo-950/70 border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mb-1 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 group-hover:scale-105'
                  }`}>
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[9.5px] font-black uppercase tracking-tight line-clamp-1 leading-tight">
                    {card.mapelName}
                  </div>
                  <div className={`text-[8px] font-bold mt-0.5 line-clamp-1 leading-tight ${
                    isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    ({card.kelasName})
                  </div>
                </button>
              );
            })
          ) : !isManagement ? (
            <div className="py-2 px-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 text-xs font-medium">
              Tidak ada jadwal mengajar pada tahun pelajaran ini.
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── Mode Supervisi ALL Kurikulum: Pilih Kelas ──► Klik Mapel ─────────── */}
      {isManagement && isAllSelected && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5 shadow-xs">
          {/* Langkah 1: Pilih Kelas */}
          <div className="max-w-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black">1</span>
              <label htmlFor="filter-kelas-mapel-select" className="text-[10px] font-black uppercase tracking-wider text-blue-950 dark:text-blue-200">
                Langkah 1: Pilih Kelas
              </label>
            </div>
            <Suspense fallback={<SuspenseFallback />}>
              <SearchableSelect
                id="filter-kelas-mapel-select"
                aria-label="Pilih Kelas"
                value={kelasId}
                onValueChange={setKelasId}
                options={kelasOptions ?? []}
                placeholder="Pilih Kelas..."
                triggerClassName="h-8.5 rounded-lg bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-[11px] font-bold shadow-xs"
              />
            </Suspense>
          </div>

          {/* Langkah 2: Klik Tombol Mapel yang Ada di Kelas Tersebut (App-Launcher Grid) */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black">2</span>
              <label className="text-[10px] font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                Langkah 2: Klik Mapel di {selectedKelasLabel || 'Kelas Terpilih'}
              </label>
            </div>
            {classMapelList.length > 0 ? (
              <div className="flex flex-wrap items-stretch gap-1.5 pt-0.5">
                {classMapelList.map((m) => {
                  const isMapelActive = m.mapelId === mapelId;
                  return (
                    <button
                      key={m.mapelId}
                      type="button"
                      onClick={() => setMapelId(m.mapelId)}
                      className={`group flex flex-col items-center justify-center py-2 px-1.5 w-[76px] sm:w-[84px] rounded-xl border text-center transition-all ${
                        isMapelActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-400/40'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30'
                      }`}
                    >
                      <div className={`p-1 rounded-lg mb-1 transition-transform ${isMapelActive ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105'}`}>
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-[9.5px] font-black uppercase tracking-tight line-clamp-2 leading-tight">
                        {m.mapelName}
                      </div>
                      {m.guruName && (
                        <div className={`text-[7.5px] font-semibold mt-0.5 line-clamp-1 leading-tight ${isMapelActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {m.guruName.split(',')[0]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                Silakan pilih kelas terlebih dahulu untuk melihat daftar mata pelajaran.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. STATUS KBM & KONTROL OUTPUT / EKSPOR ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Status Sesi KBM Terpilih */}
        {(selectedMapelLabel || selectedKelasLabel) ? (
          <div className="flex flex-wrap items-center gap-2.5 px-3.5 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 text-xs flex-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-tight">
                📚 {selectedMapelLabel || 'Mata Pelajaran'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Kelas: {selectedKelasLabel || '—'}
              </span>
            </div>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-[11px] ml-auto">
              {totalSesi} Sesi KBM Terlaksana
            </span>
          </div>
        ) : <div className="flex-1" />}

        {/* Format Tabel & Tombol Ekspor */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} compact />

          <div className="flex items-center gap-1.5">
            <Button
              onClick={onExportExcel}
              disabled={!canExport}
              title={exportTooltip}
              variant="outline"
              size="sm"
              className={`h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-3 shadow-2xs transition-all ${
                canExport
                  ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850 text-slate-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Excel
            </Button>
            <Button
              onClick={onExportPdf}
              disabled={!canExport}
              title={exportTooltip}
              variant="outline"
              size="sm"
              className={`h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-3 shadow-2xs transition-all ${
                canExport
                  ? 'border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850 text-slate-400'
              }`}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

