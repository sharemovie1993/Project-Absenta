import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ConfirmModal } from '@/components/ui/Modal';
import { cancelPendingUpgrade, orderSubscriptionPlan } from '@/api/subscription.api';
import { getMyInvoices, getMySubscription, getPublicInvoiceLink } from '@/api/mySubscription.api';
import { getPublicPlans, formatCurrency } from '@/api/plans.api';
import type { Plan } from '@/types/plans';
import type { Invoice } from '@/types/invoice';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

// --- Premium SVGs for Payment Methods ---
const VisaIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.814 31h3.333l2.083-12.836h-3.333L18.814 31z" fill="#1A1F71"/>
    <path d="M33.722 18.291c-1.123-.42-2.905-.87-5.071-.87-5.289 0-9.016 2.814-9.043 6.845-.03 2.978 2.665 4.639 4.697 5.633 2.086 1.02 2.79 1.674 2.78 2.584-.02 1.396-1.674 2.036-3.22 2.036-2.147 0-3.395-.33-5.21-.926l-.723-.337-.773 4.8 5.163.74c6.16 0 10.224-3.056 10.278-7.794.03-2.597-1.543-4.576-4.943-6.205-2.055-1.033-3.32-1.724-3.32-2.775 0-.926 1.033-1.926 3.27-1.926 1.854-.031 3.204.4 4.237.842l.504.24.877-5.188z" fill="#1A1F71"/>
    <path d="M44.59 18.164h-3.111c-1.222 0-2.13.35-2.667 1.63L33.056 31h3.5l.7-1.925h4.278L41.944 31h3.084L44.59 18.164zm-6.527 8.27l1.417-3.9 1.416 3.9h-2.833z" fill="#1A1F71"/>
    <path d="M13.565 18.164l-3.278 8.766-.35-1.743c-.605-2.05-2.484-4.276-4.582-5.385L8.583 31h3.5l5.222-12.836h-3.74z" fill="#1A1F71"/>
    <path d="M7.749 18.164H.444L0 20.354c4.322 1.1 8.203 3.75 9.4 5.378l-1.35-6.85c-.2-.55-.63-.718-1.123-.718h.822z" fill="#F7B600"/>
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 48 48" className="h-6 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="24" r="14" fill="#EB001B"/>
    <circle cx="30" cy="24" r="14" fill="#F79E1B"/>
    <path d="M24 13.923a13.93 13.93 0 015.352 10.077 13.93 13.93 0 01-5.352 10.077 13.934 13.934 0 01-5.353-10.077c0-3.882 1.583-7.393 4.14-9.916l1.213-.161z" fill="#FF5F00"/>
  </svg>
);

const QrisIcon = () => (
  <svg viewBox="0 0 100 40" className="h-5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
     <text x="0" y="30" fontFamily="Arial" fontWeight="bold" fontSize="26" fill="#1A1F71">QRIS</text>
     <rect x="70" y="5" width="25" height="25" rx="4" fill="#F7B600" />
     <rect x="75" y="10" width="5" height="5" fill="white" />
     <rect x="85" y="10" width="5" height="5" fill="white" />
     <rect x="75" y="20" width="5" height="5" fill="white" />
  </svg>
);

function CheckoutContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // URL Query Params
  const planId = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return q.get('plan_id') || q.get('planId') || '';
  }, [location.search]);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<'MONTH' | 'YEAR'>('MONTH');
  
  // Action States
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  
  // Pending Upgrade State
  const [hasPendingUpgrade, setHasPendingUpgrade] = useState<{ 
    invoiceId: string; 
    token?: string; 
    invoiceUrl?: string; 
    planName?: string 
  } | null>(null);

  // Initial Data Fetching
  useEffect(() => {
    if (!planId) {
      setError('Paket tidak ditemukan. Silakan kembali ke halaman layanan.');
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
          } else {
            setHasPendingUpgrade(null);
          }
        } catch (err) {}

      } catch (err: unknown) {
        console.error('Checkout Error:', err);
        setError(err instanceof Error ? err.message : 'Gagal memuat data paket.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId]);

  useEffect(() => {
    const rawCycle = plan?.billing_cycle || (plan as any)?.billing_period;
    if (rawCycle) {
      setCycle(rawCycle === 'YEAR' || rawCycle === 'YEARLY' ? 'YEAR' : 'MONTH');
    }
  }, [plan]);

  const handleProceedToPayment = async () => {
    if (!plan) return;
    setProcessing(true);
    
    try {
      const res = await orderSubscriptionPlan(plan.id, cycle);
      const resData = res?.data as any;
      let invoiceId = resData?.checkout?.invoice_id || resData?.checkout?.invoiceId || null;

      if (!invoiceId) {
        try {
          const subRes = await getMySubscription();
          invoiceId = (subRes?.data as any)?.upgrade_invoice_id;
        } catch {}
      }

      if (!invoiceId) throw new Error('Gagal membuat invoice tagihan.');

      const tokenFromOrder = resData?.checkout?.public_token as string | undefined;
      const token = tokenFromOrder ? tokenFromOrder : (await getPublicInvoiceLink(String(invoiceId))).data?.token;
      
      if (!token) throw new Error('Gagal mendapatkan token pembayaran.');

      navigate(`/payment/public/${encodeURIComponent(token)}`, { replace: true });

    } catch (e: unknown) {
      const errObj = e as any;
      const msg = errObj?.response?.data?.message || errObj?.message || 'Gagal memproses pesanan.';
      
      if (String(msg).toLowerCase().includes('invoice already exists') || String(msg).includes('UPGRADE_ALREADY_PENDING')) {
          try {
            let existingInvoiceId: string | null = null;
            let existingPlanId: string | null = null;
            let existingCycle: string | null = null;

            const subRes = await getMySubscription();
            const subData = subRes?.data as any;

            if (subData?.upgrade_invoice_id) {
              existingInvoiceId = subData.upgrade_invoice_id;
              existingPlanId = subData.target_upgrade_plan?.id || null;
              existingCycle = subData.target_upgrade_plan?.billing_period || null;
            }

            if (!existingInvoiceId) {
              const invRes = await getMyInvoices();
              const invoices = Array.isArray(invRes?.data) ? (invRes.data as Invoice[]) : [];
                
              const targetServiceCode = String(plan.service_code || '');
              const match = invoices.find((inv: any) => {
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

              if (match?.id) {
                existingInvoiceId = match.id;
                const billingList = (match as any)?.Billing || (match as any)?.billing;
                const billingArray = Array.isArray(billingList) ? billingList : (billingList ? [billingList] : []);
                const upgradeBilling = billingArray.find((b: any) => 
                  String(b.charge_type || b.chargeType || '').toUpperCase() === 'UPGRADE'
                );
                existingPlanId = upgradeBilling?.plan_id || null;
                existingCycle = upgradeBilling?.billing_period || upgradeBilling?.billing_cycle || null;
              }
            }

            const isSamePlan = String(existingPlanId) === String(plan.id);
            const isSameCycle = String(existingCycle) === String(cycle);

            if (existingInvoiceId && isSamePlan && isSameCycle) {
              toast.loading('Mengarahkan ke pembayaran aktif...', { duration: 2000 });
              const linkRes = await getPublicInvoiceLink(String(existingInvoiceId));
              const token = linkRes.data?.token;
              if (token) {
                navigate(`/payment/public/${encodeURIComponent(token)}`, { replace: true });
                return;
              }
            } else if (existingInvoiceId) {
              setError('Anda memiliki tagihan aktif untuk paket lain. Silakan batalkan tagihan sebelumnya terlebih dahulu melalui panel di atas.');
              const link = await getPublicInvoiceLink(String(existingInvoiceId));
              setHasPendingUpgrade({
                invoiceId: String(existingInvoiceId),
                token: link?.data?.token,
                planName: subData?.target_upgrade_plan?.name || 'Paket Sebelumnya'
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
          } catch (err) {
            console.error('Error during conflict resolution:', err);
          }
          setError('Anda sudah memiliki transaksi aktif. Silakan selesaikan atau batalkan pembayaran sebelumnya.');
      } else {
          setError(msg);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelUpgrade = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await cancelPendingUpgrade();
      if (!res?.success) throw new Error(res?.message || 'Gagal membatalkan upgrade.');
      setHasPendingUpgrade(null);
      setCancelModalOpen(false);
      navigate('/service-center?tab=catalog');
    } catch (e: unknown) {
      const errObj = e as any;
      setError(errObj?.response?.data?.message || errObj?.message || 'Gagal membatalkan pesanan.');
    } finally {
      setProcessing(false);
      setCancelModalOpen(false);
    }
  }, [navigate]);

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

  const price = useMemo(() => {
    if (!plan) return 0;
    if (cycle === 'YEAR') {
      return plan.price_yearly || (plan.price_monthly * 12);
    }
    return plan.price_monthly;
  }, [plan, cycle]);

  const features = useMemo(() => {
    if (!plan?.features) return [];
    let raw = plan.features;
    if (typeof raw === 'string' && raw.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    if (typeof raw === 'string') {
      return raw.split(',')?.map(f => f.trim().replace(/^["'\[\]]|["'\[\]]$/g, '')).filter(Boolean);
    }
    if (Array.isArray(raw)) return raw;
    return [];
  }, [plan]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
         <div className="text-center">
            <div className="w-12 h-12 border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Menyiapkan Checkout...</p>
         </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 text-red-600 p-4 rounded-xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Terjadi Kesalahan</h2>
        <p className="text-xs font-bold text-slate-500 max-w-sm mb-8 leading-relaxed uppercase tracking-tight">{error || 'Paket tidak ditemukan'}</p>
        <Button size="lg" onClick={() => navigate('/service-center?tab=catalog')} className="px-10 rounded-xl h-14">Kembali ke Layanan</Button>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      hardeningModuleKey="billing_checkout"
      title="Checkout Transaksi"
      description="Tinjau detail paket langganan Anda sebelum melanjutkan pembayaran aman melalui gerbang kami."
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-blue-100 selection:text-blue-900">
      <main className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
        <AnimatePresence>
          {hasPendingUpgrade && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 bg-white dark:bg-slate-900 border-2 border-amber-500/20 rounded-xl p-6 shadow-xl shadow-amber-500/5 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Transaksi Tertunda Ditemukan</h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 tracking-tight leading-relaxed max-w-md">
                      Anda memiliki tagihan aktif untuk paket <span className="text-amber-600 font-bold">{hasPendingUpgrade.planName || 'Sebelumnya'}</span>. 
                      Selesaikan pembayaran tersebut atau batalkan untuk memproses paket <span className="text-blue-600 font-bold">{plan?.name.replace(/-/g, ' ')}</span> ini.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                   <Button 
                    variant="outline" 
                    onClick={() => setCancelModalOpen(true)}
                    className="h-11 px-6 rounded-xl text-[10px] font-bold tracking-tight border-2 border-slate-100 hover:bg-slate-50 transition-all text-slate-600"
                  >
                    Batalkan Transaksi Lama
                  </Button>
                  <Button 
                    variant="warning" 
                    onClick={() => navigate(`/payment/public/${encodeURIComponent(hasPendingUpgrade.token || '')}`)}
                    className="h-11 px-8 rounded-xl text-[10px] font-bold tracking-tight shadow-lg shadow-amber-500/20 flex items-center gap-2"
                  >
                    Lihat Detail Tagihan <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
            >
              <div className="p-8 md:p-10">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                   <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-semibold uppercase tracking-wider mb-4">
                        Paket Pilihan
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight capitalize">
                        {plan.name.replace(/-/g, ' ').toLowerCase()}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm font-medium leading-relaxed max-w-lg">
                        {plan.description || `Optimalkan operasional sekolah Anda dengan paket ${plan.name} yang handal dan teruji.`}
                      </p>
                   </div>
                   <div className="bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800/50 text-center sm:min-w-[140px]">
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
                       features?.map((feature, i) => (
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

              <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                       <div className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">SSL Security</div>
                       <div className="text-[9px] text-slate-400 font-medium">Transaksi Terenkripsi</div>
                    </div>
                  </div>
                 <div className="flex items-center gap-5 opacity-40 grayscale hover:grayscale-0 transition-all">
                    <VisaIcon />
                    <MastercardIcon />
                    <QrisIcon />
                 </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="sticky top-24"
            >
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
                         {(plan.billing_cycle === 'YEARLY' || (plan as any).billing_period === 'YEAR') ? 'Hemat 10%+' : 'Standard'}
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
                        {formatCurrency(price)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium tracking-tight text-right italic">
                      *Aktivasi otomatis & instan
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
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
                    className="w-full py-2 text-[11px] font-semibold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                    onClick={() => navigate('/service-center?tab=catalog')}
                  >
                    Batal Transaksi
                  </button>
                </div>

                 <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-medium text-slate-400 tracking-wider leading-loose">
                       Pembayaran Aman melalui Tripay Gateway <br /> 
                       <span className="opacity-50">Authorized Absenta Partner</span>
                    </p>
                 </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelUpgrade}
        title="Batalkan Transaksi?"
        message="Pesanan lama akan dibatalkan secara permanen agar Anda dapat membuat pesanan baru ini."
        confirmText={cancelling ? 'Sesaat...' : 'Ya, Batalkan'}
        cancelText="Kembali"
        variant="danger"
      />
      </div>
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
