import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config','active','public'],
    queryFn: fetchActiveSystemConfig,
  });

  const appName = systemConfig?.app_name || 'Absenta.id';
  const primaryColor = systemConfig?.primary_color || '#3b82f6';

  React.useEffect(() => {
    try { document.title = `${appName} - Kebijakan Privasi`; } catch {}
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
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6 tracking-wider uppercase border border-blue-100 dark:border-blue-800"
            >
              <Shield className="w-3.5 h-3.5" />
              Perlindungan Data Anda
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight"
            >
              Kebijakan <span className="text-gradient-primary">Privasi</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Komitmen kami untuk melindungi data pribadi Anda sesuai dengan standar keamanan tertinggi dan UU Perlindungan Data Pribadi yang berlaku.
            </motion.p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
          {/* Executive Summary Cards */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
          >
            {[
              { 
                icon: <Lock className="w-6 h-6" />, 
                title: "Data Aman", 
                desc: "Semua data dienksripsi menggunakan standar industri terkini." 
              },
              { 
                icon: <Eye className="w-6 h-6" />, 
                title: "Transparansi", 
                desc: "Kami menjelaskan secara detail apa yang kami kumpulkan dan mengapa." 
              },
              { 
                icon: <BookOpen className="w-6 h-6" />, 
                title: "Kendali Anda", 
                desc: "Anda memiliki hak penuh atas data Anda, termasuk akses dan penghapusan." 
              }
            ].map((card, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  {card.icon}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{card.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Sidebar TOC - Visible on Desktop */}
            <div className="hidden lg:block lg:col-span-1 border-r border-slate-100 dark:border-slate-800 pr-8">
              <div className="sticky top-24 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Navigasi Dokumen</h4>
                {[
                  "Pengantar",
                  "Jenis Data",
                  "Tujuan Pemrosesan",
                  "Hak Subjek Data",
                  "Keamanan Data",
                  "Kontak"
                ].map((item, i) => (
                  <div key={i} className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 cursor-pointer flex items-center gap-2 group">
                    <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-600 transition-colors" />
                    <span className="group-hover:translate-x-1 transition-transform inline-block">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Body */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-3 prose prose-slate dark:prose-invert max-w-none"
            >
              <motion.div variants={itemVariants} className="mb-12">
                <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                  Kebijakan Privasi ini disusun sesuai dengan <strong>UU No. 27 Tahun 2022</strong> tentang Perlindungan Data Pribadi (UU PDP) dan peraturan terkait lainnya di Indonesia. Dengan menggunakan platform {appName}, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan yang tercantum dalam dokumen ini.
                </p>
              </motion.div>

              <motion.section variants={itemVariants} className="mb-16">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white mb-6">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 text-sm font-bold">1</div>
                  Jenis Data Pribadi yang Diproses
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
                  {[
                    { title: "Data Pribadi Umum", content: "Nama lengkap, email, nomor telepon, identitas akun, dan data institusi/sekolah." },
                    { title: "Data Aktivitas", content: "Data absensi siswa & guru, waktu, lokasi, log aktivitas, dan riwayat sistem." },
                    { title: "Data Teknis", content: "Alamat IP, tipe perangkat, informasi browser, dan log keamanan." },
                    { title: "Data Transaksi", content: "Detail tagihan, riwayat pembayaran, dan status paket langganan." }
                  ].map((item, i) => (
                    <div key={i} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
                      <div className="font-bold text-slate-900 dark:text-white mb-2">{item.title}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.content}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 flex gap-4 items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300 italic m-0">
                    Catatan: {appName} tidak mengumpulkan data pribadi sensitif kecuali eksplisit diaktifkan oleh institusi (seperti biometrik) yang diproses dengan pengamanan enkripsi ganda.
                  </p>
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-16">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white mb-6 text-gradient-primary">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 text-sm font-bold">2</div>
                  Tujuan Pemrosesan Data
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0">
                  {[
                    "Manajemen layanan absensi sekolah",
                    "Autentikasi keamanan pengguna",
                    "Monitoring kehadiran akademik",
                    "Pengelolaan penagihan paket",
                    "Pencegahan penyalahgunaan sistem",
                    "Pemenuhan kewajiban hukum negara"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 py-3 border-b border-slate-50 dark:border-slate-900/50">
                      <ArrowRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                      <span className="leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-16">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white mb-6">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 text-sm font-bold">3</div>
                  Hak Anda sebagai Subjek Data
                </h2>
                <div className="space-y-4 text-slate-600 dark:text-slate-400">
                  <p>Sesuai UU PDP, Anda memiliki hak penuh untuk:</p>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
                    <ul className="space-y-3 m-0 p-0 list-none">
                      <li className="flex gap-3 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Mengakses & salinan data pribadi</li>
                      <li className="flex gap-3 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Memperbaiki kesalahan data</li>
                      <li className="flex gap-3 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Menarik persetujuan sewaktu-waktu</li>
                    </ul>
                    <ul className="space-y-3 m-0 p-0 list-none">
                      <li className="flex gap-3 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Menghentikan pemrosesan data</li>
                      <li className="flex gap-3 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Menghapus data akun (Right to be Forgotten)</li>
                      <li className="flex gap-3 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Mengajukan pengaduan resmi</li>
                    </ul>
                  </div>
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-16">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white mb-6">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 text-sm font-bold">4</div>
                  Keamanan & Perlindungan Data
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Kami mengimplementasikan pengamanan teknis dan operasional yang ketat, termasuk namun tidak terbatas pada:
                </p>
                <div className="flex flex-wrap gap-2 not-prose">
                  {["Enkripsi AES-256", "SSL/TLS Secure Connect", "RBAC Control", "Audit Log Berkala", "Multi-tenant Isolation"].map((badge, i) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-800">
                      {badge}
                    </span>
                  ))}
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-16">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Sekolah & Siswa di Bawah Umur</h2>
                <div className="p-8 rounded-xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-150 duration-700" />
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2 relative z-10">
                    <Shield className="w-5 h-5" />
                    Perlindungan Khusus Siswa
                  </h4>
                  <p className="text-blue-100 m-0 leading-relaxed relative z-10">
                    Data siswa diproses semata-mata untuk keperluan pendidikan wajib. {appName} berkomitmen tidak menggunakan data siswa untuk profil komersial atau target iklan. Persetujuan penggunaan sistem berada di bawah naungan institusi sekolah yang bermitra dengan kami.
                  </p>
                </div>
              </motion.section>

              <motion.div 
                variants={itemVariants} 
                className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 text-center"
              >
                <p className="text-sm text-slate-400">Terakhir diperbarui: 15 April 2026</p>
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Download PDF Layanan</button>
                  <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 mt-2.5" />
                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Hubungi Data Officer</button>
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
