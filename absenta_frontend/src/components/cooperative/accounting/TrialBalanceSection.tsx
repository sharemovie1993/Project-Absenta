import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Printer, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Scale
} from 'lucide-react';
import Button from '../../ui/Button';
import type { TrialBalanceData, TrialBalanceAccount, BalanceSheetItem } from './types';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface TrialBalanceSectionProps {
  data?: TrialBalanceData;
  balanceSheet?: BalanceSheetItem[]; // Fallback backward compatibility
  loading: boolean;
  onRefresh?: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  ASSET: { 
    label: 'Aktiva', 
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
  },
  LIABILITY: { 
    label: 'Kewajiban', 
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
  },
  EQUITY: { 
    label: 'Ekuitas', 
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800' 
  },
  REVENUE: { 
    label: 'Pendapatan', 
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
  },
  EXPENSE: { 
    label: 'Beban', 
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
  },
};

export const TrialBalanceSection: React.FC<TrialBalanceSectionProps> = React.memo(({
  data,
  balanceSheet,
  loading,
  onRefresh,
}) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');

  // Normalisasi akun dari props data atau fallback balanceSheet lama
  const normalizedAccounts: TrialBalanceAccount[] = useMemo(() => {
    if (data?.accounts && data.accounts.length > 0) {
      return data.accounts;
    }

    if (balanceSheet && balanceSheet.length > 0) {
      return balanceSheet.map(item => {
        const bal = Number(item.balance || 0);
        let debit = 0;
        let credit = 0;

        if (item.type === 'ASSET' || item.type === 'EXPENSE') {
          if (bal >= 0) debit = bal;
          else credit = Math.abs(bal);
        } else {
          if (bal >= 0) credit = bal;
          else debit = Math.abs(bal);
        }

        return {
          id: item.code,
          code: item.code,
          name: item.name,
          type: item.type,
          debit,
          credit,
        };
      });
    }

    return [];
  }, [data, balanceSheet]);

  // Filter search
  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return normalizedAccounts;
    const term = searchTerm.toLowerCase();
    return normalizedAccounts.filter(
      a => a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term)
    );
  }, [normalizedAccounts, searchTerm]);

  // Total Debit & Kredit
  const totalDebit = useMemo(() => {
    if (data?.summary?.totalDebit !== undefined) return data.summary.totalDebit;
    return filteredAccounts.reduce((sum, a) => sum + (Number(a.debit) || 0), 0);
  }, [data, filteredAccounts]);

  const totalCredit = useMemo(() => {
    if (data?.summary?.totalCredit !== undefined) return data.summary.totalCredit;
    return filteredAccounts.reduce((sum, a) => sum + (Number(a.credit) || 0), 0);
  }, [data, filteredAccounts]);

  const balanceCheck = Math.abs(totalDebit - totalCredit);
  const isBalanced = balanceCheck === 0;

  // Handler Cetak Print Dokumen Resmi
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handler Ekspor Excel Neraca Saldo
  const handleExportExcel = useCallback(() => {
    const rows = filteredAccounts.map((acc, idx) => ({
      'No.': idx + 1,
      'Kode Akun': acc.code,
      'Nama Akun (Bagan Akun)': acc.name,
      'Klasifikasi': TYPE_CONFIG[acc.type]?.label || acc.type,
      'Debit (Rp)': acc.debit,
      'Kredit (Rp)': acc.credit,
    }));

    // Tambah baris total
    rows.push({
      'No.': '' as any,
      'Kode Akun': 'TOTAL',
      'Nama Akun (Bagan Akun)': 'TOTAL KESEIMBANGAN',
      'Klasifikasi': isBalanced ? 'SEIMBANG' : 'SELISIH',
      'Debit (Rp)': totalDebit,
      'Kredit (Rp)': totalCredit,
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Neraca Saldo');
    XLSX.writeFile(workbook, `Neraca_Saldo_Koperasi_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [filteredAccounts, isBalanced, totalDebit, totalCredit]);

  return (
    <div className="space-y-6">
      {/* ─── TOOLBAR & HEADER DOKUMEN ─── */}
      <div className="print:hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Cari kode atau nama akun..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
          />

          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="gap-1.5 border-slate-300 dark:border-slate-700 text-xs"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Segarkan</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="gap-1.5 border-slate-300 dark:border-slate-700 text-xs"
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0"
          >
            <Printer size={14} />
            <span>Cetak Neraca Saldo</span>
          </Button>
        </div>
      </div>

      {/* ─── BANNER STATUS KESEIMBANGAN (BALANCE CHECK) ─── */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
        isBalanced 
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200' 
          : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isBalanced ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
            {isBalanced ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-wider">
              {isBalanced ? 'Pembukuan Koperasi Seimbang (Balance)' : 'Peringatan: Terdapat Selisih Pembukuan'}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isBalanced 
                ? `Total Debit dan Kredit berada pada posisi seimbang sempurna (Rp ${Math.round(totalDebit).toLocaleString('id-ID')}).`
                : `Terdapat selisih pembukuan sebesar Rp ${Math.round(balanceCheck).toLocaleString('id-ID')}. Periksa entri jurnal umum terakhir.`}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-mono font-black">
          <div>
            <span className="text-[9px] uppercase tracking-wider block opacity-70">Total Debit</span>
            <span>Rp {Math.round(totalDebit).toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider block opacity-70">Total Kredit</span>
            <span>Rp {Math.round(totalCredit).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* ─── TABEL RESMI NERACA SALDO SAK ETAP ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-955 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-32 whitespace-nowrap">Kode Akun</th>
                <th className="p-4 min-w-[280px]">Nama Akun (Bagan Akun)</th>
                <th className="p-4 w-36 whitespace-nowrap">Klasifikasi</th>
                <th className="p-4 w-44 text-right whitespace-nowrap">Debit (Rp)</th>
                <th className="p-4 w-44 text-right whitespace-nowrap">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {loading && filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    Memuat data neraca saldo...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                    Tidak ada akun neraca saldo ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account, idx) => {
                  const typeMeta = TYPE_CONFIG[account.type] || { label: account.type, badgeClass: 'bg-slate-100 text-slate-600' };
                  const isEven = idx % 2 === 0;

                  return (
                    <tr 
                      key={account.code}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/40'
                      }`}
                    >
                      <td className="p-4 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                        {account.code}
                      </td>
                      <td className="p-4 font-bold text-xs text-slate-900 dark:text-slate-100 break-words leading-snug">
                        {account.name}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${typeMeta.badgeClass}`}>
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-xs whitespace-nowrap">
                        {account.debit > 0 ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Rp {Math.round(account.debit).toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono text-xs whitespace-nowrap">
                        {account.credit > 0 ? (
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Rp {Math.round(account.credit).toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* ─── FOOTER BARIS GRAND TOTAL ─── */}
            <tfoot>
              <tr className="bg-slate-100/90 dark:bg-slate-850 font-black border-t-2 border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white">
                <td colSpan={3} className="p-4 uppercase tracking-wider text-[11px] font-black">
                  <div className="flex items-center gap-2">
                    <Scale size={16} className={isBalanced ? 'text-emerald-600' : 'text-rose-600'} />
                    <span>TOTAL KESEIMBANGAN (NERACA SALDO)</span>
                  </div>
                </td>
                <td className="p-4 text-right font-mono font-black text-sm text-slate-950 dark:text-white">
                  Rp {Math.round(totalDebit).toLocaleString('id-ID')}
                </td>
                <td className="p-4 text-right font-mono font-black text-sm text-slate-950 dark:text-white">
                  Rp {Math.round(totalCredit).toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
});

TrialBalanceSection.displayName = 'TrialBalanceSection';
export default TrialBalanceSection;
