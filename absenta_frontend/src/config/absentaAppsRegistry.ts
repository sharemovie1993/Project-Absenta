import { 
  GraduationCap, Clock, BookOpen, Shield, HeartHandshake, 
  Mail, MessageSquare, ShoppingCart, Building2, Globe, Settings,
  LucideIcon
} from 'lucide-react';

export interface AbsentaApp {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconName: string;
  color: {
    bg: string;
    text: string;
    badge: string;
    hover: string;
    gradient: string;
  };
  defaultPath: string;
  pathPrefixes: string[];
  category: string;
}

export const ABSENTA_APPS_REGISTRY: AbsentaApp[] = [
  // 1. Akademik
  {
    id: 'academic',
    name: 'Akademik',
    description: 'Data induk siswa, guru, rombel, dan struktur sekolah',
    icon: GraduationCap,
    iconName: 'GraduationCap',
    color: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
      hover: 'hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
      gradient: 'from-blue-600 to-indigo-600',
    },
    defaultPath: '/academic/siswa',
    pathPrefixes: ['/academic', '/master', '/data-master', '/siswa', '/guru', '/kelas', '/documents', '/tahun-pelajaran', '/semester', '/jurusan', '/mapel'],
    category: 'DATA MASTER',
  },

  // 2. Presensi
  {
    id: 'attendance',
    name: 'Presensi',
    description: 'Pencatatan kehadiran kelas, guru, gerbang, dan rekapitulasi',
    icon: Clock,
    iconName: 'Clock',
    color: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
      hover: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
      gradient: 'from-emerald-600 to-teal-600',
    },
    defaultPath: '/attendance/dashboard',
    pathPrefixes: ['/attendance', '/absensi', '/presensi'],
    category: 'ABSENSI',
  },

  // 3. Kurikulum
  {
    id: 'kurikulum',
    name: 'Kurikulum',
    description: 'Jadwal pelajaran, jam KBM, modul ajar, dan rekap JP',
    icon: BookOpen,
    iconName: 'BookOpen',
    color: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
      hover: 'hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
      gradient: 'from-indigo-600 to-violet-600',
    },
    defaultPath: '/kurikulum/jadwal',
    pathPrefixes: ['/kurikulum', '/cbt', '/rapor', '/jadwal', '/jam-kbm', '/supervisi', '/kosp'],
    category: 'KURIKULUM',
  },

  // 4. Kesiswaan
  {
    id: 'kesiswaan',
    name: 'Kesiswaan',
    description: 'Buku pelanggaran, piket, izin keluar, dan prestasi',
    icon: Shield,
    iconName: 'Shield',
    color: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
      hover: 'hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
      gradient: 'from-amber-500 to-orange-600',
    },
    defaultPath: '/kesiswaan/monitoring',
    pathPrefixes: ['/kesiswaan', '/affairs', '/pelanggaran', '/prestasi', '/piket'],
    category: 'KESISWAAN',
  },

  // 5. Konseling
  {
    id: 'bpbk',
    name: 'Konseling',
    description: 'Layanan BP/BK, rekam kasus siswa, dan pemanggilan orang tua',
    icon: HeartHandshake,
    iconName: 'HeartHandshake',
    color: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
      hover: 'hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
      gradient: 'from-rose-600 to-pink-600',
    },
    defaultPath: '/bpbk/dashboard',
    pathPrefixes: ['/bpbk', '/bk', '/konseling', '/bimbingan'],
    category: 'BP/BK',
  },

  // 6. Persuratan
  {
    id: 'correspondence',
    name: 'Persuratan',
    description: 'Administrasi surat dinas masuk, surat keluar, dan disposisi',
    icon: Mail,
    iconName: 'Mail',
    color: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      text: 'text-cyan-600 dark:text-cyan-400',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
      hover: 'hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20',
      gradient: 'from-cyan-600 to-blue-600',
    },
    defaultPath: '/correspondence/dashboard',
    pathPrefixes: ['/correspondence', '/surat', '/persuratan'],
    category: 'PERSURATAN',
  },

  // 7. WhatsApp
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Gateway notifikasi, chatbot otomatis, dan manajemen grup',
    icon: MessageSquare,
    iconName: 'MessageSquare',
    color: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
      hover: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
      gradient: 'from-emerald-600 to-green-600',
    },
    defaultPath: '/chatlog',
    pathPrefixes: ['/chatlog', '/whatsapp', '/communication', '/notifications'],
    category: 'WHATSAPP',
  },

  // 8. Koperasi
  {
    id: 'cooperative',
    name: 'Koperasi',
    description: 'Kasir POS toko/kantin, simpan pinjam, voucher, dan laporan SHU',
    icon: ShoppingCart,
    iconName: 'ShoppingCart',
    color: {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
      hover: 'hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20',
      gradient: 'from-orange-500 to-amber-600',
    },
    defaultPath: '/cooperative/dashboard',
    pathPrefixes: ['/cooperative', '/koperasi', '/pos', '/savings', '/loans'],
    category: 'KOPERASI',
  },

  // 9. Sarpras
  {
    id: 'sarpras',
    name: 'Sarpras',
    description: 'Inventaris aset, peminjaman ruangan, dan pemeliharaan sarana',
    icon: Building2,
    iconName: 'Building2',
    color: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
      hover: 'hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-950/20',
      gradient: 'from-purple-600 to-indigo-600',
    },
    defaultPath: '/sarpras/dashboard',
    pathPrefixes: ['/sarpras', '/fasilitas', '/inventory', '/ruangan'],
    category: 'SARPRAS',
  },

  // 10. Hubin
  {
    id: 'hubin',
    name: 'Hubin',
    description: 'Kemitraan industri, monitoring PKL, BKK, dan tracer study',
    icon: Globe,
    iconName: 'Globe',
    color: {
      bg: 'bg-teal-500/10 dark:bg-teal-500/20',
      text: 'text-teal-600 dark:text-teal-400',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
      hover: 'hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-950/20',
      gradient: 'from-teal-600 to-emerald-600',
    },
    defaultPath: '/hubin/dashboard',
    pathPrefixes: ['/hubin', '/pkl', '/bkk', '/tracer', '/magang'],
    category: 'HUBIN',
  },

  // 11. Setelan
  {
    id: 'settings',
    name: 'Setelan',
    description: 'Konfigurasi sekolah, manajemen pengguna, role, dan backup',
    icon: Settings,
    iconName: 'Settings',
    color: {
      bg: 'bg-slate-500/10 dark:bg-slate-500/20',
      text: 'text-slate-600 dark:text-slate-400',
      badge: 'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200',
      hover: 'hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-950/20',
      gradient: 'from-slate-600 to-zinc-700',
    },
    defaultPath: '/settings/tenant',
    pathPrefixes: ['/settings', '/pengaturan', '/users', '/user-management', '/role-management', '/management', '/superadmin'],
    category: 'SISTEM',
  },
];

/**
 * Mendapatkan aplikasi yang sedang aktif berdasarkan path URL saat ini
 */
export function getActiveApp(pathname: string): AbsentaApp | null {
  const p = pathname.toLowerCase();
  if (p === '/' || p === '/dashboard' || p === '/apps') {
    return null;
  }
  return ABSENTA_APPS_REGISTRY.find(app => 
    app.pathPrefixes.some(prefix => p.startsWith(prefix.toLowerCase()))
  ) || null;
}

/**
 * Menyaring aplikasi yang boleh diakses pengguna (Semua Unlocked)
 */
export function getVisibleApps(
  _userCapabilities: string[] = [],
  _activeFeatures: string[] = [],
  _roleName?: string
): AbsentaApp[] {
  // Tanpa restriksi RBAC frontend: Seluruh 11 aplikasi kanonikal selalu terbuka & dapat diakses
  return ABSENTA_APPS_REGISTRY;
}
