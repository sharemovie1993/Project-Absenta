import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  BookOpen,
  Users,
  ShieldCheck,
  Building,
  Briefcase,
  ShoppingCart,
  ClipboardList,
  User,
  Calendar,
  Clock,
  Home,
  MailCheck,
  HeartPulse,
  Scale,
  Trophy,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { getUserPositions } from '@/config/navigation.config';

export interface MobileBottomSubItem {
  id: string;
  label: string;
  icon: any;
  targetPath: string;
  badge?: string | number | null;
}

export interface MobileBottomTabItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  badge?: string;
  targetPath: string;
  isActive: (pathname: string, currentTabParam: string | null) => boolean;
  children?: MobileBottomSubItem[];
}

export const BottomNavigation: React.FC = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);

  const {
    isAdmin,
    isSarpras,
    isHubin,
    isKurikulum,
    isToolman,
    isKaprog,
    isKabeng,
    isBpbk,
    isBkk,
    isGerbang,
    isPiketGuru,
    isTU,
    isTUKepegawaian,
    isKepsek,
    isWaliKelas: isWaliKelasFromCaps,
    isKesiswaan,
    isKoperasi,
    isSiswa,
  } = useCapabilities();

  const guruProfile = user?.guru_profile;
  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const isAdminRole = isAdmin || roleName === 'ADMIN' || roleName === 'SUPERADMIN';
  const isTuStaff = user?.role === 'TU' || isTU || (guruProfile?.is_tu ?? false);

  const isWaliKelas = isWaliKelasFromCaps ||
    !!guruProfile?.wali_kelas_di?.id ||
    !!((user?.guru_profile as any)?.wali_kelas_di?.id);

  const waliKelasNama = guruProfile?.wali_kelas_di?.nama_kelas ||
    (user?.guru_profile as any)?.wali_kelas_di?.nama_kelas || '';

  const currentTab = searchParams.get('tab');
  const currentSubtab = searchParams.get('subtab');

  // Close floating flyout ONLY when navigating to a different page route (pathname change)
  useEffect(() => {
    setOpenFlyoutId(null);
  }, [location.pathname]);

  // Don't render for Parent App as it has its own parent layout
  if (location.pathname.startsWith('/parent-app')) {
    return null;
  }

  // 1. Siswa Mobile Bottom Tabs
  const siswaTabs = useMemo<MobileBottomTabItem[]>(() => [
    {
      id: 'beranda',
      label: 'Beranda',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard',
      isActive: (pathname) => pathname === '/dashboard' || pathname === '/dashboard/',
    },
    {
      id: 'jadwal',
      label: 'Jadwal KBM',
      shortLabel: 'Jadwal',
      icon: Calendar,
      targetPath: '/kbm/jadwal',
      isActive: (pathname) => pathname.startsWith('/kbm/jadwal'),
    },
    {
      id: 'presensi',
      label: 'Presensi',
      shortLabel: 'Absensi',
      icon: Clock,
      targetPath: '/my-attendance',
      isActive: (pathname) => pathname.startsWith('/my-attendance'),
    },
    {
      id: 'profil',
      label: 'Profil',
      shortLabel: 'Profil',
      icon: User,
      targetPath: '/profile',
      isActive: (pathname) => pathname.startsWith('/profile'),
    },
  ], []);

  // 2. Staff / Guru / Waka / Admin Mobile Bottom Tabs (Strictly by Position)
  const staffTabs = useMemo<MobileBottomTabItem[]>(() => {
    const list: MobileBottomTabItem[] = [];

    // 0. Dashboard Admin (Khusus Admin)
    if (isAdminRole) {
      list.push({
        id: 'admin',
        label: 'Admin',
        shortLabel: 'Admin',
        icon: ShieldCheck,
        badge: 'ADMIN',
        targetPath: '/dashboard?tab=admin',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'admin'),
      });
    }

    // 1. Beranda Guru / Staff (Paling Depan / Utama)
    list.push({
      id: 'ringkasan',
      label: 'Beranda',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard',
      isActive: (pathname, tabParam) =>
        (pathname === '/dashboard' || pathname === '/dashboard/') &&
        (!tabParam || tabParam === 'ringkasan'),
    });

    // 2. KBM & Absen (Guru Mapel)
    if (!isAdminRole && !isTuStaff) {
      list.push({
        id: 'jadwal',
        label: 'KBM & Absen',
        shortLabel: 'KBM',
        icon: BookOpen,
        badge: 'AKTIF',
        targetPath: '/dashboard?tab=jadwal',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'jadwal') || pathname.startsWith('/attendance'),
      });
    }

    // 3. Wali Kelas (dengan sub-tab anak yang melayang)
    if (isWaliKelas || isAdminRole) {
      list.push({
        id: 'binaan',
        label: 'Wali Kelas',
        shortLabel: 'Walas',
        icon: Users,
        badge: waliKelasNama || '8B',
        targetPath: '/dashboard?tab=binaan',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'binaan') || pathname.startsWith('/kurikulum/wali-kelas'),
        children: [
          { id: 'approval', label: 'Izin Siswa', icon: MailCheck, targetPath: '/dashboard?tab=binaan&subtab=approval' },
          { id: 'students', label: 'Data Siswa', icon: Users, targetPath: '/dashboard?tab=binaan&subtab=students' },
          { id: 'health', label: 'Presensi Kelas', icon: HeartPulse, targetPath: '/dashboard?tab=binaan&subtab=health' },
          { id: 'discipline', label: 'Pelanggaran Siswa', icon: Scale, targetPath: '/dashboard?tab=binaan&subtab=discipline' },
          { id: 'halloffame', label: 'Prestasi Siswa', icon: Trophy, targetPath: '/dashboard?tab=binaan&subtab=halloffame' },
          { id: 'rekap', label: 'Jurnal Kelas', icon: ScrollText, targetPath: '/dashboard?tab=binaan&subtab=rekap' },
        ]
      });
    }

    // 4. Kurikulum (hanya jika ada SK Kurikulum)
    if (isKurikulum || isAdminRole || isKepsek) {
      list.push({
        id: 'kurikulum',
        label: 'Kurikulum',
        shortLabel: 'Kurikulum',
        icon: ShieldCheck,
        badge: 'WAKA',
        targetPath: '/dashboard?tab=kurikulum',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'kurikulum') || pathname.startsWith('/kurikulum'),
      });
    }

    // 5. Kesiswaan (hanya jika ada SK Kesiswaan)
    if (isKesiswaan || isAdminRole || isKepsek) {
      list.push({
        id: 'kesiswaan',
        label: 'Kesiswaan',
        shortLabel: 'Kesiswaan',
        icon: Users,
        badge: 'WAKA',
        targetPath: '/dashboard?tab=kesiswaan',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'kesiswaan') || pathname.startsWith('/kesiswaan'),
      });
    }

    // 6. Sarpras (hanya jika ada SK Sarpras)
    if (isSarpras || isToolman || isKabeng || isAdminRole || isKepsek) {
      list.push({
        id: 'sarpras',
        label: 'Sarpras',
        shortLabel: 'Sarpras',
        icon: Building,
        badge: 'WAKA',
        targetPath: '/dashboard?tab=sarpras',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'sarpras') || pathname.startsWith('/sarpras'),
      });
    }

    // 7. Hubin (hanya jika ada SK Hubin)
    if (isHubin || isBkk || isKaprog || isAdminRole || isKepsek) {
      list.push({
        id: 'hubin',
        label: 'Hubin',
        shortLabel: 'Hubin',
        icon: Briefcase,
        badge: 'WAKA',
        targetPath: '/dashboard?tab=hubin',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'hubin') || pathname.startsWith('/hubin'),
      });
    }

    // 8. Koperasi (hanya jika ada SK Koperasi)
    if (isKoperasi || isAdminRole || isKepsek) {
      list.push({
        id: 'koperasi',
        label: 'Koperasi',
        shortLabel: 'Koperasi',
        icon: ShoppingCart,
        badge: 'UNIT',
        targetPath: '/dashboard?tab=koperasi',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'koperasi') || pathname.startsWith('/cooperative'),
      });
    }

    // 9. BP/BK (hanya jika ada SK BPBK)
    if (isBpbk || isAdminRole || isKepsek) {
      list.push({
        id: 'bpbk',
        label: 'BP/BK',
        shortLabel: 'BP/BK',
        icon: UserCheck,
        badge: 'BK',
        targetPath: '/dashboard?tab=bpbk',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'bpbk') || pathname.startsWith('/bpbk'),
      });
    }

    // 10. TU Kepegawaian (hanya jika ada SK TU)
    if (isTUKepegawaian || isAdminRole || isKepsek) {
      list.push({
        id: 'kepegawaian',
        label: 'Data Induk & TU',
        shortLabel: 'Data Induk',
        icon: ClipboardList,
        badge: 'TU',
        targetPath: '/dashboard?tab=kepegawaian',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'kepegawaian') || pathname.startsWith('/academic'),
      });
    }

    // 11. Piket Harian (Strict: Hanya jika aktif bertugas Piket hari ini, Petugas Gerbang, Kesiswaan, atau Admin)
    if (isPiketGuru || isGerbang || isKesiswaan || isAdminRole) {
      list.push({
        id: 'kelola',
        label: 'Piket Operasional',
        shortLabel: 'Piket',
        icon: Clock,
        badge: 'PIKET',
        targetPath: '/dashboard?tab=kelola',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'kelola') || pathname.startsWith('/kesiswaan/piket'),
      });
    }

    // 12. Profil Saya (Selalu ada untuk semua staff)
    list.push({
      id: 'profil',
      label: 'Profil Saya',
      shortLabel: 'Profil',
      icon: User,
      targetPath: '/dashboard?tab=profil',
      isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'profil') || pathname.startsWith('/profile'),
    });

    return list;
  }, [
    isAdminRole,
    isTuStaff,
    isKurikulum,
    isWaliKelas,
    waliKelasNama,
    isKesiswaan,
    isKepsek,
    isSarpras,
    isToolman,
    isKabeng,
    isHubin,
    isBkk,
    isKaprog,
    isKoperasi,
    isBpbk,
    isGerbang,
    isTUKepegawaian,
    isTU,
    guruProfile,
  ]);

  const activeTabsList = isSiswa ? siswaTabs : staffTabs;
  const openFlyoutItem = activeTabsList.find((item) => item.id === openFlyoutId);

  const handleTabClick = (item: MobileBottomTabItem) => {
    if (item.children && item.children.length > 0) {
      if (openFlyoutId === item.id) {
        setOpenFlyoutId(null);
      } else {
        setOpenFlyoutId(item.id);
        if (!item.isActive(location.pathname, currentTab)) {
          navigate(item.targetPath);
        }
      }
      return;
    }
    setOpenFlyoutId(null);
    navigate(item.targetPath);
  };

  const handleSubItemClick = (subItem: MobileBottomSubItem) => {
    setOpenFlyoutId(null);
    navigate(subItem.targetPath);
  };

  return (
    <>
      {/* ── FLOATING FLYOUT SUB-MENU FOR TABS WITH CHILDREN (MELAYANG) ── */}
      <AnimatePresence>
        {openFlyoutItem && openFlyoutItem.children && (
          <>
            {/* Backdrop overlay to dismiss on tap */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenFlyoutId(null)}
              className="lg:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Floating Flyout Card */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.94 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="lg:hidden fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-3 right-3 max-w-sm mx-auto z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3 shadow-2xl shadow-slate-950/30"
            >
              {/* Header Title */}
              <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Menu Rombel {openFlyoutItem.label}
                  </span>
                </div>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                  {openFlyoutItem.badge || 'WALAS'}
                </span>
              </div>

              {/* Sub-Items Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {openFlyoutItem.children.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = currentSubtab === sub.id || (!currentSubtab && sub.id === 'approval');

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubItemClick(sub)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-2xl text-left font-bold text-xs transition-all cursor-pointer active:scale-95",
                        isSubActive
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                        isSubActive
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      )}>
                        <SubIcon size={14} />
                      </div>
                      <span className="truncate leading-tight text-[11px] font-extrabold">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── BOTTOM NAVIGATION BAR ── */}
      <nav
        aria-label="Navigasi Bawah Seluler"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center shadow-2xl overflow-x-auto no-scrollbar"
      >
        <div className="flex items-center justify-around w-full min-w-max gap-1 px-1">
          {activeTabsList.map((item) => {
            const ItemIcon = item.icon;
            const isSelected = item.isActive(location.pathname, currentTab);
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isFlyoutOpen = openFlyoutId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1 min-w-[58px] cursor-pointer relative",
                  isSelected || isFlyoutOpen
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all relative",
                    isSelected || isFlyoutOpen
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "bg-transparent"
                  )}
                >
                  <ItemIcon size={18} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-black px-1 py-0.2 rounded-full bg-emerald-500 text-white leading-none scale-75">
                      {item.badge}
                    </span>
                  )}
                  {hasChildren && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <span className="truncate max-w-[64px] font-extrabold text-[9.5px]">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
});

BottomNavigation.displayName = 'BottomNavigation';
export default BottomNavigation;
