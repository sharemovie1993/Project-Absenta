import React from 'react';
import { Search, Download } from 'lucide-react';
import { Button, Input } from '../../ui';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface RiwayatAjarToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onExport: () => void;
  isExportDisabled?: boolean;
}

export const RiwayatAjarToolbar: React.FC<RiwayatAjarToolbarProps> = ({
  search,
  setSearch,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  onExport,
  isExportDisabled = false,
}) => {
  // Generate dynamic years from 2024 to currentYear + 1
  const startYear = 2024;
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(1, currentYear - startYear + 2) },
    (_, i) => startYear + i
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
      {/* Month & Year Selectors */}
      <div className="lg:col-span-1 flex gap-3">
        <select
          className="flex-1 h-12 px-4 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
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
          className="w-24 h-12 px-4 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
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

      {/* Search Input */}
      <div className="lg:col-span-2 relative group">
        <Input
          placeholder="Cari kelas atau materi..."
          className="pl-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 font-bold"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
      </div>

      {/* Export Button */}
      <Button
        onClick={onExport}
        disabled={isExportDisabled}
        className="h-12 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest shadow-xl gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        <Download className="w-4 h-4" /> Export Jurnal
      </Button>
    </div>
  );
};
