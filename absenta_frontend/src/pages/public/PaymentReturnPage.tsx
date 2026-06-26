import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import { Loader2, AlertCircle, CheckCircle2, Clock, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, SectionCard } from '@/components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const PaymentReturnPageContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');

  const [status, setStatus] = useState<string>('');
  const [invoiceToken, setInvoiceToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [attempt, setAttempt] = useState<number>(0);

  const normalizedStatus = useMemo(() => String(status || '').toUpperCase(), [status]);
  const isSuccess = useMemo(() => ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED'].includes(normalizedStatus), [normalizedStatus]);
  const isTerminalFail = useMemo(() => ['FAILED', 'EXPIRED', 'CANCELLED'].includes(normalizedStatus), [normalizedStatus]);

  const fetchStatus = useCallback(async () => {
    if (!ref) return;
    const apiRoot = resolvePublicApiBaseUrl();
    try {
      const res = await axiosInstance.get(`/payment/public/status?ref=${encodeURIComponent(String(ref))}`, {
        baseURL: apiRoot,
        headers: { Accept: 'application/json' },
      });
      const d = res?.data?.data;
      setStatus(d?.status || '');
      if (d?.invoice_token) setInvoiceToken(d.invoice_token);
      
      const norm = String(d?.status || '').toUpperCase();
      if (['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED'].includes(norm)) {
        setTimeout(() => {
          if (d.invoice_token) navigate(`/payment/public/${encodeURIComponent(d.invoice_token)}/instruction?ref=${encodeURIComponent(String(ref))}`, { replace: true });
          else navigate(`/payment/status/${encodeURIComponent(String(ref))}`, { replace: true });
        }, 2000);
      } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(norm)) {
          setTimeout(() => navigate(`/payment/status/${encodeURIComponent(String(ref))}`, { replace: true }), 2000);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memeriksa status';
      setError(msg);
    } finally {
      setAttempt(a => a + 1);
    }
  }, [ref, navigate]);

  useEffect(() => {
    if (!ref) { navigate('/'); return; }
    fetchStatus();
    const id = setInterval(fetchStatus, 3000);
    return () => clearInterval(id);
  }, [ref, navigate, fetchStatus]);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Gerbang Pembayaran' },
    { label: 'Status Verifikasi' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Verifikasi Pembayaran',
    description: 'Mohon tunggu sejenak sementara sistem memverifikasi pembayaran Anda.',
    items: [
      { text: 'Jangan menutup atau menyegarkan halaman ini agar proses sinkronisasi berjalan lancar.' },
      { text: 'Sistem sedang menunggu konfirmasi resmi dari gateway pembayaran.' },
      { text: 'Anda akan dialihkan secara otomatis setelah status terverifikasi.' }
    ]
  }), []);

  return (
    <AcademicPageLayout
      title="Verifikasi Pembayaran"
      description="Sinkronisasi status transaksi dengan gateway pembayaran"
      hardeningModuleKey="payment_return"
      instruction={instruction}
      breadcrumbs={breadcrumbs}
    >
      <div className="flex items-center justify-center p-4 relative min-h-[50vh]">
        <div className="max-w-md w-full relative z-10">
          <AnimatePresence mode="wait">
             <motion.div
                key={isSuccess ? 'success' : isTerminalFail ? 'fail' : 'pending'}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
             >
                <SectionCard noPadding fullWidth className="rounded-[3rem] overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
                   <div className="p-8 sm:p-12 text-center">
                      <div className="mb-10 flex justify-center">
                         <div className="relative">
                            <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${isSuccess ? 'bg-emerald-500' : isTerminalFail ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <div className="relative bg-white dark:bg-slate-800 rounded-full p-4 shadow-xl">
                               {isSuccess ? <CheckCircle2 className="w-12 h-12 text-emerald-500" /> : 
                                isTerminalFail ? <AlertCircle className="w-12 h-12 text-red-500" /> : 
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />}
                            </div>
                         </div>
                      </div>

                      <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                         {isSuccess ? 'Pembayaran Dikonfirmasi' : isTerminalFail ? 'Pembayaran Tidak Berhasil' : 'Memproses Pembayaran'}
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                         {isSuccess ? 'Sistem telah mendeteksi pembayaran Anda. Mengalihkan ke detail invoice...' : 
                          isTerminalFail ? 'Maaf, terjadi masalah pada transaksi Anda. Mengalihkan ke halaman status...' : 
                          'Sedang menunggu konfirmasi resmi dari gateway pembayaran. Mohon tidak menutup halaman ini.'}
                      </p>

                      <div className="space-y-3">
                         <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest border border-slate-100 dark:border-slate-700">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            Ref: {ref}
                         </div>
                         {error && <p className="text-xs text-red-500 font-bold tracking-tight animate-pulse">{error}</p>}
                      </div>

                      <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-3">
                         {invoiceToken && (
                           <Button onClick={() => navigate(`/invoice/public/${invoiceToken}`)} variant="ghost" className="text-blue-600 font-black text-sm flex items-center justify-center gap-2 group">
                              Lihat Dokumen Invoice
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                           </Button>
                         )}
                         <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
                            <CreditCard className="w-3 h-3" />
                            Pembayaran Aman & Terkunci
                         </div>
                      </div>
                   </div>
                   
                   {!isSuccess && !isTerminalFail && (
                     <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-600"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" as any }}
                          style={{ width: "40%" }}
                        />
                     </div>
                   )}
                </SectionCard>
             </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

const PaymentReturnPage: React.FC = () => (
  <PaymentReturnPageContent />
);

export default PaymentReturnPage;
