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
  Laptop,
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
  Activity,
  MailOpen,
  Share2,
  ClipboardList,
  Compass,
  Scan,
  LogOut,
  UserCheck,
  ClipboardCheck,
  Scale,
  LucideIcon
} from 'lucide-react';
import { getKaprogMobileChildren } from '@/components/dashboard/roles/kaprog/kaprogNavigation.config';

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
  | 'siswa'
  | 'kaprog' 
  | 'walas' 
  | 'tu' 
  | 'kurikulum' 
  | 'kesiswaan' 
  | 'hubin' 
  | 'bpbk' 
  | 'bkk' 
  | 'sarpras' 
  | 'toolman'
  | 'ekskul'
  | 'pembimbing_pkl'
  | 'satpam'
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
  fabClass?: string;
}

/**
 * Mendapatkan label formal ekosistem divisi untuk context eyebrow di topbar
 */
export function getEcosystemLabel(ecosystem: EcosystemType): string {
  switch (ecosystem) {
    case 'kurikulum': return 'Kurikulum';
    case 'hubin': return 'Hubinmas';
    case 'pembimbing_pkl': return 'Hubin • PKL';
    case 'bkk': return 'Hubin • BKK';
    case 'kesiswaan': return 'Kesiswaan';
    case 'ekskul': return 'Kesiswaan • Ekskul';
    case 'satpam': return 'Kesiswaan • Keamanan';
    case 'piket': return 'Kesiswaan • Piket';
    case 'kaprog': return 'Program Keahlian';
    case 'walas': return 'Wali Kelas';
    case 'tu': return 'Tata Usaha';
    case 'bpbk': return 'BK / Konseling';
    case 'sarpras': return 'Sarpras';
    case 'toolman': return 'Sarpras • Toolman';
    case 'koperasi': return 'Koperasi';
    case 'admin': return 'Administrator';
    case 'siswa': return 'Siswa';
    default: return 'Absenta';
  }
}

/**
 * ── DESIGN TOKEN SYSTEM: ECOSYSTEM COLOR TOKENS (SSOT) ──
 * Standar token warna tombol, gradien, badge, dan aksen terpadu per divisi ekosistem
 */
export interface EcosystemColorTokens {
  primaryColor: string;
  activeButton: string;
  activeIconBg: string;
  subtleBg: string;
  subtleText: string;
  badgeClass: string;
  borderClass: string;
  shadowClass: string;
}

