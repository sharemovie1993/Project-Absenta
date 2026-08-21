import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  Calendar, 
  Users, 
  FileText, 
  ShieldCheck, 
  CalendarDays, 
  Printer, 
  Award, 
  Activity, 
  LayoutGrid, 
  GraduationCap, 
  Briefcase, 
  Archive, 
  ArrowUpCircle, 
  Wrench, 
  Package, 
  BookOpen, 
  Settings, 
  UserCog, 
  ShieldAlert, 
  Zap, 
  HeartHandshake, 
  Wallet, 
  Building2, 
  CheckCircle2,
  Mail,
  Inbox,
  Send,
  Laptop,
  Clock,
  Check
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSmartMenu } from '@/hooks/useSmartMenu';
import { 
  normalizeFlatMenu, 
  filterNavByWorkspace,
  type FlatMenuItem 
} from '@/helpers/workspaceNavFilter';
import { ROLE_WORKSPACES, resolveUserWorkspaces } from '@/config/navigation.config';
import { iconForName } from '@/lib/iconForName';
import { cn } from '@/lib/utils';

export interface WorkspaceAppLauncherCardProps {
  /**
   * ID Workspace Target (e.g. 'KURIKULUM_WORKSPACE', 'KESISWAAN_WORKSPACE', 'PIKET_WORKSPACE', 'WALIKELAS_WORKSPACE')
   */
  workspaceId?: string;
  /**
   * Override judul modul (opsional).
   */
  customTitle?: string;
  /**
   * Override subtitle/deskripsi (opsional).
   */
  customSubtitle?: string;
  /**
   * Jika true, sembunyikan kartu jika kosong.
   */
  hideIfEmpty?: boolean;
  /**
   * ClassName tambahan.
   */
  className?: string;
}

