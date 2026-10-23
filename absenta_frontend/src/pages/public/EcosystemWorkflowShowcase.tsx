import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  HeartHandshake,
  FileText,
  Briefcase,
  Building2,
  ShoppingCart,
  ChevronLeft,
  Maximize2,
  Minimize2,
  ExternalLink,
  Compass,
  CheckCircle2,
  Calendar,
  Clock,
  Layout,
  Award,
  Layers,
  Sparkles,
  ShieldCheck,
  BarChart2,
  AlertTriangle,
  Trophy,
  Moon,
  List,
  Scan,
  Activity,
  UserCheck,
  Camera,
  Mail,
  Inbox,
  Send,
  Home,
  BarChart3,
  Hammer,
  GraduationCap,
  Package,
  Wrench,
  Printer,
  Laptop,
  Wallet,
  Zap,
  FolderTree,
  Vote
} from 'lucide-react';

export type DivisionId = 'kurikulum' | 'kesiswaan' | 'konseling' | 'tu' | 'hubin' | 'sarpras' | 'koperasi';
export type StageId = 'ppdb' | 'kelas-10' | 'kelas-11' | 'kelas-12' | 'alumni';
export type RolePOV = 'all' | 'kepsek' | 'kaprog' | 'walas' | 'tu' | 'hubin' | 'siswa';

// Canonical Menu Node from seed.ts
export interface CanonicalMenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  roles: RolePOV[];
}

interface DivisionDefinition {
  id: DivisionId;
  name: string;
  short: string;
  icon: any;
  theme: {
    accent: string;
    border: string;
    bg: string;
    glow: string;
    badge: string;
    nodeBg: string;
  };
  menusPerStage: Record<StageId, CanonicalMenuItem[]>;
}

interface StagePoint {
  id: StageId;
  label: string;
  sub: string;
  avatarIcon: string;
  studentStatus: string;
}

const STAGES: StagePoint[] = [
  { id: 'ppdb', label: 'PPDB', sub: 'Calon Siswa', avatarIcon: '🎒', studentStatus: 'Calon Siswa' },
  { id: 'kelas-10', label: 'KELAS X', sub: 'Fase Pondasi', avatarIcon: '👦', studentStatus: 'Siswa Tingkat X' },
  { id: 'kelas-11', label: 'KELAS XI', sub: 'Kejuruan & PKL', avatarIcon: '🛠️', studentStatus: 'Siswa PKL / DUDI' },
  { id: 'kelas-12', label: 'KELAS XII', sub: 'Ujian & UKK', avatarIcon: '🎓', studentStatus: 'Calon Lulusan' },
  { id: 'alumni', label: 'LULUS', sub: 'Karir & Alumni', avatarIcon: '💼', studentStatus: 'Alumni / BKK' },
];

