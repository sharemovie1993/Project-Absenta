import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  DollarSign, 
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axiosInstance';
import Table from '../../ui/Table';
import Button from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { AnalyticsCard } from '../../ui/AnalyticsCard';
import useConfirm from '@/hooks/useConfirm';
import { formatDate } from '@/utils/date.utils';
import { ExpenseFormModal } from './ExpenseFormModal';
import { DepositFormModal } from './DepositFormModal';
import { TransferFormModal } from './TransferFormModal';
import type { 
  CoopExpenseItem, 
  CoopExpenseFormData,
  CoopDepositItem,
  CoopDepositFormData,
  CoopTransferItem,
  CoopTransferFormData
} from './types';
import { useIsMobile } from '@/hooks/useIsMobile';
import { invalidateAccountingCaches } from '@/lib/coopQueryKeys';

interface ExpenseVoucherSectionProps {
  initialSubTab?: 'EXPENSE' | 'DEPOSIT' | 'TRANSFER';
  autoOpenCreateModal?: boolean;
}

export const ExpenseVoucherSection: React.FC<ExpenseVoucherSectionProps> = React.memo(({
  initialSubTab = 'EXPENSE',
  autoOpenCreateModal = false
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  const [subTab, setSubTab] = useState<'EXPENSE' | 'DEPOSIT' | 'TRANSFER'>(initialSubTab);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals state
  const [isExpenseOpen, setIsExpenseOpen] = useState(autoOpenCreateModal && initialSubTab === 'EXPENSE');
  const [isDepositOpen, setIsDepositOpen] = useState(autoOpenCreateModal && initialSubTab === 'DEPOSIT');
  const [isTransferOpen, setIsTransferOpen] = useState(autoOpenCreateModal && initialSubTab === 'TRANSFER');

  // Sync if initialSubTab prop changes
  React.useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
      if (autoOpenCreateModal) {
        if (initialSubTab === 'EXPENSE') setIsExpenseOpen(true);
        if (initialSubTab === 'DEPOSIT') setIsDepositOpen(true);
        if (initialSubTab === 'TRANSFER') setIsTransferOpen(true);
      }
    }
  }, [initialSubTab, autoOpenCreateModal]);

  const handleSubTabChange = (tab: 'EXPENSE' | 'DEPOSIT' | 'TRANSFER') => {
    setSubTab(tab);
    setPage(1);
    setSearch('');
    setSelectedCategory('ALL');
  };

  // ─── QUERY KAS KELUAR (EXPENSE) ───────────────────────────────────────────
  const { data: expenseRes, isLoading: expenseLoading } = useQuery<{
    success: boolean;
    data: {
      summary: { totalExpenseAmount: number; totalTransactions: number };
      items: CoopExpenseItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>({
    queryKey: ['cooperative-expenses', page, limit, selectedCategory, search],
    queryFn: async () => {
      const res = await api.get('/cooperative/expenses', {
        params: {
          page,
          limit,
          categoryCode: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          search: search.trim() || undefined,
        }
      });
      return res.data;
    },
    enabled: subTab === 'EXPENSE'
  });

  // ─── QUERY KAS MASUK (DEPOSIT) ────────────────────────────────────────────
  const { data: depositRes, isLoading: depositLoading } = useQuery<{
    success: boolean;
    data: {
      summary: { totalDepositAmount: number; totalTransactions: number };
      items: CoopDepositItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>({
    queryKey: ['cooperative-deposits', page, limit, selectedCategory, search],
    queryFn: async () => {
      const res = await api.get('/cooperative/expenses/deposits', {
        params: {
          page,
          limit,
          accountCode: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          search: search.trim() || undefined,
        }
      });
      return res.data;
    },
    enabled: subTab === 'DEPOSIT'
  });

  // ─── QUERY TRANSFER KAS & BANK ────────────────────────────────────────────
  const { data: transferRes, isLoading: transferLoading } = useQuery<{
    success: boolean;
    data: {
      summary: { totalTransferAmount: number; totalTransactions: number };
      items: CoopTransferItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>({
    queryKey: ['cooperative-transfers', page, limit, search],
    queryFn: async () => {
      const res = await api.get('/cooperative/expenses/transfers', {
        params: {
          page,
          limit,
          search: search.trim() || undefined,
        }
      });
      return res.data;
    },
    enabled: subTab === 'TRANSFER'
  });

  // Invalidate queries helper (Centralized TanStack Query Consistency)
  const invalidateAllAccounting = useCallback(() => {
    invalidateAccountingCaches(queryClient);
  }, [queryClient]);

  // Mutations
  const expenseMutation = useMutation({
    mutationFn: async (payload: CoopExpenseFormData) => (await api.post('/cooperative/expenses', payload)).data,
    onSuccess: (res) => {
      invalidateAllAccounting();
      toast.success(res?.message || 'Pengeluaran operasional berhasil dicatat');
      setIsExpenseOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mencatat kas keluar')
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/cooperative/expenses/${id}`)).data,
    onSuccess: (res) => {
      invalidateAllAccounting();
      toast.success(res?.message || 'Pengeluaran berhasil dihapus');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus kas keluar')
  });

  const depositMutation = useMutation({
    mutationFn: async (payload: CoopDepositFormData) => (await api.post('/cooperative/expenses/deposits', payload)).data,
    onSuccess: (res) => {
      invalidateAllAccounting();
      toast.success(res?.message || 'Kas masuk berhasil dicatat');
      setIsDepositOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mencatat kas masuk')
  });

  const deleteDepositMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/cooperative/expenses/deposits/${id}`)).data,
    onSuccess: (res) => {
      invalidateAllAccounting();
      toast.success(res?.message || 'Bukti kas masuk berhasil dihapus');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus kas masuk')
  });

  const transferMutation = useMutation({
    mutationFn: async (payload: CoopTransferFormData) => (await api.post('/cooperative/expenses/transfers', payload)).data,
    onSuccess: (res) => {
      invalidateAllAccounting();
      toast.success(res?.message || 'Transfer kas & bank berhasil diproses');
      setIsTransferOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal melakukan transfer dana')
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/cooperative/expenses/transfers/${id}`)).data,
    onSuccess: (res) => {
      invalidateAllAccounting();
      toast.success(res?.message || 'Bukti transfer kas berhasil dibatalkan');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal membatalkan transfer')
  });

  // Handlers delete
  const handleDeleteExpense = useCallback(async (item: CoopExpenseItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Bukti Kas Keluar (BKK)',
      message: `Hapus pengeluaran "${item.voucherNumber}" (${item.categoryName}) sebesar Rp ${Math.round(item.amount).toLocaleString('id-ID')}? Entri jurnal terkait akan dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (isConfirmed) deleteExpenseMutation.mutate(item.id);
  }, [confirm, deleteExpenseMutation]);

  const handleDeleteDeposit = useCallback(async (item: CoopDepositItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Bukti Kas Masuk (BKM)',
      message: `Hapus kas masuk "${item.voucherNumber}" (${item.accountName}) sebesar Rp ${Math.round(item.amount).toLocaleString('id-ID')}? Entri jurnal terkait akan dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (isConfirmed) deleteDepositMutation.mutate(item.id);
  }, [confirm, deleteDepositMutation]);

  const handleDeleteTransfer = useCallback(async (item: CoopTransferItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Bukti Transfer Kas (TRF)',
      message: `Hapus transfer "${item.voucherNumber}" sebesar Rp ${Math.round(item.amount).toLocaleString('id-ID')}? Entri jurnal terkait akan dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (isConfirmed) deleteTransferMutation.mutate(item.id);
  }, [confirm, deleteTransferMutation]);

  // Columns Tables
  const expenseColumns = useMemo(() => [
    {
      label: 'No. BKK & Tanggal',
      key: 'voucherNumber',
      render: (_: string, row: CoopExpenseItem) => (
        <div>
          <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 block">{row.voucherNumber}</span>
          <span className="text-[11px] text-slate-500">{formatDate(row.date)}</span>
        </div>
      ),
    },
    {
      label: 'Akun & Kategori Beban',
      key: 'categoryCode',
      render: (_: string, row: CoopExpenseItem) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{row.categoryName}</span>
          <span className="font-mono text-[10px] text-slate-400">Akun: {row.categoryCode}</span>
        </div>
      ),
    },
    {
      label: 'Keterangan & Penerima',
      key: 'description',
      render: (_: string, row: CoopExpenseItem) => (
        <div>
          <span className="text-xs text-slate-700 dark:text-slate-300 block line-clamp-1">{row.description}</span>
          {row.payee && <span className="text-[10px] text-slate-500">Penerima: {row.payee}</span>}
        </div>
      ),
    },
    {
      label: 'Sumber Kas',
      key: 'paymentMethod',
      render: (m: string) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          m === 'BANK_TRANSFER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        }`}>
          {m === 'BANK_TRANSFER' ? 'Bank (1011)' : 'Tunai (1010)'}
        </span>
      ),
    },
    {
      label: 'Nominal',
      key: 'amount',
      render: (amt: number) => (
        <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
          - Rp {Math.round(amt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      label: 'Aksi',
      key: 'actions',
      render: (_: unknown, row: CoopExpenseItem) => (
        <Button size="sm" variant="outline" onClick={() => handleDeleteExpense(row)} className="p-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60">
          <Trash2 size={13} />
        </Button>
      ),
    },
  ], [handleDeleteExpense]);

  const depositColumns = useMemo(() => [
    {
      label: 'No. BKM & Tanggal',
      key: 'voucherNumber',
      render: (_: string, row: CoopDepositItem) => (
        <div>
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block">{row.voucherNumber}</span>
          <span className="text-[11px] text-slate-500">{formatDate(row.date)}</span>
        </div>
      ),
    },
    {
      label: 'Akun Sumber Pendapatan',
      key: 'accountCode',
      render: (_: string, row: CoopDepositItem) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{row.accountName}</span>
          <span className="font-mono text-[10px] text-slate-400">Akun: {row.accountCode}</span>
        </div>
      ),
    },
    {
      label: 'Keterangan & Penyetor',
      key: 'description',
      render: (_: string, row: CoopDepositItem) => (
        <div>
          <span className="text-xs text-slate-700 dark:text-slate-300 block line-clamp-1">{row.description}</span>
          {row.payer && <span className="text-[10px] text-slate-500">Dari: {row.payer}</span>}
        </div>
      ),
    },
    {
      label: 'Masuk Ke',
      key: 'receivedVia',
      render: (m: string) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          m === 'BANK_TRANSFER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        }`}>
          {m === 'BANK_TRANSFER' ? 'Bank (1011)' : 'Tunai (1010)'}
        </span>
      ),
    },
    {
      label: 'Nominal',
      key: 'amount',
      render: (amt: number) => (
        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
          + Rp {Math.round(amt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      label: 'Aksi',
      key: 'actions',
      render: (_: unknown, row: CoopDepositItem) => (
        <Button size="sm" variant="outline" onClick={() => handleDeleteDeposit(row)} className="p-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60">
          <Trash2 size={13} />
        </Button>
      ),
    },
  ], [handleDeleteDeposit]);

  const transferColumns = useMemo(() => [
    {
      label: 'No. TRF & Tanggal',
      key: 'voucherNumber',
      render: (_: string, row: CoopTransferItem) => (
        <div>
          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block">{row.voucherNumber}</span>
          <span className="text-[11px] text-slate-500">{formatDate(row.date)}</span>
        </div>
      ),
    },
    {
      label: 'Rekening Asal -> Tujuan',
      key: 'fromAccountCode',
      render: (_: string, row: CoopTransferItem) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {row.fromAccountCode === '1010' ? 'Kas Tunai (1010)' : 'Bank (1011)'}
          </span>
          <ArrowRightLeft size={12} className="text-slate-400" />
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {row.toAccountCode === '1010' ? 'Kas Tunai (1010)' : 'Bank (1011)'}
          </span>
        </div>
      ),
    },
    {
      label: 'Keterangan Transfer',
      key: 'description',
      render: (desc: string) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">{desc}</span>
      ),
    },
    {
      label: 'Nominal Ditransfer',
      key: 'amount',
      render: (amt: number) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          Rp {Math.round(amt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      label: 'Aksi',
      key: 'actions',
      render: (_: unknown, row: CoopTransferItem) => (
        <Button size="sm" variant="outline" onClick={() => handleDeleteTransfer(row)} className="p-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60">
          <Trash2 size={13} />
        </Button>
      ),
    },
  ], [handleDeleteTransfer]);

  // Active data selection
  const currentData = useMemo(() => {
    if (subTab === 'EXPENSE') return expenseRes?.data?.items || [];
    if (subTab === 'DEPOSIT') return depositRes?.data?.items || [];
    return transferRes?.data?.items || [];
  }, [subTab, expenseRes, depositRes, transferRes]);

  const currentSummary = useMemo(() => {
    if (subTab === 'EXPENSE') {
      return {
        amount: expenseRes?.data?.summary?.totalExpenseAmount || 0,
        count: expenseRes?.data?.summary?.totalTransactions || 0,
        label: 'Total Kas Keluar (Beban)',
        icon: TrendingDown,
        color: 'text-rose-600'
      };
    }
    if (subTab === 'DEPOSIT') {
      return {
        amount: depositRes?.data?.summary?.totalDepositAmount || 0,
        count: depositRes?.data?.summary?.totalTransactions || 0,
        label: 'Total Kas Masuk (Lainnya)',
        icon: TrendingUp,
        color: 'text-emerald-600'
      };
    }
    return {
      amount: transferRes?.data?.summary?.totalTransferAmount || 0,
      count: transferRes?.data?.summary?.totalTransactions || 0,
      label: 'Total Dana Dimutasi',
      icon: ArrowRightLeft,
      color: 'text-blue-600'
    };
  }, [subTab, expenseRes, depositRes, transferRes]);

  const currentPagination = useMemo(() => {
    if (subTab === 'EXPENSE') return expenseRes?.data?.pagination;
    if (subTab === 'DEPOSIT') return depositRes?.data?.pagination;
    return transferRes?.data?.pagination;
  }, [subTab, expenseRes, depositRes, transferRes]);

  const isCurrentLoading = subTab === 'EXPENSE' ? expenseLoading : subTab === 'DEPOSIT' ? depositLoading : transferLoading;

  // ─── ADAPTIVE MOBILE CARD DECKS (Pilar 30 Anti-Overlapping) ───────────────
  const renderMobileExpenseDeck = () => {
    if (expenseLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Memuat transaksi kas keluar...</p>
        </div>
      );
    }
    const items = expenseRes?.data?.items || [];
    if (items.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          Belum ada transaksi pengeluaran kas (BKK) yang tercatat.
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 transition-all"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60 shrink-0">
                  {item.voucherNumber}
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">
                  {formatDate(item.date)}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                item.paymentMethod === 'BANK_TRANSFER'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {item.paymentMethod === 'BANK_TRANSFER' ? 'Bank (1011)' : 'Tunai (1010)'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {item.categoryName}
                </span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  Akun: {item.categoryCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                {item.description}
              </p>
              {item.payee && (
                <p className="text-[11px] text-slate-500">
                  Penerima: <span className="font-medium text-slate-700 dark:text-slate-300">{item.payee}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                - Rp {Math.round(item.amount).toLocaleString('id-ID')}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteExpense(item)}
                className="p-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60"
                aria-label={`Hapus voucher ${item.voucherNumber}`}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Mobile Card Deck View for Kas Masuk (BKM)
  const renderMobileDepositDeck = () => {
    if (depositLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Memuat transaksi kas masuk...</p>
        </div>
      );
    }
    const items = depositRes?.data?.items || [];
    if (items.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          Belum ada transaksi penerimaan kas (BKM) yang tercatat.
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 transition-all"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                  {item.voucherNumber}
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">
                  {formatDate(item.date)}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                item.receivedVia === 'BANK_TRANSFER'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {item.receivedVia === 'BANK_TRANSFER' ? 'Bank (1011)' : 'Tunai (1010)'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {item.accountName}
                </span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  Akun: {item.accountCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                {item.description}
              </p>
              {item.payer && (
                <p className="text-[11px] text-slate-500">
                  Dari: <span className="font-medium text-slate-700 dark:text-slate-300">{item.payer}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                + Rp {Math.round(item.amount).toLocaleString('id-ID')}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteDeposit(item)}
                className="p-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60"
                aria-label={`Hapus voucher ${item.voucherNumber}`}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Mobile Card Deck View for Transfer Kas & Bank (TRF)
  const renderMobileTransferDeck = () => {
    if (transferLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Memuat transaksi transfer dana...</p>
        </div>
      );
    }
    const items = transferRes?.data?.items || [];
    if (items.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          Belum ada transaksi transfer kas & bank yang tercatat.
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 transition-all"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/60 shrink-0">
                  {item.voucherNumber}
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">
                  {formatDate(item.date)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
                <span>{item.fromAccountCode === '1010' ? 'Kas Tunai' : 'Bank'}</span>
                <ArrowRightLeft size={11} className="text-slate-400" />
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{item.toAccountCode === '1010' ? 'Kas Tunai' : 'Bank'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                Rp {Math.round(item.amount).toLocaleString('id-ID')}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteTransfer(item)}
                className="p-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60"
                aria-label={`Hapus voucher ${item.voucherNumber}`}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs Kas & Bank */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 text-xs font-semibold overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => handleSubTabChange('EXPENSE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
              subTab === 'EXPENSE'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight size={14} />
            <span>Kas Keluar (BKK)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('DEPOSIT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
              subTab === 'DEPOSIT'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft size={14} />
            <span>Kas Masuk (BKM)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('TRANSFER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
              subTab === 'TRANSFER'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft size={14} />
            <span>Transfer Kas & Bank (TRF)</span>
          </button>
        </div>

        {/* Action Button Desktop */}
        <div className="hidden sm:block">
          {subTab === 'EXPENSE' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsExpenseOpen(true)}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              <Plus size={14} />
              <span>Catat Kas Keluar (BKK)</span>
            </Button>
          )}
          {subTab === 'DEPOSIT' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsDepositOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Plus size={14} />
              <span>Catat Kas Masuk (BKM)</span>
            </Button>
          )}
          {subTab === 'TRANSFER' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsTransferOpen(true)}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Plus size={14} />
              <span>Transfer Dana Kas/Bank</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnalyticsCard
          title={currentSummary.label}
          value={`Rp ${Math.round(currentSummary.amount).toLocaleString('id-ID')}`}
          icon={currentSummary.icon}
          description="Total akumulasi nilai transaksi"
        />
        <AnalyticsCard
          title="Total Transaksi Tercatat"
          value={currentSummary.count}
          icon={Receipt}
          description="Jumlah dokumen voucher yang terbit"
        />
        <AnalyticsCard
          title="Rata-rata Nominal Transaksi"
          value={`Rp ${Math.round(currentSummary.count > 0 ? currentSummary.amount / currentSummary.count : 0).toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Rata-rata nominal per voucher"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-xs">
        {/* Search & Category Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                aria-label="Cari nomor dokumen atau rincian"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari no bukti, keterangan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {subTab === 'EXPENSE' && (
              <div className="w-full sm:w-56">
                <SearchableSelect
                  id="expense-cat-filter"
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(String(val));
                    setPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Semua Kategori Beban' },
                    { value: '5021', label: '5021 - Listrik & Air' },
                    { value: '5022', label: '5022 - Internet & Komunikasi' },
                    { value: '5023', label: '5023 - Aplikasi & TI' },
                    { value: '5024', label: '5024 - ATK & Kantor' },
                    { value: '5025', label: '5025 - Pemeliharaan Sarana' },
                    { value: '5026', label: '5026 - Operasional Pengurus' },
                    { value: '5090', label: '5090 - Beban Lain-lain' },
                  ]}
                  placeholder="Kategori Beban"
                  aria-label="Filter Kategori Beban"
                />
              </div>
            )}

            {subTab === 'DEPOSIT' && (
              <div className="w-full sm:w-56">
                <SearchableSelect
                  id="deposit-cat-filter"
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(String(val));
                    setPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Semua Sumber Penerimaan' },
                    { value: '4030', label: '4030 - Sewa & Kerjasama' },
                    { value: '4040', label: '4040 - Jasa Giro & Bank' },
                    { value: '4090', label: '4090 - Pendapatan Lain-lain' },
                    { value: '3020', label: '3020 - Hibah & Sumbangan' },
                  ]}
                  placeholder="Sumber Pendapatan"
                  aria-label="Filter Sumber Pendapatan"
                />
              </div>
            )}
          </div>
        </div>

        {/* Table Render (Desktop Table vs Mobile Adaptive Deck) */}
        {subTab === 'EXPENSE' && (
          isMobile ? renderMobileExpenseDeck() : (
            <Table
              data={currentData}
              columns={expenseColumns}
              loading={isCurrentLoading}
              emptyMessage="Belum ada transaksi pengeluaran kas (BKK) yang tercatat."
            />
          )
        )}

        {subTab === 'DEPOSIT' && (
          isMobile ? renderMobileDepositDeck() : (
            <Table
              data={currentData}
              columns={depositColumns}
              loading={isCurrentLoading}
              emptyMessage="Belum ada transaksi penerimaan kas (BKM) yang tercatat."
            />
          )
        )}

        {subTab === 'TRANSFER' && (
          isMobile ? renderMobileTransferDeck() : (
            <Table
              data={currentData}
              columns={transferColumns}
              loading={isCurrentLoading}
              emptyMessage="Belum ada transaksi transfer kas & bank yang tercatat."
            />
          )
        )}

        {/* Pagination */}
        {(currentPagination?.totalPages || 1) > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Halaman {page} dari {currentPagination?.totalPages || 1} ({currentPagination?.total || 0} transaksi)
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= (currentPagination?.totalPages || 1)}
                onClick={() => setPage(p => Math.min(currentPagination?.totalPages || 1, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) on Mobile Devices (Pilar 30 Anti-Overlapping) */}
      {isMobile && (
        <button
          type="button"
          onClick={() => {
            if (subTab === 'EXPENSE') setIsExpenseOpen(true);
            else if (subTab === 'DEPOSIT') setIsDepositOpen(true);
            else setIsTransferOpen(true);
          }}
          aria-label={
            subTab === 'EXPENSE'
              ? 'Catat Kas Keluar (BKK)'
              : subTab === 'DEPOSIT'
              ? 'Catat Kas Masuk (BKM)'
              : 'Transfer Dana Kas/Bank'
          }
          className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl text-white transition-all transform active:scale-95 focus:outline-hidden ${
            subTab === 'EXPENSE'
              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/40'
              : subTab === 'DEPOSIT'
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/40'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/40'
          }`}
        >
          <Plus size={24} className="stroke-[2.5]" />
        </button>
      )}

      {/* Modals Form */}
      <ExpenseFormModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        onSubmit={(payload) => expenseMutation.mutate(payload)}
        isLoading={expenseMutation.isPending}
      />

      <DepositFormModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSubmit={(payload) => depositMutation.mutate(payload)}
        isLoading={depositMutation.isPending}
      />

      <TransferFormModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSubmit={(payload) => transferMutation.mutate(payload)}
        isLoading={transferMutation.isPending}
      />
    </div>
  );
});
