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
  ShoppingBag
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

  const handleSelectCatalogItem = useCallback((raw: any) => {
    if (!raw) {
      toast.error('Data paket tidak valid');
      return;
    }

    // Jika objek berupa group (mengandung array variants)
    if (raw.variants && Array.isArray(raw.variants) && raw.variants.length > 0) {
      const isHardware = Boolean(
        raw.isHardware === true ||
        raw.module_id === 'SERVER_HARDWARE' ||
        raw.module_id === 'NETWORK_HARDWARE' ||
        raw.module_id === 'ABSENSI_HARDWARE' ||
        raw.module_id === 'PHYSICAL_SERVICE' ||
        (raw.id && String(raw.id).startsWith('HW_'))
      );
      const defaultVariant = raw.variants[0];
      const defaultSize = raw.sizes && raw.sizes.length > 0 ? raw.sizes[0] : (defaultVariant.size || defaultVariant.size_label || 'Micro');
      const period = isHardware ? 'ONETIME' : 'MONTH';

      const normalized: OrderPayload = {
        id: defaultVariant.id,
        service_code: raw.service_code || defaultVariant.service_code,
        moduleIcon: raw.icon || defaultVariant.module?.icon,
        moduleName: raw.module || defaultVariant.module?.name,
        name: raw.baseName || defaultVariant.name || raw.name,
        size: defaultSize,
        period: period as any,
        features_json: defaultVariant.features_json || [],
        price_monthly: Number(defaultVariant.price_monthly || 0),
        price_yearly: Number(defaultVariant.price_yearly || 0),
        price_onetime: Number(defaultVariant.price_onetime || 0),
        imageUrl: raw.imageUrl,
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
    const period = raw.period || (isHardware ? 'ONETIME' : (raw.billing_period === 'YEARLY' ? 'YEAR' : 'MONTH'));

    const normalized: OrderPayload = {
      id: raw.id || raw.plan_id || '',
      service_code: raw.service_code,
      moduleIcon: raw.moduleIcon || raw.module?.icon,
      moduleName: raw.moduleName || raw.module?.name,
      name: raw.name || raw.plan_name || 'Layanan',
      size: raw.size || raw.size_label || 'Micro',
      period: period as any,
      features_json: raw.features_json || raw.Plan?.features_json || [],
      price_monthly: Number(raw.price_monthly || raw.Plan?.price_monthly || 0),
      price_yearly: Number(raw.price_yearly || raw.Plan?.price_yearly || 0),
      price_onetime: Number(raw.price_onetime || raw.Plan?.price_onetime || 0),
      imageUrl: raw.imageUrl,
      group: raw.group || (raw.variants ? raw : null)
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
      const res: any = await orderSubscriptionPlan({
        plan_id: selectedOrder.id,
        billing_period: selectedOrder.period === 'YEAR' ? 'YEAR' : (selectedOrder.period === 'ONETIME' ? 'ONETIME' : 'MONTH')
      });
      const isSuccess = Boolean(res?.success || res?.data?.success || res?.data?.checkout_url || res?.data?.checkout);
      if (isSuccess) {
        toast.success('Pesanan berhasil dibuat!');
        const invData = res.data || res;
        const checkoutUrl = invData?.checkout_url || invData?.qr_url || invData?.pay_url || invData?.checkout?.public_url;
        const invId = invData?.invoice_id || invData?.token || invData?.invoice_token || invData?.checkout?.public_token;
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
            onClick={() => navigate('/catalog')}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3.5 font-bold text-xs flex items-center gap-1.5 shadow-xs"
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

            {/* Tab: Services */}
            {(activeTab === 'services' || activeTab === 'catalog') && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full min-w-0">
                <div className="lg:col-span-1 space-y-4">
                  <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Memuat kapasitas...</div>}>
                    <AcademicTierCard
                      activeAcademicTier={activeAcademicTier}
                      onTierChangeSuccess={() => subQuery.refetch()}
                    />
                  </Suspense>

                  <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider px-1 items-center flex gap-2">
                    <LayoutGrid size={14} /> Daftar Layanan
                  </h3>
                  <div className="space-y-2">
                    {services.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/10">
                        <p className="text-slate-400 text-[11px] font-bold">Belum ada layanan aktif.</p>
                        <Button
                          type="button"
                          aria-label="Belanja Layanan"
                          variant="ghost"
                          onClick={() => navigate('/catalog')}
                          className="mt-1 text-blue-600 text-[11px] font-bold p-0 h-auto"
                        >
                          Buka Katalog Pengadaan
                        </Button>
                      </div>
                    ) : (
                      services?.map((svc: SubscriptionItem, sIdx: number) => {
                        const fullPlanName = svc.Plan?.name || svc.plan_name || 'Layanan';
                        const sCode = String(svc.Plan?.service_code || svc.plan_snapshot?.service_code || svc.service_code || '').toUpperCase();
                        const upperRaw = fullPlanName.toUpperCase();

                        let planName = 'LAYANAN';
                        let isMasterPackage = false;
                        if (sCode === 'PAKET_LENGKAP' || upperRaw.includes('PAKET LENGKAP')) {
                          planName = upperRaw.includes('MULTI') ? 'PAKET LENGKAP MULTI' : 'PAKET LENGKAP';
                          isMasterPackage = true;
                        } else if (sCode === 'CORE' || upperRaw.includes('FREE LISENSI') || upperRaw.includes('AKTIVASI SERVER')) {
                          planName = 'LISENSI SERVER';
                        } else if (sCode === 'ABSENSI' || upperRaw.includes('ABSENSI')) {
                          planName = upperRaw.includes('MULTI') ? 'ABSENSI MULTI SESI' : 'ABSENSI';
                        } else if (sCode === 'SAAS-NODE' || upperRaw.includes('SAAS-NODE')) {
                          planName = 'SAAS NODE ENGINE';
                        } else if (sCode === 'HUBIN' || upperRaw.includes('HUBUNGAN INDUSTRI')) {
                          planName = 'HUBUNGAN INDUSTRI';
                        } else if (sCode === 'SARPRAS' || upperRaw.includes('SARANA PRASARANA')) {
                          planName = 'SARANA & PRASARANA';
                        } else if (sCode === 'KOPERASI' || upperRaw.includes('KOPERASI')) {
                          planName = 'KOPERASI DIGITAL';
                        } else if (sCode === 'WHATSAPP' || upperRaw.includes('WHATSAPP')) {
                          planName = 'WHATSAPP GATEWAY';
                        } else if (sCode === 'EASY_TUNNEL' || upperRaw.includes('TUNNEL') || upperRaw.includes('VPN')) {
                          planName = 'EASY TUNNEL VPN';
                        } else {
                          const moduleName = svc.Plan?.Module?.name || fullPlanName.split(/[(-]/)[0]?.trim() || '';
                          planName = moduleName.toUpperCase();
                        }

                        const IconComp = getServiceIcon(svc.Plan?.service_code || svc.plan_snapshot?.service_code);
                        const isSelected = selectedService?.id === svc.id;
                        return (
                          <Card 
                            key={svc.id || `svc-${sIdx}`}
                            onClick={() => setSelectedServiceId(svc.id)}
                            className={`p-2.5 xl:p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${isSelected ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/20 shadow-xs ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                          >
                            <div className="flex items-center gap-2 xl:gap-3">
                              <div className={`p-1.5 xl:p-2 rounded-lg ${isMasterPackage ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xs' : (svc.status === 'ACTIVE' || svc.status === 'TRIAL' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')} flex-shrink-0`}>
                                <IconComp size={14} className="xl:w-4 xl:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-[11px] xl:text-[12.8px] font-bold text-slate-900 dark:text-white leading-tight truncate">{planName}</h4>
                                  {isMasterPackage && (
                                    <Badge variant="primary" className="text-[5.5px] xl:text-[6.5px] px-1 py-0 uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-black">ALL-IN-ONE</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 xl:gap-2 mt-0.5">
                                  <Badge variant={['ACTIVE', 'TRIAL', 'UPGRADE_PENDING'].includes(svc.status) ? 'success' : 'warning'} className="text-[6px] xl:text-[7px] px-1 py-0 uppercase">{svc.status}</Badge>
                                  <span className="text-[9px] text-slate-400 font-medium">Exp: {formatDate(svc.end_date)}</span>
                                </div>
                              </div>
                              <ChevronRight size={14} className={isSelected ? 'text-blue-500' : 'text-slate-300'} />
                            </div>
                          </Card>
                        );
                      })
                    )}
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
                      className="w-full mt-4 h-11 border-dashed hover:border-blue-500 hover:text-blue-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} className={subQuery.isRefetching ? 'animate-spin' : ''} />
                      Sinkronisasi Status Lisensi
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-3">
                  {selectedService ? (
                    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat rincian layanan...</div>}>
                      <ServiceDetailsCard
                        selectedService={selectedService}
                        onExtend={handleExtend}
                        onChangePlan={handleChangePlan}
                        onOpenAutoRenew={handleOpenAutoRenew}
                      />
                    </Suspense>
                  ) : (
                    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat ringkasan lisensi...</div>}>
                      <EmptySubscriptionOverview activeAcademicTier={activeAcademicTier} />
                    </Suspense>
                  )}
                </div>
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
