import React from 'react';
import { 
  Search, 
  RotateCcw, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TabSwitcher, type TabOption } from '@/components/ui/TabSwitcher';
import type { SiswaPkl } from '@/pages/hubin/types/penempatan.types';

export interface PenempatanFilterBarProps {
  isKaprog: boolean;
  kaprogJurusan?: { nama?: string; singkatan?: string } | null;
  isWaliKelas: boolean;
  walikelasKelas?: { id: string; nama_kelas: string } | null;
  isAdmin: boolean;
  isHubin: boolean;
  canManage: boolean;
  overdueStudents: SiswaPkl[];
  isBatchCheckingOut: boolean;
  onBatchCheckoutOverdue: () => void;
  showTabs: boolean;
  tabOptions: TabOption[];
  activeTab: 'ALL' | 'MY_GUIDANCE';
  onTabChange: (id: string) => void;
  tpFilterOptions: { value: string; label: string }[];
  selectedTpFilter: string;
  onTpFilterChange: (val: string) => void;
  isLoadingTp?: boolean;
  kelasFilterOptions: { value: string; label: string }[];
  selectedKelasFilter: string;
  onKelasFilterChange: (val: string) => void;
  isLoadingKelas?: boolean;
  mitraFilterOptions: { value: string; label: string }[];
  selectedMitraFilter: string;
  onMitraFilterChange: (val: string) => void;
  isLoadingRawMitra?: boolean;
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const PenempatanFilterBar: React.FC<PenempatanFilterBarProps> = React.memo(({
  isKaprog,
  kaprogJurusan,
  isWaliKelas,
  walikelasKelas,
  isAdmin,
  isHubin,
  canManage,
  overdueStudents,
  isBatchCheckingOut,
  onBatchCheckoutOverdue,
  showTabs,
  tabOptions,
  activeTab,
  onTabChange,
  tpFilterOptions,
  selectedTpFilter,
  onTpFilterChange,
  isLoadingTp,
  kelasFilterOptions,
  selectedKelasFilter,
  onKelasFilterChange,
  isLoadingKelas,
  mitraFilterOptions,
  selectedMitraFilter,
  onMitraFilterChange,
  isLoadingRawMitra,
  searchTerm,
  onSearchTermChange,
  hasActiveFilters,
  onResetFilters
}) => {
  return (
    <div className="w-full flex flex-col gap-3">
      {/* Banner Khusus Kaprog: Unit Terkunci */}
      {isKaprog && (
        <div className="mx-4 mt-4 flex items-center gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
          <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
            <span>
              Data penempatan dibatasi otomatis untuk Jurusan{' '}
              <strong>{kaprogJurusan?.nama || 'Binaan Anda'}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Banner Khusus Wali Kelas: Kelas Terkunci */}
      {isWaliKelas && !isKaprog && !isAdmin && !isHubin && (
        <div className="mx-4 mt-4 flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold">Mode Wali Kelas (Monitoring Kelas Binaan):</span>{' '}
            <span>
              Data penempatan dibatasi otomatis untuk siswa kelas{' '}
              <strong>{walikelasKelas?.nama_kelas || 'Binaan Anda'}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Banner Aksi Cepat: Siswa Periode Berakhir */}
      {overdueStudents?.length > 0 && canManage && (
        <div className="mx-4 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Terdapat <strong>{overdueStudents.length} siswa</strong> yang jadwal PKL-nya telah berakhir dan menunggu konfirmasi penarikan.
            </span>
          </div>
          <Button
            type="button"
            size="xs"
            variant="warning"
            onClick={onBatchCheckoutOverdue}
            disabled={isBatchCheckingOut}
            className="shrink-0 text-xs font-bold rounded-xl shadow-sm"
          >
            {isBatchCheckingOut ? 'Memproses...' : `⚡ Tandai Selesai (${overdueStudents.length} Siswa)`}
          </Button>
        </div>
      )}

      {/* Custom Search & Toolbar */}
      <div className="flex flex-col gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 w-full max-w-full min-w-0">
        {/* Tab Filters with touch scroll container */}
        {showTabs && (
          <div className="w-full flex justify-start pb-0.5 overflow-x-auto no-scrollbar flex-nowrap">
            <div className="whitespace-nowrap">
              <TabSwitcher
                options={tabOptions}
                activeTab={activeTab}
                onChange={onTabChange}
              />
            </div>
          </div>
        )}

        {/* Filter Controls Grid */}
        <div className="flex flex-col lg:flex-row flex-wrap items-center gap-2.5 w-full max-w-full min-w-0">
          {/* Filter Tahun Pelajaran */}
          <div className="w-full lg:w-56 shrink-0 min-w-0">
            <SearchableSelect
              id="filter-tp"
              options={tpFilterOptions}
              placeholder="-- Pilih TP --"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              onValueChange={onTpFilterChange}
              value={selectedTpFilter}
              isLoading={isLoadingTp}
            />
          </div>

          {/* Filter Kelas */}
          <div className="w-full lg:w-44 shrink-0 min-w-0">
            <SearchableSelect
              id="filter-kelas"
              options={kelasFilterOptions}
              placeholder="-- Semua Kelas --"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              onValueChange={onKelasFilterChange}
              value={selectedKelasFilter}
              isLoading={isLoadingKelas}
              disabled={Boolean(isWaliKelas && walikelasKelas?.id && !isAdmin && !isHubin && !isKaprog)}
            />
          </div>

          {/* Filter Mitra Industri */}
          <div className="w-full lg:w-56 shrink-0 min-w-0">
            <SearchableSelect
              id="filter-mitra"
              options={mitraFilterOptions}
              placeholder="-- Semua Mitra --"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              onValueChange={onMitraFilterChange}
              value={selectedMitraFilter}
              isLoading={isLoadingRawMitra}
            />
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-0 sm:min-w-[200px] max-w-full relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              aria-label="Cari nama siswa atau mitra industri"
              placeholder="Cari siswa atau mitra..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full max-w-full min-w-0 h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
            />
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-10 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl shrink-0 transition-colors w-full lg:w-auto"
              title="Reset semua filter"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
