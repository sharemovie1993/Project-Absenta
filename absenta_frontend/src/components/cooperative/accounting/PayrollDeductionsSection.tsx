import React from 'react';
import { Printer, Download, CheckCircle2 } from 'lucide-react';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { PayrollDeductionsTable } from './PayrollDeductionsTable';
import type { PayrollItem } from './types';

interface PayrollDeductionsSectionProps {
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  monthOptions: Array<{ label: string; value: string }>;
  yearOptions: Array<{ label: string; value: string }>;
  handlePrintPayroll: () => void;
  handleExportExcel: () => void;
  isOperator: boolean;
  isPosted: boolean;
  setShowCancelConfirm: (v: boolean) => void;
  setShowPostConfirm: (v: boolean) => void;
  payrollData: PayrollItem[];
  savingCategories: Array<{ code: string; name: string }>;
  visibleColumns: Record<string, boolean>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showLoans: boolean;
  setShowLoans: (v: boolean) => void;
  loading: boolean;
  payrollPage: number;
  payrollLimit: number;
  setPayrollPage: (p: number) => void;
  setPayrollLimit: (l: number) => void;
}

export const PayrollDeductionsSection: React.FC<PayrollDeductionsSectionProps> = React.memo(({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  monthOptions,
  yearOptions,
  handlePrintPayroll,
  handleExportExcel,
  isOperator,
  isPosted,
  setShowCancelConfirm,
  setShowPostConfirm,
  payrollData,
  savingCategories,
  visibleColumns,
  setVisibleColumns,
  showLoans,
  setShowLoans,
  loading,
  payrollPage,
  payrollLimit,
  setPayrollPage,
  setPayrollLimit
}) => {
  return (
    <div className="space-y-6 p-4">
      {/* Filters and Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 w-48">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Bulan:</span>
            <SearchableSelect
              id="select_month"
              aria-label="Pilih Bulan Rekap Gaji"
              value={String(selectedMonth)}
              onValueChange={(val) => setSelectedMonth(parseInt(val))}
              options={monthOptions}
              placeholder="Pilih Bulan..."
            />
          </div>
          <div className="flex items-center gap-2 w-36">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Tahun:</span>
            <SearchableSelect
              id="select_year"
              aria-label="Pilih Tahun Rekap Gaji"
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(parseInt(val))}
              options={yearOptions}
              placeholder="Pilih Tahun..."
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Cetak Laporan Gaji"
            onClick={handlePrintPayroll}
            className="h-9 px-4 text-xs font-bold bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Printer size={13} className="text-indigo-600" /> Cetak Laporan
          </button>
          <button
            type="button"
            aria-label="Ekspor Laporan Excel"
            onClick={handleExportExcel}
            className="h-9 px-4 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Download size={13} /> Ekspor Excel
          </button>
          
          {isOperator && (
            isPosted ? (
              <div className="flex items-center gap-1.5">
                <span className="h-9 px-3 text-xs font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-1">
                  <CheckCircle2 size={13} /> Posted
                </span>
                <button
                  type="button"
                  aria-label="Batalkan Posting Gaji"
                  onClick={() => setShowCancelConfirm(true)}
                  className="h-9 px-3 text-xs font-bold bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/30 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all rounded-xl shadow-sm flex items-center justify-center cursor-pointer"
                  title="Batalkan Posting Gaji"
                >
                  Batalkan
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Posting Potongan Gaji"
                onClick={() => setShowPostConfirm(true)}
                disabled={payrollData.length === 0}
                className="h-9 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white transition-all rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={13} /> Posting Potongan Gaji
              </button>
            )
          )}
        </div>
      </div>

      {/* Dynamic Column Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-y-3 gap-x-6 bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Potongan Simpanan:</span>
          <div className="flex flex-wrap items-center gap-3">
            {savingCategories?.map(cat => (
              <label key={cat.code} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  aria-label={'Potongan ' + cat.name}
                  checked={!!visibleColumns[cat.code]} 
                  onChange={(e) => setVisibleColumns(prev => ({ ...prev, [cat.code]: e.target.checked }))}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                />
                {cat.name.replace('Simpanan', '').trim()}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-6">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
            <input 
              type="checkbox" 
              aria-label="Tampilkan Kolom Pinjaman"
              checked={showLoans} 
              onChange={(e) => setShowLoans(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-800 dark:bg-slate-950"
            />
            Potongan Pinjaman
          </label>
        </div>
      </div>

      <PayrollDeductionsTable
        data={payrollData}
        visibleColumns={visibleColumns}
        savingCategories={savingCategories}
        showLoans={showLoans}
        loading={loading}
        pagination={{
          currentPage: payrollPage,
          totalPages: Math.ceil(payrollData.length / payrollLimit) || 1,
          totalItems: payrollData.length,
          itemsPerPage: payrollLimit,
          onPageChange: setPayrollPage,
          onLimitChange: setPayrollLimit
        }}
      />
    </div>
  );
});
