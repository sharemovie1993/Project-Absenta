import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, CreditCard, Wallet, Fingerprint, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../ui';

export default function MarketplacePromoWidget() {
  const navigate = useNavigate();

  const services = [
    {
      title: 'Absensi Biometrik',
      desc: 'Fingerprint & Face Recognition.',
      icon: <Fingerprint className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50 border-blue-100'
    },
    {
      title: 'Keuangan & SPP',
      desc: 'Penagihan otomatis & Dashboard.',
      icon: <Wallet className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-100'
    },
    {
      title: 'Koperasi & Kantin',
      desc: 'Transaksi cashless siswa.',
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 border-amber-100'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-500/5 overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
      
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-4">
            <Sparkles className="w-3 h-3" />
            Ecosystem Marketplace
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
            Lengkapi Kebutuhan <span className="text-blue-600">Sekolah Digital</span> Anda
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-md">
            Pilih dari berbagai modul tambahan yang dirancang khusus untuk meningkatkan efisiensi operasional dan akuntabilitas sekolah Anda.
          </p>
          <Button 
            onClick={() => navigate('/service-center?tab=catalog')}
            className="rounded-xl px-6 py-3 h-auto font-bold shadow-lg shadow-blue-500/20"
          >
            Lihat Katalog Layanan <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 w-full lg:w-72">
          {services.map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 5 }}
              className={`flex items-center gap-4 p-4 rounded-xl border ${s.color} dark:bg-slate-800/50 dark:border-slate-800 cursor-pointer transition-all`}
              onClick={() => navigate('/service-center?tab=catalog')}
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
                {s.icon}
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
