import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { getUserPositions } from '@/config/navigation.config';

export interface MobileBottomTabItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  badge?: string;
  targetPath: string;
  isActive: (pathname: string, currentTabParam: string | null) => boolean;
}

export const BottomNavigation: React.FC = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

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
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/dashboard/';

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
        label: 'Dashboard Admin',
        shortLabel: 'Admin',
        icon: ShieldCheck,
        badge: 'ADMIN',
        targetPath: '/dashboard?tab=admin',
        isActive: (pathname, tabParam) => pathname.startsWith('/dashboard') && tabParam === 'admin',
      });
    }

    // 1. Beranda Guru / Staf
    list.push({
      id: 'ringkasan',
      label: 'Beranda Guru',
      shortLabel: 'Beranda',
      icon: UserCheck,
      targetPath: '/dashboard?tab=ringkasan',
      isActive: (pathname, tabParam) => {
        if (!pathname.startsWith('/dashboard')) return false;
        if (tabParam === 'ringkasan') return true;
        if (!tabParam && !isAdminRole) return true;
        return false;
      },
    });

    // 2. KBM & Absen
    if (!isTuStaff || isKurikulum || isAdminRole) {
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

    // 3. Wali Kelas (hanya jika ada SK Walas)
    if (isWaliKelas || isAdminRole) {
      list.push({
        id: 'binaan',
        label: 'Wali Kelas',
        shortLabel: 'Walas',
        icon: Users,
        badge: waliKelasNama || '8B',
        targetPath: '/dashboard?tab=binaan',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'binaan') || pathname.startsWith('/kurikulum/wali-kelas'),
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
    if (isTUKepegawaian || isTU || isAdminRole || isKepsek) {
      list.push({
        id: 'kepegawaian',
        label: 'TU Kepegawaian',
        shortLabel: 'TU Kepeg.',
        icon: Users,
        badge: 'TU',
        targetPath: '/dashboard?tab=kepegawaian',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'kepegawaian') || pathname.startsWith('/academic'),
      });
    }

    // 11. Piket Harian (hanya jika ada tugas Piket / Gerbang)
    if (isGerbang || isKurikulum || isKesiswaan || isAdminRole || isKepsek) {
      list.push({
        id: 'kelola',
        label: 'Piket Harian',
        shortLabel: 'Piket',
        icon: ClipboardList,
        targetPath: '/dashboard?tab=kelola',
        isActive: (pathname, tabParam) => (pathname.startsWith('/dashboard') && tabParam === 'kelola') || pathname.startsWith('/attendance/piket'),
      });
    }

    // 12. Profil Guru / Staf
    list.push({
      id: 'profil',
      label: 'Profil Guru',
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
  ]);

  const activeTabsList = isSiswa ? siswaTabs : staffTabs;

  const handleTabClick = (item: MobileBottomTabItem) => {
    navigate(item.targetPath);
  };

  return (
    <nav
      aria-label="Navigasi Bawah Seluler"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center shadow-2xl overflow-x-auto no-scrollbar"
    >
      <div className="flex items-center justify-around w-full min-w-max gap-1 px-1">
        {activeTabsList.map((item) => {
          const ItemIcon = item.icon;
          const isSelected = item.isActive(location.pathname, currentTab);

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1 min-w-[58px] cursor-pointer",
                isSelected
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all relative",
                  isSelected
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
              </div>
              <span className="truncate max-w-[64px] font-extrabold text-[9.5px]">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNavigation.displayName = 'BottomNavigation';
export default BottomNavigation;
