import React, { Suspense, lazy } from 'react';
import { Button, Input } from '../../ui';
import { FileText, Printer } from 'lucide-react';
import type { DropdownOption } from '../../../api/dropdown.api';
import type { ViewMode } from './types';

const SearchableSelect = lazy(() =>
  import('../../ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);

interface RekapBulananKelasToolbarProps {
  // Filter state
  kelasId: string;
  bulan: string;
  tahunPelajaranId: string;
  viewMode: ViewMode;
  kelasOptions: DropdownOption[];
  tahunOptions: DropdownOption[];
  selectedKelasLabel: string;
  isWaliKelasAutoFiltered: boolean;
  // Setters
  setKelasId: (v: string) => void;
  setBulan: (v: string) => void;
  setTahunPelajaranId: (v: string) => void;
  setViewMode: (v: ViewMode) => void;
  // Actions
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

export const RekapBulananKelasToolbar = React.memo(function RekapBulananKelasToolbar({
  kelasId,
  bulan,
  tahunPelajaranId,
  viewMode,
  kelasOptions,
  tahunOptions,
  selectedKelasLabel,
  isWaliKelasAutoFiltered,
  setKelasId,
  setBulan,
  setTahunPelajaranId,
  setViewMode,
  onExportExcel,
  onExportPdf,
}: RekapBulananKelasToolbarProps) {

  const exportButtons = (
    <>
      <Button
        onClick={onExportExcel}
        variant="outline"
        size="sm"
        className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-slate-200 dark:border-slate-800"
      >
        <FileText className="w-3.5 h-3.5 mr-2" /> Export Excel
      </Button>
      <Button
        onClick={onExportPdf}
        variant="outline"
        size="sm"
        className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
      >
        <Printer className="w-3.5 h-3.5 mr-2" /> Cetak PDF
      </Button>
    </>
  );

  if (isWaliKelasAutoFiltered) {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4">
        <div className="flex-1 max-w-md space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-bulan-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Bulan Laporan
            </label>
            {selectedKelasLabel && (
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                Kelas: {selectedKelasLabel}
              </span>
            )}
          </div>
          <Input
            id="filter-bulan-input"
            aria-label="Pilih Bulan Laporan"
            type="month"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ViewModeSwitcher viewMode={viewMode} setViewMode={setViewMode} />
          {exportButtons}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-end">
      <div className="space-y-1.5">
        <label htmlFor="filter-kelas-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Kelas</label>
        <Suspense fallback={<SuspenseFallback />}>
          <SearchableSelect
            id="filter-kelas-select"
            aria-label="Pilih Kelas Laporan"
            value={kelasId}
            onValueChange={setKelasId}
            options={kelasOptions ?? []}
            placeholder="Pilih Kelas..."
            triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
          />
        </Suspense>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-bulan-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bulan Laporan</label>
        <Input
          id="filter-bulan-input"
          aria-label="Pilih Bulan Laporan"
          type="month"
          value={bulan}
          onChange={e => setBulan(e.target.value)}
          className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-tahun-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tahun Pelajaran</label>
        <Suspense fallback={<SuspenseFallback />}>
          <SearchableSelect
            id="filter-tahun-select"
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

      <div>
        <Button
          onClick={onExportExcel}
          variant="outline"
          size="sm"
          className="h-10 w-full rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-slate-200 dark:border-slate-800"
        >
          <FileText className="w-3.5 h-3.5 mr-2" /> Export Excel
        </Button>
      </div>

      <div>
        <Button
          onClick={onExportPdf}
          variant="outline"
          size="sm"
          className="h-10 w-full rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <Printer className="w-3.5 h-3.5 mr-2" /> Cetak PDF
        </Button>
      </div>
    </div>
  );
});
