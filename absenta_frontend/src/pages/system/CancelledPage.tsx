import React, { useMemo, useCallback } from 'react';
import { Ban, Home, LifeBuoy, Mail, Slash } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_SUPPORT_EMAIL, MAIN_DOMAIN } from '@/config/env-config';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

function CancelledContent() {
  const navigate = useNavigate();

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/home' },
    { label: 'Status Layanan' }
  ], []);

  const handleGoHome = useCallback(() => navigate('/home'), [navigate]);
  const handleContactSupport = useCallback(() => { window.location.href = `mailto:${DEFAULT_SUPPORT_EMAIL}`; }, []);
  const handleNewSubscription = useCallback(() => { window.open(`https://${MAIN_DOMAIN}/pricing`, '_blank'); }, []);

  return (
    <AcademicPageLayout
      title="Status Langganan: Berhenti"
      description="Layanan institusi Anda telah dibatalkan secara permanen atau berakhir masa aktifnya."
      hardeningModuleKey="system_cancelled"
      instruction={{
        title: "Informasi Layanan",
        description: "Layanan institusi Anda telah dibatalkan secara permanen atau berakhir masa aktifnya.",
        items: [
          { text: "Akses Anda ke fitur sistem telah dibatasi." },
          { text: "Silakan hubungi tim kami atau pilih paket langganan baru untuk memulihkan akses." }
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
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 15, delay: 0.2 }}
                  className="mb-8 flex justify-center"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 blur-2xl rounded-full" />
                      <div className="relative w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                         <Ban className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                         <Slash className="absolute inset-0 w-full h-full text-slate-200/50 dark:text-slate-700/50 p-2" />
                      </div>
                   </div>
                </motion.div>

                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase">Layanan Berhenti</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-10 max-w-xs mx-auto leading-relaxed">
                   Langganan institusi Anda untuk sistem Absenta telah dibatalkan secara permanen atau telah berakhir masa aktifnya.
                </p>

                <div className="space-y-4">
                   <Button onClick={handleGoHome} className="w-full h-14 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-xl active:scale-95 transition-all gap-2">
                      <Home className="w-5 h-5" /> Kembali ke Beranda
                   </Button>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="ghost" onClick={handleContactSupport} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <Mail className="w-4 h-4" /> Hubungi Support
                      </Button>
                      <Button variant="ghost" onClick={handleNewSubscription} className="flex-1 h-14 rounded-xl font-bold text-blue-600 hover:bg-blue-50 gap-2 border-2 border-transparent hover:border-blue-100 transition-all">
                         <LifeBuoy className="w-4 h-4" /> Langganan Baru
                      </Button>
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800/50 py-6 text-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">Account status: SUBSCRIPTION_CANCELLED</span>
             </div>
          </Card>
        </motion.div>
      </div>
    </AcademicPageLayout>
  );
}

export default function CancelledPage() {
  return (
    <CancelledContent />
  );
}
