import React, { useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, SectionCard } from '@/components/ui';
import { ShieldAlert, AlertTriangle, ArrowLeft, Home, Lock, LifeBuoy } from 'lucide-react';
import { motion } from 'framer-motion';
import { MAIN_DOMAIN } from '@/config/env-config';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

export const ForbiddenPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const reason = searchParams.get('reason');
  const source = searchParams.get('source');

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/dashboard' },
    { label: '403 Akses Dibatasi' }
  ], []);

  const handleGoDashboard = useCallback(() => navigate('/dashboard'), [navigate]);
  const handleGoBack = useCallback(() => navigate(-1), [navigate]);
  const handleOpenHelp = useCallback(() => {
    window.open(`https://help.${MAIN_DOMAIN}`, '_blank');
  }, []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="403 - Akses Dibatasi"
        description="Maaf, akun Anda tidak memiliki hak akses atau izin yang cukup untuk mengakses halaman ini."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="forbidden_page"
        instruction={{
          title: "Informasi Otorisasi",
          description: "Hak akses halaman ini dibatasi oleh kebijakan RBAC (Role-Based Access Control) tenant.",
          items: [
            { text: "Hubungi Administrator Sekolah jika Anda membutuhkan wewenang akses modul ini." },
            { text: "Gunakan tombol navigasi di bawah untuk kembali ke Dashboard utama." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="flex items-center justify-center p-4 sm:p-6 relative min-h-[50vh] w-full max-w-full min-w-0">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-lg relative z-10"
            >
              <Card className="rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
                <div className="p-6 sm:p-12 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12, delay: 0.2 }}
                    className="mb-6 sm:mb-8 flex justify-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full" />
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-500/40">
                        <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        <ShieldAlert className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 text-rose-100 bg-slate-900 rounded-full p-1.5 sm:p-2 border-4 border-white dark:border-slate-900" />
                      </div>
                    </div>
                  </motion.div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 tracking-tight uppercase">
                    Akses Dibatasi
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 sm:mb-8 max-w-xs mx-auto leading-relaxed">
                    Maaf, Anda tidak memiliki otoritas yang cukup untuk mengakses dokumen atau area ini.
                  </p>

                  {(reason || source) && (
                    <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-800 dark:text-rose-400">Detail Teknis</span>
                      </div>
                      <div className="space-y-3">
                        {reason && (
                          <div>
                            <p className="text-xs font-bold text-rose-900 dark:text-rose-300 break-words leading-relaxed">{reason}</p>
                          </div>
                        )}
                        {source && (
                          <div className="pt-2 border-t border-rose-100 dark:border-rose-900/20">
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Source Identity</span>
                            <code className="block mt-1 bg-rose-100 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl text-[10px] font-mono text-rose-800 dark:text-rose-200 break-all">
                              {source}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 sm:space-y-4">
                    <Button onClick={handleGoDashboard} className="w-full h-12 sm:h-14 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xl active:scale-95 transition-all gap-2 text-xs sm:text-sm">
                      <Home className="w-4 h-4 sm:w-5 sm:h-5" /> Kembali ke Beranda
                    </Button>
                    <div className="flex gap-2 sm:gap-3">
                      <Button variant="ghost" onClick={handleGoBack} className="flex-1 h-12 sm:h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all text-xs sm:text-sm">
                        <ArrowLeft className="w-4 h-4" /> Balik Arah
                      </Button>
                      <Button variant="ghost" onClick={handleOpenHelp} className="flex-1 h-12 sm:h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all text-xs sm:text-sm">
                        <LifeBuoy className="w-4 h-4" /> Hubungi Support
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 py-4 sm:py-6 text-center border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-300 dark:text-slate-600">
                    Error Protocol Code: 403_FORBIDDEN_ACCESS
                  </span>
                </div>
              </Card>
            </motion.div>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default ForbiddenPage;
