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
  <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 h-8 shrink-0">
    <button
      type="button"
      onClick={() => setViewMode('SUMMARY')}
      className={`px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap ${
        viewMode === 'SUMMARY'
          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      Akumulasi
    </button>
    <button
      type="button"
      onClick={() => setViewMode('MATRIX')}
      className={`px-2.5 py-1 text-[10px] rounded-md font-bold uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap ${
        viewMode === 'MATRIX'
          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      Per Hari
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
    <div className="space-y-2">
      {/* ─── Baris 1: Filter Induk (Tahun & Bulan) + Kontrol Aksi (Format & Ekspor) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
        {/* Kiri: Tahun Pelajaran & Bulan Laporan Inline */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-[200px]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
              📅 Thn:
            </span>
            <Suspense fallback={<SuspenseFallback />}>
              <SearchableSelect
                id="filter-tahun-mapel-select"
                aria-label="Pilih Tahun Pelajaran"
                value={tahunPelajaranId}
                onValueChange={setTahunPelajaranId}
                options={tahunOptions ?? []}
                placeholder="Pilih Tahun..."
                triggerClassName="h-8 rounded-lg bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs"
              />
            </Suspense>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
              🗓️ Bln:
            </span>
            <Input
              id="filter-bulan-mapel-input"
              aria-label="Pilih Bulan Laporan Mapel"
              type="month"
              value={bulan}
              onChange={e => setBulan(e.target.value)}
              className="h-8 w-36 rounded-lg bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs"
            />
          </div>
        </div>

        {/* Kanan: Sakelar Tampilan & Tombol Ekspor */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} compact />

          <div className="flex items-center gap-1.5">
            <Button
              onClick={onExportExcel}
              disabled={!canExport}
              title={exportTooltip}
              variant="outline"
              size="sm"
              className={`h-8 rounded-lg font-bold text-[9.5px] uppercase tracking-wider px-2.5 shadow-2xs transition-all ${
                canExport
                  ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850 text-slate-400'
              }`}
            >
              <FileText className="w-3 h-3 mr-1 text-emerald-600" /> Excel
            </Button>
            <Button
              onClick={onExportPdf}
              disabled={!canExport}
              title={exportTooltip}
              variant="outline"
              size="sm"
              className={`h-8 rounded-lg font-bold text-[9.5px] uppercase tracking-wider px-2.5 shadow-2xs transition-all ${
                canExport
                  ? 'border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850 text-slate-400'
              }`}
            >
              <Printer className="w-3 h-3 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Baris 2: Kartu Pilihan Mapel (Mini App-Launcher Cards) ─────────── */}
      <div className="flex items-stretch gap-1.5 overflow-x-auto py-1 no-scrollbar">
        {/* Tombol ALL untuk Manajemen (Kepsek/Kurikulum) */}
        {isManagement && (
          <button
            type="button"
            onClick={onSelectAll}
            className={`group shrink-0 flex flex-col items-center justify-center py-1.5 px-1 w-[70px] sm:w-[78px] rounded-xl border text-center transition-all ${
              isAllSelected
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400/40'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/40'
            }`}
          >
            <div className={`p-1 rounded-md mb-0.5 transition-transform ${isAllSelected ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-105'}`}>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-tight line-clamp-1 leading-tight">
              SEMUA
            </div>
            <div className={`text-[7.5px] sm:text-[8px] font-bold mt-0.5 line-clamp-1 leading-tight ${isAllSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
              (Supervisi)
            </div>
          </button>
        )}

        {/* Kartu Guru Mapel Pribadi (Mini Card Style) */}
        {cards.length > 0 ? (
          cards.map((card) => {
            const isActive = !isAllSelected && card.mapelId === mapelId && card.kelasId === kelasId;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectCard(card)}
                className={`group shrink-0 flex flex-col items-center justify-center py-1.5 px-1 w-[70px] sm:w-[78px] rounded-xl border text-center transition-all ${
                  isActive
                    ? 'bg-indigo-50/95 dark:bg-indigo-950/70 border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-500/40 shadow-xs font-black'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50 font-bold'
                }`}
              >
                <div className={`p-1 rounded-md mb-0.5 transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 group-hover:scale-105'
                }`}>
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-tight line-clamp-1 leading-tight">
                  {card.mapelName}
                </div>
                <div className={`text-[7.5px] sm:text-[8px] font-bold mt-0.5 line-clamp-1 leading-tight ${
                  isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  ({card.kelasName})
                </div>
              </button>
            );
          })
        ) : !isManagement ? (
          <div className="py-1.5 px-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 text-xs font-medium">
            Tidak ada jadwal mengajar pada tahun pelajaran ini.
          </div>
        ) : null}
      </div>

      {/* ─── Mode Supervisi ALL Kurikulum: Pilih Kelas ──► Klik Mapel ─────────── */}
      {isManagement && isAllSelected && (
        <div className="p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex flex-wrap items-center gap-2">
          {/* Langkah 1: Pilih Kelas */}
          <div className="flex items-center gap-1.5 min-w-[200px]">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black shrink-0">1</span>
            <Suspense fallback={<SuspenseFallback />}>
              <SearchableSelect
                id="filter-kelas-mapel-select"
                aria-label="Pilih Kelas"
                value={kelasId}
                onValueChange={setKelasId}
                options={kelasOptions ?? []}
                placeholder="Pilih Kelas..."
                triggerClassName="h-7.5 rounded-lg bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-xs font-bold shadow-2xs"
              />
            </Suspense>
          </div>

          {/* Langkah 2: Klik Mapel di Kelas Tersebut (Mini Cards) */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar py-0.5">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black shrink-0">2</span>
            {classMapelList.length > 0 ? (
              classMapelList.map((m) => {
                const isMapelActive = m.mapelId === mapelId;
                return (
                  <button
                    key={m.mapelId}
                    type="button"
                    onClick={() => setMapelId(m.mapelId)}
                    className={`group shrink-0 flex flex-col items-center justify-center py-1.5 px-1 w-[70px] sm:w-[78px] rounded-xl border text-center transition-all ${
                      isMapelActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-400/40 font-black'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 font-bold'
                    }`}
                  >
                    <div className={`p-1 rounded-md mb-0.5 transition-transform ${isMapelActive ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105'}`}>
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-tight line-clamp-1 leading-tight">
                      {m.mapelName}
                    </div>
                    {m.guruName && (
                      <div className={`text-[7.5px] font-normal mt-0.5 line-clamp-1 leading-tight ${isMapelActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                        ({m.guruName.split(',')[0]})
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 italic">Pilih kelas untuk melihat mapel</span>
            )}
          </div>
        </div>
      )}

    </div>
  );
});

