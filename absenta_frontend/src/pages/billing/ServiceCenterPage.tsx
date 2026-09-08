import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  History, 
  LayoutGrid, 
  ChevronRight, 
  Settings, 
  Info,
  RefreshCw,
  ShoppingBag,
  User,
  ExternalLink
} from 'lucide-react';

import * as UI from '../../components/ui';
import { Card, Button, Badge, Tabs, TabsTrigger, TabsContent, Loader } from '../../components/ui';
import { SectionCard } from '../../components/ui/SectionCard';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { 
  getMySubscription, 
  syncMySubscription,
  getMyInvoices, 
  getMyPayments,
  getPublicInvoiceLink,
  toggleAutoRenew
} from '../../api/mySubscription.api';
import { orderSubscriptionPlan, cancelPendingUpgrade } from '../../api/subscription.api';
import { useAuthStore } from '../../store/authStore';
import useConfirm from '../../hooks/useConfirm';
import axiosInstance, { resolvePublicApiBaseUrl } from '../../lib/axiosInstance';
import { UnifiedCatalog } from '@/components/billing/UnifiedCatalog';
import { 
  formatCurrency, 
  getServiceIcon
} from '@/lib/billingUtils';
import { formatDate } from '../../utils/layoutUtils';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

// Types
import type { Invoice } from '../../types/invoice';
import type { Plan } from '../../types/billing';
import type { SubscriptionService } from '@/components/billing/AutoRenewModal';
import type { OrderPayload } from '@/components/billing/OrderReviewSidebar';

interface ServiceInvoice extends Invoice {
  subscription_id?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  service_code?: string;
  price_monthly: number;
  price_yearly: number;
  max_user?: number;
  features_json?: string[];
  Module?: {
    name: string;
    description?: string;
    icon?: string;
  };
}

export interface SubscriptionItem {
  id: string;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'UPGRADE_PENDING';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  plan_id: string;
  plan_name: string;
  Plan?: SubscriptionPlan;
  plan_snapshot?: {
    name: string;
    service_code?: string;
    price_monthly: number;
    price_yearly: number;
    features_json?: string[];
  };
}

// Zod Schema Validation Guard (Pilar 25)
const orderPayloadSchema = z.object({
  id: z.string().min(1, 'ID Paket wajib ada'),
  period: z.enum(['MONTH', 'YEAR', 'ONETIME']).optional(),
  price_monthly: z.number().nonnegative().optional(),
  price_yearly: z.number().nonnegative().optional(),
  price_onetime: z.number().nonnegative().optional()
});

// Lazy Loaded Subcomponents (Pilar 13)
const BillingInvoicesSection = lazy(() => import('@/components/billing/BillingInvoicesSection').then(m => ({ default: m.BillingInvoicesSection })));
const OrderReviewSidebar = lazy(() => import('@/components/billing/OrderReviewSidebar').then(m => ({ default: m.OrderReviewSidebar })));
const AutoRenewModal = lazy(() => import('@/components/billing/AutoRenewModal').then(m => ({ default: m.AutoRenewModal })));
const AcademicTierCard = lazy(() => import('@/components/billing/AcademicTierCard').then(m => ({ default: m.AcademicTierCard })));
const ServiceDetailsCard = lazy(() => import('@/components/billing/ServiceDetailsCard').then(m => ({ default: m.ServiceDetailsCard })));
const EmptySubscriptionOverview = lazy(() => import('@/components/billing/EmptySubscriptionOverview').then(m => ({ default: m.EmptySubscriptionOverview })));

