import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Scale, FileCheck, Users, CreditCard, Ban, Gavel, ArrowRight, Info } from 'lucide-react';

export default function TermsOfServicePage() {
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config','active','public'],
    queryFn: fetchActiveSystemConfig,
  });

  const appName = systemConfig?.app_name || 'Absenta.id';

  React.useEffect(() => {
    try { document.title = `${appName} - Ketentuan Layanan`; } catch {}
  }, [appName]);

  React.useEffect(() => {
    try { applyBrandingFromConfig(systemConfig ?? null); } catch {}
  }, [systemConfig]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900 overflow-x-hidden">
      <Navbar />
      
      <main className="flex-grow pt-32">
        {/* Immersive Header */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-10 dark:opacity-20" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/50 to-white dark:via-slate-950/50 dark:to-slate-950" />
          
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-xs font-bold mb-6 tracking-wider uppercase border border-slate-200 dark:border-slate-800"
            >
              <Scale className="w-3.5 h-3.5" />
              Kesepakatan Penggunaan
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight"
            >
              Ketentuan <span className="text-gradient-primary">Layanan</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Aturan dan kesepakatan resmi untuk memastikan penggunaan platform yang aman, adil, dan bermanfaat bagi seluruh institusi pendidikan.
            </motion.p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
          {/* Key Terms Summary Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20"
          >
            {[
              { icon: <FileCheck className="w-5 h-5" />, title: "Legal & Sah", color: "blue" },
              { icon: <Users className="w-5 h-5" />, title: "Tanggung Jawab", color: "indigo" },
              { icon: <CreditCard className="w-5 h-5" />, title: "Pembayaran", color: "emerald" },
              { icon: <Ban className="w-5 h-5" />, title: "Larangan", color: "red" }
            ].map((card, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:border-blue-200 dark:hover:border-blue-900"
              >
                <div className={`w-10 h-10 rounded-lg bg-${card.color}-50 dark:bg-${card.color}-900/20 flex items-center justify-center text-${card.color}-600 dark:text-${card.color}-400`}>
                  {card.icon}
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{card.title}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Sidebar TOC */}
            <div className="hidden lg:block lg:col-span-1 border-r border-slate-100 dark:border-slate-800 pr-8">
              <div className="sticky top-24 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Navigasi Pasal</h4>
                {[
                  "Definisi Utama",
                  "Ruang Lingkup",
                  "Akun & Pendaftaran",
                  "Hak & Kewajiban",
                  "Berlangganan",
                  "Larangan",
                  "Hukum & Sengketa"
                ].map((item, i) => (
                  <div key={i} className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-all cursor-pointer flex items-center gap-3 active:scale-95">
                    <div className="w-0.5 h-3 bg-slate-200 dark:bg-slate-800" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Document Text */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-3 prose prose-slate dark:prose-invert max-w-none"
            >
              <motion.div variants={itemVariants} className="mb-12">
                <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed font-medium">
                    Penting: Dengan mengakses {appName}, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh Ketentuan Layanan ini. Dokumen ini merupakan perjanjian hukum yang sah antara Anda (atau institusi Anda) dengan pengelola platform.
                  </p>
                </div>
              </motion.div>

              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-50 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                  <span className="text-slate-300 dark:text-slate-700 font-mono text-3xl">01</span>
                  Definisi
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
                    {[
                      { l: "Tenant/Institusi", v: "Sekolah atau organisasi yang menjadi pelanggan utama layanan." },
                      { l: "Pengguna", v: "Individu (Siswa, Guru, Admin) yang memiliki akses ke sistem." },
                      { l: "Platform", v: "Sistem elektronik {appName} yang mencakup web dan API." }
                    ].map((d, i) => (
                      <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-xs mb-1 uppercase">{d.l}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{d.v.replace('{appName}', appName)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-50 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                  <span className="text-slate-300 dark:text-slate-700 font-mono text-3xl">02</span>
                  Ruang Lingkup Layanan
                </h2>
                <p>Layanan kami mencakup namun tidak terbatas pada:</p>
                <ul className="list-none p-0 space-y-3">
                  {[
                    "Manajemen absensi berbasis Gate, Camera, dan Smartphone.",
                    "Pengelolaan kurikulum dan sesi pembelajaran harian.",
                    "Sistem pelaporan kehadiran otomatis untuk orang tua dan sekolah.",
                    "Admin panel untuk monitoring data secara real-time."
                  ].map((txt, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                        <ArrowRight className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span>{txt}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-50 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                  <span className="text-slate-300 dark:text-slate-700 font-mono text-3xl">03</span>
                  Hak & Tanggung Jawab Tenant
                </h2>
                <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-xl border border-slate-100 dark:border-slate-800">
                   <p className="font-bold text-slate-900 dark:text-white mb-4">Persetujuan Institusi:</p>
                   <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                     Tenant bertanggung jawab penuh atas legalitas pengumpulan data siswa dan guru. Khusus untuk siswa di bawah umur, institusi menyatakan telah memiliki mekanisme persetujuan dari orang tua/wali sesuai dengan peraturan pendidikan yang berlaku.
                   </p>
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-50 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                  <span className="text-slate-300 dark:text-slate-700 font-mono text-3xl">04</span>
                  Berlangganan & Pembayaran
                </h2>
                <ul className="space-y-4 list-none p-0">
                  <li className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white m-0">Siklus Penagihan</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 m-0 leading-relaxed">Biaya paket dihitung berdasarkan jumlah populasi atau fitur terpilih dengan masa berlaku bulanan atau tahunan.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white m-0">Keterlambatan</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 m-0 leading-relaxed">Sistem dapat membatasi akses secara otomatis jika pembayaran tidak dilakukan dalam tenggang waktu yang diberikan.</p>
                    </div>
                  </li>
                </ul>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-50 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                  <span className="text-slate-300 dark:text-slate-700 font-mono text-3xl">05</span>
                  Larangan Penggunaan
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                   {[
                     "Berbagi akun di luar institusi resmi.",
                     "Reverse engineering kode sistem.",
                     "Input data palsu atau menyesatkan.",
                     "Menjebol sistem keamanan {appName}."
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-50 dark:border-red-900/20 text-red-600 dark:text-red-400 text-sm">
                       <Ban className="w-4 h-4" />
                       {item.replace('{appName}', appName)}
                     </div>
                   ))}
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-4">
                  <span className="text-slate-300 dark:text-slate-700 font-mono text-3xl">06</span>
                  Hukum & Sengketa
                </h2>
                <div className="p-8 rounded-xl bg-slate-900 text-white flex items-center gap-8 flex-wrap md:flex-nowrap">
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Gavel className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white m-0 tracking-tight">Regulasi Republik Indonesia</h4>
                    <p className="text-slate-400 m-0 text-sm mt-1 leading-relaxed">
                      Ketentuan ini tunduk sepenuhnya kepada hukum Republik Indonesia. Setiap sengketa yang timbul akan diupayakan melalui musyawarah sebelum menempuh jalur hukum sesuai domisili perusahaan.
                    </p>
                  </div>
                </div>
              </motion.section>

              <motion.div 
                variants={itemVariants} 
                className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 text-center"
              >
                <p className="text-sm text-slate-400">Pembaruan terakhir: 15 April 2026</p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button className="px-6 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                    Cetak Ketentuan
                  </button>
                  <button className="px-6 py-2 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                    Hubungi Legal Team
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
