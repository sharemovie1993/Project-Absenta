import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  FileText, 
  BookOpen, 
  CheckCircle2, 
  PiggyBank, 
  User, 
  Users, 
  HeartHandshake, 
  Building, 
  Briefcase, 
  Award, 
  ShieldAlert, 
  ShieldCheck,
  GraduationCap, 
  Building2, 
  ScanLine, 
  LayoutGrid,
  CheckSquare,
  Wrench,
  Compass 
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useUserRoleDashboards } from '@/hooks/useUserRoleDashboards';
import { useExecutivePillarStore, type ExecutivePillar } from '@/store/executivePillarStore';
import { useMyPengujiSidang } from '@/hooks/useMyPengujiSidang';
import {
  type MobileBottomSubItem,
  type MobileBottomTabItem,
  type EcosystemType,
  type EcosystemTheme,
  getEcosystemTheme,
  getKaprogTabs,
  getWalasTabs,
  getTuTabs,
  getKurikulumTabs,
  getKesiswaanTabs,
  getHubinTabs,
  getBpbkTabs,
  getBkkTabs,
  getSarprasTabs,
  getToolmanTabs,
  getEkskulTabs,
  getPklPembimbingTabs,
  getSatpamTabs,
  getKoperasiTabs,
  getPiketTabs,
  getAdminTabs,
  getSiswaTabs,
  getRoleEcosystemFromDashId,
} from '@/config/bottomNavEcosystems.config';

export interface UseBottomNavTabsReturn {
  activeTabsList: MobileBottomTabItem[];
  currentTheme: EcosystemTheme;
  activeEcosystem: EcosystemType;
  currentTab: string | null;
  currentSubtab: string | null;
  isKepsek: boolean;
  isSiswa: boolean;
  setPillar: (pillar: ExecutivePillar) => void;
  shouldHideNav: boolean;
}

