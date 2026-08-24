import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Loader, TabSwitcher, SectionCard } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardHero } from '@/components/dashboard/shared/DashboardHero';
import {
  CreditCard,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  Eye,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  Wallet,
  BookOpen,
  Users,
  RefreshCw
} from 'lucide-react';
import {
  getMySubscription,
  getMyInvoices,
  getMyPayments,
  getInvoiceDownloadUrl,
  getPublicInvoiceLink,
} from '@/api/mySubscription.api';
import type { Subscription } from '@/types/subscription';
import type { Invoice } from '@/types/invoice';
import type { PaymentRecord } from '@/types/payments';
import { cancelPendingUpgrade } from '@/api/subscription.api';
import { useNavigate } from 'react-router-dom';
import { getSubscriptionStatusLabel } from '@/utils/subscriptionStatusDictionary';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { formatDate, formatCurrency } from '@/utils/layoutUtils';

// Lazy loaded heavy components (Pilar 11)
const ConfirmModal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.ConfirmModal })));
const SearchableSelect = lazy(() => import('@/components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

interface MyInvoice extends Invoice {
  subscription_id?: string;
  Subscription?: {
    id: string;
  };
}

type MySubscription = Subscription & {
  target_upgrade_plan?: {
    id: string;
    name: string;
    billing_period?: string | null;
  } | null;
  upgrade_invoice_id?: string | null;
  upgrade_invoice_status?: string | null;
  expected_upgrade_price?: number | null;
  subscriptions?: Subscription[];
};

type ActiveSub = MySubscription & { plan_name?: string };

// Zod Schema Validation Guard (Pilar 25)
const filterSchema = z.object({
  serviceFilter: z.string().optional(),
});

function MySubscriptionContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<Subscription | null>(null);
  const [invoiceServiceFilter, setInvoiceServiceFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // React Query Data Fetching (Pilar 31)
  const { data: subData, isLoading: loadingSub, refetch: refetchSub } = useQuery({
    queryKey: ['my-subscription-detail'],
    queryFn: async () => {
      const res = await getMySubscription();
      return res?.data as MySubscription | undefined;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: invoices = [], isLoading: loadingInvoices, refetch: refetchInvoices } = useQuery<MyInvoice[]>({
    queryKey: ['my-subscription-invoices'],
    queryFn: async () => {
      const res = await getMyInvoices();
      return (res?.data || []) as MyInvoice[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: payments = [], isLoading: loadingPayments, refetch: refetchPayments } = useQuery<PaymentRecord[]>({
    queryKey: ['my-subscription-payments'],
    queryFn: async () => {
      const res = await getMyPayments();
      return (res?.data || []) as PaymentRecord[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const subscription: MySubscription | null = subData ?? null;
  const services: Subscription[] = useMemo(() => {
    if (subData && Array.isArray(subData.subscriptions) && subData.subscriptions.length > 0) {
      return subData.subscriptions;
    }
    return subData ? [subData] : [];
  }, [subData]);

  const loading = loadingSub || loadingInvoices || loadingPayments;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchSub(),
      refetchInvoices(),
      refetchPayments()
    ]);
  }, [refetchSub, refetchInvoices, refetchPayments]);

  // Mutations with Cache Invalidation (Pilar 32)
  const cancelMutation = useMutation({
    mutationFn: (invId: string) => cancelPendingUpgrade(invId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription-detail'] });
      toast.success('Upgrade pending berhasil dibatalkan.');
      setCancelModalOpen(false);
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal membatalkan upgrade.');
    }
  });

  const handleCancelUpgrade = useCallback(async () => {
    if (!subscription?.upgrade_invoice_id) return;
    await cancelMutation.mutateAsync(subscription.upgrade_invoice_id);
  }, [subscription?.upgrade_invoice_id, cancelMutation]);

  const activeSub: ActiveSub = (selectedService as ActiveSub) || (subscription as ActiveSub);
  const planName = activeSub?.Plan?.name || activeSub?.plan_name || 'Free Trial';
  const price = activeSub?.Plan?.price_monthly || 0;
  const currency = activeSub?.Plan?.currency || 'IDR';
  const cycle = activeSub?.Plan?.billing_cycle || 'Monthly';
  const priceLabel = formatCurrency(price, currency);
  const isActive = activeSub?.status === 'ACTIVE';

  const rawFeatures = activeSub?.Plan?.features_json || (activeSub as Record<string, unknown>)?.features;
  const features: string[] = Array.isArray(rawFeatures)
    ? rawFeatures
    : typeof rawFeatures === 'string'
    ? (() => {
        try { return JSON.parse(rawFeatures); } catch { return []; }
      })()
    : [];

  const usersLimit = activeSub?.Plan?.max_users || 0;

  const handleDownload = useCallback(async (invoiceId: string) => {
    try {
      setActionLoading(invoiceId);
      const url = await getInvoiceDownloadUrl(invoiceId);
      window.open(url, '_blank');
    } catch {
      toast.error('Gagal mengunduh invoice.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleView = useCallback(async (invoiceId: string) => {
    try {
      setActionLoading(invoiceId);
      const res = await getPublicInvoiceLink(invoiceId);
      if (res?.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error('Link invoice tidak ditemukan.');
      }
    } catch {
      toast.error('Gagal membuka invoice.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const getServiceSlug = useCallback((s?: Subscription | null) => {
    const raw = (s?.Plan?.service_code || (s?.Plan as Record<string, unknown>)?.serviceCode || (s?.Plan as Record<string, unknown>)?.module || s?.Plan?.name || '').toString().toLowerCase();
    if (raw.includes('absenta') || raw.includes('presensi') || raw.includes('attendance')) return 'absenta';
    if (raw.includes('cbt') || raw.includes('ujian')) return 'cbt';
    if (raw.includes('kesiswaan') || raw.includes('karakter')) return 'kesiswaan';
    if (raw.includes('koperasi') || raw.includes('pos')) return 'koperasi';
    if (raw.includes('bk') || raw.includes('konseling')) return 'bk';
    if (raw.includes('perpus') || raw.includes('library')) return 'perpus';
    return 'general';
  }, []);

  const getServiceTitle = useCallback((slug: string) => {
    switch (slug) {
      case 'absenta': return 'Presensi & Kehadiran';
      case 'cbt': return 'CBT & Ujian Digital';
      case 'kesiswaan': return 'Kesiswaan & Pembiasaan';
      case 'koperasi': return 'Koperasi & POS Sekolah';
      case 'bk': return 'BP / BK & Konseling';
      case 'perpus': return 'Perpustakaan Digital';
      default: return 'Layanan Platform';
    }
  }, []);

  const getServiceIcon = useCallback((slug: string) => {
    switch (slug) {
      case 'absenta': return ShieldCheck;
      case 'cbt': return BookOpen;
      case 'kesiswaan': return Users;
      case 'koperasi': return Wallet;
      case 'bk': return Sparkles;
      case 'perpus': return Building2;
      default: return Layers;
    }
  }, []);

  const getDaysLeft = useCallback((s?: Subscription | null) => {
    if (!s?.end_date) return 0;
    const diff = new Date(s.end_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Langganan Saya' }
  ], []);

  const tabOptions = useMemo(() => [
    { id: 'invoices', label: 'Daftar Faktur (Invoices)', icon: FileText },
    { id: 'payments', label: 'Riwayat Pembayaran', icon: ShieldCheck }
  ], []);

  return (
    <AcademicPageLayout
      title="Langganan & Paket Saya"
      description="Kelola paket aktif modul aplikasi, perpanjangan lisensi, dan riwayat transaksi faktur sekolah."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="my_subscription"
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
            onClick={() => navigate('/service-center?tab=catalog')}
            className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Beli / Upgrade Modul
          </Button>
        </div>
      }
      instruction={{
        title: "Panduan Langganan Saya",
        description: "Kelola status langganan modul, perpanjangan, dan riwayat faktur tenant.",
        items: [
          { text: "Pilih modul di atas untuk melihat detail masa aktif dan fitur yang disertakan." },
          { text: "Gunakan tab Invoices atau Histori Pembayaran untuk memeriksa rincian transaksi." },
          { text: "Klik ikon Mata atau Unduh untuk memeriksa bukti invoice resmi." }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
        <div className="space-y-8">
          {/* Services Selector Cards */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Daftar Modul Berlangganan</h3>
                <p className="text-xs text-slate-400">Pilih modul untuk melihat status masa aktif dan kuota.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(services ?? [])?.map((svc) => {
                const slug = getServiceSlug(svc);
                const title = getServiceTitle(slug);
                const Icon = getServiceIcon(slug);
                const isSelected = selectedService?.id === svc.id || (!selectedService && svc.id === subscription?.id);
                const status = String(svc.status || '').toUpperCase();
                const dleft = getDaysLeft(svc);

                return (
                  <div
                    key={svc.id}
                    onClick={() => setSelectedService(svc)}
                    className={`relative cursor-pointer rounded-2xl p-5 transition-all border-2 overflow-hidden ${
                      isSelected 
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 p-2 bg-indigo-500 text-white rounded-bl-xl">
                        <CheckCircle size={12} />
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3.5">
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        <Icon size={20} />
                      </div>
                      
                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={status === 'ACTIVE' ? 'success' : 'warning'} className="text-[10px] px-2 py-0 border-none">
                            {status}
                          </Badge>
                          {status === 'ACTIVE' && (
                            <span className={`text-[10px] font-bold ${dleft <= 7 ? 'text-rose-500' : dleft <= 14 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {dleft} Hari Lagi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Masa Aktif: <strong className="text-slate-700 dark:text-slate-200">{formatDate(svc.end_date)}</strong></span>
                      <ArrowRight size={14} className={isSelected ? 'text-indigo-500' : 'text-slate-300'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan Details Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Plan Terpilih</div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{planName}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{priceLabel}</span>
                    <span>/ {cycle}</span>
                  </div>
                </div>
                
                <Badge variant={isActive ? 'success' : 'warning'} className="px-3 py-1 rounded-xl font-bold">
                  {getSubscriptionStatusLabel(activeSub?.status)}
                </Badge>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Fitur & Layanan Aktif</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(features ?? [])?.map((feat: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <CheckCircle size={14} className="text-indigo-500 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Quick Stats Panel */}
            <div className="space-y-4">
              <AnalyticsCard
                title="Kapasitas Pengguna"
                value={usersLimit > 0 ? `${usersLimit} Pengguna` : 'Tanpa Batasan'}
                icon={Users}
                color="indigo"
              />

              <AnalyticsCard
                title="Jatuh Tempo Perpanjangan"
                value={formatDate(activeSub?.end_date)}
                icon={Clock}
                color="amber"
              />
            </div>
          </div>

          {/* Transaction History Tabs */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Riwayat Transaksi & Faktur</h3>
                <p className="text-xs text-slate-400">Daftar semua invoice tagihan dan status pembayaran lisensi.</p>
              </div>

              <div className="w-56">
                <Suspense fallback={<div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                  <SearchableSelect
                    id="invoice-service-filter-select"
                    aria-label="Filter modul invoice"
                    value={invoiceServiceFilter}
                    onValueChange={(val) => {
                      const parsed = filterSchema.safeParse({ serviceFilter: val });
                      if (parsed.success) {
                        setInvoiceServiceFilter(val);
                      }
                    }}
                    options={[
                      { value: "ALL", label: "Semua Layanan" },
                      ...(services ?? [])?.map((svc: Subscription) => ({
                        value: String(svc.id),
                        label: getServiceTitle(getServiceSlug(svc))
                      }))
                    ]}
                    placeholder="Pilih Layanan"
                  />
                </Suspense>
              </div>
            </div>

            <TabSwitcher
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'invoices' | 'payments')}
            />

            {activeTab === 'invoices' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Nomor Invoice</th>
                      <th className="px-5 py-3">Jatuh Tempo</th>
                      <th className="px-5 py-3">Total Jumlah</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(invoices ?? []).filter(inv => invoiceServiceFilter === 'ALL' || String(inv.subscription_id || inv.Subscription?.id) === invoiceServiceFilter).length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400">Belum ada catatan tagihan ditemukan.</td></tr>
                    ) : (
                      (invoices ?? [])
                        .filter(inv => invoiceServiceFilter === 'ALL' || String(inv.subscription_id || inv.Subscription?.id) === invoiceServiceFilter)
                        ?.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                                <FileText size={15} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">#{inv.invoice_number}</div>
                                <div className="text-[10px] text-slate-400">{formatDate(inv.created_at)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-600 dark:text-slate-400">{formatDate(inv.due_date)}</td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(inv.total_amount, inv.currency)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant={inv.status === 'PAID' ? 'success' : ['DRAFT', 'SENT', 'VIEWED'].includes(String(inv.status)) ? 'warning' : 'destructive'} className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase">
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                aria-label={`Lihat invoice ${inv.invoice_number}`}
                                onClick={() => handleView(inv.id)}
                                disabled={actionLoading === inv.id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Unduh invoice ${inv.invoice_number}`}
                                onClick={() => handleDownload(inv.id)}
                                disabled={actionLoading === inv.id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                              >
                                <Download size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3">ID Transaksi</th>
                      <th className="px-5 py-3">Waktu Pembayaran</th>
                      <th className="px-5 py-3">Metode Bayar</th>
                      <th className="px-5 py-3 text-right">Jumlah</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(payments ?? []).length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400">Belum ada catatan pembayaran ditemukan.</td></tr>
                    ) : (
                      (payments ?? [])?.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600">
                                <ShieldCheck size={15} />
                              </div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{pay.id.substring(0, 10)}...</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-mono">
                            {formatDate(pay.created_at)}
                          </td>
                          <td className="px-5 py-3.5 uppercase font-mono text-slate-600 dark:text-slate-300">{pay.payment_method || '-'}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(pay.amount, pay.currency)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant={pay.status === 'SUCCESS' || pay.status === 'PAID' ? 'success' : 'warning'} className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase">
                              {pay.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <Suspense fallback={null}>
        {cancelModalOpen && (
          <ConfirmModal
            isOpen={cancelModalOpen}
            onClose={() => setCancelModalOpen(false)}
            onConfirm={handleCancelUpgrade}
            title="Batalkan Permintaan Upgrade?"
            message="Apakah Anda yakin ingin membatalkan transaksi upgrade paket tertunda? Tindakan ini akan menghapus tagihan terkait."
            confirmText={cancelMutation.isPending ? 'Sesaat...' : 'Ya, Batalkan'}
            cancelText="Kembali"
            variant="danger"
          />
        )}
      </Suspense>
    </AcademicPageLayout>
  );
}

export const MySubscriptionPage: React.FC = React.memo(() => {
  return (
    <ErrorBoundary>
      <MySubscriptionContent />
    </ErrorBoundary>
  );
});

export default MySubscriptionPage;
