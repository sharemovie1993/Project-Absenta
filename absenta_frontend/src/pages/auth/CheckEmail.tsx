import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { Mail, Clock, CreditCard, ArrowRight, ShieldCheck, CheckCircle2, Inbox, Info, Home, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';

const CheckEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const state = location?.state || {};
  const email = state.email || 'email@anda.com';
  const isTrial = state.isTrial;
  const planName = state.planName || 'Pro';

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-6 pt-14 pb-14 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mesh rounded-full blur-3xl" />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-xl relative z-10"
        >
          <Card className="rounded-3xl overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
             <div className="p-6 sm:p-10">
                <div className="flex flex-col items-center text-center">
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ type: "spring", damping: 12, delay: 0.2 }}
                     className="mb-8"
                   >
                      <div className="relative">
                         <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                         <div className="relative w-24 h-24 rounded-xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/40">
                            <Mail className="w-10 h-10 text-white animate-bounce-subtle" />
                         </div>
                      </div>
                   </motion.div>

                   <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Cek Email Anda</h1>
                   <p className="text-slate-500 dark:text-slate-400 font-medium mb-6 max-w-sm leading-relaxed text-sm">
                      Kami telah mengirimkan tautan verifikasi resmi ke <br />
                      <span className="text-blue-600 dark:text-blue-400 font-bold break-all">{email}</span>
                   </p>

                   {/* Status Badge */}
                   <div className={`w-full p-4 rounded-xl mb-6 text-left flex items-start gap-4 border ${isTrial ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'}`}>
                      <div className={`p-2 rounded-xl ${isTrial ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'} shrink-0`}>
                         {isTrial ? <Clock className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                      </div>
                      <div>
                         <h4 className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isTrial ? 'text-emerald-800 dark:text-emerald-400' : 'text-blue-800 dark:text-blue-400'}`}>
                           {isTrial ? 'Masa Uji Coba' : 'Menunggu Aktivasi'}
                         </h4>
                         <p className={`text-xs font-medium ${isTrial ? 'text-emerald-700/80 dark:text-emerald-400/80' : 'text-blue-700/80 dark:text-blue-400/80'}`}>
                           {isTrial 
                             ? `Paket ${planName} akan aktif otomatis.` 
                             : `Aktifkan paket ${planName} sekarang.`
                           }
                         </p>
                      </div>
                   </div>

                   {/* Steps */}
                   <div className="w-full space-y-4 mb-8 text-left">
                      {[
                        { t: "Cari Email dari Absenta", d: "Cek folder Inbox atau Spam untuk pengirim 'Absenta Support'." },
                        { t: "Klik Tombol Verifikasi", d: "Tautan unik ini akan mengaktifkan kredensial akses Anda." },
                        { t: "Mulai Kelola Sekolah", d: "Sistem akan mengarahkan Anda ke dashboard operasional." }
                      ].map((step, i) => (
                        <div key={i} className="flex gap-4 group">
                           <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center text-xs font-black group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                              {i + 1}
                           </div>
                           <div className="flex-1 border-b border-slate-50 dark:border-slate-800 pb-4 last:border-0">
                              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{step.t}</h5>
                              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-medium">{step.d}</p>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="w-full space-y-4">
                      <Button 
                         variant="auth"
                         size="auth"
                         onClick={() => navigate('/login')}
                      >
                         Ke Halaman Login <ArrowRight className="w-5 h-5 ml-auto" />
                      </Button>
                      
                      <div className="flex items-center justify-center gap-6">
                         <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                            <Home className="w-3.5 h-3.5" /> Beranda
                         </button>
                         <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                         <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-2 transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" /> Kirim Ulang Email
                         </button>
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800/50 py-6 text-center border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">Protokol Keamanan Aktif</span>
             </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckEmail;
