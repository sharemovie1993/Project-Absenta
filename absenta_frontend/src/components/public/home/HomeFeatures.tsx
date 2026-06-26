import React from 'react';
import { Smartphone, Zap, Users, ShieldCheck, BarChart3 } from 'lucide-react';
import { SectionCard } from '@/components/ui';

export const HomeFeatures: React.FC = () => {
  const features = [
    { icon: <Smartphone size={20} />, label: "Absensi Wajah & QR" },
    { icon: <Zap size={20} />, label: "Cetak Kartu Otomatis" },
    { icon: <Users size={20} />, label: "Manajemen Kesiswaan" },
    { icon: <ShieldCheck size={20} />, label: "Konseling & Disiplin" },
    { icon: <Users size={20} />, label: "Aplikasi Khusus Ortu" },
    { icon: <BarChart3 size={20} />, label: "Analitik Dashboard" }
  ];

  const stats = [
    { icon: <Users size={40} />, label: "Multitenant Ready", value: "100%", color: "blue" },
    { icon: <ShieldCheck size={40} />, label: "Uptime Guarantee", value: "99.9%", color: "green", delay: 1 },
    { icon: <Zap size={40} />, label: "Proses Absensi", value: "< 1s", color: "purple", delay: 1.5 },
    { icon: <Smartphone size={40} />, label: "Native PWA Support", value: "iOS/Android", color: "amber", delay: 0.5 }
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">Satu Platform,<br /><span className="text-blue-600">Fitur Tanpa Batas</span></h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
              Kami percaya teknologi terbaik harus dapat diakses oleh semua. Itulah mengapa kami menggratiskan akses ke SEMUA fitur utama dalam setiap paket langganan.
            </p>
            
            <SectionCard title="Fitur Unggulan" noPadding fullWidth className="bg-transparent border-none shadow-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-0">
                {features.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="text-blue-500">{item.icon}</div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="mt-12 p-6 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/20">
               <div className="text-2xl font-bold mb-2">Mulai dari Rp 100rb / bln</div>
               <p className="text-blue-100 text-sm">Transparansi harga total. Bayar hanya untuk jumlah siswa dan mode yang Anda gunakan.</p>
            </div>
          </div>
          
          <div className="lg:w-1/2 grid grid-cols-2 gap-4">
             <div className="space-y-4">
                {stats.slice(0, 2).map((stat, i) => (
                  <div key={i} className={`aspect-${i === 0 ? 'square' : '[4/5]'} rounded-xl bg-${stat.color}-500/20 flex flex-col items-center justify-center p-6 text-center animate-float`} style={{ animationDelay: `${stat.delay || 0}s` }}>
                     <div className={`text-${stat.color}-500 mb-4`}>{stat.icon}</div>
                     <div className="text-2xl font-bold">{stat.value}</div>
                     <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
             </div>
             <div className="space-y-4 pt-8">
                {stats.slice(2).map((stat, i) => (
                  <div key={i} className={`aspect-${i === 0 ? '[4/5]' : 'square'} rounded-xl bg-${stat.color}-500/20 flex flex-col items-center justify-center p-6 text-center animate-float`} style={{ animationDelay: `${stat.delay || 0}s` }}>
                     <div className={`text-${stat.color}-500 mb-4`}>{stat.icon}</div>
                     <div className="text-2xl font-bold">{stat.value}</div>
                     <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};
