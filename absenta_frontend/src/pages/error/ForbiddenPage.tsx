import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { ShieldAlert, AlertTriangle, ArrowLeft, Home, Lock, LifeBuoy } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { MAIN_DOMAIN } from '@/config/env-config';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const reason = searchParams.get('reason');
  const source = searchParams.get('source');

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-6 pt-24 pb-20 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mesh rounded-full blur-3xl" />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-lg relative z-10"
        >
          <Card className="rounded-[3rem] overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
             <div className="p-8 sm:p-12 text-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="mb-8 flex justify-center"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                      <div className="relative w-24 h-24 rounded-xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-500/40">
                         <Lock className="w-10 h-10 text-white" />
                         <ShieldAlert className="absolute -bottom-2 -right-2 w-10 h-10 text-red-100 bg-slate-900 rounded-full p-2 border-4 border-white dark:border-slate-900" />
                      </div>
                   </div>
                </motion.div>

                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase">Akses Dibatasi</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-xs mx-auto leading-relaxed">
                   Maaf, Anda tidak memiliki otoritas yang cukup untuk mengakses dokumen atau area ini.
                </p>

                {(reason || source) && (
                  <div className="mb-10 p-6 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-left">
                     <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-800 dark:text-red-400">Detail Teknis</span>
                     </div>
                     <div className="space-y-4">
                        {reason && (
                           <div>
                              <p className="text-xs font-bold text-red-900 dark:text-red-300 break-words leading-relaxed">{reason}</p>
                           </div>
                        )}
                        {source && (
                           <div className="pt-2 border-t border-red-100 dark:border-red-900/20">
                              <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter">Source Identity</span>
                              <code className="block mt-1 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-xl text-[10px] font-mono text-red-800 dark:text-red-200 break-all">
                                 {source}
                              </code>
                           </div>
                        )}
                     </div>
                  </div>
                )}

                <div className="space-y-4">
                   <Button onClick={() => navigate('/dashboard')} className="w-full h-14 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-xl active:scale-95 transition-all gap-2">
                      <Home className="w-5 h-5" /> Kembali ke Beranda
                   </Button>
                   <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => navigate(-1)} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <ArrowLeft className="w-4 h-4" /> Balik Arah
                      </Button>
                      <Button variant="ghost" onClick={() => window.open(`https://help.${MAIN_DOMAIN}`, '_blank')} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <LifeBuoy className="w-4 h-4" /> Hubungi Support
                      </Button>
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800/50 py-6 text-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">Error Protocol Code: 403_FORBIDDEN_ACCESS</span>
             </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default ForbiddenPage;
