import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Search,
  Zap,
  Building2,
  Layers,
  Sparkles,
  Loader2,
  Calendar,
  Users,
  FileText,
  ShieldCheck,
  CalendarDays,
  Printer,
  Activity,
  LayoutGrid,
  GraduationCap,
  ClipboardList,
  ShieldAlert,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { useSmartMenu } from '@/hooks/useSmartMenu';
import { useAuthStore } from '@/store/authStore';
import {
  normalizeFlatMenu,
  filterNavByWorkspace,
  getAllUserCrossModuleItems,
  type FlatMenuItem
} from '@/helpers/workspaceNavFilter';
import { ROLE_WORKSPACES, resolveUserWorkspaces } from '@/config/navigation.config';
import { iconForName } from '@/lib/iconForName';
import { cn } from '@/lib/utils';

export interface WorkspaceAppLauncherCardProps {
  /**
   * ID Workspace Target (e.g. 'KURIKULUM_WORKSPACE', 'KESISWAAN_WORKSPACE', 'PIKET_WORKSPACE', 'WALIKELAS_WORKSPACE')
   */
  workspaceId?: string;
  /**
   * Override judul modul (opsional).
   */
  customTitle?: string;
  /**
   * Override subtitle/deskripsi (opsional).
   */
  customSubtitle?: string;
  /**
   * Jika true, sembunyikan kartu jika kosong.
   */
  hideIfEmpty?: boolean;
  /**
   * ClassName tambahan.
   */
  className?: string;
}