export function getEcosystemTokens(ecosystem: EcosystemType): EcosystemColorTokens {
  switch (ecosystem) {
    case 'kurikulum':
      return {
        primaryColor: 'emerald-600',
        activeButton: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        subtleText: 'text-emerald-700 dark:text-emerald-300',
        badgeClass: 'bg-emerald-500 text-white',
        borderClass: 'border-emerald-200 dark:border-emerald-800/80',
        shadowClass: 'shadow-emerald-900/20',
      };
    case 'hubin':
    case 'bkk':
    case 'pembimbing_pkl':
      return {
        primaryColor: 'orange-600',
        activeButton: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-orange-50 dark:bg-orange-950/60',
        subtleText: 'text-orange-700 dark:text-orange-300',
        badgeClass: 'bg-orange-500 text-white',
        borderClass: 'border-orange-200 dark:border-orange-800/80',
        shadowClass: 'shadow-orange-900/20',
      };
    case 'kesiswaan':
    case 'ekskul':
    case 'satpam':
    case 'piket':
      return {
        primaryColor: 'rose-600',
        activeButton: 'bg-gradient-to-r from-rose-600 to-red-700 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-rose-50 dark:bg-rose-950/60',
        subtleText: 'text-rose-700 dark:text-rose-300',
        badgeClass: 'bg-rose-500 text-white',
        borderClass: 'border-rose-200 dark:border-rose-800/80',
        shadowClass: 'shadow-rose-900/20',
      };
    case 'walas':
      return {
        primaryColor: 'sky-600',
        activeButton: 'bg-gradient-to-r from-sky-600 to-blue-700 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-sky-50 dark:bg-sky-950/60',
        subtleText: 'text-sky-700 dark:text-sky-300',
        badgeClass: 'bg-sky-500 text-white',
        borderClass: 'border-sky-200 dark:border-sky-800/80',
        shadowClass: 'shadow-sky-900/20',
      };
    case 'kaprog':
      return {
        primaryColor: 'amber-600',
        activeButton: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-amber-50 dark:bg-amber-950/60',
        subtleText: 'text-amber-700 dark:text-amber-300',
        badgeClass: 'bg-amber-500 text-white',
        borderClass: 'border-amber-200 dark:border-amber-800/80',
        shadowClass: 'shadow-amber-900/20',
      };
    case 'tu':
      return {
        primaryColor: 'indigo-700',
        activeButton: 'bg-gradient-to-r from-indigo-700 to-slate-800 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        subtleText: 'text-indigo-700 dark:text-indigo-300',
        badgeClass: 'bg-indigo-600 text-white',
        borderClass: 'border-indigo-200 dark:border-indigo-800/80',
        shadowClass: 'shadow-indigo-950/20',
      };
    case 'bpbk':
      return {
        primaryColor: 'purple-600',
        activeButton: 'bg-gradient-to-r from-purple-600 to-violet-800 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-purple-50 dark:bg-purple-950/60',
        subtleText: 'text-purple-700 dark:text-purple-300',
        badgeClass: 'bg-purple-600 text-white',
        borderClass: 'border-purple-200 dark:border-purple-800/80',
        shadowClass: 'shadow-purple-900/20',
      };
    case 'sarpras':
    case 'toolman':
      return {
        primaryColor: 'teal-700',
        activeButton: 'bg-gradient-to-r from-teal-700 to-emerald-800 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-teal-50 dark:bg-teal-950/60',
        subtleText: 'text-teal-700 dark:text-teal-300',
        badgeClass: 'bg-teal-600 text-white',
        borderClass: 'border-teal-200 dark:border-teal-800/80',
        shadowClass: 'shadow-teal-900/20',
      };
    case 'koperasi':
      return {
        primaryColor: 'emerald-700',
        activeButton: 'bg-gradient-to-r from-emerald-700 to-green-800 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        subtleText: 'text-emerald-700 dark:text-emerald-300',
        badgeClass: 'bg-emerald-600 text-white',
        borderClass: 'border-emerald-200 dark:border-emerald-800/80',
        shadowClass: 'shadow-emerald-900/20',
      };
    case 'admin':
      return {
        primaryColor: 'slate-800',
        activeButton: 'bg-gradient-to-r from-slate-800 to-slate-950 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-slate-100 dark:bg-slate-800',
        subtleText: 'text-slate-800 dark:text-slate-200',
        badgeClass: 'bg-slate-800 text-white',
        borderClass: 'border-slate-300 dark:border-slate-700',
        shadowClass: 'shadow-slate-950/20',
      };
    case 'kepsek':
      return {
        primaryColor: 'indigo-800',
        activeButton: 'bg-gradient-to-r from-indigo-800 to-slate-900 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        subtleText: 'text-indigo-700 dark:text-indigo-300',
        badgeClass: 'bg-indigo-600 text-white',
        borderClass: 'border-indigo-200 dark:border-indigo-800/80',
        shadowClass: 'shadow-indigo-950/20',
      };
    case 'portal':
    case 'siswa':
    default:
      return {
        primaryColor: 'indigo-600',
        activeButton: 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white',
        activeIconBg: 'bg-white/20 text-white',
        subtleBg: 'bg-indigo-50 dark:bg-indigo-950/60',
        subtleText: 'text-indigo-600 dark:text-indigo-400',
        badgeClass: 'bg-indigo-600 text-white',
        borderClass: 'border-indigo-200 dark:border-indigo-800/80',
        shadowClass: 'shadow-indigo-600/25',
      };
  }
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
  if (ecosystem === 'portal' || ecosystem === 'siswa' || isSiswa || isKepsek) {
    return {
      isLayer2: false,
      navBarClass: 'bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl',
      activeTextClass: 'text-indigo-600 dark:text-indigo-400 font-bold',
      inactiveTextClass: 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium',
      activePillClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs',
      dotColorClass: 'bg-indigo-600 dark:bg-indigo-400',
      fabClass: 'bg-indigo-600 dark:bg-indigo-500 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-indigo-600/35',
    };
  }

  switch (ecosystem) {
    // 🟨 KAPROG (Jurusan / Kejuruan)
    case 'kaprog':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 text-white border-t-2 border-amber-300 shadow-2xl shadow-amber-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-amber-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-amber-200',
        fabClass: 'bg-gradient-to-tr from-amber-600 to-amber-700 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-amber-950/40',
      };

    // 🟦 WALI KELAS (Kelas Binaan & Pengasuhan Rombel)
    case 'walas':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-sky-600 via-sky-600 to-blue-700 text-white border-t-2 border-sky-300 shadow-2xl shadow-sky-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-sky-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-sky-200',
        fabClass: 'bg-gradient-to-tr from-sky-600 to-blue-700 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-sky-950/40',
      };

    // 🪪 TATA USAHA (Administrasi, Persuratan & Kepegawaian)
    case 'tu':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-indigo-700 via-indigo-700 to-slate-800 text-white border-t-2 border-indigo-300 shadow-2xl shadow-indigo-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-indigo-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-indigo-200',
        fabClass: 'bg-gradient-to-tr from-indigo-700 to-slate-800 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-indigo-950/40',
      };

    // 🟩 WAKA KURIKULUM (Akademik, KBM, Penjadwalan & CBT)
    case 'kurikulum':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white border-t-2 border-emerald-300 shadow-2xl shadow-emerald-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-emerald-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-emerald-200',
        fabClass: 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-emerald-950/40',
      };

    // 🟥 WAKA KESISWAAN (Induk: Kesiswaan, Ekskul, Piket, Satpam/Gerbang)
    case 'kesiswaan':
    case 'ekskul':
    case 'piket':
    case 'satpam':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 text-white border-t-2 border-rose-300 shadow-2xl shadow-rose-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-rose-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-rose-200',
        fabClass: 'bg-gradient-to-tr from-rose-600 to-red-700 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-rose-950/40',
      };

    // 🟧 WAKA HUBINMAS (Induk: Hubin, Pembimbing PKL, BKK/Tracer Study)
    case 'hubin':
    case 'pembimbing_pkl':
    case 'bkk':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-orange-600 via-orange-600 to-amber-700 text-white border-t-2 border-orange-300 shadow-2xl shadow-orange-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-orange-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-orange-200',
        fabClass: 'bg-gradient-to-tr from-orange-600 to-amber-700 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-orange-950/40',
      };

    // 🌲 WAKA SARPRAS (Induk: Sarpras & Toolman / Bengkel)
    case 'sarpras':
    case 'toolman':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-800 text-white border-t-2 border-teal-300 shadow-2xl shadow-teal-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-teal-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-teal-200',
        fabClass: 'bg-gradient-to-tr from-teal-700 to-emerald-800 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-teal-950/40',
      };

    // 🟪 BIMBINGAN KONSELING (BP / BK)
    case 'bpbk':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-purple-600 via-purple-600 to-violet-800 text-white border-t-2 border-purple-300 shadow-2xl shadow-purple-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-purple-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-purple-200',
        fabClass: 'bg-gradient-to-tr from-purple-600 to-violet-800 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-purple-950/40',
      };

    // 🟢 KOPERASI SEKOLAH (Ritel & Niaga)
    case 'koperasi':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-emerald-700 via-emerald-700 to-green-800 text-white border-t-2 border-emerald-300 shadow-2xl shadow-emerald-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-emerald-100/75 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-emerald-200',
        fabClass: 'bg-gradient-to-tr from-emerald-700 to-green-800 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-emerald-950/40',
      };

    // 👑 ADMINISTRATOR (IT Master Data & Platform)
    case 'admin':
      return {
        isLayer2: true,
        navBarClass: 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-950 text-white border-t-2 border-slate-500 shadow-2xl shadow-slate-950/40',
        activeTextClass: 'text-white font-black',
        inactiveTextClass: 'text-slate-300 hover:text-white font-medium',
        activePillClass: 'bg-white/25 text-white ring-1 ring-white/50 shadow-xs backdrop-blur-xs',
        dotColorClass: 'bg-slate-300',
        fabClass: 'bg-gradient-to-tr from-slate-800 to-slate-950 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-slate-950/40',
      };
    default:
      return {
        isLayer2: false,
        navBarClass: 'bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl',
        activeTextClass: 'text-indigo-600 dark:text-indigo-400 font-bold',
        inactiveTextClass: 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium',
        activePillClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs',
        dotColorClass: 'bg-indigo-600 dark:bg-indigo-400',
        fabClass: 'bg-indigo-600 dark:bg-indigo-500 text-white ring-4 ring-white dark:ring-slate-900 shadow-xl shadow-indigo-600/35',
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
      id: 'kaprog_menu',
      label: `Menu ${kaprogJurusan?.nama || 'Jurusan'}`,
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=kaprog',
      isActive: (p, t) => t === 'kaprog' && Boolean(currentSubtab && !['siswa', 'pkl', 'kehadiran'].includes(currentSubtab)),
      children: getKaprogMobileChildren(),
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
      id: 'walas_menu',
      label: `Menu Kelas ${waliKelasNama || ''}`,
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=binaan',
      isActive: (p, t) => t === 'binaan' && Boolean(currentSubtab && !['ringkasan', 'presensi', 'izin'].includes(currentSubtab)),
      children: [
        { id: 'ringkasan', label: 'Ringkasan', icon: Home, targetPath: '/dashboard?tab=binaan&subtab=ringkasan', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
        { id: 'siswa', label: 'Siswa', icon: Users, targetPath: '/dashboard?tab=binaan&subtab=siswa', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'struktur', label: 'Struktur', icon: Shield, targetPath: '/dashboard?tab=binaan&subtab=struktur', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'presensi', label: 'Presensi', icon: CalendarCheck, targetPath: '/dashboard?tab=binaan&subtab=presensi', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'deteksi', label: 'Deteksi', icon: ShieldAlert, targetPath: '/dashboard?tab=binaan&subtab=deteksi', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'ketuntasan', label: 'Ketuntasan', icon: Activity, targetPath: '/dashboard?tab=binaan&subtab=ketuntasan', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'jurnal', label: 'Jurnal', icon: BookOpenCheck, targetPath: '/dashboard?tab=binaan&subtab=jurnal', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
        { id: 'izin', label: 'Izin', icon: FileCheck2, targetPath: '/dashboard?tab=binaan&subtab=izin', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'disiplin', label: 'Disiplin', icon: ShieldAlert, targetPath: '/dashboard?tab=binaan&subtab=disiplin', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'prestasi', label: 'Prestasi', icon: Award, targetPath: '/dashboard?tab=binaan&subtab=prestasi', color: 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400' },
        { id: 'rekap', label: 'Rekap', icon: FileSpreadsheet, targetPath: '/dashboard?tab=binaan&subtab=rekap', color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400' },
        { id: 'rapor', label: 'Rapor', icon: Printer, targetPath: '/dashboard?tab=binaan&subtab=rapor', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
      ],
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
      id: 'walas_izin',
      label: 'Persetujuan Izin Siswa',
      shortLabel: 'Izin',
      icon: FileCheck2,
      targetPath: '/dashboard?tab=binaan&subtab=izin',
      isActive: (p, t) => t === 'binaan' && currentSubtab === 'izin',
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
      shortLabel: 'Masuk',
      icon: Inbox,
      targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk',
      isActive: (p, t) => t === 'kepegawaian' && currentSubtab === 'surat-masuk',
    },
    {
      id: 'tu_menu',
      label: tuTabMeta.label || 'Menu Tata Usaha',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      badge: tuTabMeta.badge,
      targetPath: '/dashboard?tab=kepegawaian',
      isActive: (p, t) => t === 'kepegawaian' && Boolean(currentSubtab && !['beranda', 'surat-masuk', 'surat-keluar', 'buku-induk'].includes(currentSubtab)),
      children: [
        { id: 'beranda', label: 'Ringkasan', icon: Home, targetPath: '/dashboard?tab=kepegawaian&subtab=beranda', color: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400' },
        { id: 'surat-masuk', label: 'Masuk', icon: Inbox, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-masuk', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'surat-keluar', label: 'Keluar', icon: Send, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keluar', color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400' },
        { id: 'surat-keterangan', label: 'Keterangan', icon: FileText, targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keterangan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'mutasi', label: 'Mutasi', icon: ArrowLeftRight, targetPath: '/dashboard?tab=kepegawaian&subtab=mutasi', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'bast-ijazah', label: 'Clearance', icon: Award, targetPath: '/dashboard?tab=kepegawaian&subtab=bast-ijazah', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'dkn', label: 'DKN', icon: FileSpreadsheet, targetPath: '/dashboard?tab=kepegawaian&subtab=dkn', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'buku-induk', label: 'Klapper', icon: BookOpen, targetPath: '/dashboard?tab=kepegawaian&subtab=buku-induk', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
        { id: 'kepegawaian', label: 'PTK', icon: Users, targetPath: '/dashboard?tab=kepegawaian&subtab=kepegawaian', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
      ],
    },
    {
      id: 'tu_surat_keluar',
      label: 'Surat Keluar',
      shortLabel: 'Keluar',
      icon: Send,
      targetPath: '/dashboard?tab=kepegawaian&subtab=surat-keluar',
      isActive: (p, t) => t === 'kepegawaian' && currentSubtab === 'surat-keluar',
    },
    {
      id: 'tu_buku_induk',
      label: 'Buku Induk & Klapper',
      shortLabel: 'Klapper',
      icon: BookOpen,
      targetPath: '/dashboard?tab=kepegawaian&subtab=buku-induk',
      isActive: (p, t) => t === 'kepegawaian' && currentSubtab === 'buku-induk',
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
      id: 'kuri_menu',
      label: 'Menu Kurikulum',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=kurikulum',
      isActive: (p, t) => t === 'kurikulum' && Boolean(currentSubtab && !['ringkasan', 'jadwal', 'guru_mapel'].includes(currentSubtab)),
      children: [
        { id: 'struktur', label: 'Struktur', icon: Layers, targetPath: '/dashboard?tab=kurikulum&subtab=struktur', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'piket', label: 'Piket', icon: Clock, targetPath: '/dashboard?tab=kurikulum&subtab=piket', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'rapor', label: 'Rapor', icon: Award, targetPath: '/dashboard?tab=kurikulum&subtab=rapor', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'jadwal-page', label: 'Jadwal', icon: Calendar, targetPath: '/kurikulum/jadwal', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'guru-mapel-page', label: 'Guru', icon: Users, targetPath: '/kurikulum/guru-mapel', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'perangkat-page', label: 'Perangkat', icon: FileText, targetPath: '/kurikulum/perangkat', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
        { id: 'supervisi-page', label: 'Supervisi', icon: CheckCircle2, targetPath: '/kurikulum/supervisi', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
      ],
    },
    {
      id: 'kuri_jadwal',
      label: 'Jadwal Pelajaran',
      shortLabel: 'Jadwal',
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
  ];
}

export function getKesiswaanTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'kesis_ringkasan',
      label: 'Beranda Kesiswaan',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=kesiswaan&subtab=ringkasan',
      isActive: (p, t) => t === 'kesiswaan' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'kesis_menu',
      label: 'Menu Kesiswaan',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=kesiswaan',
      isActive: (p, t) => t === 'kesiswaan' && Boolean(currentSubtab && !['ringkasan', 'pelanggaran', 'prestasi'].includes(currentSubtab)),
      children: [
        { id: 'ketarunaan', label: 'Ketarunaan', icon: Award, targetPath: '/dashboard?tab=kesiswaan&subtab=ketarunaan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'tatib', label: 'Tatib', icon: FileSpreadsheet, targetPath: '/dashboard?tab=kesiswaan&subtab=tatib', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'rekap', label: 'Rekap', icon: Printer, targetPath: '/dashboard?tab=kesiswaan&subtab=rekap', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'monitoring-page', label: 'Monitoring', icon: Activity, targetPath: '/kesiswaan/monitoring', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'pelanggaran-page', label: 'Pelanggaran', icon: ShieldAlert, targetPath: '/kesiswaan/pelanggaran', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'prestasi-page', label: 'Prestasi', icon: Trophy, targetPath: '/kesiswaan/prestasi', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
      ],
    },
    {
      id: 'kesis_pelanggaran',
      label: 'Pelanggaran & Disiplin',
      shortLabel: 'Pelanggaran',
      icon: ShieldAlert,
      targetPath: '/dashboard?tab=kesiswaan&subtab=pelanggaran',
      isActive: (p, t) => (t === 'kesiswaan' && currentSubtab === 'pelanggaran') || p.startsWith('/kesiswaan/pelanggaran'),
    },
    {
      id: 'kesis_prestasi',
      label: 'Prestasi Siswa',
      shortLabel: 'Prestasi',
      icon: Trophy,
      targetPath: '/dashboard?tab=kesiswaan&subtab=prestasi',
      isActive: (p, t) => (t === 'kesiswaan' && currentSubtab === 'prestasi') || p.startsWith('/kesiswaan/prestasi'),
    },
  ];
}

export function getHubinTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'hubin_ringkasan',
      label: 'Beranda Hubin',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=hubin&subtab=ringkasan',
      isActive: (p, t) => t === 'hubin' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'hubin_menu',
      label: 'Menu Hubin',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=hubin',
      isActive: (p, t) => t === 'hubin' && Boolean(currentSubtab && !['ringkasan', 'mitra', 'penempatan'].includes(currentSubtab)),
      children: [
        { id: 'absensi', label: 'Presensi', icon: CalendarCheck, targetPath: '/dashboard?tab=hubin&subtab=absensi', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'nilai', label: 'Penilaian', icon: Award, targetPath: '/dashboard?tab=hubin&subtab=nilai', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'bkk', label: 'BKK', icon: Briefcase, targetPath: '/dashboard?tab=hubin&subtab=bkk', color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400' },
        { id: 'tracer', label: 'Tracer', icon: GraduationCap, targetPath: '/dashboard?tab=hubin&subtab=tracer', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'rekap', label: 'Cetak', icon: Printer, targetPath: '/dashboard?tab=hubin&subtab=rekap', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'tv-page', label: 'TV', icon: Activity, targetPath: '/hubin/dashboard', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
      ],
    },
    {
      id: 'hubin_mitra',
      label: 'Mitra Industri DU-DI',
      shortLabel: 'Mitra',
      icon: Building2,
      targetPath: '/dashboard?tab=hubin&subtab=mitra',
      isActive: (p, t) => (t === 'hubin' && currentSubtab === 'mitra') || p.startsWith('/hubin/mitra'),
    },
    {
      id: 'hubin_penempatan',
      label: 'Penempatan Siswa PKL',
      shortLabel: 'Penempatan',
      icon: Briefcase,
      targetPath: '/dashboard?tab=hubin&subtab=penempatan',
      isActive: (p, t) => (t === 'hubin' && currentSubtab === 'penempatan') || p.startsWith('/hubin/penempatan'),
    },
  ];
}

export function getBpbkTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'bk_ringkasan',
      label: 'Beranda Konseling',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=bpbk&subtab=ringkasan',
      isActive: (p, t) => t === 'bpbk' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'bk_menu',
      label: 'Menu Konseling',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=bpbk',
      isActive: (p, t) => t === 'bpbk' && Boolean(currentSubtab && !['ringkasan', 'cases', 'konseling'].includes(currentSubtab)),
      children: [
        { id: 'pemanggilan', label: 'Panggilan', icon: MailOpen, targetPath: '/dashboard?tab=bpbk&subtab=pemanggilan', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'homevisit', label: 'Visit', icon: Home, targetPath: '/dashboard?tab=bpbk&subtab=homevisit', color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400' },
        { id: 'rujukan', label: 'Rujukan', icon: Share2, targetPath: '/dashboard?tab=bpbk&subtab=rujukan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'asesmen', label: 'Asesmen', icon: ClipboardList, targetPath: '/dashboard?tab=bpbk&subtab=asesmen', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'rekap', label: 'Cetak', icon: Printer, targetPath: '/dashboard?tab=bpbk&subtab=rekap', color: 'bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400' },
        { id: 'tv-page', label: 'TV', icon: Activity, targetPath: '/bpbk/dashboard', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
      ],
    },
    {
      id: 'bk_cases',
      label: 'Kasus Siswa',
      shortLabel: 'Kasus',
      icon: ShieldAlert,
      targetPath: '/dashboard?tab=bpbk&subtab=cases',
      isActive: (p, t) => (t === 'bpbk' && currentSubtab === 'cases') || p.startsWith('/bpbk/cases'),
    },
    {
      id: 'bk_konseling',
      label: 'Layanan Konseling',
      shortLabel: 'Konseling',
      icon: HeartHandshake,
      targetPath: '/dashboard?tab=bpbk&subtab=konseling',
      isActive: (p, t) => (t === 'bpbk' && currentSubtab === 'konseling') || p.startsWith('/bpbk/konseling'),
    },
  ];
}

export function getBkkTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'bkk_ringkasan',
      label: 'Beranda BKK',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=bkk&subtab=ringkasan',
      isActive: (p, t) => t === 'bkk' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'bkk_menu',
      label: 'Menu Bursa Kerja Khusus',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=bkk',
      isActive: (p, t) => t === 'bkk' && Boolean(currentSubtab && !['ringkasan', 'loker', 'pelamar'].includes(currentSubtab)),
      children: [
        { id: 'tracer', label: 'Tracer', icon: GraduationCap, targetPath: '/dashboard?tab=bkk&subtab=tracer', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'mitra', label: 'Mitra', icon: Building2, targetPath: '/dashboard?tab=bkk&subtab=mitra', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'rekap', label: 'Cetak', icon: Printer, targetPath: '/dashboard?tab=bkk&subtab=rekap', color: 'bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400' },
      ],
    },
    {
      id: 'bkk_loker',
      label: 'Lowongan Kerja',
      shortLabel: 'Lowongan',
      icon: Briefcase,
      targetPath: '/dashboard?tab=bkk&subtab=loker',
      isActive: (p, t) => (t === 'bkk' && currentSubtab === 'loker') || (p.startsWith('/hubin/bkk') && !p.includes('pelamar')),
    },
    {
      id: 'bkk_pelamar',
      label: 'Verifikasi Pelamar',
      shortLabel: 'Pelamar',
      icon: Users,
      targetPath: '/dashboard?tab=bkk&subtab=pelamar',
      isActive: (p, t) => t === 'bkk' && currentSubtab === 'pelamar',
    },
  ];
}

export function getSarprasTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'sarpras_ringkasan',
      label: 'Beranda Sarpras',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=sarpras&subtab=ringkasan',
      isActive: (p, t) => t === 'sarpras' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'sarpras_menu',
      label: 'Menu Sarpras',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=sarpras',
      isActive: (p, t) => t === 'sarpras' && Boolean(currentSubtab && !['ringkasan', 'inventaris', 'peminjaman'].includes(currentSubtab)),
      children: [
        { id: 'perbaikan', label: 'Perbaikan', icon: Wrench, targetPath: '/dashboard?tab=sarpras&subtab=perbaikan', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'katalog', label: 'Katalog', icon: Package, targetPath: '/dashboard?tab=sarpras&subtab=katalog', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'rekap', label: 'Cetak', icon: Printer, targetPath: '/dashboard?tab=sarpras&subtab=rekap', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'monitor-tv', label: 'TV', icon: Activity, targetPath: '/sarpras/dashboard', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'inventory-full', label: 'Inventaris', icon: Layers, targetPath: '/sarpras/inventory', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
        { id: 'loans-full', label: 'Peminjaman', icon: ArrowLeftRight, targetPath: '/sarpras/loans', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'maintenance-full', label: 'Servis', icon: Wrench, targetPath: '/sarpras/maintenance', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
      ],
    },
    {
      id: 'sarpras_inv',
      label: 'Inventaris & Aset',
      shortLabel: 'Inventaris',
      icon: Layers,
      targetPath: '/dashboard?tab=sarpras&subtab=inventaris',
      isActive: (p, t) => (t === 'sarpras' && currentSubtab === 'inventaris') || p.startsWith('/sarpras/inventory'),
    },
    {
      id: 'sarpras_loans',
      label: 'Peminjaman Alat',
      shortLabel: 'Peminjaman',
      icon: ArrowLeftRight,
      targetPath: '/dashboard?tab=sarpras&subtab=peminjaman',
      isActive: (p, t) => (t === 'sarpras' && currentSubtab === 'peminjaman') || p.startsWith('/sarpras/loans'),
    },
  ];
}

export function getEkskulTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'ekskul_ringkasan',
      label: 'Beranda Ekskul',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=ekskul&subtab=ringkasan',
      isActive: (p, t) => t === 'ekskul' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'ekskul_menu',
      label: 'Menu Ekstrakurikuler',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=ekskul',
      isActive: (p, t) => t === 'ekskul' && Boolean(currentSubtab && !['ringkasan', 'anggota', 'nilai'].includes(currentSubtab)),
      children: [
        { id: 'jadwal', label: 'Jadwal', icon: Calendar, targetPath: '/dashboard?tab=ekskul&subtab=jadwal', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'rekap', label: 'Cetak', icon: Printer, targetPath: '/dashboard?tab=ekskul&subtab=rekap', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'matrix', label: 'Matriks', icon: Layers, targetPath: '/attendance/anggota-eskul/matrix', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
      ],
    },
    {
      id: 'ekskul_anggota',
      label: 'Anggota Siswa',
      shortLabel: 'Anggota',
      icon: Users,
      targetPath: '/dashboard?tab=ekskul&subtab=anggota',
      isActive: (p, t) => (t === 'ekskul' && currentSubtab === 'anggota') || p.startsWith('/attendance/anggota-eskul'),
    },
    {
      id: 'ekskul_nilai',
      label: 'Nilai Rapor',
      shortLabel: 'Nilai',
      icon: Award,
      targetPath: '/dashboard?tab=ekskul&subtab=nilai',
      isActive: (p, t) => (t === 'ekskul' && currentSubtab === 'nilai') || p.startsWith('/rapor/eskul'),
    },
  ];
}

export function getPklPembimbingTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'pkl_ringkasan',
      label: 'Beranda Bimbingan',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=pembimbing_pkl&subtab=ringkasan',
      isActive: (p, t) => t === 'pembimbing_pkl' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'pkl_menu',
      label: 'Menu Bimbingan',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=pembimbing_pkl',
      isActive: (p, t) => t === 'pembimbing_pkl' && Boolean(currentSubtab && !['ringkasan', 'bimbingan', 'jurnal'].includes(currentSubtab)),
      children: [
        { id: 'monitoring', label: 'Monitoring', icon: Calendar, targetPath: '/dashboard?tab=pembimbing_pkl&subtab=monitoring', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'penilaian', label: 'Penilaian', icon: Award, targetPath: '/dashboard?tab=pembimbing_pkl&subtab=penilaian', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'rekap', label: 'Cetak', icon: Printer, targetPath: '/dashboard?tab=pembimbing_pkl&subtab=rekap', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'mitra-full', label: 'Mitra', icon: Building2, targetPath: '/hubin/mitra', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
      ],
    },
    {
      id: 'pkl_bimbingan',
      label: 'Siswa Bimbingan',
      shortLabel: 'Bimbingan',
      icon: Users,
      targetPath: '/dashboard?tab=pembimbing_pkl&subtab=bimbingan',
      isActive: (p, t) => t === 'pembimbing_pkl' && currentSubtab === 'bimbingan',
    },
    {
      id: 'pkl_jurnal',
      label: 'Verifikasi Jurnal',
      shortLabel: 'Jurnal',
      icon: Clock,
      targetPath: '/dashboard?tab=pembimbing_pkl&subtab=jurnal',
      isActive: (p, t) => t === 'pembimbing_pkl' && currentSubtab === 'jurnal',
    },
  ];
}

