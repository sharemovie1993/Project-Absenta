import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '@/hooks/useCapabilities';
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
import { cleanMemoDescription, filterAndSortSavingsByCategory, type SavingCategoryMeta } from './savingsExportUtils';
import { SavingsPassbookPrintModal } from './SavingsPassbookPrintModal';
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
  if (code.includes('POKOK')) return 'Pokok';
  if (code.includes('WAJIB')) return 'Wajib';
  if (code.includes('SUKARELA')) return 'Sukarela';
  if (code.includes('RAYA') || code.includes('THR')) return 'Raya';
  const name = saving.category?.name || saving.type || 'Simpanan';
  const cleaned = name.replace(/^Simpanan\s+/i, '').trim();
  return cleaned.split(' ')[0] || 'Simpanan';
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
  const queryClient = useQueryClient();
  const { can, isAdmin, isKoperasiHead, isKoperasiFinance } = useCapabilities();
  const canCorrectTx =
    isAdmin ||
    isKoperasiHead ||
    isKoperasiFinance ||
    can('cooperative.savings.deposit') ||
    can('cooperative.savings.withdraw');

  // Active Account Tab: 'ALL' or saving.id
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [detailedSavings, setDetailedSavings] = useState<Saving[]>([]);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [reversingTx, setReversingTx] = useState<{
    id: string;
    type: string;
    amount: number;
    categoryName: string;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

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

  const { data: savingCategories = [] } = useQuery({
    queryKey: ['koperasi-saving-categories-all'],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/saving-categories/all');
        return (res.data?.success ? res.data.data : []) as SavingCategoryMeta[];
      } catch {
        return [] as SavingCategoryMeta[];
      }
    },
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  const handleConfirmReverse = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingTx) return;
    if (reversalReason.trim().length < 3) {
      toast.error('Mohon isi catatan / alasan koreksi minimal 3 karakter');
      return;
    }

    try {
      setIsReversing(true);
      const res = await api.post(`/cooperative/savings/transactions/${reversingTx.id}/reverse`, {
        reason: reversalReason.trim(),
      });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Transaksi berhasil dikoreksi (reversal)');
        setReversingTx(null);
        setReversalReason('');
        if (memberId) {
          try {
            const memberRes = await api.get(`/cooperative/members/${memberId}`);
            if (memberRes.data?.savings && Array.isArray(memberRes.data.savings)) {
              setDetailedSavings(memberRes.data.savings);
            }
          } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['koperasi-savings'] });
        queryClient.invalidateQueries({ queryKey: ['cooperative-savings'] });
        queryClient.invalidateQueries({ queryKey: ['cooperative-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard'] });
      } else {
        toast.error(res.data?.message || 'Gagal memproses koreksi transaksi');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memproses koreksi transaksi');
    } finally {
      setIsReversing(false);
    }
  }, [reversingTx, reversalReason, memberId, queryClient]);

  // Effective list of savings to display (aware terhadap pengaturan kategori simpanan: aktif & urutan order)
  const effectiveSavings = useMemo(() => {
    const raw =
      detailedSavings.length > 0
        ? detailedSavings
        : memberSavings.length > 0
        ? memberSavings
        : initialSaving
        ? [initialSaving]
        : [];

    return filterAndSortSavingsByCategory(raw, savingCategories);
  }, [detailedSavings, memberSavings, initialSaving, savingCategories]);

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

  // Buka modal pratinjau cetak standar Universal Document Printing
  const handleOpenPrintPreview = () => {
    if (!initialSaving && effectiveSavings.length === 0) return;
    setIsPrintPreviewOpen(true);
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
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              Histori mutasi saldo rekening anggota
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
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Saldo
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block truncate">
              Rp {(activeTab === 'ALL' ? grandTotalBalance : (parseFloat(String(selectedSaving?.amount)) || 0)).toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
              Setoran (+)
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block truncate">
              +Rp {totalDeposits.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/40">
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
            {activeTab !== 'ALL' && selectedSaving?.accountNumber && selectedSaving.accountNumber !== '-' && (
              <span className="text-[10px] text-slate-400 font-mono">
                No. Rek: {selectedSaving.accountNumber}
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
                  const memo = cleanMemoDescription(tx.description);
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
                        <span className="truncate max-w-[210px] text-slate-600 dark:text-slate-300 font-medium">
                          {memo}
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

          {/* Inline Form Koreksi / Reversal Transaksi (khusus Pengurus/Operator) */}
          {reversingTx && (
            <form
              onSubmit={handleConfirmReverse}
              className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2.5 animate-in fade-in duration-150"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <RotateCcw size={13} />
                    <span>Koreksi / Pembatalan Transaksi (Jurnal Pembalik)</span>
                  </p>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                    {reversingTx.categoryName} • {reversingTx.type === 'DEPOSIT' ? 'Setoran' : 'Penarikan'} sebesar{' '}
                    <strong className="font-mono">Rp {reversingTx.amount.toLocaleString('id-ID')}</strong> akan dibuatkan transaksi pembalik otomatis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReversingTx(null);
                    setReversalReason('');
                  }}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer shrink-0"
                >
                  Batal
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['Salah nominal input', 'Salah pilih anggota', 'Transaksi tercatat ganda'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReversalReason(preset)}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100/70 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Tulis catatan / alasan koreksi (wajib)..."
                  className="flex-1 h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isReversing}
                  disabled={isReversing || reversalReason.trim().length < 3}
                  className="h-9 px-4 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                >
                  Proses Koreksi
                </Button>
              </div>
            </form>
          )}

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
                    {canCorrectTx && <th className="py-2.5 px-3 text-center w-24">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={(activeTab === 'ALL' ? 6 : 5) + (canCorrectTx ? 1 : 0)} className="py-12 text-center text-xs text-slate-400">
                        <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                        <span>Memuat riwayat transaksi...</span>
                      </td>
                    </tr>
                  ) : displayedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={(activeTab === 'ALL' ? 6 : 5) + (canCorrectTx ? 1 : 0)} className="py-12 text-center text-xs text-slate-400 space-y-1">
                        <HelpCircle size={28} className="mx-auto opacity-40 text-slate-400" />
                        <p className="font-semibold">Belum ada riwayat transaksi</p>
                        <p className="text-[10px] text-slate-400">Transaksi setor atau tarik tunai pada rekening ini akan tercatat di sini.</p>
                      </td>
                    </tr>
                  ) : (
                    displayedTransactions.map((tx, idx) => {
                      const isDep = tx.type === 'DEPOSIT' || tx.type === 'INTEREST';
                      const amt = parseFloat(String(tx.amount)) || 0;
                      const rawDesc = tx.description || '';
                      const isCancelled = rawDesc.includes('[DIBATALKAN]');
                      const isReversalEntry = rawDesc.includes('[KOREKSI/REVERSAL]');
                      const memo = cleanMemoDescription(tx.description);
                      return (
                        <tr key={tx.id || idx} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${isCancelled ? 'opacity-60' : ''}`}>
                          <td className="py-2.5 px-3 text-center text-[11px] text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                            {formatIndonesianDateTime(tx.date)}
                          </td>
                          {activeTab === 'ALL' && (
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {(tx as any).savingCategoryName || 'Simpanan'}
                              </span>
                            </td>
                          )}
                          <td className="py-2.5 px-3 whitespace-nowrap">
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
                          <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isDep ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          } ${isCancelled ? 'line-through' : ''}`}>
                            {isDep ? '+' : '-'}Rp {amt.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300 max-w-sm truncate" title={memo}>
                            {memo}
                          </td>
                          {canCorrectTx && (
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {isCancelled ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  Dikoreksi
                                </span>
                              ) : isReversalEntry ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                                  Jurnal Balik
                                </span>
                              ) : tx.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReversingTx({
                                      id: tx.id,
                                      type: tx.type,
                                      amount: amt,
                                      categoryName: (tx as any).savingCategoryName || 'Simpanan',
                                    });
                                    setReversalReason('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-800/70 transition-colors cursor-pointer"
                                  title="Buat transaksi pembalik (Koreksi)"
                                >
                                  <RotateCcw size={10} />
                                  <span>Koreksi</span>
                                </button>
                              ) : null}
                            </td>
                          )}
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
            disabled={effectiveSavings.length === 0}
            onClick={handleOpenPrintPreview}
            className="py-2 px-3 sm:px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
          >
            <Printer size={14} />
            <span className="sm:hidden">Cetak / PDF</span>
            <span className="hidden sm:inline">
              {activeTab === 'ALL'
                ? 'Cetak Rekap Buku Tabungan (PDF)'
                : `Cetak Mutasi ${getShortTabName(selectedSaving)} (PDF)`}
            </span>
          </Button>
        </div>
      </div>

      <SavingsPassbookPrintModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        activeTab={activeTab}
        member={member}
        effectiveSavings={effectiveSavings}
        selectedSaving={selectedSaving}
        displayedTransactions={displayedTransactions}
        grandTotalBalance={grandTotalBalance}
        totalDeposits={totalDeposits}
        totalWithdrawals={totalWithdrawals}
        logoUrl={logoUrl}
      />
    </Modal>
  );
});

SavingsPassbookModal.displayName = 'SavingsPassbookModal';