// Gradient palette mewah untuk Squircle App Icons (Apple/Web Portal style)
const TILE_GRADIENTS = [
  { gradient: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white', shadow: 'shadow-indigo-500/30 dark:shadow-indigo-950/50', border: 'border-indigo-400/30' },
  { gradient: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white', shadow: 'shadow-blue-500/30 dark:shadow-blue-950/50', border: 'border-blue-400/30' },
  { gradient: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white', shadow: 'shadow-emerald-500/30 dark:shadow-emerald-950/50', border: 'border-emerald-400/30' },
  { gradient: 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white', shadow: 'shadow-amber-500/30 dark:shadow-amber-950/50', border: 'border-amber-400/30' },
  { gradient: 'bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white', shadow: 'shadow-purple-500/30 dark:shadow-purple-950/50', border: 'border-purple-400/30' },
  { gradient: 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white', shadow: 'shadow-rose-500/30 dark:shadow-rose-950/50', border: 'border-rose-400/30' },
  { gradient: 'bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white', shadow: 'shadow-teal-500/30 dark:shadow-teal-950/50', border: 'border-teal-400/30' },
  { gradient: 'bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 text-white', shadow: 'shadow-cyan-500/30 dark:shadow-cyan-950/50', border: 'border-cyan-400/30' },
  { gradient: 'bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 text-white', shadow: 'shadow-sky-500/30 dark:shadow-sky-950/50', border: 'border-sky-400/30' },
  { gradient: 'bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 text-white', shadow: 'shadow-violet-500/30 dark:shadow-violet-950/50', border: 'border-violet-400/30' },
];

// Fallback items untuk tiap modul spesialisasi (Zero-Broken State saat loading API)
const DEFAULT_KURIKULUM_PRIMARY: FlatMenuItem[] = [
  { id: 'str', title: 'Struktur Kurikulum', path: '/kurikulum/struktur', icon: 'Layers' },
  { id: 'mpl', title: 'Mata Pelajaran', path: '/academic/mapel', icon: 'BookOpen' },
  { id: 'gmp', title: 'Guru Mapel', path: '/kurikulum/guru-mapel', icon: 'Users' },
  { id: 'jdwk', title: 'Jadwal Kontrak', path: '/kurikulum/jadwal-kontrak-kbm', icon: 'Layers' },
  { id: 'wlk', title: 'Wali Kelas', path: '/kurikulum/wali-kelas', icon: 'UserCheck' },
  { id: 'kld', title: 'Kalender Akad.', path: '/kurikulum/kalender', icon: 'CalendarDays' },
  { id: 'jam', title: 'Pengaturan Jam', path: '/kurikulum/jam-kbm', icon: 'Clock' },
  { id: 'jdw', title: 'Jadwal Pelajaran', path: '/kurikulum/jadwal', icon: 'Calendar' },
  { id: 'pkt', title: 'Jadwal Piket', path: '/kurikulum/jadwal-piket', icon: 'ShieldCheck' },
  { id: 'prg', title: 'Perangkat Ajar', path: '/kurikulum/perangkat', icon: 'FileText' },
  { id: 'rkp', title: 'Audit Realisasi', path: '/kurikulum/rekap-kbm', icon: 'BarChart2' },
  { id: 'spv', title: 'Supervisi Guru', path: '/kurikulum/supervisi', icon: 'ShieldCheck' },
  { id: 'evg', title: 'Evaluasi Kinerja', path: '/kurikulum/evaluasi-kinerja', icon: 'Award' },
  { id: 'ksp', title: 'Generator KOSP', path: '/kurikulum/kosp-builder', icon: 'Sparkles' },
  { id: 'ctk', title: 'Cetak Berkas', path: '/kurikulum/cetak-berkas', icon: 'Printer' },
];

const DEFAULT_ADMIN_PRIMARY: FlatMenuItem[] = [
  { id: 'sis', title: 'Data Siswa', path: '/academic/siswa', icon: 'GraduationCap' },
  { id: 'gru', title: 'Data Guru', path: '/academic/guru', icon: 'Users' },
  { id: 'kls', title: 'Rombel Kelas', path: '/academic/kelas', icon: 'LayoutGrid' },
  { id: 'mpl', title: 'Mata Pelajaran', path: '/academic/mapel', icon: 'BookOpen' },
  { id: 'thp', title: 'Tahun Ajaran', path: '/academic/tahun-pelajaran', icon: 'Calendar' },
  { id: 'smt', title: 'Semester', path: '/academic/semester', icon: 'CalendarDays' },
  { id: 'jrs', title: 'Jurusan', path: '/academic/jurusan', icon: 'Briefcase' },
  { id: 'ops', title: 'Operasional Absen', path: '/attendance/ops', icon: 'Activity' },
  { id: 'kpt', title: 'Kepatuhan App', path: '/management/platform-compliance', icon: 'Smartphone' },
  { id: 'usr', title: 'Kelola User', path: '/users', icon: 'UserCog' },
  { id: 'stg', title: 'Pengaturan', path: '/settings', icon: 'Settings' },
];

const DEFAULT_SARPRAS_PRIMARY: FlatMenuItem[] = [
  { id: 'inv', title: 'Inventory Aset', path: '/sarpras/inventory', icon: 'Archive' },
  { id: 'loa', title: 'Peminjaman Aset', path: '/sarpras/loans', icon: 'ArrowUpCircle' },
  { id: 'mnt', title: 'Pemeliharaan', path: '/sarpras/maintenance', icon: 'Tool' },
  { id: 'cat', title: 'Katalog Aset', path: '/sarpras/catalog', icon: 'Package' },
  { id: 'ctk', title: 'Cetak Berkas', path: '/sarpras/cetak-berkas', icon: 'ClipboardList' },
];

const DEFAULT_KESISWAAN_PRIMARY: FlatMenuItem[] = [
  { id: 'plg', title: 'Kasus Pelanggaran', path: '/kesiswaan/pelanggaran', icon: 'ShieldAlert' },
  { id: 'jns', title: 'Jenis Pelanggaran', path: '/kesiswaan/jenis-pelanggaran', icon: 'Layers' },
  { id: 'prs', title: 'Prestasi Siswa', path: '/kesiswaan/prestasi', icon: 'Award' },
  { id: 'pkt', title: 'Piket & Izin Keluar', path: '/kesiswaan/piket', icon: 'ShieldCheck' },
  { id: 'jdw', title: 'Jadwal Kegiatan', path: '/kesiswaan/jadwal-kegiatan', icon: 'Calendar' },
  { id: 'set', title: 'Pengaturan Poin', path: '/kesiswaan/settings', icon: 'Settings' },
  { id: 'ctk', title: 'Cetak Berkas', path: '/kesiswaan/cetak-berkas', icon: 'ClipboardList' },
];

const DEFAULT_HUBIN_PRIMARY: FlatMenuItem[] = [
  { id: 'mtr', title: 'Mitra Industri / MoU', path: '/hubin/mitra', icon: 'Building2' },
  { id: 'pkl', title: 'Penempatan PKL', path: '/hubin/penempatan', icon: 'Briefcase' },
  { id: 'nil', title: 'Nilai & Sertifikat', path: '/hubin/nilai-pkl', icon: 'Award' },
  { id: 'abs', title: 'Presensi Mandiri PKL', path: '/hubin/absensi', icon: 'CalendarDays' },
  { id: 'mon', title: 'Monitoring & Jurnal', path: '/hubin/monitoring', icon: 'Activity' },
  { id: 'bkk', title: 'BKK Lowongan Kerja', path: '/hubin/bkk', icon: 'Briefcase' },
  { id: 'trc', title: 'Tracer Study Alumni', path: '/hubin/tracer', icon: 'GraduationCap' },
  { id: 'tfa', title: 'Teaching Factory', path: '/hubin/tefa', icon: 'Tool' },
  { id: 'ctk', title: 'Cetak Berkas', path: '/hubin/cetak-berkas', icon: 'ClipboardList' },
];

const DEFAULT_BPBK_PRIMARY: FlatMenuItem[] = [
  { id: 'sis', title: 'Data Siswa Kasus', path: '/bpbk/siswa', icon: 'Users' },
  { id: 'kss', title: 'Monitoring Kasus', path: '/bpbk/cases', icon: 'ShieldAlert' },
  { id: 'ksl', title: 'Layanan Konseling', path: '/bpbk/konseling', icon: 'HeartHandshake' },
  { id: 'pmg', title: 'Pemanggilan Ortu', path: '/bpbk/pemanggilan', icon: 'Mail' },
  { id: 'hmv', title: 'Home Visit', path: '/bpbk/homevisit', icon: 'Building2' },
  { id: 'ass', title: 'Asesmen & Minat', path: '/bpbk/asesmen', icon: 'Activity' },
  { id: 'rjk', title: 'Rujukan Kasus', path: '/bpbk/rujukan', icon: 'Send' },
  { id: 'rep', title: 'Laporan & Statistik', path: '/bpbk/reports', icon: 'BarChart2' },
  { id: 'ctk', title: 'Cetak Berkas', path: '/bpbk/cetak-berkas', icon: 'ClipboardList' },
];

const DEFAULT_COOPERATIVE_PRIMARY: FlatMenuItem[] = [
  { id: 'svg', title: 'Tabungan Saya', path: '/cooperative/savings', icon: 'Wallet' },
  { id: 'lon', title: 'Pinjaman Saya', path: '/cooperative/loans', icon: 'ArrowUpCircle' },
  { id: 'pos', title: 'Katalog Belanja', path: '/cooperative/pos?mode=catalog', icon: 'Package' },
  { id: 'shu', title: 'SHU Saya', path: '/cooperative/shu', icon: 'Award' },
  { id: 'vch', title: 'Poin & Benefit', path: '/cooperative/vouchers', icon: 'Sparkles' },
  { id: 'anc', title: 'Pengumuman', path: '/cooperative/announcements', icon: 'Bell' },
  { id: 'tck', title: 'Aduan & Keluhan', path: '/cooperative/tickets', icon: 'MessageSquare' },
];

const DEFAULT_CBT_PRIMARY: FlatMenuItem[] = [
  { id: 'bnk', title: 'Bank Soal', path: '/cbt/bank-soal', icon: 'BookOpen' },
  { id: 'jdw', title: 'Jadwal Ujian', path: '/cbt/jadwal', icon: 'Calendar' },
  { id: 'ses', title: 'Sesi Ujian Aktif', path: '/cbt/sesi', icon: 'Laptop' },
  { id: 'anl', title: 'Analisis Hasil', path: '/cbt/analisis', icon: 'Activity' },
];

const DEFAULT_RAPOR_PRIMARY: FlatMenuItem[] = [
  { id: 'inp', title: 'Input Nilai', path: '/rapor/nilai', icon: 'Award' },
  { id: 'ctk', title: 'Cetak Lembar Rapor', path: '/rapor/cetak', icon: 'Printer' },
  { id: 'p5', title: 'Projek P5', path: '/rapor/p5', icon: 'Layers' },
];

const DEFAULT_CORRESPONDENCE_PRIMARY: FlatMenuItem[] = [
  { id: 'inb', title: 'Surat Masuk', path: '/correspondence/surat-masuk', icon: 'Inbox' },
  { id: 'out', title: 'Surat Keluar', path: '/correspondence/surat-keluar', icon: 'Send' },
];

// Definisi Struktur Klaster Workflow
interface WorkflowCluster {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  icon: string;
  items: FlatMenuItem[];
}

export const WorkspaceAppLauncherCard: React.FC<WorkspaceAppLauncherCardProps> = ({
  workspaceId: targetWorkspaceIdProp,
  hideIfEmpty = false,
  className
}) => {
  const { user } = useAuthStore();
  const { menu: backendGroupedMenu, isLoading: isMenuLoading } = useSmartMenu();

  // 1. Resolve Target Workspace
  const userWorkspaces = useMemo(() => resolveUserWorkspaces(user), [user]);

  const targetWorkspace = useMemo(() => {
    if (targetWorkspaceIdProp) {
      const found = ROLE_WORKSPACES.find(w => w.id === targetWorkspaceIdProp)
        || userWorkspaces.find(w => w.id === targetWorkspaceIdProp);
      if (found) return found;
    }
    return userWorkspaces.find(w => w.id !== 'TEACHER_WORKSPACE' && w.id !== 'STUDENT_WORKSPACE')
      || userWorkspaces[0]
      || ROLE_WORKSPACES.find(w => w.id === 'KURIKULUM_WORKSPACE')
      || ROLE_WORKSPACES[0];
  }, [targetWorkspaceIdProp, userWorkspaces]);

  const activeWsId = targetWorkspace?.id || 'KURIKULUM_WORKSPACE';
  const wsLabel = targetWorkspace?.label || (targetWorkspace as any)?.name || 'Modul';

  // 2. Normalisasi Flat Items Dinamis dari Sidebar
  const flatItems = useMemo(() => normalizeFlatMenu(backendGroupedMenu || []), [backendGroupedMenu]);

  // 3. Filter 100% Focused Primary Workspace Items
  const primaryItems = useMemo<FlatMenuItem[]>(() => {
    if (!flatItems || flatItems.length === 0) {
      if (activeWsId === 'ADMIN_WORKSPACE') return DEFAULT_ADMIN_PRIMARY;
      if (activeWsId === 'SARPRAS_WORKSPACE') return DEFAULT_SARPRAS_PRIMARY;
      if (activeWsId === 'KURIKULUM_WORKSPACE') return DEFAULT_KURIKULUM_PRIMARY;
      if (activeWsId === 'KESISWAAN_WORKSPACE') return DEFAULT_KESISWAAN_PRIMARY;
      if (activeWsId === 'HUBIN_WORKSPACE') return DEFAULT_HUBIN_PRIMARY;
      if (activeWsId === 'BPBK_WORKSPACE') return DEFAULT_BPBK_PRIMARY;
      if (activeWsId === 'COOPERATIVE_WORKSPACE' || activeWsId === 'KOPERASI_WORKSPACE') return DEFAULT_COOPERATIVE_PRIMARY;
      if (activeWsId === 'CBT_WORKSPACE') return DEFAULT_CBT_PRIMARY;
      if (activeWsId === 'RAPOR_WORKSPACE') return DEFAULT_RAPOR_PRIMARY;
      if (activeWsId === 'TU_KOORDINATOR_WORKSPACE' || activeWsId === 'PERSURATAN_WORKSPACE') return DEFAULT_CORRESPONDENCE_PRIMARY;
      return [];
    }

    let matchedItems: FlatMenuItem[] = [];

    // Pengecualian universal halaman dashboard modul itu sendiri
    const isModuleDashboardPath = (path: string, title: string) => {
      const p = path.toLowerCase();
      const t = title.toLowerCase();
      if (p === '/dashboard' || p === '#' || p.startsWith('menu:')) return true;
      if (p.endsWith('/dashboard')) return true;
      if (t === 'dashboard' || t.startsWith('dashboard ')) return true;
      if (activeWsId === 'KESISWAAN_WORKSPACE' && p === '/kesiswaan/monitoring') return true;
      return false;
    };

    if (activeWsId === 'ADMIN_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (
          p.startsWith('/academic') ||
          p.startsWith('/attendance/ops') ||
          p.startsWith('/management') ||
          p.startsWith('/users') ||
          p.startsWith('/settings') ||
          cat.includes('AKADEMIK') ||
          cat.includes('DATA MASTER') ||
          cat.includes('SISTEM')
        ) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_ADMIN_PRIMARY;
    } else if (activeWsId === 'SARPRAS_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/sarpras') || cat.includes('SARPRAS') || cat.includes('ASET')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_SARPRAS_PRIMARY;
    } else if (activeWsId === 'KURIKULUM_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/kurikulum') || cat.includes('KURIKULUM') || p === '/academic/mapel') && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_KURIKULUM_PRIMARY;
    } else if (activeWsId === 'KESISWAAN_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/kesiswaan') || cat.includes('KESISWAAN')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_KESISWAAN_PRIMARY;
    } else if (activeWsId === 'HUBIN_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/hubin') || cat.includes('HUBIN') || cat.includes('INDUSTRI') || cat.includes('PKL')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_HUBIN_PRIMARY;
    } else if (activeWsId === 'BPBK_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/bpbk') || cat.includes('BPBK') || cat.includes('BP/BK') || cat.includes('KONSELING')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_BPBK_PRIMARY;
    } else if (activeWsId === 'COOPERATIVE_WORKSPACE' || activeWsId === 'KOPERASI_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/cooperative') || cat.includes('KOPERASI') || cat.includes('KANTIN')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_COOPERATIVE_PRIMARY;
    } else if (activeWsId === 'CBT_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/cbt') || cat.includes('CBT') || cat.includes('UJIAN')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_CBT_PRIMARY;
    } else if (activeWsId === 'RAPOR_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/rapor') || cat.includes('RAPOR') || cat.includes('NILAI')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_RAPOR_PRIMARY;
    } else if (activeWsId === 'TU_KOORDINATOR_WORKSPACE' || activeWsId === 'PERSURATAN_WORKSPACE') {
      matchedItems = flatItems.filter(item => {
        const p = (item.path || '').toLowerCase();
        const cat = (item.categoryLabel || '').toUpperCase();
        return (p.startsWith('/correspondence') || cat.includes('PERSURATAN') || cat.includes('SURAT')) && !isModuleDashboardPath(p, item.title);
      });
      if (matchedItems.length === 0) matchedItems = DEFAULT_CORRESPONDENCE_PRIMARY;
    } else {
      const { primaryItems: filtered } = filterNavByWorkspace(flatItems, user, activeWsId);
      matchedItems = filtered.filter(item => {
        const p = (item.path || '').toLowerCase();
        return !isModuleDashboardPath(p, item.title);
      });
    }

    return matchedItems;
  }, [flatItems, user, activeWsId]);

  // 4. Pengelompokan Klaster Alur Kerja (Workflow Clusters) untuk Kurikulum
  const clusters = useMemo<WorkflowCluster[]>(() => {
    if (activeWsId !== 'KURIKULUM_WORKSPACE') {
      return [
        {
          id: 'MAIN',
          badge: 'MODUL UTAMA',
          badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          title: `Menu Operasional ${wsLabel}`,
          description: `Daftar seluruh fitur dan sub-halaman ${wsLabel}`,
          icon: '🏛️',
          items: primaryItems
        }
      ];
    }

    const c1: FlatMenuItem[] = []; // 🏗️ Master & Pondasi Struktur
    const c2: FlatMenuItem[] = []; // 📅 Penjadwalan & KBM
    const c3: FlatMenuItem[] = []; // 📚 Perangkat & KOSP
    const c4: FlatMenuItem[] = []; // 🎯 Supervisi & Evaluasi Mutu
    const other: FlatMenuItem[] = [];

    primaryItems.forEach(item => {
      const p = (item.path || '').toLowerCase();
      const t = item.title.toLowerCase();

      if (p.includes('/struktur') || p.includes('/mapel') || p.includes('/guru-mapel') || p.includes('/wali-kelas') || p.includes('/kalender')) {
        c1.push(item);
      } else if (p.includes('/jam-kbm') || (p.includes('/jadwal') && !p.includes('/jadwal-piket') && !p.includes('/jadwal-kontrak')) || p.includes('/jadwal-piket') || p.includes('/jadwal-kontrak')) {
        c2.push(item);
      } else if (p.includes('/perangkat') || p.includes('/kosp') || p.includes('/rekap-kbm') || p.includes('/monitoring')) {
        c3.push(item);
      } else if (p.includes('/supervisi') || p.includes('/evaluasi') || p.includes('/cetak')) {
        c4.push(item);
      } else {
        other.push(item);
      }
    });

    const result: WorkflowCluster[] = [
      {
        id: 'STRUCTURE',
        badge: '1. AWAL TAHUN / SEMESTER',
        badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        title: 'Master & Struktur KBM',
        description: 'Pondasi struktur mata pelajaran, guru pengampu, wali kelas & kalender',
        icon: '🏗️',
        items: c1
      },
      {
        id: 'SCHEDULE',
        badge: '2. FASE PENJADWALAN',
        badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        title: 'Manajemen Jadwal Pelajaran',
        description: 'Penyusunan jam pelajaran, jadwal mingguan, piket guru & kontrak KBM',
        icon: '📅',
        items: c2
      },
      {
        id: 'LEARNING',
        badge: '3. PEMBELAJARAN & PERANGKAT',
        badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        title: 'Perangkat Ajar & KOSP',
        description: 'Modul ajar RPP, penyusunan KOSP, serta audit realisasi JP guru',
        icon: '📚',
        items: c3
      },
      {
        id: 'SUPERVISION',
        badge: '4. SUPERVISI & EVALUASI',
        badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        title: 'Supervisi & Cetak Berkas',
        description: 'Supervisi klinis KBM, evaluasi kinerja guru, dan cetak dokumen resmi',
        icon: '🎯',
        items: c4
      }
    ];

    if (other.length > 0) {
      result[0].items.push(...other);
    }

    return result.filter(c => c.items.length > 0);
  }, [primaryItems, activeWsId, wsLabel]);

  if (hideIfEmpty && primaryItems.length === 0 && !isMenuLoading) {
    return null;
  }

  return (
    <div className={cn("w-full select-none", className)}>
      {/* ── BENTO KLASTER WORKFLOW (GoPay Agen Style: 4-Kolom, Kompak & Rapi) ── */}
      <div className={cn(
        "grid gap-3 sm:gap-4",
        clusters.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        {clusters.map((cluster, clusterIdx) => (
          <div
            key={cluster.id}
            className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            {/* Header Klaster ala GoPay Agen: Bersih, Ringkas, Sejajar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">{cluster.icon}</span>
                <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {cluster.title}
                </h2>
              </div>

              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border shrink-0",
                cluster.badgeColor
              )}>
                {cluster.items.length} Menu
              </span>
            </div>

            {/* Grid 4-Kolom Tetap ala GoPay Agen (Sempurna di Layar HP & Desktop) */}
            <div className="grid grid-cols-4 gap-y-3.5 gap-x-1 sm:gap-x-2 pt-2.5 mt-auto">
              {cluster.items.map((item, idx) => {
                const IconComp = iconForName(item.icon) || Layers;
                const palette = TILE_GRADIENTS[(clusterIdx * 4 + idx) % TILE_GRADIENTS.length];
                const targetPath = item.path || '#';

                return (
                  <Link
                    key={item.id || idx}
                    to={targetPath}
                    title={item.title}
                    className="group flex flex-col items-center justify-start p-1 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer text-center w-full select-none active:scale-95"
                  >
                    {/* Squircle Icon Container ala GoPay */}
                    <div className="relative flex items-center justify-center">
                      <div
                        className={cn(
                          "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-xs transition-all duration-200 group-hover:scale-105 border",
                          palette.gradient,
                          palette.border
                        )}
                      >
                        <IconComp size={20} className="stroke-[2.2]" />

                        {item.isPremium && (
                          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[7.5px] font-black bg-rose-500 text-white shadow-xs leading-none ring-2 ring-white dark:ring-slate-900">
                            PRO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* App Name Under Icon */}
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 leading-tight line-clamp-2 text-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors max-w-[72px] sm:max-w-[80px]">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default WorkspaceAppLauncherCard;