export function getSatpamTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'satpam_scan',
      label: 'Terminal Scan Gerbang',
      shortLabel: 'Scan',
      icon: Scan,
      targetPath: '/dashboard?tab=satpam&subtab=scan',
      isActive: (p, t) => (t === 'satpam' || t === 'gerbang') && (!currentSubtab || currentSubtab === 'scan'),
    },
    {
      id: 'satpam_menu',
      label: 'Operasional Pos Keamanan',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=satpam',
      isActive: (p, t) => (t === 'satpam' || t === 'gerbang') && Boolean(currentSubtab && !['scan', 'buku_tamu', 'izin_keluar'].includes(currentSubtab)),
      children: [
        { id: 'pelanggaran', label: 'Pelanggaran Gerbang', icon: AlertTriangle, targetPath: '/dashboard?tab=satpam&subtab=pelanggaran', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'traffic', label: 'Trafik & Monitoring Gerbang', icon: Activity, targetPath: '/dashboard?tab=satpam&subtab=traffic', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
      ],
    },
    {
      id: 'satpam_tamu',
      label: 'Buku Tamu Pos Satpam',
      shortLabel: 'Tamu',
      icon: UserCheck,
      targetPath: '/dashboard?tab=satpam&subtab=buku_tamu',
      isActive: (p, t) => (t === 'satpam' || t === 'gerbang') && currentSubtab === 'buku_tamu',
    },
    {
      id: 'satpam_izin',
      label: 'Verifikasi Izin Siswa Keluar',
      shortLabel: 'Izin',
      icon: LogOut,
      targetPath: '/dashboard?tab=satpam&subtab=izin_keluar',
      isActive: (p, t) => (t === 'satpam' || t === 'gerbang') && currentSubtab === 'izin_keluar',
    },
  ];
}

