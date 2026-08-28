import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  ArrowLeft,
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
   * Jika true, tetap tampilkan di desktop (default: false, hanya tampil di HP/tablet).
   */
  forceShowOnDesktop?: boolean;
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
  // 🏛️ Master Pokok (9 menu)
  { id: 'sis', title: 'Data Siswa', path: '/academic/siswa', icon: 'GraduationCap' },
  { id: 'gru', title: 'Data Guru', path: '/academic/guru', icon: 'Users' },
  { id: 'kls', title: 'Rombel Kelas', path: '/academic/kelas', icon: 'LayoutGrid' },
  { id: 'mpl', title: 'Mata Pelajaran', path: '/academic/mapel', icon: 'BookOpen' },
  { id: 'thp', title: 'Tahun Ajaran', path: '/academic/tahun-pelajaran', icon: 'Calendar' },
  { id: 'smt', title: 'Semester', path: '/academic/semester', icon: 'Clock' },
  { id: 'jrs', title: 'Jurusan', path: '/academic/jurusan', icon: 'Briefcase' },
  { id: 'doc', title: 'Legalitas Sekolah', path: '/documents', icon: 'FileText' },
  { id: 'ars', title: 'Arsip Pegawai', path: '/documents/member-docs', icon: 'Archive' },
  // 🛠️ Persiapan Akademik (7 menu)
  { id: 'jkg', title: 'Jenis Kegiatan', path: '/academic/jenis-kegiatan', icon: 'Activity' },
  { id: 'krt', title: 'Kartu Siswa', path: '/academic/siswa-cards', icon: 'CheckCircle2' },
  { id: 'trn', title: 'Kenaikan Kelas', path: '/academic/transition', icon: 'Layers' },
  { id: 'sto', title: 'Struktur Organ.', path: '/academic/struktur-organisasi', icon: 'Building2' },
  { id: 'chk', title: 'Cetak Berkas', path: '/academic/prep-checklist', icon: 'Printer' },
  { id: 'bak', title: 'Backup Data', path: '/academic/backup', icon: 'Archive' },
  { id: 'log', title: 'Log Aktivitas', path: '/academic/staff-logs', icon: 'Clock' },
  // ⚙️ Sistem & Operasional (4 menu)
  { id: 'usr', title: 'Kelola User', path: '/users', icon: 'UserCog' },
  { id: 'kpt', title: 'Kepatuhan App', path: '/management/platform-compliance', icon: 'ShieldCheck' },
  { id: 'stg', title: 'Pengaturan', path: '/settings', icon: 'Settings' },
  { id: 'ops', title: 'Operasional Absen', path: '/attendance/ops', icon: 'Activity' },
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
  // 👤 Layanan Anggota (7 menu)
  { id: 'svg', title: 'Tabungan Saya', path: '/cooperative/savings', icon: 'Wallet' },
  { id: 'lon', title: 'Pinjaman Saya', path: '/cooperative/loans', icon: 'ArrowUpCircle' },
  { id: 'pos_cat', title: 'Katalog Belanja', path: '/cooperative/pos?mode=catalog', icon: 'Package' },
  { id: 'shu', title: 'SHU Saya', path: '/cooperative/shu', icon: 'Award' },
  { id: 'vch', title: 'Poin & Benefit', path: '/cooperative/vouchers', icon: 'Sparkles' },
  { id: 'anc', title: 'Pengumuman', path: '/cooperative/announcements', icon: 'Bell' },
  { id: 'tck', title: 'Aduan & Keluhan', path: '/cooperative/tickets', icon: 'MessageSquare' },
  // 🏪 Toko & Kasir (5 menu)
  { id: 'prd', title: 'Katalog Barang', path: '/cooperative/products', icon: 'Package' },
  { id: 'pos', title: 'POS Kasir Toko', path: '/cooperative/pos', icon: 'ShoppingCart' },
  { id: 'vch_mng', title: 'Voucher & Promo', path: '/cooperative/vouchers/manage', icon: 'Sparkles' },
  { id: 'inv_rep', title: 'Laporan Stok', path: '/cooperative/inventory-report', icon: 'Printer' },
  { id: 'sup', title: 'Supplier', path: '/cooperative/suppliers', icon: 'Building2' },
  // 💼 Manajemen Pengurus (7 menu)
  { id: 'mbr', title: 'Kelola Anggota', path: '/cooperative/members', icon: 'Users' },
  { id: 'svg_mng', title: 'Input Simpanan', path: '/cooperative/savings/manage', icon: 'Wallet' },
  { id: 'lon_mng', title: 'Approval Pinjam', path: '/cooperative/loans/manage', icon: 'CheckCircle2' },
  { id: 'ppb', title: 'PPOB Admin', path: '/cooperative/ppob', icon: 'Zap' },
  { id: 'rep', title: 'Laporan Keuangan', path: '/cooperative/reports', icon: 'BarChart2' },
  { id: 'shu_mng', title: 'Bagi Hasil SHU', path: '/cooperative/shu/manage', icon: 'Award' },
  { id: 'stg', title: 'Pengaturan Koperasi', path: '/cooperative/settings', icon: 'Settings' },
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

