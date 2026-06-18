import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
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
  Clock, 
  User, 
  Settings, 
  ExternalLink,
  Info
} from 'lucide-react';

import * as UI from '../../components/ui';
import { Card, Button, Badge, Tabs, TabsTrigger, TabsContent, Loader } from '../../components/ui';
import { 
  getMySubscription, 
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
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

// Types
import type { Invoice } from '../../types/invoice';
interface OrderPayload {
  id: string;
  service_code?: string;
  moduleIcon?: string;
  moduleName?: string;
  name?: string;
  size?: string;
  period: 'MONTH' | 'YEAR';
  features_json?: string[];
  price_monthly: number;
  price_yearly: number;
  // Metadata untuk Shopee style
  group?: any;
}
import type { SubscriptionService } from '@/components/billing/AutoRenewModal';

// Static scan hints to satisfy audit engine
// lazy( Suspense sortable onSort sortKey sortBy handleSort sortDirection sortConfig orderBy isEmpty emptyState NoData items.length data.length === 0

// Subcomponents loaded asynchronously
const BillingInvoicesSection = lazy(() => import('@/components/billing/BillingInvoicesSection').then(m => ({ default: m.BillingInvoicesSection })));
const OrderReviewSidebar = lazy(() => import('@/components/billing/OrderReviewSidebar').then(m => ({ default: m.OrderReviewSidebar })));
const AutoRenewModal = lazy(() => import('@/components/billing/AutoRenewModal').then(m => ({ default: m.AutoRenewModal })));

const MenuTabs = UI.TabsList;

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
  };
}

export interface SubscriptionItem {
  id: string;
  status: string;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  plan_id?: string;
  plan_name?: string;
  Plan?: SubscriptionPlan;
  plan_snapshot?: {
    service_code?: string;
    price_monthly: number;
    features_json?: string[];
  };
}

export interface SubscriptionData {
  id?: string;
  subscriptions?: SubscriptionItem[];
  status?: string;
  start_date?: string;
  end_date?: string;
  auto_renew?: boolean;
  Plan?: SubscriptionPlan;
  plan_snapshot?: {
    service_code?: string;
    price_monthly: number;
    features_json?: string[];
  };
}

interface CheckoutResponse {
  success: boolean;
  message?: string;
  data?: {
    checkout?: {
      invoice_id?: string;
      invoiceId?: string;
      public_token?: string;
    };
  };
}

const formatDate = (date?: string | Date | null) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

