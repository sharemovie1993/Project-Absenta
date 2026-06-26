import React, { useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

function PrivacyPolicyContent() {
  const { data: systemConfig, isLoading } = useQuery({
    queryKey: ['system-config','active','public'],
    queryFn: fetchActiveSystemConfig,
  });

  const appName = useMemo(() => systemConfig?.app_name || 'Absenta.id', [systemConfig]);

  useEffect(() => {
    try { document.title = `${appName} - Kebijakan Privasi`; } catch {}
  }, [appName]);

  useEffect(() => {
    try { applyBrandingFromConfig(systemConfig ?? null); } catch {}
  }, [systemConfig]);

  const summaryCards = useMemo(() => [
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
  ], []);

  const navigations = useMemo(() => [
    "Pengantar",
    "Jenis Data",
    "Tujuan Pemrosesan",
    "Hak Subjek Data",
    "Keamanan Data",
    "Kontak"
  ], []);

  const dataTypes = useMemo(() => [
    { title: "Data Pribadi Umum", content: "Nama lengkap, email, nomor telepon, identitas akun, dan data institusi/sekolah." },
    { title: "Data Aktivitas", content: "Data absensi siswa & guru, waktu, lokasi, log aktivitas, dan riwayat sistem." },
    { title: "Data Teknis", content: "Alamat IP, tipe perangkat, informasi browser, dan log keamanan." },
    { title: "Data Transaksi", content: "Detail tagihan, riwayat pembayaran, dan status paket langganan." }
  ], []);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Beranda', path: '/' },
    { label: 'Kebijakan Privasi' }
  ], []);

  const handleDownloadPDF = useCallback(() => {
    // Implementation for download PDF
  }, []);

  const handleContactOfficer = useCallback(() => {
    window.open('mailto:privacy@absenta.id', '_blank');
  }, []);

  if (isLoading) {
    return (
      <AcademicPageLayout title="Kebijakan Privasi" description="Memuat dokumen hukum..." hardeningModuleKey="privacy_policy">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menyiapkan Dokumen Privasi...</p>
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Kebijakan Privasi"
      description="Komitmen kami untuk melindungi data pribadi Anda sesuai dengan standar keamanan tertinggi dan UU PDP."
      hardeningModuleKey="privacy_policy"
      instruction={{
        title: "Kebijakan Privasi",
        description: "Dokumen ini merinci bagaimana kami mengelola data Anda.",
        items: [
          { text: "Silakan baca dengan seksama untuk memahami hak-hak Anda sebagai subjek data." }
        ]
      }}
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-5xl mx-auto pb-24">
        {/* Immersive Header - Replaced by Layout header, but keeping internal styling if needed */}
        
        {/* Executive Summary Cards */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
        >
          {(summaryCards ?? [])?.map((card, i) => (
            <motion.div 
              key={i}
              variants={itemVariants}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
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
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Navigasi Dokumen</h4>
              {(navigations ?? [])?.map((item, i) => (
                <div key={i} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 cursor-pointer flex items-center gap-3 group transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 group-hover:bg-blue-600 transition-colors" />
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
              <SectionCard title="Jenis Data Pribadi yang Diproses" icon={Shield} fullWidth>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose mt-4">
                  {(dataTypes ?? [])?.map((item, i) => (
                    <div key={i} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
                      <div className="font-bold text-slate-900 dark:text-white mb-2">{item.title}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.content}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 flex gap-4 items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 italic m-0 font-medium">
                    Catatan: {appName} tidak mengumpulkan data pribadi sensitif kecuali eksplisit diaktifkan oleh institusi (seperti biometrik) yang diproses dengan pengamanan enkripsi ganda.
                  </p>
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-16">
              <SectionCard title="Tujuan Pemrosesan Data" icon={Eye} fullWidth>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0 not-prose mt-4">
                  {[
                    "Manajemen layanan absensi sekolah",
                    "Autentikasi keamanan pengguna",
                    "Monitoring kehadiran akademik",
                    "Pengelolaan penagihan paket",
                    "Pencegahan penyalahgunaan sistem",
                    "Pemenuhan kewajiban hukum negara"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 py-3 border-b border-slate-50 dark:border-slate-800 font-medium">
                      <ArrowRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                      <span className="leading-relaxed text-sm">{text}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-16">
              <SectionCard title="Hak Anda sebagai Subjek Data" icon={BookOpen} fullWidth>
                <div className="space-y-4 text-slate-600 dark:text-slate-400 not-prose mt-4">
                  <p className="text-sm font-medium">Sesuai UU PDP, Anda memiliki hak penuh untuk:</p>
                  <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ul className="space-y-3 m-0 p-0 list-none">
                      <li className="flex gap-3 text-sm font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Mengakses & salinan data pribadi</li>
                      <li className="flex gap-3 text-sm font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Memperbaiki kesalahan data</li>
                      <li className="flex gap-3 text-sm font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Menarik persetujuan sewaktu-waktu</li>
                    </ul>
                    <ul className="space-y-3 m-0 p-0 list-none">
                      <li className="flex gap-3 text-sm font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Menghentikan pemrosesan data</li>
                      <li className="flex gap-3 text-sm font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Menghapus data akun (Right to be Forgotten)</li>
                      <li className="flex gap-3 text-sm font-medium"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"/> Mengajukan pengaduan resmi</li>
                    </ul>
                  </div>
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-16">
              <SectionCard title="Keamanan & Perlindungan Data" icon={Lock} fullWidth>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-6 mt-4">
                  Kami mengimplementasikan pengamanan teknis dan operasional yang ketat, termasuk namun tidak terbatas pada:
                </p>
                <div className="flex flex-wrap gap-2 not-prose">
                  {["Enkripsi AES-256", "SSL/TLS Secure Connect", "RBAC Control", "Audit Log Berkala", "Multi-tenant Isolation"].map((badge, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase border border-emerald-100 dark:border-emerald-800 tracking-tight">
                      {badge}
                    </span>
                  ))}
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-16">
              <div className="p-8 rounded-2xl bg-blue-600 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-150 duration-700" />
                <h4 className="text-white font-black uppercase tracking-tight mb-4 flex items-center gap-3 relative z-10 m-0">
                  <Shield className="w-5 h-5 text-blue-200" />
                  Perlindungan Khusus Siswa
                </h4>
                <p className="text-blue-100 m-0 leading-relaxed relative z-10 font-medium text-sm">
                  Data siswa diproses semata-mata untuk keperluan pendidikan wajib. {appName} berkomitmen tidak menggunakan data siswa untuk profil komersial atau target iklan. Persetujuan penggunaan sistem berada di bawah naungan institusi sekolah yang bermitra dengan kami.
                </p>
              </div>
            </motion.section>

            <motion.div 
              variants={itemVariants} 
              className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 text-center"
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terakhir diperbarui: 15 April 2026</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handleDownloadPDF}
                  className="px-8 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  Download PDF Layanan
                </button>
                <button 
                  onClick={handleContactOfficer}
                  className="px-8 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  Hubungi Data Officer
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </AcademicPageLayout>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <PrivacyPolicyContent />
  );
}