// Gradient palette mewah untuk Squircle App Icons (Apple/Web Portal style)
const TILE_GRADIENTS = [
  { gradient: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white', shadow: 'shadow-indigo-500/30 dark:shadow-indigo-950/50', border: 'border-indigo-400/30' },
  { gradient: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white', shadow: 'shadow-blue-500/30 dark:shadow-blue-950/50', border: 'border-blue-400/30' },
  { gradient: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white', shadow: 'shadow-emerald-500/30 dark:shadow-emerald-950/50', border: 'border-emerald-400/30' },
  { gradient: 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white', shadow: 'shadow-amber-500/30 dark:shadow-amber-950/50', border: 'border-amber-400/30' },
  { gradient: 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white', shadow: 'shadow-purple-500/30 dark:shadow-purple-950/50', border: 'border-purple-400/30' },
  { gradient: 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white', shadow: 'shadow-rose-500/30 dark:shadow-rose-950/50', border: 'border-rose-400/30' },
  { gradient: 'bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white', shadow: 'shadow-teal-500/30 dark:shadow-teal-950/50', border: 'border-teal-400/30' },
  { gradient: 'bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 text-white', shadow: 'shadow-cyan-500/30 dark:shadow-cyan-950/50', border: 'border-cyan-400/30' },
  { gradient: 'bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 text-white', shadow: 'shadow-sky-500/30 dark:shadow-sky-950/50', border: 'border-sky-400/30' },
  { gradient: 'bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 text-white', shadow: 'shadow-violet-500/30 dark:shadow-violet-950/50', border: 'border-violet-400/30' },
];

// Fallback items untuk Kurikulum jika menu backend belum dimuat
const DEFAULT_KURIKULUM_PRIMARY: FlatMenuItem[] = [
  { id: 'str', title: 'Struktur Kurikulum', path: '/kurikulum/struktur', icon: 'Layers' },
  { id: 'jdw', title: 'Jadwal KBM', path: '/kurikulum/jadwal', icon: 'Calendar' },
  { id: 'gmp', title: 'Guru Mapel', path: '/kurikulum/guru-mapel', icon: 'Users' },
  { id: 'prg', title: 'Perangkat Ajar', path: '/kurikulum/perangkat', icon: 'FileText' },
  { id: 'spv', title: 'Supervisi Guru', path: '/kurikulum/supervisi', icon: 'ShieldCheck' },
  { id: 'kld', title: 'Kalender Akad.', path: '/kurikulum/kalender', icon: 'CalendarDays' },
  { id: 'ctk', title: 'Cetak Berkas', path: '/kurikulum/cetak', icon: 'Printer' },
  { id: 'evg', title: 'Evaluasi Guru', path: '/kurikulum/evaluasi-kinerja', icon: 'Award' },
  { id: 'mon', title: 'Monitor KBM', path: '/attendance/monitoring', icon: 'Activity' },
];

const DEFAULT_KURIKULUM_CROSS: FlatMenuItem[] = [
  { id: 'rmb', title: 'Rombel Kelas', path: '/academic/kelas', icon: 'LayoutGrid' },
  { id: 'sis', title: 'Data Siswa', path: '/academic/siswa', icon: 'GraduationCap' },
  { id: 'pkt', title: 'Meja Piket', path: '/dashboard?tab=kelola&subtab=GURU_KBM', icon: 'Building2' },
  { id: 'grb', title: 'Presensi Gerbang', path: '/attendance/gerbang', icon: 'Zap' },
  { id: 'rkp', title: 'Rekap Presensi', path: '/attendance/rekap', icon: 'ClipboardList' },
  { id: 'ttb', title: 'Tata Tertib', path: '/kesiswaan/pelanggaran', icon: 'ShieldAlert' },
  { id: 'kpt', title: 'Kepatuhan App', path: '/management/platform-compliance', icon: 'Smartphone' },
];

const DEFAULT_ADMIN_PRIMARY: FlatMenuItem[] = [
  { id: 'sis', title: 'Data Siswa', path: '/academic/siswa', icon: 'GraduationCap' },
  { id: 'gru', title: 'Data Guru', path: '/academic/guru', icon: 'Users' },
  { id: 'kls', title: 'Rombel Kelas', path: '/academic/kelas', icon: 'LayoutGrid' },
  { id: 'mpl', title: 'Mata Pelajaran', path: '/academic/mapel', icon: 'BookOpen' },
  { id: 'thp', title: 'Tahun Ajaran', path: '/academic/tahun-pelajaran', icon: 'Calendar' },
  { id: 'smt', title: 'Semester', path: '/academic/semester', icon: 'CalendarDays' },
  { id: 'jrs', title: 'Jurusan', path: '/academic/jurusan', icon: 'Briefcase' },
  { id: 'ops', title: 'Operasional Absen', path: '/attendance/ops', icon: 'Activity' },
  { id: 'kpt', title: 'Kepatuhan App', path: '/management/platform-compliance', icon: 'Smartphone' },
  { id: 'usr', title: 'Kelola User', path: '/users', icon: 'UserCog' },
  { id: 'stg', title: 'Pengaturan', path: '/settings', icon: 'Settings' },
];

const DEFAULT_ADMIN_CROSS: FlatMenuItem[] = [
  { id: 'krd', title: 'Kurikulum', path: '/kurikulum/dashboard', icon: 'ShieldCheck' },
  { id: 'ksd', title: 'Kesiswaan', path: '/kesiswaan/monitoring', icon: 'Users' },
  { id: 'srp', title: 'Sarpras', path: '/sarpras/dashboard', icon: 'Building2' },
  { id: 'hbn', title: 'Hubin', path: '/hubin/dashboard', icon: 'Briefcase' },
  { id: 'bkd', title: 'BP/BK', path: '/bpbk/dashboard', icon: 'HeartHandshake' },
  { id: 'rpr', title: 'Rapor', path: '/rapor/dashboard', icon: 'Award' },
  { id: 'kop', title: 'Koperasi', path: '/cooperative/dashboard', icon: 'Wallet' },
  { id: 'rkp', title: 'Rekap Presensi', path: '/attendance/rekap', icon: 'ClipboardList' },
];

export const WorkspaceAppLauncherCard: React.FC<WorkspaceAppLauncherCardProps> = ({
  workspaceId: targetWorkspaceIdProp,
  customTitle,
  customSubtitle,
  hideIfEmpty = false,
  className
}) => {
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  const { menu: backendGroupedMenu, isLoading: isMenuLoading } = useSmartMenu();

  // 1. Resolve Target Workspace
  const userWorkspaces = useMemo(() => resolveUserWorkspaces(user), [user]);

  const targetWorkspace = useMemo(() => {
    if (targetWorkspaceIdProp) {
      const found = ROLE_WORKSPACES.find(w => w.id === targetWorkspaceIdProp)
        || userWorkspaces.find(w => w.id === targetWorkspaceIdProp);
      if (found) return found;
    }
    return userWorkspaces.find(w => w.id !== 'TEACHER_WORKSPACE' && w.id !== 'STUDENT_WORKSPACE')
      || userWorkspaces[0]
      || ROLE_WORKSPACES.find(w => w.id === 'KURIKULUM_WORKSPACE')
      || ROLE_WORKSPACES[0];
  }, [targetWorkspaceIdProp, userWorkspaces]);

  const activeWsId = targetWorkspace?.id || 'KURIKULUM_WORKSPACE';
  const wsLabel = targetWorkspace?.label || (targetWorkspace as any)?.name || 'Kurikulum';
  const displayTitle = customTitle || `Portal Kerja ${wsLabel}`;
  const displaySubtitle = customSubtitle || `Pusat kendali operasional, manajemen data, dan integrasi modul ${wsLabel}.`;

  // 2. Normalisasi Flat Items Dinamis dari Sidebar
  const flatItems = useMemo(() => normalizeFlatMenu(backendGroupedMenu || []), [backendGroupedMenu]);

  // SEGMENT 1 (Blok 3): Primary Workspace Items
  const primaryItems = useMemo<FlatMenuItem[]>(() => {
    if (!flatItems || flatItems.length === 0) {
      if (activeWsId === 'ADMIN_WORKSPACE') return DEFAULT_ADMIN_PRIMARY;
      return activeWsId === 'KURIKULUM_WORKSPACE' ? DEFAULT_KURIKULUM_PRIMARY : [];
    }

    let matchedItems: FlatMenuItem[] = [];

    if (activeWsId === 'ADMIN_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (
          p.startsWith('/academic') ||
          p.startsWith('/attendance/ops') ||
          p.startsWith('/management') ||
          p.startsWith('/users') ||
          p.startsWith('/settings') ||
          cat.includes('AKADEMIK') ||
          cat.includes('DATA MASTER') ||
          cat.includes('SISTEM')
        ) && p !== '/dashboard' && p !== '#';
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_ADMIN_PRIMARY;
    } else if (activeWsId === 'KURIKULUM_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/kurikulum') || cat.includes('KURIKULUM')) && p !== '/kurikulum/dashboard' && p !== '#';
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_KURIKULUM_PRIMARY;
    } else if (activeWsId === 'KESISWAAN_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/kesiswaan') || cat.includes('KESISWAAN')) && p !== '/kesiswaan/dashboard' && p !== '#';
      });
    } else {
      const { primaryItems: filtered } = filterNavByWorkspace(flatItems, user, activeWsId);
      matchedItems = filtered.filter(item => {
        const p = (item.path || '').toLowerCase();
        return p && p !== '#' && p !== '/dashboard' && !p.startsWith('menu:');
      });
    }

    return matchedItems;
  }, [flatItems, user, activeWsId]);

  // SEGMENT 2 (Blok 4): Cross Module Items
  const crossItems = useMemo<FlatMenuItem[]>(() => {
    if (!flatItems || flatItems.length === 0) {
      if (activeWsId === 'ADMIN_WORKSPACE') return DEFAULT_ADMIN_CROSS;
      return activeWsId === 'KURIKULUM_WORKSPACE' ? DEFAULT_KURIKULUM_CROSS : [];
    }

    const primaryPathSet = new Set(primaryItems.map(i => (i.path || '').toLowerCase()).filter(Boolean));
    const allCross = getAllUserCrossModuleItems(flatItems, user, primaryPathSet);
    
    if (allCross.length === 0) {
      if (activeWsId === 'ADMIN_WORKSPACE') return DEFAULT_ADMIN_CROSS;
      if (activeWsId === 'KURIKULUM_WORKSPACE') return DEFAULT_KURIKULUM_CROSS;
    }
    
    return allCross.slice(0, 10);
  }, [flatItems, user, primaryItems, activeWsId]);

  // Search filtering
  const filteredPrimary = useMemo(() => {
    if (!search.trim()) return primaryItems;
    const q = search.toLowerCase();
    return primaryItems.filter(
      item => item.title.toLowerCase().includes(q) || (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q))
    );
  }, [primaryItems, search]);

  const filteredCross = useMemo(() => {
    if (!search.trim()) return crossItems;
    const q = search.toLowerCase();
    return crossItems.filter(
      item => item.title.toLowerCase().includes(q) || (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q))
    );
  }, [crossItems, search]);

  if (hideIfEmpty && primaryItems.length === 0 && crossItems.length === 0 && !isMenuLoading) {
    return null;
  }

  return (
    <div className={cn("space-y-4 w-full select-none", className)}>
      {/* ── HERO BANNER: Web Portal Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-5 sm:p-7 text-white shadow-xl shadow-indigo-950/20">
        {/* Ambient Decorative Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                <Sparkles size={11} className="text-indigo-300" />
                <span>PORTAL RESMI {wsLabel.toUpperCase()}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Akademik Aktif</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              {displayTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              {displaySubtitle}
            </p>
          </div>

          {/* Floating Search Hub & Quick Controls */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
            <div className="relative w-full lg:w-72">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari aplikasi..."
                className="w-full h-11 pl-10 pr-4 text-xs font-semibold rounded-2xl bg-white/10 hover:bg-white/15 focus:bg-white/20 backdrop-blur-md border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all shadow-inner"
              />
            </div>
            <div className="shrink-0 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-1 shadow-inner flex items-center justify-center">
              <TvModeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* ── BENTO APP LAUNCHER: 2 Segmen Grid Modern ── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
        {/* SEGMENT 1: 🏛️ Ruang Kerja Utama (Blok 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-xs font-bold shadow-2xs">
                🏛️
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Ruang Kerja Utama {wsLabel}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Aplikasi operasional inti untuk pengelolaan KBM, guru, dan berkas kurikulum
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredPrimary.length} Modul
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4 pt-1">
            {filteredPrimary.map((item, idx) => {
              const IconComp = iconForName(item.icon) || Layers;
              const palette = TILE_GRADIENTS[idx % TILE_GRADIENTS.length];
              const targetPath = item.path || '#';

              return (
                <Link
                  key={item.id || idx}
                  to={targetPath}
                  title={item.title}
                  className="group flex flex-col items-center justify-start p-2 sm:p-2.5 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-all duration-200 cursor-pointer text-center w-full max-w-[100px] sm:max-w-[110px] mx-auto select-none"
                >
                  {/* Smartphone Squircle App Icon + 🪞 Ultra-Smooth Seamless Mirror Reflection */}
                  <div className="relative flex flex-col items-center">
                    {/* Soft Colored Ambient Glow */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-40 blur-md transition-all duration-300 pointer-events-none",
                        palette.gradient
                      )}
                    />

                    {/* Main Squircle App Icon */}
                    <div
                      className={cn(
                        "relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 group-active:scale-95 border",
                        palette.gradient,
                        palette.border
                      )}
                    >
                      <IconComp size={24} className="stroke-[2.2]" />

                      {item.isPremium && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-rose-500 text-white shadow-xs leading-none ring-2 ring-white dark:ring-slate-900">
                          PRO
                        </span>
                      )}
                    </div>

                    {/* 🪞 Apple macOS Dock Ultra-Smooth Mirror Reflection (100% Seamless Fade) */}
                    <div
                      aria-hidden="true"
                      style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                      }}
                      className={cn(
                        "w-11 h-4 sm:w-13 sm:h-5 rounded-b-xl opacity-35 group-hover:opacity-55 transition-all duration-300 blur-[1px] scale-y-[-1] -mt-0.5 pointer-events-none select-none overflow-hidden flex items-start justify-center",
                        palette.gradient
                      )}
                    >
                      <IconComp size={22} className="stroke-[2] -mt-2 opacity-50" />
                    </div>

                    {/* Soft Contact Floor Shadow */}
                    <div className="w-8 sm:w-10 h-1 bg-slate-900/10 dark:bg-black/30 rounded-full blur-[2px] -mt-3.5 group-hover:scale-110 group-hover:opacity-30 transition-all duration-300 pointer-events-none" />
                  </div>

                  {/* App Name Under Icon */}
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 leading-tight line-clamp-2 text-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* SEGMENT 2: 🔗 Informasi Lintas Modul (Blok 4) */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-xs font-bold shadow-2xs">
                🔗
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Informasi &amp; Akses Lintas Modul
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Pintasan cepat ke data rombel, presensi gerbang, dan rekap kesiswaan
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredCross.length} Pintasan
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4 pt-1">
            {filteredCross.map((item, idx) => {
              const IconComp = iconForName(item.icon) || Zap;
              const palette = TILE_GRADIENTS[(idx + 4) % TILE_GRADIENTS.length];
              const targetPath = item.path || '#';

              return (
                <Link
                  key={item.id || idx}
                  to={targetPath}
                  title={item.title}
                  className="group flex flex-col items-center justify-start p-2 sm:p-2.5 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-all duration-200 cursor-pointer text-center w-full max-w-[100px] sm:max-w-[110px] mx-auto select-none"
                >
                  {/* Smartphone Squircle App Icon + 🪞 Ultra-Smooth Seamless Mirror Reflection */}
                  <div className="relative flex flex-col items-center">
                    {/* Soft Colored Ambient Glow */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-40 blur-md transition-all duration-300 pointer-events-none",
                        palette.gradient
                      )}
                    />

                    {/* Main Squircle App Icon */}
                    <div
                      className={cn(
                        "relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 group-active:scale-95 border",
                        palette.gradient,
                        palette.border
                      )}
                    >
                      <IconComp size={24} className="stroke-[2.2]" />
                    </div>

                    {/* 🪞 Apple macOS Dock Ultra-Smooth Mirror Reflection (100% Seamless Fade) */}
                    <div
                      aria-hidden="true"
                      style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                      }}
                      className={cn(
                        "w-11 h-4 sm:w-13 sm:h-5 rounded-b-xl opacity-35 group-hover:opacity-55 transition-all duration-300 blur-[1px] scale-y-[-1] -mt-0.5 pointer-events-none select-none overflow-hidden flex items-start justify-center",
                        palette.gradient
                      )}
                    >
                      <IconComp size={22} className="stroke-[2] -mt-2 opacity-50" />
                    </div>

                    {/* Soft Contact Floor Shadow */}
                    <div className="w-8 sm:w-10 h-1 bg-slate-900/10 dark:bg-black/30 rounded-full blur-[2px] -mt-3.5 group-hover:scale-110 group-hover:opacity-30 transition-all duration-300 pointer-events-none" />
                  </div>

                  {/* App Name Under Icon */}
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 leading-tight line-clamp-2 text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