export function getToolmanTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'toolman_ringkasan',
      label: 'Beranda Bengkel',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=toolman&subtab=ringkasan',
      isActive: (p, t) => t === 'toolman' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'toolman_menu',
      label: 'Menu Teknisi Bengkel',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=toolman',
      isActive: (p, t) => t === 'toolman' && Boolean(currentSubtab && !['ringkasan', 'pinjam', 'servis'].includes(currentSubtab)),
      children: [
        { id: 'alat', label: 'Alat', icon: Layers, targetPath: '/dashboard?tab=toolman&subtab=alat', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
        { id: 'rekap', label: 'Cetak', icon: Printer, targetPath: '/dashboard?tab=toolman&subtab=rekap', color: 'bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400' },
        { id: 'loans-full', label: 'Sirkulasi', icon: ArrowLeftRight, targetPath: '/sarpras/loans', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'maintenance-full', label: 'Servis', icon: Wrench, targetPath: '/sarpras/maintenance', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
      ],
    },
    {
      id: 'toolman_pinjam',
      label: 'Peminjaman Alat',
      shortLabel: 'Pinjam',
      icon: ArrowLeftRight,
      targetPath: '/dashboard?tab=toolman&subtab=pinjam',
      isActive: (p, t) => t === 'toolman' && currentSubtab === 'pinjam',
    },
    {
      id: 'toolman_servis',
      label: 'Perbaikan & Servis',
      shortLabel: 'Servis',
      icon: Wrench,
      targetPath: '/dashboard?tab=toolman&subtab=servis',
      isActive: (p, t) => t === 'toolman' && currentSubtab === 'servis',
    },
  ];
}

