import React from 'react';
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
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, Button, Badge } from '../../components/ui';
import { AcademicPageLayout } from "../../components/academic/AcademicPageLayout";

const AcademicDashboard: React.FC = () => {
  const navigate = useNavigate();

  const academicModules = [
    {
      title: 'Tahun Pelajaran',
      description: 'Kelola kalender & periode akademik',
      icon: Calendar,
      path: '/academic/tahun-pelajaran',
      gradient: 'from-rose-500 to-pink-600',
      badge: 'Master'
    },
    {
      title: 'Semester',
      description: 'Pengaturan fase belajar aktif',
      icon: Clock,
      path: '/academic/semester',
      gradient: 'from-indigo-500 to-blue-600',
      badge: 'Master'
    },
    {
      title: 'Jurusan',
      description: 'Program studi & kompetensi keahlian',
      icon: School,
      path: '/academic/jurusan',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Mata Pelajaran',
      description: 'Kurikulum & katalog pelajaran',
      icon: BookOpen,
      path: '/academic/mapel',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Data Guru',
      description: 'Profil pendidik & tenaga kependidikan',
      icon: Users,
      path: '/academic/guru',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Data Kelas',
      description: 'Manajemen rombongan belajar',
      icon: Award,
      path: '/academic/kelas',
      gradient: 'from-purple-500 to-violet-600'
    },
    {
      title: 'Registrasi Siswa',
      description: 'Aktivasi & pendaftaran semesteran',
      icon: GraduationCap,
      path: '/academic/registrasi-siswa',
      gradient: 'from-green-500 to-emerald-600',
      featured: true
    },
    {
      title: 'Transisi Siswa',
      description: 'Proses kenaikan & kelulusan massal',
      icon: LayoutGrid,
      path: '/academic/transition',
      gradient: 'from-indigo-600 to-purple-700'
    },
    {
      title: 'Backup & Seed',
      description: 'Arsip & sinkronisasi data sistem',
      icon: Database,
      path: '/academic/backup',
      gradient: 'from-slate-500 to-slate-700'
    }
  ];

  return (
    <AcademicPageLayout
      title="Pusat Kendali Akademik"
      description="Kelola seluruh infrastruktur data dan operasional pendidikan dalam satu dashboard terintegrasi."
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
      <div className="relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 lg:p-10 relative z-10">
          {academicModules.map((module, index) => (
            <motion.div
              key={module.path}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              whileHover={{ y: -5 }}
            >
              <Card
                onClick={() => navigate(module.path)}
                className={`group relative h-full overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:border-transparent transition-all duration-500 cursor-pointer rounded-3xl shadow-sm hover:shadow-2xl active:scale-[0.98] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ${module.featured ? 'lg:scale-105 z-10' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <CardContent className="relative z-10 p-8 h-full flex flex-col justify-between group-hover:bg-transparent transition-colors duration-500">
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-white/20 transition-all duration-500`}>
                        <module.icon className="h-8 w-8" />
                      </div>
                      {module.badge && (
                        <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase py-1 border-slate-200 dark:border-slate-800 group-hover:border-white/40 group-hover:text-white">
                          {module.badge}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-2 group-hover:text-white transition-colors duration-500">
                      {module.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-white/80 transition-colors duration-500 leading-relaxed">
                      {module.description}
                    </p>
                  </div>

                  <div className="mt-10 flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:border-white/30 transition-colors duration-500">
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                      Buka Modul
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="px-6 lg:px-10 pb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 lg:p-14 relative overflow-hidden group shadow-2xl shadow-blue-500/10"
          >
            <div className="absolute right-0 top-0 w-2/3 h-full bg-gradient-to-l from-blue-600/20 via-purple-600/10 to-transparent blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <Settings className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black text-blue-400 border-blue-500/30 tracking-widest uppercase px-4 py-1.5 rounded-full bg-blue-500/5">Konfigurasi Sistem Lanjutan</Badge>
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-[0.9]">
                  Optimalkan Infrastruktur <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 italic">Akademik Sekolah</span>
                </h2>
                <p className="text-slate-400 text-base leading-relaxed max-w-md">
                  Pastikan seluruh sinkronisasi data siswa dan pemetaan kelas dilakukan secara berkala untuk akurasi laporan absensi dan jurnal mengajar yang valid secara hukum.
                </p>
                <Button variant="outline" className="rounded-xl border-slate-700 text-white hover:bg-white hover:text-slate-900 font-bold uppercase tracking-widest text-[10px] h-12 px-8">
                  Pelajari Selengkapnya
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: 'Otomatisasi Semester', color: 'bg-emerald-500', icon: Sparkles },
                  { label: 'Sinkronisasi Cloud', color: 'bg-blue-500', icon: RefreshCw },
                  { label: 'Audit Log Sistem', color: 'bg-purple-500', icon: ShieldCheck },
                  { label: 'Pemulihan Kilat', color: 'bg-orange-500', icon: Database }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    className="bg-white/5 border border-white/10 p-6 rounded-xl transition-all group/item"
                  >
                    <div className={`w-3 h-3 rounded-full ${item.color} mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] shadow-current`} />
                    <p className="text-[11px] font-black text-white uppercase tracking-[0.15em] leading-tight">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default AcademicDashboard;
