import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BarChart3, CheckCircle2 } from 'lucide-react';
import { SectionCard } from '@/components/ui';

export const HomeServiceModes: React.FC = () => {
  const modes = [
    {
      title: "Mode SIMPLE",
      subtitle: "SIMPLE MODE",
      icon: Clock,
      bgIcon: <Clock size={160} />,
      colorClass: "green",
      description: "Efisien dan cepat. Siswa cukup melakukan tap satu kali saat datang dan pulang. Cocok untuk SD, SMP, dan lingkungan yang mengutamakan kecepatan pencatatan harian.",
      features: [
        "Antrian gerbang super cepat",
        "Notifikasi WhatsApp Real-time",
        "Rekap bulanan otomatis (PDF/Excel)",
        "Hemat bandwidth & resource"
      ]
    },
    {
      title: "Mode MULTI-SESI",
      subtitle: "ADVANCED MODE",
      icon: BarChart3,
      bgIcon: <BarChart3 size={160} />,
      colorClass: "blue",
      description: "Kontrol penuh setiap jam pelajaran. Ideal untuk SMA/SMK dengan sistem moving class atau Boarding School yang membutuhkan audit kehadiran per Mapel.",
      features: [
        "Monitoring kehadiran per Jam Pelajaran",
        "Laporan kinerja mengajar Guru",
        "Sistem deteksi bolos otomatis",
        "Integrasi Jurnal Mengajar Class-by-Class"
      ]
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pilih Mode Absensi Anda</h2>
          <p className="text-slate-600 dark:text-slate-400">Sesuaikan sistem dengan karakteristik sekolah Anda, dari SD hingga SMA/SMK.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modes.map((mode, index) => (
            <SectionCard 
              key={index}
              title={mode.subtitle}
              icon={mode.icon}
              noPadding
              fullWidth
              className="group hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-900 overflow-hidden"
            >
              <div className="p-8 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  {mode.bgIcon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{mode.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  {mode.description}
                </p>
                <ul className="space-y-3">
                  {mode.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 size={16} className={`text-${mode.colorClass}-500`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    </section>
  );
};
