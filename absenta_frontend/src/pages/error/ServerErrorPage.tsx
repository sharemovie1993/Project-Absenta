import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { ServerCrash, RefreshCw, Home, LifeBuoy, Wrench, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { MAIN_DOMAIN } from '@/config/env-config';

const ServerErrorPage: React.FC = () => {
  const navigate = useNavigate();

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
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                  transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                  className="mb-8 flex justify-center"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                      <div className="relative w-24 h-24 rounded-xl bg-slate-900 dark:bg-red-600 flex items-center justify-center shadow-xl shadow-red-500/20">
                         <ServerCrash className="w-10 h-10 text-white" />
                         <Wrench className="absolute -top-1 -right-1 w-8 h-8 text-blue-400 bg-slate-900 rounded-lg p-1.5 border-2 border-white dark:border-slate-900" />
                      </div>
                   </div>
                </motion.div>

                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight italic uppercase">Sistem Terkendala</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 max-w-xs mx-auto leading-relaxed">
                   Maaf, mesin kami sedang mengalami lonjakan beban atau gangguan teknis. Tim kami sudah mendapatkan notifikasi.
                </p>

                <div className="space-y-4">
                   <Button onClick={() => window.location.reload()} className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2">
                      <RefreshCw className="w-5 h-5" /> Coba Muat Ulang
                   </Button>
                   <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <Home className="w-4 h-4" /> Dashboard
                      </Button>
                      <Button variant="ghost" onClick={() => window.open(`https://status.${MAIN_DOMAIN}`, '_blank')} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <LifeBuoy className="w-4 h-4" /> System Stats
                      </Button>
                   </div>
                </div>

                <div className="mt-10 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-3">
                   <AlertCircle className="w-4 h-4 text-slate-400" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Automated Incident Ticket #SRV_500_{Date.now().toString().slice(-6)}</span>
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800/50 py-6 text-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">Error Protocol Code: 500_INTERNAL_SERVER_ERROR</span>
             </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default ServerErrorPage;
