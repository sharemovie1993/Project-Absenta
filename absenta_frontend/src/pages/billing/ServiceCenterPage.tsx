import React, { useState, useCallback, useMemo, lazy, Suspense, useRef, useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Sparkles, 
  History, 
  LayoutGrid, 
  ShoppingBag,
  Clock
} from 'lucide-react';

import { Button, Loader } from '@/components/ui';
import { SectionCard } from '@/components/ui/SectionCard';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { 
  getMySubscription, 
  syncMySubscription,
  getMyInvoices, 
  getMyPayments,
  cancelMyInvoice
} from '@/api/mySubscription.api';
import { orderSubscriptionPlan } from '@/api/subscription.api';
import useConfirm from '@/hooks/useConfirm';
import { 
  formatCurrency, 
  resolveServiceCatalogGroupKey
} from '@/lib/billingUtils';
import { formatDate } from '@/utils/layoutUtils';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

// Types
import type { Invoice } from '@/types/invoice';
import type { SubscriptionService } from '@/components/billing/AutoRenewModal';
import type { OrderPayload } from '@/components/billing/OrderReviewSidebar';
import type { 
  ServiceSubscriptionItem, 
  ConsolidatedServiceGroup 
} from '@/components/billing/service-center/ServiceCardsGrid';
import type { SubscriptionCycleItem } from '@/components/billing/service-center/SubscriptionCycleHistoryModal';

interface ServiceInvoice extends Invoice {
  subscription_id?: string;
  plan_name?: string;
}

// Zod Schema Validation Guard (Pilar 25)
const orderPayloadSchema = z.object({
  id: z.string().min(1, 'ID Paket wajib ada'),
  period: z.enum(['MONTH', 'YEAR', 'ONETIME']).optional(),
  price_monthly: z.number().nonnegative().optional(),
  price_yearly: z.number().nonnegative().optional(),
  price_onetime: z.number().nonnegative().optional()
});