export const ServiceCenterPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'services';
  
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isAutoRenewModalOpen, setIsAutoRenewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(activeTabParam);
  const [selectedOrder, setSelectedOrder] = useState<OrderPayload | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  const confirm = useConfirm();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  }, [setSearchParams]);

  // React Query Fetchers
  const subQuery = useQuery({
    queryKey: ['my-subscription-details'],
    queryFn: async () => {
      const res = await getMySubscription();
      return res.data;
    },
    staleTime: 60 * 1000
  });

  const invoicesQuery = useQuery({
    queryKey: ['my-invoices-list'],
    queryFn: async () => {
      const res = await getMyInvoices();
      return res.data || [];
    },
    staleTime: 60 * 1000
  });

  const paymentsQuery = useQuery({
    queryKey: ['my-payments-list'],
    queryFn: async () => {
      const res = await getMyPayments();
      return res.data || [];
    },
    staleTime: 60 * 1000
  });

  const activeAcademicTier = subQuery.data?.active_academic_tier || 'CORE_PLATFORM';
  const services: SubscriptionItem[] = useMemo(() => {
    const raw = subQuery.data?.services || subQuery.data?.all_subscriptions || subQuery.data?.subscriptions || [];
    const list: SubscriptionItem[] = Array.isArray(raw) ? [...raw] : [];
    return list.sort((a, b) => {
      const isAActive = a.status === 'ACTIVE' || a.status === 'TRIAL';
      const isBActive = b.status === 'ACTIVE' || b.status === 'TRIAL';
      if (isAActive && !isBActive) return -1;
      if (!isAActive && isBActive) return 1;

      const isAPaket = (a.Plan?.service_code === 'PAKET_LENGKAP' || a.service_code === 'PAKET_LENGKAP' || String(a.Plan?.name || '').toUpperCase().includes('PAKET LENGKAP'));
      const isBPaket = (b.Plan?.service_code === 'PAKET_LENGKAP' || b.service_code === 'PAKET_LENGKAP' || String(b.Plan?.name || '').toUpperCase().includes('PAKET LENGKAP'));
      if (isAPaket && !isBPaket) return -1;
      if (!isAPaket && isBPaket) return 1;

      return new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime();
    });
  }, [subQuery.data]);

  const selectedService = useMemo(() => {
    if (!services || services.length === 0) return null;
    if (selectedServiceId) {
      const found = services.find(s => s.id === selectedServiceId);
      if (found) return found;
    }
    const activeSubs = services.filter(s => s.status === 'ACTIVE' || s.status === 'TRIAL');
    const paketLengkap = activeSubs.find(s => 
      s.service_code === 'PAKET_LENGKAP' || 
      (s.Plan?.service_code === 'PAKET_LENGKAP') ||
      String(s.Plan?.name || '').toUpperCase().includes('PAKET LENGKAP')
    );
    if (paketLengkap) return paketLengkap;

    if (activeSubs.length > 0) {
      return [...activeSubs].sort((a, b) => new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime())[0];
    }
    return services[0] || null;
  }, [services, selectedServiceId]);

  const stats = useMemo(() => [
    {
      title: "Layanan Aktif",
      value: String(services.filter(s => s.status === 'ACTIVE' || s.status === 'TRIAL').length),
      icon: <ShieldCheck size={16} className="text-blue-600" />,
      variant: 'card' as const,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Total modul berlisensi"
    },
    {
      title: "Kapasitas Sekolah",
      value: activeAcademicTier.toUpperCase() === 'CORE_PLATFORM' ? 'Micro' : activeAcademicTier,
      icon: <Sparkles size={16} className="text-emerald-600" />,
      variant: 'card' as const,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Edisi tier aktif"
    },
    {
      title: "Tagihan Berjalan",
      value: String(invoicesQuery.data?.filter(i => i.status === 'UNPAID' || i.status === 'PENDING').length || 0),
      icon: <History size={16} className="text-purple-600" />,
      variant: 'card' as const,
      gradient: "from-purple-500 to-violet-600",
      subtitle: "Menunggu pembayaran"
    }
  ], [services, activeAcademicTier, invoicesQuery.data]);

  const tabs = useMemo(() => [
    { id: 'services', label: 'Status Lisensi & Modul Aktif', icon: LayoutGrid },
    { id: 'invoices', label: 'Riwayat Tagihan & Invoice', icon: History }
  ], []);

  const handleExtend = useCallback((planId: string) => {
    navigate(`/billing/checkout?plan_id=${planId}`);
  }, [navigate]);

  const handleViewInvoice = useCallback((invoiceId: string) => {
    navigate(`/billing/checkout?invoice_id=${invoiceId}`);
  }, [navigate]);

  const handleChangePlan = useCallback((plan: Plan) => {
    const baseName = (plan.name || 'Layanan')
      .replace(/\((Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\)/gi, '')
      .replace(/\b(Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\b/gi, '')
      .replace(/-/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const mode = String(plan.absensi_mode || 'STANDARD');
    const groupKey = `${baseName}-${mode}`;
    navigate(`/services/${groupKey}`);
  }, [navigate]);

  const handleOpenAutoRenew = useCallback(() => {
    setIsAutoRenewModalOpen(true);
  }, []);

  const handleSelectCatalogItem = useCallback((raw: Record<string, unknown> | null | undefined) => {
    if (!raw) {
      toast.error('Data paket tidak valid');
      return;
    }

    // Jika objek berupa group (mengandung array variants)
    const rawVariants = Array.isArray(raw.variants) ? (raw.variants as Record<string, unknown>[]) : null;
    if (rawVariants && rawVariants.length > 0) {
      const isHardware = Boolean(
        raw.isHardware === true ||
        raw.module_id === 'SERVER_HARDWARE' ||
        raw.module_id === 'NETWORK_HARDWARE' ||
        raw.module_id === 'ABSENSI_HARDWARE' ||
        raw.module_id === 'PHYSICAL_SERVICE' ||
        (raw.id && String(raw.id).startsWith('HW_'))
      );
      const defaultVariant = rawVariants[0];
      const rawSizes = Array.isArray(raw.sizes) ? (raw.sizes as string[]) : [];
      const defaultSize = rawSizes.length > 0 ? rawSizes[0] : String(defaultVariant.size || defaultVariant.size_label || 'Micro');
      const period: 'MONTH' | 'YEAR' | 'ONETIME' = isHardware ? 'ONETIME' : 'MONTH';

      const normalized: OrderPayload = {
        id: String(defaultVariant.id || ''),
        service_code: (raw.service_code || defaultVariant.service_code) as string | undefined,
        moduleIcon: (raw.icon || (defaultVariant.module as Record<string, unknown>)?.icon) as string | undefined,
        moduleName: (raw.module || (defaultVariant.module as Record<string, unknown>)?.name) as string | undefined,
        name: String(raw.baseName || defaultVariant.name || raw.name || ''),
        size: defaultSize,
        period: period,
        features_json: Array.isArray(defaultVariant.features_json) ? (defaultVariant.features_json as string[]) : [],
        price_monthly: Number(defaultVariant.price_monthly || 0),
        price_yearly: Number(defaultVariant.price_yearly || 0),
        price_onetime: Number(defaultVariant.price_onetime || 0),
        imageUrl: raw.imageUrl as string | undefined,
        group: raw
      };
      setSelectedOrder(normalized);
      return;
    }

    // Jika objek berupa individual plan variant
    const isHardware = Boolean(
      raw.billing_period === 'ONETIME' ||
      raw.price_onetime ||
      raw.module_id === 'SERVER_HARDWARE' ||
      raw.module_id === 'NETWORK_HARDWARE' ||
      raw.module_id === 'ABSENSI_HARDWARE' ||
      raw.module_id === 'PHYSICAL_SERVICE'
    );
    const period: 'MONTH' | 'YEAR' | 'ONETIME' = (raw.period as 'MONTH' | 'YEAR' | 'ONETIME') || (isHardware ? 'ONETIME' : (raw.billing_period === 'YEARLY' ? 'YEAR' : 'MONTH'));

    const rawPlan = raw.Plan as Record<string, unknown> | undefined;
    const normalized: OrderPayload = {
      id: String(raw.id || raw.plan_id || ''),
      service_code: raw.service_code as string | undefined,
      moduleIcon: (raw.moduleIcon || (raw.module as Record<string, unknown>)?.icon) as string | undefined,
      moduleName: (raw.moduleName || (raw.module as Record<string, unknown>)?.name) as string | undefined,
      name: String(raw.name || raw.plan_name || 'Layanan'),
      size: String(raw.size || raw.size_label || 'Micro'),
      period: period,
      features_json: (raw.features_json || rawPlan?.features_json || []) as string[],
      price_monthly: Number(raw.price_monthly || rawPlan?.price_monthly || 0),
      price_yearly: Number(raw.price_yearly || rawPlan?.price_yearly || 0),
      price_onetime: Number(raw.price_onetime || rawPlan?.price_onetime || 0),
      imageUrl: raw.imageUrl as string | undefined,
      group: (raw.group || (raw.variants ? raw : null)) as Record<string, unknown> | null
    };
    setSelectedOrder(normalized);

    if (!normalized.id) {
      toast.error('Data paket tidak valid');
      return;
    }

    setSelectedOrder(normalized);
  }, []);

  const handleConfirmOrder = useCallback(async () => {
    if (!selectedOrder) return;
    setIsOrdering(true);
    try {
      const res = (await orderSubscriptionPlan({
        plan_id: selectedOrder.id,
        billing_period: selectedOrder.period === 'YEAR' ? 'YEAR' : (selectedOrder.period === 'ONETIME' ? 'ONETIME' : 'MONTH')
      })) as {
        success?: boolean;
        data?: {
          success?: boolean;
          checkout_url?: string;
          qr_url?: string;
          pay_url?: string;
          invoice_id?: string;
          token?: string;
          invoice_token?: string;
          checkout?: { public_url?: string; public_token?: string };
        };
        message?: string;
      };
      const isSuccess = Boolean(res?.success || res?.data?.success || res?.data?.checkout_url || res?.data?.checkout);
      if (isSuccess) {
        toast.success('Pesanan berhasil dibuat!');
        const invData = res.data || res;
        const checkoutUrl = (invData as { checkout_url?: string; qr_url?: string; pay_url?: string; checkout?: { public_url?: string } })?.checkout_url ||
          (invData as { qr_url?: string })?.qr_url ||
          (invData as { pay_url?: string })?.pay_url ||
          (invData as { checkout?: { public_url?: string } })?.checkout?.public_url;
        const invId = (invData as { invoice_id?: string; token?: string; invoice_token?: string; checkout?: { public_token?: string } })?.invoice_id ||
          (invData as { token?: string })?.token ||
          (invData as { invoice_token?: string })?.invoice_token ||
          (invData as { checkout?: { public_token?: string } })?.checkout?.public_token;
        if (checkoutUrl && (checkoutUrl.startsWith('http://') || checkoutUrl.startsWith('https://'))) {
          window.location.href = checkoutUrl;
        } else if (invId) {
          navigate(`/billing/checkout?invoice_id=${invId}`);
        } else {
          navigate('/service-center?tab=invoices');
        }
      } else {
        toast.error(res?.message || res?.data?.message || 'Gagal memproses pesanan.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      toast.error(errorObj.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsOrdering(false);
    }
  }, [selectedOrder, navigate]);

  const instructionData = useMemo(() => ({
    title: "Panduan Pusat Layanan & Lisensi",
    description: "Halaman ini digunakan untuk memantau modul berlisensi, kapasitas institusi, perpanjangan masa aktif, dan riwayat tagihan.",
    items: [
      { text: "Pilih modul dari daftar layanan untuk memeriksa masa aktif atau melakukan perpanjangan." },
      { text: "Gunakan tab 'Katalog Layanan' untuk menjelajahi dan mengaktifkan modul baru sesuai kebutuhan institusi." },
      { text: "Periksa tab 'Riwayat Tagihan' untuk mengunduh invoice resmi atau memverifikasi status pembayaran." }
    ]
  }), []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pusat Layanan &amp; Lisensi"
        description="Kelola seluruh lisensi modul, perpanjangan masa aktif, kapasitas institusi, dan tagihan sekolah Anda secara terpadu."
        stats={stats}
        instruction={instructionData}
        breadcrumbs={[{ label: 'Pusat Layanan' }]}
        hardeningModuleKey="servicecenterpage"
        toolbar={
          <Button
            type="button"
            variant="toolbarPrimary"
            size="toolbar"
            aria-label="Buka Katalog Pengadaan Modul"
            onClick={() => navigate('/catalog')}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <ShoppingBag size={14} />
            <span>Katalog Pengadaan Modul</span>
          </Button>
        }
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Reusable TabSwitcher (Pilar 30) */}
            <TabSwitcher
              tabs={tabs}
              activeTab={activeTab === 'catalog' ? 'services' : activeTab}
              onChange={handleTabChange}
            />

            {/* Tab: Services (Option A: Interactive Card Grid) */}
            {(activeTab === 'services' || activeTab === 'catalog') && (
              <div className="space-y-6 w-full min-w-0">
                {/* Top Control Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Memuat kapasitas...</div>}>
                      <AcademicTierCard
                        activeAcademicTier={activeAcademicTier}
                        onTierChangeSuccess={() => subQuery.refetch()}
                      />
                    </Suspense>
                  </div>
                  <Card className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Sinkronisasi Lisensi</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        Status Server Lisensi Pusat
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        Perbarui kuota dan masa aktif instan langsung dari server lisensi pusat.
                      </p>
                    </div>
                    <Button
                      type="button"
                      aria-label="Sinkronisasi Status Lisensi"
                      onClick={async () => {
                        const promise = (async () => {
                          await syncMySubscription();
                          await Promise.all([
                            subQuery.refetch(),
                            invoicesQuery.refetch(),
                            paymentsQuery.refetch()
                          ]);
                        })();
                        toast.promise(promise, {
                          loading: 'Menyingkronkan status lisensi...',
                          success: 'Status lisensi berhasil diperbarui!',
                          error: 'Gagal melakukan sinkronisasi lisensi.'
                        });
                      }}
                      disabled={subQuery.isRefetching}
                      variant="outline"
                      className="w-full mt-3 h-9 border-dashed hover:border-blue-500 hover:text-blue-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={13} className={subQuery.isRefetching ? 'animate-spin' : ''} />
                      <span>Sinkronisasi Status Lisensi</span>
                    </Button>
                  </Card>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutGrid size={16} className="text-blue-600" />
                    <span>Daftar Modul &amp; Lisensi Aktif</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold">
                      {services.length} Modul
                    </span>
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Lihat Katalog Pengadaan"
                    onClick={() => navigate('/catalog')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ShoppingBag size={14} />
                    <span>Katalog Pengadaan</span>
                  </Button>
                </div>

                {/* Interactive Card Grid */}
                {services.length === 0 ? (
                  <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat ringkasan lisensi...</div>}>
                    <EmptySubscriptionOverview activeAcademicTier={activeAcademicTier} />
                  </Suspense>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                    {(services || [])?.map((svc: SubscriptionItem, sIdx: number) => {
                      const fullPlanName = svc.Plan?.name || svc.plan_snapshot?.name || svc.plan_name || 'Layanan Absenta';
                      const sCode = String(svc.Plan?.service_code || svc.plan_snapshot?.service_code || svc.service_code || '').toUpperCase();
                      const upperRaw = fullPlanName.toUpperCase();

                      let isMasterPackage = false;
                      let displayName = fullPlanName;
                      if (sCode === 'PAKET_LENGKAP' || upperRaw.includes('PAKET LENGKAP')) {
                        displayName = upperRaw.includes('MULTI') ? 'PAKET LENGKAP MULTI (Enterprise)' : 'PAKET LENGKAP';
                        isMasterPackage = true;
                      } else if (sCode === 'CORE' || upperRaw.includes('FREE LISENSI') || upperRaw.includes('AKTIVASI SERVER')) {
                        displayName = 'LISENSI SERVER ABSENTA';
                      } else if (sCode === 'ABSENSI' || upperRaw.includes('ABSENSI')) {
                        displayName = upperRaw.includes('MULTI') ? 'ABSENSI MULTI SESI' : 'ABSENSI SEKOLAH';
                      } else if (sCode === 'SAAS-NODE' || upperRaw.includes('SAAS-NODE')) {
                        displayName = 'SAAS NODE ENGINE SERVER';
                      } else if (sCode === 'HUBIN' || upperRaw.includes('HUBUNGAN INDUSTRI')) {
                        displayName = 'HUBUNGAN INDUSTRI & PKL (HUBIN)';
                      } else if (sCode === 'SARPRAS' || upperRaw.includes('SARANA PRASARANA')) {
                        displayName = 'SARANA & PRASARANA (SARPRAS)';
                      } else if (sCode === 'KOPERASI' || upperRaw.includes('KOPERASI')) {
                        displayName = 'KOPERASI SEKOLAH DIGITAL';
                      } else if (sCode === 'WHATSAPP' || upperRaw.includes('WHATSAPP')) {
                        displayName = 'WHATSAPP GATEWAY NOTIFIKASI';
                      } else if (sCode === 'EASY_TUNNEL' || upperRaw.includes('TUNNEL') || upperRaw.includes('VPN')) {
                        displayName = 'EASY TUNNEL VPN ACCESS';
                      }

                      const IconComp = getServiceIcon(svc.Plan?.service_code || svc.plan_snapshot?.service_code);
                      const price = svc.Plan?.price_monthly || svc.plan_snapshot?.price_monthly || 0;
                      const maxUser = svc.Plan?.max_user;
                      const features = svc.Plan?.features_json || svc.plan_snapshot?.features_json || [];
                      const daysLeft = Math.ceil((new Date(svc.end_date).getTime() - Date.now()) / (1000 * 3600 * 24));
                      const isExpired = daysLeft <= 0;

                      return (
                        <Card 
                          key={svc.id || `svc-${sIdx}`}
                          className="p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
                        >
                          {/* Accent Top Bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1.5 ${isMasterPackage ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400' : 'bg-blue-600'}`} />

                          <div className="space-y-4">
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3 pt-1">
                              <div className="flex items-start gap-3.5 min-w-0">
                                <div className={`p-2.5 rounded-xl ${isMasterPackage ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-100 dark:border-blue-800'} shrink-0`}>
                                  <IconComp size={22} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm md:text-base font-black text-slate-900 dark:text-white leading-snug">
                                      {displayName}
                                    </h4>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    ID: {svc.id.substring(0, 8)}...
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant={['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'].includes(svc.status) ? 'success' : 'warning'} className="text-[8px] font-black uppercase px-2 py-0.5">
                                  {svc.status}
                                </Badge>
                                {isMasterPackage && (
                                  <Badge variant="primary" className="text-[7px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                                    ALL-IN-ONE
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Key Metrics 3-Col Box */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Masa Aktif</span>
                                <div className="font-bold text-slate-900 dark:text-white text-[11px] leading-tight">
                                  {formatDate(svc.end_date)}
                                </div>
                                <span className={`text-[9px] font-bold ${isExpired ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                  {isExpired ? 'Kedaluwarsa' : `${daysLeft} Hari Lagi`}
                                </span>
                              </div>

                              <div className="border-l border-slate-200 dark:border-slate-700 pl-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Kapasitas</span>
                                <div className="font-bold text-slate-900 dark:text-white text-[11px] flex items-center gap-1 leading-tight">
                                  <User size={11} className="text-blue-500" />
                                  <span>{maxUser ? `${maxUser.toLocaleString('id-ID')} Akun` : 'Unlimited'}</span>
                                </div>
                                <span className="text-[9px] text-slate-400">Kuota Institusi</span>
                              </div>

                              <div className="border-l border-slate-200 dark:border-slate-700 pl-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Perpanjangan</span>
                                <div className="font-bold text-slate-900 dark:text-white text-[11px] flex items-center gap-1 leading-tight">
                                  <span className={`w-1.5 h-1.5 rounded-full ${svc.auto_renew ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                  <span>{svc.auto_renew ? 'Otomatis' : 'Manual'}</span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {price > 0 ? formatCurrency(price) : 'Gratis'}
                                </span>
                              </div>
                            </div>

                            {/* Features / Module chips */}
                            {Array.isArray(features) && features.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Cakupan Modul &amp; Fitur:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {(features || [])?.filter((f: string) => !String(f).toUpperCase().includes('CORE')).slice(0, 6)?.map((feat: string, fIdx: number) => (
                                    <span key={fIdx} className="text-[9.5px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md flex items-center gap-1">
                                      <span className="text-emerald-500">✔</span> {String(feat).replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button
                              type="button"
                              variant="toolbarPrimary"
                              size="toolbar"
                              aria-label="Perpanjang Masa Aktif"
                              onClick={() => handleExtend(svc.plan_id || svc.id)}
                              className="flex-1 rounded-xl font-bold text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <Sparkles size={13} />
                              <span>Perpanjang Masa Aktif</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label="Ganti atau Upgrade Paket"
                              onClick={() => handleChangePlan((svc.Plan || svc.plan_snapshot || {}) as Plan)}
                              className="rounded-xl font-bold text-xs h-9 px-3 border-slate-200 dark:border-slate-700"
                              title="Ganti atau Upgrade Paket"
                            >
                              Ganti Paket
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label="Pengaturan Tagihan & Auto-Renew"
                              onClick={() => {
                                setSelectedServiceId(svc.id);
                                handleOpenAutoRenew();
                              }}
                              className="rounded-xl font-bold text-xs h-9 px-2.5 border-slate-200 dark:border-slate-700"
                              title="Pengaturan Tagihan & Auto-Renew"
                            >
                              <Settings size={13} />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Invoices */}
            {activeTab === 'invoices' && (
              <div className="w-full min-w-0">
                <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat riwayat tagihan...</div>}>
                  <BillingInvoicesSection
                    invoices={(invoicesQuery.data as ServiceInvoice[]) || []}
                    isLoading={invoicesQuery.isLoading}
                    onRefresh={() => invoicesQuery.refetch()}
                    handleViewInvoice={handleViewInvoice}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Modal Auto Renew */}
        {isAutoRenewModalOpen && selectedService && (
          <Suspense fallback={null}>
            <AutoRenewModal
              isOpen={isAutoRenewModalOpen}
              onClose={() => setIsAutoRenewModalOpen(false)}
              service={selectedService as unknown as SubscriptionService}
              onSuccess={() => {
                subQuery.refetch();
                setIsAutoRenewModalOpen(false);
              }}
            />
          </Suspense>
        )}

        {/* Sidebar Order Review */}
        <Suspense fallback={null}>
          <OrderReviewSidebar
            showOrderPanel={Boolean(selectedOrder)}
            activeOrder={selectedOrder}
            checkoutProcessing={isOrdering}
            setShowOrderPanel={(show) => {
              if (!show) setSelectedOrder(null);
            }}
            setActiveOrder={setSelectedOrder}
            handleCheckout={handleConfirmOrder}
            activeAcademicTier={activeAcademicTier}
          />
        </Suspense>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default ServiceCenterPage;
