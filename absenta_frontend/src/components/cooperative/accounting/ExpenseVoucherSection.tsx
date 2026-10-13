import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  DollarSign, 
  Calendar, 
  Building2, 
  Tag, 
  CreditCard,
  Filter,
  TrendingDown
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
import type { CoopExpenseItem, CoopExpenseFormData } from './types';
import { useIsMobile } from '@/hooks/useIsMobile';

export const ExpenseVoucherSection: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Expenses
  const { data: response, isLoading } = useQuery<{
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
    }
  });

  const expenseItems = useMemo(() => response?.data?.items || [], [response]);
  const summary = useMemo(() => response?.data?.summary || { totalExpenseAmount: 0, totalTransactions: 0 }, [response]);
  const totalPages = response?.data?.pagination?.totalPages || 1;
  const totalItems = response?.data?.pagination?.total || 0;

  // Create Expense Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: CoopExpenseFormData) => {
      const res = await api.post('/cooperative/expenses', payload);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cooperative-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-balance-sheet-report'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-journals'] });
      toast.success(res?.message || 'Pengeluaran operasional berhasil dicatat');
      setIsModalOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat pengeluaran operasional');
    }
  });

  // Delete Expense Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cooperative/expenses/${id}`);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cooperative-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-balance-sheet-report'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-journals'] });
      toast.success(res?.message || 'Pengeluaran operasional berhasil dihapus');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus bukti kas keluar');
    }
  });

  const handleDelete = useCallback(async (item: CoopExpenseItem) => {
    const isConfirmed = await confirm({
      title: 'Hapus Bukti Kas Keluar (BKK)',
      message: `Apakah Anda yakin ingin menghapus pengeluaran "${item.voucherNumber}" (${item.categoryName}) sebesar Rp ${Math.round(item.amount).toLocaleString('id-ID')}? Entri jurnal terkait di buku besar akan otomatis dibatalkan.`,
      confirmText: 'Hapus Pengeluaran',
      cancelText: 'Batal',
      type: 'danger',
    });

    if (isConfirmed) {
      deleteMutation.mutate(item.id);
    }
  }, [confirm, deleteMutation]);

  const columns = useMemo(() => [
    {
      label: 'No. BKK & Tanggal',
      key: 'voucherNumber',
      sortable: true,
      render: (_: string, row: CoopExpenseItem) => (
        <div>
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
            {row.voucherNumber}
          </span>
          <span className="text-[11px] text-slate-500">
            {formatDate(row.date)}
          </span>
        </div>
      ),
    },
    {
      label: 'Akun & Kategori Beban',
      key: 'categoryCode',
      render: (_: string, row: CoopExpenseItem) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
            {row.categoryName}
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            Kode Akun: {row.categoryCode}
          </span>
        </div>
      ),
    },
    {
      label: 'Keterangan & Penerima',
      key: 'description',
      render: (_: string, row: CoopExpenseItem) => (
        <div>
          <span className="text-xs text-slate-700 dark:text-slate-300 block line-clamp-1">
            {row.description}
          </span>
          {row.payee && (
            <span className="text-[10px] text-slate-500">
              Penerima: <strong className="text-slate-600 dark:text-slate-400">{row.payee}</strong>
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'Sumber Kas',
      key: 'paymentMethod',
      render: (method: string) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          method === 'BANK_TRANSFER'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        }`}>
          {method === 'BANK_TRANSFER' ? 'Bank (1011)' : 'Tunai (1010)'}
        </span>
      ),
    },
    {
      label: 'Nominal',
      key: 'amount',
      sortable: true,
      render: (amt: number) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          Rp {Math.round(amt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      label: 'Aksi',
      key: 'actions',
      render: (_: unknown, row: CoopExpenseItem) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDelete(row)}
          className="p-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950"
          title="Hapus Pengeluaran"
        >
          <Trash2 size={13} />
        </Button>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnalyticsCard
          title="Total Beban Operasional"
          value={`Rp ${Math.round(summary.totalExpenseAmount).toLocaleString('id-ID')}`}
          icon={TrendingDown}
          description="Total akumulasi kas keluar untuk operasional"
        />
        <AnalyticsCard
          title="Jumlah Bukti Kas Keluar (BKK)"
          value={summary.totalTransactions}
          icon={Receipt}
          description="Dokumen pengeluaran operasional yang tercatat"
        />
        <AnalyticsCard
          title="Rata-rata Pengeluaran"
          value={`Rp ${Math.round(summary.totalTransactions > 0 ? summary.totalExpenseAmount / summary.totalTransactions : 0).toLocaleString('id-ID')}`}
          icon={DollarSign}
          description="Rata-rata nominal per transaksi BKK"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-xs">
        {/* Toolbar Filter & Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                aria-label="Cari no BKK, keterangan, atau penerima"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari no BKK, keterangan, vendor..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div className="w-56">
              <SearchableSelect
                id="expense-category-filter"
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(String(val));
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Semua Kategori Beban' },
                  { value: '5021', label: '5021 - Beban Listrik & Air' },
                  { value: '5022', label: '5022 - Beban Komunikasi & Internet' },
                  { value: '5023', label: '5023 - Beban Aplikasi & TI' },
                  { value: '5024', label: '5024 - Beban ATK & Perlengkapan' },
                  { value: '5025', label: '5025 - Beban Pemeliharaan Sarana' },
                  { value: '5026', label: '5026 - Beban Operasional Pengurus' },
                  { value: '5090', label: '5090 - Beban Lain-lain' },
                ]}
                placeholder="Filter Kategori"
                aria-label="Filter Kategori Beban"
              />
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            <Plus size={14} />
            <span>Catat Kas Keluar (BKK)</span>
          </Button>
        </div>

        {/* Data Table */}
        <Table
          data={expenseItems}
          columns={columns}
          loading={isLoading}
          emptyMessage="Belum ada transaksi pengeluaran operasional (BKK) yang tercatat."
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Halaman {page} dari {totalPages} ({totalItems} transaksi)
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
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
});
