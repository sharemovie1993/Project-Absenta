import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import { CheckCircle2, AlertCircle, CreditCard, ArrowRight, ShieldCheck, Home, FileText, Loader2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, SectionCard } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

type PublicPaymentStatus = {
  success: boolean;
  message: string;
  data?: {
    id: string;
    status: string;
    billing_id: string;
    gateway: string;
    created_at: string;
    paid_at?: string | null;
    expired_at?: string | null;
    invoice_token?: string;
  };
};

function PaymentStatusContent() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loadUser, isLoading: isAuthLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<PublicPaymentStatus | null>(null);

  const fetchStatus = useCallback(async (alive: boolean) => {
    try {
      const apiRoot = resolvePublicApiBaseUrl();
      const res = await axiosInstance.get(`/payment/public/status?ref=${encodeURIComponent(String(ref || ''))}`, {
        baseURL: apiRoot,
        headers: { Accept: 'application/json' },
      });
      if (alive) setStatusData(res.data as PublicPaymentStatus);
    } catch (e: unknown) {
      if (alive) setError(e instanceof Error ? e.message : 'Gagal memuat status pembayaran');
    } finally {
      if (alive) setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    let alive = true;
    fetchStatus(alive);
    const id = setInterval(() => fetchStatus(alive), 5000);
    return () => { alive = false; clearInterval(id); };
  }, [fetchStatus]);

  const s = useMemo(() => String(statusData?.data?.status || '').toUpperCase(), [statusData]);
  const isPaid = useMemo(() => ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED'].includes(s), [s]);
  const isFailed = useMemo(() => ['FAILED', 'EXPIRED', 'CANCELLED', 'CANCELED'].includes(s), [s]);
  const isPending = useMemo(() => !isPaid && !isFailed, [isPaid, isFailed]);

  useEffect(() => {
    if (isPaid && isAuthenticated) {
      (async () => {
        try { await loadUser(); } catch {}
        setTimeout(() => navigate('/dashboard', { replace: true }), 3000);
      })();
    }
  }, [isPaid, isAuthenticated, loadUser, navigate]);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as any } }
  }), []);

  const renderStatusIcon = () => {
    if (isPaid) return (
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
        <CheckCircle2 className="w-20 h-20 text-emerald-500 relative z-10" />
      </div>
    );
    if (isFailed) return (
      <div className="relative">
        <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
        <XCircle className="w-20 h-20 text-red-500 relative z-10" />
      </div>
    );
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
        <Loader2 className="w-20 h-20 text-blue-500 relative z-10 animate-spin" />
      </div>
    );
  };

  const breadcrumbs = useMemo(() => [
    { label: 'Invoice' },
    { label: 'Status Pembayaran' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Status Transaksi',
    description: 'Halaman ini menampilkan status terbaru dari transaksi pembayaran Anda.',
    items: [
      { text: 'Jika status sudah "SUCCESS", sistem akan otomatis memperbarui langganan Anda.' },
      { text: 'Anda akan dialihkan ke dashboard dalam beberapa detik setelah pembayaran lunas.' },
      { text: 'Jika pembayaran gagal, Anda dapat mencoba kembali melalui halaman invoice.' }
    ]
  }), []);

  if (isAuthLoading) return null;

  return (
    <AcademicPageLayout
      title="Status Pembayaran"
      description="Pantau status transaksi Anda secara real-time melalui sistem gateway kami."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="payment_status_page"
    >
      <div className="flex-grow flex items-center justify-center p-4 pb-20 relative overflow-hidden">
        {/* BG Decorations */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mesh rounded-full blur-3xl" />
        </div>

        <div className="max-w-xl w-full">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                 <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Mengetahui Status Pembayaran...</p>
              </motion.div>
            ) : error ? (
              <motion.div key="error" variants={containerVariants} initial="hidden" animate="visible" className="text-center">
                 <SectionCard className="p-12 rounded-[3rem]">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-black mb-2">Terjadi Gangguan</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <Button onClick={() => window.location.reload()} className="rounded-full px-10">Coba Lagi</Button>
                 </SectionCard>
              </motion.div>
            ) : (
              <motion.div key="status" variants={containerVariants} initial="hidden" animate="visible">
                <SectionCard noPadding fullWidth className="rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 border-0">
                  <div className="p-8 sm:p-12 text-center">
                     <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="flex justify-center mb-10"
                      >
                        {renderStatusIcon()}
                     </motion.div>

                     <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                        {isPaid ? 'Pembayaran Berhasil' : isFailed ? 'Transaksi Gagal' : 'Menunggu Konfirmasi'}
                     </h1>
                     <p className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed text-balance">
                        {isPaid ? 'Terima kasih, tagihan Anda telah kami terima dan sistem telah diperbarui secara otomatis.' : isFailed ? 'Maaf, transaksi Anda tidak dapat dilanjutkan. Silakan periksa saldo atau hubungi bank Anda.' : 'Kami sedang mendengarkan konfirmasi dari gerbang pembayaran. Mohon tetap di halaman ini.'}
                     </p>

                     <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Referensi</span>
                           <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 break-all">{ref}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Metode</span>
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{statusData?.data?.gateway || '-'} Gateway</span>
                        </div>
                        <div className="col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                           <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                              <span className={`text-sm font-black uppercase tracking-tighter ${isPaid ? 'text-emerald-500' : isFailed ? 'text-red-500' : 'text-blue-500'}`}>{s}</span>
                           </div>
                           <ShieldCheck className="w-5 h-5 text-slate-300" />
                        </div>
                     </div>

                     <div className="space-y-4">
                        {isPaid && isAuthenticated && (
                          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                             Mengarahkan Anda ke Dashboard...
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3">
                           {statusData?.data?.invoice_token && (
                             <Button onClick={() => navigate(`/invoice/public/${statusData.data!.invoice_token}`)} className={`flex-grow py-4 rounded-xl font-bold gap-2 ${isPaid ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-xl' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 shadow-xl'}`}>
                                <FileText className="w-5 h-5" />
                                Kembali ke Detail Tagihan
                             </Button>
                           )}
                           <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500">
                              <Home className="w-5 h-5" />
                              Beranda
                           </Button>
                        </div>
                     </div>
                  </div>
                  
                  {isPending && (
                    <motion.div 
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="bg-blue-50/50 dark:bg-blue-900/20 px-8 py-4 text-center border-t border-slate-50 dark:border-slate-800"
                    >
                       <span className="text-[10px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">Menunggu konfirmasi otomatis...</span>
                    </motion.div>
                  )}
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AcademicPageLayout>
  );
}

export default function PaymentStatusPage() {
  return (
    <PaymentStatusContent />
  );
}
