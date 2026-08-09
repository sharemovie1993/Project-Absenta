import React, { Suspense, lazy } from 'react';
import { Button, Input } from '../../ui';
import { FileText, Printer } from 'lucide-react';
import type { DropdownOption } from '../../../api/dropdown.api';
import type { ViewMode } from './types';

const SearchableSelect = lazy(() =>
  import('../../ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);

interface RekapBulananMapelToolbarProps {
  kelasId: string;
  mapelId: string;
  bulan: string;
  tahunPelajaranId: string;
  viewMode: ViewMode;
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
  onExportExcel,
  onExportPdf,
}: RekapBulananMapelToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Top Banner Info */}
      {(selectedMapelLabel || selectedKelasLabel) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs">
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

      {/* Grid Inputs & Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
        <div className="space-y-1.5">
          <label htmlFor="filter-kelas-mapel-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Kelas</label>
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

        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="filter-mapel-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mata Pelajaran</label>
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

        <div className="space-y-1.5">
          <label htmlFor="filter-bulan-mapel-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bulan Laporan</label>
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
          <label htmlFor="filter-tahun-mapel-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tahun Pelajaran</label>
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
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tampilan</label>
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
