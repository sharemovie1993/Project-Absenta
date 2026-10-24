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
  GraduationCap, 
  Building2, 
  ScanLine, 
  LayoutGrid 
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useExecutivePillarStore, type ExecutivePillar } from '@/store/executivePillarStore';
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
  getKoperasiTabs,
  getPiketTabs,
  getAdminTabs,
} from '@/config/bottomNavEcosystems.config';

export interface UseBottomNavTabsReturn {
  activeTabsList: MobileBottomTabItem[];
  currentTheme: EcosystemTheme;
  activeEcosystem: EcosystemType;
  currentTab: string | null;
  currentSubtab: string | null;
  isKepsek: boolean;
  setPillar: (pillar: ExecutivePillar) => void;
  shouldHideNav: boolean;
}

export function useBottomNavTabs(): UseBottomNavTabsReturn {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const {
    isAdmin,
    isSarpras,
    isHubin,
    isKurikulum,
    isToolman,
    isKaprog,
    kaprogJurusan,
    isKabeng,
    isBpbk,
    isBkk,
    isGerbang,
    isPiketGuru,
    isTU,
    isTUKepala,
    isTUKepegawaian,
    isTUPersuratan,
    isTUKeuangan,
    isTUSarpras,
    isKepsek,
    isWaliKelas: isWaliKelasFromCaps,
    isKesiswaan,
    isKoperasi,
    isSiswa,
    can
  } = useCapabilities();

  const guruProfile = user?.guru_profile;
  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const isAdminRole = isAdmin || roleName === 'ADMIN' || roleName === 'SUPERADMIN';
  const jenisPtk = (guruProfile?.jenis_ptk || (user?.guru_profile as any)?.jenis_ptk || (user as any)?.jenis_ptk || '').toUpperCase();
  const isTuStaff = isTU || user?.role === 'TU' || jenisPtk === 'TENAGA_KEPENDIDIKAN' || (guruProfile?.is_tu ?? false);
  const isPendidik = !isTuStaff && !isKepsek && (jenisPtk === 'PENDIDIK' || !jenisPtk && (roleName === 'GURU' || isWaliKelasFromCaps));
  const isPembimbingPkl = !isHubin && !isKepsek && can('hubin.guidance.manage') && Boolean(
    (guruProfile as any)?.is_pembimbing_pkl || 
    ((guruProfile as any)?.active_pkl_count && (guruProfile as any).active_pkl_count > 0) ||
    ((user?.guru_profile as any)?.is_pembimbing_pkl) ||
    ((user?.guru_profile as any)?.active_pkl_count > 0)
  );
  const isPureGerbangStaff = roleName === 'GERBANG' || roleName === 'PETUGAS_GERBANG' || isGerbang && !isPendidik && !isAdminRole && !isKepsek && !isKurikulum;
  const hasGerbangDuty = isGerbang || isPureGerbangStaff || (
    !isAdminRole && !isKurikulum && !isKepsek && (
      can('attendance.gate.scan') ||
      can('attendance.gate.tap.entry') ||
      can('dashboard.view.gerbang')
    )
  );
  const isWaliKelas = isWaliKelasFromCaps || !!guruProfile?.wali_kelas_di?.id || !!(user?.guru_profile as any)?.wali_kelas_di?.id;
  const waliKelasNama = guruProfile?.wali_kelas_di?.nama_kelas || (user?.guru_profile as any)?.wali_kelas_di?.nama_kelas || '';
  
  const currentTab = useMemo(() => {
    return searchParams.get('tab') || new URLSearchParams(location.search).get('tab');
  }, [searchParams, location.search]);

  const currentSubtab = useMemo(() => {
    return searchParams.get('subtab') || new URLSearchParams(location.search).get('subtab');
  }, [searchParams, location.search]);

  // Dynamic TU Tab Label & Badge
  const tuTabMeta = useMemo(() => {
    if (isTUKepala) return { label: 'Tata Usaha', shortLabel: 'TU', badge: 'KOR TU' };
    if (isTUKepegawaian) return { label: 'TU Kepegawaian', shortLabel: 'Kepegawaian', badge: 'DAPODIK' };
    if (isTUPersuratan) return { label: 'TU Persuratan', shortLabel: 'Persuratan', badge: 'SURAT' };
    if (isTUKeuangan) return { label: 'TU Keuangan', shortLabel: 'Keuangan', badge: 'SPP' };
    if (isTUSarpras) return { label: 'TU Sarpras & Logistik', shortLabel: 'Logistik', badge: 'KIB' };
    return { label: 'Tata Usaha', shortLabel: 'TU', badge: 'TU' };
  }, [isTUKepala, isTUKepegawaian, isTUPersuratan, isTUKeuangan, isTUSarpras]);

  // ── 1. SISWA MOBILE NAVIGATION (SHOPEE STYLE - LANGSUNG EXPOSE 6 TOMBOL) ──
  const isPetugasKelas = Boolean(
    (user as any)?.is_petugas_kelas ||
    (user?.siswa_profile as any)?.is_petugas ||
    can('attendance.class.input') ||
    can('attendance.ops')
  );

  const siswaTabs = useMemo<MobileBottomTabItem[]>(() => {
    const tabs: MobileBottomTabItem[] = [
      {
        id: 'beranda',
        label: 'Beranda Siswa',
        shortLabel: 'Siswa',
        icon: Home,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan'),
      },
      {
        id: 'kehadiran',
        label: 'Presensi Siswa',
        shortLabel: 'Kehadiran',
        icon: Clock,
        targetPath: '/attendance/my-attendance',
        isActive: (pathname) => pathname.startsWith('/attendance/my-attendance') || pathname.startsWith('/my-attendance'),
      },
      {
        id: 'catatan',
        label: 'Catatan Siswa',
        shortLabel: 'Catatan',
        icon: FileText,
        targetPath: '/bpbk/konseling',
        isActive: (pathname) => pathname.startsWith('/bpbk/konseling') || pathname.startsWith('/kesiswaan/pelanggaran'),
      },
      {
        id: 'berkas',
        label: 'Berkas Siswa',
        shortLabel: 'Berkas',
        icon: BookOpen,
        targetPath: '/rapor/nilai',
        isActive: (pathname) => pathname.startsWith('/rapor/nilai') || pathname.startsWith('/academic/student-records'),
      },
    ];

    if (isPetugasKelas) {
      tabs.push({
        id: 'petugas_ops',
        label: 'Petugas Presensi',
        shortLabel: 'Petugas',
        icon: CheckCircle2,
        targetPath: '/attendance/ops',
        isActive: (pathname) => pathname.startsWith('/attendance/ops'),
      });
    } else {
      tabs.push({
        id: 'coop_siswa',
        label: 'Koperasi Siswa',
        shortLabel: 'Koperasi',
        icon: PiggyBank,
        targetPath: '/cooperative/pos',
        isActive: (pathname) => pathname.startsWith('/cooperative'),
      });
    }

    tabs.push({
      id: 'profil',
      label: 'Profil Siswa',
      shortLabel: 'Profil',
      icon: User,
      targetPath: '/profile',
      isActive: (pathname, tabParam) => tabParam === 'profil' || pathname.startsWith('/profile'),
    });

    return tabs;
  }, [isPetugasKelas]);

  // ── 2. KEPALA SEKOLAH (6 PILAR 360° + PROFIL) ──
  const { currentPillar, setPillar } = useExecutivePillarStore();
  const kepsekTabs = useMemo<MobileBottomTabItem[]>(() => {
    const isProfileTab = currentTab === 'profil';
    return [
      {
        id: 'kbm',
        label: 'KBM & Kurikulum',
        shortLabel: 'KBM',
        icon: BookOpen,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'kbm' && !isProfileTab
      },
      {
        id: 'kesiswaan',
        label: 'Kesiswaan & Disiplin',
        shortLabel: 'Kesiswaan',
        icon: Users,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'kesiswaan' && !isProfileTab
      },
      {
        id: 'bk',
        label: 'Bimbingan Konseling (EWS)',
        shortLabel: 'BP/BK',
        icon: HeartHandshake,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'bk' && !isProfileTab
      },
      {
        id: 'sarpras',
        label: 'Sarpras & Fasilitas',
        shortLabel: 'Sarpras',
        icon: Building,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'sarpras' && !isProfileTab
      },
      {
        id: 'hubin',
        label: 'Hubin & Kemitraan',
        shortLabel: 'Hubin',
        icon: Briefcase,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'hubin' && !isProfileTab
      },
      {
        id: 'tu',
        label: 'Tata Usaha & Surat',
        shortLabel: 'TU',
        icon: FileText,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'tu' && !isProfileTab
      },
      {
        id: 'profil',
        label: 'Profil Saya',
        shortLabel: 'Profil',
        icon: User,
        targetPath: '/dashboard?tab=profil',
        isActive: (pathname, tabParam) => tabParam === 'profil' || pathname.startsWith('/profile')
      }
    ];
  }, [currentPillar, currentTab]);

  // ── 3. DYNAMIC DASHBOARDS LAUNCHER UNTUK GURU / STAF DI STEP 1 PORTAL ──
  const teacherDashboards = useMemo<MobileBottomSubItem[]>(() => {
    const list: MobileBottomSubItem[] = [];

    if (isKaprog || isAdminRole) {
      list.push({
        id: 'dash-kaprog',
        label: 'Jurusan',
        icon: Award,
        targetPath: '/dashboard?tab=kaprog&subtab=beranda',
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
      });
    }

    if (isWaliKelas || isAdminRole) {
      list.push({
        id: 'dash-walas',
        label: 'Walas',
        icon: Users,
        targetPath: '/dashboard?tab=binaan&subtab=ringkasan',
        color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
      });
    }

    if (isTuStaff || isTU || isAdminRole) {
      list.push({
        id: 'dash-tu',
        label: tuTabMeta.shortLabel || 'Tata Usaha',
        icon: FileText,
        targetPath: '/dashboard?tab=kepegawaian&subtab=beranda',
        color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
        badge: tuTabMeta.badge || 'TU',
      });
    }

    if (isKurikulum || isAdminRole || can('curriculum.view') || can('curriculum.manage')) {
      list.push({
        id: 'dash-kurikulum',
        label: 'Kurikulum',
        icon: BookOpen,
        targetPath: '/kurikulum/jadwal',
        color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
      });
    }

    if (isKesiswaan || isAdminRole || can('kesiswaan.view') || can('kesiswaan.manage')) {
      list.push({
        id: 'dash-kesiswaan',
        label: 'Kesiswaan',
        icon: ShieldAlert,
        targetPath: '/kesiswaan/pelanggaran',
        color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
      });
    }

    if (isHubin || isPembimbingPkl || isAdminRole || can('hubin.view') || can('hubin.manage')) {
      list.push({
        id: 'dash-hubin',
        label: 'Hubin & PKL',
        icon: Briefcase,
        targetPath: '/hubin/absensi',
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
      });
    }

    if (isBpbk || isAdminRole || can('bpbk.view') || can('bpbk.manage')) {
      list.push({
        id: 'dash-bk',
        label: 'Konseling BK',
        icon: HeartHandshake,
        targetPath: '/bpbk/dashboard',
        color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
      });
    }

    if (isBkk || isHubin || isAdminRole || can('bkk.view') || can('bkk.manage')) {
      list.push({
        id: 'dash-bkk',
        label: 'BKK Alumni',
        icon: GraduationCap,
        targetPath: '/hubin/bkk?tab=loker',
        color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
      });
    }

    if (isSarpras || isKabeng || isToolman || isAdminRole || can('sarpras.view') || can('sarpras.manage')) {
      list.push({
        id: 'dash-sarpras',
        label: 'Sarpras',
        icon: Building2,
        targetPath: '/sarpras/inventory',
        color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
      });
    }

    if (isKoperasi || isAdminRole || can('coop.pos.access') || can('coop.manage')) {
      list.push({
        id: 'dash-koperasi',
        label: 'Koperasi',
        icon: PiggyBank,
        targetPath: '/cooperative/pos',
        color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
      });
    }

    if (isPiketGuru || hasGerbangDuty || isGerbang || isAdminRole || can('attendance.gate.scan')) {
      list.push({
        id: 'dash-piket',
        label: 'Piket & Gerbang',
        icon: ScanLine,
        targetPath: '/attendance/gate-scanner',
        color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
      });
    }

    return list;
  }, [
    isKaprog,
    kaprogJurusan,
    isWaliKelas,
    waliKelasNama,
    isTuStaff,
    isTU,
    tuTabMeta,
    isKurikulum,
    isAdminRole,
    can,
    isKesiswaan,
    isHubin,
    isPembimbingPkl,
    isBpbk,
    isBkk,
    isSarpras,
    isKabeng,
    isToolman,
    isKoperasi,
    isPiketGuru,
    hasGerbangDuty,
    isGerbang,
  ]);

  // ── DETEKSI EKOSISTEM AKTIF (STEP 2 VS STEP 1 PORTAL) ──
  const activeEcosystem = useMemo<EcosystemType>(() => {
    const path = location.pathname;
    if (path.startsWith('/kurikulum')) return 'kurikulum';
    if (path.startsWith('/kesiswaan')) return 'kesiswaan';
    if (path.startsWith('/hubin/tracer') || path.startsWith('/hubin/bkk')) return 'bkk';
    if (path.startsWith('/hubin')) return 'hubin';
    if (path.startsWith('/bpbk')) return 'bpbk';
    if (path.startsWith('/sarpras')) return 'sarpras';
    if (path.startsWith('/cooperative')) return 'koperasi';
    if (path.startsWith('/attendance/gate') || path.startsWith('/attendance/terlambat') || path.startsWith('/attendance/dispensasi') || (isPureGerbangStaff && path.startsWith('/attendance'))) return 'piket';
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
      if (currentTab === 'koperasi') return 'koperasi';
      if (currentTab === 'kelola' || currentTab === 'piket') return 'piket';
      if (currentTab === 'admin') return 'admin';
      if (isPureGerbangStaff && currentTab === 'kelola') return 'piket';
      if (isTuStaff && !isPendidik && (!currentTab || currentTab === 'ringkasan')) return 'tu';
    }
    return 'portal';
  }, [location.pathname, currentTab, isPureGerbangStaff, isTuStaff, isPendidik]);

  // ── 4. STAFF / GURU / WAKA / OPERATOR MOBILE BOTTOM TABS (SHOPEE STYLE - MAX 6 TOMBOL) ──
  const staffTabs = useMemo<MobileBottomTabItem[]>(() => {
    switch (activeEcosystem) {
      case 'kaprog':
        return getKaprogTabs(kaprogJurusan, currentSubtab);
      case 'walas':
        return getWalasTabs(waliKelasNama, currentSubtab);
      case 'tu':
        return getTuTabs(tuTabMeta, currentSubtab, isPendidik);
      case 'kurikulum':
        return getKurikulumTabs();
      case 'kesiswaan':
        return getKesiswaanTabs();
      case 'hubin':
        return getHubinTabs();
      case 'bpbk':
        return getBpbkTabs();
      case 'bkk':
        return getBkkTabs(currentTab);
      case 'sarpras':
        return getSarprasTabs();
      case 'koperasi':
        return getKoperasiTabs();
      case 'piket':
        return getPiketTabs();
      case 'admin':
        return getAdminTabs(teacherDashboards);
      default: {
        // STEP 1 (PORTAL BASE GURU - KBM TERPADU DI BERANDA)
        const baseTabs: MobileBottomTabItem[] = [
          {
            id: 'base_home',
            label: 'Beranda Guru',
            shortLabel: 'Beranda',
            icon: Home,
            targetPath: '/dashboard?tab=ringkasan',
            isActive: (p, t) => (p === '/dashboard' || p === '/dashboard/') && (!t || t === 'ringkasan' || t === 'jadwal'),
          },
          {
            id: 'base_nilai',
            label: 'Nilai & Mapel',
            shortLabel: 'Nilai & CP',
            icon: BookOpen,
            targetPath: '/rapor/input-nilai',
            isActive: (p) => p.startsWith('/rapor/input-nilai') || p.startsWith('/academic/grades'),
          },
        ];

        if (teacherDashboards.length > 0) {
          if (teacherDashboards.length <= 3) {
            teacherDashboards.forEach((dash) => {
              baseTabs.push({
                id: dash.id,
                label: dash.label,
                shortLabel: dash.label,
                icon: dash.icon,
                targetPath: dash.targetPath,
                badge: dash.badge ? String(dash.badge) : undefined,
                isActive: (p, t) =>
                  dash.targetPath.includes(p) || (Boolean(t) && dash.targetPath.includes(t || '')),
              });
            });
          } else {
            const exposed = teacherDashboards.slice(0, 2);
            const overflow = teacherDashboards.slice(2);

            exposed.forEach((dash) => {
              baseTabs.push({
                id: dash.id,
                label: dash.label,
                shortLabel: dash.label,
                icon: dash.icon,
                targetPath: dash.targetPath,
                badge: dash.badge ? String(dash.badge) : undefined,
                isActive: (p, t) =>
                  dash.targetPath.includes(p) || (Boolean(t) && dash.targetPath.includes(t || '')),
              });
            });

            baseTabs.push({
              id: 'base_divisi_more',
              label: 'Peran Lainnya',
              shortLabel: 'Lainnya',
              icon: LayoutGrid,
              targetPath: '/dashboard',
              badge: `${overflow.length}`,
              isActive: () => false,
              children: overflow,
            });
          }
        }

        baseTabs.push({
          id: 'base_profil',
          label: 'Profil Saya',
          shortLabel: 'Saya',
          icon: User,
          targetPath: '/dashboard?tab=profil',
          isActive: (p, t) => t === 'profil' || p.startsWith('/profile'),
        });

        return baseTabs;
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
  ]);

  // ── LAYER THEME CONFIGURATION (LAYER 1 VS LAYER 2 ROLE WORKSPACE ECOSYSTEM) ──
  const currentTheme = useMemo(() => {
    return getEcosystemTheme(activeEcosystem, isSiswa, isKepsek);
  }, [activeEcosystem, isSiswa, isKepsek]);

  const activeTabsList = isSiswa ? siswaTabs : isKepsek ? kepsekTabs : staffTabs;
  const shouldHideNav = location.pathname.startsWith('/parent-app') || location.pathname.startsWith('/cooperative/rat');

  return {
    activeTabsList,
    currentTheme,
    activeEcosystem,
    currentTab,
    currentSubtab,
    isKepsek,
    setPillar,
    shouldHideNav,
  };
}
