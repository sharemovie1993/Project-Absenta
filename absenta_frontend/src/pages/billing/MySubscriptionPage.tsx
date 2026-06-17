import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { DashboardHero } from '../../components/dashboard/shared/DashboardHero';
import {
  CreditCard,
  Users,
  Clock,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileText,
  Eye,
  ArrowRight,
  Zap,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  History
} from 'lucide-react';
import { Building2, Wallet, BookOpen } from 'lucide-react';
import {
  getMySubscription,
  getMyInvoices,
  getMyPayments,
  getInvoiceDownloadUrl,
  getPublicInvoiceLink,
} from '../../api/mySubscription.api';
import { openInvoicePublic } from '../../utils/invoiceLink';
import type { Subscription } from '../../types/subscription';
import type { Invoice } from '../../types/invoice';
import { cancelPendingUpgrade } from '../../api/subscription.api';
import { ConfirmModal } from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { getSubscriptionStatusLabel } from '../../utils/subscriptionStatusDictionary';

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
};

const MySubscriptionPage = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [invoiceServiceFilter, setInvoiceServiceFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [upgradePayLoading, setUpgradePayLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subRes, invRes, payRes] = await Promise.all([
          getMySubscription(),
          getMyInvoices(),
          getMyPayments(),
        ]);

        if (subRes.success) {
          setSubscription(subRes.data);
          const agg = (subRes.data && Array.isArray((subRes.data as any).subscriptions))
            ? ((subRes.data as any).subscriptions as any[])
            : [];
          if (agg.length > 0) {
            setServices(agg);
          }
        }
        if (invRes.success) setInvoices(invRes.data);
        if (payRes.success) setPayments(payRes.data);
      } catch (err) {
        console.error('Failed to fetch subscription data', err);
        setError('Gagal memuat informasi langganan.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedService && services.length > 0) {
      const score = (s: any) => {
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

  const handleUpgrade = () => navigate('/services');

  const refreshSubscriptionData = async () => {
    try {
      const [subRes, invRes, payRes] = await Promise.all([
        getMySubscription(),
        getMyInvoices(),
        getMyPayments(),
      ]);
      if (subRes.success) setSubscription(subRes.data);
      if (invRes.success) setInvoices(invRes.data);
      if (payRes.success) setPayments(payRes.data);
      return { subscription: subRes.success ? subRes.data : null, invoices: invRes.success ? invRes.data : [] };
    } catch (err) {
      console.error('Failed to refresh data', err);
      toast.error('Gagal menyegarkan data.');
      return { subscription: null, invoices: [] };
    }
  };

  const handlePayUpgradeFromCard = async () => {
    if (!subscription) return;
    const upgradeInvoiceId = (subscription as any).upgrade_invoice_id || null;
    if (!upgradeInvoiceId) {
      navigate('/billing?tab=invoice');
      return;
    }
    try {
      setUpgradePayLoading(true);
      const res = await getPublicInvoiceLink(upgradeInvoiceId);
      const token = res.success && res.data?.token ? res.data.token : null;
      if (!token) {
        navigate('/billing?tab=invoice');
        return;
      }
      navigate(`/payment/public/${token}`);
    } catch {
      navigate('/billing?tab=invoice');
    } finally {
      setUpgradePayLoading(false);
    }
  };

  const handleCancelUpgrade = async () => {
    try {
      setCancelLoading(true);
      const res = await cancelPendingUpgrade();
      if (res.success) {
        toast.success('Permintaan upgrade dibatalkan.');
        await refreshSubscriptionData();
        setCancelModalOpen(false);
      } else {
        toast.error(res.message || 'Gagal membatalkan upgrade.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal membatalkan upgrade.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownload = async (invoiceId: string) => {
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
  };

  const handleView = async (invoiceId: string) => {
    try {
      setActionLoading(invoiceId);
      const res = await getPublicInvoiceLink(invoiceId);
      if (res.success && res.data?.token) openInvoicePublic(res.data.token);
      else if (res.success && res.data?.url) window.open(res.data.url, '_blank');
      else toast.error('Gagal membuka invoice.');
    } catch {
      toast.error('Gagal membuka invoice.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Menyiapkan Informasi Langganan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
      </div>
    );
  }

  // --- Logic Helpers ---
  const activeSub: any = selectedService || subscription;
  const snapshot = activeSub?.plan_snapshot || null;
  const planName = snapshot?.name || activeSub?.Plan?.name || activeSub?.plan_name || 'Tanpa Paket';
  const planPrice = snapshot?.price ?? activeSub?.Plan?.price_monthly ?? null;
  const planCurrency = activeSub?.Plan?.currency || 'IDR';
  const priceLabel = typeof planPrice === 'number' ? formatCurrency(planPrice, planCurrency) : '-';
  const billingPeriod = snapshot?.billing_period || activeSub?.Plan?.billing_period || 'MONTH';
  const cycle = billingPeriod === 'YEAR' ? 'Tahun' : 'Bulan';
  
  const features: string[] = (() => {
    const snapFeatures = snapshot?.features_json;
    if (Array.isArray(snapFeatures) && snapFeatures.length > 0) return snapFeatures;
    const planFeatures = activeSub?.Plan?.features_json;
    if (Array.isArray(planFeatures) && planFeatures.length > 0) return planFeatures;
    return [];
  })();

  const usersLimit = activeSub?.Plan?.max_user || 0;
  const usersUsed = 0; // Fallback or fetch from usage metrics if available
  const daysRemaining = activeSub?.end_date
    ? Math.ceil((new Date(activeSub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isUpgradePending = activeSub?.status === 'UPGRADE_PENDING';
  const isPendingPayment = activeSub?.status === 'PENDING_PAYMENT';
  const isActive = activeSub?.status === 'ACTIVE';
  const isExpired = activeSub?.status === 'EXPIRED';
  const isCancelled = activeSub?.status === 'CANCELLED';

  const getServiceSlug = (sub: any): string => {
    const snap = sub?.plan_snapshot;
    const serviceCode = String(snap?.service_code || '').toUpperCase();
    if (serviceCode === 'ABSENSI') return 'absensi';
    if (serviceCode === 'KOPERASI') return 'koperasi';
    const name = String(snap?.name || sub?.Plan?.name || sub?.plan_name || '').toLowerCase();
    if (name.includes('absensi')) return 'absensi';
    if (name.includes('koperasi')) return 'koperasi';
    return 'layanan';
  };

  const getDaysLeft = (sub: any) => {
    if (!sub?.end_date) return 0;
    const diff = new Date(sub.end_date).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const summarizeStatuses = () => {
    const summary: Record<string, number> = {};
    services.forEach((s) => {
      const st = String(s.status || 'UNKNOWN').toUpperCase();
      summary[st] = (summary[st] || 0) + 1;
    });
    return summary;
  };

  const soonExpiringCount = services.filter((s) => {
    if (s.status !== 'ACTIVE') return false;
    const d = getDaysLeft(s);
    return d > 0 && d <= 14;
  }).length;

  const getServiceTitle = (slug: string) =>
    slug === 'absensi' ? 'Layanan Absensi Digital' : slug === 'koperasi' ? 'Sistem Koperasi Sekolah' : 'Layanan Sekolah';

  const getServiceIcon = (slug: string) => {
    if (slug === 'absensi') return Building2;
    if (slug === 'koperasi') return Wallet;
    return BookOpen;
  };

  const snartStats = [
    { label: 'LAYANAN AKTIF', value: services.filter(s => s.status === 'ACTIVE').length },
    { label: 'SISA HARI', value: daysRemaining > 0 ? daysRemaining : 0 },
    { label: 'TOTAL INVOICE', value: invoices.length }
  ];

  const headerUpgradeDisabled = isUpgradePending || isPendingPayment;

  return (
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
             <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
               <Layers className="text-indigo-500" size={24} />
               Layanan Sekolah Anda
             </h2>
             <p className="text-sm text-gray-500 font-medium">Klik pada layanan untuk melihat detail fitur dan masa aktif.</p>
          </div>
          
          <div className="hidden md:flex gap-2">
            {services.map((s, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${selectedService?.id === s.id ? 'w-6 bg-indigo-500' : 'bg-gray-300'}`} 
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {services.map((svc) => {
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
                      ? 'bg-white dark:bg-gray-800 border-indigo-500 shadow-2xl shadow-indigo-200 dark:shadow-none' 
                      : 'bg-white/50 dark:bg-gray-900 border-transparent hover:border-gray-200 shadow-sm'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 p-3 bg-indigo-500 text-white rounded-bl-2xl">
                      <CheckCircle size={14} />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-xl transition-all duration-500 ${isSelected ? 'bg-indigo-600 text-white rotate-6' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                      <Icon size={24} />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className={`font-bold transition-colors ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>{title}</h3>
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

                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Masa Aktif: <span className="text-gray-900 dark:text-gray-200">{formatDate(svc.end_date)}</span>
                    </div>
                    <ArrowRight size={16} className={`transition-all duration-300 ${isSelected ? 'text-indigo-500 translate-x-0' : 'text-gray-300 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
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
        <Card className="lg:col-span-2 p-8 border-none shadow-2xl shadow-gray-200 dark:shadow-none bg-white dark:bg-gray-800 rounded-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Plan Saat Ini</div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{planName}</h3>
                <div className="flex items-center gap-2 text-gray-500 font-medium">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{priceLabel}</span>
                  <span className="opacity-50">/</span>
                  <span>{cycle}</span>
                </div>
              </div>
              
              <Badge variant={isActive ? 'success' : 'warning'} className="px-4 py-1.5 rounded-xl font-bold shadow-sm">
                {getSubscriptionStatusLabel(activeSub?.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Keunggulan Paket</h4>
                <ul className="grid grid-cols-1 gap-3">
                  {features.length > 0 ? (
                    features.map((feat: any, index: number) => (
                      <motion.li 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={index}
                        className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                           <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        {(() => {
                          const raw = typeof feat === 'string' ? feat : JSON.stringify(feat);
                          const labels: Record<string, string> = {
                            'CORE': 'Akses Platform Utama',
                            'ABSENSI': 'Modul Absensi Digital',
                            'KOPERASI': 'Modul Koperasi Elektronik',
                          };
                          return labels[raw.toUpperCase()] || raw;
                        })()}
                      </motion.li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">Detail fitur sedang disiapkan...</li>
                  )}
                </ul>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Informasi Billing</h4>
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Tagihan Berikutnya</span>
                      <span className="text-gray-900 dark:text-white font-bold">{formatDate(activeSub?.next_billing_date)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Metode Perpanjangan</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{activeSub?.auto_renew ? 'Otomatis' : 'Manual'}</span>
                   </div>
                </div>

                {isUpgradePending && (
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-4">
                    <div className="flex items-center gap-3">
                       <Zap className="text-amber-600" size={18} />
                       <span className="text-sm font-bold text-amber-900 dark:text-amber-200">Upgrade Sedang Diproses</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="warning" onClick={handlePayUpgradeFromCard} disabled={upgradePayLoading} className="flex-1 rounded-xl font-bold">
                        {upgradePayLoading ? 'Memproses...' : 'Selesaikan Pembayaran'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelModalOpen(true)} disabled={cancelLoading} className="flex-1 rounded-xl font-bold bg-transparent border-amber-300 text-amber-900">
                        Batalkan
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Resource Usage Card */}
        <div className="space-y-8">
          <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-indigo-900 to-blue-900 rounded-xl text-white">
            <div className="flex items-center justify-between mb-8">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                <Users className="text-white" size={24} />
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Resource</div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-indigo-100 opacity-80 uppercase tracking-widest">Kuota Pengguna</span>
                  <span className="text-2xl font-black">{usersUsed} <span className="text-xs opacity-50">/ {usersLimit > 0 ? usersLimit : '∞'}</span></span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${usersLimit > 0 ? Math.min((usersUsed / usersLimit) * 100, 100) : 5}%` }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 shadow-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center gap-4">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Clock size={16} />
                </div>
                <div className="space-y-0.5">
                   <div className="text-[10px] uppercase font-black tracking-widest opacity-60">Sisa Masa Aktif</div>
                   <div className="text-lg font-black">{daysRemaining} Hari Lagi</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl flex items-start gap-4 hover:border-indigo-200 transition-colors cursor-help group shadow-sm">
             <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-110">
                <AlertCircle className="text-indigo-500" size={20} />
             </div>
             <div className="space-y-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Butuh Bantuan?</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">Jika Anda mengalami kendala pembayaran atau ingin kustomisasi paket, tim support kami siap membantu Anda.</p>
             </div>
          </Card>
        </div>
      </div>

      {/* 4. Elegant Transaction History */}
      <div id="transaction-history" className="pt-10 space-y-6">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Calendar className="text-indigo-500" size={24} />
                Riwayat Transaksi
              </h2>
              <p className="text-sm text-gray-500 font-medium">Daftar semua tagihan dan status pembayaran layanan Anda.</p>
           </div>
           
           <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
             <span className="text-[10px] font-black uppercase tracking-widest px-3 text-gray-400">Filter</span>
             <select
               className="bg-white dark:bg-gray-900 border-none rounded-xl text-xs font-bold py-2 px-4 shadow-sm focus:ring-0"
               value={invoiceServiceFilter}
               onChange={(e) => setInvoiceServiceFilter(e.target.value)}
             >
               <option value="ALL">Semua Layanan</option>
               {services.map((svc: any) => (
                 <option key={svc.id} value={String(svc.id)}>{getServiceTitle(getServiceSlug(svc))}</option>
               ))}
             </select>
           </div>
        </div>

        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="bg-transparent border-b border-gray-100 dark:border-gray-800 w-full justify-start rounded-none h-auto p-0 mb-6 flex gap-8">
            <TabsTrigger
              value="invoices"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold tracking-tight text-gray-400 data-[state=active]:text-indigo-600"
            >
              Daftar Invoices
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-0 pb-3 text-sm font-bold tracking-tight text-gray-400 data-[state=active]:text-indigo-600"
            >
              Catatan Pembayaran
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-0">
             <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    <tr>
                      <th className="px-6 py-4">Invoice</th>
                      <th className="px-6 py-4">Periode</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {invoices.filter(inv => invoiceServiceFilter === 'ALL' || String((inv as any).subscription_id || (inv as any).Subscription?.id) === invoiceServiceFilter).length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-gray-400 font-medium">Belum ada catatan tagihan ditemukan.</td></tr>
                    ) : (
                      invoices
                        .filter(inv => invoiceServiceFilter === 'ALL' || String((inv as any).subscription_id || (inv as any).Subscription?.id) === invoiceServiceFilter)
                        .map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                  <FileText size={18} />
                               </div>
                               <div>
                                  <div className="font-bold text-gray-900 dark:text-white">#{inv.invoice_number}</div>
                                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{formatDate(inv.created_at)}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-medium text-gray-600 dark:text-gray-400">{formatDate(inv.due_date)}</td>
                          <td className="px-6 py-5 font-black text-gray-900 dark:text-white">{formatCurrency(inv.total_amount, inv.currency)}</td>
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
             <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/80 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    <tr>
                      <th className="px-6 py-4">ID Transaksi</th>
                      <th className="px-6 py-4">Waktu Pembayaran</th>
                      <th className="px-6 py-4">Metode</th>
                      <th className="px-6 py-4 text-right">Jumlah</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {payments.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-gray-400 font-medium">Belum ada catatan pembayaran ditemukan.</td></tr>
                    ) : (
                      payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                  <ShieldCheck size={18} />
                               </div>
                               <span className="font-bold text-gray-900 dark:text-white">{pay.id.substring(0, 10)}...</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-medium text-gray-600 dark:text-gray-400">
                            {pay.created_at ? new Date(pay.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                   <CreditCard size={12} className="text-gray-500" />
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase text-[10px] tracking-wider">{pay.payment_method || 'Gateway'}</span>
                             </div>
                          </td>
                          <td className="px-6 py-5 font-black text-gray-900 dark:text-white text-right">{formatCurrency(pay.amount, pay.currency)}</td>
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
             
             <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20 flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                   <ShieldCheck className="text-indigo-600" size={20} />
                </div>
                <div>
                   <h4 className="text-sm font-bold text-gray-900 dark:text-white">Keamanan Transaksi Terjamin</h4>
                   <p className="text-xs text-gray-500 font-medium">Semua pembayaran Anda diproses melalui enkripsi SSL 256-bit dan diawasi oleh payment gateway resmi.</p>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelUpgrade}
        title="Batalkan Upgrade Paket?"
        message="Permintaan upgrade Anda akan dibatalkan dan invoice upgrade yang terkait akan dihapus. Anda tetap dapat melanjutkan dengan paket saat ini."
        confirmText="Ya, Batalkan"
        cancelText="Tutup"
        variant="danger"
      />
    </div>
  );
};

export default MySubscriptionPage;
