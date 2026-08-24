import React, { useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { motion } from 'framer-motion';
import { Scale, FileCheck, Users, CreditCard, Ban, Gavel, ArrowRight, Info } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { formatDate } from '../../utils/layoutUtils';

function TermsOfServiceContent() {
  const { data: systemConfig, isLoading } = useQuery({
    queryKey: ['system-config','active','public'],
    queryFn: fetchActiveSystemConfig,
  });

  const isEmpty = !systemConfig && !isLoading;
  const appName = useMemo(() => systemConfig?.app_name || 'Absenta.id', [systemConfig]);

  useEffect(() => {
    try { document.title = `${appName} - Ketentuan Layanan`; } catch {}
  }, [appName]);

  useEffect(() => {
    try { applyBrandingFromConfig(systemConfig ?? null); } catch {}
  }, [systemConfig]);

  const summaryCards = useMemo(() => [
    { icon: <FileCheck className="w-5 h-5" />, title: "Legal & Sah", color: "blue" },
    { icon: <Users className="w-5 h-5" />, title: "Tanggung Jawab", color: "indigo" },
    { icon: <CreditCard className="w-5 h-5" />, title: "Pembayaran", color: "emerald" },
    { icon: <Ban className="w-5 h-5" />, title: "Larangan", color: "red" }
  ], []);

  const navigations = useMemo(() => [
    "Definisi Utama",
    "Ruang Lingkup",
    "Akun & Pendaftaran",
    "Hak & Kewajiban",
    "Berlangganan",
    "Larangan",
    "Hukum & Sengketa"
  ], []);

  const dataDefinitions = useMemo(() => [
    { l: "Tenant/Institusi", v: "Sekolah atau organisasi yang menjadi pelanggan utama layanan." },
    { l: "Pengguna", v: "Individu (Siswa, Guru, Admin) yang memiliki akses ke sistem." },
    { l: "Platform", v: `Sistem elektronik ${appName} yang mencakup web dan API.` }
  ], [appName]);

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
    { label: 'Ketentuan Layanan' }
  ], []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleContactLegal = useCallback(() => {
    window.open('mailto:legal@absenta.id', '_blank');
  }, []);

  if (isLoading) {
    return (
      <AcademicPageLayout title="Ketentuan Layanan" description="Memuat aturan penggunaan..." hardeningModuleKey="tos_page">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menyiapkan Ketentuan Layanan...</p>
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Ketentuan Layanan"
      description="Aturan dan kesepakatan resmi untuk memastikan penggunaan platform yang aman dan adil."
      hardeningModuleKey="tos_page"
      instruction={{
        title: "Ketentuan Layanan",
        description: "Ketentuan ini merupakan kontrak yang mengikat secara hukum antara Anda dan pengelola platform.",
        items: [
          { text: "Harap baca dengan teliti sebelum menggunakan layanan." }
        ]
      }}
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-5xl mx-auto pb-24">
        {/* Key Terms Summary Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20"
        >
          {(summaryCards ?? [])?.map((card, i) => {
             const colorMap: Record<string, string> = {
               blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
               indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
               emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
               red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
             };
             return (
              <motion.div 
                key={i}
                variants={itemVariants}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:border-blue-200 dark:hover:border-blue-900"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[card.color] || ''}`}>
                  {card.icon}
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{card.title}</span>
              </motion.div>
             );
          })}
        </motion.div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar TOC */}
          <div className="hidden lg:block lg:col-span-1 border-r border-slate-100 dark:border-slate-800 pr-8">
            <div className="sticky top-24 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Navigasi Pasal</h4>
              {(navigations ?? [])?.map((item, i) => (
                <div key={i} className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-all cursor-pointer flex items-center gap-3 active:scale-95 transition-colors">
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
              <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed font-medium">
                  Penting: Dengan mengakses {appName}, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh Ketentuan Layanan ini. Dokumen ini merupakan perjanjian hukum yang sah antara Anda (atau institusi Anda) dengan pengelola platform.
                </p>
              </div>
            </motion.div>

            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Definisi Utama" icon={Scale} fullWidth>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose mt-4">
                  {(dataDefinitions ?? [])?.map((d, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <div className="font-black text-blue-600 dark:text-blue-400 text-[10px] mb-1 uppercase tracking-wider">{d.l}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 leading-snug font-medium">{d.v}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Ruang Lingkup Layanan" icon={ArrowRight} fullWidth>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4 mt-4">Layanan kami mencakup namun tidak terbatas pada:</p>
                <ul className="list-none p-0 space-y-3 not-prose">
                  {[
                    "Manajemen absensi berbasis Gate, Camera, dan Smartphone.",
                    "Pengelolaan kurikulum dan sesi pembelajaran harian.",
                    "Sistem pelaporan kehadiran otomatis untuk orang tua dan sekolah.",
                    "Admin panel untuk monitoring data secara real-time."
                  ].map((txt, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 font-medium">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                        <ArrowRight className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-sm">{txt}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Hak & Tanggung Jawab Tenant" icon={Users} fullWidth>
                <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mt-4">
                   <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-widest mb-3">Persetujuan Institusi</p>
                   <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                     Tenant bertanggung jawab penuh atas legalitas pengumpulan data siswa dan guru. Khusus untuk siswa di bawah umur, institusi menyatakan telah memiliki mekanisme persetujuan dari orang tua/wali sesuai dengan peraturan pendidikan yang berlaku.
                   </p>
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Berlangganan & Pembayaran" icon={CreditCard} fullWidth>
                <ul className="space-y-4 list-none p-0 not-prose mt-4">
                  <li className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white m-0 text-sm">Siklus Penagihan</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0 leading-relaxed font-medium">Biaya paket dihitung berdasarkan jumlah populasi atau fitur terpilih dengan masa berlaku bulanan atau tahunan.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white m-0 text-sm">Keterlambatan</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0 leading-relaxed font-medium">Sistem dapat membatasi akses secara otomatis jika pembayaran tidak dilakukan dalam tenggang waktu yang diberikan.</p>
                    </div>
                  </li>
                </ul>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Larangan Penggunaan" icon={Ban} fullWidth>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mt-4">
                   {[
                     "Berbagi akun di luar institusi resmi.",
                     "Reverse engineering kode sistem.",
                     "Input data palsu atau menyesatkan.",
                     "Menjebol sistem keamanan {appName}."
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-50 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold">
                       <Ban className="w-4 h-4" />
                       {item.replace('{appName}', appName)}
                     </div>
                   ))}
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <div className="p-8 rounded-2xl bg-slate-900 text-white flex items-center gap-8 flex-wrap md:flex-nowrap relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 relative z-10">
                  <Gavel className="w-8 h-8 text-blue-400" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-black text-white m-0 tracking-tight uppercase">Regulasi Republik Indonesia</h4>
                  <p className="text-slate-400 m-0 text-sm mt-2 leading-relaxed font-medium">
                    Ketentuan ini tunduk sepenuhnya kepada hukum Republik Indonesia. Setiap sengketa yang timbul akan diupayakan melalui musyawarah sebelum menempuh jalur hukum sesuai domisili perusahaan.
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.div 
              variants={itemVariants} 
              className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 text-center"
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pembaruan terakhir: 15 April 2026</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handlePrint}
                  className="px-8 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cetak Ketentuan
                </button>
                <button 
                  onClick={handleContactLegal}
                  className="px-8 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  Hubungi Legal Team
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </AcademicPageLayout>
  );
}

export default function TermsOfServicePage() {
  return (
    <TermsOfServiceContent />
  );
}
