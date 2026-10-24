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
  ArrowLeftRight,
  FileSpreadsheet,
  Inbox,
  Send,
  Wrench,
  Printer,
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
  const currentTab = searchParams.get('tab');
  const currentSubtab = searchParams.get('subtab');

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

  // 1. Siswa Mobile Bottom Tabs
  const hasPklAccess = isSiswa && can('hubin.self.pkl');
  const siswaTabs = useMemo<MobileBottomTabItem[]>(() => {
    const tabs: MobileBottomTabItem[] = [
      {
        id: 'beranda',
        label: 'Beranda',
        shortLabel: 'Beranda',
        icon: Home,
        targetPath: '/dashboard',
        isActive: pathname => pathname === '/dashboard' || pathname === '/dashboard/'
      },
      {
        id: 'jadwal',
        label: 'Jadwal KBM',
        shortLabel: 'Jadwal',
        icon: Calendar,
        targetPath: '/kbm/jadwal',
        isActive: pathname => pathname.startsWith('/kbm/jadwal')
      },
    ];

    // Tab PKL: muncul untuk siswa yang punya capability hubin.self.pkl
    if (hasPklAccess) {
      tabs.push({
        id: 'pkl',
        label: 'Presensi PKL',
        shortLabel: 'PKL',
        icon: Briefcase,
        targetPath: '/hubin/absensi',
        isActive: pathname => pathname.startsWith('/hubin/absensi')
      });
    }

    tabs.push(
      {
        id: 'presensi',
        label: 'Presensi',
        shortLabel: 'Absensi',
        icon: Clock,
        targetPath: '/my-attendance',
        isActive: pathname => pathname.startsWith('/my-attendance')
      },
      {
        id: 'profil',
        label: 'Profil',
        shortLabel: 'Profil',
        icon: User,
        targetPath: '/profile',
        isActive: pathname => pathname.startsWith('/profile')
      }
    );

    return tabs;
  }, [hasPklAccess]);

  // 1.1 Kepala Sekolah Mobile Bottom Tabs (6 Pilar 360° + Profil)
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

  // 2. Staff / Guru / Waka / Admin Mobile Bottom Tabs (Strictly 4-Tombol Berstandar Divisi)
  const staffTabs = useMemo<MobileBottomTabItem[]>(() => {
    // ── KASUS 1: TATA USAHA (TU) ──
    if (isTuStaff && !isKepsek) {
      return [
        {
          id: 'ringkasan',
          label: 'Beranda TU',
          shortLabel: 'Beranda',
          icon: Home,
          targetPath: '/dashboard?tab=kepegawaian&subtab=beranda',
          isActive: (pathname, tabParam) =>
            pathname.startsWith('/dashboard') && tabParam === 'kepegawaian' && (!currentSubtab || currentSubtab === 'beranda'),
        },
        {
          id: 'agenda_surat',
          label: 'Agenda Surat',
          shortLabel: 'Surat',
          icon: Inbox,
          targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk',
          isActive: (pathname, tabParam) => tabParam === 'kepegawaian' && currentSubtab === 'surat-masuk',
        },
        {
          id: 'layanan_tu',
          label: 'Menu Tab Layanan TU',
          shortLabel: 'Layanan TU',
          icon: ClipboardList,
          badge: tuTabMeta.badge || 'TU',
          targetPath: '/dashboard?tab=kepegawaian',
          isActive: (pathname, tabParam) =>
            tabParam === 'kepegawaian' && Boolean(currentSubtab && currentSubtab !== 'beranda' && currentSubtab !== 'surat-masuk'),
          children: [
            {
              id: 'surat-masuk',
              label: 'Surat Masuk',
              icon: Inbox,
              targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk',
              color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
            },
            {
              id: 'surat-keluar',
              label: 'Surat Keluar',
              icon: Send,
              targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keluar',
              color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400',
            },
            {
              id: 'surat-keterangan',
              label: 'Surat Keterangan',
              icon: FileText,
              targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keterangan',
              color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
            },
            {
              id: 'mutasi',
              label: 'Mutasi Siswa',
              icon: ArrowLeftRight,
              targetPath: '/dashboard?tab=kepegawaian&subtab=mutasi',
              color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
            },
            {
              id: 'bast-ijazah',
              label: 'Clearance & BAST',
              icon: Award,
              targetPath: '/dashboard?tab=kepegawaian&subtab=bast-ijazah',
              color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
            },
            {
              id: 'dkn',
              label: 'DKN & Kelulusan',
              icon: FileSpreadsheet,
              targetPath: '/dashboard?tab=kepegawaian&subtab=dkn',
              color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
            },
            {
              id: 'buku-induk',
              label: 'Data Siswa & Klapper',
              icon: BookOpen,
              targetPath: '/dashboard?tab=kepegawaian&subtab=buku-induk',
              color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
            },
            {
              id: 'kepegawaian',
              label: 'Kepegawaian PTK',
              icon: Users,
              targetPath: '/dashboard?tab=kepegawaian&subtab=kepegawaian',
              color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
            },
          ],
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
    }

    // ── KASUS 2: KAPROG / KEPALA PROGRAM KEAHLIAN ──
    if (isKaprog && !isKepsek) {
      return [
        {
          id: 'ringkasan',
          label: 'Beranda Kaprog',
          shortLabel: 'Beranda',
          icon: Home,
          targetPath: '/dashboard?tab=kaprog&subtab=beranda',
          isActive: (pathname, tabParam) =>
            pathname.startsWith('/dashboard') && tabParam === 'kaprog' && (!currentSubtab || currentSubtab === 'beranda'),
        },
        {
          id: 'jadwal',
          label: 'KBM Guru',
          shortLabel: 'KBM',
          icon: BookOpen,
          targetPath: '/dashboard?tab=jadwal',
          isActive: (pathname, tabParam) => tabParam === 'jadwal' || pathname.startsWith('/attendance'),
        },
        {
          id: 'modul_kaprog',
          label: `Menu Tab ${kaprogJurusan?.nama || 'Kejuruan'}`,
          shortLabel: 'Modul Jurusan',
          icon: Award,
          badge: kaprogJurusan?.singkatan || 'KAPROG',
          targetPath: '/dashboard?tab=kaprog',
          isActive: (pathname, tabParam) =>
            tabParam === 'kaprog' && Boolean(currentSubtab && currentSubtab !== 'beranda'),
          children: [
            {
              id: 'siswa',
              label: 'Data Siswa',
              icon: GraduationCap,
              targetPath: '/dashboard?tab=kaprog&subtab=siswa',
              color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
            },
            {
              id: 'pkl',
              label: 'PKL & Industri',
              icon: Briefcase,
              targetPath: '/dashboard?tab=kaprog&subtab=pkl',
              color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
            },
            {
              id: 'kehadiran',
              label: 'Presensi Rombel',
              icon: CalendarCheck,
              targetPath: '/dashboard?tab=kaprog&subtab=kehadiran',
              color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
            },
            {
              id: 'pelanggaran',
              label: 'Pelanggaran Siswa',
              icon: ShieldAlert,
              targetPath: '/dashboard?tab=kaprog&subtab=pelanggaran',
              color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
            },
            {
              id: 'prestasi',
              label: 'Prestasi Siswa',
              icon: Trophy,
              targetPath: '/dashboard?tab=kaprog&subtab=prestasi',
              color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400',
            },
            {
              id: 'guru',
              label: 'Guru Produktif',
              icon: Users,
              targetPath: '/dashboard?tab=kaprog&subtab=guru',
              color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
            },
            {
              id: 'sarana',
              label: 'Sarana & Lab',
              icon: Wrench,
              targetPath: '/dashboard?tab=kaprog&subtab=sarana',
              color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
            },
            {
              id: 'ukk',
              label: 'UKK Sertifikasi',
              icon: Award,
              targetPath: '/dashboard?tab=kaprog&subtab=ukk',
              color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
            },
            {
              id: 'rapor',
              label: 'Cetak Rapor',
              icon: Printer,
              targetPath: '/dashboard?tab=kaprog&subtab=rapor',
              color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
            },
          ],
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
    }

    // ── KASUS 3: WALI KELAS ──
    if (isWaliKelas && !isKepsek) {
      return [
        {
          id: 'ringkasan',
          label: 'Beranda Kelas Binaan',
          shortLabel: 'Beranda',
          icon: Home,
          targetPath: '/dashboard?tab=binaan&subtab=ringkasan',
          isActive: (pathname, tabParam) =>
            pathname.startsWith('/dashboard') && (!tabParam || tabParam === 'binaan') && (!currentSubtab || currentSubtab === 'ringkasan'),
        },
        {
          id: 'jadwal',
          label: 'KBM Guru',
          shortLabel: 'KBM',
          icon: BookOpen,
          targetPath: '/dashboard?tab=jadwal',
          isActive: (pathname, tabParam) => tabParam === 'jadwal' || pathname.startsWith('/attendance'),
        },
        {
          id: 'modul_walas',
          label: `Menu Tab Kelas ${waliKelasNama || ''}`,
          shortLabel: 'Modul Walas',
          icon: Users,
          badge: waliKelasNama || 'WALAS',
          targetPath: '/dashboard?tab=binaan',
          isActive: (pathname, tabParam) =>
            (tabParam === 'binaan' || !tabParam) && Boolean(currentSubtab && currentSubtab !== 'ringkasan'),
          children: [
            {
              id: 'siswa',
              label: 'Data Siswa',
              icon: Users,
              targetPath: '/dashboard?tab=binaan&subtab=siswa',
              color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
            },
            {
              id: 'presensi',
              label: 'Presensi Rombel',
              icon: CalendarCheck,
              targetPath: '/dashboard?tab=binaan&subtab=presensi',
              color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
            },
            {
              id: 'jurnal',
              label: 'Jurnal Walas',
              icon: BookOpen,
              targetPath: '/dashboard?tab=binaan&subtab=jurnal',
              color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
            },
            {
              id: 'izin',
              label: 'Persetujuan Izin',
              icon: FileCheck2,
              targetPath: '/dashboard?tab=binaan&subtab=izin',
              color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
            },
            {
              id: 'disiplin',
              label: 'Pelanggaran Siswa',
              icon: ShieldAlert,
              targetPath: '/dashboard?tab=binaan&subtab=disiplin',
              color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
            },
            {
              id: 'prestasi',
              label: 'Prestasi Siswa',
              icon: Award,
              targetPath: '/dashboard?tab=binaan&subtab=prestasi',
              color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400',
            },
            {
              id: 'rekap',
              label: 'Cetak & Rekap',
              icon: FileSpreadsheet,
              targetPath: '/dashboard?tab=binaan&subtab=rekap',
              color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
            },
            {
              id: 'rapor',
              label: 'Cetak Rapor',
              icon: Printer,
              targetPath: '/dashboard?tab=binaan&subtab=rapor',
              color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
            },
          ],
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
    }

    // ── KASUS 4: ADMIN SISTEM ──
    if (isAdminRole && !isKepsek) {
      return [
        {
          id: 'admin',
          label: 'Beranda Admin',
          shortLabel: 'Beranda',
          icon: Home,
          targetPath: '/dashboard?tab=admin',
          isActive: (pathname, tabParam) => pathname.startsWith('/dashboard') && (!tabParam || tabParam === 'admin'),
        },
        {
          id: 'academic',
          label: 'Data Master',
          shortLabel: 'Master',
          icon: ShieldCheck,
          targetPath: '/academic',
          isActive: (pathname) => pathname.startsWith('/academic'),
        },
        {
          id: 'users',
          label: 'Manajemen Pengguna',
          shortLabel: 'Pengguna',
          icon: Users,
          targetPath: '/users',
          isActive: (pathname) => pathname.startsWith('/users'),
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
    }

    // ── KASUS 5: GURU MURNI & STAF UMUM ──
    return [
      {
        id: 'ringkasan',
        label: isPureGerbangStaff ? 'Scan Gerbang' : 'Beranda',
        shortLabel: isPureGerbangStaff ? 'Gerbang' : 'Beranda',
        icon: Home,
        targetPath: '/dashboard',
        isActive: (pathname, tabParam) => (pathname === '/dashboard' || pathname === '/dashboard/') && (!tabParam || tabParam === 'ringkasan'),
      },
      {
        id: 'jadwal',
        label: isPureGerbangStaff ? 'Pos Keamanan' : 'KBM & Absen',
        shortLabel: isPureGerbangStaff ? 'Piket' : 'KBM',
        icon: isPureGerbangStaff ? Clock : BookOpen,
        targetPath: isPureGerbangStaff ? '/dashboard?tab=kelola' : '/dashboard?tab=jadwal',
        isActive: (pathname, tabParam) => isPureGerbangStaff ? tabParam === 'kelola' : tabParam === 'jadwal' || pathname.startsWith('/attendance'),
      },
      {
        id: 'riwayat',
        label: 'Presensi Saya',
        shortLabel: 'Absensi',
        icon: Clock,
        targetPath: '/my-attendance',
        isActive: (pathname) => pathname.startsWith('/my-attendance'),
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
  }, [
    isKepsek,
    isAdminRole,
    isTuStaff,
    isKaprog,
    kaprogJurusan,
    isWaliKelas,
    waliKelasNama,
    currentSubtab,
    isPureGerbangStaff,
    tuTabMeta,
  ]);
  if (location.pathname.startsWith('/parent-app') || location.pathname.startsWith('/cooperative/rat')) {
    return null;
  }
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
      {/* ── APP LAUNCHER BOTTOM SHEET FOR TABS WITH CHILDREN (MOBILE ONLY) ── */}
      <AnimatePresence>
        {openFlyoutItem && openFlyoutItem.children && (
          <>
            {/* Backdrop overlay to dismiss on tap */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenFlyoutId(null)}
              className="lg:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs"
            />

            {/* Bottom Sheet App Launcher Container */}
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800 rounded-t-3xl p-4 sm:p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl max-w-lg mx-auto"
            >
              {/* Drag Handle Bar */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {openFlyoutItem.label}
                    </h3>
                    {openFlyoutItem.badge && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 font-mono shrink-0">
                        {openFlyoutItem.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih menu tab untuk beralih tampilan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenFlyoutId(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer shrink-0 ml-2"
                >
                  <X size={16} />
                </button>
              </div>

              {/* App Launcher Grid (4 columns squircle) */}
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3 py-1">
                {openFlyoutItem.children.map(sub => {
                  const SubIcon = sub.icon;
                  const isSubActive = currentSubtab === sub.id;
                  const colorClass = sub.color || 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400';

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubItemClick(sub)}
                      className="group flex flex-col items-center justify-start p-1.5 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 active:scale-95 transition-all duration-150 cursor-pointer text-center w-full select-none"
                    >
                      <div
                        className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-all duration-150 border mb-1.5 relative',
                          colorClass,
                          isSubActive
                            ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 border-indigo-500 shadow-md scale-105'
                            : 'border-slate-200/50 dark:border-slate-800/50'
                        )}
                      >
                        <SubIcon className="w-5 h-5 stroke-[2.2]" />
                        {sub.badge && (
                          <span className="absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs leading-none">
                            {sub.badge}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] sm:text-[11px] font-medium leading-tight line-clamp-2 text-center break-words transition-colors',
                          isSubActive
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {sub.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM NAVIGATION (EXACT 4 TOMBOL PRESISI) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-auto">
        {/* Root Bottom Navigation Bar */}
        <nav aria-label="Navigasi Bawah Seluler" className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center shadow-2xl">
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
                    'flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1 cursor-pointer relative',
                    isSelected || isFlyoutOpen
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-xl transition-all relative',
                      isSelected || isFlyoutOpen
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'bg-transparent'
                    )}
                  >
                    <ItemIcon size={19} />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full bg-indigo-600 text-white leading-none scale-75">
                        {item.badge}
                      </span>
                    )}
                    {hasChildren && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                    )}
                  </div>
                  <span className="truncate max-w-[68px] font-bold text-[10px] leading-tight">
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