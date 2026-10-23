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
export type StageId = 'onboarding' | 'kbm-presensi' | 'disiplin-bk' | 'evaluasi-rapor' | 'vokasi-pkl' | 'kelulusan-karir';
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
  { id: 'onboarding', label: '1. ONBOARDING', sub: 'PPDB & Biometrik', avatarIcon: '🎒', studentStatus: 'Calon / Siswa Baru' },
  { id: 'kbm-presensi', label: '2. KBM & PRESENSI', sub: 'Gerbang & Kelas', avatarIcon: '🏫', studentStatus: 'Siswa Aktif Belajar' },
  { id: 'disiplin-bk', label: '3. DISIPLIN & BK', sub: 'Restorasi Karakter', avatarIcon: '🤝', studentStatus: 'Siswa Dibina & Didampingi' },
  { id: 'evaluasi-rapor', label: '4. EVALUASI & RAPOR', sub: 'CBT & Ledger Rapor', avatarIcon: '📝', studentStatus: 'Peserta Ujian & Rapor' },
  { id: 'vokasi-pkl', label: '5. VOKASI & PKL', sub: 'Praktik Industri DUDI', avatarIcon: '🛠️', studentStatus: 'Siswa Magang Industri' },
  { id: 'kelulusan-karir', label: '6. UKK & KELULUSAN', sub: 'Alumni & Karir BKK', avatarIcon: '🎓', studentStatus: 'Calon Lulusan / Alumni' },
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
      onboarding: [
        { id: 'm-kosp', label: 'Dokumen KOSP', icon: Sparkles, path: '/kurikulum/kosp-builder', roles: ['kaprog', 'kepsek'] },
        { id: 'm-struktur', label: 'Struktur Kurikulum', icon: Layout, path: '/kurikulum/struktur', roles: ['kaprog', 'kepsek'] },
        { id: 'm-ploting', label: 'Ploting Guru Mapel', icon: Users, path: '/kurikulum/guru-mapel', roles: ['kaprog', 'kepsek'] },
        { id: 'm-walas', label: 'Wali Kelas', icon: UserCheck, path: '/kurikulum/wali-kelas', roles: ['walas', 'kepsek'] }
      ],
      'kbm-presensi': [
        { id: 'm-jam', label: 'Jam Pelajaran', icon: Clock, path: '/kurikulum/jam-kbm', roles: ['walas', 'kaprog', 'kepsek'] },
        { id: 'm-jadwal', label: 'Jadwal KBM', icon: Calendar, path: '/kurikulum/jadwal', roles: ['walas', 'kaprog', 'kepsek'] },
        { id: 'm-beban', label: 'Beban Mengajar', icon: Layers, path: '/kurikulum/jadwal-kontrak-kbm', roles: ['kaprog', 'kepsek'] },
        { id: 'm-perangkat', label: 'Perangkat Ajar', icon: FileText, path: '/kurikulum/perangkat', roles: ['kaprog', 'walas'] }
      ],
      'disiplin-bk': [
        { id: 'm-pantau-kbm', label: 'Pantau Kelas', icon: Activity, path: '/attendance/monitoring', roles: ['walas', 'kepsek'] },
        { id: 'm-rekap-kbm', label: 'Rekap KBM', icon: BarChart2, path: '/kurikulum/rekap-kbm', roles: ['kaprog', 'kepsek'] },
        { id: 'm-supervisi', label: 'Supervisi Guru', icon: ShieldCheck, path: '/kurikulum/supervisi', roles: ['kepsek', 'kaprog'] }
      ],
      'evaluasi-rapor': [
        { id: 'm-cbt', label: 'Ujian CBT', icon: Laptop, path: '/cbt/dashboard', roles: ['kaprog', 'kepsek'] },
        { id: 'm-nilai', label: 'Input Nilai', icon: Award, path: '/rapor/nilai', roles: ['walas', 'kaprog'] },
        { id: 'm-pleno', label: 'Rapat Pleno', icon: Users, path: '/academic/pleno', roles: ['kepsek', 'kaprog', 'walas'] },
        { id: 'm-rapor', label: 'Cetak Rapor', icon: Printer, path: '/rapor/cetak', roles: ['walas', 'siswa'] }
      ],
      'vokasi-pkl': [
        { id: 'm-perangkat-pkl', label: 'Capaian Pembelajaran PKL', icon: FileText, path: '/kurikulum/perangkat', roles: ['kaprog', 'walas'] },
        { id: 'm-jadwal-blok', label: 'Jadwal Blok PKL', icon: Calendar, path: '/kurikulum/jadwal', roles: ['kaprog', 'kepsek'] }
      ],
      'kelulusan-karir': [
        { id: 'm-ukk', label: 'Uji Kompetensi (UKK)', icon: Award, path: '/kurikulum/ukk-asesmen', roles: ['kaprog', 'kepsek'] },
        { id: 'm-transisi', label: 'Kenaikan & Kelulusan', icon: GraduationCap, path: '/academic/transition', roles: ['tu', 'kepsek'] }
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
      onboarding: [
        { id: 'm-taruna', label: 'Program Ketarunaan', icon: ShieldCheck, path: '/kesiswaan/program-ketarunaan', roles: ['walas', 'kepsek'] },
        { id: 'm-poin-master', label: 'Master Poin Pelanggaran', icon: List, path: '/kesiswaan/jenis-pelanggaran', roles: ['walas', 'kepsek'] },
        { id: 'm-agenda-ks', label: 'Agenda Kesiswaan', icon: Calendar, path: '/kesiswaan/jadwal-kegiatan', roles: ['walas'] }
      ],
      'kbm-presensi': [
        { id: 'm-gate', label: 'Gate Scanner', icon: Scan, path: '/attendance/gate', roles: ['tu', 'walas'] },
        { id: 'm-piket', label: 'Meja Piket Harian', icon: ShieldCheck, path: '/kesiswaan/piket', roles: ['walas', 'kepsek'] },
        { id: 'm-ops', label: 'Ruang Operasional', icon: Scan, path: '/attendance/ops', roles: ['tu', 'walas'] },
        { id: 'm-dhuha', label: 'Pembiasaan Dhuha', icon: Moon, path: '/kesiswaan/program-dhuha', roles: ['walas'] }
      ],
      'disiplin-bk': [
        { id: 'm-pelanggaran', label: 'Pelanggaran Siswa', icon: AlertTriangle, path: '/kesiswaan/pelanggaran', roles: ['walas', 'kepsek'] },
        { id: 'm-sp', label: 'Surat Peringatan', icon: FileText, path: '/kesiswaan/surat-peringatan', roles: ['walas', 'kepsek'] },
        { id: 'm-upacara', label: 'Pembina Upacara', icon: Award, path: '/kesiswaan/pembina-upacara', roles: ['walas', 'kepsek'] }
      ],
      'evaluasi-rapor': [
        { id: 'm-prestasi-eval', label: 'Prestasi Siswa', icon: Trophy, path: '/kesiswaan/prestasi', roles: ['walas', 'siswa'] },
        { id: 'm-rekap-pres-eval', label: 'Rekap Presensi Semester', icon: Calendar, path: '/attendance/rekap', roles: ['tu', 'kepsek'] },
        { id: 'm-catatan-sikap', label: 'Verifikasi Poin Siswa', icon: AlertTriangle, path: '/kesiswaan/pelanggaran', roles: ['walas', 'kepsek'] }
      ],
      'vokasi-pkl': [
        { id: 'm-tatib-dudi', label: 'Disiplin Budaya Industri', icon: ShieldCheck, path: '/kesiswaan/program-ketarunaan', roles: ['walas', 'hubin'] },
        { id: 'm-pelanggaran-pkl', label: 'Insiden Lapangan PKL', icon: AlertTriangle, path: '/kesiswaan/pelanggaran', roles: ['walas', 'kepsek'] }
      ],
      'kelulusan-karir': [
        { id: 'm-skkb', label: 'Surat Rekomendasi (SKKB)', icon: ShieldCheck, path: '/kesiswaan/surat-rekomendasi', roles: ['walas', 'tu'] },
        { id: 'm-prestasi-akhir', label: 'Portofolio Prestasi', icon: Trophy, path: '/kesiswaan/prestasi', roles: ['walas', 'siswa'] },
        { id: 'm-berkas-ks', label: 'Cetak Berkas Kelulusan', icon: FileText, path: '/kesiswaan/cetak-berkas', roles: ['walas', 'kepsek'] }
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
      onboarding: [
        { id: 'm-asesmen', label: 'Minat & Bakat Diagnostik', icon: FileText, path: '/bpbk/asesmen', roles: ['walas', 'kepsek'] },
        { id: 'm-gaya-belajar', label: 'Pemetaan Gaya Belajar', icon: Sparkles, path: '/bpbk/asesmen', roles: ['walas'] }
      ],
      'kbm-presensi': [
        { id: 'm-deteksi', label: 'Deteksi Dini Masalah', icon: AlertTriangle, path: '/bpbk/cases', roles: ['walas', 'kepsek'] },
        { id: 'm-konseling-kbm', label: 'Konseling Siswa', icon: HeartHandshake, path: '/bpbk/konseling', roles: ['walas'] }
      ],
      'disiplin-bk': [
        { id: 'm-kasus', label: 'Buku Kasus Siswa', icon: FileText, path: '/bpbk/siswa', roles: ['walas', 'kepsek'] },
        { id: 'm-homevisit', label: 'Home Visit Siswa', icon: Home, path: '/bpbk/homevisit', roles: ['walas'] },
        { id: 'm-panggilan', label: 'Panggilan Orang Tua', icon: Mail, path: '/bpbk/pemanggilan', roles: ['walas'] },
        { id: 'm-rujukan', label: 'Rujukan Kasus', icon: Send, path: '/bpbk/rujukan', roles: ['walas', 'kepsek'] }
      ],
      'evaluasi-rapor': [
        { id: 'm-eval-bk', label: 'Catatan Perkembangan Sikap', icon: FileText, path: '/bpbk/siswa', roles: ['walas', 'kepsek'] },
        { id: 'm-laporan-bk', label: 'Laporan Layanan BK', icon: BarChart3, path: '/bpbk/reports', roles: ['kepsek'] }
      ],
      'vokasi-pkl': [
        { id: 'm-adaptasi-pkl', label: 'Bimbingan Adaptasi Industri', icon: HeartHandshake, path: '/bpbk/konseling', roles: ['walas', 'hubin'] },
        { id: 'm-kasus-pkl', label: 'Mediasi Kasus Magang', icon: AlertTriangle, path: '/bpbk/cases', roles: ['walas', 'hubin'] }
      ],
      'kelulusan-karir': [
        { id: 'm-karir', label: 'Dashboard Karir & SNBP', icon: HeartHandshake, path: '/bpbk/dashboard', roles: ['walas', 'siswa'] },
        { id: 'm-rujukan-karir', label: 'Rekomendasi Kuliah/Kerja', icon: Send, path: '/bpbk/rujukan', roles: ['walas', 'kepsek'] },
        { id: 'm-berkas-bk', label: 'Cetak Berkas Rekam BK', icon: FileText, path: '/bpbk/cetak-berkas', roles: ['tu'] }
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
      onboarding: [
        { id: 'm-ppdb-map', label: 'PPDB Mapping & Verifikasi', icon: FileText, path: '/academic/ppdb-mapping', roles: ['tu', 'kepsek'] },
        { id: 'm-buku-induk', label: 'Buku Induk Siswa', icon: GraduationCap, path: '/academic/buku-induk', roles: ['tu', 'kepsek'] },
        { id: 'm-wajah', label: 'Perekaman Wajah Biometrik', icon: Camera, path: '/attendance/rekam-wajah', roles: ['tu'] },
        { id: 'm-smart-card', label: 'Kartu Pelajar RFID', icon: Scan, path: '/academic/siswa-cards', roles: ['tu', 'siswa'] }
      ],
      'kbm-presensi': [
        { id: 'm-guru', label: 'Data Guru & Staf', icon: UserCheck, path: '/academic/guru', roles: ['tu', 'kepsek'] },
        { id: 'm-surat-masuk', label: 'Surat Masuk', icon: Inbox, path: '/correspondence/surat-masuk', roles: ['tu', 'kepsek'] },
        { id: 'm-suket', label: 'Surat Keterangan Aktif', icon: FileText, path: '/correspondence/surat-keterangan', roles: ['tu', 'siswa'] }
      ],
      'disiplin-bk': [
        { id: 'm-surat-keluar', label: 'Surat Panggilan Dinas', icon: Send, path: '/correspondence/surat-keluar', roles: ['tu', 'walas'] },
        { id: 'm-agenda-tu', label: 'Buku Agenda Surat', icon: FileText, path: '/correspondence/templates', roles: ['tu'] }
      ],
      'evaluasi-rapor': [
        { id: 'm-tagihan', label: 'Tagihan Keuangan Siswa', icon: FileText, path: '/billing/invoices', roles: ['tu', 'siswa', 'kepsek'] },
        { id: 'm-kas-masuk', label: 'Riwayat Kas Pembayaran', icon: Wallet, path: '/billing/payments', roles: ['tu', 'kepsek'] },
        { id: 'm-bebas-tu', label: 'Bebas Tanggungan SPP', icon: ShieldCheck, path: '/billing', roles: ['tu', 'kepsek'] }
      ],
      'vokasi-pkl': [
        { id: 'm-surat-tugas-pkl', label: 'Surat Tugas PKL Industri', icon: Send, path: '/correspondence/surat-keluar', roles: ['tu', 'hubin'] },
        { id: 'm-mou-arsip', label: 'Arsip MoU Kemitraan', icon: FileText, path: '/documents', roles: ['tu', 'hubin'] }
      ],
      'kelulusan-karir': [
        { id: 'm-skl-transkrip', label: 'SKL & Transkrip Nilai', icon: GraduationCap, path: '/academic/prep-checklist', roles: ['tu', 'kepsek'] },
        { id: 'm-arsip-dokumen', label: 'Dokumen Ijazah & Arsip', icon: FileText, path: '/documents', roles: ['tu', 'kepsek'] },
        { id: 'm-log-staf', label: 'Log Aktivitas Staf', icon: Clock, path: '/academic/staff-logs', roles: ['kepsek'] }
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
      onboarding: [
        { id: 'm-mitra-awal', label: 'Mitra Industri (DUDI)', icon: Building2, path: '/hubin/mitra', roles: ['hubin', 'kepsek'] },
        { id: 'm-setting-hb', label: 'Pengaturan Hubin', icon: Compass, path: '/hubin/settings', roles: ['hubin'] }
      ],
      'kbm-presensi': [
        { id: 'm-sinkron-dudi', label: 'Sinkronisasi Kurikulum DUDI', icon: Building2, path: '/hubin/mitra', roles: ['hubin', 'kaprog'] },
        { id: 'm-kunjungan-ind', label: 'Kunjungan Industri', icon: Compass, path: '/hubin/settings', roles: ['hubin', 'kaprog'] }
      ],
      'disiplin-bk': [
        { id: 'm-evaluasi-budaya', label: 'Evaluasi Budaya Kerja', icon: ShieldCheck, path: '/hubin/evaluasi', roles: ['hubin', 'walas'] }
      ],
      'evaluasi-rapor': [
        { id: 'm-nilai-pkl-rapor', label: 'Nilai PKL Industri', icon: Award, path: '/hubin/nilai-pkl', roles: ['hubin', 'kaprog'] },
        { id: 'm-sertifikat-dudi', label: 'Cetak Berkas Sertifikat', icon: FileText, path: '/hubin/cetak-berkas', roles: ['hubin'] }
      ],
      'vokasi-pkl': [
        { id: 'm-plot-pkl', label: 'Plot & Pantau PKL', icon: Users, path: '/hubin/penempatan', roles: ['hubin', 'kaprog', 'tu'] },
        { id: 'm-absen-pkl', label: 'Presensi GPS PKL', icon: Clock, path: '/hubin/absensi', roles: ['hubin', 'kaprog', 'siswa'] },
        { id: 'm-jurnal-pkl', label: 'Jurnal Kegiatan Lapangan', icon: FileText, path: '/hubin/jurnal', roles: ['hubin', 'siswa'] },
        { id: 'm-monitoring-pkl', label: 'Monitoring Guru Lapangan', icon: Activity, path: '/hubin/monitoring-pkl', roles: ['hubin', 'kaprog'] }
      ],
      'kelulusan-karir': [
        { id: 'm-tefa', label: 'Teaching Factory (TEFA)', icon: Hammer, path: '/hubin/tefa', roles: ['hubin', 'kaprog'] },
        { id: 'm-bkk', label: 'Bursa Kerja Khusus (BKK)', icon: Briefcase, path: '/hubin/bkk', roles: ['hubin', 'kepsek', 'siswa'] },
        { id: 'm-tracer', label: 'Tracer Study Alumni', icon: GraduationCap, path: '/hubin/tracer', roles: ['hubin', 'kepsek'] }
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
      onboarding: [
        { id: 'm-inv-awal', label: 'Inventaris Barang Masuk', icon: Package, path: '/sarpras/inventory', roles: ['kepsek'] },
        { id: 'm-katalog-sarpras', label: 'Katalog Sarana Prasarana', icon: Package, path: '/sarpras/catalog', roles: ['kepsek', 'tu'] }
      ],
      'kbm-presensi': [
        { id: 'm-pinjam-kbm', label: 'Peminjaman Alat KBM', icon: Package, path: '/sarpras/loans', roles: ['walas', 'kaprog'] },
        { id: 'm-ruang-lab', label: 'Jadwal Ruangan Lab', icon: Building2, path: '/sarpras/rooms', roles: ['kaprog', 'walas'] }
      ],
      'disiplin-bk': [
        { id: 'm-rusak-sarpras', label: 'Klaim Kerusakan Sarana', icon: Wrench, path: '/sarpras/maintenance', roles: ['walas', 'tu'] }
      ],
      'evaluasi-rapor': [
        { id: 'm-kesiapan-cbt', label: 'Kesiapan Lab Komputer CBT', icon: Laptop, path: '/sarpras/rooms', roles: ['kaprog', 'kepsek'] },
        { id: 'm-maintenance-cbt', label: 'Perawatan Perangkat Ujian', icon: Wrench, path: '/sarpras/maintenance', roles: ['kaprog'] }
      ],
      'vokasi-pkl': [
        { id: 'm-alat-bengkel', label: 'Alat Praktik Bengkel Kejuruan', icon: Package, path: '/sarpras/loans', roles: ['kaprog'] },
        { id: 'm-sarpras-tefa', label: 'Fasilitas Produksi TEFA', icon: Building2, path: '/sarpras/inventory', roles: ['kaprog'] }
      ],
      'kelulusan-karir': [
        { id: 'm-bebas-pinjam', label: 'Bebas Pinjaman Sarana', icon: ShieldCheck, path: '/sarpras/loans', roles: ['tu'] },
        { id: 'm-berkas-sarpras', label: 'Cetak Berkas Bebas Lab', icon: FileText, path: '/sarpras/cetak-berkas', roles: ['tu'] }
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
      onboarding: [
        { id: 'm-pos-seragam', label: 'Kasir Pembelian Seragam', icon: ShoppingCart, path: '/cooperative/pos', roles: ['tu', 'siswa'] },
        { id: 'm-produk-seragam', label: 'Data Barang & Atribut', icon: Package, path: '/cooperative/products', roles: ['tu'] }
      ],
      'kbm-presensi': [
        { id: 'm-anggota-kop', label: 'Data Anggota Koperasi', icon: Users, path: '/cooperative/members', roles: ['walas', 'siswa'] },
        { id: 'm-pos-harian', label: 'Kasir Toko & ATK', icon: ShoppingCart, path: '/cooperative/pos', roles: ['siswa'] }
      ],
      'disiplin-bk': [
        { id: 'm-simpanan-tab', label: 'Tabungan Siswa Terjadwal', icon: Wallet, path: '/cooperative/savings', roles: ['walas', 'siswa'] }
      ],
      'evaluasi-rapor': [
        { id: 'm-rekap-transaksi', label: 'Rekap Transaksi Semester', icon: BarChart3, path: '/cooperative/pos', roles: ['tu', 'kepsek'] }
      ],
      'vokasi-pkl': [
        { id: 'm-unit-produksi', label: 'Pemasaran Produk Siswa PKL', icon: Package, path: '/cooperative/products', roles: ['kaprog', 'siswa'] },
        { id: 'm-pos-tefa', label: 'Kasir Penjualan Unit TEFA', icon: ShoppingCart, path: '/cooperative/pos', roles: ['siswa'] }
      ],
      'kelulusan-karir': [
        { id: 'm-tutup-simpanan', label: 'Pencairan Simpanan Anggota', icon: Wallet, path: '/cooperative/savings', roles: ['tu', 'siswa'] },
        { id: 'm-shu-alumni', label: 'Sisa Hasil Usaha (SHU)', icon: Award, path: '/cooperative/shu', roles: ['tu', 'kepsek'] }
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
  const [selectedStage, setSelectedStage] = useState<StageId>('kbm-presensi');
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
