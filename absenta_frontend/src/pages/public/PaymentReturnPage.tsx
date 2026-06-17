import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import { Loader2, AlertCircle, CheckCircle2, Clock, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';

const PaymentReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');

  const [status, setStatus] = useState<string>('');
  const [invoiceToken, setInvoiceToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [attempt, setAttempt] = useState<number>(0);

  const normalizedStatus = useMemo(() => String(status || '').toUpperCase(), [status]);
  const isSuccess = ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED'].includes(normalizedStatus);
  const isTerminalFail = ['FAILED', 'EXPIRED', 'CANCELLED'].includes(normalizedStatus);

  useEffect(() => {
    if (!ref) { navigate('/'); return; }
  }, [ref, navigate]);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    const apiRoot = resolvePublicApiBaseUrl();

    const fetchStatus = async () => {
      try {
        const res = await axiosInstance.get(`/payment/public/status?ref=${encodeURIComponent(String(ref))}`, {
          baseURL: apiRoot,
          headers: { Accept: 'application/json' },
        });
        const d = res?.data?.data;
        if (!alive) return;
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
      } catch (e: any) {
        if (alive) setError(e?.message || 'Gagal memeriksa status');
      } finally {
        if (alive) setAttempt(a => a + 1);
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [ref, navigate]);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-4 pt-24 pb-20 relative">
        {/* Background mesh */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mesh rounded-full blur-3xl" />
        </div>

        <div className="max-w-md w-full relative z-10">
          <AnimatePresence mode="wait">
             <motion.div
                key={isSuccess ? 'success' : isTerminalFail ? 'fail' : 'pending'}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
             >
                <Card className="rounded-[3rem] overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
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
                   
                   {/* Progress bar for pending */}
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
                </Card>
             </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentReturnPage;