// Memoized individual Launcher Tile Component for maximum DOM performance
interface LauncherTileProps {
  item: FlatMenuItem;
  palette: typeof TILE_GRADIENTS[0];
}

const LauncherTile = React.memo<LauncherTileProps>(({ item, palette }) => {
  const IconComp = iconForName(item.icon) || Layers;
  const targetPath = item.path || '#';

  return (
    <Link
      to={targetPath}
      title={item.title}
      aria-label={`Buka menu ${item.title}`}
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
});
LauncherTile.displayName = 'LauncherTile';

export const WorkspaceAppLauncherCard: React.FC<WorkspaceAppLauncherCardProps> = React.memo(({
  workspaceId: targetWorkspaceIdProp,
  hideIfEmpty = false,
  forceShowOnDesktop = false,
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

      const isCoop = targetWorkspaceIdProp.includes('COOP') || targetWorkspaceIdProp.includes('KOPERASI');
      return {
        id: targetWorkspaceIdProp,
        label: isCoop ? 'Koperasi' : 'Modul',
        badge: isCoop ? 'Koperasi' : 'Modul',
        icon: Wallet,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        solidBg: 'bg-orange-600',
        desc: 'Ruang Kerja Modul',
        defaultPath: '#'
      };
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
          p.startsWith('/documents') ||
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

  // 4. Pengelompokan Klaster Alur Kerja (Workflow Clusters) untuk Kurikulum & Admin
  const clusters = useMemo<WorkflowCluster[]>(() => {
    // ── ADMIN WORKSPACE: 3 Klaster Alur Kerja ala GoPay Agen ──
    if (activeWsId === 'ADMIN_WORKSPACE') {
      const cMaster: FlatMenuItem[] = [];
      const cPrep: FlatMenuItem[] = [];
      const cSystem: FlatMenuItem[] = [];

      primaryItems.forEach(item => {
        const p = (item.path || '').toLowerCase();
        if (
          p.includes('/academic/siswa') ||
          p.includes('/academic/guru') ||
          p.includes('/academic/kelas') ||
          p.includes('/academic/mapel') ||
          p.includes('/academic/tahun-pelajaran') ||
          p.includes('/academic/semester') ||
          p.includes('/academic/jurusan') ||
          p.includes('/documents')
        ) {
          cMaster.push(item);
        } else if (
          p.includes('/academic/jenis-kegiatan') ||
          p.includes('/academic/siswa-cards') ||
          p.includes('/academic/transition') ||
          p.includes('/academic/struktur-organisasi') ||
          p.includes('/academic/prep-checklist') ||
          p.includes('/academic/backup') ||
          p.includes('/academic/staff-logs')
        ) {
          cPrep.push(item);
        } else {
          cSystem.push(item);
        }
      });

      const adminClusters: WorkflowCluster[] = [
        {
          id: 'ADMIN_MASTER',
          badge: '1. DATA MASTER POKOK',
          badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          title: 'Master Data Pokok',
          description: 'Database siswa, guru, rombel kelas, mapel, tahun ajaran & legalitas',
          icon: '🏛️',
          items: cMaster
        },
        {
          id: 'ADMIN_PREP',
          badge: '2. PERSIAPAN AKADEMIK',
          badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          title: 'Persiapan & Tata Kelola',
          description: 'Kartu siswa, kenaikan kelas, jenis kegiatan, checklist, backup & log',
          icon: '🛠️',
          items: cPrep
        },
        {
          id: 'ADMIN_SYSTEM',
          badge: '3. SISTEM & KONTROL IT',
          badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          title: 'Sistem, User & Operasional',
          description: 'Kelola akun user, audit kepatuhan platform, setelan sekolah & absensi',
          icon: '⚙️',
          items: cSystem
        }
      ];

      return adminClusters.filter(c => c.items.length > 0);
    }

    // ── KOPERASI WORKSPACE: 3 Klaster Alur Kerja ala GoPay Agen ──
    if (activeWsId === 'COOPERATIVE_WORKSPACE' || activeWsId === 'KOPERASI_WORKSPACE') {
      const cMember: FlatMenuItem[] = [];
      const cStore: FlatMenuItem[] = [];
      const cManage: FlatMenuItem[] = [];

      primaryItems.forEach(item => {
        const p = (item.path || '').toLowerCase();
        const t = (item.title || '').toLowerCase();

        // 1. Toko, Kantin & Kasir (POS)
        if (
          p.includes('/products') ||
          p.includes('/inventory-report') ||
          p.includes('/vouchers/manage') ||
          p.includes('/suppliers') ||
          (p.includes('/cooperative/pos') && !p.includes('catalog')) ||
          t.includes('barang') || t.includes('kasir') || t.includes('stok') || t.includes('supplier')
        ) {
          cStore.push(item);
        }
        // 2. Layanan Anggota Pribadi
        else if (
          (p.includes('/cooperative/savings') && !p.includes('/manage')) ||
          (p.includes('/cooperative/loans') && !p.includes('/manage')) ||
          (p.includes('/cooperative/pos') && p.includes('catalog')) ||
          (p.includes('/cooperative/shu') && !p.includes('/manage')) ||
          (p.includes('/cooperative/vouchers') && !p.includes('/manage')) ||
          (p.includes('/cooperative/announcements') && !p.includes('/manage')) ||
          (p.includes('/cooperative/tickets') && !p.includes('/manage')) ||
          t.includes('saya') || t.includes('katalog')
        ) {
          cMember.push(item);
        }
        // 3. Manajemen Pengurus & Keuangan
        else {
          cManage.push(item);
        }
      });

      const coopClusters: WorkflowCluster[] = [
        {
          id: 'COOP_MEMBER',
          badge: '1. LAYANAN ANGGOTA',
          badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          title: 'Layanan Anggota Pribadi',
          description: 'Tabungan saya, pinjaman, katalog belanja, SHU & voucher diskon',
          icon: '👤',
          items: cMember
        },
        {
          id: 'COOP_STORE',
          badge: '2. TOKO, KANTIN & KASIR',
          badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          title: 'Toko, Kantin & Kasir POS',
          description: 'Kasir POS, inventori katalog barang, voucher promo & laporan stok',
          icon: '🏪',
          items: cStore
        },
        {
          id: 'COOP_MANAGE',
          badge: '3. MANAJEMEN PENGURUS',
          badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
          title: 'Pengurus & Simpan Pinjam',
          description: 'Kelola anggota, input simpanan, persetujuan pinjaman, pembukuan & SHU',
          icon: '💼',
          items: cManage
        }
      ];

      return coopClusters.filter(c => c.items.length > 0);
    }

    // ── HUBIN WORKSPACE: 2 Klaster Alur Kerja ala GoPay Agen ──
    if (activeWsId === 'HUBIN_WORKSPACE') {
      const cPkl: FlatMenuItem[] = [];
      const cCareer: FlatMenuItem[] = [];

      primaryItems.forEach(item => {
        const p = (item.path || '').toLowerCase();
        if (
          p.includes('/bkk') ||
          p.includes('/tracer') ||
          p.includes('/tefa')
        ) {
          cCareer.push(item);
        } else {
          cPkl.push(item);
        }
      });

      const hubinClusters: WorkflowCluster[] = [
        {
          id: 'HUBIN_PKL',
          badge: '1. MAGANG & PKL DU/DI',
          badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          title: 'Program Magang & PKL DU/DI',
          description: 'Mitra industri, penempatan siswa, presensi, jurnal & sertifikat PKL',
          icon: '🤝',
          items: cPkl
        },
        {
          id: 'HUBIN_CAREER',
          badge: '2. KARIR, BKK & ALUMNI',
          badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          title: 'Karir, BKK, Alumni & TEFA',
          description: 'Bursa lowongan kerja BKK, tracer study alumni & unit produksi TEFA',
          icon: '💼',
          items: cCareer
        }
      ];

      return hubinClusters.filter(c => c.items.length > 0);
    }

    // ── BPBK WORKSPACE: 3 Klaster Alur Kerja Bimbingan Konseling ──
    if (activeWsId === 'BPBK_WORKSPACE') {
      const cCounseling: FlatMenuItem[] = [];
      const cIntervention: FlatMenuItem[] = [];
      const cReports: FlatMenuItem[] = [];

      primaryItems.forEach(item => {
        const p = (item.path || '').toLowerCase();
        const t = (item.title || '').toLowerCase();

        // 1. Konseling & Kasus Siswa
        if (
          p.includes('/bpbk/cases') ||
          p.includes('/bpbk/konseling') ||
          p.includes('/bpbk/siswa') ||
          p.includes('/bpbk/rujukan') ||
          t.includes('kasus') || t.includes('konseling') || t.includes('rujukan')
        ) {
          cCounseling.push(item);
        }
        // 2. Intervensi, Pemanggilan & Home Visit
        else if (
          p.includes('/bpbk/pemanggilan') ||
          p.includes('/bpbk/homevisit') ||
          p.includes('/bpbk/asesmen') ||
          t.includes('panggilan') || t.includes('home') || t.includes('asesmen') || t.includes('minat')
        ) {
          cIntervention.push(item);
        }
        // 3. Laporan, Statistik & Cetak Berkas
        else {
          cReports.push(item);
        }
      });

      const bpbkClusters: WorkflowCluster[] = [
        {
          id: 'BPBK_COUNSELING',
          badge: '1. LAYANAN KONSELING & KASUS',
          badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          title: 'Konseling & Penanganan Kasus',
          description: 'Catatan bimbingan individual/kelompok, data siswa kasus & rujukan ahli',
          icon: '💬',
          items: cCounseling
        },
        {
          id: 'BPBK_INTERVENTION',
          badge: '2. INTERVENSI & HOME VISIT',
          badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          title: 'Pemanggilan Ortu & Kunjungan Rumah',
          description: 'Surat panggilan dinas orang tua, berita acara home visit & asesmen diagnostik',
          icon: '🏠',
          items: cIntervention
        },
        {
          id: 'BPBK_REPORTS',
          badge: '3. LAPORAN & DOKUMENTASI',
          badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          title: 'Statistik & Cetak Berkas BK',
          description: 'Rekapitulasi tren kasus siswa, statistik bimbingan & cetak laporan evaluasi BK',
          icon: '📊',
          items: cReports
        }
      ];

      return bpbkClusters.filter(c => c.items.length > 0);
    }

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
    <div className={cn("w-full select-none", !forceShowOnDesktop && "block lg:hidden", className)}>
      {/* ── BENTO KLASTER WORKFLOW (GoPay Agen Style: 4-Kolom, Kompak & Rapi) ── */}
      <div className={cn(
        "grid gap-3 sm:gap-4",
        clusters.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        {clusters.map((cluster, clusterIdx) => (
          <div
            key={cluster.id}
            className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-start"
          >
            {/* Header Klaster ala GoPay Agen: Bersih, Ringkas, Sejajar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">{cluster.icon}</span>
                <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {cluster.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border shrink-0",
                  cluster.badgeColor
                )}>
                  {cluster.items.length} Menu
                </span>
              </div>
            </div>

            {/* Grid 4-Kolom Tetap ala GoPay Agen (Selalu Rata Atas / Top-Aligned) */}
            <div className="grid grid-cols-4 gap-y-3.5 gap-x-1 sm:gap-x-2 pt-2.5">
              {cluster.items.map((item, idx) => {
                const palette = TILE_GRADIENTS[(clusterIdx * 4 + idx) % TILE_GRADIENTS.length];
                return (
                  <LauncherTile 
                    key={item.id || idx} 
                    item={item} 
                    palette={palette} 
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

WorkspaceAppLauncherCard.displayName = 'WorkspaceAppLauncherCard';
export default WorkspaceAppLauncherCard;
