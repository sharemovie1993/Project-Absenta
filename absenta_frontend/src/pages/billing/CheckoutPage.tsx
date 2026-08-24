import React, { useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button, SectionCard } from '@/components/ui';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ConfirmModal } from '@/components/ui/Modal';
import { cancelPendingUpgrade, orderSubscriptionPlan } from '@/api/subscription.api';
import { getPublicInvoiceLink, getPaymentChannels } from '@/api/mySubscription.api';
import { getPublicPlans } from '@/api/plans.api';
import type { Plan } from '@/types/plans';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { formatDate } from '@/utils/layoutUtils';
import type { Step } from '@/components/billing/checkout/CheckoutWizardHeader';

// Lazy loaded modular subcomponents (Pilar 11 & Pilar 21)
const CheckoutWizardHeader = lazy(() => import('@/components/billing/checkout/CheckoutWizardHeader').then(m => ({ default: m.CheckoutWizardHeader })));
const CheckoutDetailStep = lazy(() => import('@/components/billing/checkout/CheckoutDetailStep').then(m => ({ default: m.CheckoutDetailStep })));
const CheckoutPaymentStep = lazy(() => import('@/components/billing/checkout/CheckoutPaymentStep').then(m => ({ default: m.CheckoutPaymentStep })));
const CheckoutSuccessStep = lazy(() => import('@/components/billing/checkout/CheckoutSuccessStep').then(m => ({ default: m.CheckoutSuccessStep })));

