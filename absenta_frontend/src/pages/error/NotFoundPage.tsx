import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { ArrowLeft, Home, Search, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { formatDate } from '../../utils/layoutUtils';

const NotFoundPage: React.FC = React.memo(() => {
  const navigate = useNavigate();

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } }
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/dashboard' },
    { label: '404 Tidak Ditemukan' }
  ], []);

  const handleGoDashboard = useCallback(() => navigate('/dashboard'), [navigate]);
  const handleGoBack = useCallback(() => navigate(-1), [navigate]);
  const handleGoHome = useCallback(() => navigate('/home'), [navigate]);

  return (
    <AcademicPageLayout
      title="404 - Halaman Tidak Ditemukan"
      description="Maaf, halaman yang Anda cari tidak dapat ditemukan di server Absenta."
      hardeningModuleKey="not_found_page"
      instruction={{
        title: "Informasi Kesalahan",
        description: "Halaman yang dituju mungkin telah dipindahkan, diubah jalurnya, atau dihapus dari sistem.",
        items: [
          { text: "Periksa kembali URL yang Anda masukkan di address bar peramban." },
          { text: "Gunakan tombol navigasi di bawah untuk kembali ke Dashboard utama." }
        ]
      }}
      breadcrumbs={breadcrumbs}
    >
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
                  initial={{ rotate: -20, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.2 }}
                  className="mb-6 sm:mb-8 flex justify-center"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 blur-2xl rounded-full" />
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-2xl">
                         <Search className="w-8 h-8 sm:w-10 sm:h-10 text-white dark:text-slate-900" />
                         <div className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white dark:border-slate-900 font-black text-[10px] text-white">404</div>
                      </div>
                   </div>
                </motion.div>

                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3 sm:mb-4 tracking-tighter italic uppercase">Halaman Hilang!</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 sm:mb-10 max-w-xs mx-auto leading-relaxed">
                   Maaf, robot kami tidak dapat menemukan tautan yang dituju. Mungkin telah dipindahkan atau dihapus.
                </p>

                <div className="space-y-3 sm:space-y-4">
                   <Button onClick={handleGoDashboard} className="w-full h-12 sm:h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2 text-xs sm:text-sm">
                      <Home className="w-4 h-4 sm:w-5 sm:h-5" /> Ke Halaman Beranda
                   </Button>
                   <div className="flex gap-2 sm:gap-3">
                      <Button variant="ghost" onClick={handleGoBack} className="flex-1 h-12 sm:h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all text-xs sm:text-sm">
                         <ArrowLeft className="w-4 h-4" /> Kembali
                      </Button>
                      <Button variant="ghost" onClick={handleGoHome} className="flex-1 h-12 sm:h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all text-xs sm:text-sm">
                         <Compass className="w-4 h-4" /> Cari Solusi
                      </Button>
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800/50 py-4 sm:py-6 text-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-300 dark:text-slate-600">Error Protocol Code: 404_NOT_FOUND</span>
             </div>
          </Card>
        </motion.div>
      </div>
    </AcademicPageLayout>
  );
});

export default NotFoundPage;