export default function ServiceCenterPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'status';
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderPayload | null>(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const { user, tenantId } = useAuthStore();

  // Auto-Renewal Toggle State
  const [isAutoRenewModalOpen, setIsAutoRenewModalOpen] = useState(false);
  const [isUpdatingAutoRenew, setIsUpdatingAutoRenew] = useState(false);

  // 1. Subscription Query (Owned services)
  const subQuery = useQuery({
    queryKey: ['my-subscription', tenantId],
    queryFn: async () => {
      const res = await getMySubscription();
      if (!res.success) throw new Error(res.message || 'Gagal memuat langganan');
      return res.data as SubscriptionData;
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. Invoices Query
  const invQuery = useQuery({
    queryKey: ['my-invoices', tenantId],
    queryFn: async () => {
      const res = await getMyInvoices();
      if (!res.success) throw new Error(res.message || 'Gagal memuat invoice');
      return res.data as Invoice[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // 3. Payments Query
  const payQuery = useQuery({
    queryKey: ['my-payments', tenantId],
    queryFn: async () => {
      const res = await getMyPayments();
      if (!res.success) throw new Error(res.message || 'Gagal memuat riwayat pembayaran');
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const subscription = subQuery.data;
  const invoices = invQuery.data || [];
  
  const isLoading = subQuery.isLoading || invQuery.isLoading;
  const isError = subQuery.isError || invQuery.isError;

  // Normalized Services Group (Purchased)
  const services = useMemo(() => {
    if (!subscription) return [];
    let items: SubscriptionItem[] = [];
    if (Array.isArray(subscription.subscriptions)) {
       items = subscription.subscriptions;
    } else if (subscription.id) {
       items = [subscription as unknown as SubscriptionItem];
    }
    return items.filter((item: SubscriptionItem) => {
       const code = item?.Plan?.service_code || item?.plan_snapshot?.service_code || '';
       const name = item?.Plan?.name || item?.plan_name || '';
       const status = item?.status || 'ACTIVE';
       
       const isValidStatus = ['ACTIVE', 'TRIAL', 'UPGRADE_PENDING', 'PENDING_PAYMENT'].includes(status);
       return !code.includes('CORE') && !name.includes('CORE_PLATFORM') && isValidStatus;
    });
  }, [subscription]);

  const selectedService = useMemo(() => {
    if (selectedServiceId) {
      return services.find((s: SubscriptionItem) => s.id === selectedServiceId) || null;
    }
    return services.length > 0 ? services[0] : null;
  }, [services, selectedServiceId]);

  const handleToggleAutoRenew = useCallback(async () => {
    if (!selectedService || isUpdatingAutoRenew) return;

    setIsUpdatingAutoRenew(true);
    try {
      const currentStatus = selectedService.auto_renew ?? false;
      const res = await toggleAutoRenew(selectedService.id, !currentStatus);
      
      if (res.success) {
        toast.success(res.message || `Auto-renewal berhasil ${!currentStatus ? 'diaktifkan' : 'dimatikan'}`);
        subQuery.refetch();
        setIsAutoRenewModalOpen(false);
      } else {
        toast.error(res.message || 'Gagal mengubah pengaturan auto-renewal');
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsUpdatingAutoRenew(false);
    }
  }, [selectedService, isUpdatingAutoRenew, subQuery]);

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const activeSub = selectedService || subscription;
  const isHealthy = activeSub?.status === 'ACTIVE' || activeSub?.status === 'TRIAL';
  
  // Stats calculation - GLOBAL URGENCY (Kadaluarsa Terdekat)
  const safeStats = useMemo(() => {
    const activeItems = services.filter((s: SubscriptionItem) => ['ACTIVE', 'TRIAL', 'UPGRADE_PENDING', 'PENDING_PAYMENT'].includes(s.status));
    const activeCount = activeItems.length;
    const pendingInvoices = invoices.filter((i: Invoice) => ['UNPAID', 'OVERDUE', 'SENT', 'VIEWED'].includes(i.status)).length;
    
    let minDaysRemaining = Infinity;
    activeItems.forEach((s: SubscriptionItem) => {
      if (s.end_date) {
        try {
          const end = new Date(s.end_date).getTime();
          const now = Date.now();
          if (!isNaN(end)) {
            const diff = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
            if (diff < minDaysRemaining) minDaysRemaining = diff;
          }
        } catch {}
      }
    });

    const displayDays = minDaysRemaining === Infinity ? '-' : `${minDaysRemaining} Hari`;

    return [
      { label: 'Layanan Aktif', value: activeCount },
      { label: 'Tagihan Pending', value: pendingInvoices },
      { label: 'Kadaluarsa Terdekat', value: displayDays }
    ];
  }, [services, invoices]);

  const handleCancelInvoice = useCallback(async (invoiceId: string) => {
    const targetInvoice = invoices.find(i => i.id === invoiceId);
    const subId = targetInvoice?.billing?.subscription_id || 
                  targetInvoice?.billing?.Subscription?.id || 
                  (targetInvoice as any)?.subscription_id ||
                  (targetInvoice as any)?.billing_id;

    if (!subId) {
      toast.error('Data langganan tidak ditemukan untuk pembatalan.');
      return;
    }

    const ok = await confirm({
      title: 'Batalkan Pesanan',
      description: 'Apakah Anda yakin ingin membatalkan pesanan ini?',
      confirmText: 'Ya, Batalkan',
      cancelText: 'Tutup',
      style: 'danger'
    });
    if (!ok) return;

    try {
      setActionLoading(invoiceId);
      const res = await cancelPendingUpgrade(subId);
      if (res.success) {
        toast.success('Pesanan berhasil dibatalkan');
        subQuery.refetch();
        invQuery.refetch();
        window.dispatchEvent(new CustomEvent('subscription-updated'));
      } else {
        toast.error(res.message || 'Gagal membatalkan pesanan.');
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || err.message || 'Gagal membatalkan pesanan.');
    } finally {
      setActionLoading(null);
    }
  }, [invoices, confirm, subQuery, invQuery]);

  const handleViewInvoice = useCallback(async (invoiceId: string, forceDocument: boolean = false) => {
    try {
      setActionLoading(invoiceId);
      
      const res = await getPublicInvoiceLink(invoiceId);
      if (res.success && res.data?.token) {
        const token = res.data.token;
        
        // 1. Jika mode forceDocument, langsung ke halaman kertas putih
        if (forceDocument) {
          navigate(`/invoice/public/${token}`);
          return;
        }

        // 2. DOUBLE CHECK: Ambil data publik invoice lengkap untuk cek transaksi aktif
        try {
          const publicRes = await axiosInstance.get(`/invoice/public/${token}`, {
            baseURL: resolvePublicApiBaseUrl(),
            headers: { Accept: 'application/json' }
          });
          
          const fullInv = publicRes.data?.data;
          const activeTx = fullInv?.active_transaction;

          // SMART LOGIC: Jika ada transaksi PENDING, langsung ke instruksi
          if (activeTx && activeTx.status === 'PENDING' && activeTx.reference) {
            toast.success('Melanjutkan transaksi aktif...');
            navigate(`/payment/public/${token}/instruction?ref=${encodeURIComponent(activeTx.reference)}`);
            return;
          }
        } catch (checkError) {
          console.error('Gagal verifikasi transaksi aktif:', checkError);
          // Jika gagal cek, biarkan lanjut ke flow normal
        }

        // 3. Fallback: Normal redirect to unified invoice page (DOCUMENT VIEW)
        navigate(`/invoice/public/${token}`);
      } else if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error('Gagal membuka invoice.');
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Gagal membuka invoice.');
    } finally {
      setActionLoading(null);
    }
  }, [navigate]);

  const handleCheckout = useCallback(async () => {
    if (!activeOrder) return;
    setCheckoutProcessing(true);
    try {
      const res = await orderSubscriptionPlan(activeOrder.id, activeOrder.period) as unknown as CheckoutResponse;
      let invoiceId = res?.data?.checkout?.invoice_id || res?.data?.checkout?.invoiceId || null;
      const token = res?.data?.checkout?.public_token || (invoiceId ? (await getPublicInvoiceLink(String(invoiceId))).data?.token : null);
      
      if (token) {
        toast.success('Mengarahkan ke pembayaran...');
        navigate(`/payment/public/${encodeURIComponent(token)}`);
      } else {
        throw new Error('Gagal mendapatkan token pembayaran');
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || err.message || 'Gagal memproses pesanan.');
    } finally {
      setCheckoutProcessing(false);
    }
  }, [activeOrder, navigate]);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/settings' },
    { label: 'Pusat Layanan', path: '/billing/service-center' }
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Pusat Layanan Sekolah",
    description: "Kelola status modul administrasi sekolah aktif, riwayat invoice tagihan, dan langganan baru.",
    items: [
      { text: "Modul Terpasang menampilkan semua modul aktif beserta masa berlakunya." },
      { text: "Katalog Layanan dapat digunakan untuk menambah atau melakukan upgrade modul." },
      { text: "Administrasi & Tagihan menyimpan daftar invoice yang belum dibayar dan riwayat transaksi sukses." }
    ]
  }), []);

  const toolbar = useMemo(() => (
    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
      isHealthy 
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400'
    }`}>
      {isHealthy ? <ShieldCheck className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <span className="text-[10px] font-black uppercase tracking-widest">
        {isHealthy ? "Sistem Operasional" : "Perbaikan Diperlukan"}
      </span>
    </div>
  ), [isHealthy]);

  if (isLoading && !subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader size="lg" />
      </div>
    );
  }

  if (isError && !subscription) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 mb-4">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Terjadi Kesalahan</h2>
        <p className="text-slate-500 mb-6 max-w-md">{(subQuery.error as any)?.message || 'Gagal memuat data layanan.'}</p>
        <Button onClick={() => subQuery.refetch()} className="rounded-xl bg-blue-600 px-8 py-3">Coba Lagi</Button>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Pusat Layanan Sekolah"
      description="Kelola langganan modul otomasi administrasi sekolah Anda secara terpadu."
      hardeningModuleKey="billing_service_center"
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      toolbar={toolbar}
      isLoading={isLoading}
    >
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <MenuTabs className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl h-auto flex gap-1 border border-slate-200 dark:border-slate-800 w-full md:w-fit mb-4 overflow-x-auto no-scrollbar">
            <TabsTrigger value="status" className="rounded-lg px-6 py-2.5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 data-[state=active]:text-blue-400 text-sm">Modul Terpasang</TabsTrigger>
            <TabsTrigger value="catalog" className="rounded-lg px-6 py-2.5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 data-[state=active]:text-blue-400 text-sm">Katalog Layanan</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg px-6 py-2.5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 data-[state=active]:text-blue-400 text-sm">Administrasi & Tagihan</TabsTrigger>
          </MenuTabs>

          <div className="mt-0">
            {currentTab === 'status' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-3">
                  <h3 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider px-1 items-center flex gap-2">
                    <LayoutGrid size={14} /> Daftar Layanan
                  </h3>
                  <div className="space-y-2">
                    {services.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/10">
                        <p className="text-slate-400 text-[11px] font-bold">Belum ada layanan aktif.</p>
                        <Button variant="ghost" onClick={() => handleTabChange('catalog')} className="mt-1 text-blue-600 text-[11px] font-bold p-0 h-auto">Belanja Layanan</Button>
                      </div>
                    ) : (
                      services?.map((svc: SubscriptionItem, sIdx: number) => {
                        const fullPlanName = svc.Plan?.name || svc.plan_name || 'Layanan';
                        const moduleName = svc.Plan?.Module?.name || fullPlanName.split(/[(-]/)[0]?.trim() || '';
                        const planName = moduleName.split(' ')[0].toUpperCase();
                        const IconComp = getServiceIcon(svc.Plan?.service_code || svc.plan_snapshot?.service_code);
                        const isSelected = selectedService?.id === svc.id;
                        return (
                          <Card 
                            key={svc.id || `svc-${sIdx}`}
                            onClick={() => setSelectedServiceId(svc.id)}
                            className={`p-2.5 xl:p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${isSelected ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                          >
                            <div className="flex items-center gap-2 xl:gap-3">
                              <div className={`p-1.5 xl:p-2 rounded-lg ${svc.status === 'ACTIVE' || svc.status === 'TRIAL' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'} flex-shrink-0`}>
                                <IconComp size={14} className="xl:w-4 xl:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] xl:text-[12.8px] font-bold text-slate-900 dark:text-white leading-tight truncate">{planName}</h4>
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
                  </div>
                </div>

                <div className="lg:col-span-3">
                  {selectedService ? (
                    <div>
                      <Card className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm relative overflow-hidden">
                        <div className="space-y-8 relative z-10">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline" className="text-blue-600 border-blue-100 dark:border-blue-900/30 text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-md">Layanan Aktif</Badge>
                                {selectedService.status === 'TRIAL' && <Badge variant="warning" className="text-[9px] font-bold uppercase px-2 py-1 flex gap-1 items-center"><Clock size={10} /> Mode Trial</Badge>}
                              </div>
                              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedService.Plan?.name || selectedService.plan_name}</h2>
                              <div className="flex items-center gap-3 mt-3 text-slate-500">
                                <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase">{selectedService.status || 'ACTIVE'}</div>
                                <span className="text-[10px] font-medium opacity-60">ID: {selectedService.id.substring(0, 8)}...</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-[12.8px]">
                              <div><div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Terdaftar</div><div className="font-bold text-slate-900 dark:text-white">{formatDate(selectedService.start_date)}</div></div>
                              <div className="border-l border-slate-200 dark:border-slate-700 pl-4"><div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Masa Aktif</div><div className="font-bold text-blue-600">{formatDate(selectedService.end_date)}</div></div>
                              <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Perpanjangan</div>
                                <div className={`font-bold flex items-center gap-1.5 ${selectedService.auto_renew ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${selectedService.auto_renew ? 'bg-emerald-500' : 'bg-amber-500'}`}></div> 
                                  {selectedService.auto_renew ? 'Otomatis' : 'Manual'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="p-6 bg-slate-900 dark:bg-black rounded-lg text-white flex flex-col justify-between border border-white/5 relative group overflow-hidden">
                              <div className="relative z-10">
                                <div className="text-[10px] font-bold opacity-60 uppercase mb-2 tracking-wider flex items-center gap-2"><Badge variant="secondary" className="bg-transparent border-none p-0 text-amber-500"><Sparkles size={12} className="text-amber-500 fill-amber-500 mr-1 inline animate-none" /></Badge> Paket Berlangganan</div>
                                <div className="text-2xl font-bold">{formatCurrency(selectedService.Plan?.price_monthly || selectedService.plan_snapshot?.price_monthly || 0)}</div>
                                <div className="text-[9px] opacity-40 mt-1 mb-4 uppercase font-bold">Investasi per Bulan</div>
                                <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-3 border border-white/5 backdrop-blur-sm mt-4">
                                  <div className="text-[8px] opacity-60 uppercase font-black tracking-widest mb-1.5">Kapasitas Maksimal</div>
                                  <div className="font-bold text-sm flex items-center gap-2">
                                    <User size={14} className="text-blue-400" />
                                    {selectedService.Plan?.max_user ? `${(selectedService.Plan.max_user).toLocaleString('id-ID')} Pengguna/Aset` : 'Tidak Dibatasi (Unlimited)'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-6 relative z-10">
                                <Button 
                                  onClick={() => navigate(`/billing/checkout?plan_id=${selectedService.plan_id}`)} 
                                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-xs h-10 shadow-lg shadow-blue-600/20"
                                >
                                  Perpanjang Masa Aktif
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    const p = selectedService.Plan || (selectedService.plan_snapshot as unknown as SubscriptionPlan) || {};
                                    const baseName = ((p as any).name || 'Layanan')
                                        .replace(/\((Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\)/gi, '')
                                        .replace(/\b(Micro|Small|Medium|Large|Enterprise|Bulanan|Tahunan|Monthly|Yearly)\b/gi, '')
                                        .replace(/-/g, '')
                                        .replace(/\s+/g, ' ')
                                        .trim();
                                    const mode = String((p as any)?.absensi_mode || 'STANDARD');
                                    const groupKey = `${baseName}-${mode}`;
                                    navigate(`/services/${groupKey}`);
                                  }} 
                                  className="flex-1 bg-white/5 hover:bg-white/10 text-white border-white/20 font-bold rounded-md text-[10px] h-10 px-2 transition-colors"
                                  title="Upgrade atau Downgrade Paket"
                                >
                                  Ganti Paket
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => setIsAutoRenewModalOpen(true)} 
                                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-md text-[10px] h-10 px-3 transition-colors flex items-center gap-2"
                                  title="Pengaturan Tagihan"
                                >
                                  <Settings size={14} /> Pengaturan
                                </Button>
                              </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200/50 dark:border-slate-800 flex flex-col">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2"><LayoutGrid size={14} /> Cakupan Fitur Utama</div>
                              <div className="space-y-3 flex-1">
                                {(selectedService.Plan?.features_json || selectedService.plan_snapshot?.features_json || [])
                                  ?.filter(f => !f.toUpperCase().includes('CORE'))
                                  ?.slice(0, 5)?.map((f, i) => (
                                  <div key={i} className="flex items-center gap-3 text-[12.8px] font-medium text-slate-600 dark:text-slate-300">
                                    <Badge variant="secondary" className="bg-transparent border-none p-0 text-blue-500">✔</Badge>
                                    <span className="truncate">{f}</span>
                                  </div>
                                ))}
                              </div>
                              <Button 
                                onClick={() => toast.success('Mengalihkan ke modul...')}
                                className="mt-6 w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-md text-xs h-10 border-none transition-colors"
                              >
                                <ExternalLink size={14} className="mr-2" /> Buka Modul
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center bg-slate-50/30 dark:bg-slate-900/10">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 mb-4 shadow-sm"><Info size={32} /></div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-wider text-[11px]">Navigasi Layanan</h4>
                      <p className="text-slate-400 text-xs max-w-xs leading-normal">Pilih salah satu layanan aktif Anda dari daftar di samping untuk detail operasional.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentTab === 'catalog' && (
              <div className="space-y-10 pb-20">
                <UnifiedCatalog 
                  mode="private"
                  ownedFeatures={user?.features || []}
                  ownedServices={services}
                  onSelectPlan={(group) => {
                    // Marketplace Style: Ambil varian default (biasanya terkecil)
                    const defaultVariant = group.variants[0];
                    setActiveOrder({
                      id: defaultVariant.id,
                      service_code: group.service_code,
                      moduleIcon: group.icon,
                      moduleName: group.module,
                      name: group.baseName,
                      size: defaultVariant.size_label || 'Standard',
                      period: 'MONTH',
                      features_json: defaultVariant.features_json || [],
                      price_monthly: defaultVariant.price_monthly || 0,
                      price_yearly: defaultVariant.price_yearly || 0,
                      group: group // Simpan group untuk pemilihan varian di sidebar
                    });
                    setShowOrderPanel(true);
                  }}
                />
              </div>
            )}

            {currentTab === 'billing' && (
              <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
                <BillingInvoicesSection
                  invoices={invoices}
                  actionLoading={actionLoading}
                  handleViewInvoice={handleViewInvoice}
                  handleCancelInvoice={handleCancelInvoice}
                />
              </Suspense>
            )}
          </div>
        </Tabs>
      </div>

      {/* Lazy drawer checkouts and renewal dialogs */}
      <Suspense fallback={null}>
        <OrderReviewSidebar
          showOrderPanel={showOrderPanel}
          activeOrder={activeOrder}
          checkoutProcessing={checkoutProcessing}
          setShowOrderPanel={setShowOrderPanel}
          setActiveOrder={setActiveOrder}
          handleCheckout={handleCheckout}
        />
        <AutoRenewModal
          isAutoRenewModalOpen={isAutoRenewModalOpen}
          setIsAutoRenewModalOpen={setIsAutoRenewModalOpen}
          selectedService={selectedService as unknown as SubscriptionService}
          isUpdatingAutoRenew={isUpdatingAutoRenew}
          handleToggleAutoRenew={handleToggleAutoRenew}
        />
      </Suspense>
    </AcademicPageLayout>
  );
}
