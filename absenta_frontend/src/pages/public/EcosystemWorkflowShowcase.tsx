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
  X,
  Compass,
  CheckCircle2,
  Share2,
  Search,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export type DivisionId = 'kurikulum' | 'kesiswaan' | 'konseling' | 'tu' | 'hubin' | 'sarpras' | 'koperasi';
export type StageId = 'ppdb' | 'kelas-10' | 'kelas-11' | 'kelas-12' | 'alumni';
export type RolePOV = 'all' | 'kepsek' | 'kaprog' | 'walas' | 'tu' | 'hubin' | 'siswa';

interface FeatureLink {
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
  };
  featuresPerStage: Record<StageId, FeatureLink[]>;
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
    name: 'Bidang Kurikulum',
    short: 'KURIKULUM',
    icon: BookOpen,
    position: 'top',
    theme: {
      accent: 'text-sky-400',
      border: 'border-sky-500/40',
      bg: 'bg-sky-500/10',
      glow: 'shadow-sky-500/20',
      badge: 'bg-sky-950/80 text-sky-300 border-sky-800',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'k-1', name: 'Plotting Kuota & Peminatan Jurusan', route: '/kurikulum/plotting', desc: 'Penetapan kuota rombel dan pembagian jurusan.', roles: ['kaprog', 'kepsek'] },
        { id: 'k-2', name: 'KOSP & Master Struktur Kurikulum', route: '/kurikulum/kosp-builder', desc: 'Penyusunan kurikulum operasional dan struktur mata pelajaran.', roles: ['kaprog', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'k-3', name: 'Jadwal KBM & Jam Belajar', route: '/kurikulum/jam-kbm', desc: 'Distribusi jadwal tatap muka harian dan kalender KBM.', roles: ['walas', 'kaprog', 'kepsek'] },
        { id: 'k-4', name: 'Jurnal Harian Guru di Kelas', route: '/attendance/riwayat-ajar', desc: 'Presensi KBM per mapel dan pengisian materi ajar.', roles: ['walas', 'kepsek'] }
      ],
      'kelas-11': [
        { id: 'k-5', name: 'Sinkronisasi Kurikulum Industri', route: '/kurikulum/struktur', desc: 'Penyelarasan kompetensi dasar sekolah dengan DUDI.', roles: ['kaprog', 'hubin'] },
        { id: 'k-6', name: 'Rekapitulasi KBM & Supervisi', route: '/kurikulum/rekap-kbm', desc: 'Monitoring ketercapaian silabus dan supervisi guru.', roles: ['kepsek', 'kaprog'] }
      ],
      'kelas-12': [
        { id: 'k-7', name: 'Platform Ujian CBT Komputer', route: '/cbt/dashboard', desc: 'Ujian formatif/sumatif otomatis aman dari kecurangan.', roles: ['kaprog', 'kepsek'] },
        { id: 'k-8', name: 'Asesmen Uji Kompetensi Keahlian (UKK)', route: '/rapor/input-nilai', desc: 'Penilaian praktik kejuruan penguji internal & asesor industri.', roles: ['kaprog', 'hubin'] },
        { id: 'k-9', name: 'Pencetakan Rapor Akhir Siswa', route: '/rapor/cetak', desc: 'Pengolahan leger nilai dan cetak rapor digital.', roles: ['walas', 'siswa'] }
      ],
      alumni: [
        { id: 'k-10', name: 'Leger Nilai Akhir & Transkrip', route: '/academic/cetak-berkas', desc: 'Arsip nilai komprehensif 6 semester untuk lampiran ijazah.', roles: ['tu', 'kepsek'] }
      ]
    }
  },
  kesiswaan: {
    id: 'kesiswaan',
    name: 'Bidang Kesiswaan',
    short: 'KESISWAAN',
    icon: Users,
    position: 'top',
    theme: {
      accent: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      glow: 'shadow-amber-500/20',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-800',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'ks-1', name: 'Pendataan Calon & Tes Karakter', route: '/kesiswaan/program-ketarunaan', desc: 'Wawancara awal komitmen kedisiplinan dan tata tertib.', roles: ['walas', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'ks-2', name: 'Program MPLS & Ketarunaan', route: '/kesiswaan/program-ketarunaan', desc: 'Orientasi sekolah, latihan baris-berbaris dan karakter awal.', roles: ['walas', 'kepsek'] },
        { id: 'ks-3', name: 'Presensi Gerbang Scanner (Gate)', route: '/attendance/gate', desc: 'Pencatatan jam hadir/terlambat via QR kartu dan wajah.', roles: ['walas', 'tu', 'kepsek'] },
        { id: 'ks-4', name: 'Buku Poin Kedisiplinan & Pelanggaran', route: '/kesiswaan/pelanggaran', desc: 'Sistem akumulasi poin pelanggaran dan reward kebaikan.', roles: ['walas', 'kepsek'] },
        { id: 'ks-5', name: 'Pilihan Ekstrakurikuler Siswa', route: '/kesiswaan/anggota-eskul', desc: 'Pendaftaran dan absensi kegiatan pengembangan bakat.', roles: ['walas'] }
      ],
      'kelas-11': [
        { id: 'ks-6', name: 'Live Monitoring Kehadiran Rombel', route: '/attendance/live-status', desc: 'Board pemantauan presensi harian per kelas real-time.', roles: ['walas', 'kepsek'] },
        { id: 'ks-7', name: 'Portofolio Prestasi & Lomba Siswa', route: '/kesiswaan/prestasi', desc: 'Pencatatan rekor medali dan kejuaraan tingkat kota/nasional.', roles: ['walas', 'siswa'] }
      ],
      'kelas-12': [
        { id: 'ks-8', name: 'Sidang Karakter Kelulusan', route: '/kesiswaan/pelanggaran', desc: 'Verifikasi kelakuan baik dan nol sanksi berat.', roles: ['walas', 'kepsek'] }
      ],
      alumni: [
        { id: 'ks-9', name: 'Portofolio Sertifikat Non-Akademik', route: '/kesiswaan/prestasi', desc: 'Rekap sertifikat pendukung kelulusan siswa.', roles: ['walas', 'siswa'] }
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
      badge: 'bg-rose-950/80 text-rose-300 border-rose-800',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'bk-1', name: 'Asesmen Diagnostik & Gaya Belajar', route: '/bpbk/asesmen', desc: 'Pemetaan psikologis dan gaya belajar siswa baru.', roles: ['walas', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'bk-2', name: 'Bimbingan Adaptasi & Sosiometri', route: '/bpbk/konseling', desc: 'Pendampingan siswa baru agar cepat membaur dan bebas bullying.', roles: ['walas'] }
      ],
      'kelas-11': [
        { id: 'bk-3', name: 'Pencatatan Kasus & Konseling Khusus', route: '/bpbk/cases', desc: 'Penanganan masalah pribadi/keluarga berprinsip konfidensial.', roles: ['walas', 'kepsek'] },
        { id: 'bk-4', name: 'Agenda Kunjungan Rumah (Home Visit)', route: '/bpbk/homevisit', desc: 'Kunjungan guru BK ke orang tua untuk penanganan bersama.', roles: ['walas'] }
      ],
      'kelas-12': [
        { id: 'bk-5', name: 'Bimbingan Karir: Kuliah vs Kerja', route: '/bpbk/dashboard', desc: 'Arahan SNBP/UTBK kampus atau kesiapan memasuki dunia kerja.', roles: ['walas', 'kepsek'] }
      ],
      alumni: [
        { id: 'bk-6', name: 'Layanan Rujukan Karir Lulusan', route: '/bpbk/dashboard', desc: 'Konseling tindak lanjut bagi alumni yang ingin alih bidang karir.', roles: ['hubin'] }
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
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'tu-1', name: 'Verifikasi Berkas & Validasi NISN', route: '/academic/ppdb-mapping', desc: 'Penerimaan digital dokumen KK, akta, dan integrasi Dapodik.', roles: ['tu', 'kepsek'] },
        { id: 'tu-2', name: 'Billing Uang Masuk & DSP Siswa', route: '/billing/invoices', desc: 'Penerbitan kwitansi dan invoice pembayaran registrasi awal.', roles: ['tu', 'siswa', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'tu-3', name: 'Buku Induk Digital & Klapper', route: '/academic/buku-induk', desc: 'Pusat arsip data permanen siswa 360 derajat.', roles: ['tu', 'walas', 'kepsek'] },
        { id: 'tu-4', name: 'Cetak Kartu Pelajar Digital (QR)', route: '/academic/siswa-cards', desc: 'ID Card multifungsi untuk scanner gerbang dan transaksi.', roles: ['tu', 'siswa'] },
        { id: 'tu-5', name: 'Layanan Surat Keterangan Siswa Aktif', route: '/correspondence/surat-keterangan', desc: 'Penerbitan instan surat keterangan dan rekomendasi.', roles: ['tu', 'siswa'] }
      ],
      'kelas-11': [
        { id: 'tu-6', name: 'Surat Pengantar & Tugas PKL Resmi', route: '/correspondence/surat-keluar', desc: 'Pembuatan surat jalan dinas magang dengan kop sekolah sah.', roles: ['tu', 'hubin'] },
        { id: 'tu-7', name: 'Billing SPP & Laporan Arus Kas', route: '/billing/payments', desc: 'Pencatatan kas masuk bulanan dan tagihan otomatis.', roles: ['tu', 'kepsek'] }
      ],
      'kelas-12': [
        { id: 'tu-8', name: 'Verifikasi Bebas Tanggungan Sekolah', route: '/billing', desc: 'Pemeriksaan otomatis lunas SPP dan bebas pinjam aset.', roles: ['tu', 'kepsek'] }
      ],
      alumni: [
        { id: 'tu-9', name: 'Penerbitan Leger & Penyerahan Ijazah', route: '/academic/cetak-berkas', desc: 'Arsip buku agenda kelulusan dan penomoran ijazah nasional.', roles: ['tu', 'kepsek'] }
      ]
    }
  },
  hubin: {
    id: 'hubin',
    name: 'Hubungan Industri & BKK',
    short: 'HUBIN',
    icon: Briefcase,
    position: 'bottom',
    theme: {
      accent: 'text-indigo-400',
      border: 'border-indigo-500/40',
      bg: 'bg-indigo-500/10',
      glow: 'shadow-indigo-500/20',
      badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'hb-1', name: 'Sosialisasi Kemitraan Vokasi', route: '/hubin/mitra', desc: 'Pengenalan jejaring industri ke orang tua calon murid.', roles: ['hubin', 'kepsek'] }
      ],
      'kelas-10': [
        { id: 'hb-2', name: 'Database MoU Perusahaan Mitra DUDI', route: '/hubin/mitra', desc: 'Pengelolaan perjanjian kerjasama dan kuota tempat magang.', roles: ['hubin', 'kaprog', 'kepsek'] }
      ],
      'kelas-11': [
        { id: 'hb-3', name: 'Plotting & Penempatan Siswa PKL', route: '/hubin/penempatan', desc: 'Pemetaan siswa ke perusahaan dan penunjukan guru pamong.', roles: ['hubin', 'kaprog', 'tu'] },
        { id: 'hb-4', name: 'Jurnal Harian Siswa & Presensi GPS', route: '/hubin/monitoring', desc: 'Logbook kegiatan praktik harian dan absen lokasi industri.', roles: ['hubin', 'kaprog', 'siswa'] },
        { id: 'hb-5', name: 'Penilaian Mentor & Sertifikat PKL', route: '/hubin/nilai-pkl', desc: 'Asesmen teknis langsung dari supervisor industri.', roles: ['hubin', 'kaprog'] }
      ],
      'kelas-12': [
        { id: 'hb-6', name: 'Sertifikasi Keahlian Uji Industri', route: '/hubin/nilai-pkl', desc: 'Sinkronisasi standar kompetensi industri untuk UKK.', roles: ['kaprog', 'hubin'] }
      ],
      alumni: [
        { id: 'hb-7', name: 'BKK (Bursa Kerja Khusus) & Loker', route: '/hubin/bkk', desc: 'Portal rekrutmen kerja eksklusif dari industri bagi tamatan.', roles: ['hubin', 'kepsek', 'siswa'] },
        { id: 'hb-8', name: 'Tracer Study Penelusuran Tamatan', route: '/hubin/tracer', desc: 'Pelacakan status bekerja, kuliah, atau wirausaha (BMW).', roles: ['hubin', 'kepsek'] }
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
      badge: 'bg-orange-950/80 text-orange-300 border-orange-800',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'sp-1', name: 'Kesiapan Sarana Ruang Kelas Baru', route: '/sarpras/inventory', desc: 'Pengecekan fasilitas kursi, meja, dan pendingin ruangan.', roles: ['kepsek'] }
      ],
      'kelas-10': [
        { id: 'sp-2', name: 'Peminjaman Buku Pelajaran & Loker', route: '/sarpras/inventory', desc: 'Sirkulasi peminjaman buku paket dan loker siswa.', roles: ['walas'] }
      ],
      'kelas-11': [
        { id: 'sp-3', name: 'Peminjaman Alat Praktik Bengkel/Lab', route: '/sarpras/loans', desc: 'Kontrol sirkulasi toolset mesin dan perangkat simulasi.', roles: ['kaprog'] }
      ],
      'kelas-12': [
        { id: 'sp-4', name: 'Kesiapan Lab Komputer & Server CBT', route: '/sarpras/maintenance', desc: 'Inspeksi perangkat keras dan jaringan jelang ujian.', roles: ['kaprog', 'kepsek'] },
        { id: 'sp-5', name: 'Surat Keterangan Bebas Pinjam Sarpras', route: '/sarpras/loans', desc: 'Pemeriksaan pengembalian seluruh inventaris sekolah.', roles: ['tu'] }
      ],
      alumni: [
        { id: 'sp-6', name: 'Arsip Bebas Tanggungan Aset', route: '/sarpras/loans', desc: 'Status aset nol pinjaman untuk syarat akhir ijazah.', roles: ['tu'] }
      ]
    }
  },
  koperasi: {
    id: 'koperasi',
    name: 'Koperasi & Finansial Siswa',
    short: 'KOPERASI',
    icon: ShoppingCart,
    position: 'bottom',
    theme: {
      accent: 'text-teal-400',
      border: 'border-teal-500/40',
      bg: 'bg-teal-500/10',
      glow: 'shadow-teal-500/20',
      badge: 'bg-teal-950/80 text-teal-300 border-teal-800',
    },
    featuresPerStage: {
      ppdb: [
        { id: 'kp-1', name: 'Paket Seragam & Atribut Sekolah', route: '/cooperative/pos', desc: 'Pengadaan seragam batik, jas, kaos olahraga, dan topi.', roles: ['tu', 'siswa'] }
      ],
      'kelas-10': [
        { id: 'kp-2', name: 'Buku Modul & Alat Tulis Kejuruan', route: '/cooperative/products', desc: 'Kebutuhan perlengkapan harian siswa di toko sekolah.', roles: ['siswa'] }
      ],
      'kelas-11': [
        { id: 'kp-3', name: 'Buku Tabungan Mandiri Siswa', route: '/cooperative/savings', desc: 'Simpanan mandiri untuk biaya persiapan PKL atau tour.', roles: ['walas', 'siswa'] }
      ],
      'kelas-12': [
        { id: 'kp-4', name: 'Perlengkapan Wisuda & Foto Buku Tahunan', route: '/cooperative/pos', desc: 'Paket toga wisuda dan kenang-kenangan sekolah.', roles: ['siswa'] }
      ],
      alumni: [
        { id: 'kp-5', name: 'Penutupan Tabungan & Rekap Akhir', route: '/cooperative/savings', desc: 'Pencairan saldo tabungan siswa saat hari kelulusan.', roles: ['tu', 'siswa'] }
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
  { id: 'hubin', name: 'POV Hubin / BKK' },
  { id: 'siswa', name: 'POV Siswa' },
];

export const EcosystemWorkflowShowcase: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<StageId>('kelas-11');
  const [selectedDivision, setSelectedDivision] = useState<DivisionId | null>(null);
  const [selectedRole, setSelectedRole] = useState<RolePOV>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [featureModal, setFeatureModal] = useState<FeatureLink | null>(null);

  // Active Stage Object
  const currentStage = useMemo(() => {
    return STAGES.find(s => s.id === selectedStage) || STAGES[2];
  }, [selectedStage]);

  // Active Stage Index (0 - 4)
  const stageIndex = useMemo(() => {
    return STAGES.findIndex(s => s.id === selectedStage);
  }, [selectedStage]);

  // Division arrays
  const topDivisions = useMemo(() => [DIVISIONS.kurikulum, DIVISIONS.kesiswaan, DIVISIONS.konseling], []);
  const bottomDivisions = useMemo(() => [DIVISIONS.tu, DIVISIONS.hubin, DIVISIONS.sarpras, DIVISIONS.koperasi], []);

  // Filtered features for selected division in current stage
  const activeDivisionFeatures = useMemo(() => {
    if (!selectedDivision) return [];
    const raw = DIVISIONS[selectedDivision]?.featuresPerStage[selectedStage] || [];
    if (selectedRole === 'all') return raw;
    return raw.filter(f => f.roles.includes(selectedRole));
  }, [selectedDivision, selectedStage, selectedRole]);

  return (
    <div className={`w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'h-screen min-h-[700px]'
    }`}>
      {/* BACKGROUND TECH GRID & GLOW */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* COMPACT EXECUTIVE HEADER (NO NOISE) */}
      <header className="relative z-30 px-6 py-2.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                LIVING TREE ECOSYSTEM
              </span>
              <span className="text-[10px] text-slate-400">• Alur Siswa & Pohon 7 Divisi</span>
            </div>
            <h1 className="text-sm font-extrabold text-white tracking-tight">
              ABSENTA WORKFLOW MAP
            </h1>
          </div>
        </div>

        {/* COMPACT ROLE POV SELECTOR */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">Lensa POV:</span>
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

      {/* MASTER LIVING TREE CANVAS (FITS EXACTLY IN REMAINING VIEWPORT) */}
      <main className="relative z-10 flex-1 flex flex-col justify-between px-6 py-4 overflow-hidden">
        
        {/* ======================================================== */}
        {/* 1. TOP ZONE: DAHAN ATAS (KURIKULUM, KESISWAAN, KONSELING)*/}
        {/* ======================================================== */}
        <section className="w-full flex-1 flex flex-col justify-end pb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-2 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            DAHAN ATAS: KURIKULUM • KESISWAAN • KONSELING
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
            {topDivisions.map(div => {
              const Icon = div.icon;
              const isSelected = selectedDivision === div.id;
              const stageFeatures = div.featuresPerStage[selectedStage] || [];
              const hasRelevantFeatures = selectedRole === 'all'
                ? stageFeatures.length > 0
                : stageFeatures.some(f => f.roles.includes(selectedRole));

              return (
                <div key={div.id} className="relative flex flex-col items-center">
                  {/* Division Node Button */}
                  <button
                    onClick={() => setSelectedDivision(isSelected ? null : div.id)}
                    className={`w-full p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between text-left group shadow-lg ${
                      isSelected
                        ? `bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/40 shadow-xl ${div.theme.glow}`
                        : hasRelevantFeatures
                        ? `bg-slate-900/80 ${div.theme.border} hover:border-slate-600 hover:bg-slate-900`
                        : 'bg-slate-950/60 border-slate-900 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl bg-slate-950 border border-slate-800 ${div.theme.accent} group-hover:scale-110 transition-transform`}>
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

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${div.theme.badge}`}>
                        {stageFeatures.length} Fitur
                      </span>
                    </div>
                  </button>

                  {/* SVG Branch Connector going DOWN to central timeline */}
                  <div className="w-0.5 h-6 bg-gradient-to-b from-slate-700 via-slate-700 to-cyan-500/60 mt-1" />
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. CENTER ZONE: THE MOVING TIMELINE AXIS & AVATAR SISWA */}
        {/* ======================================================== */}
        <section className="relative my-2 py-4 max-w-5xl mx-auto w-full shrink-0">
          {/* Timeline Glowing Rail */}
          <div className="absolute top-1/2 left-6 right-6 h-1 -translate-y-1/2 bg-slate-800/80 rounded-full z-0" />
          <motion.div
            className="absolute top-1/2 left-6 h-1 -translate-y-1/2 bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 rounded-full z-0"
            initial={false}
            animate={{
              width: `${(stageIndex / (STAGES.length - 1)) * 92}%`
            }}
            transition={{ type: 'spring', stiffness: 180, damping: 25 }}
          />

          {/* 5 Milestone Checkpoint Buttons */}
          <div className="relative z-10 flex items-center justify-between">
            {STAGES.map((st, idx) => {
              const isCurrent = st.id === selectedStage;
              const isPassed = idx <= stageIndex;

              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setSelectedStage(st.id);
                  }}
                  className="flex flex-col items-center group focus:outline-none transition-transform"
                >
                  {/* Point Ball */}
                  <div className="relative mb-1 flex items-center justify-center">
                    {isCurrent && (
                      <motion.div
                        layoutId="activePing"
                        className="absolute w-10 h-10 rounded-full bg-cyan-400/20 blur-md animate-ping"
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

                    {/* HERO MOVING OBJECT: SISWA AVATAR ON TOP OF CURRENT POINT */}
                    {isCurrent && (
                      <motion.div
                        layoutId="heroStudentAvatar"
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
        {/* 3. BOTTOM ZONE: DAHAN BAWAH (TU, HUBIN, SARPRAS, KOPERASI)*/}
        {/* ======================================================== */}
        <section className="w-full flex-1 flex flex-col justify-start pt-2">
          <div className="grid grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
            {bottomDivisions.map(div => {
              const Icon = div.icon;
              const isSelected = selectedDivision === div.id;
              const stageFeatures = div.featuresPerStage[selectedStage] || [];
              const hasRelevantFeatures = selectedRole === 'all'
                ? stageFeatures.length > 0
                : stageFeatures.some(f => f.roles.includes(selectedRole));

              return (
                <div key={div.id} className="relative flex flex-col items-center">
                  {/* SVG Branch Connector going UP to central timeline */}
                  <div className="w-0.5 h-6 bg-gradient-to-t from-slate-700 via-slate-700 to-cyan-500/60 mb-1" />

                  {/* Division Node Button */}
                  <button
                    onClick={() => setSelectedDivision(isSelected ? null : div.id)}
                    className={`w-full p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between text-left group shadow-lg ${
                      isSelected
                        ? `bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/40 shadow-xl ${div.theme.glow}`
                        : hasRelevantFeatures
                        ? `bg-slate-900/80 ${div.theme.border} hover:border-slate-600 hover:bg-slate-900`
                        : 'bg-slate-950/60 border-slate-900 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-xl bg-slate-950 border border-slate-800 ${div.theme.accent} group-hover:scale-110 transition-transform`}>
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
                      {stageFeatures.length}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mt-2 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            DAHAN BAWAH: TATA USAHA • HUBIN • SARPRAS • KOPERASI
          </div>
        </section>

      </main>

      {/* ======================================================== */}
      {/* 4. EXPANDABLE ZOOM-IN SLIDE DRAWER (FITUR RIIL & LINK)   */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedDivision && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-12 right-0 bottom-0 w-full sm:w-[420px] bg-slate-900/95 border-l border-slate-800 backdrop-blur-xl shadow-2xl z-40 flex flex-col p-5"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-slate-950 border border-slate-800 ${DIVISIONS[selectedDivision].theme.accent}`}>
                  {React.createElement(DIVISIONS[selectedDivision].icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${DIVISIONS[selectedDivision].theme.accent}`}>
                      {DIVISIONS[selectedDivision].short}
                    </span>
                    <span className="text-[10px] text-slate-400">• {currentStage.label}</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white">
                    {DIVISIONS[selectedDivision].name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedDivision(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stage Context Note */}
            <div className="my-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                Mengawal Siswa di Fase:
              </span>
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                {currentStage.avatarIcon} {currentStage.label} ({currentStage.sub})
              </span>
            </div>

            {/* List of Real Clickable Features */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                DAFTAR FITUR & MODUL PLATFORM:
              </span>

              {activeDivisionFeatures.map(feat => (
                <div
                  key={feat.id}
                  className="group p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-950 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {feat.name}
                    </h4>
                    <Link
                      to={feat.route}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 transition-all flex items-center gap-1 shrink-0"
                    >
                      Buka <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[200px]">{feat.route}</span>
                    <span className="text-slate-400 uppercase font-semibold">
                      {feat.roles.join(', ')}
                    </span>
                  </div>
                </div>
              ))}

              {activeDivisionFeatures.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-xs">Tidak ada modul divisi ini di fase {currentStage.label} untuk role yang dipilih.</p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Klik 'Buka' untuk membuka halaman sistem langsung</span>
              <button
                onClick={() => setSelectedDivision(null)}
                className="text-cyan-400 font-bold hover:underline"
              >
                Tutup Panel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MINIMAL FOOTER STATUS */}
      <footer className="relative z-20 px-6 py-2 bg-slate-950/80 border-t border-slate-900 text-slate-400 text-[11px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Klik salah satu checkpoint fase atau dahan divisi untuk mengeksplor modul.</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          ABSENTA LIVING ECOSYSTEM CANVAS • SINGLE SOURCE OF TRUTH
        </div>
      </footer>
    </div>
  );
};

export default EcosystemWorkflowShowcase;
