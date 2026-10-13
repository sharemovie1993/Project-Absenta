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

  // Invalidate queries helper
  const invalidateAllAccounting = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cooperative-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-deposits'] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['koperasi-income-statement'] });
    queryClient.invalidateQueries({ queryKey: ['koperasi-balance-sheet-report'] });
    queryClient.invalidateQueries({ queryKey: ['cooperative-journals'] });
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

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs Kas & Bank */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleSubTabChange('EXPENSE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'TRANSFER'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft size={14} />
            <span>Transfer Kas & Bank (TRF)</span>
          </button>
        </div>

        {/* Action Button */}
        <div>
          {subTab === 'EXPENSE' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsExpenseOpen(true)}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
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
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
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
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
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
          <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
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
              <div className="w-56">
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
              <div className="w-56">
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

        {/* Table Render */}
        {subTab === 'EXPENSE' && (
          <Table
            data={currentData}
            columns={expenseColumns}
            loading={isCurrentLoading}
            emptyMessage="Belum ada transaksi pengeluaran kas (BKK) yang tercatat."
          />
        )}

        {subTab === 'DEPOSIT' && (
          <Table
            data={currentData}
            columns={depositColumns}
            loading={isCurrentLoading}
            emptyMessage="Belum ada transaksi penerimaan kas (BKM) yang tercatat."
          />
        )}

        {subTab === 'TRANSFER' && (
          <Table
            data={currentData}
            columns={transferColumns}
            loading={isCurrentLoading}
            emptyMessage="Belum ada transaksi transfer kas & bank yang tercatat."
          />
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
