import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Printer, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Modal } from '../../ui/Modal';
import Button from '../../ui/Button';
import type { Saving, Transaction } from './types';
import { formatIndonesianDateTime } from '../../../utils/cooperative/coopDocUtils';
import { exportSingleSavingPdf, exportAllSavingsPdf } from './savingsExportUtils';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';

export interface SavingsPassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Selected saving that triggered the modal
  initialSaving: Saving | null;
  // All savings belonging to this member (for multi-account tabs)
  memberSavings?: Saving[];
  // Default tab: 'ALL' for Rekap Buku Tabungan, or 'SPECIFIC' for single account
  defaultViewMode?: 'ALL' | 'SPECIFIC';
  // Logo URL for PDF export
  logoUrl?: string;
}

const getShortTabName = (saving?: Saving | null) => {
  if (!saving) return 'Simpanan';
  const code = (saving.category?.code || saving.type || '').toUpperCase();
  if (code === 'POKOK') return 'Pokok';
  if (code === 'WAJIB') return 'Wajib';
  if (code === 'SUKARELA') return 'Sukarela';
  if (code.includes('RAYA')) return 'Hari Raya';
  const name = saving.category?.name || saving.type || 'Simpanan';
  return name.replace(/^Simpanan\s+/i, '').trim();
};

const formatShortAmount = (amount: number) => {
  if (amount >= 1000000) {
    const jt = amount / 1000000;
    return `${jt % 1 === 0 ? jt : jt.toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}k`;
  }
  return String(amount);
};

