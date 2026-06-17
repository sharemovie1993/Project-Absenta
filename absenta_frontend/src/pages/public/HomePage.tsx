import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Users, 
  ShieldCheck, 
  Smartphone, 
  BarChart3, 
  Heart,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui';

export default function HomePage() {
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config','active','public'],
    queryFn: fetchActiveSystemConfig,
  });
  const navigate = useNavigate();

  const appName = systemConfig?.app_name || 'Sistem Absensi';
  const primaryColor = (systemConfig as any)?.primary_color || '#2563EB';

  React.useEffect(() => {
    try {
      document.title = String(appName);
    } catch {}
  }, [appName]);

  React.useEffect(() => {
    try {
      applyBrandingFromConfig(systemConfig ?? null);
    } catch {}
  }, [systemConfig]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {/* 1. Immersive Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-mesh">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-purple-400/10 rounded-full blur-[100px]" />
        </div>

        <div className="container relative mx-auto text-center">
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
            transition={{ duration: 0.8, ease: "easeOut" as any }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Satu Aplikasi untuk <br />
            <span className="text-gradient-primary">Semua Skala Sekolah</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" as any }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed"
          >
            Transformasi digital pendidikan dimulai di sini. Solusi terpadu untuk <strong>Absensi, Akademik, dan Kedisiplinan</strong> yang ramah pengguna dan terjangkau.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" as any }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              variant="primary"
              onClick={() => navigate('/learn-more')}
              className="w-full sm:w-auto px-8 py-4 text-lg rounded-xl shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group"
              style={{ backgroundColor: primaryColor }}
            >
              Pelajari Lebih Lanjut
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="w-full sm:w-auto px-8 py-4 text-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all"
            >
              Lihat Harga
            </Button>
          </motion.div>

          {/* Hero Visual Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" as any }}
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
                         <div className="text-xs font-bold">SMKN 1 Cimahi</div>
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

      {/* 2. Interactive Service Modes */}
      <section className="py-24 bg-white dark:bg-slate-950">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pilih Mode Absensi Anda</h2>
            <p className="text-slate-600 dark:text-slate-400">Sesuaikan sistem dengan karakteristik sekolah Anda, dari SD hingga SMA/SMK.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="group p-8 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-900 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Clock size={160} />
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400 shadow-sm">
                   <Clock size={28} />
                </div>
                <div className="px-3 py-1 bg-green-500/10 text-green-600 text-xs font-bold rounded-full">SIMPLE MODE</div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Mode SIMPLE</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Efisien dan cepat. Siswa cukup melakukan tap satu kali saat datang dan pulang. Cocok untuk SD, SMP, dan lingkungan yang mengutamakan kecepatan pencatatan harian.
              </p>
              <ul className="space-y-3">
                {[
                  "Antrian gerbang super cepat",
                  "Notifikasi WhatsApp Real-time",
                  "Rekap bulanan otomatis (PDF/Excel)",
                  "Hemat bandwidth & resource"
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={16} className="text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="group p-8 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-900 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <BarChart3 size={160} />
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm">
                   <BarChart3 size={28} />
                </div>
                <div className="px-3 py-1 bg-blue-500/10 text-blue-600 text-xs font-bold rounded-full">ADVANCED MODE</div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Mode MULTI-SESI</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Kontrol penuh setiap jam pelajaran. Ideal untuk SMA/SMK dengan sistem moving class atau Boarding School yang membutuhkan audit kehadiran per Mapel.
              </p>
              <ul className="space-y-3">
                {[
                  "Monitoring kehadiran per Jam Pelajaran",
                  "Laporan kinerja mengajar Guru",
                  "Sistem deteksi bolos otomatis",
                  "Integrasi Jurnal Mengajar Class-by-Class"
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={16} className="text-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Global Features Showcase */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">Satu Platform,<br /><span className="text-blue-600">Fitur Tanpa Batas</span></h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                Kami percaya teknologi terbaik harus dapat diakses oleh semua. Itulah mengapa kami menggratiskan akses ke SEMUA fitur utama dalam setiap paket langganan.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <Smartphone size={20} />, label: "Absensi Wajah & QR" },
                  { icon: <Zap size={20} />, label: "Cetak Kartu Otomatis" },
                  { icon: <Users size={20} />, label: "Manajemen Kesiswaan" },
                  { icon: <ShieldCheck size={20} />, label: "Konseling & Disiplin" },
                  { icon: <Users size={20} />, label: "Aplikasi Khusus Ortu" },
                  { icon: <BarChart3 size={20} />, label: "Analitik Dashboard" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="text-blue-500">{item.icon}</div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/20">
                 <div className="text-2xl font-bold mb-2">Mulai dari Rp 100rb / bln</div>
                 <p className="text-blue-100 text-sm">Transparansi harga total. Bayar hanya untuk jumlah siswa dan mode yang Anda gunakan.</p>
              </div>
            </div>
            
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
               <div className="space-y-4">
                  <div className="aspect-square rounded-xl bg-blue-500/20 flex flex-col items-center justify-center p-6 text-center animate-float">
                     <Users size={40} className="text-blue-500 mb-4" />
                     <div className="text-2xl font-bold">100%</div>
                     <div className="text-xs text-slate-500">Multitenant Ready</div>
                  </div>
                  <div className="aspect-[4/5] rounded-xl bg-green-500/20 flex flex-col items-center justify-center p-6 text-center animate-float [animation-delay:1s]">
                     <ShieldCheck size={40} className="text-green-500 mb-4" />
                     <div className="text-2xl font-bold">99.9%</div>
                     <div className="text-xs text-slate-500">Uptime Guarantee</div>
                  </div>
               </div>
               <div className="space-y-4 pt-8">
                  <div className="aspect-[4/5] rounded-xl bg-purple-500/20 flex flex-col items-center justify-center p-6 text-center animate-float [animation-delay:1.5s]">
                     <Zap size={40} className="text-purple-500 mb-4" />
                     <div className="text-2xl font-bold">&lt; 1s</div>
                     <div className="text-xs text-slate-500">Proses Absensi</div>
                  </div>
                  <div className="aspect-square rounded-xl bg-amber-500/20 flex flex-col items-center justify-center p-6 text-center animate-float [animation-delay:0.5s]">
                     <Smartphone size={40} className="text-amber-500 mb-4" />
                     <div className="text-2xl font-bold">iOS/Android</div>
                     <div className="text-xs text-slate-500">Native PWA Support</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Human-Centric Testimonials */}
      <section className="py-24 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="container mx-auto px-4">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Dipercaya oleh Pengelola Pendidikan</h2>
              <div className="flex items-center justify-center gap-1 text-amber-500">
                 {[1,2,3,4,5].map(i => <Heart key={i} size={16} fill="currentColor" />)}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Ibu Rina S.", role: "Wali Kelas SMP", quote: "Akhirnya ada sistem yang tidak membingungkan guru. Absensi selesai dalam hitungan detik.", initial: "R" },
                { name: "Pak Ridwan", role: "Kepala IT SMK", quote: "Integrasi sistem akademik dan gerbangnya luar biasa stabil. Sangat membantu audit internal.", initial: "P" },
                { name: "Bpk. Heru", role: "Yayasan Pendidikan", quote: "Investasi fitur terbaik dengan biaya yang masuk akal bagi sekolah rintisan seperti kami.", initial: "B" }
              ].map((t, i) => (
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

      {/* 5. CTA Footer */}
      <section className="py-24">
         <div className="container mx-auto px-4">
            <div className="rounded-[3rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
               
               <div className="relative z-10 max-w-2xl mx-auto">
                  <h2 className="text-3xl md:text-5xl font-extrabold mb-8">Siap Transformasi Sekolah Anda?</h2>
                  <p className="text-slate-400 dark:text-slate-500 mb-10 text-lg">Bergabunglah dengan ratusan sekolah lainnya. Mulai uji coba gratis atau hubungi tim konsultan kami.</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                     <Button 
                        variant="primary" 
                        size="lg"
                        onClick={() => navigate('/learn-more')}
                        className="w-full sm:w-auto px-10 py-5 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/10"
                     >
                        Coba Gratis Sekarang
                     </Button>
                     <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full sm:w-auto px-10 py-5 rounded-xl border-slate-700 dark:border-slate-200"
                     >
                        Hubungi Sales
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <Footer />
    </div>
  );
}

