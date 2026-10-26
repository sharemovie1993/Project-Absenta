import { 
  BookOpen, 
  BookOpenCheck,
  Users, 
  ShieldCheck, 
  Briefcase, 
  ShoppingCart, 
  User, 
  Calendar, 
  Clock,
  Home, 
  HeartPulse, 
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
  Shield,
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
  LucideIcon
} from 'lucide-react';

export interface MobileBottomSubItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon | any;
  targetPath: string;
  badge?: string | number | null;
  color?: string;
}

export interface MobileBottomTabItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon | any;
  badge?: string;
  targetPath: string;
  isActive: (pathname: string, currentTabParam: string | null) => boolean;
  children?: MobileBottomSubItem[];
}

export type EcosystemType = 
  | 'kaprog' 
  | 'walas' 
  | 'tu' 
  | 'kurikulum' 
  | 'kesiswaan' 
  | 'hubin' 
  | 'bpbk' 
  | 'bkk' 
  | 'sarpras' 
  | 'koperasi' 
  | 'piket' 
  | 'admin' 
  | 'portal';

export interface EcosystemTheme {
  isLayer2: boolean;
  navBarClass: string;
  activeTextClass: string;
  inactiveTextClass: string;
  activePillClass: string;
  dotColorClass: string;
}

/**
 * Mendapatkan tema visual Layer 1 (Portal) vs Layer 2 (Workspace Ekosistem)
 * Warna disesuaikan dengan identitas brand masing-masing divisi untuk kontras maksimal di mobile.
 */
