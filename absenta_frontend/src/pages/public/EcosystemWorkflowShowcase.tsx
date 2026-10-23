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
  Sparkles,
  ArrowRight,
  GitBranch,
  Eye
} from 'lucide-react';

export type DivisionId = 'kurikulum' | 'kesiswaan' | 'konseling' | 'tu' | 'hubin' | 'sarpras' | 'koperasi';
export type StageId = 'ppdb' | 'kelas-10' | 'kelas-11' | 'kelas-12' | 'alumni';
export type RolePOV = 'all' | 'kepsek' | 'kaprog' | 'walas' | 'tu' | 'hubin' | 'siswa';

interface FeatureChild {
  id: string;
  name: string;
  route: string;
  desc: string;
  roles: RolePOV[];
}

interface DivisionData {
  id: DivisionId;
  name: string;
  short: string;
  icon: any;
  position: 'top' | 'bottom';
  theme: {
    accent: string;
    border: string;
    bg: string;
    glow: string;
    badge: string;
    nodeBg: string;
  };
  featuresPerStage: Record<StageId, FeatureChild[]>;
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
  { id: 'alumni', label: 'LULUS', sub: 'Karir & Alumni', avatarIcon: '💼', studentStatus: 'Alumni / Kerja' },
];

const DIVISIONS: Record<DivisionId, DivisionData> = {
  kurikulum: {
    id: 'kurikulum',
    name: 'Kurikulum & KBM',
    short: 'KURIKULUM',
    icon: BookOpen,
    position: 'top',
    theme: {
      accent: 'text-sky-400',
      border: 'border-sky-500/40',
      bg: 'bg-sky-500/10',
      glow: 'shadow-sky-500/20',
      badge: 'bg-sky-950/90 text-sky-300 border-sky-800',
      nodeBg: 'bg-sky-950/70 border-sky-800/80 hover:border-sky-400',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'k-1', name: 'Plotting Kuota & Peminatan', route: '/kurikulum/plotting', desc: 'Penetapan kuota rombel dan pembagian jurusan siswa baru.', roles: ['kaprog', 'kepsek'] },
        { id: 'k-2', name: 'Struktur KOSP & Capaian', route: '/kurikulum/kosp-builder', desc: 'Penyusunan kurikulum operasional sekolah.', roles: ['kaprog', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'k-3', name: 'Distribusi Jadwal KBM', route: '/kurikulum/jam-kbm', desc: 'Jadwal tatap muka harian dan kalender KBM.', roles: ['walas', 'kaprog', 'kepsek'] },
        { id: 'k-4', name: 'Jurnal Mengajar di Kelas', route: '/attendance/riwayat-ajar', desc: 'Presensi harian mapel dan materi tatap muka.', roles: ['walas', 'kepsek'] }
      ],
      'kelas-11': [
        { id: 'k-5', name: 'Sinkronisasi Kurikulum Industri', route: '/kurikulum/struktur', desc: 'Penyelarasan kompetensi vokasi dengan DUDI.', roles: ['kaprog', 'hubin'] },
        { id: 'k-6', name: 'Rekapitulasi KBM & Supervisi', route: '/kurikulum/rekap-kbm', desc: 'Monitoring jam mengajar dan ketercapaian silabus.', roles: ['kepsek', 'kaprog'] }
      ],
      'kelas-12': [
        { id: 'k-7', name: 'Bank Soal & Ujian CBT', route: '/cbt/dashboard', desc: 'Pelaksanaan ujian formatif/sumatif anti-curang.', roles: ['kaprog', 'kepsek'] },
        { id: 'k-8', name: 'Asesmen Sertifikasi UKK', route: '/rapor/input-nilai', desc: 'Uji kompetensi asesor internal & eksternal DUDI.', roles: ['kaprog', 'hubin'] },
        { id: 'k-9', name: 'Pencetakan Rapor Akhir', route: '/rapor/cetak', desc: 'Pengolahan leger nilai dan cetak rapor sah.', roles: ['walas', 'siswa'] }
      ],
      alumni: [
        { id: 'k-10', name: 'Leger Kelulusan & Transkrip', route: '/academic/cetak-berkas', desc: 'Arsip nilai komprehensif 6 semester untuk ijazah.', roles: ['tu', 'kepsek'] }
      ]
    }
  },
  kesiswaan: {
    id: 'kesiswaan',
    name: 'Kesiswaan & Karakter',
    short: 'KESISWAAN',
    icon: Users,
    position: 'top',
    theme: {
      accent: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      glow: 'shadow-amber-500/20',
      badge: 'bg-amber-950/90 text-amber-300 border-amber-800',
      nodeBg: 'bg-amber-950/70 border-amber-800/80 hover:border-amber-400',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'ks-1', name: 'Wawancara Komitmen Disiplin', route: '/kesiswaan/program-ketarunaan', desc: 'Asesmen awal sikap dan komitmen tata tertib.', roles: ['walas', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'ks-2', name: 'MPLS & Pembinaan Ketarunaan', route: '/kesiswaan/program-ketarunaan', desc: 'Orientasi disiplin, respek, dan mental sekolah.', roles: ['walas', 'kepsek'] },
        { id: 'ks-3', name: 'Gerbang Presensi QR & Wajah', route: '/attendance/gate', desc: 'Scanner kedatangan siswa masuk dan pulang.', roles: ['walas', 'tu', 'kepsek'] },
        { id: 'ks-4', name: 'Buku Poin & Tata Tertib', route: '/kesiswaan/pelanggaran', desc: 'Akumulasi skor pelanggaran dan reward kebaikan.', roles: ['walas', 'kepsek'] }
      ],
      'kelas-11': [
        { id: 'ks-5', name: 'Live Monitoring Presensi', route: '/attendance/live-status', desc: 'Papan pantau kehadiran real-time per detik.', roles: ['walas', 'kepsek'] },
        { id: 'ks-6', name: 'Rekam Prestasi & Lomba Siswa', route: '/kesiswaan/prestasi', desc: 'Portofolio medali dan kejuaraan perlombaan.', roles: ['walas', 'siswa'] },
        { id: 'ks-7', name: 'Monitoring Ekstrakurikuler', route: '/kesiswaan/anggota-eskul', desc: 'Keaktifan latihan klub dan organisasi siswa.', roles: ['walas'] }
      ],
      'kelas-12': [
        { id: 'ks-8', name: 'Verifikasi Bebas Sanksi Karakter', route: '/kesiswaan/pelanggaran', desc: 'Pemeriksaan status poin tata tertib syarat lulus.', roles: ['walas', 'kepsek'] }
      ],
      alumni: [
        { id: 'ks-9', name: 'Portofolio Sertifikat Prestasi', route: '/kesiswaan/prestasi', desc: 'Surat rekam jejak prestasi siswa untuk beasiswa.', roles: ['walas', 'siswa'] }
      ]
    }
  },
  konseling: {
    id: 'konseling',
    name: 'Bimbingan Konseling (BK)',
    short: 'KONSELING',
    icon: HeartHandshake,
    position: 'top',
    theme: {
      accent: 'text-rose-400',
      border: 'border-rose-500/40',
      bg: 'bg-rose-500/10',
      glow: 'shadow-rose-500/20',
      badge: 'bg-rose-950/90 text-rose-300 border-rose-800',
      nodeBg: 'bg-rose-950/70 border-rose-800/80 hover:border-rose-400',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'bk-1', name: 'Asesmen Diagnostik Gaya Belajar', route: '/bpbk/asesmen', desc: 'Pemetaan psikologis dan tipe belajar siswa baru.', roles: ['walas', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'bk-2', name: 'Bimbingan Adaptasi & Sosiometri', route: '/bpbk/konseling', desc: 'Pendampingan siswa baru agar cepat beradaptasi.', roles: ['walas'] }
      ],
      'kelas-11': [
        { id: 'bk-3', name: 'Buku Catatan Kasus Siswa', route: '/bpbk/cases', desc: 'Pencatatan insiden dan konseling konfidensial.', roles: ['walas', 'kepsek'] },
        { id: 'bk-4', name: 'Agenda Kunjungan Rumah (Home Visit)', route: '/bpbk/homevisit', desc: 'Kunjungan guru BK ke orang tua murid bermasalah.', roles: ['walas'] }
      ],
      'kelas-12': [
        { id: 'bk-5', name: 'Bimbingan Karir: Kuliah vs Kerja', route: '/bpbk/dashboard', desc: 'Arahan seleksi SNBP/UTBK atau kesiapan kerja.', roles: ['walas', 'kepsek'] }
      ],
      alumni: [
        { id: 'bk-6', name: 'Konseling Tindak Lanjut Alumni', route: '/bpbk/dashboard', desc: 'Layanan konsultasi alih bidang karir lulusan.', roles: ['hubin'] }
      ]
    }
  },
  tu: {
    id: 'tu',
    name: 'Tata Usaha & Keuangan',
    short: 'TATA USAHA',
    icon: FileText,
    position: 'bottom',
    theme: {
      accent: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      glow: 'shadow-emerald-500/20',
      badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
      nodeBg: 'bg-emerald-950/70 border-emerald-800/80 hover:border-emerald-400',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'tu-1', name: 'Verifikasi Berkas & Validasi NISN', route: '/academic/ppdb-mapping', desc: 'Penerimaan digital KK/Akta dan integrasi Dapodik.', roles: ['tu', 'kepsek'] },
        { id: 'tu-2', name: 'Billing Tagihan DSP & Uang Masuk', route: '/billing/invoices', desc: 'Penerbitan kwitansi dan invoice registrasi awal.', roles: ['tu', 'siswa', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'tu-3', name: 'Buku Induk Digital & Klapper', route: '/academic/buku-induk', desc: 'Pusat data induk permanen siswa 360 derajat.', roles: ['tu', 'walas', 'kepsek'] },
        { id: 'tu-4', name: 'Cetak ID Card Pelajar (QR)', route: '/academic/siswa-cards', desc: 'Kartu pelajar pintar untuk scanner dan kantin.', roles: ['tu', 'siswa'] },
        { id: 'tu-5', name: 'Surat Keterangan Siswa Aktif', route: '/correspondence/surat-keterangan', desc: 'Layanan instan surat resmi permohonan siswa.', roles: ['tu', 'siswa'] }
      ],
      'kelas-11': [
        { id: 'tu-6', name: 'Surat Pengantar & Tugas PKL Resmi', route: '/correspondence/surat-keluar', desc: 'Surat dinas penempatan magang format nasional.', roles: ['tu', 'hubin'] },
        { id: 'tu-7', name: 'Billing SPP & Kas Masuk Bulanan', route: '/billing/payments', desc: 'Pencatatan kas dan rekonsiliasi pembayaran.', roles: ['tu', 'kepsek'] }
      ],
      'kelas-12': [
        { id: 'tu-8', name: 'Verifikasi Bebas Tanggungan Biaya', route: '/billing', desc: 'Cek otomatis lunas SPP sebelum ijazah diterbitkan.', roles: ['tu', 'kepsek'] }
      ],
      alumni: [
        { id: 'tu-9', name: 'Penerbitan SKL & Buku Ijazah', route: '/academic/cetak-berkas', desc: 'Arsip nomor ijazah dan penyerahan transkrip kelulusan.', roles: ['tu', 'kepsek'] }
      ]
    }
  },
  hubin: {
    id: 'hubin',
    name: 'Hubungan Industri (DUDI)',
    short: 'HUBIN',
    icon: Briefcase,
    position: 'bottom',
    theme: {
      accent: 'text-indigo-400',
      border: 'border-indigo-500/40',
      bg: 'bg-indigo-500/10',
      glow: 'shadow-indigo-500/20',
      badge: 'bg-indigo-950/90 text-indigo-300 border-indigo-800',
      nodeBg: 'bg-indigo-950/70 border-indigo-800/80 hover:border-indigo-400',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'hb-1', name: 'Sosialisasi Jejaring Industri Mitra', route: '/hubin/mitra', desc: 'Pengenalan kemitraan DUDI ke orang tua calon murid.', roles: ['hubin', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'hb-2', name: 'Database MoU Perusahaan Mitra', route: '/hubin/mitra', desc: 'Pengelolaan kuota tempat PKL dan legalitas MoU.', roles: ['hubin', 'kaprog', 'kepsek'] }
      ],
      'kelas-11': [
        { id: 'hb-3', name: 'Plotting Penempatan Magang PKL', route: '/hubin/penempatan', desc: 'Distribusi siswa ke pabrik/kantor sesuai jurusan.', roles: ['hubin', 'kaprog', 'tu'] },
        { id: 'hb-4', name: 'Jurnal Harian & Presensi GPS PKL', route: '/hubin/monitoring', desc: 'Siswa mengisi kegiatan praktikum dan absen lokasi.', roles: ['hubin', 'kaprog', 'siswa'] },
        { id: 'hb-5', name: 'Penilaian Mentor & Sertifikat DUDI', route: '/hubin/nilai-pkl', desc: 'Input nilai teknis langsung dari supervisor industri.', roles: ['hubin', 'kaprog'] }
      ],
      'kelas-12': [
        { id: 'hb-6', name: 'Sinkronisasi Standar Uji Industri', route: '/hubin/nilai-pkl', desc: 'Penyelarasan rubrik UKK dengan kebutuhan industri.', roles: ['kaprog', 'hubin'] }
      ],
      alumni: [
        { id: 'hb-7', name: 'BKK: Lowongan Kerja Mitra', route: '/hubin/bkk', desc: 'Bursa kerja khusus lowongan eksklusif bagi tamatan.', roles: ['hubin', 'kepsek', 'siswa'] },
        { id: 'hb-8', name: 'Tracer Study Penelusuran BMW', route: '/hubin/tracer', desc: 'Pelacakan alumni bekerja, kuliah, atau wirausaha.', roles: ['hubin', 'kepsek'] }
      ]
    }
  },
  sarpras: {
    id: 'sarpras',
    name: 'Sarana & Prasarana',
    short: 'SARPRAS',
    icon: Building2,
    position: 'bottom',
    theme: {
      accent: 'text-orange-400',
      border: 'border-orange-500/40',
      bg: 'bg-orange-500/10',
      glow: 'shadow-orange-500/20',
      badge: 'bg-orange-950/90 text-orange-300 border-orange-800',
      nodeBg: 'bg-orange-950/70 border-orange-800/80 hover:border-orange-400',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'sp-1', name: 'Kesiapan Sarana Ruang Kelas', route: '/sarpras/inventory', desc: 'Inventarisasi meja, kursi, dan AC kelas baru.', roles: ['kepsek'] }
      ],
      'kelas-10': [
        { id: 'sp-2', name: 'Peminjaman Buku Paket & Loker', route: '/sarpras/inventory', desc: 'Sirkulasi buku teks pelajaran per rombel.', roles: ['walas'] }
      ],
      'kelas-11': [
        { id: 'sp-3', name: 'Peminjaman Alat Praktik Bengkel/Lab', route: '/sarpras/loans', desc: 'Sirkulasi toolset mesin dan perangkat simulasi.', roles: ['kaprog'] }
      ],
      'kelas-12': [
        { id: 'sp-4', name: 'Kesiapan Lab Komputer & Server CBT', route: '/sarpras/maintenance', desc: 'Inspeksi workstation dan LAN jelang ujian akhir.', roles: ['kaprog', 'kepsek'] },
        { id: 'sp-5', name: 'Surat Bebas Pinjaman Sarpras', route: '/sarpras/loans', desc: 'Pemeriksaan pengembalian seluruh inventaris.', roles: ['tu'] }
      ],
      alumni: [
        { id: 'sp-6', name: 'Arsip Bebas Pinjam Sarpras', route: '/sarpras/loans', desc: 'Surat bukti pengembalian alat untuk ijazah.', roles: ['tu'] }
      ]
    }
  },
  koperasi: {
    id: 'koperasi',
    name: 'Koperasi & Finansial',
    short: 'KOPERASI',
    icon: ShoppingCart,
    position: 'bottom',
    theme: {
      accent: 'text-teal-400',
      border: 'border-teal-500/40',
      bg: 'bg-teal-500/10',
      glow: 'shadow-teal-500/20',
      badge: 'bg-teal-950/90 text-teal-300 border-teal-800',
      nodeBg: 'bg-teal-950/70 border-teal-800/80 hover:border-teal-400',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'kp-1', name: 'Paket Seragam & Atribut Sekolah', route: '/cooperative/pos', desc: 'Distribusi seragam batik, jas almamater, kaos olah raga.', roles: ['tu', 'siswa'] }
      ],
      'kelas-10': [
        { id: 'kp-2', name: 'Buku Modul Praktikum Kejuruan', route: '/cooperative/products', desc: 'Penyediaan modul ajar cetak di toko sekolah.', roles: ['siswa'] }
      ],
      'kelas-11': [
        { id: 'kp-3', name: 'Tabungan Siswa Persiapan PKL', route: '/cooperative/savings', desc: 'Simpanan mandiri siswa untuk operasional magang.', roles: ['walas', 'siswa'] }
      ],
      'kelas-12': [
        { id: 'kp-4', name: 'Perlengkapan Wisuda & Album Kenangan', route: '/cooperative/pos', desc: 'Paket toga wisuda dan buku tahunan kelulusan.', roles: ['siswa'] }
      ],
      alumni: [
        { id: 'kp-5', name: 'Penutupan Saldo Tabungan Siswa', route: '/cooperative/savings', desc: 'Pencairan saldo tabungan siswa saat kelulusan.', roles: ['tu', 'siswa'] }
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
  const [activeFeatureDetail, setActiveFeatureDetail] = useState<FeatureChild | null>(null);

  // Active Stage Object
  const currentStage = useMemo(() => {
    return STAGES.find(s => s.id === selectedStage) || STAGES[2];
  }, [selectedStage]);

  // Active Stage Index (0 - 4)
  const stageIndex = useMemo(() => {
    return STAGES.findIndex(s => s.id === selectedStage);
  }, [selectedStage]);

  // Filter features per division according to stage & role
  const getDivisionSproutedFeatures = (divId: DivisionId): FeatureChild[] => {
    const raw = DIVISIONS[divId].featuresPerStage[selectedStage] || [];
    if (selectedRole === 'all') return raw;
    return raw.filter(f => f.roles.includes(selectedRole));
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
                DYNAMIC BRANCHING TOPOLOGY
              </span>
              <span className="text-[10px] text-slate-400">• Induk & Ranting Fitur Otomatis Bertunas</span>
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

      {/* MASTER TREE CANVAS (FITS IN SCREEN) */}
      <main className="relative z-10 flex-1 flex flex-col justify-between px-6 py-3 overflow-hidden">

        {/* ======================================================== */}
        {/* 1. TOP DAHAN ZONE (SAYAP ATAS KUPU-KUPU: BERTUNAS KE ATAS)*/}
        {/* ======================================================== */}
        <section className="w-full flex-1 flex flex-col justify-end pb-1 max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-5 w-full items-end">
            {topDivisions.map(div => {
              const Icon = div.icon;
              const sproutedChildren = getDivisionSproutedFeatures(div.id);
              const hasChildren = sproutedChildren.length > 0;

              return (
                <div key={div.id} className="flex flex-col items-center">
                  
                  {/* ANAK / CABANG TOPOLOGI FITUR (BERTUNAS KE ATAS) */}
                  <div className="w-full min-h-[90px] flex flex-col justify-end gap-1.5 py-1">
                    <AnimatePresence mode="popLayout">
                      {sproutedChildren.map((child, idx) => (
                        <motion.div
                          key={child.id}
                          layout
                          initial={{ opacity: 0, scale: 0.85, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: 10 }}
                          transition={{ duration: 0.25, delay: idx * 0.05 }}
                          className={`rounded-xl px-2.5 py-1.5 border transition-all flex items-center justify-between gap-2 shadow-md ${div.theme.nodeBg}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 animate-ping" />
                            <span className="text-[11px] font-bold text-slate-100 truncate">
                              {child.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Link
                              to={child.route}
                              className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 hover:bg-cyan-400 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 transition-all flex items-center gap-0.5"
                              title="Buka Halaman Langsung"
                            >
                              Buka <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {!hasChildren && (
                      <div className="h-[90px] flex items-center justify-center text-[10px] text-slate-400 font-mono italic">
                        — Dahan non-aktif di fase ini —
                      </div>
                    )}
                  </div>

                  {/* STEM LINE FROM PARENT UPWARD TO CHILDREN */}
                  {hasChildren && (
                    <div className="w-0.5 h-3 bg-gradient-to-t from-slate-600 to-cyan-500/60" />
                  )}

                  {/* INDUK DIVISI ATAS (DEKAT TIMELINE) */}
                  <div
                    className={`w-full p-2.5 rounded-2xl border transition-all duration-300 shadow-lg flex items-center justify-between ${
                      hasChildren
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
                      {sproutedChildren.length} Ranting Aktif
                    </span>
                  </div>

                  {/* STEM CONNECTOR TO CENTRAL TIMELINE */}
                  <div className="w-0.5 h-4 bg-gradient-to-b from-slate-600 to-cyan-500/60" />
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

                    {/* MOVING OBJECT: HERO SISWA AVATAR */}
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
        {/* 3. BOTTOM DAHAN ZONE (SAYAP BAWAH KUPU-KUPU: BERTUNAS KE BAWAH)*/}
        {/* ======================================================== */}
        <section className="w-full flex-1 flex flex-col justify-start pt-1 max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-4 w-full items-start">
            {bottomDivisions.map(div => {
              const Icon = div.icon;
              const sproutedChildren = getDivisionSproutedFeatures(div.id);
              const hasChildren = sproutedChildren.length > 0;

              return (
                <div key={div.id} className="flex flex-col items-center">
                  
                  {/* STEM CONNECTOR FROM CENTRAL TIMELINE */}
                  <div className="w-0.5 h-4 bg-gradient-to-b from-slate-600 to-cyan-500/60" />

                  {/* INDUK DIVISI BAWAH (DEKAT TIMELINE) */}
                  <div
                    className={`w-full p-2.5 rounded-2xl border transition-all duration-300 shadow-lg flex items-center justify-between ${
                      hasChildren
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
                      {sproutedChildren.length}
                    </span>
                  </div>

                  {/* STEM LINE DOWNWARD FROM PARENT TO CHILDREN */}
                  {hasChildren && (
                    <div className="w-0.5 h-3 bg-gradient-to-b from-slate-600 to-cyan-500/60" />
                  )}

                  {/* ANAK / CABANG TOPOLOGI FITUR (BERTUNAS KE BAWAH) */}
                  <div className="w-full min-h-[90px] flex flex-col justify-start gap-1.5 py-1">
                    <AnimatePresence mode="popLayout">
                      {sproutedChildren.map((child, idx) => (
                        <motion.div
                          key={child.id}
                          layout
                          initial={{ opacity: 0, scale: 0.85, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -10 }}
                          transition={{ duration: 0.25, delay: idx * 0.05 }}
                          className={`rounded-xl px-2.5 py-1.5 border transition-all flex items-center justify-between gap-2 shadow-md ${div.theme.nodeBg}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                            <span className="text-[11px] font-bold text-slate-100 truncate">
                              {child.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Link
                              to={child.route}
                              className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 hover:bg-cyan-400 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 transition-all flex items-center gap-0.5"
                              title="Buka Halaman Langsung"
                            >
                              Buka <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {!hasChildren && (
                      <div className="h-[90px] flex items-center justify-center text-[10px] text-slate-400 font-mono italic">
                        — Dahan non-aktif di fase ini —
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* FOOTER BAR */}
      <footer className="relative z-20 px-6 py-2 bg-slate-950/90 border-t border-slate-900 text-slate-400 text-[11px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Klik salah satu checkpoint fase: Induk divisi akan otomatis menumbuhkan dahan fitur relevan secara live.</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          FASE AKTIF: {currentStage.label} ({currentStage.studentStatus})
        </div>
      </footer>
    </div>
  );
};

export default EcosystemWorkflowShowcase;
