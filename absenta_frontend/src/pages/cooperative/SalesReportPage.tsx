import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  DollarSign, ShoppingCart, TrendingUp, Coins, Receipt, Award,
  Calendar, Search, Download, RefreshCw, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axiosInstance';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Badge } from '../../components/ui';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { exportDataToExcel } from '../../utils/export.utils';
import { formatDate } from '../../utils/date.utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSocket } from '@/hooks/useSocket';
import { COOP_QUERY_KEYS, invalidateSalesReportCaches } from '../../lib/coopQueryKeys';

// Lazy Loaded Subcomponents (Pilar 11 & Pilar 21 Hardening)
const ReceiptModal = lazy(() => import('./components/ReceiptModal').then(m => ({ default: m.ReceiptModal })));
const CoopSalesReportMobileDeck = lazy(() => import('../../components/cooperative/sales/CoopSalesReportMobileDeck'));
const SalesReportKpiCards = lazy(() => import('./components/SalesReportKpiCards'));

// Zod Schema Guard (Pilar 25 Hardening)
const filterSchema = z.object({
  preset: z.enum(['TODAY', '7DAYS', 'THIS_MONTH', 'CUSTOM']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  search: z.string().optional(),
});

type PresetType = 'TODAY' | '7DAYS' | 'THIS_MONTH' | 'CUSTOM';
type TabType = 'transactions' | 'top-products' | 'daily';

interface SalesSummaryData {
  totalSales: number;
  totalTransactions: number;
  avgBasketSize: number;
  totalItemsSold: number;
  totalEstimatedGrossProfit: number;
  grossProfitMarginPct: number;
  paymentBreakdown: {
    CASH: { total: number; count: number };
    SAVING: { total: number; count: number };
    OTHER: { total: number; count: number };
  };
}

interface SaleTransactionItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  quantity: number;
  price: number;
  costPrice: number;
  subtotal: number;
}

interface SaleTransaction {
  id: string;
  date: string;
  total: number;
  paymentMethod: string;
  cashAmount: number | null;
  changeAmount: number | null;
  discount: number;
  voucherCode: string | null;
  itemCount: number;
  customerName: string;
  customerIdentifier: string;
  items: SaleTransactionItem[];
}

interface TopProductItem {
  productId: string;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  qtySold: number;
  totalRevenue: number;
  estimatedGrossProfit: number;
  marginPct: number;
}

interface DailySalesItem {
  date: string;
  transactionCount: number;
  cashTotal: number;
  savingTotal: number;
  otherTotal: number;
  grandTotal: number;
  totalItems: number;
}

interface ReceiptSale {
  id: string;
  date: Date;
  total: number;
  paymentMethod: 'CASH' | 'SAVING';
  cashAmount?: number;
  changeAmount?: number;
  discount: number;
  voucherCode?: string;
  memberId: string | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: { id: string; name: string; code: string; price: number };
  }[];
}

const SalesReportPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [preset, setPreset] = useState<PresetType>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isExporting, setIsExporting] = useState(false);

  // Modal State
  const [selectedSale, setSelectedSale] = useState<ReceiptSale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const { subscribe, unsubscribe, isConnected } = useSocket();

  // Realtime Live Sync via WebSocket (Phase 4 Hardening)
  const handleRealtimeSalesUpdate = useCallback(() => {
    invalidateSalesReportCaches(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (!isConnected) return;

    subscribe('coop_sales_update', handleRealtimeSalesUpdate);
    subscribe('coop_pos_update', handleRealtimeSalesUpdate);
    subscribe('cooperative_sync', handleRealtimeSalesUpdate);

    return () => {
      unsubscribe('coop_sales_update', handleRealtimeSalesUpdate);
      unsubscribe('coop_pos_update', handleRealtimeSalesUpdate);
      unsubscribe('cooperative_sync', handleRealtimeSalesUpdate);
    };
  }, [isConnected, subscribe, unsubscribe, handleRealtimeSalesUpdate]);

  // Tanggal Efektif
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const formatIsoDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'TODAY') {
      const today = formatIsoDate(now);
      return { startDate: today, endDate: today };
    }
    if (preset === '7DAYS') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      return { startDate: formatIsoDate(past), endDate: formatIsoDate(now) };
    }
    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatIsoDate(firstDay), endDate: formatIsoDate(lastDay) };
    }
    return { startDate: customStartDate, endDate: customEndDate };
  }, [preset, customStartDate, customEndDate]);

  // Query 1: Ringkasan KPI (Centralized Cache Phase 3 & 4)
  const summaryQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.salesSummary(startDate, endDate, paymentMethod),
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/sales-report/summary', {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          paymentMethod: paymentMethod !== 'ALL' ? paymentMethod : undefined,
        }
      });
      return res.data?.data as SalesSummaryData;
    },
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const summary = useMemo(() => summaryQuery.data || {
    totalSales: 0, totalTransactions: 0, avgBasketSize: 0, totalItemsSold: 0,
    totalEstimatedGrossProfit: 0, grossProfitMarginPct: 0,
    paymentBreakdown: { CASH: { total: 0, count: 0 }, SAVING: { total: 0, count: 0 }, OTHER: { total: 0, count: 0 } }
  }, [summaryQuery.data]);

  // Query 2: Transaksi Berpaginasi (Centralized Cache Phase 3 & 4)
  const transactionsQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.salesTransactions(page, limit, startDate, endDate, paymentMethod, search),
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/sales-report/transactions', {
        params: {
          page, limit,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          paymentMethod: paymentMethod !== 'ALL' ? paymentMethod : undefined,
          search: search.trim() || undefined,
        }
      });
      return res.data?.data as {
        items: SaleTransaction[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },
    enabled: activeTab === 'transactions',
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const transactionList = useMemo(() => transactionsQuery.data?.items || [], [transactionsQuery.data]);
  const totalPages = transactionsQuery.data?.pagination?.totalPages || 1;
  const totalTransactionsCount = transactionsQuery.data?.pagination?.total || 0;

  // Query 3: Produk Terlaris (Centralized Cache Phase 3 & 4)
  const topProductsQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.salesTopProducts(startDate, endDate),
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/sales-report/top-products', {
        params: { startDate: startDate || undefined, endDate: endDate || undefined, limit: 15 }
      });
      return res.data?.data as TopProductItem[];
    },
    enabled: activeTab === 'top-products',
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const topProducts = useMemo(() => topProductsQuery.data || [], [topProductsQuery.data]);

  // Query 4: Rekap Harian (Centralized Cache Phase 3 & 4)
  const dailyQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.salesDaily(startDate, endDate),
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/sales-report/daily', {
        params: { startDate: startDate || undefined, endDate: endDate || undefined }
      });
      return res.data?.data as DailySalesItem[];
    },
    enabled: activeTab === 'daily',
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const dailyList = useMemo(() => dailyQuery.data || [], [dailyQuery.data]);

  // Tabs
  const tabOptions: TabOption[] = useMemo(() => [
    { id: 'transactions', label: 'Daftar Struk & Transaksi', icon: <Receipt size={16} />, badge: totalTransactionsCount > 0 ? totalTransactionsCount : undefined },
    { id: 'top-products', label: 'Produk Terlaris (Top 15)', icon: <Award size={16} /> },
    { id: 'daily', label: 'Rekap Harian Kasir (Z-Report)', icon: <Calendar size={16} /> },
  ], [totalTransactionsCount]);

  // Ekspor Excel
  const handleExportExcel = useCallback(async () => {
    if (transactionList.length === 0) {
      toast.error('Tidak ada data transaksi untuk diekspor pada filter ini');
      return;
    }
    try {
      setIsExporting(true);
      const exportRows = transactionList?.map((t, idx) => ({
        No: idx + 1,
        'No. Struk': t.id,
        Tanggal: formatDate(t.date),
        Pelanggan: t.customerName,
        'Metode Bayar': t.paymentMethod === 'CASH' ? 'Tunai' : (t.paymentMethod === 'SAVING' ? 'Potong Simpanan' : t.paymentMethod),
        'Jumlah Item': t.itemCount,
        'Total Belanja (Rp)': t.total,
        'Diskon (Rp)': t.discount,
        'Kode Voucher': t.voucherCode || '-',
      }));
      exportDataToExcel(exportRows, `Laporan_Penjualan_Koperasi_${startDate || 'all'}_sd_${endDate || 'all'}`);
      toast.success('Laporan penjualan berhasil diekspor ke Excel');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  }, [transactionList, startDate, endDate]);

  const handleOpenReceipt = useCallback((sale: SaleTransaction) => {
    setSelectedSale({
      id: sale.id,
      date: new Date(sale.date),
      total: sale.total,
      paymentMethod: (sale.paymentMethod === 'SAVING' ? 'SAVING' : 'CASH'),
      cashAmount: sale.cashAmount || undefined,
      changeAmount: sale.changeAmount || undefined,
      discount: sale.discount || 0,
      voucherCode: sale.voucherCode || undefined,
      memberId: null,
      items: sale.items?.map(it => ({
        id: it.id,
        quantity: it.quantity,
        price: it.price,
        product: { id: it.productId, name: it.productName, code: it.productCode, price: it.price }
      }))
    });
    setIsReceiptOpen(true);
  }, []);

  // Kolom Transaksi
  const transactionColumns = useMemo(() => [
    {
      label: 'Waktu & No. Struk',
      key: 'id',
      sortable: true,
      render: (_: string, row: SaleTransaction) => (
        <div>
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">#{row.id.substring(0, 8)}...</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(row.date)}</span>
        </div>
      )
    },
    {
      label: 'Pelanggan / Anggota',
      key: 'customerName',
      sortable: true,
      render: (val: string, row: SaleTransaction) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">{val}</span>
          <span className="text-[10px] text-slate-400 font-mono">ID: {row.customerIdentifier}</span>
        </div>
      )
    },
    {
      label: 'Metode Bayar',
      key: 'paymentMethod',
      sortable: true,
      render: (method: string) => (
        <Badge variant={method === 'CASH' ? 'success' : (method === 'SAVING' ? 'info' : 'secondary')} className="text-[10px]">
          {method === 'CASH' ? 'Tunai (Cash)' : (method === 'SAVING' ? 'Potong Simpanan' : method)}
        </Badge>
      )
    },
    {
      label: 'Item',
      key: 'itemCount',
      sortable: true,
      render: (count: number) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{count} unit</span>
    },
    {
      label: 'Total Belanja',
      key: 'total',
      sortable: true,
      render: (total: number) => <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Rp {Math.round(total).toLocaleString('id-ID')}</span>
    },
    {
      label: 'Aksi',
      key: 'actions',
      render: (_: unknown, row: SaleTransaction) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenReceipt(row)}
          className="gap-1 text-xs py-1 px-2.5 h-8 text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800"
          title="Lihat & Cetak Ulang Struk"
        >
          <Eye size={13} />
          <span>Struk</span>
        </Button>
      )
    }
  ], [handleOpenReceipt]);

  // Kolom Top Produk
  const topProductColumns = useMemo(() => [
    {
      label: 'Peringkat',
      key: 'rank',
      render: (_: unknown, __: TopProductItem, idx: number) => (
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
          idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300' :
          idx === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
          idx === 2 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
          'text-slate-500 font-semibold'
        }`}>
          {idx + 1}
        </span>
      )
    },
    {
      label: 'Produk',
      key: 'name',
      sortable: true,
      render: (_: string, row: TopProductItem) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{row.name}</span>
          <span className="font-mono text-[10px] text-slate-400">{row.code} • {row.category}</span>
        </div>
      )
    },
    {
      label: 'Harga Satuan',
      key: 'unitPrice',
      sortable: true,
      render: (val: number) => <span className="text-xs text-slate-600 dark:text-slate-400">Rp {Math.round(val).toLocaleString('id-ID')}</span>
    },
    {
      label: 'Terjual',
      key: 'qtySold',
      sortable: true,
      render: (qty: number) => <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">{qty.toLocaleString('id-ID')} unit</span>
    },
    {
      label: 'Kontribusi Omset',
      key: 'totalRevenue',
      sortable: true,
      render: (rev: number) => <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Rp {Math.round(rev).toLocaleString('id-ID')}</span>
    },
    {
      label: 'Estimasi Margin',
      key: 'estimatedGrossProfit',
      sortable: true,
      render: (profit: number, row: TopProductItem) => (
        <div>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">Rp {Math.round(profit).toLocaleString('id-ID')}</span>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-semibold">{row.marginPct}% Margin</span>
        </div>
      )
    }
  ], []);

  // Kolom Rekap Harian
  const dailyColumns = useMemo(() => [
    {
      label: 'Tanggal Penjualan',
      key: 'date',
      sortable: true,
      render: (date: string) => <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{formatDate(date)}</span>
    },
    {
      label: 'Jumlah Transaksi',
      key: 'transactionCount',
      sortable: true,
      render: (count: number) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{count} transaksi</span>
    },
    {
      label: 'Penerimaan Tunai',
      key: 'cashTotal',
      sortable: true,
      render: (val: number) => <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">Rp {Math.round(val).toLocaleString('id-ID')}</span>
    },
    {
      label: 'Potong Simpanan',
      key: 'savingTotal',
      sortable: true,
      render: (val: number) => <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs">Rp {Math.round(val).toLocaleString('id-ID')}</span>
    },
    {
      label: 'Total Omset Harian',
      key: 'grandTotal',
      sortable: true,
      render: (val: number) => <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">Rp {Math.round(val).toLocaleString('id-ID')}</span>
    }
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative' },
    { label: 'Laporan Penjualan Toko', path: '/cooperative/sales-report' },
  ], []);

  const presetButtons = useMemo(() => [
    { id: 'TODAY' as const, label: 'Hari Ini' },
    { id: '7DAYS' as const, label: '7 Hari Terakhir' },
    { id: 'THIS_MONTH' as const, label: 'Bulan Ini' },
    { id: 'CUSTOM' as const, label: 'Kustom Kalender' },
  ], []);

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Laporan Penjualan Toko">
      <AcademicPageLayout
        title="Laporan Penjualan Toko Koperasi"
        description="Rekapitulasi penjualan ritel, transaksi kasir POS harian, omset, dan analisis produk terlaris minimarket sekolah"
        hardeningModuleKey="coop_sales_report"
        breadcrumbs={breadcrumbs}
        topSlot={<WorkspaceAppLauncherCard workspaceId="COOPERATIVE_WORKSPACE" />}
        instruction={{
          title: 'Panduan Operasional Laporan Penjualan',
          description: 'Kelola dan audit transaksi kasir, analisis produk fast-moving, dan lakukan rekonsiliasi kas riil toko.',
          items: [
            { text: 'Pilih preset rentang tanggal (Hari Ini, 7 Hari Terakhir, Bulan Ini) atau tentukan periode kalender kustom.' },
            { text: 'Pantau kartu analitik untuk melihat total omset kotor, rata-rata belanja, dan estimasi keuntungan kotor.' },
            { text: 'Gunakan Tab "Rekap Harian (Z-Report)" saat tutup toko untuk mencocokkan uang fisik di laci kasir dengan sistem.' },
            { text: 'Tinjau Tab "Produk Terlaris" untuk mengidentifikasi barang fast-moving sebagai acuan belanja kulakan ke supplier.' },
          ],
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">

            {/* ── Filter Toolbar Global ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">Periode:</span>
                  {presetButtons?.map(btn => (
                    <Button
                      key={btn.id}
                      size="sm"
                      variant="outline"
                      onClick={() => setPreset(btn.id)}
                      className={`text-xs py-1 px-3 h-8 ${preset === btn.id ? 'bg-indigo-600 text-white font-bold' : ''}`}
                    >
                      {btn.label}
                    </Button>
                  ))}

                  {preset === 'CUSTOM' && (
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <input
                        type="date"
                        aria-label="Tanggal Mulai"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                      />
                      <span className="text-xs text-slate-400">s/d</span>
                      <input
                        type="date"
                        aria-label="Tanggal Akhir"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-44">
                    <SearchableSelect
                      id="sales-payment-method-filter"
                      value={paymentMethod}
                      onChange={val => {
                        setPaymentMethod(String(val));
                        setPage(1);
                      }}
                      options={[
                        { value: 'ALL', label: 'Semua Metode Bayar' },
                        { value: 'CASH', label: 'Tunai (Cash)' },
                        { value: 'SAVING', label: 'Potong Simpanan' },
                      ]}
                      placeholder="Metode Bayar"
                      aria-label="Filter Metode Pembayaran"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      summaryQuery.refetch();
                      transactionsQuery.refetch();
                      topProductsQuery.refetch();
                      dailyQuery.refetch();
                      toast.success('Data laporan penjualan diperbarui');
                    }}
                    className="h-8 gap-1 text-xs"
                    title="Segarkan Data"
                  >
                    <RefreshCw size={13} className={summaryQuery.isFetching ? 'animate-spin' : ''} />
                    <span>Segarkan</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isExporting}
                    onClick={handleExportExcel}
                    className="h-8 gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    title="Unduh Data ke Spreadsheet Excel"
                  >
                    <Download size={13} className={isExporting ? 'animate-spin' : ''} />
                    <span>{isExporting ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Analytics KPI Cards ── */}
            <Suspense fallback={<div className="h-28 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl" />}>
              <SalesReportKpiCards summary={summary} />
            </Suspense>

            {/* ── Tab Content ── */}
            <SectionCard fullWidth noPadding>
              <div className="p-6 space-y-4">
                <TabSwitcher
                  tabs={tabOptions}
                  activeTab={activeTab}
                  onChange={(tabId) => {
                    setActiveTab(tabId as TabType);
                    setPage(1);
                  }}
                />

                {activeTab === 'transactions' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <input
                          type="text"
                          aria-label="Cari struk atau nama pelanggan"
                          value={search}
                          onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                          }}
                          placeholder="Cari ID struk atau nama..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Menampilkan {transactionList.length} dari {totalTransactionsCount} struk belanja
                      </span>
                    </div>

                    {isMobile ? (
                      <div className="space-y-3 w-full max-w-full min-w-0">
                        <CoopSalesReportMobileDeck
                          activeTab="transactions"
                          transactions={transactionList}
                          topProducts={[]}
                          dailySales={[]}
                          loading={transactionsQuery.isLoading}
                          onOpenReceipt={(saleId) => {
                            const found = transactionList.find(t => t.id === saleId);
                            if (found) handleOpenReceipt(found);
                          }}
                        />

                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-2 px-1 text-xs w-full max-w-full min-w-0">
                            <span className="text-slate-500 text-[11px] truncate">
                              Hal. {page} / {totalPages} ({totalTransactionsCount} struk)
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="min-h-[36px] min-w-[36px] px-2.5 text-xs rounded-xl"
                              >
                                Sebelumnya
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="min-h-[36px] min-w-[36px] px-2.5 text-xs rounded-xl"
                              >
                                Selanjutnya
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Table
                        data={transactionList}
                        columns={transactionColumns}
                        loading={transactionsQuery.isLoading}
                        emptyMessage="Belum ada transaksi penjualan pada rentang tanggal yang dipilih."
                        actions={<div className="text-xs font-semibold text-slate-600">Total: {totalTransactionsCount} Transaksi</div>}
                        pagination={{
                          currentPage: page,
                          totalPages,
                          totalItems: totalTransactionsCount,
                          onPageChange: (newPage) => setPage(newPage),
                          onLimitChange: (newLimit) => setLimit(newLimit),
                        }}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'top-products' && (
                  <div className="space-y-4">
                    {isMobile ? (
                      <CoopSalesReportMobileDeck
                        activeTab="top-products"
                        transactions={[]}
                        topProducts={topProducts}
                        dailySales={[]}
                        loading={topProductsQuery.isLoading}
                        onOpenReceipt={() => {}}
                      />
                    ) : (
                      <Table
                        data={topProducts}
                        columns={topProductColumns}
                        loading={topProductsQuery.isLoading}
                        emptyMessage="Belum ada data produk terjual pada rentang tanggal ini."
                        actions={<div className="text-xs font-semibold text-slate-600">Top 15 Produk Terlaris</div>}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'daily' && (
                  <div className="space-y-4">
                    {isMobile ? (
                      <CoopSalesReportMobileDeck
                        activeTab="daily"
                        transactions={[]}
                        topProducts={[]}
                        dailySales={dailyList}
                        loading={dailyQuery.isLoading}
                        onOpenReceipt={() => {}}
                      />
                    ) : (
                      <Table
                        data={dailyList}
                        columns={dailyColumns}
                        loading={dailyQuery.isLoading}
                        emptyMessage="Belum ada data rekap penjualan harian pada rentang tanggal ini."
                        actions={<div className="text-xs font-semibold text-slate-600">Rekap Harian Kasir (Z-Report)</div>}
                      />
                    )}
                  </div>
                )}
              </div>
            </SectionCard>

          </div>
        </SectionCard>

        {/* Modal Struk Belanja */}
        {selectedSale && (
          <Suspense fallback={null}>
            <ReceiptModal
              isOpen={isReceiptOpen}
              onClose={() => {
                setIsReceiptOpen(false);
                setSelectedSale(null);
              }}
              selectedSale={selectedSale as unknown as Parameters<typeof ReceiptModal>[0]['selectedSale']}
              coopSettings={{
                cooperative_name: 'KOPERASI SEKOLAH',
                cooperative_address: 'Minimarket & Kantin Sekolah',
                cooperative_phone: '-',
                cooperative_code: 'COOP-POS',
                receipt_footer: 'Terima kasih telah berbelanja di Koperasi Sekolah',
              }}
              memberInfo={null}
              user={null}
              printReceipt={() => window.print()}
            />
          </Suspense>
        )}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default SalesReportPage;
