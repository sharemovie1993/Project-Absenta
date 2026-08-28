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

interface RekapBulananMapelToolbarProps {
  kelasId: string;
  mapelId: string;
  bulan: string;
  tahunPelajaranId: string;
  viewMode: ViewMode;
  isManagement: boolean;
  isAllSelected: boolean;
  cards: MapelClassCard[];
  kelasOptions: DropdownOption[];
  mapelOptions: DropdownOption[];
  tahunOptions: DropdownOption[];
  selectedMapelLabel: string;
  selectedKelasLabel: string;
  totalSesi: number;
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
  kelasOptions,
  mapelOptions,
  tahunOptions,
  selectedMapelLabel,
  selectedKelasLabel,
  totalSesi,
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
  return (
    <div className="space-y-4">
      {/* ─── Tombol Kartu Pilihan Mapel & Kelas ─────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          Pilih Mata Pelajaran &amp; Kelas
        </label>
        <div className="flex flex-wrap items-stretch gap-2.5">
          {/* Tombol ALL untuk Manajemen (Kepsek/Kurikulum) */}
          {isManagement && (
            <button
              type="button"
              onClick={onSelectAll}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-left transition-all ${
                isAllSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
              }`}
            >
              <div className={`p-2 rounded-xl ${isAllSelected ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'}`}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider">SEMUA MAPEL (ALL)</div>
                <div className={`text-[10px] font-bold ${isAllSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                  Mode Kurikulum &amp; Manajemen
                </div>
              </div>
            </button>
          )}

          {/* Kartu Tombol Guru Mapel (Icon Buku Terbuka) */}
          {cards.map((card) => {
            const isActive = !isAllSelected && card.mapelId === mapelId && card.kelasId === kelasId;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectCard(card)}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-left transition-all ${
                  isActive
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/10'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-tight leading-tight">
                    {card.mapelName}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    ({card.kelasName})
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Dropdown Pilihan Bebas (Khusus Mode Manajemen / ALL) ──────────────── */}
      {isManagement && isAllSelected && (
        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="filter-mapel-select" className="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-300 ml-1">
              Pilih Mata Pelajaran (Supervisi)
            </label>
            <Suspense fallback={<SuspenseFallback />}>
              <SearchableSelect
                id="filter-mapel-select"
                aria-label="Pilih Mata Pelajaran"
                value={mapelId}
                onValueChange={setMapelId}
                options={mapelOptions ?? []}
                placeholder="Pilih Mata Pelajaran..."
                triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
              />
            </Suspense>
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-kelas-mapel-select" className="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-300 ml-1">
              Pilih Kelas (Supervisi)
            </label>
            <Suspense fallback={<SuspenseFallback />}>
              <SearchableSelect
                id="filter-kelas-mapel-select"
                aria-label="Pilih Kelas Laporan Mapel"
                value={kelasId}
                onValueChange={setKelasId}
                options={kelasOptions ?? []}
                placeholder="Pilih Kelas..."
                triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* ─── Top Banner Info ─────────────────────────────────────────────────── */}
      {(selectedMapelLabel || selectedKelasLabel) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight">
              📚 {selectedMapelLabel || 'Mata Pelajaran'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Kelas: {selectedKelasLabel || '—'}
            </span>
          </div>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-[11px]">
            {totalSesi} Sesi KBM Terlaksana
          </span>
        </div>
      )}

      {/* ─── Filter Bulan, Tahun & Ekspor ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div className="space-y-1.5">
          <label htmlFor="filter-bulan-mapel-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
            Bulan Laporan
          </label>
          <Input
            id="filter-bulan-mapel-input"
            aria-label="Pilih Bulan Laporan Mapel"
            type="month"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-tahun-mapel-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
            Tahun Pelajaran
          </label>
          <Suspense fallback={<SuspenseFallback />}>
            <SearchableSelect
              id="filter-tahun-mapel-select"
              aria-label="Pilih Tahun Pelajaran"
              value={tahunPelajaranId}
              onValueChange={setTahunPelajaranId}
              options={tahunOptions ?? []}
              placeholder="Pilih Tahun..."
              triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
            />
          </Suspense>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
            Tampilan Tabel
          </label>
          <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} compact />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onExportExcel}
            variant="outline"
            size="sm"
            className="h-10 flex-1 rounded-xl font-bold text-[10px] uppercase tracking-widest px-3 border-slate-200 dark:border-slate-800"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Excel
          </Button>
          <Button
            onClick={onExportPdf}
            variant="outline"
            size="sm"
            className="h-10 flex-1 rounded-xl font-bold text-[10px] uppercase tracking-widest px-3 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>
    </div>
  );
});

