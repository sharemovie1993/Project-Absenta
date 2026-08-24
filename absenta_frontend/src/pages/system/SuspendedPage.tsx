import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CreditCard, Home, Mail, AlertCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { motion } from 'framer-motion';
import { DEFAULT_SUPPORT_EMAIL } from '@/config/env-config';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { formatDate } from '../../utils/layoutUtils';

function SuspendedContent() {
  const navigate = useNavigate();

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } }
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/home' },
    { label: 'Penangguhan Akun' }
  ], []);

  const handleGoToBilling = useCallback(() => navigate('/billing'), [navigate]);
  const handleGoHome = useCallback(() => navigate('/home'), [navigate]);
  const handleContactSupport = useCallback(() => { window.location.href = `mailto:${DEFAULT_SUPPORT_EMAIL}`; }, []);

  return (
    <AcademicPageLayout
      title="Status Akun: Ditangguhkan"
      description="Akses aplikasi untuk institusi Anda sedang kami tangguhkan sementara."
      hardeningModuleKey="system_suspended"
      instruction={{
        title: "Penangguhan Akun",
        description: "Penangguhan ini biasanya terjadi karena masalah administrasi atau tagihan yang belum diselesaikan.",
        items: [
          { text: "Silakan periksa detail tagihan Anda di Pusat Billing." },
          { text: "Hubungi tim support jika Anda merasa ini adalah kesalahan." }
        ]
      }}
      breadcrumbs={breadcrumbs}
    >
      <div className="flex items-center justify-center p-6 relative min-h-[50vh]">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-lg relative z-10"
        >
          <Card className="rounded-[3rem] overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
             <div className="p-8 sm:p-12 text-center">
                <motion.div 
                  initial={{ rotate: -10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="mb-8 flex justify-center"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                      <div className="relative w-24 h-24 rounded-xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-500/40">
                         <ShieldAlert className="w-12 h-12 text-white" />
                      </div>
                   </div>
                </motion.div>

                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase">Akun Ditangguhkan</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-10 max-w-xs mx-auto leading-relaxed">
                   Maaf, akses aplikasi untuk institusi Anda sedang kami tangguhkan sementara karena masalah administrasi atau tagihan.
                </p>

                <div className="mb-10 p-6 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-left flex gap-4">
                   <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1">Informasi</h4>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-500 leading-relaxed">
                         Silakan selesaikan pembayaran tagihan yang tertunda atau hubungi administrator sekolah Anda untuk mengaktifkan kembali layanan.
                      </p>
                   </div>
                </div>

                <div className="space-y-4">
                   <Button onClick={handleGoToBilling} className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2">
                      <CreditCard className="w-5 h-5" /> Buka Pusat Billing
                   </Button>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="ghost" onClick={handleGoHome} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <Home className="w-4 h-4" /> Beranda
                      </Button>
                      <Button variant="ghost" onClick={handleContactSupport} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <Mail className="w-4 h-4" /> Hubungi Kami
                      </Button>
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800/50 py-6 text-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">Account status: SUBSCRIPTION_SUSPENDED</span>
             </div>
          </Card>
        </motion.div>
      </div>
    </AcademicPageLayout>
  );
}

export default function SuspendedPage() {
  return (
    <SuspendedContent />
  );
}
