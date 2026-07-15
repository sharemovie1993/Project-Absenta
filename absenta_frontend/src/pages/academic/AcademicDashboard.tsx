import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  Calendar,
  Clock,
  School,
  Database,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  Settings,
  RefreshCw,
  ShieldCheck,
  ClipboardList,
  Network,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, Button, Badge } from '../../components/ui';
import { AcademicPageLayout } from "../../components/academic/AcademicPageLayout";
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { getPrepChecklist, type PrepChecklistData } from '../../api/academic/cetak-berkas.api';

const AcademicDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [checklistData, setChecklistData] = useState<PrepChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statsRes, checklistRes] = await Promise.all([
          getAcademicStats(),
          getPrepChecklist()
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (checklistRes.success) setChecklistData(checklistRes.data);
      } catch (error) {
        console.error('Failed to load academic dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const masterModules = [
    {
      title: 'Tahun Pelajaran',
      description: 'Kelola kalender & periode akademik',
      icon: Calendar,
      path: '/academic/tahun-pelajaran',
      gradient: 'from-rose-500 to-pink-600',
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30'
    },
    {
      title: 'Semester',
      description: 'Pengaturan fase belajar aktif',
      icon: Clock,
      path: '/academic/semester',
      gradient: 'from-indigo-500 to-blue-600',
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
    },
    {
      title: 'Jurusan',
      description: 'Program studi & kompetensi keahlian',
      icon: School,
      path: '/academic/jurusan',
      gradient: 'from-emerald-500 to-teal-600',
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      title: 'Mata Pelajaran',
      description: 'Kurikulum & katalog pelajaran',
      icon: BookOpen,
      path: '/academic/mapel',
      gradient: 'from-amber-500 to-orange-600',
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
    },
    {
      title: 'Data Guru',
      description: 'Profil pendidik & tenaga kependidikan',
      icon: Users,
      path: '/academic/guru',
      gradient: 'from-blue-500 to-cyan-600',
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30'
    },
    {
      title: 'Data Kelas',
      description: 'Manajemen rombongan belajar',
      icon: Award,
      path: '/academic/kelas',
      gradient: 'from-purple-500 to-violet-600',
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30'
    },
    {
      title: 'Struktur Organisasi',
      description: 'Bagan organisasi & penugasan staf',
      icon: Network,
      path: '/academic/struktur-organisasi',
      gradient: 'from-cyan-500 to-blue-600',
      color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
    }
  ];

  const workflowModules = [
    {
      title: 'Registrasi Siswa',
      description: 'Aktivasi & pendaftaran semesteran',
      icon: GraduationCap,
      path: '/academic/registrasi-siswa',
      gradient: 'from-green-500 to-emerald-600',
      color: 'text-green-500 bg-green-50 dark:bg-green-950/30',
      featured: true
    },
    {
      title: 'Persiapan & Cetak TU',
      description: 'Checklist Tahun Baru & Cetak Administrasi',
      icon: ClipboardList,
      path: '/academic/prep-checklist',
      gradient: 'from-blue-600 to-indigo-700',
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
      featured: true,
      badge: 'TU'
    },
    {
      title: 'Transisi Siswa',
      description: 'Proses kenaikan & kelulusan massal',
      icon: LayoutGrid,
      path: '/academic/transition',
      gradient: 'from-indigo-600 to-purple-700',
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
    },
    {
      title: 'Backup & Seed',
      description: 'Arsip & sinkronisasi data sistem',
      icon: Database,
      path: '/academic/backup',
      gradient: 'from-slate-500 to-slate-700',
      color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/30'
    }
  ];

  return (
    <AcademicPageLayout
      title="Pusat Kendali Akademik"
      description="Kelola seluruh infrastruktur data dan operasional pendidikan dalam satu dashboard terintegrasi."
      isLoading={isLoading}
      instruction={{
        title: "Panduan Modul Akademik",
        description: "Gunakan modul ini untuk membangun pondasi data sekolah. Pastikan data master (Tahun & Semester) diatur terlebih dahulu.",
        items: [
          { text: "Lakukan Registrasi Siswa di awal setiap semester." },
          { text: "Gunakan Transisi Akademik untuk kenaikan kelas massal." },
          { text: "Cadangkan data secara berkala melalui menu Backup." }
        ]
      }}
    >
      <div className="relative overflow-hidden space-y-8">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header Banner: Active Period & Prep Checklist Progress */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400 bg-indigo-500/10 px-3.5 py-1.5 rounded-full border border-indigo-500/20">
                Tahun Ajaran Aktif
              </span>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight uppercase">
                {stats?.tahun_pelajaran?.tahun || 'Belum Diatur'}
              </h2>
              <p className="text-slate-300 text-sm font-medium">
                Semester {stats?.semester?.nama_semester || 'Belum Diatur'}
              </p>
            </div>
            
            {checklistData && (
              <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">Kesiapan Tahun Pelajaran</span>
                  <span className="text-sm font-black text-indigo-400">{checklistData.completion_percentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-1000" 
                    style={{ width: `${checklistData.completion_percentage}%` }} 
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {checklistData.completion_percentage === 100 
                    ? "Semua checklist konfigurasi sistem sudah selesai!" 
                    : `${checklistData.checklist.filter(item => !item.completed).length} langkah setup tersisa.`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Grid metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Tenaga Pendidik",
              value: stats?.total_guru || 0,
              subtitle: "Total guru & staf",
              icon: <Users />,
              gradient: "from-blue-500 to-blue-700 text-white",
              onClick: () => navigate('/academic/guru')
            },
            {
              label: "Peserta Didik",
              value: stats?.total_siswa || 0,
              subtitle: "Total siswa aktif",
              icon: <GraduationCap />,
              gradient: "from-emerald-500 to-emerald-700 text-white",
              onClick: () => navigate('/academic/siswa')
            },
            {
              label: "Rombongan Belajar",
              value: stats?.total_kelas || 0,
              subtitle: `${stats?.total_jurusan || 0} bidang kompetensi`,
              icon: <School />,
              gradient: "from-purple-500 to-purple-700 text-white",
              onClick: () => navigate('/academic/kelas')
            },
            {
              label: "Mata Pelajaran",
              value: stats?.total_mapel || 0,
              subtitle: "Total mapel terdaftar",
              icon: <BookOpen />,
              gradient: "from-amber-500 to-amber-700 text-white",
              onClick: () => navigate('/academic/mapel')
            }
          ].map((card, idx) => (
            <AnalyticsCard
              key={idx}
              title={card.label}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              gradient={card.gradient}
              onClick={card.onClick}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* 3. Main content grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Module Navigation Grouped */}
          <div className="lg:col-span-2 space-y-8">
            {/* Group 1: Data Master */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                <Database size={14} /> Data Master & Referensi
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {masterModules.map((mod, index) => (
                  <motion.div
                    key={mod.path}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(mod.path)}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-4 group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${mod.color} shadow-sm shadow-current/5`}>
                      <mod.icon size={22} className="group-hover:rotate-6 transition-transform duration-300" />
                    </div>
                    <div className="space-y-0.5 truncate">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {mod.title}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                        {mod.description}
                      </p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:translate-x-1 transition-all" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Group 2: Operasional */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                <Sparkles size={14} /> Alur Kerja & Operasional
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workflowModules.map((mod, index) => (
                  <motion.div
                    key={mod.path}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(mod.path)}
                    className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-4 group ${
                      mod.featured 
                        ? 'bg-gradient-to-br from-indigo-50/40 to-blue-50/10 border-indigo-100 dark:from-indigo-950/20 dark:to-blue-950/5 dark:border-indigo-900/40' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${mod.color} shadow-sm shadow-current/5`}>
                      <mod.icon size={22} className="group-hover:rotate-6 transition-transform duration-300" />
                    </div>
                    <div className="space-y-0.5 truncate">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        {mod.title}
                        {mod.featured && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                        {mod.description}
                      </p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:translate-x-1 transition-all" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Interactive Checklist & Summary */}
          <div className="space-y-6">
            {checklistData && (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800/80 pb-3">
                  <ClipboardList size={18} className="text-indigo-500" /> Checklist Kesiapan
                </h3>
                
                <div className="space-y-4">
                  {checklistData.checklist.map((item, idx) => (
                    <div 
                      key={item.key}
                      onClick={() => navigate(item.action_path)}
                      className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.completed ? (
                          <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/10" />
                        ) : (
                          <AlertTriangle size={16} className="text-amber-500 fill-amber-500/10" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {idx + 1}. {item.label}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-normal">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default AcademicDashboard;
