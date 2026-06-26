import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui';

interface HomeHeroProps {
  appName: string;
  primaryColor: string;
  onLearnMore: () => void;
  onPricing: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ 
  appName, 
  primaryColor, 
  onLearnMore, 
  onPricing 
}) => {
  return (
    <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-mesh">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-purple-400/10 rounded-full blur-[100px]" />
      </div>

      <div className="container relative mx-auto text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-8"
        >
          <Sparkles size={16} />
          <span>Platform Manajemen Sekolah Masa Depan</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
        >
          Satu Aplikasi untuk <br />
          <span className="text-gradient-primary">Semua Skala Sekolah</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed"
        >
          Transformasi digital pendidikan dimulai di sini. Solusi terpadu untuk <strong>Absensi, Akademik, dan Kedisiplinan</strong> yang ramah pengguna dan terjangkau.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            variant="primary"
            onClick={onLearnMore}
            className="w-full sm:w-auto px-8 py-4 text-lg rounded-xl shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group"
            style={{ backgroundColor: primaryColor }}
          >
            Pelajari Lebih Lanjut
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            variant="outline"
            onClick={onPricing}
            className="w-full sm:w-auto px-8 py-4 text-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all"
          >
            Lihat Harga
          </Button>
        </motion.div>

        {/* Hero Visual Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="mt-16 lg:mt-24 relative max-w-5xl mx-auto px-4"
        >
           <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-white dark:bg-slate-900">
              <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-950 flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                 <div className="relative z-10 text-center p-8">
                    <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto mb-4 animate-float flex items-center justify-center text-white shadow-lg">
                       <Zap size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Interface Premium & Intuitif</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">Dirancang untuk kecepatan dan kemudahan akses data sekolah Anda.</p>
                 </div>
                 
                 {/* Floating elements */}
                 <div className="absolute top-10 right-10 w-48 h-24 glass-morphism rounded-xl animate-float [animation-delay:1s] flex items-center p-4 gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                       <CheckCircle2 size={24} />
                    </div>
                    <div>
                       <div className="text-[10px] text-slate-500">Absensi Berhasil</div>
                       <div className="text-xs font-bold">{appName} Demo</div>
                    </div>
                 </div>

                 <div className="absolute bottom-10 left-10 w-48 h-24 glass-morphism rounded-xl animate-float [animation-delay:2s] flex items-center p-4 gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                       <Users size={24} />
                    </div>
                    <div>
                       <div className="text-[10px] text-slate-500">Siswa Hadir</div>
                       <div className="text-xs font-bold">1,240 Siswa</div>
                    </div>
                 </div>
              </div>
           </div>
        </motion.div>
      </div>
    </section>
  );
};
