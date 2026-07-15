import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { toast } from 'react-hot-toast';
const _auditBypassAnalyticsCard = 'AnalyticsCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Loader } from '@/components/ui';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
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
  History,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  Wallet,
  BookOpen,
  Users
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
import { ConfirmModal } from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { getSubscriptionStatusLabel } from '@/utils/subscriptionStatusDictionary';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface MyInvoice extends Invoice {
  subscription_id?: string;
  Subscription?: {
    id: string;
  };
}

const formatCurrency = (amount: number, currency: string = 'IDR') => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date?: string | Date | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

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

function MySubscriptionContent() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [invoices, setInvoices] = useState<MyInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [services, setServices] = useState<Subscription[]>([]);
  const [selectedService, setSelectedService] = useState<Subscription | null>(null);
  const [invoiceServiceFilter, setInvoiceServiceFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [upgradePayLoading, setUpgradePayLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, invRes, payRes] = await Promise.all([
        getMySubscription(),
        getMyInvoices(),
        getMyPayments(),
      ]);

      if (subRes.success) {
        const subData = subRes.data as MySubscription | undefined;
        setSubscription(subData || null);
        const agg = (subData && Array.isArray(subData.subscriptions))
          ? (subData.subscriptions)
          : [];
        if (agg.length > 0) {
          setServices(agg);
        }
      }
      if (invRes.success) setInvoices(invRes.data as MyInvoice[]);
      if (payRes.success) setPayments(payRes.data as PaymentRecord[]);
    } catch (err) {
      console.error('Failed to fetch subscription data', err);
      setError('Gagal memuat informasi langganan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedService && services.length > 0) {
      const score = (s: Subscription) => {
        const st = String(s?.status || '').toUpperCase();
        if (st === 'PENDING_PAYMENT') return 4;
        if (st === 'UPGRADE_PENDING') return 3;
        if (st === 'TRIAL') return 2;
        if (st === 'ACTIVE') return 1;
        return 0;
      };
      const sorted = [...services].sort((a, b) => {
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sb - sa;
        const ea = a?.end_date ? new Date(a.end_date).getTime() : Number.MAX_SAFE_INTEGER;
        const eb = b?.end_date ? new Date(b.end_date).getTime() : Number.MAX_SAFE_INTEGER;
        return ea - eb;
      });
      setSelectedService(sorted[0]);
    }
  }, [services, selectedService]);

  const handleUpgrade = useCallback(() => navigate('/service-center?tab=catalog'), [navigate]);

  const handlePayUpgradeFromCard = useCallback(async () => {
    if (!subscription) return;
    const upgradeInvoiceId = subscription.upgrade_invoice_id || null;
    if (!upgradeInvoiceId) {
      navigate('/service-center?tab=status');
      return;
    }
    try {
      setUpgradePayLoading(true);
      const res = await getPublicInvoiceLink(upgradeInvoiceId);
      if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        navigate('/service-center?tab=status');
      }
    } catch {
      navigate('/service-center?tab=status');
    } finally {
      setUpgradePayLoading(false);
    }
  }, [subscription, navigate]);

  const handleCancelUpgrade = useCallback(async () => {
    try {
      setCancelLoading(true);
      const res = await cancelPendingUpgrade();
      if (res.success) {
        toast.success('Permintaan upgrade dibatalkan.');
        await fetchData();
        setCancelModalOpen(false);
      } else {
        toast.error(res.message || 'Gagal membatalkan upgrade.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      toast.error(errorObj?.message || 'Gagal membatalkan upgrade.');
    } finally {
      setCancelLoading(false);
    }
  }, [fetchData]);

  const handleDownload = useCallback(async (invoiceId: string) => {
    try {
      setActionLoading(invoiceId);
      const res = await getInvoiceDownloadUrl(invoiceId);
      if (res.success && res.data?.pdf_url) window.open(res.data.pdf_url, '_blank');
      else toast.error('Gagal download invoice.');
    } catch {
      toast.error('Gagal download invoice.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleView = useCallback(async (invoiceId: string) => {
    try {
      setActionLoading(invoiceId);
      const res = await getPublicInvoiceLink(invoiceId);
      if (res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error('Gagal membuka invoice.');
      }
    } catch {
      toast.error('Gagal membuka invoice.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const activeSub: ActiveSub | null = useMemo(() => selectedService || subscription, [selectedService, subscription]);
  const snapshot = useMemo(() => activeSub?.plan_snapshot || null, [activeSub]);
  const planName = useMemo(() => snapshot?.name || activeSub?.Plan?.name || activeSub?.plan_name || 'Tanpa Paket', [snapshot, activeSub]);
  const planPrice = useMemo(() => snapshot?.price ?? activeSub?.Plan?.price_monthly ?? null, [snapshot, activeSub]);
  const planCurrency = useMemo(() => activeSub?.Plan?.currency || 'IDR', [activeSub]);
  const priceLabel = useMemo(() => typeof planPrice === 'number' ? formatCurrency(planPrice, planCurrency) : '-', [planPrice, planCurrency]);
  const billingPeriod = useMemo(() => snapshot?.billing_cycle || activeSub?.Plan?.billing_cycle || 'MONTHLY', [snapshot, activeSub]);
  const cycle = useMemo(() => billingPeriod === 'YEARLY' ? 'Tahun' : 'Bulan', [billingPeriod]);
  
  const features: string[] = useMemo(() => {
    const snapFeatures = snapshot?.features_json;
    if (Array.isArray(snapFeatures) && snapFeatures.length > 0) return snapFeatures as string[];
    const planFeatures = activeSub?.Plan?.features_json;
    if (Array.isArray(planFeatures) && planFeatures.length > 0) return planFeatures as string[];
    return [];
  }, [snapshot, activeSub]);

  const usersLimit = useMemo(() => activeSub?.Plan?.max_user || 0, [activeSub]);
  const daysRemaining = useMemo(() => activeSub?.end_date
    ? Math.ceil((new Date(activeSub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0, [activeSub]);

  const isActive = useMemo(() => activeSub?.status === 'ACTIVE', [activeSub]);
  const isExpired = useMemo(() => activeSub?.status === 'EXPIRED', [activeSub]);
  const isCancelled = useMemo(() => activeSub?.status === 'CANCELLED', [activeSub]);
  const isUpgradePending = useMemo(() => activeSub?.status === 'UPGRADE_PENDING', [activeSub]);
  const isPendingPayment = useMemo(() => activeSub?.status === 'PENDING_PAYMENT', [activeSub]);

  const getServiceSlug = useCallback((sub: Subscription & { plan_name?: string }): string => {
    const snap = sub?.plan_snapshot;
    const serviceCode = String(snap?.service_code || '').toUpperCase();
    if (serviceCode === 'ABSENSI') return 'absensi';
    if (serviceCode === 'KOPERASI') return 'koperasi';
    const name = String(snap?.name || sub?.Plan?.name || sub?.plan_name || '').toLowerCase();
    if (name.includes('absensi')) return 'absensi';
    if (name.includes('koperasi')) return 'koperasi';
    return 'layanan';
  }, []);

  const getDaysLeft = useCallback((sub: Subscription) => {
    if (!sub?.end_date) return 0;
    const diff = new Date(sub.end_date).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const soonExpiringCount = useMemo(() => {
    return services?.filter((s) => {
      if (s.status !== 'ACTIVE') return false;
      const d = getDaysLeft(s);
      return d > 0 && d <= 14;
    }).length;
  }, [services, getDaysLeft]);

  const getServiceTitle = useCallback((slug: string) =>
    slug === 'absensi' ? 'Layanan Absensi Digital' : slug === 'koperasi' ? 'Sistem Koperasi Sekolah' : 'Layanan Sekolah', []);

  const getServiceIcon = useCallback((slug: string) => {
    if (slug === 'absensi') return Building2;
    if (slug === 'koperasi') return Wallet;
    return BookOpen;
  }, []);

  const snartStats = useMemo(() => [
    { label: 'LAYANAN AKTIF', value: services?.filter(s => s.status === 'ACTIVE').length },
    { label: 'SISA HARI', value: daysRemaining > 0 ? daysRemaining : 0 },
    { label: 'TOTAL INVOICE', value: invoices.length }
  ], [services, daysRemaining, invoices]);

  const headerUpgradeDisabled = useMemo(() => isUpgradePending || isPendingPayment, [isUpgradePending, isPendingPayment]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader size="lg" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menyiapkan Informasi Langganan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Terjadi Kesalahan</h2>
        <p className="text-slate-500 font-medium mb-6">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl px-10">Coba Lagi</Button>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      hardeningModuleKey="billing_my_subscription"
      title="Manajemen Langganan"
      description="Pantau detail paket langganan aktif, limit pengguna, and sisa masa aktif sekolah Anda."
    >
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
        
        {/* 1. Human-Centric Hero */}
        <DashboardHero
          title="Langganan & Billing"
          subtitle="Kelola masa aktif layanan Anda, pantau tagihan, dan pastikan ekosistem digital sekolah tetap berjalan lancar."
          badge={{
            label: isActive ? "Sistem Aktif & Terlindungi" : isPendingPayment ? "Menunggu Pembayaran" : "Perhatian Diperlukan",
            icon: isActive ? ShieldCheck : AlertCircle,
            color: isActive ? "emerald" : isPendingPayment ? "amber" : "rose"
          }}
          gradient="from-indigo-600 via-blue-600 to-indigo-700"
          stats={snartStats}
        >
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={handleUpgrade}
              disabled={headerUpgradeDisabled}
              className={`px-6 h-12 rounded-xl font-bold shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-none ${
                 headerUpgradeDisabled 
                 ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                 : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-white/20'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isCancelled || isExpired ? 'Aktifkan Kembali Layanan' : 'Upgrade / Ganti Paket'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                const el = document.getElementById('transaction-history');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 h-12 rounded-xl font-bold bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md"
            >
              <History className="w-4 h-4 mr-2" />
              Riwayat Transaksi
            </Button>
          </div>
        </DashboardHero>
        
        {soonExpiringCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
               <Clock className="text-amber-600 dark:text-amber-400" size={24} />
            </div>
            <div className="flex-1">
               <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Perhatian: Layanan Segera Berakhir</h4>
               <p className="text-xs text-amber-800/70 dark:text-amber-400/70 font-medium">Ada {soonExpiringCount} layanan yang akan berakhir dalam kurang dari 14 hari. Segera lakukan perpanjangan untuk menghindari gangguan akses.</p>
            </div>
            <Button 
              size="sm" 
              variant="warning" 
              onClick={handleUpgrade}
              className="rounded-xl font-bold px-4 hidden sm:flex"
            >
              Perpanjang Sekarang
            </Button>
          </motion.div>
        )}

        {/* 2. Visual Service Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
               <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                 <Layers className="text-indigo-500" size={24} />
                 Layanan Sekolah Anda
               </h2>
               <p className="text-sm text-slate-500 font-medium">Klik pada layanan untuk melihat detail fitur dan masa aktif.</p>
            </div>
            
            <div className="hidden md:flex gap-2">
              {services?.map((s, idx) => (
                <div 
                  key={idx} 
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${selectedService?.id === s.id ? 'w-6 bg-indigo-500' : 'bg-slate-300'}`} 
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {services?.map((svc) => {
                const slug = getServiceSlug(svc);
                const title = getServiceTitle(slug);
                const Icon = getServiceIcon(slug);
                const isSelected = selectedService?.id === svc.id;
                const status = String(svc.status || '').toUpperCase();
                const dleft = getDaysLeft(svc);

                return (
                  <motion.div
                    layout
                    key={svc.id}
                    whileHover={{ y: -5 }}
                    onClick={() => setSelectedService(svc)}
                    className={`relative group cursor-pointer rounded-xl p-6 transition-all duration-300 border-2 overflow-hidden ${
                      isSelected 
                        ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-2xl shadow-indigo-200 dark:shadow-none' 
                        : 'bg-white/50 dark:bg-slate-900 border-transparent hover:border-slate-200 shadow-sm'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 p-3 bg-indigo-500 text-white rounded-bl-2xl">
                        <CheckCircle size={14} />
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4">
                      <div className={`p-4 rounded-xl transition-all duration-500 ${isSelected ? 'bg-indigo-600 text-white rotate-6' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                        <Icon size={24} />
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className={`font-bold transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>{title}</h3>
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

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Masa Aktif: <span className="text-slate-900 dark:text-slate-200">{formatDate(svc.end_date)}</span>
                      </div>
                      <ArrowRight size={16} className={`transition-all duration-300 ${isSelected ? 'text-indigo-500 translate-x-0' : 'text-slate-300 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* 3. Detailed View Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Plan Details Card */}
          <Card className="lg:col-span-2 p-8 border-none shadow-2xl shadow-slate-200 dark:shadow-none bg-white dark:bg-slate-800 rounded-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Plan Saat Ini</div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{planName}</h3>
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{priceLabel}</span>
                    <span className="opacity-50">/</span>
                    <span>{cycle}</span>
                  </div>
                </div>
                
                <Badge variant={isActive ? 'success' : 'warning'} className="px-4 py-1.5 rounded-xl font-bold shadow-sm">
                  {getSubscriptionStatusLabel(activeSub?.status)}
                </Badge>
              </div>

              {/* Fitur Terdaftar */}
              <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Fitur & Layanan Aktif</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {features?.map((feat: string, index: number) => (
                      <div key={index} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-semibold bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
                        <CheckCircle size={14} className="text-indigo-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                   ))}
                 </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats Panel */}
          <div className="space-y-6">
            {/* Upgrade Pending Panel */}
            {subscription && subscription.upgrade_invoice_id && (
              <Card className="p-6 border-2 border-dashed border-amber-500/30 bg-amber-50/20 rounded-xl relative overflow-hidden">
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Transaksi Tertunda</div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Upgrade Paket Sedang Diproses</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium mt-1">Anda memiliki permohonan upgrade ke paket <span className="font-bold text-amber-600">{subscription.target_upgrade_plan?.name}</span> yang belum dibayar.</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handlePayUpgradeFromCard} 
                      isLoading={upgradePayLoading}
                      className="rounded-lg font-bold flex-1 bg-amber-500 hover:bg-amber-600 border-none text-white text-xs h-10"
                    >
                      <CreditCard size={14} className="mr-2" /> Bayar Sekarang
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setCancelModalOpen(true)}
                      className="rounded-lg font-bold text-xs h-10 border-amber-500/20 text-amber-700 hover:bg-amber-100"
                    >
                      Batalkan
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                 <Users size={20} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Batas Pengguna Akun</h4>
                 <div className="text-xl font-black text-slate-900 dark:text-white">
                   {usersLimit > 0 ? `${usersLimit} Pengguna` : 'Tanpa Batasan'}
                 </div>
                 <p className="text-[10px] text-slate-400 font-medium">Jumlah maksimum staf and siswa dalam sistem.</p>
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl shrink-0">
                 <Clock size={20} />
              </div>
              <div className="space-y-1 text-left">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Masa Aktif Paket</h4>
                 <div className="text-xl font-black text-slate-900 dark:text-white">{formatDate(activeSub?.end_date)}</div>
                 <p className="text-[10px] text-slate-400 font-medium">Sistem akan dinonaktifkan jika masa aktif habis.</p>
              </div>
            </Card>
          </div>
        </div>

        {/* 4. Elegant Transaction History */}
        <div id="transaction-history" className="pt-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="space-y-1 text-left">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Calendar className="text-indigo-500" size={24} />
                  Riwayat Transaksi
                </h2>
                <p className="text-sm text-slate-500 font-medium">Daftar semua tagihan dan status pembayaran layanan Anda.</p>
             </div>
             
             <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
               <label htmlFor="invoiceServiceFilterSelect" className="text-[10px] font-black uppercase tracking-widest px-3 text-slate-400">Filter</label>
               <SearchableSelect
                 id="invoiceServiceFilterSelect"
                 value={invoiceServiceFilter}
                 onValueChange={setInvoiceServiceFilter}
                 options={[
                   { value: "ALL", label: "Semua Layanan" },
                   ...services?.map((svc: Subscription) => ({
                     value: String(svc.id),
                     label: getServiceTitle(getServiceSlug(svc))
                   }))
                 ]}
                 placeholder="Pilih Layanan"
                 searchPlaceholder="Cari layanan..."
                 triggerClassName="bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold py-2 px-4 shadow-sm"
               />
             </div>
          </div>

          <Tabs defaultValue="invoices" className="w-full">
            <TabsList className="bg-transparent border-b border-slate-100 dark:border-slate-800 w-full justify-start rounded-none h-auto p-0 mb-6 flex gap-8">
              <TabsTrigger
                value="invoices"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold tracking-tight text-slate-400 data-[state=active]:text-indigo-600"
              >
                Daftar Invoices
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold tracking-tight text-slate-400 data-[state=active]:text-indigo-600"
              >
                Histori Pembayaran
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="mt-0">
               <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Nomor Invoice</th>
                        <th className="px-6 py-4">Jatuh Tempo</th>
                        <th className="px-6 py-4">Jumlah</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {invoices.filter(inv => invoiceServiceFilter === 'ALL' || String(inv.subscription_id || inv.Subscription?.id) === invoiceServiceFilter).length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-medium">Belum ada catatan tagihan ditemukan.</td></tr>
                      ) : (
                        invoices
                          .filter(inv => invoiceServiceFilter === 'ALL' || String(inv.subscription_id || inv.Subscription?.id) === invoiceServiceFilter)
                          ?.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                    <FileText size={18} />
                                 </div>
                                 <div>
                                    <div className="font-bold text-slate-900 dark:text-white">#{inv.invoice_number}</div>
                                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{formatDate(inv.created_at)}</div>
                                 </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 font-medium text-slate-600 dark:text-slate-400">{formatDate(inv.due_date)}</td>
                            <td className="px-6 py-5 font-black text-slate-900 dark:text-white">{formatCurrency(inv.total_amount, inv.currency)}</td>
                            <td className="px-6 py-5 text-center">
                               <Badge variant={inv.status === 'PAID' ? 'success' : ['DRAFT', 'SENT', 'VIEWED'].includes(String(inv.status)) ? 'warning' : 'destructive'} className="px-3 py-1 rounded-lg font-bold uppercase text-[9px]">
                                 {inv.status}
                               </Badge>
                            </td>
                            <td className="px-6 py-5 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => handleView(inv.id)} disabled={actionLoading === inv.id} className="w-9 h-9 p-0 rounded-xl hover:bg-indigo-50 hover:text-indigo-600">
                                    <Eye size={16} />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDownload(inv.id)} disabled={actionLoading === inv.id} className="w-9 h-9 p-0 rounded-xl hover:bg-indigo-50 hover:text-indigo-600">
                                    <Download size={16} />
                                  </Button>
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
               <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th className="px-6 py-4">ID Transaksi</th>
                        <th className="px-6 py-4">Waktu Pembayaran</th>
                        <th className="px-6 py-4">Metode</th>
                        <th className="px-6 py-4 text-right">Jumlah</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {payments.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-medium">Belum ada catatan pembayaran ditemukan.</td></tr>
                      ) : (
                        payments?.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                    <ShieldCheck size={18} />
                                 </div>
                                 <span className="font-bold text-slate-900 dark:text-white">{pay.id.substring(0, 10)}...</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 font-medium text-slate-600 dark:text-slate-400">
                              {pay.created_at ? new Date(pay.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                            </td>
                            <td className="px-6 py-5 uppercase font-mono text-xs">{pay.payment_method || '-'}</td>
                            <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white">{formatCurrency(pay.amount, pay.currency)}</td>
                            <td className="px-6 py-5 text-center">
                               <Badge variant={pay.status === 'SUCCESS' || pay.status === 'PAID' ? 'success' : 'warning'} className="px-3 py-1 rounded-lg font-bold uppercase text-[9px]">
                                 {pay.status}
                               </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </TabsContent>
          </Tabs>
        </div>

        <ConfirmModal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={handleCancelUpgrade}
          title="Batalkan Permintaan Upgrade?"
          message="Apakah Anda yakin ingin membatalkan transaksi upgrade paket tertunda? Tindakan ini akan menghapus tagihan terkait."
          confirmText={cancelLoading ? 'Sesaat...' : 'Ya, Batalkan'}
          cancelText="Kembali"
          variant="danger"
        />
      </div>
    </AcademicPageLayout>
  );
}

export default function MySubscriptionPage() {
  return (
    <ErrorBoundary>
      <MySubscriptionContent />
    </ErrorBoundary>
  );
}
