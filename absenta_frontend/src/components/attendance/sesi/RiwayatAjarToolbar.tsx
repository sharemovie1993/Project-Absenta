import React from 'react';
import { Search, Download, Table as TableIcon, LayoutGrid, Filter, Printer } from 'lucide-react';
import { Button, Input } from '../../ui';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../../../lib/utils';

interface RiwayatAjarToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onExport: () => void;
  isExportDisabled?: boolean;
  isManager?: boolean;
  selectedGuruId?: string;
  setSelectedGuruId?: (id: string) => void;
  selectedKelasId?: string;
  setSelectedKelasId?: (id: string) => void;
  guruOptions?: Array<{ id: string; nama_guru: string }>;
  kelasOptions?: Array<{ id: string; nama_kelas: string }>;
  viewMode?: 'table' | 'grid';
  setViewMode?: (mode: 'table' | 'grid') => void;
  statusFilter?: 'ALL' | 'UNFILLED' | 'FILLED';
  setStatusFilter?: (status: 'ALL' | 'UNFILLED' | 'FILLED') => void;
}

export const RiwayatAjarToolbar: React.FC<RiwayatAjarToolbarProps> = React.memo(({
  search,
  setSearch,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  onExport,
  isExportDisabled = false,
  isManager = false,
  selectedGuruId = '',
  setSelectedGuruId,
  selectedKelasId = '',
  setSelectedKelasId,
  guruOptions = [],
  kelasOptions = [],
  viewMode = 'table',
  setViewMode,
  statusFilter = 'ALL',
  setStatusFilter,
}) => {
  const [showMobileFilter, setShowMobileFilter] = React.useState(false);

  // Generate dynamic years from 2024 to currentYear + 1
  const startYear = 2024;
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(1, currentYear - startYear + 2) },
    (_, i) => startYear + i
  );

  const hasExtraFilters = Boolean(search || selectedKelasId || (isManager && selectedGuruId));

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* ── MOBILE VIEW: DIRECT ACCESSIBLE TOOLBAR (< sm) ── */}
      <div className="block sm:hidden space-y-2.5">
        {/* Row 1: Month & Year Selectors */}
        <div className="flex gap-2">
          <select
            className="flex-1 h-9 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {format(new Date(2022, i, 1), 'MMMM', { locale: id })}
              </option>
            ))}
          </select>
          <select
            className="w-24 h-9 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Direct Filter Kelas (Langsung Tanpa Dibungkus) */}
        <div className="flex flex-col gap-2">
          <select
            className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId?.(e.target.value)}
          >
            <option value="">-- SEMUA KELAS --</option>
            {kelasOptions.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas}
              </option>
            ))}
          </select>

          {/* Manager-only Guru Select */}
          {isManager && (
            <select
              className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId?.(e.target.value)}
            >
              <option value="">-- SEMUA GURU --</option>
              {guruOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama_guru}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Row 3: Quick Status Filter Pills (1-Tap Operation) */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setStatusFilter?.('ALL')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer",
              statusFilter === 'ALL'
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter?.('UNFILLED')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer",
              statusFilter === 'UNFILLED'
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 hover:bg-amber-100"
            )}
          >
            <span>⏳ Belum Diisi</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter?.('FILLED')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer",
              statusFilter === 'FILLED'
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60 hover:bg-emerald-100"
            )}
          >
            <span>✅ Terisi</span>
          </button>
        </div>

        {/* Row 4: Search Input (Langsung Terlihat) */}
        <div className="relative w-full">
          <Input
            placeholder="Cari materi pokok, kelas, mapel..."
            className="pl-8 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-medium"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
        </div>
      </div>

      {/* ── DESKTOP & TABLET VIEW: FULL TOOLBAR (>= sm) ── */}
      <div className="hidden sm:block space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Month & Year Selectors (4 cols) */}
          <div className="flex gap-2 lg:col-span-4">
            <select
              className="flex-1 h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {format(new Date(2022, i, 1), 'MMMM', { locale: id })}
                </option>
              ))}
            </select>
            <select
              className="w-24 h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Manager-only Guru Select (3 cols) */}
          {isManager && (
            <div className="lg:col-span-3">
              <select
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer"
                value={selectedGuruId}
                onChange={(e) => setSelectedGuruId?.(e.target.value)}
              >
                <option value="">-- SEMUA GURU --</option>
                {guruOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_guru}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kelas Filter (Available for both Teacher & Manager) */}
          <div className={isManager ? "lg:col-span-2" : "lg:col-span-3"}>
            <select
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer"
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId?.(e.target.value)}
            >
              <option value="">-- SEMUA KELAS --</option>
              {kelasOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className={isManager ? "lg:col-span-3" : "lg:col-span-5"}>
            <select
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter?.(e.target.value as any)}
            >
              <option value="ALL">Semua Status Jurnal</option>
              <option value="FILLED">✅ Hanya Jurnal Terisi</option>
              <option value="UNFILLED">⏳ Belum Diisi Jurnal</option>
            </select>
          </div>
        </div>

        {/* Search Input & Action Controls (Full Width Row on Bottom) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="relative flex-1 w-full">
            <Input
              placeholder="Cari materi pokok, kelas, atau mapel..."
              className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-medium"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* View Mode Toggle */}
            {setViewMode && (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                    viewMode === 'table'
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                  title="Mode Tabel Buku Jurnal"
                >
                  <TableIcon size={13} />
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                    viewMode === 'grid'
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                  title="Mode Kartu Timeline"
                >
                  <LayoutGrid size={13} />
                  <span>Kartu</span>
                </button>
              </div>
            )}

            {/* Export PDF / Print Button */}
            <Button
              onClick={onExport}
              disabled={isExportDisabled}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs gap-1.5 shrink-0 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Ekspor PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

