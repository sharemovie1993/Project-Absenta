import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { 
  Check, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  MessageSquare,
  BookOpen,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';

function LearnMoreContent() {
  const { systemConfig } = useSystemConfig();
  
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  }), []);

  const features = useMemo(() => [
    {
      id: 'absensi',
      icon: <Clock size={32} />,
      title: "Sistem Absensi Cerdas",
      desc: "Kami menyediakan dua mode absensi utama yang dirancang untuk kebutuhan sekolah yang berbeda-beda, mulai dari SD hingga SMK.",
      color: "bg-blue-600",
      borderHover: "hover:border-blue-200",
      items: [
        { title: "Mode SIMPLE", desc: "Scan cepat (QR/RFID/Wajah) di gerbang sekolah untuk monitoring kedatangan/kepulangan." },
        { title: "Mode MULTI-SESI", desc: "Absensi setiap pergantian jam pelajaran, ideal untuk sistem moving class atau boarding." },
        { title: "Selfie Attendance", desc: "Absensi berbasis lokasi (Geofencing) dengan verifikasi wajah untuk guru & staff." }
      ]
    },
    {
      id: 'akademik',
      icon: <UserCheck size={32} />,
      title: "Jurnal & Manajemen Akademik",
      desc: "Pantau progres Kegiatan Belajar Mengajar (KBM) secara transparan. Tidak ada lagi catatan jurnal kertas yang tercecer.",
      color: "bg-purple-600",
      borderHover: "hover:border-purple-200",
      items: [
        { title: "Jurnal Mengajar", desc: "Guru mencatat materi, progres bab, dan catatan khusus kelas langsung dari HP." },
        { title: "Audit Jam Mengajar", desc: "Rekap otomatis jam mengajar guru untuk keperluan penggajian atau sertifikasi." },
        { title: "E-Rapor & Nilai", desc: "Input nilai harian dan rekap pencapaian akademik siswa secara digital." }
      ]
    },
    {
      id: 'disiplin',
      icon: <ShieldAlert size={32} />,
      title: "Kedisiplinan & Poin Pelanggaran",
      desc: "Sistem poin yang transparan membantu guru BK memantau perilaku siswa secara objektif dan sistematis.",
      color: "bg-red-600",
      borderHover: "hover:border-red-200",
      items: [
        { title: "Log Pelanggaran", desc: "Guru dapat mencatat pelanggaran secara instan dengan bukti foto di lapangan." },
        { title: "Sistem Poin (Reward/Punish)", desc: "Akumulasi poin otomatis yang menentukan sanksi atau penghargaan siswa." },
        { title: "Surat Panggilan Ortu", desc: "Otomatisasi cetak surat panggilan atau peringatan berdasarkan ambang batas poin." }
      ]
    },
    {
      id: 'komunikasi',
      icon: <MessageSquare size={32} />,
      title: "Komunikasi & Notifikasi",
      desc: "Menghilangkan jarak antara sekolah dan orang tua. Orang tua merasa tenang karena tahu keberadaan anaknya.",
      color: "bg-green-600",
      borderHover: "hover:border-green-200",
      items: [
        { title: "WhatsApp Gateway", desc: "Notifikasi kehadiran real-time terkirim ke WhatsApp orang tua saat siswa tap." },
        { title: "Aplikasi Parent Mobile", desc: "Aplikasi khusus orang tua untuk memantau absensi, izin, dan pengumuman sekolah." },
        { title: "Pengumuman Massal", desc: "Kirim pesan informasi ke seluruh orang tua dalam satu klik tanpa biaya SMS." }
      ]
    }
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Beranda', path: '/' },
    { label: 'Pelajari Fitur' }
  ], []);

  const handleGoToPricing = useCallback(() => {
    window.open('/pricing', '_self');
  }, []);

  const handleConsultation = useCallback(() => {
    window.open('https://wa.me/6281222333444', '_blank');
  }, []);

  return (
    <AcademicPageLayout
      title="Teknologi Cerdas untuk Ekosistem Sekolah Digital"
      description="Jelajahi bagaimana kami mengotomatisasi administrasi, meningkatkan kedisiplinan, dan mempererat komunikasi antara sekolah dan orang tua."
      hardeningModuleKey="learn_more_page"
      instruction={{
        title: 'Panduan Fitur Absenta',
        description: 'Halaman ini memberikan gambaran mendalam mengenai kapabilitas platform Absenta dalam membantu digitalisasi sekolah Anda.',
        items: [
          { text: 'Pelajari bagaimana Absenta membantu efisiensi sekolah.' }
        ]
      }}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-24 pb-24">
        {/* 1. Feature Hero Badge */}
        <div className="flex justify-center -mt-8 mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-widest uppercase"
          >
            <BookOpen size={14} className="fill-current" />
            <span>Platform Capabilities</span>
          </motion.div>
        </div>

        {/* 2. Detailed Capabilities Grid */}
        <section>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-12"
          >
            {features?.map((feature) => (
              <motion.div 
                key={feature.id}
                variants={itemVariants} 
                className="group h-full"
              >
                <SectionCard 
                  title={feature.title} 
                  icon={() => feature.icon} 
                  fullWidth
                  className={`h-full border-2 border-transparent transition-all duration-500 ${feature.borderHover} rounded-[3rem] overflow-hidden`}
                >
                  <div className="p-4">
                    <div className={`w-16 h-16 rounded-2xl ${feature.color} flex items-center justify-center text-white shadow-xl mb-8 group-hover:scale-110 transition-transform`}>
                      {feature.icon}
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                      {feature.desc}
                    </p>
                    <ul className="space-y-5">
                      {feature.items?.map((item, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check size={14} className="text-blue-600" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.title}</div>
                            <div className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </SectionCard>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* 3. Immersive CTA */}
        <section className="py-24 bg-mesh rounded-[4rem] overflow-hidden relative border border-slate-100 dark:border-slate-800 shadow-2xl shadow-blue-500/5">
          <div className="relative text-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto space-y-10"
            >
              <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter">Mulai Transformasi <br /> <span className="text-blue-600">Sekolah Masa Depan</span></h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 font-medium">
                Uji coba semua fitur di atas secara gratis selama 14 hari. <br className="hidden md:block" />
                Buktikan bagaimana kami mempermudah hidup ribuan guru di seluruh Indonesia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={handleGoToPricing}
                  className="rounded-2xl px-12 py-7 h-auto text-sm font-black uppercase tracking-widest bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 shadow-2xl shadow-slate-500/20"
                >
                  <span>Lihat Paket Harga</span>
                  <ArrowRight size={20} className="ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg" 
                  onClick={handleConsultation}
                  className="rounded-2xl px-12 py-7 h-auto text-sm font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-800"
                >
                  <span>Konsultasi Gratis</span>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </AcademicPageLayout>
  );
}

export default function LearnMorePage() {
  return (
    <LearnMoreContent />
  );
}

