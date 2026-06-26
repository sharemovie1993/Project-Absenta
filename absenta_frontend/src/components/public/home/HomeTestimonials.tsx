import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Zap } from 'lucide-react';

export const HomeTestimonials: React.FC = () => {
  const testimonials = [
    { name: "Ibu Rina S.", role: "Wali Kelas SMP", quote: "Akhirnya ada sistem yang tidak membingungkan guru. Absensi selesai dalam hitungan detik.", initial: "R" },
    { name: "Pak Ridwan", role: "Kepala IT SMK", quote: "Integrasi sistem akademik dan gerbangnya luar biasa stabil. Sangat membantu audit internal.", initial: "P" },
    { name: "Bpk. Heru", role: "Yayasan Pendidikan", quote: "Investasi fitur terbaik dengan biaya yang masuk akal bagi sekolah rintisan seperti kami.", initial: "B" }
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="container mx-auto px-4">
         <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Dipercaya oleh Pengelola Pendidikan</h2>
            <div className="flex items-center justify-center gap-1 text-amber-500">
               {[1,2,3,4,5].map(i => <Heart key={i} size={16} fill="currentColor" />)}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative"
              >
                 <div className="absolute top-8 right-8 text-blue-500/20">
                    <Zap size={40} />
                 </div>
                 <blockquote className="text-slate-700 dark:text-slate-300 mb-8 leading-relaxed italic">
                    “{t.quote}”
                 </blockquote>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 shadow-sm">
                       {t.initial}
                    </div>
                    <div>
                       <div className="font-bold">{t.name}</div>
                       <div className="text-xs text-slate-500 uppercase tracking-widest">{t.role}</div>
                    </div>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>
    </section>
  );
};
