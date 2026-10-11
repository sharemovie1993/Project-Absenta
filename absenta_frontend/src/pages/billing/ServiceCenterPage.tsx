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
  ExternalLink,
  Clock,
  Layers,
  Key,
  Copy,
  Check
} from 'lucide-react';

import * as UI from '../../components/ui';
import { Card, Button, Badge, Tabs, TabsTrigger, TabsContent, Loader } from '../../components/ui';
import { SectionCard } from '../../components/ui/SectionCard';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { PackageComparisonModal } from './PackageComparisonModal';
import { SubscriptionHistoryModal } from './SubscriptionHistoryModal';
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
  license_key?: string | null;
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

  // Comparison Modal state
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonServiceId, setComparisonServiceId] = useState<string | null>(null);
  const [comparisonPlanName, setComparisonPlanName] = useState('Paket Lengkap');
  const [comparisonVariant, setComparisonVariant] = useState<'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise'>('Enterprise');

  const handleOpenComparison = useCallback((title: string, variant: string, svcId?: string) => {
    setComparisonServiceId(svcId || null);
    setComparisonPlanName(title);
    const validVariants: ('Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise')[] = ['Micro', 'Small', 'Medium', 'Large', 'Enterprise'];
    const matched = validVariants.find(v => v.toLowerCase() === variant.toLowerCase());
    setComparisonVariant(matched || 'Enterprise');
    setShowComparisonModal(true);
  }, []);

  // Subscription History Modal state
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    serviceTitle: string;
    currentSubscription: SubscriptionItem | null;
    historyItems: SubscriptionItem[];
  }>({
    isOpen: false,
    serviceTitle: '',
    currentSubscription: null,
    historyItems: []
  });

  const handleOpenHistory = useCallback((title: string, current: SubscriptionItem, history: SubscriptionItem[]) => {
    setHistoryModal({
      isOpen: true,
      serviceTitle: title,
      currentSubscription: current,
      historyItems: history
    });
  }, []);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyKey = useCallback((key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('Kode lisensi disalin ke clipboard!');
    setTimeout(() => setCopiedKey(null), 2500);
  }, []);

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

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncLicense = useCallback(async () => {
    setIsSyncing(true);
    try {
      const promise = (async () => {
        await syncMySubscription();
        await Promise.all([
          subQuery.refetch(),
          invoicesQuery.refetch(),
          paymentsQuery.refetch()
        ]);
      })();
      await toast.promise(promise, {
        loading: 'Menyingkronkan status lisensi...',
        success: 'Status lisensi berhasil diperbarui!',
        error: 'Gagal melakukan sinkronisasi lisensi.'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [subQuery, invoicesQuery, paymentsQuery]);

  const activeAcademicTier = subQuery.data?.active_academic_tier || 'CORE_PLATFORM';

  const consolidatedServices = useMemo(() => {
    const raw = subQuery.data?.services || subQuery.data?.all_subscriptions || subQuery.data?.subscriptions || [];
    const list: SubscriptionItem[] = Array.isArray(raw) ? [...raw] : [];

    const groups = new Map<string, {
      moduleKey: string;
      latest: SubscriptionItem;
      history: SubscriptionItem[];
      mainTitle: string;
      variantName: string;
      isMasterPackage: boolean;
      isPermanent: boolean;
    }>();

    list.forEach((svc) => {
      const fullPlanName = svc.Plan?.name || svc.plan_snapshot?.name || svc.plan_name || 'Layanan Absenta';
      const sCode = String(svc.service_code || svc.plan_snapshot?.service_code || svc.Plan?.service_code || '').toUpperCase();
      const upperRaw = fullPlanName.toUpperCase();

      let variantName = 'Standar';
      if (upperRaw.includes('ENTERPRISE')) variantName = 'Enterprise';
      else if (upperRaw.includes('LARGE')) variantName = 'Large';
      else if (upperRaw.includes('MEDIUM')) variantName = 'Medium';
      else if (upperRaw.includes('SMALL')) variantName = 'Small';
      else if (upperRaw.includes('MICRO')) variantName = 'Micro';

      let mainTitle = 'Aplikasi Absenta';
      let moduleKey = sCode || 'ABSENSI';
      let isMasterPackage = false;

      if (sCode === 'PAKET_LENGKAP' || upperRaw.includes('PAKET LENGKAP')) {
        mainTitle = 'Paket Lengkap';
        moduleKey = 'PAKET_LENGKAP';
        isMasterPackage = true;
        if (variantName === 'Standar') variantName = 'Enterprise';
      } else if (sCode === 'ABSENSI' || upperRaw.includes('ABSENSI')) {
        mainTitle = 'Aplikasi Absensi';
        moduleKey = 'ABSENSI';
      } else if (sCode === 'ACADEMIC' || upperRaw.includes('ACADEMIC') || upperRaw.includes('KURIKULUM')) {
        mainTitle = 'Aplikasi Akademik & Kurikulum';
        moduleKey = 'ACADEMIC';
      } else if (sCode === 'KESISWAAN' || upperRaw.includes('KESISWAAN') || upperRaw.includes('BPBK')) {
        mainTitle = 'Aplikasi Kesiswaan & BP/BK';
        moduleKey = 'KESISWAAN';
      } else if (sCode === 'HUBIN' || upperRaw.includes('HUBUNGAN INDUSTRI') || upperRaw.includes('PKL')) {
        mainTitle = 'Aplikasi Hubin & PKL';
        moduleKey = 'HUBIN';
      } else if (sCode === 'SARPRAS' || upperRaw.includes('SARANA PRASARANA') || upperRaw.includes('INVENTORY')) {
        mainTitle = 'Aplikasi Sarpras';
        moduleKey = 'SARPRAS';
      } else if (sCode === 'KOPERASI' || sCode === 'COOPERATIVE' || upperRaw.includes('KOPERASI')) {
        mainTitle = 'Aplikasi Koperasi Digital';
        moduleKey = 'KOPERASI';
      } else if (sCode === 'WHATSAPP' || upperRaw.includes('WHATSAPP')) {
        mainTitle = 'WhatsApp Gateway Notifikasi';
        moduleKey = 'WHATSAPP';
      } else if (sCode === 'EASY_TUNNEL' || sCode === 'EASY' || upperRaw.includes('TUNNEL') || upperRaw.includes('VPN')) {
        mainTitle = 'Easy Tunnel VPN';
        moduleKey = 'EASY_TUNNEL';
        if (variantName === 'Standar') variantName = 'Gateway';
      } else if (sCode === 'SAAS-NODE' || upperRaw.includes('SAAS-NODE')) {
        mainTitle = 'Server Appliance (SaaS Node)';
        moduleKey = 'SAAS-NODE';
        if (variantName === 'Standar') variantName = 'Node Server';
      } else if (sCode === 'CORE' || upperRaw.includes('FREE LISENSI') || upperRaw.includes('AKTIVASI SERVER')) {
        mainTitle = 'Lisensi Server Absenta';
        moduleKey = 'CORE';
        if (variantName === 'Standar') variantName = 'Core';
      } else {
        mainTitle = fullPlanName;
        moduleKey = sCode || fullPlanName;
      }

      const endYear = new Date(svc.end_date).getFullYear();
      const isPermanent = endYear >= 2090;

      const existing = groups.get(moduleKey);
      if (!existing) {
        groups.set(moduleKey, {
          moduleKey,
          latest: svc,
          history: [],
          mainTitle,
          variantName,
          isMasterPackage,
          isPermanent
        });
      } else {
        const existingEndTime = new Date(existing.latest.end_date || 0).getTime();
        const currentEndTime = new Date(svc.end_date || 0).getTime();
        const isCurrentActive = svc.status === 'ACTIVE' || svc.status === 'TRIAL';
        const isExistingActive = existing.latest.status === 'ACTIVE' || existing.latest.status === 'TRIAL';

        if ((isCurrentActive && !isExistingActive) || (isCurrentActive === isExistingActive && currentEndTime > existingEndTime)) {
          existing.history.push(existing.latest);
          existing.latest = svc;
          existing.mainTitle = mainTitle;
          existing.variantName = variantName;
          existing.isMasterPackage = isMasterPackage;
          existing.isPermanent = isPermanent;
        } else {
          existing.history.push(svc);
        }
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.isMasterPackage && !b.isMasterPackage) return -1;
      if (!a.isMasterPackage && b.isMasterPackage) return 1;

      if (!a.isPermanent && b.isPermanent) return -1;
      if (a.isPermanent && !b.isPermanent) return 1;

      return new Date(b.latest.end_date || 0).getTime() - new Date(a.latest.end_date || 0).getTime();
    });
  }, [subQuery.data]);

  const services: SubscriptionItem[] = useMemo(() => {
    return consolidatedServices.map(c => c.latest);
  }, [consolidatedServices]);

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

  const pendingInvoice = useMemo(() => {
    const list = invoicesQuery.data || [];
    return list.find((inv: any) => !['PAID', 'CANCELLED', 'OVERDUE'].includes(String(inv.status).toUpperCase()));
  }, [invoicesQuery.data]);

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

            {/* Pending Invoice Notification Banner */}
            {pendingInvoice && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                    <Clock size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950 dark:text-amber-100">
                      Pesanan Menunggu Pembayaran: #{pendingInvoice.invoice_number}
                    </h4>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                      {pendingInvoice.plan_name || 'Layanan Absenta'} &bull; {formatCurrency(pendingInvoice.total_amount || pendingInvoice.amount || 0)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/billing/checkout?token=${pendingInvoice.invoice_number}&plan_id=${pendingInvoice.plan_id || ''}`)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0"
                >
                  Lanjutkan Pembayaran
                </Button>
              </div>
            )}

            {/* Tab: Services (Option A: Interactive Card Grid) */}
            {(activeTab === 'services' || activeTab === 'catalog') && (
              <div className="space-y-5 w-full min-w-0">
                {/* Unified Compact Capacity & Sync Control Banner */}
                <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Memuat kapasitas...</div>}>
                  <AcademicTierCard
                    activeAcademicTier={activeAcademicTier}
                    onTierChangeSuccess={() => subQuery.refetch()}
                    onSync={handleSyncLicense}
                    isSyncing={isSyncing || subQuery.isRefetching}
                  />
                </Suspense>

                {/* Section Header */}
                <div className="flex items-center justify-between pt-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutGrid size={16} className="text-blue-600" />
                    <span>Daftar Modul &amp; Lisensi Aktif</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold">
                      {services.length} Modul
                    </span>
                  </h3>
                </div>

                {/* Interactive Card Grid */}
                {consolidatedServices.length === 0 ? (
                  <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat ringkasan lisensi...</div>}>
                    <EmptySubscriptionOverview activeAcademicTier={activeAcademicTier} />
                  </Suspense>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 w-full">
                    {consolidatedServices.map((group, sIdx: number) => {
                      const svc = group.latest;
                      const sCode = String(svc.service_code || svc.plan_snapshot?.service_code || svc.Plan?.service_code || '').toUpperCase();
                      const IconComp = getServiceIcon(sCode || svc.Plan?.service_code || svc.plan_snapshot?.service_code);
                      const price = svc.Plan?.price_monthly || svc.plan_snapshot?.price_monthly || 0;
                      const maxUser = svc.Plan?.max_user;
                      const features = svc.Plan?.features_json || svc.plan_snapshot?.features_json || [];
                      const daysLeft = Math.ceil((new Date(svc.end_date).getTime() - Date.now()) / (1000 * 3600 * 24));
                      const isExpired = !group.isPermanent && daysLeft <= 0;
                      const hasHistory = group.history.length > 0;

                      return (
                        <Card 
                          key={svc.id || `group-${sIdx}`}
                          className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700"
                        >
                          {/* Accent Top Bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${group.isMasterPackage ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400' : group.isPermanent ? 'bg-slate-300 dark:bg-slate-700' : 'bg-blue-600'}`} />

                          <div className="space-y-2.5 pt-0.5">
                            {/* Card Header: Bebas Truncate */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className={`w-9 h-9 rounded-xl ${group.isMasterPackage ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xs' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-100/80 dark:border-blue-800/80'} flex items-center justify-center shrink-0 mt-0.5`}>
                                  <IconComp size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2" title={group.mainTitle}>
                                    {group.mainTitle}
                                  </h4>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                                      Varian {group.variantName}
                                    </span>
                                    {group.isPermanent && (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        Bawaan Platform
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Badge variant={['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'].includes(svc.status) ? 'success' : 'warning'} className="text-[7.5px] font-black uppercase px-1.5 py-0.2">
                                  {svc.status}
                                </Badge>
                                {group.isMasterPackage && (
                                  <span className="text-[7.5px] font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 uppercase">
                                    ALL-IN-ONE
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Clean Structured Metrics Box (Bebas Potong) */}
                            <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                              {/* Row 1: Masa Aktif */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Masa Aktif</span>
                                <div className="text-right">
                                  <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                                    {group.isPermanent ? 'Permanen' : formatDate(svc.end_date)}
                                  </span>
                                  <span className={`text-[9.5px] font-bold ml-1.5 ${
                                    group.isPermanent ? 'text-emerald-600 dark:text-emerald-400' : isExpired ? 'text-rose-500' : daysLeft <= 14 ? 'text-amber-500' : 'text-slate-500'
                                  }`}>
                                    {group.isPermanent ? '(Seumur Hidup)' : `(${daysLeft} Hari)`}
                                  </span>
                                </div>
                              </div>

                              {/* Row 2: Kapasitas & Biaya */}
                              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Kuota:</span>
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {maxUser ? `${maxUser.toLocaleString('id-ID')} Siswa` : 'Unlimited'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Biaya:</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {price > 0 ? formatCurrency(price) : 'Gratis'}
                                  </span>
                                </div>
                              </div>

                              {/* Row 3: Kode Lisensi Tenant (jika tersedia) */}
                              {svc.license_key && (
                                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <Key size={11} className="text-amber-500 shrink-0" />
                                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Lisensi:</span>
                                    <span className="font-mono text-[10.5px] font-bold text-slate-800 dark:text-slate-200 truncate" title={svc.license_key}>
                                      {svc.license_key}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyKey(svc.license_key!, e)}
                                    className="p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 flex items-center gap-1 text-[9.5px] font-semibold"
                                    title="Salin kode lisensi ke clipboard"
                                  >
                                    {copiedKey === svc.license_key ? (
                                      <>
                                        <Check size={11} className="text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} />
                                        <span>Salin</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Features / Module chips atau info bawaan platform */}
                            {Array.isArray(features) && features.length > 0 && group.isMasterPackage ? (
                              <div className="flex items-center gap-1 text-[9.5px] flex-wrap pt-0.5 min-h-[22px]">
                                <span className="font-bold text-slate-400">Cakupan:</span>
                                {features.filter((f: string) => !String(f).toUpperCase().includes('CORE')).slice(0, 3).map((feat: string, fIdx: number) => (
                                  <span key={fIdx} className="font-medium px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                                    {String(feat).replace(/_/g, ' ')}
                                  </span>
                                ))}
                                {features.filter((f: string) => !String(f).toUpperCase().includes('CORE')).length > 3 && (
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    +{features.filter((f: string) => !String(f).toUpperCase().includes('CORE')).length - 3} modul
                                  </span>
                                )}
                              </div>
                            ) : group.isPermanent ? (
                              <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 dark:text-slate-500 pt-0.5 min-h-[22px]">
                                <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                                <span>Termasuk dalam lisensi dasar platform institusi.</span>
                              </div>
                            ) : (
                              <div className="min-h-[22px]" />
                            )}

                            {/* History indicator jika ada riwayat perpanjangan */}
                            {hasHistory && (
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenHistory(group.mainTitle, svc, group.history)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline transition-colors"
                                  title="Lihat riwayat siklus terdahulu"
                                >
                                  <History size={11} />
                                  <span>Siklus ke-{group.history.length + 1} (Lihat Riwayat)</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Rapi, Lega & Bebas Meluber */}
                          <div className="flex items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800">
                            {!group.isPermanent ? (
                              <Button
                                type="button"
                                variant="toolbarPrimary"
                                size="sm"
                                aria-label="Perpanjang Masa Aktif"
                                onClick={() => handleExtend(svc.plan_id || svc.id)}
                                className="flex-1 rounded-xl font-bold text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-1.5"
                              >
                                <Sparkles size={12} />
                                <span>Perpanjang</span>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled
                                className="flex-1 rounded-xl font-bold text-xs h-8 bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 cursor-default"
                              >
                                <span>Lisensi Aktif</span>
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label="Detail Paket & Komparasi"
                              onClick={() => handleOpenComparison(group.mainTitle, group.variantName, svc.id)}
                              className="rounded-xl font-bold text-xs h-8 px-3 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0 flex items-center gap-1.5"
                              title="Lihat Detail Paket & Komparasi Varian"
                            >
                              <Layers size={12} />
                              <span>Detail</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label="Ganti Paket"
                              onClick={() => handleChangePlan((svc.Plan || svc.plan_snapshot || {}) as Plan)}
                              className="rounded-xl font-bold text-xs h-8 px-2.5 border-slate-200 dark:border-slate-700 shrink-0 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                              title="Ganti atau Upgrade Paket"
                            >
                              Ganti
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label="Pengaturan Tagihan"
                              onClick={() => {
                                setSelectedServiceId(svc.id);
                                handleOpenAutoRenew();
                              }}
                              className="rounded-xl font-bold text-xs h-8 w-8 p-0 flex items-center justify-center border-slate-200 dark:border-slate-700 shrink-0 text-slate-500 hover:text-slate-800"
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

        {/* Modal Komparasi Varian & Modul */}
        <PackageComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          serviceId={comparisonServiceId}
          activePlanName={comparisonPlanName}
          activePlanVariant={comparisonVariant}
          onUpgrade={() => {
            setShowComparisonModal(false);
            navigate('/catalog');
          }}
        />

        {/* Modal Riwayat Siklus Langganan */}
        <SubscriptionHistoryModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
          serviceTitle={historyModal.serviceTitle}
          currentSubscription={historyModal.currentSubscription}
          historyItems={historyModal.historyItems}
        />
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default ServiceCenterPage;
