import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  BookOpen, 
  BookOpenCheck,
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
  ScrollText, 
  HeartHandshake, 
  FileText, 
  Trophy, 
  LayoutGrid,
  Award,
  FileCheck2,
  ShieldAlert,
  Layers,
  CalendarCheck,
  GraduationCap,
  ArrowLeft,
  ArrowLeftRight,
  FileSpreadsheet,
  Inbox,
  Send,
  Wrench,
  Printer,
  Building2,
  CheckCircle2,
  Package,
  PiggyBank,
  ScanLine,
  AlertTriangle,
  HandCoins,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useExecutivePillarStore, type ExecutivePillar } from '@/store/executivePillarStore';
import { getUserPositions } from '@/config/navigation.config';

export interface MobileBottomSubItem {
  id: string;
  label: string;
  icon: any;
  targetPath: string;
  badge?: string | number | null;
  color?: string;
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
    // ════ 1. EKOSISTEM KAPROG ════
    if (activeEcosystem === 'kaprog') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'jadwal',
          label: 'KBM Guru',
          shortLabel: 'KBM',
          icon: BookOpen,
          targetPath: '/dashboard?tab=jadwal',
          isActive: (p, t) => t === 'jadwal' || p.startsWith('/attendance/my-attendance'),
        },
        {
          id: 'kaprog_siswa',
          label: 'Data Siswa Jurusan',
          shortLabel: 'Siswa',
          icon: GraduationCap,
          targetPath: '/dashboard?tab=kaprog&subtab=siswa',
          isActive: (p, t) => t === 'kaprog' && currentSubtab === 'siswa',
        },
        {
          id: 'kaprog_pkl',
          label: 'PKL & Industri Mitra',
          shortLabel: 'PKL',
          icon: Briefcase,
          targetPath: '/dashboard?tab=kaprog&subtab=pkl',
          isActive: (p, t) => t === 'kaprog' && currentSubtab === 'pkl',
        },
        {
          id: 'kaprog_kehadiran',
          label: 'Presensi Rombel Jurusan',
          shortLabel: 'Presensi',
          icon: CalendarCheck,
          targetPath: '/dashboard?tab=kaprog&subtab=kehadiran',
          isActive: (p, t) => t === 'kaprog' && currentSubtab === 'kehadiran',
        },
        {
          id: 'kaprog_menu',
          label: `Menu ${kaprogJurusan?.nama || 'Jurusan'}`,
          shortLabel: 'Menu Jurusan',
          icon: LayoutGrid,
          badge: kaprogJurusan?.singkatan || 'KAPROG',
          targetPath: '/dashboard?tab=kaprog',
          isActive: (p, t) => t === 'kaprog' && Boolean(currentSubtab && !['beranda', 'siswa', 'pkl', 'kehadiran'].includes(currentSubtab)),
          children: [
            { id: 'beranda', label: 'Ringkasan Beranda', icon: Home, targetPath: '/dashboard?tab=kaprog&subtab=beranda', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
            { id: 'siswa', label: 'Data Siswa', icon: GraduationCap, targetPath: '/dashboard?tab=kaprog&subtab=siswa', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'pkl', label: 'PKL & Mitra', icon: Briefcase, targetPath: '/dashboard?tab=kaprog&subtab=pkl', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'kehadiran', label: 'Presensi Rombel', icon: CalendarCheck, targetPath: '/dashboard?tab=kaprog&subtab=kehadiran', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'pelanggaran', label: 'Pelanggaran Siswa', icon: ShieldAlert, targetPath: '/dashboard?tab=kaprog&subtab=pelanggaran', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
            { id: 'prestasi', label: 'Prestasi Siswa', icon: Trophy, targetPath: '/dashboard?tab=kaprog&subtab=prestasi', color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400' },
            { id: 'guru', label: 'Guru Produktif', icon: Users, targetPath: '/dashboard?tab=kaprog&subtab=guru', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'sarana', label: 'Sarana & Lab', icon: Wrench, targetPath: '/dashboard?tab=kaprog&subtab=sarana', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
            { id: 'ukk', label: 'UKK Sertifikasi', icon: Award, targetPath: '/dashboard?tab=kaprog&subtab=ukk', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
            { id: 'rapor', label: 'Cetak Rapor', icon: Printer, targetPath: '/dashboard?tab=kaprog&subtab=rapor', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
          ],
        },
      ];
    }

    // ════ 2. EKOSISTEM WALI KELAS ════
    if (activeEcosystem === 'walas') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'jadwal',
          label: 'KBM Guru',
          shortLabel: 'KBM',
          icon: BookOpen,
          targetPath: '/dashboard?tab=jadwal',
          isActive: (p, t) => t === 'jadwal' || p.startsWith('/attendance/my-attendance'),
        },
        {
          id: 'walas_presensi',
          label: 'Presensi Rombel Binaan',
          shortLabel: 'Presensi',
          icon: CalendarCheck,
          targetPath: '/dashboard?tab=binaan&subtab=presensi',
          isActive: (p, t) => t === 'binaan' && currentSubtab === 'presensi',
        },
        {
          id: 'walas_jurnal',
          label: 'Jurnal Harian Walas',
          shortLabel: 'Jurnal',
          icon: BookOpenCheck,
          targetPath: '/dashboard?tab=binaan&subtab=jurnal',
          isActive: (p, t) => t === 'binaan' && currentSubtab === 'jurnal',
        },
        {
          id: 'walas_izin',
          label: 'Persetujuan Izin Siswa',
          shortLabel: 'Izin',
          icon: FileCheck2,
          targetPath: '/dashboard?tab=binaan&subtab=izin',
          isActive: (p, t) => t === 'binaan' && currentSubtab === 'izin',
        },
        {
          id: 'walas_menu',
          label: `Menu Kelas ${waliKelasNama || ''}`,
          shortLabel: 'Menu Walas',
          icon: LayoutGrid,
          badge: waliKelasNama || 'WALAS',
          targetPath: '/dashboard?tab=binaan',
          isActive: (p, t) => t === 'binaan' && Boolean(currentSubtab && !['ringkasan', 'presensi', 'jurnal', 'izin'].includes(currentSubtab)),
          children: [
            { id: 'ringkasan', label: 'Ringkasan Beranda', icon: Home, targetPath: '/dashboard?tab=binaan&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
            { id: 'siswa', label: 'Data Siswa', icon: Users, targetPath: '/dashboard?tab=binaan&subtab=siswa', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'presensi', label: 'Presensi Rombel', icon: CalendarCheck, targetPath: '/dashboard?tab=binaan&subtab=presensi', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'jurnal', label: 'Jurnal Walas', icon: BookOpenCheck, targetPath: '/dashboard?tab=binaan&subtab=jurnal', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'izin', label: 'Persetujuan Izin', icon: FileCheck2, targetPath: '/dashboard?tab=binaan&subtab=izin', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'disiplin', label: 'Pelanggaran Siswa', icon: ShieldAlert, targetPath: '/dashboard?tab=binaan&subtab=disiplin', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
            { id: 'prestasi', label: 'Prestasi Siswa', icon: Award, targetPath: '/dashboard?tab=binaan&subtab=prestasi', color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400' },
            { id: 'rekap', label: 'Cetak & Rekap', icon: FileSpreadsheet, targetPath: '/dashboard?tab=binaan&subtab=rekap', color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400' },
            { id: 'rapor', label: 'Cetak Rapor', icon: Printer, targetPath: '/dashboard?tab=binaan&subtab=rapor', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
          ],
        },
      ];
    }

    // ════ 3. EKOSISTEM TATA USAHA ════
    if (activeEcosystem === 'tu') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: isPendidik ? '/dashboard?tab=ringkasan' : '/dashboard?tab=kepegawaian&subtab=beranda',
          isActive: () => false,
        },
        {
          id: 'tu_surat_masuk',
          label: 'Surat Masuk',
          shortLabel: 'Surat Masuk',
          icon: Inbox,
          targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk',
          isActive: (p, t) => t === 'kepegawaian' && currentSubtab === 'surat-masuk',
        },
        {
          id: 'tu_surat_keluar',
          label: 'Surat Keluar',
          shortLabel: 'Surat Keluar',
          icon: Send,
          targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keluar',
          isActive: (p, t) => t === 'kepegawaian' && currentSubtab === 'surat-keluar',
        },
        {
          id: 'tu_buku_induk',
          label: 'Buku Induk & Klapper',
          shortLabel: 'Buku Induk',
          icon: BookOpen,
          targetPath: '/dashboard?tab=kepegawaian&subtab=buku-induk',
          isActive: (p, t) => t === 'kepegawaian' && currentSubtab === 'buku-induk',
        },
        {
          id: 'tu_mutasi',
          label: 'Mutasi & BAST Ijazah',
          shortLabel: 'Mutasi & BAST',
          icon: ArrowLeftRight,
          targetPath: '/dashboard?tab=kepegawaian&subtab=mutasi',
          isActive: (p, t) => t === 'kepegawaian' && (currentSubtab === 'mutasi' || currentSubtab === 'bast-ijazah'),
        },
        {
          id: 'tu_menu',
          label: tuTabMeta.label || 'Menu Tata Usaha',
          shortLabel: 'Menu TU',
          icon: LayoutGrid,
          badge: tuTabMeta.badge || 'TU',
          targetPath: '/dashboard?tab=kepegawaian',
          isActive: (p, t) => t === 'kepegawaian' && Boolean(currentSubtab && !['beranda', 'surat-masuk', 'surat-keluar', 'buku-induk', 'mutasi'].includes(currentSubtab)),
          children: [
            { id: 'beranda', label: 'Ringkasan Beranda', icon: Home, targetPath: '/dashboard?tab=kepegawaian&subtab=beranda', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
            { id: 'surat-masuk', label: 'Surat Masuk', icon: Inbox, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'surat-keluar', label: 'Surat Keluar', icon: Send, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keluar', color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400' },
            { id: 'surat-keterangan', label: 'Surat Keterangan', icon: FileText, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keterangan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'mutasi', label: 'Mutasi Siswa', icon: ArrowLeftRight, targetPath: '/dashboard?tab=kepegawaian&subtab=mutasi', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
            { id: 'bast-ijazah', label: 'Clearance & BAST', icon: Award, targetPath: '/dashboard?tab=kepegawaian&subtab=bast-ijazah', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'dkn', label: 'DKN & Kelulusan', icon: FileSpreadsheet, targetPath: '/dashboard?tab=kepegawaian&subtab=dkn', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'buku-induk', label: 'Data Siswa & Klapper', icon: BookOpen, targetPath: '/dashboard?tab=kepegawaian&subtab=buku-induk', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
            { id: 'kepegawaian', label: 'Kepegawaian PTK', icon: Users, targetPath: '/dashboard?tab=kepegawaian&subtab=kepegawaian', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
          ],
        },
      ];
    }

    // ════ 4. EKOSISTEM KURIKULUM ════
    if (activeEcosystem === 'kurikulum') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'kuri_jadwal',
          label: 'Jadwal Pelajaran',
          shortLabel: 'Jadwal KBM',
          icon: Calendar,
          targetPath: '/kurikulum/jadwal',
          isActive: (p) => p.startsWith('/kurikulum/jadwal'),
        },
        {
          id: 'kuri_plotting',
          label: 'Plotting Guru & Mapel',
          shortLabel: 'Plotting',
          icon: Users,
          targetPath: '/kurikulum/guru-mapel',
          isActive: (p) => p.startsWith('/kurikulum/guru-mapel'),
        },
        {
          id: 'kuri_perangkat',
          label: 'Perangkat & Modul Ajar',
          shortLabel: 'Perangkat',
          icon: FileText,
          targetPath: '/kurikulum/perangkat',
          isActive: (p) => p.startsWith('/kurikulum/perangkat'),
        },
        {
          id: 'kuri_supervisi',
          label: 'Supervisi Akademik',
          shortLabel: 'Supervisi',
          icon: CheckCircle2,
          targetPath: '/kurikulum/supervisi',
          isActive: (p) => p.startsWith('/kurikulum/supervisi'),
        },
        {
          id: 'kuri_menu',
          label: 'Menu Kurikulum',
          shortLabel: 'Menu Kuri',
          icon: LayoutGrid,
          badge: 'KURI',
          targetPath: '/kurikulum/jadwal',
          isActive: (p) => p.startsWith('/kurikulum') && !['/kurikulum/jadwal', '/kurikulum/guru-mapel', '/kurikulum/perangkat', '/kurikulum/supervisi'].includes(p),
          children: [
            { id: 'jadwal', label: 'Jadwal KBM', icon: Calendar, targetPath: '/kurikulum/jadwal', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'guru-mapel', label: 'Guru & Mapel', icon: Users, targetPath: '/kurikulum/guru-mapel', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'perangkat', label: 'Perangkat Ajar', icon: FileText, targetPath: '/kurikulum/perangkat', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'supervisi', label: 'Supervisi KBM', icon: CheckCircle2, targetPath: '/kurikulum/supervisi', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'kalender', label: 'Kalender Pendidikan', icon: CalendarCheck, targetPath: '/kurikulum/kalender', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
            { id: 'kosp', label: 'KOSP & Kurikulum', icon: BookOpen, targetPath: '/kurikulum/kosp', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
          ],
        },
      ];
    }

    // ════ 5. EKOSISTEM KESISWAAN ════
    if (activeEcosystem === 'kesiswaan') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'kesis_pelanggaran',
          label: 'Pelanggaran & Disiplin',
          shortLabel: 'Pelanggaran',
          icon: ShieldAlert,
          targetPath: '/kesiswaan/pelanggaran',
          isActive: (p) => p.startsWith('/kesiswaan/pelanggaran'),
        },
        {
          id: 'kesis_prestasi',
          label: 'Prestasi Siswa',
          shortLabel: 'Prestasi',
          icon: Trophy,
          targetPath: '/kesiswaan/prestasi',
          isActive: (p) => p.startsWith('/kesiswaan/prestasi'),
        },
        {
          id: 'kesis_dhuha',
          label: 'Pembiasaan & Dhuha',
          shortLabel: 'Pembiasaan',
          icon: HeartPulse,
          targetPath: '/kesiswaan/dhuha',
          isActive: (p) => p.startsWith('/kesiswaan/dhuha'),
        },
        {
          id: 'kesis_taruna',
          label: 'Ketarunaan & Ekskul',
          shortLabel: 'Ekskul',
          icon: Award,
          targetPath: '/kesiswaan/ketarunaan',
          isActive: (p) => p.startsWith('/kesiswaan/ketarunaan'),
        },
        {
          id: 'kesis_menu',
          label: 'Menu Kesiswaan',
          shortLabel: 'Menu Kesis',
          icon: LayoutGrid,
          badge: 'KESIS',
          targetPath: '/kesiswaan/pelanggaran',
          isActive: (p) => p.startsWith('/kesiswaan') && !['/kesiswaan/pelanggaran', '/kesiswaan/prestasi', '/kesiswaan/dhuha', '/kesiswaan/ketarunaan'].includes(p),
          children: [
            { id: 'pelanggaran', label: 'Pelanggaran Siswa', icon: ShieldAlert, targetPath: '/kesiswaan/pelanggaran', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
            { id: 'prestasi', label: 'Prestasi Siswa', icon: Trophy, targetPath: '/kesiswaan/prestasi', color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400' },
            { id: 'dhuha', label: 'Monitoring Dhuha', icon: HeartPulse, targetPath: '/kesiswaan/dhuha', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'ketarunaan', label: 'Taruna & Ekskul', icon: Award, targetPath: '/kesiswaan/ketarunaan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'tatib', label: 'Master Tata Tertib', icon: FileSpreadsheet, targetPath: '/kesiswaan/tatib', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'rekap', label: 'Rekap & Laporan', icon: Printer, targetPath: '/kesiswaan/rekap', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
          ],
        },
      ];
    }

    // ════ 6. EKOSISTEM HUBIN (HUBUNGAN INDUSTRI & PKL) ════
    if (activeEcosystem === 'hubin') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'hubin_absensi',
          label: 'Presensi Siswa PKL',
          shortLabel: 'Presensi PKL',
          icon: CalendarCheck,
          targetPath: '/hubin/absensi',
          isActive: (p) => p.startsWith('/hubin/absensi'),
        },
        {
          id: 'hubin_mitra',
          label: 'Mitra Industri DUDI',
          shortLabel: 'Mitra DUDI',
          icon: Building2,
          targetPath: '/hubin/mitra',
          isActive: (p) => p.startsWith('/hubin/mitra'),
        },
        {
          id: 'hubin_plotting',
          label: 'Penempatan Siswa PKL',
          shortLabel: 'Plotting PKL',
          icon: Briefcase,
          targetPath: '/hubin/penempatan',
          isActive: (p) => p.startsWith('/hubin/penempatan'),
        },
        {
          id: 'hubin_nilai',
          label: 'Nilai & Sidang PKL',
          shortLabel: 'Nilai & Sidang',
          icon: Award,
          targetPath: '/hubin/nilai-pkl',
          isActive: (p) => p.startsWith('/hubin/nilai-pkl'),
        },
        {
          id: 'hubin_menu',
          label: 'Menu Hubungan Industri',
          shortLabel: 'Menu Hubin',
          icon: LayoutGrid,
          badge: 'HUBIN',
          targetPath: '/hubin/absensi',
          isActive: (p) => p.startsWith('/hubin') && !['/hubin/absensi', '/hubin/mitra', '/hubin/penempatan', '/hubin/nilai-pkl'].includes(p),
          children: [
            { id: 'absensi', label: 'Presensi PKL', icon: CalendarCheck, targetPath: '/hubin/absensi', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'mitra', label: 'Mitra DUDI', icon: Building2, targetPath: '/hubin/mitra', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'penempatan', label: 'Penempatan PKL', icon: Briefcase, targetPath: '/hubin/penempatan', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'nilai-pkl', label: 'Nilai & Sidang', icon: Award, targetPath: '/hubin/nilai-pkl', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
            { id: 'monitoring', label: 'Monitoring Guru', icon: Users, targetPath: '/hubin/monitoring', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'jurnal', label: 'Jurnal PKL', icon: BookOpen, targetPath: '/hubin/jurnal', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
          ],
        },
      ];
    }

    // ════ 7. EKOSISTEM KONSELING (BP/BK) ════
    if (activeEcosystem === 'bpbk') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'bk_dashboard',
          label: 'Radar EWS Siswa',
          shortLabel: 'Radar EWS',
          icon: AlertTriangle,
          targetPath: '/bpbk/dashboard',
          isActive: (p) => p.startsWith('/bpbk/dashboard'),
        },
        {
          id: 'bk_konseling',
          label: 'Sesi Konseling Siswa',
          shortLabel: 'Konseling',
          icon: HeartHandshake,
          targetPath: '/bpbk/konseling',
          isActive: (p) => p.startsWith('/bpbk/konseling'),
        },
        {
          id: 'bk_cases',
          label: 'Rekam Kasus Siswa',
          shortLabel: 'Kasus Siswa',
          icon: ShieldAlert,
          targetPath: '/bpbk/cases',
          isActive: (p) => p.startsWith('/bpbk/cases'),
        },
        {
          id: 'bk_rujukan',
          label: 'Verifikasi Rujukan Guru',
          shortLabel: 'Rujukan',
          icon: Inbox,
          targetPath: '/bpbk/rujukan',
          isActive: (p) => p.startsWith('/bpbk/rujukan'),
        },
        {
          id: 'bk_menu',
          label: 'Menu Bimbingan Konseling',
          shortLabel: 'Menu BK',
          icon: LayoutGrid,
          badge: 'BK',
          targetPath: '/bpbk/dashboard',
          isActive: (p) => p.startsWith('/bpbk') && !['/bpbk/dashboard', '/bpbk/konseling', '/bpbk/cases', '/bpbk/rujukan'].includes(p),
          children: [
            { id: 'dashboard', label: 'Radar EWS', icon: AlertTriangle, targetPath: '/bpbk/dashboard', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
            { id: 'konseling', label: 'Sesi Konseling', icon: HeartHandshake, targetPath: '/bpbk/konseling', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
            { id: 'cases', label: 'Kasus Siswa', icon: ShieldAlert, targetPath: '/bpbk/cases', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'rujukan', label: 'Verifikasi Rujukan', icon: Inbox, targetPath: '/bpbk/rujukan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'panggilan', label: 'Panggilan Ortu', icon: FileSpreadsheet, targetPath: '/bpbk/panggilan', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'home-visit', label: 'Home Visit', icon: Home, targetPath: '/bpbk/home-visit', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
          ],
        },
      ];
    }

    // ════ 8. EKOSISTEM BKK (BURSA KERJA KHUSUS & ALUMNI) ════
    if (activeEcosystem === 'bkk') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'bkk_loker',
          label: 'Lowongan Kerja Mitra',
          shortLabel: 'Loker Mitra',
          icon: Briefcase,
          targetPath: '/hubin/bkk?tab=loker',
          isActive: (p) => p.startsWith('/hubin/bkk') && (!searchParams.get('tab') || searchParams.get('tab') === 'loker'),
        },
        {
          id: 'bkk_pelamar',
          label: 'Pelamar Alumni',
          shortLabel: 'Pelamar',
          icon: Users,
          targetPath: '/hubin/bkk?tab=pelamar',
          isActive: (p) => p.startsWith('/hubin/bkk') && searchParams.get('tab') === 'pelamar',
        },
        {
          id: 'bkk_tracer',
          label: 'Tracer Study Alumni',
          shortLabel: 'Tracer Study',
          icon: GraduationCap,
          targetPath: '/hubin/tracer',
          isActive: (p) => p.startsWith('/hubin/tracer'),
        },
        {
          id: 'bkk_mitra',
          label: 'Mitra Penyalur Kerja',
          shortLabel: 'Mitra Penyalur',
          icon: Building2,
          targetPath: '/hubin/bkk?tab=mitra',
          isActive: (p) => p.startsWith('/hubin/bkk') && searchParams.get('tab') === 'mitra',
        },
        {
          id: 'bkk_menu',
          label: 'Menu Bursa Kerja Khusus',
          shortLabel: 'Menu BKK',
          icon: LayoutGrid,
          badge: 'BKK',
          targetPath: '/hubin/bkk',
          isActive: (p) => p.startsWith('/hubin/bkk') && Boolean(searchParams.get('tab') && !['loker', 'pelamar', 'mitra'].includes(searchParams.get('tab') || '')),
          children: [
            { id: 'loker', label: 'Lowongan Aktif', icon: Briefcase, targetPath: '/hubin/bkk?tab=loker', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'pelamar', label: 'Verifikasi Pelamar', icon: Users, targetPath: '/hubin/bkk?tab=pelamar', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'tracer', label: 'Tracer Study Alumni', icon: GraduationCap, targetPath: '/hubin/tracer', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
            { id: 'mitra', label: 'Mitra Rekanan', icon: Building2, targetPath: '/hubin/bkk?tab=mitra', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'seleksi', label: 'Jadwal Tes Seleksi', icon: CalendarCheck, targetPath: '/hubin/bkk?tab=seleksi', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
          ],
        },
      ];
    }

    // ════ 9. EKOSISTEM SARPRAS ════
    if (activeEcosystem === 'sarpras') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'sarpras_inv',
          label: 'Katalog Inventaris',
          shortLabel: 'Katalog Aset',
          icon: Layers,
          targetPath: '/sarpras/inventory',
          isActive: (p) => p.startsWith('/sarpras/inventory'),
        },
        {
          id: 'sarpras_loans',
          label: 'Peminjaman Alat & Ruang',
          shortLabel: 'Peminjaman',
          icon: ArrowLeftRight,
          targetPath: '/sarpras/loans',
          isActive: (p) => p.startsWith('/sarpras/loans'),
        },
        {
          id: 'sarpras_maint',
          label: 'Servis & Perawatan',
          shortLabel: 'Perawatan',
          icon: Wrench,
          targetPath: '/sarpras/maintenance',
          isActive: (p) => p.startsWith('/sarpras/maintenance'),
        },
        {
          id: 'sarpras_ruangan',
          label: 'Ruangan & Fasilitas',
          shortLabel: 'Ruang & Lab',
          icon: Building2,
          targetPath: '/sarpras/ruangan',
          isActive: (p) => p.startsWith('/sarpras/ruangan'),
        },
        {
          id: 'sarpras_menu',
          label: 'Menu Sarana & Prasarana',
          shortLabel: 'Menu Sarpras',
          icon: LayoutGrid,
          badge: 'SARPRAS',
          targetPath: '/sarpras/inventory',
          isActive: (p) => p.startsWith('/sarpras') && !['/sarpras/inventory', '/sarpras/loans', '/sarpras/maintenance', '/sarpras/ruangan'].includes(p),
          children: [
            { id: 'inventory', label: 'Inventaris & Barcode', icon: Layers, targetPath: '/sarpras/inventory', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
            { id: 'loans', label: 'Peminjaman Aset', icon: ArrowLeftRight, targetPath: '/sarpras/loans', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'maintenance', label: 'Servis & Kerusakan', icon: Wrench, targetPath: '/sarpras/maintenance', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'ruangan', label: 'Fasilitas & Ruangan', icon: Building2, targetPath: '/sarpras/ruangan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'pengadaan', label: 'Usulan Pengadaan', icon: FileSpreadsheet, targetPath: '/sarpras/pengadaan', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
          ],
        },
      ];
    }

    // ════ 10. EKOSISTEM KOPERASI ════
    if (activeEcosystem === 'koperasi') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'coop_pos',
          label: 'Kasir POS Belanja',
          shortLabel: 'Kasir POS',
          icon: ShoppingCart,
          targetPath: '/cooperative/pos',
          isActive: (p) => p.startsWith('/cooperative/pos'),
        },
        {
          id: 'coop_savings',
          label: 'Simpanan Anggota',
          shortLabel: 'Simpanan',
          icon: PiggyBank,
          targetPath: '/cooperative/savings',
          isActive: (p) => p.startsWith('/cooperative/savings'),
        },
        {
          id: 'coop_loans',
          label: 'Pinjaman & Angsuran',
          shortLabel: 'Pinjaman',
          icon: HandCoins,
          targetPath: '/cooperative/loans',
          isActive: (p) => p.startsWith('/cooperative/loans'),
        },
        {
          id: 'coop_products',
          label: 'Stok Barang & Produk',
          shortLabel: 'Stok Produk',
          icon: Package,
          targetPath: '/cooperative/products',
          isActive: (p) => p.startsWith('/cooperative/products'),
        },
        {
          id: 'coop_menu',
          label: 'Menu Koperasi',
          shortLabel: 'Menu Koperasi',
          icon: LayoutGrid,
          badge: 'KOP',
          targetPath: '/cooperative/pos',
          isActive: (p) => p.startsWith('/cooperative') && !['/cooperative/pos', '/cooperative/savings', '/cooperative/loans', '/cooperative/products'].includes(p),
          children: [
            { id: 'pos', label: 'Kasir POS', icon: ShoppingCart, targetPath: '/cooperative/pos', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
            { id: 'savings', label: 'Simpanan Anggota', icon: PiggyBank, targetPath: '/cooperative/savings', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'loans', label: 'Pinjaman Anggota', icon: HandCoins, targetPath: '/cooperative/loans', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'products', label: 'Manajemen Produk', icon: Package, targetPath: '/cooperative/products', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
            { id: 'members', label: 'Buku Anggota', icon: Users, targetPath: '/cooperative/members', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'shu', label: 'Laporan SHU & RAT', icon: FileSpreadsheet, targetPath: '/cooperative/shu', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
          ],
        },
      ];
    }

    // ════ 11. EKOSISTEM PIKET & GERBANG ════
    if (activeEcosystem === 'piket') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'piket_scan',
          label: 'Scan Gerbang RFID',
          shortLabel: 'Scan Gerbang',
          icon: ScanLine,
          targetPath: '/attendance/gate-scanner',
          isActive: (p) => p.startsWith('/attendance/gate-scanner'),
        },
        {
          id: 'piket_terlambat',
          label: 'Siswa Terlambat',
          shortLabel: 'Terlambat',
          icon: AlertTriangle,
          targetPath: '/attendance/terlambat',
          isActive: (p) => p.startsWith('/attendance/terlambat'),
        },
        {
          id: 'piket_dispensasi',
          label: 'Izin Keluar & Dispensasi',
          shortLabel: 'Izin Keluar',
          icon: FileCheck2,
          targetPath: '/attendance/dispensasi',
          isActive: (p) => p.startsWith('/attendance/dispensasi'),
        },
        {
          id: 'piket_kosong',
          label: 'Kelas Kosong & Delegasi',
          shortLabel: 'Guru Kosong',
          icon: BookOpen,
          targetPath: '/dashboard?tab=jadwal',
          isActive: (p, t) => t === 'jadwal',
        },
        {
          id: 'piket_menu',
          label: 'Menu Piket & Keamanan',
          shortLabel: 'Menu Piket',
          icon: LayoutGrid,
          badge: 'PIKET',
          targetPath: '/attendance/gate-scanner',
          isActive: (p) => p.startsWith('/attendance') && !['/attendance/gate-scanner', '/attendance/terlambat', '/attendance/dispensasi'].includes(p),
          children: [
            { id: 'gate-scanner', label: 'Scan Gerbang', icon: ScanLine, targetPath: '/attendance/gate-scanner', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
            { id: 'terlambat', label: 'Siswa Terlambat', icon: AlertTriangle, targetPath: '/attendance/terlambat', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
            { id: 'dispensasi', label: 'Dispensasi Izin', icon: FileCheck2, targetPath: '/attendance/dispensasi', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
            { id: 'jurnal-piket', label: 'Buku Jurnal Piket', icon: BookOpenCheck, targetPath: '/attendance/jurnal-piket', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
            { id: 'buku-tamu', label: 'Buku Tamu Sekolah', icon: Users, targetPath: '/attendance/buku-tamu', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
          ],
        },
      ];
    }

    // ════ 12. EKOSISTEM ADMIN ════
    if (activeEcosystem === 'admin') {
      return [
        {
          id: 'portal_back',
          label: 'Kembali ke Portal',
          shortLabel: 'Kembali',
          icon: ArrowLeft,
          targetPath: '/dashboard?tab=ringkasan',
          isActive: () => false,
        },
        {
          id: 'admin_academic',
          label: 'Data Master Akademik',
          shortLabel: 'Master',
          icon: ShieldCheck,
          targetPath: '/academic',
          isActive: (p) => p.startsWith('/academic'),
        },
        {
          id: 'admin_users',
          label: 'Manajemen Pengguna',
          shortLabel: 'Pengguna',
          icon: Users,
          targetPath: '/users',
          isActive: (p) => p.startsWith('/users'),
        },
        {
          id: 'admin_divisi',
          label: 'Semua Dashboard Divisi',
          shortLabel: 'Divisi',
          icon: LayoutGrid,
          targetPath: '/dashboard',
          isActive: () => false,
          children: teacherDashboards,
        },
        {
          id: 'admin_profil',
          label: 'Profil Saya',
          shortLabel: 'Profil',
          icon: User,
          targetPath: '/dashboard?tab=profil',
          isActive: (p, t) => t === 'profil' || p.startsWith('/profile'),
        },
      ];
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
    // Layer 1: Portal Base Role (Siswa, Kepsek, atau Guru di Portal Utama /dashboard?tab=ringkasan)
    if (activeEcosystem === 'portal' || isSiswa || isKepsek) {
      return {
        isLayer2: false,
        navBarClass: 'bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl',
        activeTextClass: 'text-indigo-600 dark:text-indigo-400 font-bold',
        inactiveTextClass: 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium',
        activePillClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs',
        dotColorClass: 'bg-indigo-600 dark:bg-indigo-400',
      };
    }

    // Layer 2: Masing-masing Ekosistem Role memiliki warna solid/gradient yang sangat kontras dan jelas
    switch (activeEcosystem) {
      case 'kaprog':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 text-white border-t-2 border-amber-300 shadow-2xl shadow-amber-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-amber-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-amber-200',
        };
      case 'walas':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-sky-600 via-sky-600 to-blue-700 text-white border-t-2 border-sky-300 shadow-2xl shadow-sky-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-sky-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-sky-200',
        };
      case 'tu':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-indigo-700 via-indigo-700 to-slate-800 text-white border-t-2 border-indigo-300 shadow-2xl shadow-indigo-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-indigo-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-indigo-200',
        };
      case 'kurikulum':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white border-t-2 border-emerald-300 shadow-2xl shadow-emerald-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-emerald-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-emerald-200',
        };
      case 'kesiswaan':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 text-white border-t-2 border-rose-300 shadow-2xl shadow-rose-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-rose-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-rose-200',
        };
      case 'hubin':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-orange-600 via-orange-600 to-amber-700 text-white border-t-2 border-orange-300 shadow-2xl shadow-orange-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-orange-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-orange-200',
        };
      case 'bpbk':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-purple-600 via-purple-600 to-violet-800 text-white border-t-2 border-purple-300 shadow-2xl shadow-purple-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-purple-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-purple-200',
        };
      case 'bkk':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-cyan-700 via-cyan-700 to-blue-800 text-white border-t-2 border-cyan-300 shadow-2xl shadow-cyan-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-cyan-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-cyan-200',
        };
      case 'sarpras':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-800 text-white border-t-2 border-teal-300 shadow-2xl shadow-teal-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-teal-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-teal-200',
        };
      case 'koperasi':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-emerald-700 via-emerald-700 to-green-800 text-white border-t-2 border-emerald-300 shadow-2xl shadow-emerald-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-emerald-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-emerald-200',
        };
      case 'piket':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-blue-800 via-blue-800 to-slate-900 text-white border-t-2 border-blue-400 shadow-2xl shadow-blue-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-blue-100/75 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-blue-200',
        };
      case 'admin':
        return {
          isLayer2: true,
          navBarClass: 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-950 text-white border-t-2 border-slate-500 shadow-2xl shadow-slate-950/40',
          activeTextClass: 'text-white font-black',
          inactiveTextClass: 'text-slate-300 hover:text-white font-medium',
          activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
          dotColorClass: 'bg-slate-300',
        };
      default:
        return {
          isLayer2: false,
          navBarClass: 'bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl',
          activeTextClass: 'text-indigo-600 dark:text-indigo-400 font-bold',
          inactiveTextClass: 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium',
          activePillClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs',
          dotColorClass: 'bg-indigo-600 dark:bg-indigo-400',
        };
    }
  }, [activeEcosystem, isSiswa, isKepsek]);

  const activeTabsList = isSiswa ? siswaTabs : isKepsek ? kepsekTabs : staffTabs;
  const openFlyoutItem = activeTabsList.find(item => item.id === openFlyoutId);
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

    // Khusus Kepala Sekolah: Switching 6 pilar instan tanpa reload rute / tanpa reset
    if (isKepsek && ['kbm', 'kesiswaan', 'bk', 'sarpras', 'hubin', 'tu'].includes(item.id)) {
      setPillar(item.id as ExecutivePillar);
      if (location.pathname !== '/dashboard' || currentTab === 'profil') {
        navigate('/dashboard');
      }
      return;
    }
    navigate(item.targetPath);
  };
  const handleSubItemClick = (subItem: MobileBottomSubItem) => {
    setOpenFlyoutId(null);
    navigate(subItem.targetPath);
  };
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