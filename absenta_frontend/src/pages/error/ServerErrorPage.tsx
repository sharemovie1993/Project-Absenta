import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, SectionCard } from '@/components/ui';
import { ServerCrash, RefreshCw, Home, LifeBuoy, Wrench, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { MAIN_DOMAIN } from '@/config/env-config';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

export const ServerErrorPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLoading = false;
  const isEmpty = false;

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/dashboard' },
    { label: '500 Gangguan Server' }
  ], []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries();
    navigate(0);
  }, [queryClient, navigate]);

  const handleGoDashboard = useCallback(() => navigate('/dashboard'), [navigate]);
  const handleOpenStatus = useCallback(() => {
    window.open(`https://status.${MAIN_DOMAIN}`, '_blank');
  }, []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="500 - Gangguan Server Internal"
        description="Maaf, mesin kami sedang mengalami lonjakan beban atau pemeliharaan sistem rutin."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="server_error_page"
        instruction={{
          title: "Informasi Gangguan Teknis",
          description: "Server pusat sedang memulihkan koneksi database atau merefresh layanan API.",
          items: [
            { text: "Klik tombol Coba Muat Ulang untuk meminta sinkronisasi ulang data." },
            { text: "Jika kendala berlanjut, pantau status server atau hubungi administrator." }
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
                    initial={{ y: -10 }}
                    animate={{ y: 0 }}
                    transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                    className="mb-6 sm:mb-8 flex justify-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full" />
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900 dark:bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-500/20">
                        <ServerCrash className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        <Wrench className="absolute -top-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 text-blue-400 bg-slate-900 rounded-lg p-1 sm:p-1.5 border-2 border-white dark:border-slate-900" />
                      </div>
                    </div>
                  </motion.div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 tracking-tight uppercase">
                    Sistem Terkendala
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 sm:mb-8 max-w-xs mx-auto leading-relaxed">
                    Maaf, mesin kami sedang mengalami lonjakan beban atau gangguan teknis. Tim kami sudah mendapatkan notifikasi.
                  </p>

                  <div className="space-y-3 sm:space-y-4">
                    <Button onClick={handleRefresh} className="w-full h-12 sm:h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2 text-xs sm:text-sm">
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /> Coba Muat Ulang
                    </Button>
                    <div className="flex gap-2 sm:gap-3">
                      <Button variant="ghost" onClick={handleGoDashboard} className="flex-1 h-12 sm:h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all text-xs sm:text-sm">
                        <Home className="w-4 h-4" /> Dashboard
                      </Button>
                      <Button variant="ghost" onClick={handleOpenStatus} className="flex-1 h-12 sm:h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all text-xs sm:text-sm">
                        <LifeBuoy className="w-4 h-4" /> System Stats
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-2 sm:gap-3">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Incident Status: 500_INTERNAL_SERVER_ERROR
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 py-4 sm:py-6 text-center border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-300 dark:text-slate-600">
                    Error Protocol Code: 500_SERVER_EXCEPTION
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

export default ServerErrorPage;