export function getKoperasiTabs(currentSubtab?: string): MobileBottomTabItem[] {
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
      id: 'coop_ringkasan',
      label: 'Beranda Koperasi',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=koperasi&subtab=ringkasan',
      isActive: (p, t) => t === 'koperasi' && (!currentSubtab || currentSubtab === 'ringkasan'),
    },
    {
      id: 'coop_menu',
      label: 'Menu Koperasi',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=koperasi',
      isActive: (p, t) => t === 'koperasi' && Boolean(currentSubtab && !['ringkasan', 'pos', 'simpanan'].includes(currentSubtab)),
      children: [
        { id: 'pinjaman', label: 'Pinjaman', icon: HandCoins, targetPath: '/dashboard?tab=koperasi&subtab=pinjaman', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'anggota', label: 'Anggota', icon: Users, targetPath: '/dashboard?tab=koperasi&subtab=anggota', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'produk', label: 'Katalog', icon: Package, targetPath: '/dashboard?tab=koperasi&subtab=produk', color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400' },
        { id: 'shu', label: 'SHU', icon: FileSpreadsheet, targetPath: '/dashboard?tab=koperasi&subtab=shu', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'akuntansi', label: 'Akuntansi', icon: BookOpen, targetPath: '/dashboard?tab=koperasi&subtab=akuntansi', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'tv-page', label: 'TV', icon: Activity, targetPath: '/cooperative/dashboard', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
      ],
    },
    {
      id: 'coop_pos',
      label: 'Kasir POS Toko',
      shortLabel: 'Kasir',
      icon: ShoppingCart,
      targetPath: '/dashboard?tab=koperasi&subtab=pos',
      isActive: (p, t) => (t === 'koperasi' && currentSubtab === 'pos') || p.startsWith('/cooperative/pos'),
    },
    {
      id: 'coop_savings',
      label: 'Simpanan Anggota',
      shortLabel: 'Simpanan',
      icon: PiggyBank,
      targetPath: '/dashboard?tab=koperasi&subtab=simpanan',
      isActive: (p, t) => (t === 'koperasi' && currentSubtab === 'simpanan') || p.startsWith('/cooperative/savings'),
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
      shortLabel: 'Gerbang',
      icon: ScanLine,
      targetPath: '/attendance/gate-scanner',
      isActive: (p) => p.startsWith('/attendance/gate-scanner'),
    },
    {
      id: 'piket_menu',
      label: 'Menu Piket & Keamanan',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/attendance/gate-scanner',
      isActive: (p) => p.startsWith('/attendance') && !['/attendance/gate-scanner', '/attendance/terlambat', '/attendance/dispensasi'].includes(p),
      children: [
        { id: 'gate-scanner', label: 'Gerbang', icon: ScanLine, targetPath: '/attendance/gate-scanner', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'terlambat', label: 'Terlambat', icon: AlertTriangle, targetPath: '/attendance/terlambat', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'dispensasi', label: 'Dispensasi', icon: FileCheck2, targetPath: '/attendance/dispensasi', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        { id: 'jurnal-piket', label: 'Jurnal', icon: BookOpenCheck, targetPath: '/attendance/jurnal-piket', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'buku-tamu', label: 'Tamu', icon: Users, targetPath: '/attendance/buku-tamu', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
      ],
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
      shortLabel: 'Dispensasi',
      icon: FileCheck2,
      targetPath: '/attendance/dispensasi',
      isActive: (p) => p.startsWith('/attendance/dispensasi'),
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
      id: 'admin_menu',
      label: 'Semua Dashboard Divisi',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard',
      isActive: () => false,
      children: teacherDashboards,
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
      id: 'admin_profil',
      label: 'Profil Saya',
      shortLabel: 'Profil',
      icon: User,
      targetPath: '/dashboard?tab=profil',
      isActive: (p, t) => t === 'profil' || p.startsWith('/profile'),
    },
  ];
}

export function getSiswaTabs(
  currentTab: string | null,
  isPetugasKelas: boolean = false,
  pendingBadgeCount: number = 0
): MobileBottomTabItem[] {
  return [
    {
      id: 'siswa_beranda',
      label: 'Beranda Siswa',
      shortLabel: 'Beranda',
      icon: Home,
      targetPath: '/dashboard?tab=ringkasan',
      isActive: (p, t) => (p === '/dashboard' || p === '/dashboard/') && (!t || t === 'ringkasan'),
    },
    {
      id: 'siswa_presensi',
      label: 'Presensi Siswa',
      shortLabel: 'Presensi',
      icon: CheckCircle2,
      targetPath: '/dashboard?tab=kehadiran',
      isActive: (p, t) => (p === '/dashboard' && t === 'kehadiran') || p.startsWith('/attendance/my-attendance') || p.startsWith('/my-attendance'),
    },
    {
      id: 'siswa_menu',
      label: 'Menu Layanan Siswa',
      shortLabel: 'Menu',
      icon: LayoutGrid,
      targetPath: '/dashboard?tab=ringkasan',
      badge: pendingBadgeCount > 0 ? String(pendingBadgeCount) : undefined,
      isActive: (p, t) => Boolean(t && ['cbt', 'pkl', 'catatan', 'berkas', 'portal'].includes(t)),
      children: [
        { id: 'ringkasan', label: 'Ringkasan Beranda', icon: Home, targetPath: '/dashboard?tab=ringkasan', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' },
        { id: 'kehadiran', label: 'Presensi & Kehadiran', icon: CheckCircle2, targetPath: '/dashboard?tab=kehadiran', color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400' },
        { id: 'cbt', label: 'Ujian CBT Online', icon: Laptop, targetPath: '/dashboard?tab=cbt', color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400' },
        { id: 'catatan', label: 'Catatan BK & Disiplin', icon: FileText, targetPath: '/dashboard?tab=catatan', color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400' },
        { id: 'berkas', label: 'Berkas Dokumen & Nilai', icon: BookOpen, targetPath: '/dashboard?tab=berkas', color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' },
        { id: 'portal', label: 'Portal Aplikasi', icon: LayoutGrid, targetPath: '/dashboard?tab=portal', color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400' },
        ...(isPetugasKelas ? [
          { id: 'petugas_ops', label: 'Petugas Presensi', icon: CheckCircle2, targetPath: '/attendance/ops', color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400' }
        ] : []),
      ],
    },
    {
      id: 'siswa_disiplin',
      label: 'Catatan Kedisiplinan',
      shortLabel: 'Disiplin',
      icon: FileText,
      targetPath: '/dashboard?tab=catatan',
      isActive: (p, t) => (p === '/dashboard' && t === 'catatan') || p.startsWith('/bpbk/konseling') || p.startsWith('/kesiswaan/pelanggaran'),
    },
    {
      id: 'saya',
      label: 'Profil Saya',
      shortLabel: 'Saya',
      icon: User,
      targetPath: '/dashboard?tab=profil',
      isActive: (p, t) => (p === '/dashboard' && t === 'profil') || p.startsWith('/profile'),
    },
  ];
}
