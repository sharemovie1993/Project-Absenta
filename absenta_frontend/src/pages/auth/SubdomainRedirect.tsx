import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { ArrowRight, Bookmark, ShieldCheck, Copy, Globe, Share2, MousePointer2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/Toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const SubdomainRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const state = location.state as { redirectUrl?: string; tenantName?: string; tenantDomain?: string } | undefined;

  const envLanding = (import.meta as any).env?.VITE_PUBLIC_SITE_URL || (import.meta as any).env?.VITE_LANDING_URL || '';
  const redirectUrl = state?.redirectUrl || String(envLanding || '').trim() || (typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:3001');
  const tenantName = state?.tenantName || 'Sekolah Anda';

  const handleCopy = () => {
    navigator.clipboard.writeText(redirectUrl);
    showToast('Alamat subdomain berhasil disalin!', 'success');
  };

  const handleNavigate = () => {
    window.location.href = redirectUrl;
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-100">
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
          className="max-w-4xl w-full relative z-10"
        >
          <Card className="rounded-[3rem] overflow-hidden border-0 shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 flex flex-col md:flex-row">
            {/* Left Panel - Branding & Info */}
            <div className="bg-slate-900 p-8 md:p-14 text-white md:w-5/12 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center mb-8 border border-white/10 shadow-xl">
                   <Globe className="w-7 h-7 text-blue-400" />
                </div>
                
                <h2 className="text-3xl font-black mb-4 leading-tight tracking-tight">Portal Khusus Ditemukan.</h2>
                <h3 className="text-sm font-black text-blue-400 mb-8 uppercase tracking-[0.2em]">{tenantName}</h3>
                
                <p className="text-slate-400 leading-relaxed mb-10 text-sm font-medium">
                  Informasi login Anda terdeteksi berada di subdomain terenkripsi milik <span className="text-white">{tenantName}</span>. Untuk alasan keamanan, Anda telah diarahkan ke gerbang resmi sekolah.
                </p>

                <div className="space-y-4">
                   <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-300">Simpan URL ini sebagai Bookmark</span>
                   </div>
                   <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                      <Share2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300">Bagikan ke rekan guru/admin</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Action Area */}
            <div className="p-8 md:p-14 md:w-7/12 flex flex-col justify-center bg-white dark:bg-slate-900">
               <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gerbang Resmi Teridentifikasi</span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Alamat Login Anda</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Salin atau langsung akses portal sekolah Anda di bawah ini.</p>
               </div>

               <div className="space-y-8">
                  <div className="space-y-2">
                     <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 transition-colors hover:border-blue-100">
                        <div className="flex-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 break-all select-all">
                           {redirectUrl}
                        </div>
                        <button 
                           onClick={handleCopy}
                           className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95"
                        >
                           <Copy className="w-4 h-4" />
                        </button>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                     <Button 
                        onClick={handleNavigate}
                        variant="auth"
                        size="auth"
                     >
                        Lanjutkan ke Halaman Login <ArrowRight className="w-5 h-5 ml-auto" />
                     </Button>
                  </div>

                  <div className="pt-8 border-t border-slate-50 dark:border-slate-800 text-center">
                     <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Identitas Terverifikasi Aman</span>
                     </div>
                  </div>
               </div>
            </div>
          </Card>
        </motion.div>
      </main>

      <Footer />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default SubdomainRedirect;