export function getEcosystemTheme(
  ecosystem: EcosystemType, 
  isSiswa: boolean = false, 
  isKepsek: boolean = false
): EcosystemTheme {
  if (ecosystem === 'portal' || isSiswa || isKepsek) {
    return {
      isLayer2: false,
      navBarClass: 'bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl',
      activeTextClass: 'text-indigo-600 dark:text-indigo-400 font-bold',
      inactiveTextClass: 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium',
      activePillClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs',
      dotColorClass: 'bg-indigo-600 dark:bg-indigo-400',
    };
  }

  switch (ecosystem) {
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
}

// ══════════════════════════════════════════════════════════════════════
// 12 GENERATOR TABS EKOSISTEM INDIVIDUAL (ISOLATED & PURE)
// ══════════════════════════════════════════════════════════════════════

export function getKaprogTabs(kaprogJurusan: any, currentSubtab: string | null): MobileBottomTabItem[] {
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
      id: 'kaprog_ukk',
      label: 'Sertifikasi & Uji Kompetensi',
      shortLabel: 'UKK & Uji',
      icon: Award,
      targetPath: '/dashboard?tab=kaprog&subtab=ukk',
      isActive: (p, t) => t === 'kaprog' && currentSubtab === 'ukk',
    },
    {
      id: 'kaprog_menu',
      label: `Menu ${kaprogJurusan?.nama || 'Jurusan'}`,
      shortLabel: 'Menu Jurusan',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=kaprog',
      isActive: (p, t) => t === 'kaprog' && Boolean(currentSubtab && !['beranda', 'siswa', 'pkl', 'kehadiran', 'ukk'].includes(currentSubtab)),
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

export function getWalasTabs(waliKelasNama: string, currentSubtab: string | null): MobileBottomTabItem[] {
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
      id: 'walas_beranda',
      label: 'Beranda Rombel Binaan',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=binaan&subtab=ringkasan',
      isActive: (p, t) => t === 'binaan' && (!currentSubtab || currentSubtab === 'ringkasan'),
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
      id: 'walas_menu',
      label: `Menu Kelas ${waliKelasNama || ''}`,
      shortLabel: 'Menu Walas',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=binaan',
      isActive: (p, t) => t === 'binaan' && Boolean(currentSubtab && !['ringkasan', 'izin', 'presensi', 'jurnal'].includes(currentSubtab)),
      children: [
        { id: 'siswa', label: 'Data Siswa & Kontak', icon: Users, targetPath: '/dashboard?tab=binaan&subtab=siswa', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'struktur', label: 'Struktur & Piket Kelas', icon: Shield, targetPath: '/dashboard?tab=binaan&subtab=struktur', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'disiplin', label: 'Kasus & Rujukan BK', icon: ShieldAlert, targetPath: '/dashboard?tab=binaan&subtab=disiplin', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'prestasi', label: 'Prestasi Siswa', icon: Award, targetPath: '/dashboard?tab=binaan&subtab=prestasi', color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400' },
        { id: 'rekap', label: 'Cetak Rekap F-BK', icon: FileSpreadsheet, targetPath: '/dashboard?tab=binaan&subtab=rekap', color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400' },
        { id: 'rapor', label: 'Cetak Rapor Siswa', icon: Printer, targetPath: '/dashboard?tab=binaan&subtab=rapor', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
        { id: 'profil', label: 'Profil Saya & Akun', icon: User, targetPath: '/dashboard?tab=profil', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
      ],
    },
  ];
}

export function getTuTabs(tuTabMeta: any, currentSubtab: string | null, isPendidik: boolean): MobileBottomTabItem[] {
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

export function getKurikulumTabs(currentSubtab?: string | null): MobileBottomTabItem[] {
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
      id: 'kuri_ringkasan',
      label: 'Beranda Kurikulum',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=kurikulum&subtab=ringkasan',
      isActive: (p, t) => t === 'kurikulum' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'kuri_jadwal',
      label: 'Jadwal Pelajaran',
      shortLabel: 'Jadwal KBM',
      icon: Calendar,
      targetPath: '/dashboard?tab=kurikulum&subtab=jadwal',
      isActive: (p, t) => (t === 'kurikulum' && currentSubtab === 'jadwal') || p.startsWith('/kurikulum/jadwal'),
    },
    {
      id: 'kuri_plotting',
      label: 'Plotting Guru & Mapel',
      shortLabel: 'Plotting',
      icon: Users,
      targetPath: '/dashboard?tab=kurikulum&subtab=guru_mapel',
      isActive: (p, t) => (t === 'kurikulum' && currentSubtab === 'guru_mapel') || p.startsWith('/kurikulum/guru-mapel'),
    },
    {
      id: 'kuri_perangkat',
      label: 'Perangkat & Modul Ajar',
      shortLabel: 'Perangkat',
      icon: FileText,
      targetPath: '/dashboard?tab=kurikulum&subtab=perangkat',
      isActive: (p, t) => (t === 'kurikulum' && currentSubtab === 'perangkat') || p.startsWith('/kurikulum/perangkat'),
    },
    {
      id: 'kuri_supervisi',
      label: 'Supervisi Akademik',
      shortLabel: 'Supervisi',
      icon: CheckCircle2,
      targetPath: '/dashboard?tab=kurikulum&subtab=supervisi',
      isActive: (p, t) => (t === 'kurikulum' && currentSubtab === 'supervisi') || p.startsWith('/kurikulum/supervisi'),
    },
    {
      id: 'kuri_menu',
      label: 'Menu Kurikulum',
      shortLabel: 'Menu Kuri',
      icon: LayoutGrid,
      badge: 'KURI',
      targetPath: '/dashboard?tab=kurikulum',
      isActive: (p, t) => t === 'kurikulum' && ['struktur', 'piket', 'rapor'].includes(currentSubtab || ''),
      children: [
        { id: 'struktur', label: 'Struktur Kurikulum', icon: Layers, targetPath: '/dashboard?tab=kurikulum&subtab=struktur', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'piket', label: 'Jadwal Piket', icon: Clock, targetPath: '/dashboard?tab=kurikulum&subtab=piket', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'rapor', label: 'Pleno Rapor', icon: Award, targetPath: '/dashboard?tab=kurikulum&subtab=rapor', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'jadwal-page', label: 'Jadwal Builder', icon: Calendar, targetPath: '/kurikulum/jadwal', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'guru-mapel-page', label: 'Kelola Guru Mapel', icon: Users, targetPath: '/kurikulum/guru-mapel', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'perangkat-page', label: 'Kelola Perangkat', icon: FileText, targetPath: '/kurikulum/perangkat', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
        { id: 'supervisi-page', label: 'Kelola Supervisi', icon: CheckCircle2, targetPath: '/kurikulum/supervisi', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
      ],
    },
  ];
}

export function getKesiswaanTabs(): MobileBottomTabItem[] {
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

export function getHubinTabs(): MobileBottomTabItem[] {
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

export function getBpbkTabs(): MobileBottomTabItem[] {
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

export function getBkkTabs(tabQuery: string | null): MobileBottomTabItem[] {
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
      isActive: (p) => p.startsWith('/hubin/bkk') && (!tabQuery || tabQuery === 'loker'),
    },
    {
      id: 'bkk_pelamar',
      label: 'Pelamar Alumni',
      shortLabel: 'Pelamar',
      icon: Users,
      targetPath: '/hubin/bkk?tab=pelamar',
      isActive: (p) => p.startsWith('/hubin/bkk') && tabQuery === 'pelamar',
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
      isActive: (p) => p.startsWith('/hubin/bkk') && tabQuery === 'mitra',
    },
    {
      id: 'bkk_menu',
      label: 'Menu Bursa Kerja Khusus',
      shortLabel: 'Menu BKK',
      icon: LayoutGrid,
      badge: 'BKK',
      targetPath: '/hubin/bkk',
      isActive: (p) => p.startsWith('/hubin/bkk') && Boolean(tabQuery && !['loker', 'pelamar', 'mitra'].includes(tabQuery || '')),
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

export function getSarprasTabs(): MobileBottomTabItem[] {
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

export function getKoperasiTabs(): MobileBottomTabItem[] {
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

export function getPiketTabs(): MobileBottomTabItem[] {
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
      id: 'piket_jurnal',
      label: 'Buku Jurnal Piket Harian',
      shortLabel: 'Jurnal Piket',
      icon: BookOpenCheck,
      targetPath: '/attendance/jurnal-piket',
      isActive: (p) => p.startsWith('/attendance/jurnal-piket'),
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

export function getAdminTabs(teacherDashboards: MobileBottomSubItem[]): MobileBottomTabItem[] {
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