interface PaymentChannelItem {
  code: string;
  name: string;
  icon_url?: string;
  maximum_amount?: number | string;
}

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
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<'MONTH' | 'YEAR'>(initialCycle);
  const [selectedChannel, setSelectedChannel] = useState<string>('QRIS2');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Wizard Step State
  const [step, setStep] = useState<Step>('detail');
  const [invoiceToken, setInvoiceToken] = useState<string>('');
  const [invoiceDetails, setInvoiceDetails] = useState<Record<string, unknown> | null>(null);
  
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

  const countdown = useMemo(() => ({ dd: 0, hh: 0, mm: 0, ss: 0 }), []);
  const expiredLocal = false;

  // React Query Fetching (Pilar 31)
  const { data: plan, isLoading: loadingPlan, isError: isPlanError } = useQuery<Plan | null>({
    queryKey: ['checkout-plan-detail', planId],
    queryFn: async () => {
      if (!planId) return null;
      const plansRes = await getPublicPlans();
      const resData = plansRes?.data as { plans?: Plan[] } | Plan[];
      if (resData && !Array.isArray(resData) && resData.plans) {
        return resData.plans.find((p: Plan) => String(p.id) === String(planId)) || null;
      } else if (Array.isArray(plansRes?.data)) {
        return (plansRes.data as Plan[]).find((p: Plan) => String(p.id) === String(planId)) || null;
      }
      return null;
    },
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: paymentChannels = [] } = useQuery<PaymentChannelItem[]>({
    queryKey: ['checkout-payment-channels'],
    queryFn: async () => {
      const res = await getPaymentChannels();
      return (res?.data || []) as PaymentChannelItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const price = useMemo(() => {
    if (!plan) return 0;
    return cycle === 'YEAR' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly;
  }, [plan, cycle]);

  const gatewayFee = useMemo(() => {
    return selectedChannel === 'QRIS2' ? 0 : 4500;
  }, [selectedChannel]);

  const totalPrice = price + gatewayFee;

  const expiryDate = useMemo(() => {
    const d = new Date();
    if (cycle === 'YEAR') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return formatDate(d, { day: '2-digit', month: 'short', year: 'numeric' });
  }, [cycle]);

  const features = useMemo(() => {
    if (!plan) return [];
    const featJson = (plan as Record<string, unknown>)?.features_json || (plan as Record<string, unknown>)?.features || [];
    return Array.isArray(featJson) ? (featJson as string[]) : [];
  }, [plan]);

  const handleProceedToPayment = useCallback(async () => {
    if (!plan) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await orderSubscriptionPlan({
        plan_id: plan.id,
        billing_cycle: cycle === 'YEAR' ? 'YEARLY' : 'MONTHLY',
        payment_method: selectedChannel,
      });

      if (res?.data?.token || res?.data?.invoice_token) {
        const token = res.data.token || res.data.invoice_token;
        setInvoiceToken(token);
        setStep('payment');
        const invRes = await getPublicInvoiceLink(token);
        setInvoiceDetails(invRes);
      } else {
        toast.success('Pemesanan paket berhasil diproses.');
        setStep('activate');
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Gagal memproses pesanan paket.');
    } finally {
      setProcessing(false);
    }
  }, [plan, cycle, selectedChannel]);

  const loadInvoiceDetails = useCallback(async (token: string) => {
    try {
      const res = await getPublicInvoiceLink(token);
      setInvoiceDetails(res);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || 'Gagal memuat invoice.');
    }
  }, []);

  const handleCheckPaymentStatus = useCallback(async () => {
    if (!invoiceToken) return;
    setProcessing(true);
    try {
      const res = await getPublicInvoiceLink(invoiceToken);
      if (res?.data?.status === 'PAID') {
        toast.success('Pembayaran berhasil dikonfirmasi!');
        setStep('activate');
        navigate('/billing/my-subscription');
      } else {
        toast('Menunggu konfirmasi pembayaran...', { icon: '⏳' });
      }
    } catch {
      toast.error('Gagal memeriksa status pembayaran.');
    } finally {
      setProcessing(false);
    }
  }, [invoiceToken, navigate]);

  const handleCancelUpgrade = useCallback(async () => {
    if (!hasPendingUpgrade?.invoiceId) return;
    setCancelling(true);
    try {
      await cancelPendingUpgrade(hasPendingUpgrade.invoiceId);
      toast.success('Upgrade pending berhasil dibatalkan.');
      setHasPendingUpgrade(null);
      setCancelModalOpen(false);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj?.message || 'Gagal membatalkan upgrade.');
    } finally {
      setCancelling(false);
    }
  }, [hasPendingUpgrade]);

  const breadcrumbs = useMemo(() => [
    { label: 'Layanan', path: '/service-center?tab=catalog' },
    { label: 'Checkout & Aktivasi' }
  ], []);

  if (!planId || isPlanError) {
    return (
      <AcademicPageLayout
        title="Checkout Layanan"
        description="Aktivasi langganan modul aplikasi Absenta."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="billing_checkout"
        instruction={{
          title: "Panduan Checkout",
          description: "Silakan pilih paket modul yang ingin Anda aktifkan.",
          items: [{ text: "Pilih paket melalui menu Katalog Layanan." }]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="max-w-md mx-auto text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Paket tidak ditemukan. Silakan kembali ke katalog layanan.
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/service-center?tab=catalog')}
              className="mt-6 font-bold rounded-xl"
            >
              Kembali ke Katalog
            </Button>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Checkout & Aktivasi Layanan"
      description="Selesaikan transaksi pemesanan modul dan dapatkan aktivasi hak akses instan otomatis."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="billing_checkout"
      topSlot={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => navigate('/service-center?tab=catalog')}
            className="flex items-center gap-1.5 font-bold rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Katalog
          </Button>
        </div>
      }
      instruction={{
        title: "Panduan Checkout & Aktivasi Modul",
        description: "Proses pembelian lisensi modul Absenta dengan aktivasi instan otomatis.",
        items: [
          { text: "Pilih paket dan saluran pembayaran yang Anda kehendaki." },
          { text: "Lakukan pembayaran tepat sesuai jumlah hingga digit terakhir." },
          { text: "Sistem akan mendeteksi webhook secara instan dan mengaktifkan hak akses modul." }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
        <div className="max-w-6xl mx-auto w-full space-y-8">
          <Suspense fallback={<div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
            <CheckoutWizardHeader step={step} />
          </Suspense>

          <AnimatePresence mode="wait">
            {step === 'detail' && plan && (
              <Suspense fallback={<div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />}>
                <CheckoutDetailStep
                  plan={plan}
                  price={price}
                  features={features}
                  paymentChannels={paymentChannels}
                  selectedChannel={selectedChannel}
                  setSelectedChannel={setSelectedChannel}
                  isDropdownOpen={isDropdownOpen}
                  setIsDropdownOpen={setIsDropdownOpen}
                  expiryDate={expiryDate}
                  gatewayFee={gatewayFee}
                  cycle={cycle}
                  totalPrice={totalPrice}
                  error={error}
                  processing={processing}
                  hasPendingUpgrade={hasPendingUpgrade}
                  handleProceedToPayment={handleProceedToPayment}
                  onCancel={() => navigate('/service-center?tab=catalog')}
                  setError={setError}
                />
              </Suspense>
            )}

            {step === 'payment' && (
              <Suspense fallback={<div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />}>
                <CheckoutPaymentStep
                  invoiceDetails={invoiceDetails}
                  error={error}
                  countdown={countdown}
                  expiredLocal={expiredLocal}
                  processing={processing}
                  paymentChannels={paymentChannels}
                  loadInvoiceDetails={loadInvoiceDetails}
                  invoiceToken={invoiceToken}
                  setStep={setStep}
                  setError={setError}
                  handleCheckPaymentStatus={handleCheckPaymentStatus}
                />
              </Suspense>
            )}

            {step === 'activate' && (
              <Suspense fallback={<div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />}>
                <CheckoutSuccessStep />
              </Suspense>
            )}
          </AnimatePresence>
        </div>
      </SectionCard>

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

export const CheckoutPage: React.FC = React.memo(() => {
  return (
    <ErrorBoundary>
      <CheckoutContent />
    </ErrorBoundary>
  );
});

export default CheckoutPage;
