import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { ShieldCheck, Database, Briefcase, FileText, Lock, Globe, ClipboardList, ArrowRight, Users, AlertCircle } from 'lucide-react';

export default function DataProcessingAgreementPage() {
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config','active','public'],
    queryFn: fetchActiveSystemConfig,
  });

  const appName = systemConfig?.app_name || 'Absenta.id';

  React.useEffect(() => {
    try { document.title = `${appName} - Data Processing Agreement`; } catch {}
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
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-6 tracking-wider uppercase border border-emerald-100 dark:border-emerald-800"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Keamanan Data Korporasi
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight"
            >
              Data <span className="text-gradient-primary">Processing</span> Agreement
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Perjanjian teknis mengenai pemrosesan data pribadi antara Pengendali Data (Sekolah) dan Pemroses Data ({appName}).
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
                icon: <Database className="w-6 h-6" />, 
                title: "Pemroses Data", 
                desc: "{appName} bertindak sebagai penyedia infrastruktur pemrosesan." 
              },
              { 
                icon: <Briefcase className="w-6 h-6" />, 
                title: "Pengendali Data", 
                desc: "Institusi sekolah memegang kendali penuh atas tujuan data." 
              },
              { 
                icon: <Lock className="w-6 h-6" />, 
                title: "Kepatuhan UU PDP", 
                desc: "Selaras dengan UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi." 
              }
            ].map((card, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  {card.icon}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{card.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {card.desc.replace('{appName}', appName)}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Nav */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Struktur DPA</h4>
                {[
                  "Ruang Lingkup",
                  "Peran & Tanggung Jawab",
                  "Keamanan Teknis",
                  "Insiden Pelanggaran",
                  "Audit & Kepatuhan",
                  "Retensi Data"
                ].map((item, i) => (
                  <div key={i} className="text-sm text-slate-500 hover:text-blue-600 cursor-pointer flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-3 prose prose-slate dark:prose-invert max-w-none"
            >
              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-100 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  Ruang Lingkup Pemrosesan
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 not-prose">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Kategori Data</h4>
                    <ul className="space-y-2 list-none p-0">
                       {["Identitas (Nama, Email, Telp)", "Data Akademik (Kelas, Sekolah)", "Log Kehadiran & Absensi", "Meta Data Teknis (IP, Browser)"].map((t, i) => (
                         <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" /> {t}
                         </li>
                       ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Subjek Data</h4>
                    <ul className="space-y-2 list-none p-0">
                       {["Siswa & Anak Didik", "Guru & Tenaga Kependidikan", "Orang Tua/Wali Murid", "Administrator Sistem"].map((t, i) => (
                         <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" /> {t}
                         </li>
                       ))}
                    </ul>
                  </div>
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-100 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                    <Users className="w-5 h-5" />
                  </div>
                  Peran & Tanggung Jawab
                </h2>
                <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2">Pihak Sekolah (Pengendali)</p>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                       <li>Menentukan tujuan pemrosesan.</li>
                       <li>Memastikan dasar hukum yang sah.</li>
                       <li>Mengelola permintaan hak subjek data.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2">{appName.split('.')[0]} (Pemroses)</p>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                       <li>Memproses sesuai instruksi tertulis.</li>
                       <li>Menjamin kerahasiaan penuh staf.</li>
                       <li>Langkah keamanan teknis yang kuat.</li>
                    </ul>
                  </div>
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14 pb-14 border-b border-slate-100 dark:border-slate-900">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Keamanan Teknis & Organisasi</h2>
                <div className="flex flex-wrap gap-3 not-prose">
                   {["AES-256 Encryption", "Role-Based Access Control", "Encrypted Backups", "Network Isolation"].map((item, i) => (
                     <div key={i} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-2 shadow-sm">
                        <Lock className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item}</span>
                     </div>
                   ))}
                </div>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-14">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/40 flex items-center justify-center text-red-600">
                     <AlertCircle className="w-5 h-5" />
                   </div>
                   Insiden Pelanggaran Data
                </h2>
                <div className="p-8 rounded-xl bg-red-600 text-white shadow-xl shadow-red-500/20">
                  <h4 className="text-white font-bold mb-4">Protokol 24-Jam</h4>
                  <p className="text-red-100 m-0 leading-relaxed">
                    Pemroses Data wajib memberitahukan Pengendali Data dalam waktu maksimal 24 jam setelah mendeteksi adanya insiden kebocoran atau pelanggaran data pribadi. Pemberitahuan mencakup dampak, mitigasi, dan langkah korektif.
                  </p>
                </div>
              </motion.section>

              <motion.div 
                variants={itemVariants} 
                className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 text-center"
              >
                <p className="text-sm text-slate-400">Pembaruan terakhir: 15 April 2026</p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button className="px-6 py-2 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                    Download Master DPA
                  </button>
                  <button className="px-6 py-2 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                    Hubungi Data Officer
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
