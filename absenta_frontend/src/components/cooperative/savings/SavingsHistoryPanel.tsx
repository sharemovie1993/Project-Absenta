import React from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { HelpCircle, Printer } from 'lucide-react';
import type { Saving, Transaction } from './types';

interface SavingsHistoryPanelProps {
  selectedSaving: Saving | null;
  transactions: Transaction[];
  handleExportSingleSavingPdf: () => void;
  handleExportAllSavingsPdf: () => void;
}

export const SavingsHistoryPanel: React.FC<SavingsHistoryPanelProps> = ({
  selectedSaving,
  transactions,
  handleExportSingleSavingPdf,
  handleExportAllSavingsPdf
}) => {
  if (!selectedSaving) {
    return null;
  }

  return (
    <Card title={`Riwayat: ${selectedSaving.member.name} (${selectedSaving.category?.name || selectedSaving.type || 'Simpanan'})`}>
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/60 mb-2">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Saat Ini</p>
            <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">
              Rp {parseFloat(selectedSaving.amount).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center gap-1.5 h-8 text-[11px]"
              onClick={handleExportSingleSavingPdf}
              title="Cetak Mutasi Rekening Ini"
            >
              <Printer size={12} /> Cetak Mutasi
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold flex items-center gap-1.5 h-8 text-[11px]"
              onClick={handleExportAllSavingsPdf}
              title="Cetak Rekap Mutasi Semua Rekening"
            >
              <Printer size={12} /> Rekap Buku
            </Button>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <HelpCircle size={36} className="mb-2 opacity-50" />
            <p className="text-sm">Belum ada histori transaksi.</p>
          </div>
        ) : (
          transactions.map((t) => {
            const isDeposit = t.type === 'DEPOSIT' || t.type === 'INTEREST';
            return (
              <div
                key={t.id}
                className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 hover:shadow-md transition-all duration-300"
              >
                <div>
                  <p className={`font-black text-xs tracking-wider uppercase ${isDeposit
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                    }`}>
                    {t.type === 'DEPOSIT' ? 'SETOR' : t.type === 'WITHDRAWAL' ? 'TARIK' : t.type}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {new Date(t.date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  {t.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic font-medium">
                      "{t.description}"
                    </p>
                  )}
                </div>
                <span className={`font-black text-sm ${isDeposit
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}>
                  {isDeposit ? '+' : '-'} Rp {parseFloat(t.amount).toLocaleString('id-ID')}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