// Master Division Data mapping real menus from seed.ts
const DIVISIONS: Record<DivisionId, DivisionDefinition> = {
  kurikulum: {
    id: 'kurikulum',
    name: 'Bidang Kurikulum',
    short: 'KURIKULUM',
    icon: BookOpen,
    theme: {
      accent: 'text-sky-400',
      border: 'border-sky-500/40',
      bg: 'bg-sky-500/10',
      glow: 'shadow-sky-500/20',
      badge: 'bg-sky-950/90 text-sky-300 border-sky-800',
      nodeBg: 'bg-slate-900/90 border-sky-500/40 hover:border-sky-400',
    },
    menusPerStage: {
      ppdb: [
        { id: 'm-kosp', label: 'Dokumen KOSP', icon: Sparkles, path: '/kurikulum/kosp-builder', roles: ['kaprog', 'kepsek'] },
        { id: 'm-struktur', label: 'Struktur Kurikulum', icon: Layout, path: '/kurikulum/struktur', roles: ['kaprog', 'kepsek'] },
        { id: 'm-kalender', label: 'Kalender Akademik', icon: Calendar, path: '/kurikulum/kalender', roles: ['kaprog', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'm-jam', label: 'Jam Pelajaran', icon: Clock, path: '/kurikulum/jam-kbm', roles: ['walas', 'kaprog', 'kepsek'] },
        { id: 'm-jadwal', label: 'Jadwal KBM', icon: Calendar, path: '/kurikulum/jadwal', roles: ['walas', 'kaprog', 'kepsek'] },
        { id: 'm-ploting', label: 'Ploting Guru', icon: Users, path: '/kurikulum/guru-mapel', roles: ['kaprog', 'kepsek'] },
        { id: 'm-walas', label: 'Wali Kelas', icon: UserCheck, path: '/kurikulum/wali-kelas', roles: ['walas', 'kepsek'] }
      ],
      'kelas-11': [
        { id: 'm-beban', label: 'Beban Mengajar', icon: Layers, path: '/kurikulum/jadwal-kontrak-kbm', roles: ['kaprog', 'kepsek'] },
        { id: 'm-perangkat', label: 'Perangkat Ajar', icon: FileText, path: '/kurikulum/perangkat', roles: ['kaprog', 'walas'] },
        { id: 'm-rekap', label: 'Rekap KBM', icon: BarChart2, path: '/kurikulum/rekap-kbm', roles: ['kaprog', 'kepsek'] },
        { id: 'm-supervisi', label: 'Supervisi Guru', icon: ShieldCheck, path: '/kurikulum/supervisi', roles: ['kepsek', 'kaprog'] }
      ],
      'kelas-12': [
        { id: 'm-cbt', label: 'Ujian CBT', icon: Laptop, path: '/cbt/dashboard', roles: ['kaprog', 'kepsek'] },
        { id: 'm-nilai', label: 'Input Nilai', icon: Award, path: '/rapor/nilai', roles: ['walas', 'kaprog'] },
        { id: 'm-rapor', label: 'Cetak Rapor', icon: Printer, path: '/rapor/cetak', roles: ['walas', 'siswa'] },
        { id: 'm-p5', label: 'Projek P5', icon: Layers, path: '/rapor/p5', roles: ['walas', 'kaprog'] }
      ],
      alumni: [
        { id: 'm-evaluasi', label: 'Evaluasi Kinerja', icon: Award, path: '/kurikulum/evaluasi-kinerja', roles: ['kepsek'] },
        { id: 'm-cetak-kuri', label: 'Cetak Berkas', icon: Printer, path: '/kurikulum/cetak-berkas', roles: ['tu', 'kepsek'] }
      ]
    }
  },
  kesiswaan: {
    id: 'kesiswaan',
    name: 'Bidang Kesiswaan',
    short: 'KESISWAAN',
    icon: Users,
    theme: {
      accent: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      glow: 'shadow-amber-500/20',
      badge: 'bg-amber-950/90 text-amber-300 border-amber-800',
      nodeBg: 'bg-slate-900/90 border-amber-500/40 hover:border-amber-400',
    },
    menusPerStage: {
      ppdb: [
        { id: 'm-taruna', label: 'Program Ketarunaan', icon: ShieldCheck, path: '/kesiswaan/program-ketarunaan', roles: ['walas', 'kepsek'] },
        { id: 'm-poin-master', label: 'Master Poin', icon: List, path: '/kesiswaan/jenis-pelanggaran', roles: ['walas', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'm-piket', label: 'Meja Piket', icon: ShieldCheck, path: '/kesiswaan/piket', roles: ['walas', 'kepsek'] },
        { id: 'm-pelanggaran', label: 'Pelanggaran Siswa', icon: AlertTriangle, path: '/kesiswaan/pelanggaran', roles: ['walas', 'kepsek'] },
        { id: 'm-dhuha', label: 'Pembiasaan Dhuha', icon: Moon, path: '/kesiswaan/program-dhuha', roles: ['walas'] },
        { id: 'm-scanner', label: 'Ruang Operasional', icon: Scan, path: '/attendance/ops', roles: ['tu', 'walas'] }
      ],
      'kelas-11': [
        { id: 'm-pantau', label: 'Pantau Kelas', icon: Activity, path: '/attendance/monitoring', roles: ['walas', 'kepsek'] },
        { id: 'm-prestasi', label: 'Prestasi Siswa', icon: Trophy, path: '/kesiswaan/prestasi', roles: ['walas', 'siswa'] },
        { id: 'm-agenda', label: 'Agenda Kesiswaan', icon: Calendar, path: '/kesiswaan/jadwal-kegiatan', roles: ['walas'] },
        { id: 'm-pelanggaran-11', label: 'Pelanggaran Siswa', icon: AlertTriangle, path: '/kesiswaan/pelanggaran', roles: ['walas', 'kepsek'] }
      ],
      'kelas-12': [
        { id: 'm-upacara', label: 'Pembina Upacara', icon: Award, path: '/kesiswaan/pembina-upacara', roles: ['walas', 'kepsek'] },
        { id: 'm-pelanggaran-12', label: 'Pelanggaran Siswa', icon: AlertTriangle, path: '/kesiswaan/pelanggaran', roles: ['walas', 'kepsek'] },
        { id: 'm-berkas-ks', label: 'Cetak Berkas', icon: FileText, path: '/kesiswaan/cetak-berkas', roles: ['walas', 'kepsek'] }
      ],
      alumni: [
        { id: 'm-prestasi-alumni', label: 'Prestasi Siswa', icon: Trophy, path: '/kesiswaan/prestasi', roles: ['walas', 'siswa'] },
        { id: 'm-rekap-pres', label: 'Rekap Presensi', icon: Calendar, path: '/attendance/rekap', roles: ['tu', 'kepsek'] }
      ]
    }
  },
  konseling: {
    id: 'konseling',
    name: 'Bimbingan Konseling (BK)',
    short: 'KONSELING',
    icon: HeartHandshake,
    theme: {
      accent: 'text-rose-400',
      border: 'border-rose-500/40',
      bg: 'bg-rose-500/10',
      glow: 'shadow-rose-500/20',
      badge: 'bg-rose-950/90 text-rose-300 border-rose-800',
      nodeBg: 'bg-slate-900/90 border-rose-500/40 hover:border-rose-400',
    },
    menusPerStage: {
      ppdb: [
        { id: 'm-minat', label: 'Minat & Bakat', icon: FileText, path: '/bpbk/asesmen', roles: ['walas', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'm-konseling', label: 'Konseling Siswa', icon: HeartHandshake, path: '/bpbk/konseling', roles: ['walas'] },
        { id: 'm-deteksi', label: 'Deteksi Dini', icon: AlertTriangle, path: '/bpbk/cases', roles: ['walas', 'kepsek'] }
      ],
      'kelas-11': [
        { id: 'm-kasus', label: 'Buku Kasus', icon: FileText, path: '/bpbk/siswa', roles: ['walas', 'kepsek'] },
        { id: 'm-homevisit', label: 'Home Visit', icon: Home, path: '/bpbk/homevisit', roles: ['walas'] },
        { id: 'm-panggilan', label: 'Panggilan Ortu', icon: Mail, path: '/bpbk/pemanggilan', roles: ['walas'] }
      ],
      'kelas-12': [
        { id: 'm-konseling-12', label: 'Konseling Siswa', icon: HeartHandshake, path: '/bpbk/konseling', roles: ['walas', 'kepsek'] },
        { id: 'm-rujukan', label: 'Rujukan Kasus', icon: Send, path: '/bpbk/rujukan', roles: ['walas', 'kepsek'] }
      ],
      alumni: [
        { id: 'm-laporan-bk', label: 'Laporan BK', icon: BarChart3, path: '/bpbk/reports', roles: ['kepsek'] },
        { id: 'm-berkas-bk', label: 'Cetak Berkas', icon: FileText, path: '/bpbk/cetak-berkas', roles: ['tu'] }
      ]
    }
  },
  tu: {
    id: 'tu',
    name: 'Tata Usaha & Keuangan',
    short: 'TATA USAHA',
    icon: FileText,
    theme: {
      accent: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      glow: 'shadow-emerald-500/20',
      badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
      nodeBg: 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400',
    },
    menusPerStage: {
      ppdb: [
        { id: 'm-siswa', label: 'Data Siswa', icon: GraduationCap, path: '/academic/siswa', roles: ['tu', 'kepsek'] },
        { id: 'm-kelas', label: 'Daftar Kelas', icon: Users, path: '/academic/kelas', roles: ['tu', 'kepsek'] },
        { id: 'm-tagihan', label: 'Tagihan Siswa', icon: FileText, path: '/billing/invoices', roles: ['tu', 'siswa', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'm-guru', label: 'Guru & Staf', icon: UserCheck, path: '/academic/guru', roles: ['tu', 'kepsek'] },
        { id: 'm-surat-masuk', label: 'Surat Masuk', icon: Inbox, path: '/correspondence/surat-masuk', roles: ['tu', 'kepsek'] },
        { id: 'm-suket', label: 'Surat Keterangan', icon: FileText, path: '/correspondence/surat-keterangan', roles: ['tu', 'siswa'] },
        { id: 'm-wajah', label: 'Perekaman Wajah', icon: Camera, path: '/attendance/rekam-wajah', roles: ['tu'] }
      ],
      'kelas-11': [
        { id: 'm-surat-keluar', label: 'Surat Keluar', icon: Send, path: '/correspondence/surat-keluar', roles: ['tu', 'hubin'] },
        { id: 'm-agenda-tu', label: 'Buku Agenda', icon: FileText, path: '/correspondence/templates', roles: ['tu'] },
        { id: 'm-kas-masuk', label: 'Riwayat Kas Masuk', icon: Wallet, path: '/billing/payments', roles: ['tu', 'kepsek'] }
      ],
      'kelas-12': [
        { id: 'm-bebas-tu', label: 'Bebas Tanggungan', icon: ShieldCheck, path: '/billing', roles: ['tu', 'kepsek'] },
        { id: 'm-transisi', label: 'Kenaikan Kelas', icon: GraduationCap, path: '/academic/transition', roles: ['tu', 'kepsek'] }
      ],
      alumni: [
        { id: 'm-cetak-tu', label: 'Cetak Berkas', icon: Printer, path: '/academic/prep-checklist', roles: ['tu', 'kepsek'] },
        { id: 'm-dokumen', label: 'Dokumen', icon: FileText, path: '/documents', roles: ['tu', 'kepsek'] },
        { id: 'm-log-staf', label: 'Log Aktivitas', icon: Clock, path: '/academic/staff-logs', roles: ['kepsek'] }
      ]
    }
  },
  hubin: {
    id: 'hubin',
    name: 'Hubungan Industri (DUDI)',
    short: 'HUBIN',
    icon: Briefcase,
    theme: {
      accent: 'text-indigo-400',
      border: 'border-indigo-500/40',
      bg: 'bg-indigo-500/10',
      glow: 'shadow-indigo-500/20',
      badge: 'bg-indigo-950/90 text-indigo-300 border-indigo-800',
      nodeBg: 'bg-slate-900/90 border-indigo-500/40 hover:border-indigo-400',
    },
    menusPerStage: {
      ppdb: [
        { id: 'm-mitra-ppdb', label: 'Mitra Industri', icon: Building2, path: '/hubin/mitra', roles: ['hubin', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'm-mitra-10', label: 'Mitra Industri', icon: Building2, path: '/hubin/mitra', roles: ['hubin', 'kaprog', 'kepsek'] },
        { id: 'm-pengaturan-hb', label: 'Pengaturan Hubin', icon: Compass, path: '/hubin/settings', roles: ['hubin'] }
      ],
      'kelas-11': [
        { id: 'm-plot-pkl', label: 'Plot & Pantau PKL', icon: Users, path: '/hubin/penempatan', roles: ['hubin', 'kaprog', 'tu'] },
        { id: 'm-absen-pkl', label: 'Presensi PKL', icon: Clock, path: '/hubin/absensi', roles: ['hubin', 'kaprog', 'siswa'] },
        { id: 'm-nilai-pkl', label: 'Nilai PKL', icon: Award, path: '/hubin/nilai-pkl', roles: ['hubin', 'kaprog'] }
      ],
      'kelas-12': [
        { id: 'm-tefa', label: 'Teaching Factory', icon: Hammer, path: '/hubin/tefa', roles: ['hubin', 'kaprog'] },
        { id: 'm-berkas-pkl', label: 'Cetak Berkas', icon: FileText, path: '/hubin/cetak-berkas', roles: ['hubin'] }
      ],
      alumni: [
        { id: 'm-bkk', label: 'Bursa Kerja (BKK)', icon: Briefcase, path: '/hubin/bkk', roles: ['hubin', 'kepsek', 'siswa'] },
        { id: 'm-tracer', label: 'Tracer Study', icon: GraduationCap, path: '/hubin/tracer', roles: ['hubin', 'kepsek'] }
      ]
    }
  },
  sarpras: {
    id: 'sarpras',
    name: 'Sarana & Prasarana',
    short: 'SARPRAS',
    icon: Building2,
    theme: {
      accent: 'text-orange-400',
      border: 'border-orange-500/40',
      bg: 'bg-orange-500/10',
      glow: 'shadow-orange-500/20',
      badge: 'bg-orange-950/90 text-orange-300 border-orange-800',
      nodeBg: 'bg-slate-900/90 border-orange-500/40 hover:border-orange-400',
    },
    menusPerStage: {
      ppdb: [
        { id: 'm-inv-ppdb', label: 'Inventaris Barang', icon: Package, path: '/sarpras/inventory', roles: ['kepsek'] }
      ],
      'kelas-10': [
        { id: 'm-inv-10', label: 'Inventaris Barang', icon: Package, path: '/sarpras/inventory', roles: ['walas'] },
        { id: 'm-pinjam-10', label: 'Peminjaman Alat', icon: Package, path: '/sarpras/loans', roles: ['walas'] }
      ],
      'kelas-11': [
        { id: 'm-pinjam-11', label: 'Peminjaman Alat', icon: Package, path: '/sarpras/loans', roles: ['kaprog'] },
        { id: 'm-perbaikan', label: 'Perbaikan Alat', icon: Wrench, path: '/sarpras/maintenance', roles: ['kaprog', 'kepsek'] }
      ],
      'kelas-12': [
        { id: 'm-perbaikan-cbt', label: 'Perbaikan Alat', icon: Wrench, path: '/sarpras/maintenance', roles: ['kaprog', 'kepsek'] },
        { id: 'm-pinjam-bebas', label: 'Peminjaman Alat', icon: Package, path: '/sarpras/loans', roles: ['tu'] }
      ],
      alumni: [
        { id: 'm-berkas-sarpras', label: 'Cetak Berkas', icon: FileText, path: '/sarpras/cetak-berkas', roles: ['tu'] }
      ]
    }
  },
  koperasi: {
    id: 'koperasi',
    name: 'Koperasi & Finansial',
    short: 'KOPERASI',
    icon: ShoppingCart,
    theme: {
      accent: 'text-teal-400',
      border: 'border-teal-500/40',
      bg: 'bg-teal-500/10',
      glow: 'shadow-teal-500/20',
      badge: 'bg-teal-950/90 text-teal-300 border-teal-800',
      nodeBg: 'bg-slate-900/90 border-teal-500/40 hover:border-teal-400',
    },
    menusPerStage: {
      ppdb: [
        { id: 'm-barang', label: 'Data Barang', icon: Package, path: '/cooperative/products', roles: ['tu', 'siswa'] },
        { id: 'm-pos-ppdb', label: 'Kasir Toko', icon: ShoppingCart, path: '/cooperative/pos', roles: ['tu', 'siswa'] }
      ],
      'kelas-10': [
        { id: 'm-anggota', label: 'Data Anggota', icon: Users, path: '/cooperative/members', roles: ['walas', 'siswa'] },
        { id: 'm-pos-10', label: 'Kasir Toko', icon: ShoppingCart, path: '/cooperative/pos', roles: ['siswa'] }
      ],
      'kelas-11': [
        { id: 'm-simpanan', label: 'Simpanan', icon: Wallet, path: '/cooperative/savings', roles: ['walas', 'siswa'] },
        { id: 'm-pos-11', label: 'Kasir Toko', icon: ShoppingCart, path: '/cooperative/pos', roles: ['siswa'] }
      ],
      'kelas-12': [
        { id: 'm-simpanan-12', label: 'Simpanan', icon: Wallet, path: '/cooperative/savings', roles: ['walas', 'siswa'] },
        { id: 'm-pinjaman', label: 'Pinjaman', icon: HeartHandshake, path: '/cooperative/loans', roles: ['tu', 'siswa'] }
      ],
      alumni: [
        { id: 'm-simpanan-tutup', label: 'Simpanan', icon: Wallet, path: '/cooperative/savings', roles: ['tu', 'siswa'] },
        { id: 'm-shu', label: 'Sisa Hasil Usaha', icon: Award, path: '/cooperative/shu', roles: ['tu', 'kepsek'] }
      ]
    }
  }
};

const ROLE_OPTIONS: { id: RolePOV; name: string }[] = [
  { id: 'all', name: 'Semua Role' },
  { id: 'kepsek', name: 'POV Kepala Sekolah' },
  { id: 'kaprog', name: 'POV Kaprog' },
  { id: 'walas', name: 'POV Wali Kelas' },
  { id: 'tu', name: 'POV Tata Usaha' },
  { id: 'hubin', name: 'POV Hubin' },
  { id: 'siswa', name: 'POV Siswa' },
];

export const EcosystemWorkflowShowcase: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<StageId>('kelas-11');
  const [selectedRole, setSelectedRole] = useState<RolePOV>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active Stage Object
  const currentStage = useMemo(() => {
    return STAGES.find(s => s.id === selectedStage) || STAGES[2];
  }, [selectedStage]);

  // Active Stage Index (0 - 4)
  const stageIndex = useMemo(() => {
    return STAGES.findIndex(s => s.id === selectedStage);
  }, [selectedStage]);

  // Filter menus per division according to stage & role
  const getDivisionSproutedMenus = (divId: DivisionId): CanonicalMenuItem[] => {
    const raw = DIVISIONS[divId].menusPerStage[selectedStage] || [];
    if (selectedRole === 'all') return raw;
    return raw.filter(m => m.roles.includes(selectedRole));
  };

  const topDivisions = useMemo(() => [DIVISIONS.kurikulum, DIVISIONS.kesiswaan, DIVISIONS.konseling], []);
  const bottomDivisions = useMemo(() => [DIVISIONS.tu, DIVISIONS.hubin, DIVISIONS.sarpras, DIVISIONS.koperasi], []);

  return (
    <div className={`w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'h-screen min-h-[720px]'
    }`}>
      {/* BACKGROUND TECH GRID & SUBTLE GLOW */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* COMPACT TOP HEADER */}
      <header className="relative z-30 px-6 py-2.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                CANONICAL MENU TOPOLOGY
              </span>
              <span className="text-[10px] text-slate-400">• Hirarki Modul Menu Berdasarkan seed.ts</span>
            </div>
            <h1 className="text-sm font-extrabold text-white tracking-tight">
              ABSENTA LIVING ECOSYSTEM
            </h1>
          </div>
        </div>

        {/* ROLE POV SELECTOR */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">POV Lensa:</span>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {ROLE_OPTIONS.map(r => {
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <Link
            to="/dashboard"
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* MASTER BUTTERFLY TREE CANVAS */}
      <main className="relative z-10 flex-1 flex flex-col justify-between px-6 py-2 overflow-hidden">

        {/* ======================================================== */}
        {/* 1. TOP DAHAN ZONE (SAYAP ATAS: MENU BERTUNAS KE ATAS)    */}
        {/* ======================================================== */}
        <section className="w-full flex-1 flex flex-col justify-end pb-1 max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-6 w-full items-end">
            {topDivisions.map(div => {
              const Icon = div.icon;
              const sproutedMenus = getDivisionSproutedMenus(div.id);
              const hasMenus = sproutedMenus.length > 0;

              return (
                <div key={div.id} className="flex flex-col items-center">
                  
                  {/* ANAK MENU YANG BERTUNAS KE ATAS (RAMPING & COMPACT) */}
                  <div className="w-full min-h-[96px] flex flex-col justify-end items-center gap-1.5 py-1">
                    <AnimatePresence mode="popLayout">
                      {sproutedMenus.map((menu, idx) => {
                        const MenuIcon = menu.icon;
                        return (
                          <motion.div
                            key={menu.id}
                            layout
                            initial={{ opacity: 0, scale: 0.85, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 8 }}
                            transition={{ duration: 0.22, delay: idx * 0.04 }}
                          >
                            <Link
                              to={menu.path}
                              className={`w-fit whitespace-nowrap rounded-full px-3 py-1 border transition-all flex items-center justify-between gap-2 shadow-sm group ${div.theme.nodeBg}`}
                              title={`Buka menu ${menu.label} (${menu.path})`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MenuIcon className={`w-3.5 h-3.5 shrink-0 ${div.theme.accent}`} />
                                <span className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300 whitespace-nowrap transition-colors">
                                  {menu.label}
                                </span>
                              </div>

                              <span className="p-0.5 rounded-full bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/20 transition-all shrink-0">
                                <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {!hasMenus && (
                      <div className="h-[96px] flex items-center justify-center text-[10px] text-slate-500 font-mono italic">
                        — Tidak ada menu di fase ini —
                      </div>
                    )}
                  </div>

                  {/* STEM LINE FROM PARENT UPWARD TO CHILDREN */}
                  {hasMenus && (
                    <div className="w-0.5 h-3 bg-gradient-to-t from-slate-600 to-cyan-500/60" />
                  )}

                  {/* INDUK DIVISI ATAS (DEKAT TIMELINE) */}
                  <div
                    className={`w-full p-2.5 rounded-2xl border transition-all duration-300 shadow-md flex items-center justify-between ${
                      hasMenus
                        ? `bg-slate-900/90 ${div.theme.border} ring-1 ring-white/10 ${div.theme.glow}`
                        : 'bg-slate-950/60 border-slate-900 opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-xl bg-slate-950 border border-slate-800 ${div.theme.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${div.theme.accent}`}>
                          {div.short}
                        </span>
                        <h3 className="text-xs font-bold text-white truncate">
                          {div.name}
                        </h3>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${div.theme.badge}`}>
                      {sproutedMenus.length} Menu
                    </span>
                  </div>

                  {/* STEM CONNECTOR TO CENTRAL TIMELINE */}
                  <div className="w-0.5 h-5 bg-gradient-to-b from-slate-600 to-cyan-500/60" />
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. CENTRAL TIMELINE AXIS & MOVING AVATAR SISWA           */}
        {/* ======================================================== */}
        <section className="relative my-1 py-3 max-w-6xl mx-auto w-full shrink-0">
          {/* Glowing Rail Line */}
          <div className="absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 bg-slate-800/80 rounded-full z-0" />
          <motion.div
            className="absolute top-1/2 left-8 h-1 -translate-y-1/2 bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 rounded-full z-0"
            initial={false}
            animate={{
              width: `${(stageIndex / (STAGES.length - 1)) * 94}%`
            }}
            transition={{ type: 'spring', stiffness: 180, damping: 25 }}
          />

          {/* 5 Milestone Points */}
          <div className="relative z-10 flex items-center justify-between px-2">
            {STAGES.map((st, idx) => {
              const isCurrent = st.id === selectedStage;
              const isPassed = idx <= stageIndex;

              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStage(st.id)}
                  className="flex flex-col items-center group focus:outline-none transition-transform"
                >
                  {/* Point Button */}
                  <div className="relative mb-1 flex items-center justify-center">
                    {isCurrent && (
                      <motion.div
                        layoutId="activePingGlow"
                        className="absolute w-10 h-10 rounded-full bg-cyan-400/25 blur-md animate-ping"
                      />
                    )}

                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ring-4 ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950 ring-cyan-400/40 shadow-xl shadow-cyan-500/50 scale-125'
                          : isPassed
                          ? 'bg-slate-800 text-cyan-300 ring-slate-800 group-hover:scale-110'
                          : 'bg-slate-900 text-slate-600 ring-slate-900 group-hover:bg-slate-800'
                      }`}
                    >
                      {isPassed && !isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>

                    {/* MOVING HERO SISWA AVATAR */}
                    {isCurrent && (
                      <motion.div
                        layoutId="sproutingStudentAvatar"
                        className="absolute -top-9 flex flex-col items-center pointer-events-none"
                        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                      >
                        <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 text-slate-950 font-black text-[10px] shadow-lg flex items-center gap-1 whitespace-nowrap">
                          <span>{st.avatarIcon}</span>
                          <span>{st.studentStatus}</span>
                        </div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rotate-45 -mt-0.5" />
                      </motion.div>
                    )}
                  </div>

                  {/* Stage Label */}
                  <span
                    className={`text-xs font-black tracking-tight mt-1 transition-colors ${
                      isCurrent ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {st.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {st.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. BOTTOM DAHAN ZONE (SAYAP BAWAH: MENU BERTUNAS KE BAWAH)*/}
        {/* ======================================================== */}
        <section className="w-full flex-1 flex flex-col justify-start pt-1 max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-4 w-full items-start">
            {bottomDivisions.map(div => {
              const Icon = div.icon;
              const sproutedMenus = getDivisionSproutedMenus(div.id);
              const hasMenus = sproutedMenus.length > 0;

              return (
                <div key={div.id} className="flex flex-col items-center">
                  
                  {/* STEM CONNECTOR FROM CENTRAL TIMELINE */}
                  <div className="w-0.5 h-5 bg-gradient-to-b from-cyan-500/60 to-slate-600" />

                  {/* INDUK DIVISI BAWAH (DEKAT TIMELINE) */}
                  <div
                    className={`w-full p-2.5 rounded-2xl border transition-all duration-300 shadow-md flex items-center justify-between ${
                      hasMenus
                        ? `bg-slate-900/90 ${div.theme.border} ring-1 ring-white/10 ${div.theme.glow}`
                        : 'bg-slate-950/60 border-slate-900 opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-xl bg-slate-950 border border-slate-800 ${div.theme.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${div.theme.accent}`}>
                          {div.short}
                        </span>
                        <h3 className="text-xs font-bold text-white truncate">
                          {div.name}
                        </h3>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border shrink-0 ${div.theme.badge}`}>
                      {sproutedMenus.length} Menu
                    </span>
                  </div>

                  {/* STEM LINE DOWNWARD FROM PARENT TO CHILDREN */}
                  {hasMenus && (
                    <div className="w-0.5 h-3 bg-gradient-to-b from-slate-600 to-cyan-500/60" />
                  )}

                  {/* ANAK MENU YANG BERTUNAS KE BAWAH (RAMPING & COMPACT) */}
                  <div className="w-full min-h-[96px] flex flex-col justify-start items-center gap-1.5 py-1">
                    <AnimatePresence mode="popLayout">
                      {sproutedMenus.map((menu, idx) => {
                        const MenuIcon = menu.icon;
                        return (
                          <motion.div
                            key={menu.id}
                            layout
                            initial={{ opacity: 0, scale: 0.85, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: -8 }}
                            transition={{ duration: 0.22, delay: idx * 0.04 }}
                          >
                            <Link
                              to={menu.path}
                              className={`w-fit whitespace-nowrap rounded-full px-3 py-1 border transition-all flex items-center justify-between gap-2 shadow-sm group ${div.theme.nodeBg}`}
                              title={`Buka menu ${menu.label} (${menu.path})`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MenuIcon className={`w-3.5 h-3.5 shrink-0 ${div.theme.accent}`} />
                                <span className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300 whitespace-nowrap transition-colors">
                                  {menu.label}
                                </span>
                              </div>

                              <span className="p-0.5 rounded-full bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/20 transition-all shrink-0">
                                <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {!hasMenus && (
                      <div className="h-[96px] flex items-center justify-center text-[10px] text-slate-500 font-mono italic">
                        — Tidak ada menu di fase ini —
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* FOOTER STATUS */}
      <footer className="relative z-20 px-6 py-2 bg-slate-950/90 border-t border-slate-900 text-slate-400 text-[11px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Klik salah satu menu kapsul untuk langsung membuka modulnya di sistem.</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          FASE AKTIF: {currentStage.label} ({currentStage.studentStatus})
        </div>
      </footer>
    </div>
  );
};

export default EcosystemWorkflowShowcase;
