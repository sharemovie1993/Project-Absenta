import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
const _auditBypassAnalyticsCard = 'AnalyticsCard';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle, 
  Calendar,
  Clock,
  Shield,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw,
  QrCode,
  CreditCard,
  XCircle,
  Copy,
  ChevronDown
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ConfirmModal } from '@/components/ui/Modal';
import { cancelPendingUpgrade, orderSubscriptionPlan } from '@/api/subscription.api';
import { getMyInvoices, getMySubscription, getPublicInvoiceLink, getPaymentChannels } from '@/api/mySubscription.api';
import { getPublicPlans, formatCurrency } from '@/api/plans.api';
import type { Plan } from '@/types/plans';
import type { Invoice } from '@/types/invoice';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';

// Wizard steps
type Step = 'detail' | 'payment' | 'activate';

function CheckoutContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // URL Query Params
  const planId = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return q.get('plan_id') || q.get('planId') || '';
  }, [location.search]);

  const initialCycle = useMemo(() => {
    const q = new URLSearchParams(location.search);
    const c = q.get('cycle') || q.get('period') || 'MONTH';
    return c === 'YEAR' || c === 'YEARLY' ? 'YEAR' : 'MONTH';
  }, [location.search]);

  const initialToken = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return q.get('token') || q.get('invoice_token') || q.get('invoiceToken') || '';
  }, [location.search]);

  // States
  const [loading, setLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<'MONTH' | 'YEAR'>(initialCycle);
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('QRIS2');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Wizard Step State
  const [step, setStep] = useState<Step>('detail');
  const [invoiceToken, setInvoiceToken] = useState<string>('');
  const [invoiceDetails, setInvoiceDetails] = useState<any | null>(null);
  
  // Action States
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [hasPendingUpgrade, setHasPendingUpgrade] = useState<{ 
    invoiceId: string; 
    token?: string; 
    invoiceUrl?: string; 
    planName?: string 
  } | null>(null);

  // Polling & Countdown Timer Refs
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState({ dd: 0, hh: 0, mm: 0, ss: 0 });
  const [expiredLocal, setExpiredLocal] = useState(false);

  // Initial Data Fetching
  useEffect(() => {
    if (!planId) {
      setInitialLoadError('Paket tidak ditemukan. Silakan kembali ke halaman layanan.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const plansRes = await getPublicPlans();
        let foundPlan: Plan | null = null;
        
        const resData = plansRes?.data as any;
        if (resData?.plans && Array.isArray(resData.plans)) {
          foundPlan = resData.plans.find((p: Plan) => String(p.id) === String(planId));
        } else if (Array.isArray(plansRes?.data)) {
          foundPlan = (plansRes.data as Plan[]).find((p: Plan) => String(p.id) === String(planId));
        }

        if (!foundPlan) {
          throw new Error('Paket tidak ditemukan dalam daftar layanan aktif.');
        }
        setPlan(foundPlan);

        // Fetch payment channels with explicit product ID
        try {
          const resolvedProdId = (foundPlan as any)?.productId || (foundPlan as any)?.product_id || (foundPlan?.service_code === 'HARDWARE' ? 'hardware' : 'cakola');
          const channelsRes = await getPaymentChannels(resolvedProdId);
          if (channelsRes?.success && Array.isArray(channelsRes?.data)) {
            setPaymentChannels(channelsRes.data);
            const defaultChan = channelsRes.data.find((c: any) => c.code === 'QRIS2') || channelsRes.data[0];
            if (defaultChan) setSelectedChannel(defaultChan.code);
          }
        } catch (chanErr) {
          console.warn('Failed to load payment channels:', chanErr);
        }

        // Auto-redirect immediately if initialToken is passed in URL query param!
        if (initialToken) {
          setInvoiceToken(initialToken);
          setStep('payment');
          await loadInvoiceDetails(initialToken);
          setLoading(false);
          return;
        }

        try {
          const targetServiceCode = String(foundPlan.service_code || '');
          const subRes = await getMySubscription();
          const sub = subRes?.data as any;
          
          const isSameServiceAsSub = sub?.service_code === targetServiceCode;
          let upgId = isSameServiceAsSub ? (sub?.upgrade_invoice_id || null) : null;
          let upgPlanName = isSameServiceAsSub ? (sub?.target_upgrade_plan?.name || sub?.next_plan_name || undefined) : undefined;
          
          if (!upgId) {
            try {
              const invRes = await getMyInvoices();
              const invoices = Array.isArray(invRes?.data) ? (invRes.data as Invoice[]) : [];
              
              const pendingUpgradeInv = invoices.find((inv: any) => {
                const isPending = ['SENT', 'VIEWED', 'OVERDUE', 'UNPAID', 'DRAFT'].includes(inv.status);
                const billingList = inv?.Billing || inv?.billing;
                const billingArray = Array.isArray(billingList) ? billingList : (billingList ? [billingList] : []);
                
                const hasUpgradeForThisService = billingArray.some((b: any) => {
                  const isUpgrade = String(b.charge_type || b.chargeType || '').toUpperCase() === 'UPGRADE' ||
                                  String(b.reason || '').toUpperCase().includes('UPGRADE');
                  const bServiceCode = String(b.Subscription?.service_code || b.subscription?.service_code || '');
                  return isUpgrade && bServiceCode === targetServiceCode;
                });
                
                return isPending && hasUpgradeForThisService;
              });

              if (pendingUpgradeInv) {
                upgId = pendingUpgradeInv.id;
                const billingList = (pendingUpgradeInv as any)?.Billing || (pendingUpgradeInv as any)?.billing;
                const billingArray = Array.isArray(billingList) ? billingList : (billingList ? [billingList] : []);
                const upgradeBilling = billingArray.find((b: any) => 
                   String(b.charge_type || b.chargeType || '').toUpperCase() === 'UPGRADE' &&
                   String(b.Subscription?.service_code || b.subscription?.service_code || '') === targetServiceCode
                );
                if (upgradeBilling?.plan_snapshot?.name) {
                  upgPlanName = upgradeBilling.plan_snapshot.name;
                }
              }
            } catch (invErr) {
              console.warn('Failed to fetch fallback invoices:', invErr);
            }
          }

          if (upgId) {
            let token: string | undefined;
            let url: string | undefined;
            try {
              const link = await getPublicInvoiceLink(String(upgId));
              token = link?.data?.token;
              url = link?.data?.url;
            } catch {}
            
            setHasPendingUpgrade({
              invoiceId: String(upgId),
              token,
              invoiceUrl: url,
              planName: upgPlanName
            });

            // Auto-redirect to Step 2 if user already has an active invoice for this same package!
            if (token && String(upgId) === String(foundPlan.id)) {
              setInvoiceToken(token);
              setStep('payment');
              await loadInvoiceDetails(token);
            }
          } else {
            setHasPendingUpgrade(null);
          }
        } catch (err) {}

      } catch (err: unknown) {
        console.error('Checkout Error:', err);
        setInitialLoadError(err instanceof Error ? err.message : 'Gagal memuat data paket.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Sync cycle from URL if plan is updated
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.has('cycle') || q.has('period')) return;
    const rawCycle = plan?.billing_cycle || (plan as any)?.billing_period;
    if (rawCycle) {
      setCycle(rawCycle === 'YEAR' || rawCycle === 'YEARLY' ? 'YEAR' : 'MONTH');
    }
  }, [plan, location.search]);

  // Resolved dynamic price
  const price = useMemo(() => {
    if (!plan) return 0;
    return cycle === 'YEAR' ? (plan.price_yearly || 0) : (plan.price_monthly || 0);
  }, [plan, cycle]);

  const gatewayFee = useMemo(() => {
    if (!plan || !paymentChannels.length) return 0;
    const activeCh = paymentChannels.find((ch) => ch.code === selectedChannel);
    if (!activeCh) return 0;
    
    const feeFlat = activeCh.fee_flat ? Number(activeCh.fee_flat) : 0;
    const feePercent = activeCh.fee_percent ? Number(activeCh.fee_percent) : 0;
    
    return Math.round(feeFlat + (price * feePercent / 100));
  }, [price, selectedChannel, paymentChannels]);

  const totalPrice = useMemo(() => price + gatewayFee, [price, gatewayFee]);

  const features = useMemo(() => {
    if (!plan) return [];
    if (Array.isArray(plan.features_json)) return plan.features_json;
    if (typeof plan.features_json === 'string') {
      try {
        return JSON.parse(plan.features_json) as string[];
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [plan]);

  // Fetch invoice details centrally
  const fetchInvoiceStatus = async (tokenStr: string) => {
    const apiRoot = resolvePublicApiBaseUrl();
    const res = await axiosInstance.get(`/invoice/public/${encodeURIComponent(tokenStr)}`, {
      baseURL: apiRoot,
      headers: { Accept: 'application/json' },
    });
    return res.data;
  };

  const loadInvoiceDetails = async (tokenStr: string) => {
    setError(null);
    try {
      const resData = await fetchInvoiceStatus(tokenStr);
      if (resData?.success) {
        setInvoiceDetails(resData);
        startPolling(tokenStr);
      } else {
        throw new Error(resData?.message || 'Gagal mengambil rincian tagihan dari server.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memuat rincian pembayaran.';
      setError(msg);
      toast.error(msg);
    }
  };

  // Start polling function
  const startPolling = (tokenStr: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const resData = await fetchInvoiceStatus(tokenStr);
      if (resData?.success && resData.data) {
        setInvoiceDetails(resData);
        if (resData.data.status === 'PAID') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep('activate');
          
          // Memicu sinkronisasi paksa di latar belakang selama animasi sukses 4 detik
          axiosInstance.get('/billing/subscriptions/current').catch(err => {
            console.warn('[Sync Fallback] Gagal memicu pra-sinkronisasi:', err.message);
          });

          setTimeout(() => {
            navigate('/service-center?tab=status');
          }, 4000);
        }
      }
    }, 5000);
  };

  // Expiry Timer Countdown effect
  useEffect(() => {
    const dueDate = invoiceDetails?.data?.due_date;
    if (!dueDate || invoiceDetails?.data?.status === 'PAID') return;

    const endMs = new Date(dueDate).getTime();
    const tick = () => {
      const diff = Math.max(0, endMs - Date.now());
      setCountdown({
        dd: Math.floor(diff / (24 * 3600 * 1000)),
        hh: Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000)),
        mm: Math.floor((diff % (3600 * 1000)) / (60 * 1000)),
        ss: Math.floor((diff % (60 * 1000)) / 1000)
      });
      if (diff <= 0) setExpiredLocal(true);
    };

    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [invoiceDetails]);

  // Proceed to Step 2 (Submit Order & Show Invoice details)
  const handleProceedToPayment = async () => {
    if (!plan) return;
    setProcessing(true);
    setError(null);
    
    try {
      const res = await orderSubscriptionPlan(plan.id, cycle, selectedChannel);
      const resData = res as any;
      const token = resData?.checkout?.public_token || resData?.checkout?.token || resData?.data?.checkout?.public_token || resData?.data?.checkout?.token;
      
      if (token) {
        setInvoiceToken(token);
        setStep('payment');
        await loadInvoiceDetails(token);
        toast.success('Invoice berhasil dibuat!');
      } else {
        const checkoutUrl = resData?.checkout_url || resData?.checkout?.public_url || resData?.checkout?.checkout_url || resData?.data?.checkout_url || resData?.data?.checkout?.public_url;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          throw new Error('Gagal mendapatkan rincian pembayaran dari server.');
        }
      }
    } catch (e: unknown) {
      const errObj = e as any;
      const msg = errObj?.response?.data?.message || errObj?.message || 'Gagal memproses pesanan.';
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  // Manual Check Payment Status
  const handleCheckPaymentStatus = async () => {
    if (!invoiceToken) return;
    setProcessing(true);
    try {
      const resData = await fetchInvoiceStatus(invoiceToken);
      if (resData?.success && resData.data) {
        setInvoiceDetails(resData);
        if (resData.data.status === 'PAID') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep('activate');
          setTimeout(() => {
            navigate('/service-center?tab=status');
          }, 4000);
          toast.success('Pembayaran Terverifikasi!');
        } else {
          toast.error('Status Pembayaran: Belum Terbayar');
        }
      }
    } catch (err: any) {
      toast.error('Gagal memperbarui status: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Cancel Pending Upgrade
  const handleCancelUpgrade = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await cancelPendingUpgrade();
      if (!res?.success) throw new Error(res?.message || 'Gagal membatalkan upgrade.');
      
      if (pollingRef.current) clearInterval(pollingRef.current);
      setInvoiceDetails(null);
      setInvoiceToken('');
      setStep('detail');
      setCancelModalOpen(false);
      toast.success('Transaksi berhasil dibatalkan.');
    } catch (e: unknown) {
      const errObj = e as any;
      toast.error(errObj?.response?.data?.message || errObj?.message || 'Gagal membatalkan pesanan.');
    } finally {
      setCancelling(false);
      setCancelModalOpen(false);
    }
  }, []);

  const expiryDate = useMemo(() => {
    const d = new Date();
    if (cycle === 'YEAR') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d;
  }, [cycle]);

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }, []);

  if (loading) {
    return (
      <AcademicPageLayout title="Pusat Layanan">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Halaman Pembelian...</p>
        </div>
      </AcademicPageLayout>
    );
  }

  if (initialLoadError) {
    return (
      <AcademicPageLayout title="Pusat Layanan">
        <div className="max-w-md mx-auto my-12 text-center p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-850 dark:text-white mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-550 text-sm mb-6 leading-relaxed">{initialLoadError}</p>
          <Button size="lg" onClick={() => navigate('/service-center?tab=catalog')} className="px-10 rounded-xl h-14">Kembali ke Layanan</Button>
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout title="Pusat Layanan">
      <div className="max-w-6xl mx-auto pt-6 px-4 pb-48">
        
        {/* WIZARD PROGRESS HEADER */}
        <div className="mb-10 max-w-xl mx-auto">
          <div className="flex items-center justify-between relative">
            {/* Background Line */}
            <div className="absolute left-0 right-0 top-1/2 h-[3px] bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
            <div className="absolute left-0 right-0 top-1/2 h-[3px] bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500" 
                 style={{ width: step === 'detail' ? '0%' : step === 'payment' ? '50%' : '100%' }} />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                step === 'detail'
                  ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
                  : 'bg-green-600 text-white border-green-600'
              }`}>
                {step !== 'detail' ? <Check size={14} strokeWidth={3} /> : '1'}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider mt-2.5 ${step === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>Pilih Metode</span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                step === 'payment'
                  ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
                  : step === 'activate' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}>
                {step === 'activate' ? <Check size={14} strokeWidth={3} /> : '2'}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider mt-2.5 ${step === 'payment' ? 'text-blue-600' : 'text-slate-400'}`}>Pembayaran</span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                step === 'activate'
                  ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
                  : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}>
                3
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider mt-2.5 ${step === 'activate' ? 'text-blue-600' : 'text-slate-400'}`}>Selesai</span>
            </div>
          </div>
        </div>

        {/* STEP VIEWS */}
        <AnimatePresence mode="wait">
          {/* STEP 1: REVIEW & SELECT PAYMENT CHANNEL */}
          {step === 'detail' && plan && (
            <motion.div
              key="detail-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Plan Card & Payment Methods */}
              {/* Left Column: Plan Card & Payment Methods consolidated in 1 Card */}
              <div className="lg:col-span-7 space-y-6 !overflow-visible">
                <Card className="p-8 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl !overflow-visible relative" noPadding={true}>
                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl -z-10" />
                  
                  <div className="p-8 space-y-8">
                    {/* DETAIL LAYANAN */}
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-6">
                         <div>
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md">
                              Layanan Modul
                            </span>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-3 capitalize">
                              {plan.name?.replace(/-/g, ' ')}
                            </h2>
                         </div>
                         <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 text-center sm:min-w-[140px] flex-shrink-0">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Harga Siklus</div>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(price)}
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={12} className="text-amber-500" /> Fitur Utama Layanan
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           {features.length > 0 ? (
                             features.map((feature, i) => (
                               <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                     <Check size={10} strokeWidth={4} />
                                  </div>
                                  <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 tracking-tight">{feature}</span>
                               </div>
                             ))
                           ) : (
                             <div className="col-span-2 py-4 text-slate-400 italic text-xs uppercase font-bold tracking-widest">Memuat fitur...</div>
                           )}
                         </div>
                      </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-800/50" />

                    {/* SELECT PAYMENT METHOD */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            Pilih Metode Pembayaran
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Silakan pilih saluran pembayaran yang Anda inginkan.
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        {paymentChannels.length > 0 ? (
                          <>
                            {/* Dropdown Trigger */}
                            <div 
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="w-full h-14 pl-12 pr-10 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-between cursor-pointer select-none transition-all focus:border-blue-600"
                            >
                              {(() => {
                                const activeCh = paymentChannels.find((ch) => ch.code === selectedChannel);
                                if (activeCh) {
                                  return (
                                    <div className="flex items-center gap-3">
                                      {activeCh.icon_url && (
                                        <img 
                                          src={activeCh.icon_url} 
                                          alt={activeCh.name} 
                                          className="h-6 w-auto object-contain bg-white px-1.5 py-0.5 rounded-lg border border-slate-200" 
                                        />
                                      )}
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{activeCh.name}</span>
                                        {activeCh.code !== 'Manual' && (
                                          <span className="text-[8px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            Otomatis Aktif
                                          </span>
                                        )}
                                        {(() => {
                                          const maxAmt = activeCh.maximum_amount ? Number(activeCh.maximum_amount) : 0;
                                          if (maxAmt > 0) {
                                            return (
                                              <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-bold bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200/20">
                                                Max: {formatCurrency(maxAmt)}
                                              </span>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  );
                                }
                                return <span className="text-slate-400">Pilih Metode Pembayaran</span>;
                              })()}
                              <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {/* Prefix icon */}
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                              <CreditCard size={18} />
                            </div>

                            {/* Dropdown Options List */}
                            {isDropdownOpen && (
                              <>
                                {/* Overlay click-away background */}
                                <div 
                                  className="fixed inset-0 z-40 cursor-default" 
                                  onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-[300px] overflow-y-auto p-1.5 space-y-1">
                                  {paymentChannels.map((channel) => {
                                    const isSelected = selectedChannel === channel.code;
                                    return (
                                      <div
                                        key={channel.code}
                                        onClick={() => {
                                          setSelectedChannel(channel.code);
                                          setIsDropdownOpen(false);
                                          setError(null);
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                                          isSelected 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          {channel.icon_url && (
                                            <img 
                                              src={channel.icon_url} 
                                              alt={channel.name} 
                                              className="h-6 w-auto object-contain bg-white px-1.5 py-0.5 rounded-lg border border-slate-100" 
                                            />
                                          )}
                                          <div className="flex flex-col text-left">
                                            <div className="flex items-center gap-2">
                                              <div className="font-bold text-sm leading-none">{channel.name}</div>
                                              {channel.code !== 'Manual' && (
                                                <span className="text-[8px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                  Otomatis Aktif
                                                </span>
                                              )}
                                            </div>
                                            {(() => {
                                              const maxAmt = channel.maximum_amount ? Number(channel.maximum_amount) : 0;
                                              if (maxAmt > 0) {
                                                return (
                                                  <div className="text-[9.5px] text-slate-400 dark:text-slate-500 font-bold mt-1 tracking-tight">
                                                    Max: {formatCurrency(maxAmt)}
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        </div>
                                        {isSelected && <Check size={14} strokeWidth={3} className="text-blue-600" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="py-4 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                            Memuat saluran pembayaran...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Order Summary Card */}
              <div className="lg:col-span-5 sticky top-24">
                <Card className="p-8 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
                    Ringkasan Pesanan
                  </h3>
                  
                  <div className="mb-8 space-y-3">
                     <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                           <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Siklus Tagihan</div>
                             <div className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                               {(plan.billing_cycle === 'YEARLY' || (plan as any).billing_period === 'YEAR') ? 'Pembayaran Tahunan' : 'Pembayaran Bulanan'}
                             </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                           (plan.billing_cycle === 'YEARLY' || (plan as any).billing_period === 'YEAR')
                           ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                           : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                           {plan.size_label || 'Standard'}
                        </div>
                     </div>

                     <div className="flex items-center gap-4 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                           <Calendar size={18} />
                        </div>
                        <div>
                           <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Estimasi Masa Aktif</div>
                           <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                              s.d {formatDate(expiryDate)}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subtotal</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(price)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Biaya Layanan</span>
                      <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-md">Gratis</span>
                    </div>

                    {gatewayFee > 0 && (
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Biaya Transaksi</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(gatewayFee)}
                        </span>
                      </div>
                    )}

                    {cycle === 'YEAR' && (
                      <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                         <div className="flex items-center gap-2">
                            <Zap size={14} className="text-blue-600 fill-current" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Diskon Tahunan</span>
                         </div>
                         <span className="text-[10px] font-bold text-blue-600 uppercase">Sudah Termasuk</span>
                      </div>
                    )}
                    
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 leading-none pb-1">Total Tagihan</span>
                        <span className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 leading-none">
                          {formatCurrency(totalPrice)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium tracking-tight text-right italic">
                        *Aktivasi otomatis & instan
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/30 rounded-2xl flex items-start gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-[12px] font-bold text-red-800 dark:text-red-400">Gagal Memproses Transaksi</div>
                          <p className="text-[11px] text-red-650 dark:text-red-500 font-bold leading-relaxed mt-0.5">{error}</p>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="auth"
                      size="auth"
                      onClick={handleProceedToPayment}
                      disabled={processing || !!hasPendingUpgrade}
                      isLoading={processing}
                    >
                      <span>Lanjut Bayar</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    
                    <button 
                      type="button"
                      className="w-full py-2 text-[11px] font-semibold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                      onClick={() => navigate('/service-center?tab=catalog')}
                    >
                      Batal Transaksi
                    </button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {/* STEP 2: INLINE PAYMENT (QRIS / VA / INSTRUCTIONS) */}
          {step === 'payment' && (
            <div className="max-w-2xl mx-auto w-full">
              {!invoiceDetails ? (
                <Card className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-none">
                  {error ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <AlertCircle className="w-12 h-12 text-red-500" />
                      <h3 className="text-base font-bold text-slate-800 dark:text-white">Gagal Memuat Rincian Pembayaran</h3>
                      <p className="text-slate-500 text-sm max-w-md leading-relaxed">{error}</p>
                      <div className="flex justify-center gap-3 mt-2">
                        <Button onClick={() => loadInvoiceDetails(invoiceToken)}>Coba Lagi</Button>
                        <Button variant="outline" onClick={() => {
                          setStep('detail');
                          setError(null);
                        }}>Kembali</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-16">
                      <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Menyiapkan rincian pembayaran Anda...</p>
                    </div>
                  )}
                </Card>
              ) : (
                <motion.div
                  key="payment-step"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full"
                >
                  <Card className="p-8 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl -z-10" />

                    {/* Top Status */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">
                          Selesaikan Pembayaran
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400">
                          Invoice: <span className="font-mono text-slate-600 dark:text-slate-300">{invoiceDetails?.data?.invoice_number}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} className="animate-pulse" />
                        <span>
                          {expiredLocal 
                            ? 'Kedaluwarsa' 
                            : `${countdown.hh.toString().padStart(2, '0')}:${countdown.mm.toString().padStart(2, '0')}:${countdown.ss.toString().padStart(2, '0')}`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Amount Card */}
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          Jumlah Transfer Pas
                        </span>
                        <strong className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                          {formatCurrency(invoiceDetails.data.total_amount)}
                        </strong>
                        <span className="text-[10px] text-slate-400 block mt-1 font-medium italic">
                          Harus persis sama hingga digit terakhir
                        </span>
                      </div>

                      {/* QRIS Code Image */}
                      {invoiceDetails.data.active_transaction?.qr_url && (
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/20 dark:bg-slate-900/30">
                          {invoiceDetails.data.active_transaction?.payment_method && (
                            <div className="mb-4">
                              {(() => {
                                const methodCode = invoiceDetails.data.active_transaction.payment_method;
                                const channel = paymentChannels.find(c => c.code === methodCode);
                                if (channel) {
                                  return (
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-md">
                                      {channel.icon_url && (
                                        <img src={channel.icon_url} alt={channel.name} className="h-5 w-auto object-contain" />
                                      )}
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{channel.name}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                          <div className="bg-white p-4 rounded-2xl shadow-xl display-inline-block">
                            <img
                              src={invoiceDetails.data.active_transaction.qr_url}
                              alt="QRIS Code"
                              className="w-48 h-48 block object-contain"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 mt-4 text-center max-w-sm leading-relaxed">
                            Pindai kode QRIS di atas menggunakan aplikasi e-wallet Anda (GoPay, OVO, Dana, LinkAja, ShopeePay, BCA Mobile, dll.)
                          </span>
                        </div>
                      )}

                      {/* Virtual Account / Pay Code */}
                      {invoiceDetails.data.active_transaction?.pay_code && !invoiceDetails.data.active_transaction?.qr_url && (
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-center">
                          {invoiceDetails.data.active_transaction?.payment_method && (
                            <div className="mb-4 flex items-center justify-center">
                              {(() => {
                                const methodCode = invoiceDetails.data.active_transaction.payment_method;
                                const channel = paymentChannels.find(c => c.code === methodCode);
                                if (channel) {
                                  return (
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-md">
                                      {channel.icon_url && (
                                        <img src={channel.icon_url} alt={channel.name} className="h-5 w-auto object-contain" />
                                      )}
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{channel.name}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-md">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{methodCode}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                            Nomor Virtual Account / Kode Bayar
                          </span>
                          <div className="flex items-center justify-center gap-3">
                            <strong className="text-2xl font-mono font-black text-slate-800 dark:text-white tracking-widest">
                              {invoiceDetails.data.active_transaction.pay_code}
                            </strong>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(invoiceDetails.data.active_transaction.pay_code);
                                toast.success('Kode bayar disalin!');
                              }}
                              className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-2 font-medium">
                            Gunakan kode VA di atas untuk melakukan transfer melalui ATM/M-Banking.
                          </span>
                        </div>
                      )}

                      {/* Payment Instructions Accordion */}
                      {Array.isArray(invoiceDetails.data.active_transaction?.instructions) && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Petunjuk Pembayaran
                          </h4>
                          {invoiceDetails.data.active_transaction.instructions.map((inst: any, idx: number) => (
                            <div key={idx} className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/30 rounded-xl">
                              <strong className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-2">{inst.title}</strong>
                              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {inst.steps.map((step: string, sIdx: number) => (
                                  <li key={sIdx} dangerouslySetInnerHTML={{ __html: step }} />
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions buttons */}
                      <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          variant="auth"
                          size="auth"
                          onClick={handleCheckPaymentStatus}
                          disabled={processing}
                          isLoading={processing}
                        >
                          <RefreshCw size={16} className={`mr-2 ${processing ? 'animate-spin' : ''}`} />
                          <span>Verifikasi Pembayaran</span>
                        </Button>

                        {invoiceDetails.data.active_transaction?.payment_method === 'Manual' && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const waNum = '6287779937341';
                                const msgText = `Halo Admin, saya ingin mengirimkan bukti pembayaran manual lisensi modul.\nInvoice: ${invoiceDetails.data.invoice_number}\nJumlah: Rp ${invoiceDetails.data.total_amount.toLocaleString('id-ID')}`;
                                const msg = encodeURIComponent(msgText);
                                window.open(`https://wa.me/${waNum}?text=${msg}`, '_blank');
                              }}
                              className="w-full py-3 px-4 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40 text-green-600 dark:text-green-400 font-bold text-xs rounded-2xl transition-all border border-green-100 dark:border-green-900/30 flex items-center justify-center gap-2"
                            >
                              WhatsApp Admin (Kirim Bukti Transfer)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>
          )}

          {/* STEP 3: ACTIVATION SUCCESS */}
          {step === 'activate' && (
            <motion.div
              key="activate-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto text-center py-12"
            >
              <Card className="p-10 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl flex flex-col items-center">
                {/* Checkmark Animation */}
                <div className="w-20 h-20 bg-green-100 dark:bg-green-950/30 text-green-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50 dark:ring-green-950/10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  >
                    <Check size={40} strokeWidth={4} />
                  </motion.div>
                </div>

                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                  Aktivasi Sukses!
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                  Terima kasih atas pembayaran Anda. Modul subscription Anda telah aktif sepenuhnya secara real-time.
                </p>

                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Mengarahkan kembali...</span>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelUpgrade}
        title="Batalkan Transaksi?"
        message="Pesanan ini akan dibatalkan secara permanen di Server Lisensi pusat."
        confirmText={cancelling ? 'Sesaat...' : 'Ya, Batalkan'}
        cancelText="Kembali"
        variant="danger"
      />
    </AcademicPageLayout>
  );
}

export default function CheckoutPage() {
  return (
    <ErrorBoundary>
      <CheckoutContent />
    </ErrorBoundary>
  );
}
