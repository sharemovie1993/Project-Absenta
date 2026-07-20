import { 
  GraduationCap, 
  Clock, 
  Wallet, 
  Briefcase, 
  Building2, 
  HeartHandshake,
  BookOpen,
  Users,
  FileText,
  Laptop,
  Mail,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import type { HubType } from '../store/navStore';

export interface HubConfig {
  id: HubType;
  label: string;
  icon: any;
  color: string;
  bg: string;
  solidBg: string; // Used for Desktop/Solid active states
  desc: string;
  keywords: string[]; // Keywords to match with API group names
}

export const MASTER_HUBS: HubConfig[] = [
  { 
    id: 'AKADEMIK', 
    label: 'Master', 
    icon: GraduationCap, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50',
    solidBg: 'bg-blue-600',
    desc: 'Data Referensi Sekolah',
    keywords: ['AKADEMIK', 'DATA MASTER', 'MASTER']
  },
  {
    id: 'KURIKULUM',
    label: 'Kurikulum',
    icon: BookOpen,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    solidBg: 'bg-teal-600',
    desc: 'Jadwal & Pembelajaran',
    keywords: ['KURIKULUM', 'JADWAL', 'MAPEL', 'PELAJARAN']
  },
  {
    id: 'KESISWAAN',
    label: 'Kesiswaan',
    icon: Users,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    solidBg: 'bg-amber-600',
    desc: 'Ekskul & Kedisiplinan',
    keywords: ['KESISWAAN', 'EKSKUL', 'OSIS', 'SISWA']
  },
  { 
    id: 'SARPRAS', 
    label: 'Sarpras', 
    icon: Building2, 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-50',
    solidBg: 'bg-indigo-600',
    desc: 'Aset & Inventaris',
    keywords: ['SARPRAS', 'SARANA PRASARANA', 'INVENTORY', 'ASET']
  },
  { 
    id: 'HUBIN', 
    label: 'Hubin', 
    icon: Briefcase, 
    color: 'text-purple-600', 
    bg: 'bg-purple-50',
    solidBg: 'bg-purple-600',
    desc: 'PKL & Industri',
    keywords: ['HUBIN', 'PKL', 'MITRA', 'INDUSTRI']
  },
  {
    id: 'BPBK',
    label: 'BP/BK',
    icon: HeartHandshake,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    solidBg: 'bg-rose-600',
    desc: 'Bimbingan Konseling',
    keywords: ['BP/BK', 'BPBK', 'BK']
  },
  { 
    id: 'KOPERASI', 
    label: 'Koperasi', 
    icon: Wallet, 
    color: 'text-orange-600', 
    bg: 'bg-orange-50',
    solidBg: 'bg-orange-600',
    desc: 'Koperasi & Kantin',
    keywords: ['KOPERASI', 'KANTIN', 'COOPERATIVE']
  },
  { 
    id: 'ABSENSI', 
    label: 'Absensi', 
    icon: Clock, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50',
    solidBg: 'bg-emerald-600',
    desc: 'Kehadiran Realtime',
    keywords: ['ABSENSI', 'ATTENDANCE']
  },
  { 
    id: 'RAPOR', 
    label: 'Rapor', 
    icon: FileText, 
    color: 'text-sky-600', 
    bg: 'bg-sky-50',
    solidBg: 'bg-sky-600',
    desc: 'E-Rapor & Nilai',
    keywords: ['RAPOR', 'RAPORT', 'ERAPOR', 'NILAI']
  },
  { 
    id: 'CBT', 
    label: 'CBT', 
    icon: Laptop, 
    color: 'text-violet-600', 
    bg: 'bg-violet-50',
    solidBg: 'bg-violet-600',
    desc: 'Ujian & Bank Soal',
    keywords: ['CBT', 'UJIAN', 'TEST', 'EXAM']
  },
  {
    id: 'PERSURATAN',
    label: 'Persuratan',
    icon: Mail,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    solidBg: 'bg-amber-600',
    desc: 'Surat Menyurat Sekolah',
    keywords: ['PERSURATAN', 'CORRESPONDENCE', 'SURAT']
  }
];

export const getHubByLabel = (label: string): HubType | undefined => {
  const cleanLabel = label.trim().toUpperCase();
  const hub = MASTER_HUBS.find(h => 
    h.id === cleanLabel || h.keywords.some(k => cleanLabel.includes(k))
  );
  return hub?.id;
};

export interface RoleWorkspaceConfig {
  id: string;
  label: string;
  badge: string;
  icon: any;
  color: string;
  bg: string;
  solidBg: string;
  desc: string;
  requiredCapability?: string;
  requiredPositionCode?: string;
  requiredRoleName?: string;
  defaultPath: string;
  allowedPathPrefixes: string[];
}

export const ROLE_WORKSPACES: RoleWorkspaceConfig[] = [
  {
    id: 'TEACHER_WORKSPACE',
    label: 'Ruang Kerja Guru',
    badge: 'Mengajar',
    icon: BookOpen,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    solidBg: 'bg-teal-600',
    desc: 'Aktivitas Harian & KBM',
    requiredRoleName: 'GURU',
    defaultPath: '/attendance/riwayat-ajar',
    allowedPathPrefixes: [
      '/attendance/riwayat-ajar',
      '/attendance/my-attendance',
      '/kurikulum/jadwal',
      '/kurikulum/perangkat',
      '/kurikulum/kalender',
      '/kesiswaan/pelanggaran',
      '/kesiswaan/prestasi',
      '/cooperative',
      '/bpbk/referrals',
      '/sarpras/loans'
    ]
  },
  {
    id: 'WALIKELAS_WORKSPACE',
    label: 'Ruang Wali Kelas',
    badge: 'Bimbingan',
    icon: GraduationCap,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    solidBg: 'bg-blue-600',
    desc: 'Monitoring & Rekap Kelas',
    requiredCapability: 'dashboard.view.walikelas',
    requiredPositionCode: 'WALIKELAS',
    defaultPath: '/attendance/monitoring',
    allowedPathPrefixes: [
      '/attendance/monitoring',
      '/attendance/ops',
      '/kesiswaan/piket',
      '/rapor',
      '/kesiswaan/pelanggaran',
      '/bpbk'
    ]
  },
  {
    id: 'KURIKULUM_WORKSPACE',
    label: 'Manajemen Kurikulum',
    badge: 'Kurikulum',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    solidBg: 'bg-emerald-600',
    desc: 'Struktur, Jadwal & Supervisi',
    requiredCapability: 'academic.manage.academic',
    requiredPositionCode: 'KURIKULUM',
    defaultPath: '/kurikulum/dashboard',
    allowedPathPrefixes: [
      '/kurikulum'
    ]
  },
  {
    id: 'KESISWAAN_WORKSPACE',
    label: 'Manajemen Kesiswaan',
    badge: 'Kesiswaan',
    icon: Users,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    solidBg: 'bg-amber-600',
    desc: 'Kedisiplinan & Prestasi',
    requiredCapability: 'dashboard.view.kesiswaan',
    requiredPositionCode: 'KESISWAAN',
    defaultPath: '/kesiswaan/monitoring',
    allowedPathPrefixes: [
      '/kesiswaan'
    ]
  },
  {
    id: 'KEPSEK_WORKSPACE',
    label: 'Dashboard Kepsek',
    badge: 'Eksekutif',
    icon: Briefcase,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    solidBg: 'bg-purple-600',
    desc: 'Monitoring & Mutu Sekolah',
    requiredCapability: 'dashboard.view.kepsek',
    requiredPositionCode: 'KEPALA_SEKOLAH',
    defaultPath: '/kurikulum/dashboard',
    allowedPathPrefixes: [
      '/kurikulum/dashboard',
      '/attendance/guru-monitoring',
      '/attendance/dashboard',
      '/sarpras/dashboard',
      '/kesiswaan/monitoring'
    ]
  }
];

export const resolveUserWorkspaces = (user: any, canFunc?: (cap: string) => boolean): RoleWorkspaceConfig[] => {
  if (!user) return [];
  const roleName = String(user?.role?.name || '').toUpperCase();
  if (roleName === 'ADMIN' || roleName === 'SUPERADMIN' || roleName.startsWith('PLATFORM_')) {
    return []; // Admins use full Master Suite
  }

  const available: RoleWorkspaceConfig[] = [];
  if (roleName === 'GURU') {
    const teacherWs = ROLE_WORKSPACES.find(w => w.id === 'TEACHER_WORKSPACE');
    if (teacherWs) available.push(teacherWs);
  }

  const userCaps = Array.isArray(user?.capabilities) ? user.capabilities : [];
  const userPositions: string[] = Array.isArray(user?.position_codes)
    ? user.position_codes.map((p: any) => String(p).toUpperCase())
    : (Array.isArray(user?.positions) ? user.positions.map((p: any) => String(p?.code || p).toUpperCase()) : []);

  ROLE_WORKSPACES.forEach(ws => {
    if (ws.requiredCapability || ws.requiredPositionCode) {
      const hasCap = ws.requiredCapability 
        ? (canFunc ? canFunc(ws.requiredCapability) : userCaps.includes(ws.requiredCapability))
        : false;
      const hasPos = ws.requiredPositionCode
        ? userPositions.includes(ws.requiredPositionCode.toUpperCase())
        : false;

      if ((hasCap || hasPos) && !available.some(a => a.id === ws.id)) {
        available.push(ws);
      }
    }
  });

  return available;
};
