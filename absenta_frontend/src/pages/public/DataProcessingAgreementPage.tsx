import React, { useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { motion } from 'framer-motion';
import { ShieldCheck, Database, Briefcase, Lock, Globe, ClipboardList, ArrowRight, Users, AlertCircle } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui';
import { formatDate } from '../../utils/layoutUtils';

function DataProcessingAgreementContent() {
  const { data: systemConfig, isLoading } = useQuery({
    queryKey: ['system-config', 'active', 'public'],
    queryFn: fetchActiveSystemConfig,
  });

  const isEmpty = !systemConfig && !isLoading;
  const appName = useMemo(() => systemConfig?.app_name || 'Absenta.id', [systemConfig]);

  useEffect(() => {
    try {
      document.title = `${appName} - Data Processing Agreement`;
    } catch {}
  }, [appName]);

  useEffect(() => {
    try {
      applyBrandingFromConfig(systemConfig ?? null);
    } catch {}
  }, [systemConfig]);

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

  const executiveSummaries = useMemo(() => [
    {
      icon: <Database className="w-6 h-6" />,
      title: "Pemroses Data",
      desc: `${appName} bertindak sebagai penyedia infrastruktur pemrosesan.`
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
  ], [appName]);

  const structureItems = useMemo(() => [
    "Ruang Lingkup",
    "Peran & Tanggung Jawab",
    "Keamanan Teknis",
    "Insiden Pelanggaran",
    "Audit & Kepatuhan",
    "Retensi Data"
  ], []);

  const dataCategories = useMemo(() => [
    "Identitas (Nama, Email, Telp)",
    "Data Akademik (Kelas, Sekolah)",
    "Log Kehadiran & Absensi",
    "Meta Data Teknis (IP, Browser)"
  ], []);

  const dataSubjects = useMemo(() => [
    "Siswa & Anak Didik",
    "Guru & Tenaga Kependidikan",
    "Orang Tua/Wali Murid",
    "Administrator Sistem"
  ], []);

  const technicalMeasures = useMemo(() => [
    "AES-256 Encryption",
    "Role-Based Access Control",
    "Encrypted Backups",
    "Network Isolation"
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Beranda', path: '/' },
    { label: 'DPA' }
  ], []);

  const handleDownloadDPA = useCallback(() => {
    // Logic download DPA
  }, []);

  const handleContactOfficer = useCallback(() => {
    window.open('mailto:dpo@absenta.id', '_blank');
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menyiapkan Dokumen Hukum...</p>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Persetujuan Pemrosesan Data (DPA)"
      description="Komitmen kami terhadap keamanan dan kepatuhan privasi data sekolah."
      hardeningModuleKey="dpa_page"
      instruction={{
        title: "Panduan DPA",
        description: "Dokumen DPA ini menjelaskan tanggung jawab teknis kami sebagai pemroses data untuk menjaga kerahasiaan dan integritas data institusi Anda.",
        items: [
          { text: "Pelajari bagaimana kami menangani data Anda." }
        ]
      }}
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-5xl mx-auto pb-24">
        {/* Executive Summary Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
        >
          {executiveSummaries?.map((card, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                {card.icon}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Nav */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Struktur DPA</h4>
              {structureItems?.map((item, i) => (
                <div key={i} className="text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer flex items-center gap-3 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
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
            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Ruang Lingkup Pemrosesan" icon={ClipboardList} fullWidth>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 not-prose mt-4">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Kategori Data</h4>
                    <ul className="space-y-2.5 list-none p-0">
                      {dataCategories?.map((t, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                          <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Subjek Data</h4>
                    <ul className="space-y-2.5 list-none p-0">
                      {dataSubjects?.map((t, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                          <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Peran & Tanggung Jawab" icon={Users} fullWidth>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 not-prose mt-4">
                  <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                    <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-wider mb-4">Pihak Sekolah (Pengendali)</p>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-3 font-medium">
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" /> Menentukan tujuan pemrosesan.</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" /> Memastikan dasar hukum yang sah.</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" /> Mengelola permintaan hak subjek data.</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                    <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-wider mb-4">{appName.split('.')[0]} (Pemroses)</p>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-3 font-medium">
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" /> Memproses sesuai instruksi tertulis.</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" /> Menjamin kerahasiaan penuh staf.</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" /> Langkah keamanan teknis yang kuat.</li>
                    </ul>
                  </div>
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <SectionCard title="Keamanan Teknis & Organisasi" icon={Lock} fullWidth>
                <div className="flex flex-wrap gap-3 not-prose mt-4">
                  {technicalMeasures?.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5 shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.section>

            <motion.section variants={itemVariants} className="mb-14">
              <div className="p-8 rounded-2xl bg-rose-600 text-white shadow-2xl shadow-rose-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-rose-200" />
                    <h4 className="text-white font-black uppercase tracking-tight m-0">Protokol Insiden 24-Jam</h4>
                  </div>
                  <p className="text-rose-50 m-0 leading-relaxed font-medium">
                    Pemroses Data wajib memberitahukan Pengendali Data dalam waktu maksimal 24 jam setelah mendeteksi adanya insiden kebocoran atau pelanggaran data pribadi. Pemberitahuan mencakup dampak, mitigasi, dan langkah korektif.
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
                  onClick={handleDownloadDPA}
                  className="px-8 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  Download Master DPA
                </button>
                <button 
                  onClick={handleContactOfficer}
                  className="px-8 py-3.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
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

export default function DataProcessingAgreementPage() {
  return (
    <DataProcessingAgreementContent />
  );
}
