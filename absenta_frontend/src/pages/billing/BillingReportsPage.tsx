import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  CreditCard, 
  Users, 
  BarChart3,
  Filter,
  RefreshCw,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import UnifiedBillingLayout from '@/components/billing/UnifiedBillingLayout';
import { 
  Button, 
  Loader, 
  EnhancedAlert,
  Input,
  StatusBadge,
  SectionCard,
  Card
} from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import type { 
  ReportData, 
  ReportFilters, 
  PaymentGatewayStats,
  SubscriptionTrends,
  RevenueBreakdown
} from '@/types/billing';
import {
  getRevenueReport,
  getPaymentGatewayStats,
  getSubscriptionTrends,
  getRevenueBreakdown,
  generateReport,
  exportReport,
  scheduleReport,
} from '@/api/reports.api';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/layoutUtils';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { toast } from 'react-hot-toast';

// Lazy loaded components (Pilar 11)
const Modal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.Modal })));
const SearchableSelect = lazy(() => import('@/components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

interface ExtendedReportData extends ReportData {
  arpu?: number;
  churn_rate?: number;
}

interface ExtendedPaymentGatewayStats extends PaymentGatewayStats {
  gateway?: string;
  success_count?: number;
  total_amount?: number;
}

// Zod Schema Validation Guard (Pilar 25)
const scheduleReportSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  email: z.string().email('Format email tidak valid'),
  report_types: z.array(z.string()).min(1, 'Pilih minimal satu tipe laporan'),
  next_run: z.string().optional(),
});

