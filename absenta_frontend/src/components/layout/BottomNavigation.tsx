import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  Building, 
  Briefcase, 
  User, 
  Clock, 
  Home, 
  HeartHandshake, 
  FileText, 
  LayoutGrid,
  Award,
  ShieldAlert,
  CalendarCheck,
  CheckCircle2,
  PiggyBank,
  ScanLine
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useExecutivePillarStore, type ExecutivePillar } from '@/store/executivePillarStore';
import {
  type MobileBottomSubItem,
  type MobileBottomTabItem,
  type EcosystemType,
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

export type { MobileBottomSubItem, MobileBottomTabItem, EcosystemType };
export const BottomNavigation: React.FC = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user
  } = useAuthStore();
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);
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
    if (isTUKepala) return {
      label: 'Tata Usaha',
      shortLabel: 'TU',
      badge: 'KOR TU'
    };
    if (isTUKepegawaian) return {
      label: 'TU Kepegawaian',
      shortLabel: 'Kepegawaian',
      badge: 'DAPODIK'
    };
    if (isTUPersuratan) return {
      label: 'TU Persuratan',
      shortLabel: 'Persuratan',
      badge: 'SURAT'
    };
    if (isTUKeuangan) return {
      label: 'TU Keuangan',
      shortLabel: 'Keuangan',
      badge: 'SPP'
    };
    if (isTUSarpras) return {
      label: 'TU Sarpras & Logistik',
      shortLabel: 'Logistik',
      badge: 'KIB'
    };
    return {
      label: 'Tata Usaha',
      shortLabel: 'TU',
      badge: 'TU'
    };
  }, [isTUKepala, isTUKepegawaian, isTUPersuratan, isTUKeuangan, isTUSarpras]);

  // Close floating flyout when navigating or changing query params
  useEffect(() => {
    setOpenFlyoutId(null);
  }, [location.pathname, location.search]);

  // Don't render for Parent App as it has its own parent layout

  // ── 1. SISWA MOBILE NAVIGATION (SHOPEE STYLE - LANGSUNG EXPOSE 6 TOMBOL) ──
  const hasPklAccess = isSiswa && can('hubin.self.pkl');
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
        shortLabel: '🏠 Siswa',
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

    // Langsung expose peran siswa (Petugas Kelas / Koperasi Siswa)
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
  const {
    currentPillar,
    setPillar
  } = useExecutivePillarStore();
  const kepsekTabs = useMemo<MobileBottomTabItem[]>(() => {
    const isProfileTab = currentTab === 'profil';
    return [{
      id: 'kbm',
      label: 'KBM & Kurikulum',
      shortLabel: 'KBM',
      icon: BookOpen,
      targetPath: '/dashboard',
      isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'kbm' && !isProfileTab
    }, {
      id: 'kesiswaan',
      label: 'Kesiswaan & Disiplin',
      shortLabel: 'Kesiswaan',
      icon: Users,
      targetPath: '/dashboard',
      isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'kesiswaan' && !isProfileTab
    }, {
      id: 'bk',
      label: 'Bimbingan Konseling (EWS)',
      shortLabel: 'BP/BK',
      icon: HeartHandshake,
      targetPath: '/dashboard',
      isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'bk' && !isProfileTab
    }, {
      id: 'sarpras',
      label: 'Sarpras & Fasilitas',
      shortLabel: 'Sarpras',
      icon: Building,
      targetPath: '/dashboard',
      isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'sarpras' && !isProfileTab
    }, {
      id: 'hubin',
      label: 'Hubin & Kemitraan',
      shortLabel: 'Hubin',
      icon: Briefcase,
      targetPath: '/dashboard',
      isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'hubin' && !isProfileTab
    }, {
      id: 'tu',
      label: 'Tata Usaha & Surat',
      shortLabel: 'TU',
      icon: FileText,
      targetPath: '/dashboard',
      isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan') && currentPillar === 'tu' && !isProfileTab
    }, {
      id: 'profil',
      label: 'Profil Saya',
      shortLabel: 'Profil',
      icon: User,
      targetPath: '/dashboard?tab=profil',
      isActive: (pathname, tabParam) => tabParam === 'profil' || pathname.startsWith('/profile')
    }];
  }, [currentPillar, currentTab]);

  // ── 3. DYNAMIC DASHBOARDS LAUNCHER UNTUK GURU / STAF DI STEP 1 PORTAL ──
  const teacherDashboards = useMemo<MobileBottomSubItem[]>(() => {
    const list: MobileBottomSubItem[] = [];

    if (isKaprog || isAdminRole) {
      list.push({
        id: 'dash-kaprog',
        label: kaprogJurusan?.singkatan ? `Kaprog ${kaprogJurusan.singkatan}` : 'Kaprog',
        icon: Award,
        targetPath: '/dashboard?tab=kaprog&subtab=beranda',
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
        badge: kaprogJurusan?.singkatan || 'KAPROG',
      });
    }

    if (isWaliKelas || isAdminRole) {
      list.push({
        id: 'dash-walas',
        label: waliKelasNama ? `Walas ${waliKelasNama}` : 'Wali Kelas',
        icon: Users,
        targetPath: '/dashboard?tab=binaan&subtab=ringkasan',
        color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
        badge: waliKelasNama || 'WALAS',
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
  const activeEcosystem = useMemo<'kaprog' | 'walas' | 'tu' | 'kurikulum' | 'kesiswaan' | 'hubin' | 'bpbk' | 'bkk' | 'sarpras' | 'koperasi' | 'piket' | 'admin' | 'portal'>(() => {
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
      default:
        break;
    }

    // ════ 13. DEFAULT: STEP 1 (PORTAL BASE GURU - LANGSUNG EXPOSE PERAN) ════
    const baseTabs: MobileBottomTabItem[] = [
      {
        id: 'base_home',
        label: 'Beranda Guru',
        shortLabel: '🏠 Guru',
        icon: Home,
        targetPath: '/dashboard?tab=ringkasan',
        isActive: (p, t) => (p === '/dashboard' || p === '/dashboard/') && (!t || t === 'ringkasan'),
      },
      {
        id: 'base_kbm',
        label: 'KBM Guru',
        shortLabel: 'KBM',
        icon: BookOpen,
        targetPath: '/dashboard?tab=jadwal',
        isActive: (p, t) => t === 'jadwal' || p.startsWith('/attendance/my-attendance'),
      },
    ];

    // Langsung expose peran/divisi aktif pengguna di Layer 1
    // Slot yang tersedia adalah 3 slot (untuk menjaga total bar <= 6 tombol Shopee)
    if (teacherDashboards.length > 0) {
      if (teacherDashboards.length <= 3) {
        // Semua peran (misal Kaprog & Walas) langsung 1-tap diexpose di bottom bar
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
        // Jika memiliki lebih dari 3 peran khusus (misal Admin): expose 2 teratas, sisanya di launcher "Lainnya"
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
      shortLabel: 'Profil',
      icon: User,
      targetPath: '/dashboard?tab=profil',
      isActive: (p, t) => t === 'profil' || p.startsWith('/profile'),
    });

    return baseTabs;
  }, [
    activeEcosystem,
    isPendidik,
    currentSubtab,
    kaprogJurusan,
    waliKelasNama,
    tuTabMeta,
    searchParams,
    teacherDashboards,
  ]);
  if (location.pathname.startsWith('/parent-app') || location.pathname.startsWith('/cooperative/rat')) {
    return null;
  }

  // ── LAYER THEME CONFIGURATION (LAYER 1 VS LAYER 2 ROLE WORKSPACE ECOSYSTEM) ──
  const currentTheme = useMemo(() => {
    return getEcosystemTheme(activeEcosystem, isSiswa, isKepsek);
  }, [activeEcosystem, isSiswa, isKepsek]);

  const activeTabsList = isSiswa ? siswaTabs : isKepsek ? kepsekTabs : staffTabs;
  const openFlyoutItem = activeTabsList.find(item => item.id === openFlyoutId);

  const handleTabClick = useCallback((item: MobileBottomTabItem) => {
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

    // Khusus Kepala Sekolah: Switching 6 pilar instan tanpa reload rute / tanpa reset
    if (isKepsek && ['kbm', 'kesiswaan', 'bk', 'sarpras', 'hubin', 'tu'].includes(item.id)) {
      setPillar(item.id as ExecutivePillar);
      if (location.pathname !== '/dashboard' || currentTab === 'profil') {
        navigate('/dashboard');
      }
      return;
    }
    navigate(item.targetPath);
  }, [openFlyoutId, isKepsek, setPillar, location.pathname, currentTab, navigate]);

  const handleSubItemClick = useCallback((subItem: MobileBottomSubItem) => {
    setOpenFlyoutId(null);
    navigate(subItem.targetPath);
  }, [navigate]);
  return (
    <>
      {/* ── MENU LANJUTAN MELAYANG BUSUR BULAN SABIT (TRANSPARENT CRESCENT ARC SPEED-DIAL) ── */}
      <AnimatePresence>
        {openFlyoutItem && openFlyoutItem.children && (
          <>
            {/* Backdrop overlay transparan dengan blur lembut */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpenFlyoutId(null)}
              className="lg:hidden fixed inset-0 z-50 bg-black/45 backdrop-blur-xs cursor-pointer"
            />

            {/* Container Melayang Bebas Tanpa Kotak (100% Transparan) */}
            <div className="lg:hidden fixed bottom-[calc(4.4rem+env(safe-area-inset-bottom))] right-3 sm:right-5 z-50 pointer-events-none flex flex-col items-end max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar py-2">
              <div className="flex flex-col-reverse items-end gap-2.5 sm:gap-3 pointer-events-auto pr-1">
                {openFlyoutItem.children.map((sub, idx, arr) => {
                  const SubIcon = sub.icon;
                  const isSubActive = currentSubtab === sub.id;
                  const total = arr.length;
                  // Perhitungan Lengkungan Busur / Bulan Sabit (Crescent Bow Curve)
                  // Menghasilkan pergeseran melengkung cembung ke kiri di bagian tengah
                  const normalizedT = total > 1 ? idx / (total - 1) : 0.5;
                  const curveOffset = Math.round(Math.sin(normalizedT * Math.PI) * 44);

                  return (
                    <motion.button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubItemClick(sub)}
                      initial={{ opacity: 0, scale: 0.5, x: 30 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: 30 }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 26,
                        delay: idx * 0.025,
                      }}
                      style={{
                        transform: `translateX(-${curveOffset}px)`,
                      }}
                      className="flex items-center justify-end gap-2.5 group select-none cursor-pointer focus:outline-hidden"
                    >
                      {/* Label Teks Rata Kanan di Sebelah Kiri Icon */}
                      <div
                        className={cn(
                          "px-3 py-1.5 rounded-2xl shadow-lg border backdrop-blur-xl transition-all duration-150 flex items-center gap-1.5",
                          isSubActive
                            ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-indigo-600/30 scale-105"
                            : "bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border-white/60 dark:border-slate-700/60 font-semibold hover:bg-white dark:hover:bg-slate-800 group-hover:scale-102 shadow-black/15"
                        )}
                      >
                        {sub.badge && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white shrink-0 leading-none shadow-xs">
                            {sub.badge}
                          </span>
                        )}
                        <span className="text-xs text-right whitespace-nowrap leading-none tracking-tight">
                          {sub.label}
                        </span>
                      </div>

                      {/* Icon Bulat Melayang di Sebelah Kanan */}
                      <div
                        className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-xl border backdrop-blur-xl transition-all duration-150 group-hover:scale-110",
                          isSubActive
                            ? "bg-indigo-600 text-white border-indigo-300 ring-2 ring-indigo-400/80 shadow-indigo-600/40"
                            : cn(
                                "bg-white/95 dark:bg-slate-900/95 border-white/80 dark:border-slate-700/80 shadow-black/20",
                                sub.color || "text-indigo-600 dark:text-indigo-400"
                              )
                        )}
                      >
                        <SubIcon size={19} className="stroke-[2.2]" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM NAVIGATION (SHOPEE STYLE - MAX 6 TOMBOL DENGAN TEMA ROLE) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-auto">
        {/* Root Bottom Navigation Bar */}
        <nav
          aria-label="Navigasi Bawah Seluler"
          className={cn(
            "w-full backdrop-blur-lg px-1 pt-1 pb-[calc(0.4rem+env(safe-area-inset-bottom))] flex items-center shadow-2xl transition-all duration-200",
            currentTheme.navBarClass
          )}
        >
          <div className="flex items-center justify-around w-full">
            {activeTabsList.map(item => {
              const ItemIcon = item.icon;
              const isSelected = item.isActive(location.pathname, currentTab);
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isFlyoutOpen = openFlyoutId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all duration-150 select-none flex-1 cursor-pointer relative min-w-0',
                    isSelected || isFlyoutOpen
                      ? currentTheme.activeTextClass
                      : currentTheme.inactiveTextClass
                  )}
                >
                  <div
                    className={cn(
                      'p-1 sm:p-1.5 rounded-xl transition-all relative flex items-center justify-center',
                      isSelected || isFlyoutOpen
                        ? currentTheme.activePillClass
                        : 'bg-transparent'
                    )}
                  >
                    <ItemIcon size={19} className="stroke-[2.2]" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1.5 text-[7.5px] font-black px-1 py-0.2 rounded-full bg-rose-500 text-white shadow-xs leading-none">
                        {item.badge}
                      </span>
                    )}
                    {hasChildren && (
                      <span className={cn("absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-pulse", currentTheme.dotColorClass)} />
                    )}
                  </div>
                  <span className="truncate max-w-[58px] text-center tracking-tight text-[9.5px] sm:text-[10px] leading-tight">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
});
BottomNavigation.displayName = 'BottomNavigation';
export default BottomNavigation;