export function useBottomNavTabs(): UseBottomNavTabsReturn {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { isSiswa, isKepsek, can } = useCapabilities();
  const {
    teacherDashboards,
    isPendidik,
    isTuStaff,
    isPureGerbangStaff,
    isAdminRole,
    waliKelasNama,
    kaprogJurusan,
    tuTabMeta,
  } = useUserRoleDashboards();

  const currentTab = useMemo(() => {
    return searchParams.get('tab') || new URLSearchParams(location.search).get('tab');
  }, [searchParams, location.search]);

  const currentSubtab = useMemo(() => {
    return searchParams.get('subtab') || new URLSearchParams(location.search).get('subtab');
  }, [searchParams, location.search]);

  // ── 1. SISWA MOBILE NAVIGATION (SHOPEE STYLE - LANGSUNG EXPOSE 6 TOMBOL) ──
  const isPetugasKelas = Boolean(
    (user as any)?.is_petugas_kelas ||
    (user?.siswa_profile as any)?.is_petugas ||
    can('attendance.class.input') ||
    can('attendance.ops')
  );

  const siswaTabs = useMemo<MobileBottomTabItem[]>(() => {
    return getSiswaTabs(currentTab, isPetugasKelas);
  }, [currentTab, isPetugasKelas]);

  // ── 2. KEPALA SEKOLAH (SHOPEE-GRADE 5-TOMBOL DENGAN MENU PENGAWASAN ELEVATED DI TENGAH) ──
  const { currentPillar, setPillar } = useExecutivePillarStore();
  const kepsekTabs = useMemo<MobileBottomTabItem[]>(() => {
    const isProfileTab = currentTab === 'profil';
    return [
      {
        id: 'ringkasan',
        label: 'Ringkasan 360°',
        shortLabel: 'Overview',
        icon: Award,
        targetPath: '/dashboard?tab=ringkasan&subtab=ringkasan',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'ringkasan' && !isProfileTab,
      },
      {
        id: 'kbm',
        label: 'KBM & Kurikulum',
        shortLabel: 'KBM',
        icon: BookOpen,
        targetPath: '/dashboard?tab=ringkasan&subtab=kbm',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'kbm' && !isProfileTab,
      },
      {
        id: 'lensa_more',
        label: 'Lensa Pengawasan',
        shortLabel: 'Menu',
        icon: LayoutGrid,
        badge: '360°',
        targetPath: '/dashboard?tab=ringkasan',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && ['bk', 'sarpras', 'hubin', 'tu'].includes(currentPillar) && !isProfileTab,
        children: [
          { id: 'bk', label: 'Bimbingan Konseling (EWS)', icon: HeartHandshake, targetPath: '/dashboard?tab=ringkasan&subtab=bk', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
          { id: 'sarpras', label: 'Sarpras & Fasilitas', icon: Building, targetPath: '/dashboard?tab=ringkasan&subtab=sarpras', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
          { id: 'hubin', label: 'Hubin & Kemitraan', icon: Briefcase, targetPath: '/dashboard?tab=ringkasan&subtab=hubin', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
          { id: 'tu', label: 'Tata Usaha & Surat', icon: FileText, targetPath: '/dashboard?tab=ringkasan&subtab=tu', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        ],
      },
      {
        id: 'kesiswaan',
        label: 'Kesiswaan & Disiplin',
        shortLabel: 'Kesiswaan',
        icon: Users,
        targetPath: '/dashboard?tab=ringkasan&subtab=kesiswaan',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'kesiswaan' && !isProfileTab,
      },
      {
        id: 'profil',
        label: 'Profil Saya',
        shortLabel: 'Profil',
        icon: User,
        targetPath: '/dashboard?tab=profil',
        isActive: (pathname, tabParam) => tabParam === 'profil' || pathname.startsWith('/profile'),
      },
    ];
  }, [currentPillar, currentTab]);

  // ── DETEKSI EKOSISTEM AKTIF (STEP 2 VS STEP 1 PORTAL) ──
  const activeEcosystem = useMemo<EcosystemType>(() => {
    if (isSiswa) return 'siswa';
    const path = location.pathname;
    if (path.startsWith('/kurikulum')) return 'kurikulum';
    if (path.startsWith('/kesiswaan')) return 'kesiswaan';
    if (path.startsWith('/hubin/tracer') || path.startsWith('/hubin/bkk')) return 'bkk';
    if (path.startsWith('/hubin')) return 'hubin';
    if (path.startsWith('/bpbk')) return 'bpbk';
    if (path.startsWith('/sarpras')) return 'sarpras';
    if (path.startsWith('/attendance/anggota-eskul') || path.startsWith('/rapor/eskul')) return 'ekskul';
    if (path.startsWith('/cooperative')) return 'koperasi';
    if (path.startsWith('/attendance/gate') || (isPureGerbangStaff && path.startsWith('/attendance'))) return 'satpam';
    if (path.startsWith('/attendance/terlambat') || path.startsWith('/attendance/dispensasi')) return 'piket';
    if (path.startsWith('/academic') || path.startsWith('/users')) return 'admin';
    if (path.startsWith('/dashboard')) {
      if (currentTab === 'kaprog') return 'kaprog';
      if (currentTab === 'binaan' || currentTab === 'walas') return 'walas';
      if (currentTab === 'kepegawaian' || currentTab === 'tu') return 'tu';
      if (currentTab === 'kurikulum') return 'kurikulum';
      if (currentTab === 'kesiswaan') return 'kesiswaan';
      if (currentTab === 'hubin') return 'hubin';
      if (currentTab === 'bkk') return 'bkk';
      if (currentTab === 'bk' || currentTab === 'bpbk') return 'bpbk';
      if (currentTab === 'sarpras') return 'sarpras';
      if (currentTab === 'toolman') return 'toolman';
      if (currentTab === 'ekskul') return 'ekskul';
      if (currentTab === 'pembimbing_pkl') return 'pembimbing_pkl';
      if (currentTab === 'satpam' || currentTab === 'gerbang') return 'satpam';
      if (currentTab === 'koperasi') return 'koperasi';
      if (currentTab === 'kelola' || currentTab === 'piket') return 'piket';
      if (currentTab === 'admin') return 'admin';
      if (currentTab === 'kepsek') return 'kepsek';
      if (isPureGerbangStaff && (!currentTab || currentTab === 'ringkasan' || currentTab === 'kelola')) return 'satpam';
      if (isTuStaff && !isPendidik && (!currentTab || currentTab === 'ringkasan')) return 'tu';
    }
    return 'portal';
  }, [location.pathname, currentTab, isPureGerbangStaff, isTuStaff, isPendidik, isSiswa]);

  // ── 4. STAFF / GURU / WAKA / OPERATOR MOBILE BOTTOM TABS (SHOPEE STYLE - MAX 6 TOMBOL) ──
  const staffTabs = useMemo<MobileBottomTabItem[]>(() => {
    switch (activeEcosystem) {
      case 'kaprog':
        return getKaprogTabs(kaprogJurusan, currentSubtab);
      case 'walas':
        return getWalasTabs(waliKelasNama, currentSubtab);
      case 'tu':
        return getTuTabs(tuTabMeta, currentSubtab, isPendidik, (cap) => isAdmin || can(cap));
      case 'kurikulum':
        return getKurikulumTabs(currentSubtab);
      case 'kesiswaan':
        return getKesiswaanTabs(currentSubtab);
      case 'hubin':
        return getHubinTabs(currentSubtab);
      case 'bpbk':
        return getBpbkTabs(currentSubtab);
      case 'bkk':
        return getBkkTabs(currentSubtab);
      case 'sarpras':
        return getSarprasTabs(currentSubtab);
      case 'toolman':
        return getToolmanTabs(currentSubtab);
      case 'ekskul':
        return getEkskulTabs(currentSubtab);
      case 'pembimbing_pkl':
        return getPklPembimbingTabs(currentSubtab);
      case 'satpam':
        return getSatpamTabs(currentSubtab);
      case 'koperasi':
        return getKoperasiTabs(currentSubtab, (cap) => isAdmin || can(cap));
      case 'piket':
        return getPiketTabs();
      case 'admin':
        return getAdminTabs(teacherDashboards);
      case 'kepsek':
        return kepsekTabs;
      default: {
        // ── 🌟 FORMASI 7 PATEN: UNIVERSAL GURU MULTI-ROLE HUB (3 KIRI - 1 CENTER FAB - 3 KANAN) ──
        const isDashActive = (targetPath: string, p: string, t: string | null) => {
          if (targetPath.startsWith('/dashboard')) {
            const match = targetPath.match(/[?&]tab=([^&]+)/);
            const targetTab = match ? match[1] : null;
            return (p === '/dashboard' || p === '/dashboard/') && Boolean(t && targetTab && t === targetTab);
          }
          const basePath = targetPath.split('?')[0];
          return p.startsWith(basePath);
        };

        const mapDashboardToTab = (dash: MobileBottomSubItem): MobileBottomTabItem => ({
          id: dash.id,
          label: dash.label,
          shortLabel: dash.shortLabel || dash.label,
          icon: dash.icon,
          targetPath: dash.targetPath,
          badge: dash.badge ? String(dash.badge) : undefined,
          roleEcosystem: dash.roleEcosystem || (getRoleEcosystemFromDashId(dash.id) ?? undefined),
          isRoleDashboard: true,
          isActive: (p: string, t: string | null) => isDashActive(dash.targetPath, p, t),
        });

        // 1. Kiri 1: Beranda Guru
        const tab1_Home: MobileBottomTabItem = {
          id: 'base_home',
          label: 'Beranda Guru',
          shortLabel: 'Beranda',
          icon: Home,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: (p, t) => (p === '/dashboard' || p === '/dashboard/') && (!t || t === 'ringkasan'),
        };

        // 2. Kiri 2: KBM / Mengajar
        const tab2_Kbm: MobileBottomTabItem = {
          id: 'base_jadwal',
          label: 'Jadwal Mengajar',
          shortLabel: 'KBM',
          icon: Clock,
          targetPath: '/dashboard?tab=jadwal',
          isActive: (p, t) => (p === '/dashboard' || p === '/dashboard/') && t === 'jadwal',
        };

        // 3. Kiri 3: Jabatan 1 (jika ada) atau Presensi KBM
        const tab3_Slot3: MobileBottomTabItem = teacherDashboards[0] 
          ? mapDashboardToTab(teacherDashboards[0])
          : {
              id: 'base_presensi',
              label: 'Presensi KBM',
              shortLabel: 'Presensi',
              icon: CheckCircle2,
              targetPath: '/dashboard?tab=manual_presensi',
              isActive: (p, t) => t === 'manual_presensi',
            };

        // 4. Center FAB (Elevated Notch): Menu Aksi Cepat & Seluruh Jabatan
        const tab4_CenterFab: MobileBottomTabItem = {
          id: 'base_divisi_more',
          label: 'Pusat Layanan & Menu',
          shortLabel: 'Menu',
          icon: LayoutGrid,
          targetPath: '/dashboard',
          badge: teacherDashboards.length > 4 ? `${teacherDashboards.length}` : undefined,
          isActive: (p, t) => Boolean(t && !['ringkasan', 'action_hub', 'jadwal', 'manual_presensi'].includes(t)),
          children: teacherDashboards.length > 0 ? teacherDashboards : [
            { id: 'jadwal', label: 'Jadwal Mengajar', icon: Clock, targetPath: '/dashboard?tab=jadwal', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'presensi', label: 'Presensi KBM', icon: CheckCircle2, targetPath: '/dashboard?tab=manual_presensi', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
          ],
        };

        // 5. Kanan 1: Jabatan 2 (jika ada) atau Jurnal Mengajar
        const tab5_Slot5: MobileBottomTabItem = teacherDashboards[1]
          ? mapDashboardToTab(teacherDashboards[1])
          : {
              id: 'base_jurnal',
              label: 'Jurnal Mengajar',
              shortLabel: 'Jurnal',
              icon: FileText,
              targetPath: '/kurikulum/jurnal',
              isActive: (p) => p.startsWith('/kurikulum/jurnal'),
            };

        // 6. Kanan 2: Jabatan 3 (jika ada) atau Buku Nilai
        const tab6_Slot6: MobileBottomTabItem = teacherDashboards[2]
          ? mapDashboardToTab(teacherDashboards[2])
          : {
              id: 'base_nilai',
              label: 'Buku Nilai Guru',
              shortLabel: 'Nilai',
              icon: GraduationCap,
              targetPath: '/rapor/input-nilai',
              isActive: (p) => p.startsWith('/rapor'),
            };

        // 7. Kanan 3: Jabatan 4 (jika ada) atau Tugas & Tindakan
        const tab7_Slot7: MobileBottomTabItem = teacherDashboards[3]
          ? mapDashboardToTab(teacherDashboards[3])
          : {
              id: 'base_action_hub',
              label: 'Tugas & Tindakan',
              shortLabel: 'Tugas',
              icon: CheckSquare,
              targetPath: '/dashboard?tab=action_hub',
              isActive: (p, t) => (p === '/dashboard' || p === '/dashboard/') && t === 'action_hub',
            };

        return [tab1_Home, tab2_Kbm, tab3_Slot3, tab4_CenterFab, tab5_Slot5, tab6_Slot6, tab7_Slot7];
      }
    }
  }, [
    activeEcosystem,
    isPendidik,
    currentSubtab,
    currentTab,
    kaprogJurusan,
    waliKelasNama,
    tuTabMeta,
    teacherDashboards,
    isAdmin,
    can,
  ]);

  // ── LAYER THEME CONFIGURATION (LAYER 1 VS LAYER 2 ROLE WORKSPACE ECOSYSTEM) ──
  const currentTheme = useMemo(() => {
    return getEcosystemTheme(activeEcosystem, isSiswa, isKepsek);
  }, [activeEcosystem, isSiswa, isKepsek]);

  const activeTabsList = isSiswa ? siswaTabs : isKepsek ? kepsekTabs : staffTabs;
  const shouldHideNav =
    location.pathname.startsWith('/parent-app') ||
    location.pathname.startsWith('/cooperative/rat') ||
    location.pathname.startsWith('/cbt/ruang-ujian');

  return {
    activeTabsList,
    currentTheme,
    activeEcosystem,
    currentTab,
    currentSubtab,
    isKepsek,
    isSiswa,
    setPillar,
    shouldHideNav,
  };
}
