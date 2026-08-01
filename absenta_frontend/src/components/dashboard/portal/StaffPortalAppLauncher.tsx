/**
 * StaffPortalAppLauncher.tsx
 * Tampilan Portal Menu Android-Style Launcher untuk Wali Kelas & Guru.
 * Menyediakan navigasi berbasis ikon grid yang intuitif, cepat, dan responsif.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Users,
  Activity,
  Award,
  FileText,
  Printer,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  GraduationCap,
  CheckCircle2,
  User,
  Settings,
  Search,
  Monitor,
  LayoutGrid,
  ChevronRight,
  UserCog,
  HeartHandshake,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

export interface StaffPortalAppLauncherProps {
  user: any;
  jabatanLabel: string;
  isWaliKelas: boolean;
  waliKelasId?: string;
  absentStudentsCount?: number;
  onSwitchToDesktop: () => void;
  onOpenJurnalModal: () => void;
  onOpenAbsenGuruModal: () => void;
  onOpenCatatPelanggaranModal: () => void;
  onOpenTindakMasalModal: () => void;
}

interface AppTile {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  badgeText?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'destructive' | 'info';
  action: () => void;
}

interface AppCategory {
  categoryTitle: string;
  categoryIcon: React.ElementType;
  categoryBadge?: string;
  items: AppTile[];
}

export const StaffPortalAppLauncher: React.FC<StaffPortalAppLauncherProps> = ({
  user,
  jabatanLabel,
  isWaliKelas,
  absentStudentsCount = 0,
  onSwitchToDesktop,
  onOpenJurnalModal,
  onOpenAbsenGuruModal,
  onOpenCatatPelanggaranModal,
  onOpenTindakMasalModal,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // ── Formulasi Kategori App Launchers ──
  const appCategories = useMemo<AppCategory[]>(() => {
    const list: AppCategory[] = [];

    // 1. OPERASIONAL WALI KELAS (Disorot Khusus)
    if (isWaliKelas) {
      list.push({
        categoryTitle: 'Operasional Wali Kelas',
        categoryIcon: Users,
        categoryBadge: 'Utama',
        items: [
          {
            id: 'wk-monitoring-kbm',
            title: 'Live KBM Kelas',
            description: 'Pantau status KBM & kehadiran jam ke jam',
            icon: Monitor,
            gradient: 'from-blue-600 to-indigo-600',
            badgeText: 'Live',
            badgeVariant: 'success',
            action: () => navigate('/kesiswaan/monitoring'),
          },
          {
            id: 'wk-rekap-absensi',
            title: 'Rekap Absensi',
            description: 'Monitoring kehadiran harian & bulanan',
            icon: Activity,
            gradient: 'from-emerald-500 to-teal-600',
            badgeText: absentStudentsCount > 0 ? `${absentStudentsCount} Absen` : undefined,
            badgeVariant: absentStudentsCount > 0 ? 'warning' : 'neutral',
            action: () => navigate('/attendance/rekap'),
          },
          {
            id: 'wk-catatan-rapor',
            title: 'Catatan & Leger',
            description: 'Isi catatan wali kelas & ranking siswa',
            icon: FileText,
            gradient: 'from-purple-600 to-indigo-700',
            action: () => navigate('/rapor/cetak'),
          },
          {
            id: 'wk-cetak-rapor',
            title: 'Cetak e-Rapor',
            description: 'Cetak lembar rapor resmi Kemendikbud',
            icon: Printer,
            gradient: 'from-indigo-500 to-blue-700',
            badgeText: 'PDF',
            badgeVariant: 'info',
            action: () => navigate('/rapor/cetak'),
          },
          {
            id: 'wk-tindak-lanjut',
            title: 'Risikolog Siswa',
            description: 'Tindak lanjut absensi & penanganan siswa',
            icon: AlertTriangle,
            gradient: 'from-amber-500 to-rose-600',
            action: () => navigate('/kesiswaan/risikolog'),
          },
        ],
      });
    }

    // 2. PENGAJARAN & AKADEMIK (GURU)
    list.push({
      categoryTitle: 'Pengajaran & Aktivitas Guru',
      categoryIcon: BookOpen,
      items: [
        {
          id: 'guru-jadwal',
          title: 'Jadwal Mengajar',
          description: 'Lihat jadwal pengajaran mingguan',
          icon: Calendar,
          gradient: 'from-sky-500 to-blue-600',
          action: () => navigate('/jadwal/saya'),
        },
        {
          id: 'guru-jurnal-kbm',
          title: 'Jurnal KBM',
          description: 'Isi jurnal pengajaran & materi kelas',
          icon: BookOpen,
          gradient: 'from-indigo-600 to-violet-600',
          action: onOpenJurnalModal,
        },
        {
          id: 'guru-absen-diri',
          title: 'Kehadiran Guru',
          description: 'Presensi harian & tap gerbang guru',
          icon: User,
          gradient: 'from-emerald-500 to-green-600',
          action: onOpenAbsenGuruModal,
        },
      ],
    });

    // 3. MODUL E-RAPOR & PENILAIAN
    list.push({
      categoryTitle: 'Modul Rapor & Penilaian (e-Rapor)',
      categoryIcon: Award,
      items: [
        {
          id: 'rapor-dash',
          title: 'Dashboard Rapor',
          description: 'Statistik & status pengisian rapor',
          icon: FileText,
          gradient: 'from-violet-600 to-purple-700',
          action: () => navigate('/rapor/dashboard'),
        },
        {
          id: 'rapor-input',
          title: 'Input Nilai',
          description: 'Entri nilai sumatif & formatif mapel',
          icon: Award,
          gradient: 'from-amber-500 to-orange-600',
          action: () => navigate('/rapor/input-nilai'),
        },
        {
          id: 'rapor-p5',
          title: 'Projek P5',
          description: 'Penilaian dimensi P5 & Kokurikuler',
          icon: Sparkles,
          gradient: 'from-pink-500 to-rose-600',
          badgeText: 'Kurikulum Merdeka',
          badgeVariant: 'info',
          action: () => navigate('/rapor/p5'),
        },
        {
          id: 'rapor-transkrip',
          title: 'Transkrip Nilai',
          description: 'Akumulasi transkrip kumulatif & GPA',
          icon: GraduationCap,
          gradient: 'from-cyan-600 to-blue-700',
          action: () => navigate('/rapor/transkrip'),
        },
      ],
    });

    // 4. KESISWAAN, DISIPLIN & BP/BK
    list.push({
      categoryTitle: 'Disiplin & Kesiswaan',
      categoryIcon: ShieldAlert,
      items: [
        {
          id: 'kes-catat-pelanggaran',
          title: 'Catat Pelanggaran',
          description: 'Input poin pelanggaran siswa',
          icon: ShieldAlert,
          gradient: 'from-rose-500 to-red-600',
          action: onOpenCatatPelanggaranModal,
        },
        {
          id: 'kes-tindak-masal',
          title: 'Tindak Masal',
          description: 'Pemberian sanksi / penanganan masal',
          icon: CheckCircle2,
          gradient: 'from-orange-500 to-amber-600',
          action: onOpenTindakMasalModal,
        },
        {
          id: 'kes-bpbk',
          title: 'Layanan BP/BK',
          description: 'Bimbingan konseling & kasus siswa',
          icon: HeartHandshake,
          gradient: 'from-teal-500 to-emerald-600',
          action: () => navigate('/bpbk'),
        },
      ],
    });

    // 5. PENGATURAN & SISTEM
    list.push({
      categoryTitle: 'Sistem & Pengaturan',
      categoryIcon: Settings,
      items: [
        {
          id: 'sys-profil',
          title: 'Profil Saya',
          description: 'Kelola identitas & data staf',
          icon: UserCog,
          gradient: 'from-slate-600 to-slate-800',
          action: () => navigate('/profile'),
        },
        {
          id: 'sys-settings',
          title: 'Pengaturan Akun',
          description: 'Keamanan, sandi & preferensi',
          icon: Settings,
          gradient: 'from-gray-700 to-slate-900',
          action: () => navigate('/settings'),
        },
      ],
    });

    return list;
  }, [
    isWaliKelas,
    absentStudentsCount,
    navigate,
    onOpenJurnalModal,
    onOpenAbsenGuruModal,
    onOpenCatatPelanggaranModal,
    onOpenTindakMasalModal,
  ]);

  // ── Filtered Categories berdasarkan Search Query ──
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return appCategories;

    return appCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [appCategories, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 w-full max-w-full min-w-0">
      {/* ── Top Portal Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200 text-xs font-semibold">
                Portal App Mode
              </Badge>
              {isWaliKelas && (
                <Badge variant="success" className="text-xs font-bold shadow-xs">
                  WALI KELAS
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Halo, {user?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
              Pusat Portal Fitur Operasional Guru & Wali Kelas. Pilih ikon aplikasi di bawah untuk menuju ke fitur yang dibutuhkan secara cepat.
            </p>
          </div>

          {/* Controls: Search & Switch Mode */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {/* Search Input */}
            <div className="relative min-w-[200px] w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cari fitur / menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-xs font-semibold pl-9 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <Search size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
            </div>

            {/* Switch to Desktop Mode */}
            <Button
              onClick={onSwitchToDesktop}
              className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs py-2.5 px-4 shadow-lg shadow-black/20 flex items-center gap-2 whitespace-nowrap"
            >
              <LayoutGrid size={15} className="text-indigo-600" />
              <span>Mode Desktop 🖥️</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── App Categories Grid (Android Launcher Style) ── */}
      <div className="space-y-8">
        {filteredCategories.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-3">
            {/* Category Header Title */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <cat.categoryIcon size={16} />
                </div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                  {cat.categoryTitle}
                </h2>
                {cat.categoryBadge && (
                  <Badge variant="info" className="text-[10px] py-0 px-2 font-bold">
                    {cat.categoryBadge}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {cat.items.length} Fitur Available
              </span>
            </div>

            {/* Icon Tiles Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {cat.items.map((tile) => {
                const TileIcon = tile.icon;
                return (
                  <button
                    key={tile.id}
                    onClick={tile.action}
                    className="group relative flex flex-col items-start p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden cursor-pointer"
                  >
                    {/* Background Accent Hover Effect */}
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

                    {/* App Icon Box */}
                    <div className="flex items-center justify-between w-full mb-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <TileIcon size={22} className="stroke-[2.2]" />
                      </div>

                      {tile.badgeText && (
                        <Badge variant={tile.badgeVariant || 'neutral'} className="text-[10px] font-bold py-0.5 px-2">
                          {tile.badgeText}
                        </Badge>
                      )}
                    </div>

                    {/* App Title & Description */}
                    <div className="space-y-1 w-full min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {tile.title}
                        </h3>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                        {tile.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
