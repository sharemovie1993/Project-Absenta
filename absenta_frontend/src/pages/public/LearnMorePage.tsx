import React from 'react';
import { motion } from 'framer-motion';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { 
  Check, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  BarChart3, 
  MessageSquare,
  Sparkles,
  Zap,
  Smartphone,
  BookOpen,
  Users,
  Database,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui';

export const LearnMorePage: React.FC = () => {
  const { systemConfig } = useSystemConfig();
  const primaryColor = systemConfig?.primary_color || '#2563eb';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      
      <main className="flex-grow">
        {/* 1. Feature Hero */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-mesh">
          <div className="container relative mx-auto px-4">
             <div className="max-w-4xl mx-auto text-center">
                <motion.div
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold mb-8 tracking-wider uppercase"
                >
                   <BookOpen size={14} className="fill-current" />
                   <span>Platform Capabilities</span>
                </motion.div>

                <motion.h1 
                   initial={{ opacity: 0, y: 30 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-8"
                >
                   Teknologi Cerdas untuk <br />
                   <span className="text-gradient-primary">Ekosistem Sekolah Digital</span>
                </motion.h1>

                <motion.p 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.1 }}
                   className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto"
                >
                   Jelajahi bagaimana kami mengotomatisasi administrasi, meningkatkan kedisiplinan, dan mempererat komunikasi antara sekolah dan orang tua.
                </motion.p>
             </div>
          </div>
        </section>

        {/* 2. Detailed Capabilities Grid */}
        <section className="py-24 bg-white dark:bg-slate-950">
           <div className="container mx-auto px-4">
              <motion.div 
                 variants={containerVariants}
                 initial="hidden"
                 whileInView="visible"
                 viewport={{ once: true }}
                 className="grid grid-cols-1 md:grid-cols-2 gap-12"
              >
                 {/* Feature 1: Absensi */}
                 <motion.div variants={itemVariants} className="group p-8 md:p-12 rounded-[3rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all">
                    <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg mb-8 group-hover:scale-110 transition-transform">
                       <Clock size={32} />
                    </div>
                    <h3 className="text-2xl font-extrabold mb-6">Sistem Absensi Cerdas</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                       Kami menyediakan dua mode absensi utama yang dirancang untuk kebutuhan sekolah yang berbeda-beda, mulai dari SD hingga SMK.
                    </p>
                    <ul className="space-y-4">
                       {[
                          { title: "Mode SIMPLE", desc: "Scan cepat (QR/RFID/Wajah) di gerbang sekolah untuk monitoring kedatangan/kepulangan." },
                          { title: "Mode MULTI-SESI", desc: "Absensi setiap pergantian jam pelajaran, ideal untuk sistem moving class atau boarding." },
                          { title: "Selfie Attendance", desc: "Absensi berbasis lokasi (Geofencing) dengan verifikasi wajah untuk guru & staff." }
                       ].map((item, i) => (
                          <li key={i} className="flex items-start gap-4">
                             <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={14} className="text-blue-600" />
                             </div>
                             <div>
                                <span className="font-bold text-slate-900 dark:text-white">{item.title}:</span>
                                <span className="text-sm text-slate-500 ml-1">{item.desc}</span>
                             </div>
                          </li>
                       ))}
                    </ul>
                 </motion.div>

                 {/* Feature 2: Akademik */}
                 <motion.div variants={itemVariants} className="group p-8 md:p-12 rounded-[3rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-purple-200 transition-all">
                    <div className="w-16 h-16 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg mb-8 group-hover:scale-110 transition-transform">
                       <UserCheck size={32} />
                    </div>
                    <h3 className="text-2xl font-extrabold mb-6">Jurnal & Manajemen Akademik</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                       Pantau progres Kegiatan Belajar Mengajar (KBM) secara transparan. Tidak ada lagi catatan jurnal kertas yang tercecer.
                    </p>
                    <ul className="space-y-4">
                       {[
                          { title: "Jurnal Mengajar", desc: "Guru mencatat materi, progres bab, dan catatan khusus kelas langsung dari HP." },
                          { title: "Audit Jam Mengajar", desc: "Rekap otomatis jam mengajar guru untuk keperluan penggajian atau sertifikasi." },
                          { title: "E-Rapor & Nilai", desc: "Input nilai harian dan rekap pencapaian akademik siswa secara digital." }
                       ].map((item, i) => (
                          <li key={i} className="flex items-start gap-4">
                             <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={14} className="text-purple-600" />
                             </div>
                             <div>
                                <span className="font-bold text-slate-900 dark:text-white">{item.title}:</span>
                                <span className="text-sm text-slate-500 ml-1">{item.desc}</span>
                             </div>
                          </li>
                       ))}
                    </ul>
                 </motion.div>

                 {/* Feature 3: Kedisiplinan */}
                 <motion.div variants={itemVariants} className="group p-8 md:p-12 rounded-[3rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-red-200 transition-all">
                    <div className="w-16 h-16 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg mb-8 group-hover:scale-110 transition-transform">
                       <ShieldAlert size={32} />
                    </div>
                    <h3 className="text-2xl font-extrabold mb-6">Kedisiplinan & Poin Pelanggaran</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                       Sistem poin yang transparan membantu guru BK memantau perilaku siswa secara objektif dan sistematis.
                    </p>
                    <ul className="space-y-4">
                       {[
                          { title: "Log Pelanggaran", desc: "Guru dapat mencatat pelanggaran secara instan dengan bukti foto di lapangan." },
                          { title: "Sistem Poin (Reward/Punish)", desc: "Akumulasi poin otomatis yang menentukan sanksi atau penghargaan siswa." },
                          { title: "Surat Panggilan Ortu", desc: "Otomatisasi cetak surat panggilan atau peringatan berdasarkan ambang batas poin." }
                       ].map((item, i) => (
                          <li key={i} className="flex items-start gap-4">
                             <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={14} className="text-red-600" />
                             </div>
                             <div>
                                <span className="font-bold text-slate-900 dark:text-white">{item.title}:</span>
                                <span className="text-sm text-slate-500 ml-1">{item.desc}</span>
                             </div>
                          </li>
                       ))}
                    </ul>
                 </motion.div>

                 {/* Feature 4: Komunikasi */}
                 <motion.div variants={itemVariants} className="group p-8 md:p-12 rounded-[3rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-green-200 transition-all">
                    <div className="w-16 h-16 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-lg mb-8 group-hover:scale-110 transition-transform">
                       <MessageSquare size={32} />
                    </div>
                    <h3 className="text-2xl font-extrabold mb-6">Komunikasi & Notifikasi</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                       Menghilangkan jarak antara sekolah dan orang tua. Orang tua merasa tenang karena tahu keberadaan anaknya.
                    </p>
                    <ul className="space-y-4">
                       {[
                          { title: "WhatsApp Gateway", desc: "Notifikasi kehadiran real-time terkirim ke WhatsApp orang tua saat siswa tap." },
                          { title: "Aplikasi Parent Mobile", desc: "Aplikasi khusus orang tua untuk memantau absensi, izin, dan pengumuman sekolah." },
                          { title: "Pengumuman Massal", desc: "Kirim pesan informasi ke seluruh orang tua dalam satu klik tanpa biaya SMS." }
                       ].map((item, i) => (
                          <li key={i} className="flex items-start gap-4">
                             <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={14} className="text-green-600" />
                             </div>
                             <div>
                                <span className="font-bold text-slate-900 dark:text-white">{item.title}:</span>
                                <span className="text-sm text-slate-500 ml-1">{item.desc}</span>
                             </div>
                          </li>
                       ))}
                    </ul>
                 </motion.div>
              </motion.div>
           </div>
        </section>

        {/* 3. Immersive CTA */}
        <section className="py-24 bg-mesh rounded-[4rem] mx-4 md:mx-10 mb-20 overflow-hidden relative">
           <div className="container mx-auto px-4 relative text-center">
              <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
                 className="max-w-3xl mx-auto space-y-10"
              >
                 <h2 className="text-3xl md:text-5xl font-black leading-tight">Mulai Transformasi <br /> <span className="text-blue-600">Sekolah Masa Depan</span></h2>
                 <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                    Uji coba semua fitur di atas secara gratis selama 14 hari. <br className="hidden md:block" />
                    Buktikan bagaimana kami mempermudah hidup ribuan guru di seluruh Indonesia.
                 </p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                       size="lg" 
                       onClick={() => window.open('/pricing', '_self')}
                       className="rounded-xl px-12 py-6 h-auto text-lg bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-500/10"
                    >
                       Lihat Paket Harga
                       <ArrowRight size={20} className="ml-2" />
                    </Button>
                    <Button 
                       variant="outline"
                       size="lg" 
                       onClick={() => window.open('https://wa.me/6281222333444', '_blank')}
                       className="rounded-xl px-12 py-6 h-auto text-lg border-slate-200 dark:border-slate-800"
                    >
                       Konsultasi Gratis
                    </Button>
                 </div>
              </motion.div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LearnMorePage;

