import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { FileQuestion, ArrowLeft, Home, Search, Compass } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';

const NotFoundPage: React.FC = () => {
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
                  initial={{ rotate: -20, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.2 }}
                  className="mb-8 flex justify-center"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 blur-2xl rounded-full" />
                      <div className="relative w-24 h-24 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-2xl">
                         <Search className="w-10 h-10 text-white dark:text-slate-900" />
                         <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white dark:border-slate-900 font-black text-[10px] text-white">404</div>
                      </div>
                   </div>
                </motion.div>

                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter italic uppercase">Halaman Hilang!</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 max-w-xs mx-auto leading-relaxed">
                   Maaf, robot kami tidak dapat menemukan halaman yang Anda cari. Mungkin telah dipindahkan atau dihapus.
                </p>

                <div className="space-y-4">
                   <Button onClick={() => navigate('/dashboard')} className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2">
                      <Home className="w-5 h-5" /> Ke Dashboard Utama
                   </Button>
                   <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => navigate(-1)} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <ArrowLeft className="w-4 h-4" /> Kembali
                      </Button>
                      <Button variant="ghost" onClick={() => navigate('/home')} className="flex-1 h-14 rounded-xl font-bold text-slate-500 hover:text-slate-900 gap-2 border-2 border-transparent hover:border-slate-100 transition-all">
                         <Compass className="w-4 h-4" /> Cari Solusi
                      </Button>
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800/50 py-6 text-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">Error Protocol Code: 404_NOT_FOUND</span>
             </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