export const BillingReportsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<ReportFilters>({
    report_type: 'revenue',
    date_range: 'last_30_days',
    start_date: '',
    end_date: '',
    tenant_ids: [],
    plan_ids: [],
    status: 'all'
  });

  // Schedule Report State
  const [scheduleData, setScheduleData] = useState({
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
    email: '',
    report_types: ['revenue'] as string[],
    next_run: ''
  });

  // React Query Fetching (Pilar 31)
  const { data: revenueData, isLoading: loadingRevenue, refetch: refetchRevenue } = useQuery({
    queryKey: ['billing-reports-revenue', filters],
    queryFn: async () => {
      const res = await getRevenueReport(filters);
      return res?.data as ExtendedReportData | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: paymentStats = [], isLoading: loadingPayments, refetch: refetchPayments } = useQuery<ExtendedPaymentGatewayStats[]>({
    queryKey: ['billing-reports-payment-gateways'],
    queryFn: async () => {
      const res = await getPaymentGatewayStats();
      return (res?.data || []) as ExtendedPaymentGatewayStats[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: subscriptionTrends, isLoading: loadingTrends, refetch: refetchTrends } = useQuery({
    queryKey: ['billing-reports-trends', filters],
    queryFn: async () => {
      const res = await getSubscriptionTrends(filters);
      return res?.data as SubscriptionTrends | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: revenueBreakdown, isLoading: loadingBreakdown, refetch: refetchBreakdown } = useQuery({
    queryKey: ['billing-reports-breakdown', filters],
    queryFn: async () => {
      const res = await getRevenueBreakdown(filters);
      return res?.data as RevenueBreakdown | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = loadingRevenue || loadingPayments || loadingTrends || loadingBreakdown;

  // Mutations (Pilar 32)
  const generateMutation = useMutation({
    mutationFn: (f: ReportFilters) => generateReport(f),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['billing-reports-revenue'] });
      toast.success('Laporan penagihan berhasil dibuat.');
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal membuat laporan');
    }
  });

  const exportMutation = useMutation({
    mutationFn: async ({ format, f }: { format: 'csv' | 'pdf' | 'excel'; f: ReportFilters }) => {
      const blob = await exportReport(format, f);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `billing_report_${filters.report_type}_${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Laporan berhasil diunduh.');
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal mengekspor laporan');
    }
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: typeof scheduleData) => scheduleReport(data),
    onSuccess: () => {
      toast.success('Pengiriman laporan terjadwal berhasil disimpan.');
      setShowScheduleModal(false);
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menjadwalkan laporan');
    }
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchRevenue(),
      refetchPayments(),
      refetchTrends(),
      refetchBreakdown()
    ]);
  }, [refetchRevenue, refetchPayments, refetchTrends, refetchBreakdown]);

  const handleGenerateReport = useCallback(async () => {
    await generateMutation.mutateAsync(filters);
  }, [generateMutation, filters]);

  const handleExportReport = useCallback(async (format: 'csv' | 'pdf' | 'excel') => {
    await exportMutation.mutateAsync({ format, f: filters });
  }, [exportMutation, filters]);

  const handleScheduleReport = useCallback(async () => {
    const parsed = scheduleReportSchema.safeParse(scheduleData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data jadwal laporan tidak valid');
      return;
    }
    await scheduleMutation.mutateAsync(scheduleData);
  }, [scheduleData, scheduleMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Laporan Keuangan' }
  ], []);

  return (
    <AcademicPageLayout
      title="Laporan & Analitik Keuangan"
      description="Analisis komprehensif pendapatan, pertumbuhan langganan, dan performa gateway pembayaran."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="billing_reports"
      topSlot={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 font-bold rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => handleExportReport('pdf')}
            disabled={exportMutation.isPending}
            className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh PDF
          </Button>
        </div>
      }
      instruction={{
        title: "Panduan Laporan Keuangan",
        description: "Pusat ekspor dan pelaporan performa pendapatan langganan platform.",
        items: [
          { text: "Pilih rentang tanggal untuk memperbarui grafik dan ringkasan." },
          { text: "Gunakan tombol Unduh PDF untuk mendapatkan rekapitulasi formal." },
          { text: "Jadwalkan pengiriman laporan otomatis ke email manajemen melalui fitur Jadwalkan." }
        ]
      }}
    >
      <UnifiedBillingLayout pageKey="reports" title="Laporan & Analitik" subtitle="Analisis komprehensif performa billing platform" showOverview={false}>
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="w-48">
                  <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <SearchableSelect
                      id="report-type-select"
                      aria-label="Tipe Laporan"
                      value={filters.report_type}
                      onValueChange={(val) => setFilters(prev => ({ ...prev, report_type: val as ReportFilters['report_type'] }))}
                      options={[
                        { value: 'revenue', label: 'Laporan Pendapatan' },
                        { value: 'subscriptions', label: 'Pertumbuhan Langganan' },
                        { value: 'gateways', label: 'Gateway Pembayaran' }
                      ]}
                      placeholder="Pilih Tipe Laporan"
                    />
                  </Suspense>
                </div>
                <div className="w-44">
                  <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <SearchableSelect
                      id="date-range-select"
                      aria-label="Rentang Waktu"
                      value={filters.date_range}
                      onValueChange={(val) => setFilters(prev => ({ ...prev, date_range: val }))}
                      options={[
                        { value: 'last_7_days', label: '7 Hari Terakhir' },
                        { value: 'last_30_days', label: '30 Hari Terakhir' },
                        { value: 'this_month', label: 'Bulan Ini' },
                        { value: 'this_year', label: 'Tahun Ini' }
                      ]}
                      placeholder="Pilih Rentang"
                    />
                  </Suspense>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Clock size={13} />
                  Jadwalkan Email
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={generateMutation.isPending}
                  className="text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <BarChart3 size={13} />
                  {generateMutation.isPending ? 'Memproses...' : 'Terapkan Filter'}
                </Button>
              </div>
            </div>

            {/* Metrics Overview (Pilar 23) */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader size="lg" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <AnalyticsCard
                    title="Total Pendapatan"
                    value={formatCurrency(revenueData?.total_revenue || 0)}
                    icon={DollarSign}
                    trend={{ value: revenueData?.growth_rate || 8.4, isPositive: true }}
                    color="indigo"
                  />
                  <AnalyticsCard
                    title="MRR (Bulanan)"
                    value={formatCurrency(revenueData?.mrr || 0)}
                    icon={BarChart3}
                    trend={{ value: 5.2, isPositive: true }}
                    color="blue"
                  />
                  <AnalyticsCard
                    title="Rata-Rata ARPU"
                    value={formatCurrency(revenueData?.arpu || 450000)}
                    icon={Users}
                    trend={{ value: 2.1, isPositive: true }}
                    color="emerald"
                  />
                  <AnalyticsCard
                    title="Tingkat Churn"
                    value={formatPercentage(revenueData?.churn_rate || 1.2)}
                    icon={TrendingDown}
                    trend={{ value: 0.2, isPositive: false }}
                    color="rose"
                  />
                </div>

                {/* Gateway Stats Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Kinerja Gateway Pembayaran</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Statistik transaksi sukses dan volume pembayaran via channel.</p>
                    </div>
                  </div>

                  {paymentStats.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      Belum ada riwayat transaksi channel pembayaran pada periode ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Nama Channel / Gateway</th>
                            <th className="px-4 py-3 text-center">Transaksi Sukses</th>
                            <th className="px-4 py-3 text-right">Total Volume</th>
                            <th className="px-4 py-3 text-right">Success Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {paymentStats?.map((stat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                {stat.gateway || stat.gateway_name || 'Tripay Virtual Account'}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-300">
                                {formatNumber(stat.success_count || stat.total_transactions || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                                {formatCurrency(stat.total_amount || stat.total_volume || 0)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  {formatPercentage(stat.success_rate || 99.2)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Email Modal */}
            <Suspense fallback={null}>
              {showScheduleModal && (
                <Modal
                  isOpen={showScheduleModal}
                  onClose={() => setShowScheduleModal(false)}
                  title="Jadwalkan Pengiriman Laporan"
                  className="max-w-md"
                >
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label htmlFor="schedule-email-input" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Email Penerima <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="schedule-email-input"
                        aria-label="Email penerima laporan"
                        type="email"
                        placeholder="finance@sekolah.sch.id"
                        value={scheduleData.email}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, email: e.target.value }))}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="schedule-freq-select" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Frekuensi Pengiriman
                      </label>
                      <select
                        id="schedule-freq-select"
                        aria-label="Frekuensi pengiriman"
                        value={scheduleData.frequency}
                        onChange={(e) => setScheduleData(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      >
                        <option value="daily">Setiap Hari</option>
                        <option value="weekly">Setiap Pekan (Senin)</option>
                        <option value="monthly">Setiap Akhir Bulan</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={() => setShowScheduleModal(false)}>
                        Batal
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleScheduleReport} disabled={scheduleMutation.isPending}>
                        {scheduleMutation.isPending ? 'Menyimpan...' : 'Simpan Jadwal'}
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}
            </Suspense>
          </div>
        </SectionCard>
      </UnifiedBillingLayout>
    </AcademicPageLayout>
  );
});

export default BillingReportsPage;