export const SavingsPassbookModal: React.FC<SavingsPassbookModalProps> = React.memo(({
  isOpen,
  onClose,
  initialSaving,
  memberSavings = [],
  defaultViewMode = 'SPECIFIC',
  logoUrl,
}) => {
  // Active Account Tab: 'ALL' or saving.id
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [detailedSavings, setDetailedSavings] = useState<Saving[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Sync activeTab when modal opens or initialSaving changes
  useEffect(() => {
    if (isOpen) {
      if (defaultViewMode === 'ALL' || !initialSaving) {
        setActiveTab('ALL');
      } else {
        setActiveTab(initialSaving.id);
      }
    }
  }, [isOpen, initialSaving, defaultViewMode]);

  // Member Information
  const member = useMemo(() => {
    return initialSaving?.member || memberSavings[0]?.member || null;
  }, [initialSaving, memberSavings]);

  const memberId = useMemo(() => {
    return initialSaving?.memberId || (initialSaving?.member as any)?.id || memberSavings[0]?.memberId || '';
  }, [initialSaving, memberSavings]);

  // Fetch full transactions for all savings of this member when modal is open
  useEffect(() => {
    if (!isOpen || (!memberId && !initialSaving?.id)) return;

    let isMounted = true;
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        // Try fetching full member profile with all savings and transactions
        if (memberId) {
          try {
            const res = await api.get(`/cooperative/members/${memberId}`);
            if (res.data?.savings && Array.isArray(res.data.savings) && isMounted) {
              setDetailedSavings(res.data.savings);
              setLoading(false);
              return;
            }
          } catch (e) {
            // Fallback to fetching per saving
          }
        }

        // Fallback: Fetch each saving detail
        const targetList = memberSavings.length > 0 ? memberSavings : (initialSaving ? [initialSaving] : []);
        if (targetList.length > 0) {
          const results = await Promise.all(
            targetList.map(async (s) => {
              try {
                const res = await api.get(`/cooperative/savings/${s.id}`);
                return res.data as Saving;
              } catch {
                return s;
              }
            })
          );
          if (isMounted) {
            setDetailedSavings(results);
          }
        }
      } catch (err) {
        console.error('Failed to load passbook transactions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTransactions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, memberId, initialSaving, memberSavings]);

  // Effective list of savings to display
  const effectiveSavings = useMemo(() => {
    if (detailedSavings.length > 0) return detailedSavings;
    if (memberSavings.length > 0) return memberSavings;
    if (initialSaving) return [initialSaving];
    return [];
  }, [detailedSavings, memberSavings, initialSaving]);

  // Total balance across all accounts
  const grandTotalBalance = useMemo(() => {
    return effectiveSavings.reduce((sum, s) => sum + (parseFloat(String(s.amount)) || 0), 0);
  }, [effectiveSavings]);

  // Selected account for specific tab
  const selectedSaving = useMemo(() => {
    if (activeTab === 'ALL') return null;
    return effectiveSavings.find(s => s.id === activeTab) || effectiveSavings[0] || null;
  }, [activeTab, effectiveSavings]);

  // Filtered transactions for the current tab
  const displayedTransactions = useMemo(() => {
    if (activeTab === 'ALL') {
      // Consolidate transactions from all savings accounts
      const allTx: Array<Transaction & { savingCategoryName: string; savingCode: string }> = [];
      effectiveSavings.forEach(s => {
        const catName = s.category?.name || s.type || 'Simpanan';
        const catCode = (s.category?.code || s.type || '').toUpperCase();
        (s.transactions || []).forEach(t => {
          allTx.push({
            ...t,
            savingCategoryName: catName,
            savingCode: catCode,
          });
        });
      });
      // Sort newest first
      return allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Specific saving account
    if (!selectedSaving) return [];
    const catName = selectedSaving.category?.name || selectedSaving.type || 'Simpanan';
    const catCode = (selectedSaving.category?.code || selectedSaving.type || '').toUpperCase();
    return (selectedSaving.transactions || []).map(t => ({
      ...t,
      savingCategoryName: catName,
      savingCode: catCode,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeTab, effectiveSavings, selectedSaving]);

  // Totals for the displayed transactions
  const { totalDeposits, totalWithdrawals } = useMemo(() => {
    let dep = 0;
    let wdr = 0;
    displayedTransactions.forEach(t => {
      const amt = parseFloat(String(t.amount)) || 0;
      if (t.type === 'DEPOSIT' || t.type === 'INTEREST') {
        dep += amt;
      } else {
        wdr += amt;
      }
    });
    return { totalDeposits: dep, totalWithdrawals: wdr };
  }, [displayedTransactions]);

  // Handlers for exporting PDF on demand
  const handleExportPdf = async () => {
    if (!initialSaving && effectiveSavings.length === 0) return;
    setIsExporting(true);
    try {
      if (activeTab === 'ALL') {
        const primary = initialSaving || effectiveSavings[0];
        await exportAllSavingsPdf(primary, effectiveSavings, logoUrl);
        toast.success('Rekap Buku Tabungan berhasil diekspor!');
      } else if (selectedSaving) {
        await exportSingleSavingPdf(selectedSaving, logoUrl);
        toast.success(`Mutasi ${selectedSaving.category?.name || 'Rekening'} berhasil diekspor!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengekspor dokumen PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      contentClassName="p-3.5 sm:p-5"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
              {activeTab === 'ALL' ? 'Rekap Buku Tabungan' : `Mutasi: ${getShortTabName(selectedSaving)}`}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              Histori mutasi rekening anggota koperasi
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* ── 1. Member Information Header ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-slate-800/30 rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
              {member?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate max-w-[200px] sm:max-w-none">
                  {member?.name || 'Anggota Koperasi'}
                </h4>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {member?.siswaId ? 'Siswa' : member?.guruId ? 'Guru' : 'Umum'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  No. {member?.memberNo || '-'}
                </span>
                <span>&bull;</span>
                <span>{effectiveSavings.length} Rekening</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:block sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-700/50">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Saldo
            </span>
            <span className="text-sm sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 block">
              Rp {grandTotalBalance.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* ── 2. Account Selector Tabs (1 Word Only & Clean Mobile Scroll) ── */}
        <div 
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen size={13} />
            <span>Semua</span>
          </button>

          {effectiveSavings.map((s) => {
            const isSelected = activeTab === s.id;
            const bal = parseFloat(String(s.amount)) || 0;
            const shortName = getShortTabName(s);
            const shortBal = formatShortAmount(bal);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTab(s.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Wallet size={13} />
                <span>{shortName}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {shortBal}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 3. Quick Stats Summary ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 text-xs">
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Saldo
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block truncate">
              Rp {(activeTab === 'ALL' ? grandTotalBalance : (parseFloat(String(selectedSaving?.amount)) || 0)).toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
              Setoran (+)
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block truncate">
              +Rp {totalDeposits.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/30">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block truncate">
              Penarikan (-)
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-rose-700 dark:text-rose-300 mt-0.5 block truncate">
              -Rp {totalWithdrawals.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* ── 4. Transactions Ledger ────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Rincian Mutasi ({displayedTransactions.length})</span>
            </h5>
            {activeTab !== 'ALL' && selectedSaving && (
              <span className="text-[10px] text-slate-400 font-mono">
                Rek: {selectedSaving.accountNumber || '-'}
              </span>
            )}
          </div>

          {/* Mobile View: Vertical Card Stream (sm:hidden) */}
          <div className="sm:hidden space-y-2">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                <span>Memuat riwayat transaksi...</span>
              </div>
            ) : displayedTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800 p-4 space-y-1">
                <HelpCircle size={24} className="mx-auto opacity-40 text-slate-400" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Belum ada riwayat transaksi</p>
                <p className="text-[10px] text-slate-400">Transaksi setor atau tarik tunai akan tercatat di sini.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {displayedTransactions.map((tx, idx) => {
                  const isDep = tx.type === 'DEPOSIT' || tx.type === 'INTEREST';
                  const amt = parseFloat(String(tx.amount)) || 0;
                  return (
                    <div 
                      key={tx.id || idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                            isDep
                              ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100/80 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {isDep ? (
                              <>
                                <ArrowUpCircle size={10} className="shrink-0" />
                                <span>SETOR</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownCircle size={10} className="shrink-0" />
                                <span>TARIK</span>
                              </>
                            )}
                          </span>
                          {activeTab === 'ALL' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                              {(tx as any).savingCategoryName || 'Simpanan'}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-mono font-black ${
                          isDep ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isDep ? '+' : '-'}Rp {amt.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="truncate max-w-[200px] text-slate-600 dark:text-slate-300">
                          {tx.description || '-'}
                        </span>
                        <span className="shrink-0 font-medium">
                          {formatIndonesianDateTime(tx.date)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop/Tablet View: Classic Clean Table (hidden sm:block) */}
          <div className="hidden sm:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Tanggal &amp; Waktu</th>
                    {activeTab === 'ALL' && <th className="py-2.5 px-3">Rekening</th>}
                    <th className="py-2.5 px-3">Transaksi</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3">Keterangan / Memo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={activeTab === 'ALL' ? 6 : 5} className="py-12 text-center text-xs text-slate-400">
                        <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                        <span>Memuat riwayat transaksi...</span>
                      </td>
                    </tr>
                  ) : displayedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'ALL' ? 6 : 5} className="py-12 text-center text-xs text-slate-400 space-y-1">
                        <HelpCircle size={28} className="mx-auto opacity-40 text-slate-400" />
                        <p className="font-semibold">Belum ada riwayat transaksi</p>
                        <p className="text-[10px] text-slate-400">Transaksi setor atau tarik tunai pada rekening ini akan tercatat di sini.</p>
                      </td>
                    </tr>
                  ) : (
                    displayedTransactions.map((tx, idx) => {
                      const isDep = tx.type === 'DEPOSIT' || tx.type === 'INTEREST';
                      const amt = parseFloat(String(tx.amount)) || 0;
                      return (
                        <tr key={tx.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 text-center text-[11px] text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                            {formatIndonesianDateTime(tx.date)}
                          </td>
                          {activeTab === 'ALL' && (
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {(tx as any).savingCategoryName || 'Simpanan'}
                              </span>
                            </td>
                          )}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isDep
                                ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50'
                                : 'bg-rose-100/80 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50'
                            }`}>
                              {isDep ? (
                                <>
                                  <ArrowUpCircle size={10} className="shrink-0" />
                                  <span>SETORAN (+)</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownCircle size={10} className="shrink-0" />
                                  <span>PENARIKAN (-)</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isDep ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isDep ? '+' : '-'}Rp {amt.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate" title={tx.description || '-'}>
                            {tx.description || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── 5. Modal Footer Action Buttons ────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl"
          >
            Tutup
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={isExporting || effectiveSavings.length === 0}
            onClick={handleExportPdf}
            className="py-2 px-3 sm:px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
          >
            <Printer size={14} />
            <span className="sm:hidden">
              {isExporting ? 'Memproses...' : 'Cetak PDF'}
            </span>
            <span className="hidden sm:inline">
              {isExporting 
                ? 'Menyiapkan PDF...' 
                : activeTab === 'ALL'
                  ? 'Cetak Rekap Buku Tabungan (PDF)'
                  : `Cetak Mutasi ${getShortTabName(selectedSaving)} (PDF)`
              }
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
});

SavingsPassbookModal.displayName = 'SavingsPassbookModal';