// Lazy Loaded Subcomponents (Pilar 13 & Pilar 21)
const BillingInvoicesSection = lazy(() => import('@/components/billing/BillingInvoicesSection').then(m => ({ default: m.BillingInvoicesSection })));
const OrderReviewSidebar = lazy(() => import('@/components/billing/OrderReviewSidebar').then(m => ({ default: m.OrderReviewSidebar })));
const AutoRenewModal = lazy(() => import('@/components/billing/AutoRenewModal').then(m => ({ default: m.AutoRenewModal })));
const AcademicTierCard = lazy(() => import('@/components/billing/AcademicTierCard').then(m => ({ default: m.AcademicTierCard })));
const EmptySubscriptionOverview = lazy(() => import('@/components/billing/EmptySubscriptionOverview').then(m => ({ default: m.EmptySubscriptionOverview })));
const PackageComparisonModal = lazy(() => import('@/components/billing/service-center/PackageComparisonModal').then(m => ({ default: m.PackageComparisonModal })));
const SubscriptionCycleHistoryModal = lazy(() => import('@/components/billing/service-center/SubscriptionCycleHistoryModal').then(m => ({ default: m.SubscriptionCycleHistoryModal })));
const ServiceCardsGrid = lazy(() => import('@/components/billing/service-center/ServiceCardsGrid').then(m => ({ default: m.ServiceCardsGrid })));

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
    currentSubscription: SubscriptionCycleItem | null;
    historyItems: SubscriptionCycleItem[];
  }>({
    isOpen: false,
    serviceTitle: '',
    currentSubscription: null,
    historyItems: []
  });

  const handleOpenHistory = useCallback((title: string, current: ServiceSubscriptionItem, history: ServiceSubscriptionItem[]) => {
    setHistoryModal({
      isOpen: true,
      serviceTitle: title,
      currentSubscription: current as unknown as SubscriptionCycleItem,
      historyItems: history as unknown as SubscriptionCycleItem[]
    });
  }, []);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount (Pilar 5 Memory Leak Guard)
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyKey = useCallback((key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('Kode lisensi disalin ke clipboard!');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedKey(null), 2500);
  }, []);

  const confirm = useConfirm();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  }, [setSearchParams]);

  // React Query Fetchers (Pilar 31 Data Fetching Optimization)
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
      return {
        items: (res.data || []) as ServiceInvoice[],
        isLicenseServerOffline: Boolean(res.is_license_server_offline)
      };
    },
    staleTime: 60 * 1000
  });

  const isLicenseServerOffline = Boolean(invoicesQuery.data?.isLicenseServerOffline || subQuery.data?.is_license_server_offline);
  const invoicesData = useMemo(() => invoicesQuery.data?.items || [], [invoicesQuery.data]);

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
    const list: ServiceSubscriptionItem[] = Array.isArray(raw) ? [...raw] : [];

    const groups = new Map<string, ConsolidatedServiceGroup>();

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

  const services: ServiceSubscriptionItem[] = useMemo(() => {
    return (consolidatedServices ?? []).map(c => c.latest);
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
      value: isLicenseServerOffline ? '-' : String(invoicesData.filter(i => i.status === 'UNPAID' || i.status === 'PENDING').length || 0),
      icon: <History size={16} className="text-purple-600" />,
      variant: 'card' as const,
      gradient: "from-purple-500 to-violet-600",
      subtitle: isLicenseServerOffline ? "Server lisensi offline" : "Menunggu pembayaran"
    }
  ], [services, activeAcademicTier, invoicesData, isLicenseServerOffline]);

  const tabs = useMemo(() => [
    { id: 'services', label: 'Status Lisensi', icon: LayoutGrid },
    { id: 'invoices', label: 'Riwayat Tagihan', icon: History }
  ], []);

  const pendingInvoice = useMemo(() => {
    const list = invoicesData;
    return list.find((inv: ServiceInvoice) => !['PAID', 'CANCELLED', 'OVERDUE'].includes(String(inv.status).toUpperCase()));
  }, [invoicesData]);

  const handleExtend = useCallback((planId: string) => {
    navigate(`/billing/checkout?plan_id=${planId}`);
  }, [navigate]);

  const handleViewInvoice = useCallback((invoiceId: string, forceDocument?: boolean) => {
    if (forceDocument) {
      const cleanId = encodeURIComponent(String(invoiceId || '').replace(/^#/, '').trim());
      window.open(`/api/invoice/${cleanId}/print`, '_blank');
      return;
    }
    navigate(`/billing/checkout?invoice_id=${invoiceId}`);
  }, [navigate]);

  const [cancellingInvoiceId, setCancellingInvoiceId] = useState<string | null>(null);

  const handleCancelInvoice = useCallback(async (invoiceId: string) => {
    const cleanInvNum = String(invoiceId || '').replace(/^#/, '').trim();
    if (!cleanInvNum) return;

    const isConfirmed = await confirm({
      title: 'Batalkan Pesanan Tagihan',
      description: `Apakah Anda yakin ingin membatalkan pesanan tagihan #${cleanInvNum}? Tagihan yang dibatalkan akan ditutup dan Anda bebas memilih paket lain.`,
      confirmText: 'Ya, Batalkan Pesanan',
      cancelText: 'Kembali',
      style: 'danger'
    });

    if (!isConfirmed) return;

    setCancellingInvoiceId(cleanInvNum);
    try {
      const res = await cancelMyInvoice(cleanInvNum);
      if (res.success) {
        toast.success(res.message || 'Tagihan berhasil dibatalkan.');
        await Promise.all([
          invoicesQuery.refetch(),
          subQuery.refetch(),
          paymentsQuery.refetch()
        ]);
      } else {
        toast.error(res.message || 'Gagal membatalkan tagihan.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(errorObj.response?.data?.message || errorObj.message || 'Terjadi kesalahan saat membatalkan tagihan.');
    } finally {
      setCancellingInvoiceId(null);
    }
  }, [confirm, invoicesQuery, subQuery, paymentsQuery]);

  const handleChangePlan = useCallback((item: ServiceSubscriptionItem, grp?: ConsolidatedServiceGroup) => {
    const payload = grp ? { ...item, ...grp } : item;
    const groupKey = resolveServiceCatalogGroupKey(payload);
    navigate(`/services/${groupKey}`);
  }, [navigate]);

  const handleOpenAutoRenew = useCallback(() => {
    setIsAutoRenewModalOpen(true);
  }, []);

  const handleConfirmOrder = useCallback(async () => {
    if (!selectedOrder) return;
    const parsed = orderPayloadSchema.safeParse(selectedOrder);
    if (!parsed.success) {
      toast.error('Data pesanan tidak valid.');
      return;
    }
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
      { text: "Gunakan tombol 'Katalog Pengadaan Modul' untuk menjelajahi dan mengaktifkan modul baru." },
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
            <span className="hidden sm:inline">Katalog Pengadaan Modul</span>
            <span className="sm:hidden">Katalog</span>
          </Button>
        }
      >
        <SectionCard fullWidth className="flex flex-col w-full max-w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full max-w-full min-w-0">
            {/* Reusable TabSwitcher (Pilar 27 & Pilar 30) */}
            <TabSwitcher
              tabs={tabs}
              activeTab={activeTab === 'catalog' ? 'services' : activeTab}
              onChange={handleTabChange}
            />

            {/* Cloud Server Status Banner */}
            {isLicenseServerOffline && (
              <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs w-full max-w-full min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate">
                    Koneksi ke Server Lisensi Cloud sedang offline / pemeliharaan. Seluruh modul lokal Anda tetap aktif dan beroperasi 100% normal.
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0 hidden sm:block">
                  Cloud Offline
                </span>
              </div>
            )}

            {/* Pending Invoice Notification Banner */}
            {pendingInvoice && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs w-full max-w-full min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                    <Clock size={18} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-amber-950 dark:text-amber-100 truncate">
                      Pesanan Menunggu Pembayaran: #{pendingInvoice.invoice_number}
                    </h4>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                      {pendingInvoice.plan_name || 'Layanan Absenta'} &bull; {formatCurrency(pendingInvoice.total_amount || pendingInvoice.amount || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelInvoice(pendingInvoice.invoice_number)}
                    disabled={cancellingInvoiceId === String(pendingInvoice.invoice_number).replace(/^#/, '')}
                    className="border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    {cancellingInvoiceId === String(pendingInvoice.invoice_number).replace(/^#/, '') ? <Loader size="sm" /> : 'Batalkan Pesanan'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/billing/checkout?token=${pendingInvoice.invoice_number}&plan_id=${pendingInvoice.plan_id || ''}`)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Lanjutkan Pembayaran
                  </Button>
                </div>
              </div>
            )}

            {/* Tab: Services (Option A: Interactive Card Grid) */}
            {(activeTab === 'services' || activeTab === 'catalog') && (
              <div className="space-y-5 w-full max-w-full min-w-0">
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
                  <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat modul lisensi...</div>}>
                    <ServiceCardsGrid
                      consolidatedServices={consolidatedServices}
                      onExtend={handleExtend}
                      onOpenComparison={handleOpenComparison}
                      onChangePlan={handleChangePlan}
                      onOpenAutoRenew={(id) => {
                        setSelectedServiceId(id);
                        handleOpenAutoRenew();
                      }}
                      onOpenHistory={handleOpenHistory}
                      copiedKey={copiedKey}
                      onCopyKey={handleCopyKey}
                    />
                  </Suspense>
                )}
              </div>
            )}

            {/* Tab: Invoices */}
            {activeTab === 'invoices' && (
              <div className="w-full max-w-full min-w-0">
                <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat riwayat tagihan...</div>}>
                  <BillingInvoicesSection
                    invoices={(invoicesData as ServiceInvoice[]) || []}
                    isLoading={invoicesQuery.isLoading || invoicesQuery.isFetching}
                    onRefresh={() => invoicesQuery.refetch()}
                    handleViewInvoice={handleViewInvoice}
                    handleCancelInvoice={handleCancelInvoice}
                    actionLoading={cancellingInvoiceId}
                    isLicenseServerOffline={isLicenseServerOffline}
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
        <Suspense fallback={null}>
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
        </Suspense>

        {/* Modal Riwayat Siklus Langganan */}
        <Suspense fallback={null}>
          <SubscriptionCycleHistoryModal
            isOpen={historyModal.isOpen}
            onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
            serviceTitle={historyModal.serviceTitle}
            currentSubscription={historyModal.currentSubscription}
            historyItems={historyModal.historyItems}
          />
        </Suspense>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default ServiceCenterPage;
