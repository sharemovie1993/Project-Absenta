import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Briefcase,
  BookOpen,
  Users,
  Building2,
  ShoppingCart,
  HeartHandshake,
  FileText,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Layers,
  Search,
  Filter,
  Eye,
  Workflow,
  Compass,
  Laptop,
  Maximize2,
  Minimize2,
  Award,
  Clock,
  Coins,
  ChevronLeft,
  Network
} from 'lucide-react';
import { EcosystemTopologyGraph } from './EcosystemTopologyGraph';

// --- DATA TYPES ---
export type DivisionType = 'tu' | 'kurikulum' | 'kesiswaan' | 'hubin' | 'konseling' | 'sarpras' | 'koperasi';
export type StageId = 'ppdb' | 'kelas-10' | 'kelas-11' | 'kelas-12' | 'alumni';
export type RolePOV = 'all' | 'kepsek' | 'kaprog' | 'walas' | 'tu' | 'hubin' | 'siswa';

interface FeatureItem {
  id: string;
  name: string;
  description: string;
  route: string;
  isAvailable: boolean;
  division: DivisionType;
  roles: RolePOV[];
  impact: string;
}

interface DivisionDetail {
  id: DivisionType;
  name: string;
  shortName: string;
  icon: any;
  color: string;
  borderGlow: string;
  bgGlow: string;
  position: 'top' | 'bottom';
  description: string;
}

interface StageDetail {
  id: StageId;
  title: string;
  subTitle: string;
  level: string;
  studentTitle: string;
  studentIcon: string;
  badge: string;
  summary: string;
}

// --- MASTER DATA DEFINITIONS ---

const DIVISIONS: Record<DivisionType, DivisionDetail> = {
  kurikulum: {
    id: 'kurikulum',
    name: 'Bidang Kurikulum & Pembelajaran',
    shortName: 'KURIKULUM',
    icon: BookOpen,
    color: 'text-sky-400',
    borderGlow: 'border-sky-500/40 hover:border-sky-400',
    bgGlow: 'from-sky-500/10 to-transparent',
    position: 'top',
    description: 'Mengatur alur pembelajaran, jadwal KBM, capaian kompetensi, ujian berbasis komputer (CBT), hingga pengolahan nilai rapor.',
  },
  kesiswaan: {
    id: 'kesiswaan',
    name: 'Bidang Kesiswaan & Karakter',
    shortName: 'KESISWAAN',
    icon: Users,
    color: 'text-amber-400',
    borderGlow: 'border-amber-500/40 hover:border-amber-400',
    bgGlow: 'from-amber-500/10 to-transparent',
    position: 'top',
    description: 'Mengawal kedisiplinan siswa (sistem poin reward & pelanggaran), MPLS, kegiatan ekstrakurikuler, dan rekam jejak prestasi.',
  },
  konseling: {
    id: 'konseling',
    name: 'Bimbingan Konseling (BP/BK)',
    shortName: 'KONSELING',
    icon: HeartHandshake,
    color: 'text-rose-400',
    borderGlow: 'border-rose-500/40 hover:border-rose-400',
    bgGlow: 'from-rose-500/10 to-transparent',
    position: 'top',
    description: 'Mendampingi psikososial siswa, asesmen minat bakat, sesi konseling privat/kelompok, home visit, hingga arahan studi lanjut.',
  },
  tu: {
    id: 'tu',
    name: 'Tata Usaha & Keuangan',
    shortName: 'TATA USAHA',
    icon: FileText,
    color: 'text-emerald-400',
    borderGlow: 'border-emerald-500/40 hover:border-emerald-400',
    bgGlow: 'from-emerald-500/10 to-transparent',
    position: 'bottom',
    description: 'Pusat arsip buku induk siswa, administrasi persuratan resmi berbasis template otomatis, dan pengelolaan billing SPP/DSP terintegrasi.',
  },
  hubin: {
    id: 'hubin',
    name: 'Hubungan Industri & BKK',
    shortName: 'HUBIN',
    icon: Briefcase,
    color: 'text-indigo-400',
    borderGlow: 'border-indigo-500/40 hover:border-indigo-400',
    bgGlow: 'from-indigo-500/10 to-transparent',
    position: 'bottom',
    description: 'Jembatan ke dunia industri: kemitraan DUDI, penempatan PKL/magang, monitoring jurnal lapangan, hingga bursa kerja & tracer study.',
  },
  sarpras: {
    id: 'sarpras',
    name: 'Sarana & Prasarana',
    shortName: 'SARPRAS',
    icon: Building2,
    color: 'text-orange-400',
    borderGlow: 'border-orange-500/40 hover:border-orange-400',
    bgGlow: 'from-orange-500/10 to-transparent',
    position: 'bottom',
    description: 'Inventarisasi aset sekolah, alat praktik kejuruan, peminjaman lab/ruangan, serta sistem bebas tanggungan sarpras sebelum lulus.',
  },
  koperasi: {
    id: 'koperasi',
    name: 'Koperasi & Finansial Siswa',
    shortName: 'KOPERASI',
    icon: ShoppingCart,
    color: 'text-teal-400',
    borderGlow: 'border-teal-500/40 hover:border-teal-400',
    bgGlow: 'from-teal-500/10 to-transparent',
    position: 'bottom',
    description: 'Pengadaan atribut seragam, buku panduan, simpan pinjam / tabungan siswa, dan transaksi terintegrasi.',
  },
};

const STAGES: StageDetail[] = [
  {
    id: 'ppdb',
    title: '1. PPDB & Registrasi Awal',
    subTitle: 'Gerbang Masuk Siswa Baru',
    level: 'Fase Pra-Masuk',
    studentTitle: 'Calon Peserta Didik',
    studentIcon: '🎒',
    badge: 'Onboarding & Induction',
    summary: 'Pendaftaran online, verifikasi berkas oleh TU, asesmen minat awal BK, dan paket kelengkapan siswa oleh Koperasi.'
  },
  {
    id: 'kelas-10',
    title: '2. Tingkat X (Pondasi & Karakter)',
    subTitle: 'Pengenalan & Adaptasi Budaya Sekolah',
    level: 'Fase E (Kelas 10)',
    studentTitle: 'Siswa Tingkat X',
    studentIcon: '👦',
    badge: 'Orientasi & Karakter',
    summary: 'MPLS kesiswaan, pembagian rombel kurikulum, kartu pelajar TU, buku paket sarpras, dan pemetaan potensi oleh konseling.'
  },
  {
    id: 'kelas-11',
    title: '3. Tingkat XI (Kejuruan & Vokasi)',
    subTitle: 'Pendalaman Kompetensi & Praktik Industri',
    level: 'Fase F (Kelas 11)',
    studentTitle: 'Siswa Magang / PKL',
    studentIcon: '🛠️',
    badge: 'Praktik Industri (DUDI)',
    summary: 'Puncak peran HUBIN: Kemitraan DUDI, penempatan PKL, monitoring jurnal harian, dan peminjaman alat praktik lab sarpras.'
  },
  {
    id: 'kelas-12',
    title: '4. Tingkat XII (Ujian & Sertifikasi)',
    subTitle: 'Puncak Akademik, CBT & Uji Kompetensi',
    level: 'Fase F Akhir (Kelas 12)',
    studentTitle: 'Kandidat Kelulusan',
    studentIcon: '🎓',
    badge: 'Asesmen & Sertifikasi',
    summary: 'Ujian CBT Kurikulum, Asesmen UKK Vokasi, Bimbingan Karir/Kuliah Konseling, serta verifikasi bebas tanggungan TU/Sarpras.'
  },
  {
    id: 'alumni',
    title: '5. Kelulusan & Alumni (Karir)',
    subTitle: 'Transisi Menuju Dunia Kerja & Kampus',
    level: 'Paska Kelulusan',
    studentTitle: 'Alumni Terlacak',
    studentIcon: '💼',
    badge: 'Tracer Study & BKK',
    summary: 'Penerbitan Ijazah & Transkrip TU, Bursa Kerja Khusus (BKK Hubin), Rekomendasi SNBP/UTBK BK, dan jaringan alumni aktif.'
  }
];

// Mapping Features per Stage & Division
const STAGE_FEATURES: Record<StageId, FeatureItem[]> = {
  ppdb: [
    {
      id: 'tu-ppdb-reg',
      name: 'Pendaftaran & Verifikasi Berkas TU',
      description: 'Penerimaan data calon siswa, verifikasi dokumen KK/Ijazah, dan sinkronisasi NISN.',
      route: '/correspondence/dashboard',
      isAvailable: true,
      division: 'tu',
      roles: ['tu', 'kepsek'],
      impact: 'Eliminasi berkas fisik hingga 100% dan registrasi otomatis ke Buku Induk.'
    },
    {
      id: 'tu-billing-adm',
      name: 'Pembayaran Registrasi & DSP',
      description: 'Tagihan biaya masuk, seragam, dan uang pangkal dengan kwitansi digital otomatis.',
      route: '/billing',
      isAvailable: true,
      division: 'tu',
      roles: ['tu', 'siswa', 'kepsek'],
      impact: 'Arus kas masuk tercatat rapi tanpa resiko uang hilang di meja loket.'
    },
    {
      id: 'kop-seragam',
      name: 'Paket Atribut & Seragam Siswa',
      description: 'Manajemen distribusi seragam, kaos olahraga, dan merchandise sekolah.',
      route: '/cooperative/dashboard',
      isAvailable: true,
      division: 'koperasi',
      roles: ['tu', 'siswa'],
      impact: 'Stok atribut terdata real-time, siswa baru langsung siap pakai seragam.'
    },
    {
      id: 'bk-diagnostik',
      name: 'Asesmen Diagnostik & Gaya Belajar',
      description: 'Survei psikologis awal untuk memetakan minat, bakat, dan gaya belajar calon siswa.',
      route: '/bpbk/asesmen',
      isAvailable: true,
      division: 'konseling',
      roles: ['walas', 'kepsek'],
      impact: 'Guru langsung tahu pendekatan belajar terbaik sebelum KBM dimulai.'
    },
    {
      id: 'kuri-rombel',
      name: 'Plotting Kuota & Peminatan Jurusan',
      description: 'Penetapan kuota rombel dan pembagian jurusan sesuai hasil seleksi.',
      route: '/kurikulum/plotting',
      isAvailable: true,
      division: 'kurikulum',
      roles: ['kaprog', 'kepsek'],
      impact: 'Keseimbangan jumlah siswa per kelas terjaga sesuai aturan dinas.'
    }
  ],
  'kelas-10': [
    {
      id: 'kesis-mpls',
      name: 'Program MPLS & Ketarunaan',
      description: 'Monitoring kehadiran Masa Pengenalan Lingkungan Sekolah dan penanaman disiplin awal.',
      route: '/kesiswaan/program-ketarunaan',
      isAvailable: true,
      division: 'kesiswaan',
      roles: ['walas', 'kepsek'],
      impact: 'Karakter dan ketahanan mental siswa terbentuk sejak minggu pertama.'
    },
    {
      id: 'tu-kartu-pelajar',
      name: 'Buku Induk & Kartu Pelajar Digital',
      description: 'Penerbitan ID Card siswa ber-QR Code untuk absensi gerbang otomatis dan kartu perpustakaan.',
      route: '/correspondence/surat-keterangan',
      isAvailable: true,
      division: 'tu',
      roles: ['tu', 'walas', 'siswa'],
      impact: 'Identitas siswa langsung terintegrasi ke seluruh ekosistem scanner sekolah.'
    },
    {
      id: 'kuri-jadwal',
      name: 'Distribusi Jadwal KBM & Presensi Kelas',
      description: 'Jadwal tatap muka harian, jurnal mengajar guru, dan absensi per mata pelajaran.',
      route: '/kurikulum/jam-kbm',
      isAvailable: true,
      division: 'kurikulum',
      roles: ['walas', 'kaprog', 'kepsek'],
      impact: 'Kepsek dan Kaprog bisa memantau guru yang masuk kelas secara live.'
    },
    {
      id: 'kesis-poin',
      name: 'Pencatatan Poin Kedisiplinan & Pelanggaran',
      description: 'Sistem akumulasi poin pelanggaran dan poin prestasi sesuai tata tertib sekolah.',
      route: '/kesiswaan/pelanggaran',
      isAvailable: true,
      division: 'kesiswaan',
      roles: ['walas', 'kepsek'],
      impact: 'Transparansi sanksi dan penghargaan, orang tua langsung terinfo via notifikasi.'
    },
    {
      id: 'sar-buku',
      name: 'Peminjaman Buku Paket & Loker Kelas',
      description: 'Pencatatan sirkulasi buku teks pelajaran per rombel dan inventaris kelas.',
      route: '/sarpras/inventory',
      isAvailable: true,
      division: 'sarpras',
      roles: ['walas'],
      impact: 'Aset buku tidak tercecer dan terpantau riwayat peminjamannya.'
    },
    {
      id: 'bk-adaptasi',
      name: 'Bimbingan Adaptasi & Sosiometri',
      description: 'Konseling individual bagi siswa yang mengalami kesulitan adaptasi di kelas baru.',
      route: '/bpbk/konseling',
      isAvailable: true,
      division: 'konseling',
      roles: ['walas'],
      impact: 'Mencegah potensi bullying dan putus sekolah di awal masa studi.'
    }
  ],
  'kelas-11': [
    {
      id: 'hubin-mitra',
      name: 'Database Kemitraan DUDI / Industri',
      description: 'Pengelolaan MoU industri mitra, kuota magang, dan profil perusahaan tempat PKL.',
      route: '/hubin/mitra',
      isAvailable: true,
      division: 'hubin',
      roles: ['hubin', 'kaprog', 'kepsek'],
      impact: 'Sekolah memiliki jejaring industri resmi berbadan hukum yang berkelanjutan.'
    },
    {
      id: 'hubin-penempatan',
      name: 'Plotting & Surat Tugas Penempatan PKL',
      description: 'Pemetaan siswa ke lokasi DUDI, penunjukan guru pembimbing, dan surat tugas resmi.',
      route: '/hubin/penempatan',
      isAvailable: true,
      division: 'hubin',
      roles: ['hubin', 'kaprog', 'tu'],
      impact: 'Ratusan siswa terplotting ke pabrik/kantor mitra secara otomatis tanpa tumpang tindih.'
    },
    {
      id: 'hubin-jurnal',
      name: 'Jurnal Harian PKL & Presensi Lapangan',
      description: 'Siswa mengisi kegiatan harian dan absen GPS dari lokasi industri via aplikasi.',
      route: '/hubin/monitoring',
      isAvailable: true,
      division: 'hubin',
      roles: ['hubin', 'kaprog', 'siswa'],
      impact: 'Guru pembimbing memonitor anak didiknya meski terpisah ratusan kilometer.'
    },
    {
      id: 'sar-alat-lab',
      name: 'Peminjaman Toolset & Bengkel Vokasi',
      description: 'Peminjaman alat uji, simulator, dan mesin praktik untuk persiapan pra-magang.',
      route: '/sarpras/loans',
      isAvailable: true,
      division: 'sarpras',
      roles: ['kaprog'],
      impact: 'Peralatan mahal terlindungi dengan riwayat serah terima yang ketat.'
    },
    {
      id: 'bk-kasus',
      name: 'Home Visit & Penanganan Kasus Khusus',
      description: 'Tindakan kunjungan rumah bagi siswa dengan kendala kehadiran atau masalah keluarga.',
      route: '/bpbk/homevisit',
      isAvailable: true,
      division: 'konseling',
      roles: ['walas'],
      impact: 'Hubungan emosional sekolah dengan orang tua tetap terjaga erat.'
    },
    {
      id: 'kop-tabungan',
      name: 'Tabungan Siswa & Persiapan Biaya PKL',
      description: 'Fasilitas tabungan mandiri siswa untuk biaya akomodasi atau sertifikasi magang.',
      route: '/cooperative/savings',
      isAvailable: true,
      division: 'koperasi',
      roles: ['siswa'],
      impact: 'Mendidik literasi keuangan siswa dan meringankan beban finansial orang tua.'
    }
  ],
  'kelas-12': [
    {
      id: 'kuri-cbt',
      name: 'Pelaksanaan Ujian CBT & Tryout Mandiri',
      description: 'Platform Computer Based Test yang aman, anti-curang, dengan koreksi otomatis.',
      route: '/cbt/dashboard',
      isAvailable: true,
      division: 'kurikulum',
      roles: ['kaprog', 'kepsek'],
      impact: 'Hemat biaya kertas ujian hingga puluhan juta rupiah tiap semester.'
    },
    {
      id: 'kuri-ukk',
      name: 'Asesmen Uji Kompetensi Keahlian (UKK)',
      description: 'Rubrik penilaian penguji internal dan asesor eksternal DUDI untuk sertifikasi kejuruan.',
      route: '/kurikulum/rekap-kbm',
      isAvailable: true,
      division: 'kurikulum',
      roles: ['kaprog', 'hubin'],
      impact: 'Nilai kompetensi kejuruan terekam presisi sesuai standar sertifikasi BNSP.'
    },
    {
      id: 'tu-bebas-adm',
      name: 'Verifikasi Bebas Tanggungan & Billing Lunas',
      description: 'Cek otomatis kelunasan SPP, bebas pinjam buku perpus, dan bebas tanggungan alat bengkel.',
      route: '/billing',
      isAvailable: true,
      division: 'tu',
      roles: ['tu', 'kepsek'],
      impact: 'Syarat kelulusan terverifikasi digital tanpa siswa harus bawa kertas paraf mutar sekolah.'
    },
    {
      id: 'bk-karir',
      name: 'Bimbingan Karir: Kuliah vs Kerja',
      description: 'Konseling peminatan studi lanjut (SNBP, UTBK) atau persiapan wawancara kerja.',
      route: '/bpbk/konseling',
      isAvailable: true,
      division: 'konseling',
      roles: ['walas', 'kepsek'],
      impact: 'Siswa kelas 12 memiliki arah masa depan yang jelas sebelum hari wisuda.'
    },
    {
      id: 'sar-lab-cbt',
      name: 'Kesiapan Lab Komputer & Server Ujian',
      description: 'Inspeksi kesiapan workstation, jaringan LAN, dan kelayakan ruang ujian nasional.',
      route: '/sarpras/maintenance',
      isAvailable: true,
      division: 'sarpras',
      roles: ['kaprog'],
      impact: 'Nol kendala teknis perangkat keras saat momentum ujian penting berlangsung.'
    }
  ],
  alumni: [
    {
      id: 'tu-leger-ijazah',
      name: 'Penerbitan Leger Nilai & Transkrip SKL',
      description: 'Otomatisasi cetak Surat Keterangan Lulus (SKL), transkrip nilai terstandar, dan legalisir.',
      route: '/correspondence/buku-agenda',
      isAvailable: true,
      division: 'tu',
      roles: ['tu', 'kepsek'],
      impact: 'Dokumen kelulusan terbit cepat dan terarsip abadi dalam cloud Absenta.'
    },
    {
      id: 'hubin-bkk',
      name: 'Bursa Kerja Khusus (BKK) & Info Loker',
      description: 'Portal lowongan kerja dari mitra DUDI eksklusif untuk alumni sekolah.',
      route: '/hubin/mitra',
      isAvailable: true,
      division: 'hubin',
      roles: ['hubin', 'kepsek', 'siswa'],
      impact: 'Meningkatkan persentase serapan lulusan SMK langsung kerja ke industri.'
    },
    {
      id: 'hubin-tracer',
      name: 'Tracer Study & Penelusuran Tamatan',
      description: 'Pelacakan status alumni (Bekerja, Melanjutkan Kuliah, atau Wirausaha - BMW) untuk akreditasi.',
      route: '/hubin/monitoring',
      isAvailable: true,
      division: 'hubin',
      roles: ['hubin', 'kepsek'],
      impact: 'Data akreditasi sekolah terisi otomatis tanpa repot mencari kontak alumni.'
    },
    {
      id: 'bk-alumni-portal',
      name: 'Konseling Karir Lanjutan & Rujukan Mitra',
      description: 'Layanan bimbingan bagi lulusan yang ingin berganti karir atau membutuhkan rekomendasi kerja.',
      route: '/bpbk/dashboard',
      isAvailable: true,
      division: 'konseling',
      roles: ['hubin'],
      impact: 'Membuktikan kepedulian sekolah seumur hidup bagi para alumninya.'
    }
  ]
};

// ROLE POV DEFINITIONS
const ROLE_POVS: { id: RolePOV; name: string; icon: any; desc: string; color: string }[] = [
  { id: 'all', name: 'Semua Divisi (Ekosistem Penuh)', icon: Layers, desc: 'Tampilan holistik seluruh pohon fitur dan sinergi 7 divisi sekolah.', color: 'from-blue-600 to-indigo-600' },
  { id: 'kepsek', name: 'POV Kepala Sekolah & Manajemen', icon: Eye, desc: 'Fokus pada monitoring makro, kepatuhan KBM, serapan alumni, dan kesehatan kas.', color: 'from-amber-600 to-orange-600' },
  { id: 'kaprog', name: 'POV Kaprog / Kepala Kejuruan', icon: Compass, desc: 'Fokus pada kesiapan lab bengkel, kurikulum vokasi, penempatan PKL, dan asesmen UKK.', color: 'from-purple-600 to-violet-600' },
  { id: 'walas', name: 'POV Wali Kelas & Guru', icon: UserCheck, desc: 'Fokus pada absensi rombel, catatan kedisiplinan, sirkulasi rapor, dan home visit siswa.', color: 'from-emerald-600 to-teal-600' },
  { id: 'tu', name: 'POV Tata Usaha & Finansial', icon: FileText, desc: 'Fokus pada buku induk siswa, surat-menyurat resmi, dan administrasi tagihan SPP.', color: 'from-cyan-600 to-blue-600' },
  { id: 'hubin', name: 'POV Koordinator Hubin (DUDI)', icon: Briefcase, desc: 'Fokus pada kemitraan industri, surat izin magang, monitoring PKL, dan bursa kerja BKK.', color: 'from-rose-600 to-pink-600' },
  { id: 'siswa', name: 'POV Siswa & Orang Tua', icon: Sparkles, desc: 'Fokus pada transparansi kehadiran, catatan nilai, jurnal PKL, dan tabungan koperasi.', color: 'from-green-600 to-emerald-600' },
];

export const EcosystemWorkflowShowcase: React.FC = () => {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<'workflow' | 'topology'>('workflow');
  const [selectedStage, setSelectedStage] = useState<StageId>('kelas-11');
  const [selectedDivision, setSelectedDivision] = useState<DivisionType | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<RolePOV>('all');
  const [activeFeatureModal, setActiveFeatureModal] = useState<FeatureItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Current stage info
  const currentStageInfo = useMemo(() => {
    return STAGES.find(s => s.id === selectedStage) || STAGES[0];
  }, [selectedStage]);

  // Stage index
  const stageIndex = useMemo(() => {
    return STAGES.findIndex(s => s.id === selectedStage);
  }, [selectedStage]);

  // Filtered features for current stage
  const currentFeatures = useMemo(() => {
    let list = STAGE_FEATURES[selectedStage] || [];

    if (selectedDivision !== 'all') {
      list = list.filter(f => f.division === selectedDivision);
    }

    if (selectedRole !== 'all') {
      list = list.filter(f => f.roles.includes(selectedRole));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.impact.toLowerCase().includes(q));
    }

    return list;
  }, [selectedStage, selectedDivision, selectedRole, searchQuery]);

  // Top divisions vs Bottom divisions
  const topDivisions = Object.values(DIVISIONS).filter(d => d.position === 'top');
  const bottomDivisions = Object.values(DIVISIONS).filter(d => d.position === 'bottom');

  const handleNextStage = () => {
    const nextIdx = (stageIndex + 1) % STAGES.length;
    setSelectedStage(STAGES[nextIdx].id);
  };

  const handlePrevStage = () => {
    const prevIdx = (stageIndex - 1 + STAGES.length) % STAGES.length;
    setSelectedStage(STAGES[prevIdx].id);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : ''}`}>
      {/* Background Tech Glow & Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-[32rem] h-[32rem] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      </div>

      {/* HEADER / NAVIGATION BAR */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
              <Workflow className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Living Ecosystem Map
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">• Executive Pitching Suite</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                ABSENTA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">WORKFLOW MATRIX</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setMainTab('workflow')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mainTab === 'workflow'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Workflow Siswa</span>
              </button>
              <button
                onClick={() => setMainTab('topology')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mainTab === 'topology'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Topologi Rute & Alur Data</span>
              </button>
            </div>

            <Link
              to="/dashboard"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Ke Dashboard
            </Link>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* SUB-HEADER / ROLE POV SWITCHER */}
      <div className="relative z-10 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>SUDUT PANDANG (ROLE POV):</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
            {ROLE_POVS.map(rp => {
              const Icon = rp.icon;
              const isActive = selectedRole === rp.id;
              return (
                <button
                  key={rp.id}
                  onClick={() => setSelectedRole(rp.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isActive
                      ? `bg-gradient-to-r ${rp.color} text-white border-white/20 shadow-lg scale-105`
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{rp.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        
        {/* CONDITIONAL CONTENT: TOPOLOGY VS WORKFLOW */}
        {mainTab === 'topology' ? (
          <EcosystemTopologyGraph initialRole={selectedRole} />
        ) : (
          <>
            {/* EXECUTIVE INTRO BANNER */}
            <div className="relative rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Arsitektur Ekosistem Siswa 360 Derajat
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Bagaimana Absenta Mengawal Siswa <span className="text-cyan-400">Dari PPDB Hingga Lulus</span>
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Tujuh divisi sekolah bergerak serempak dalam satu data terpadu (*single source of truth*). Setiap perpindahan fase siswa memicu alur kerja otomatis antar-divisi tanpa birokrasi manual.
                  </p>
                </div>

                {/* QUICK STATS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <div className="text-xl font-black text-cyan-400">7</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Divisi Terpadu</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                    <div className="text-xl font-black text-emerald-400">5</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Fase Milestone</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <div className="text-xl font-black text-amber-400">50+</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Fitur Terhubung</div>
                  </div>
                </div>
              </div>
            </div>

        {/* ======================================================== */}
        {/* POHON MODUL ATAS (KURIKULUM, KESISWAAN, KONSELING)       */}
        {/* ======================================================== */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              Dahan Atas: Pengawalan Akademik, Karakter & Psikososial
            </h3>
            <span className="text-xs text-slate-500">Klik divisi untuk memfilter</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topDivisions.map(div => {
              const Icon = div.icon;
              const isSelected = selectedDivision === div.id;
              const activeCount = (STAGE_FEATURES[selectedStage] || []).filter(f => f.division === div.id).length;

              return (
                <div
                  key={div.id}
                  onClick={() => setSelectedDivision(selectedDivision === div.id ? 'all' : div.id)}
                  className={`group cursor-pointer relative rounded-xl p-4 bg-gradient-to-b ${div.bgGlow} bg-slate-900/60 border transition-all duration-300 shadow-md ${
                    isSelected
                      ? `ring-2 ring-cyan-400 border-cyan-400 bg-slate-900/90 scale-[1.02]`
                      : `${div.borderGlow} hover:bg-slate-900/80`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-slate-800/80 ${div.color} ring-1 ring-white/10 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`text-[11px] font-bold tracking-wider uppercase ${div.color}`}>
                          {div.shortName}
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {div.name}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {activeCount} Modul
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {div.description}
                  </p>

                  {/* Connector Line downwards to timeline */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-gradient-to-b from-slate-700 to-cyan-500/50 hidden md:block" />
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* CENTRAL SPINE: THE STUDENT LIFECYCLE TIMELINE            */}
        {/* ======================================================== */}
        <section className="relative my-4 py-8 px-4 sm:px-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Glowing Central Line */}
          <div className="absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 bg-slate-800 rounded-full z-0" />
          <motion.div
            className="absolute top-1/2 left-8 h-1 -translate-y-1/2 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full z-0"
            initial={false}
            animate={{
              width: `${(stageIndex / (STAGES.length - 1)) * 90}%`
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />

          {/* STAGE MILESTONE NODES */}
          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto pb-4">
            {STAGES.map((st, idx) => {
              const isCurrent = st.id === selectedStage;
              const isPassed = idx <= stageIndex;

              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStage(st.id)}
                  className="flex-1 min-w-[130px] sm:min-w-[160px] flex flex-col items-center group text-center focus:outline-none"
                >
                  {/* Point Indicator */}
                  <div className="relative mb-3 flex items-center justify-center">
                    {isCurrent && (
                      <motion.div
                        layoutId="activeGlow"
                        className="absolute w-12 h-12 rounded-full bg-cyan-500/30 blur-md animate-ping"
                      />
                    )}

                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ring-4 ${
                        isCurrent
                          ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white ring-cyan-500/40 shadow-xl shadow-cyan-500/50 scale-125'
                          : isPassed
                          ? 'bg-slate-800 text-cyan-400 ring-slate-800 group-hover:scale-110'
                          : 'bg-slate-900 text-slate-500 ring-slate-900 group-hover:bg-slate-800'
                      }`}
                    >
                      {isPassed && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    {/* HERO OBJECT: MOVING STUDENT AVATAR ON CURRENT STAGE */}
                    {isCurrent && (
                      <motion.div
                        layoutId="studentAvatar"
                        className="absolute -top-10 flex flex-col items-center"
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      >
                        <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-[11px] shadow-lg flex items-center gap-1">
                          <span>{st.studentIcon}</span>
                          <span>{st.studentTitle}</span>
                        </div>
                        <div className="w-2 h-2 bg-blue-500 rotate-45 -mt-1" />
                      </motion.div>
                    )}
                  </div>

                  {/* Stage Texts */}
                  <div className="mt-2 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-cyan-300">
                      {st.level}
                    </span>
                    <h5
                      className={`text-xs sm:text-sm font-extrabold transition-colors leading-tight ${
                        isCurrent ? 'text-cyan-300' : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {st.title.split('. ')[1] || st.title}
                    </h5>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE STAGE HIGHLIGHT BAR */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentStageInfo.studentIcon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-white">
                    {currentStageInfo.title}
                  </h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                    {currentStageInfo.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentStageInfo.summary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrevStage}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Etape Sebelumnya
              </button>
              <button
                onClick={handleNextStage}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shadow-md shadow-cyan-500/20"
              >
                Etape Berikutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* POHON MODUL BAWAH (TU, HUBIN, SARPRAS, KOPERASI)         */}
        {/* ======================================================== */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Dahan Bawah: Tata Kelola Operasional, Fasilitas & Hubungan Industri
            </h3>
            <span className="text-xs text-slate-500">Klik divisi untuk memfilter</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bottomDivisions.map(div => {
              const Icon = div.icon;
              const isSelected = selectedDivision === div.id;
              const activeCount = (STAGE_FEATURES[selectedStage] || []).filter(f => f.division === div.id).length;

              return (
                <div
                  key={div.id}
                  onClick={() => setSelectedDivision(selectedDivision === div.id ? 'all' : div.id)}
                  className={`group cursor-pointer relative rounded-xl p-4 bg-gradient-to-t ${div.bgGlow} bg-slate-900/60 border transition-all duration-300 shadow-md ${
                    isSelected
                      ? `ring-2 ring-emerald-400 border-emerald-400 bg-slate-900/90 scale-[1.02]`
                      : `${div.borderGlow} hover:bg-slate-900/80`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg bg-slate-800/80 ${div.color} ring-1 ring-white/10 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold tracking-wider uppercase ${div.color}`}>
                          {div.shortName}
                        </span>
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {div.name}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {activeCount}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {div.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================================================== */}
        {/* EXPLORE / ZOOM-IN FEATURE TREE IN CURRENT STAGE          */}
        {/* ======================================================== */}
        <section className="mt-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Zoom-In Modul & Fitur Terintegrasi
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {currentFeatures.length} Fitur Terpetakan
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                Fitur Absenta Yang Mengawal Siswa di {currentStageInfo.title}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari fitur / dampak..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
                />
              </div>

              {selectedDivision !== 'all' && (
                <button
                  onClick={() => setSelectedDivision('all')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700"
                >
                  Reset Filter Divisi
                </button>
              )}
            </div>
          </div>

          {/* LIST OF FEATURES (GRID) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {currentFeatures.map(feat => {
                const divInfo = DIVISIONS[feat.division];
                const Icon = divInfo.icon;

                return (
                  <motion.div
                    key={feat.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative rounded-xl p-4 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-950 transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-500/5"
                  >
                    <div>
                      {/* Division Badge & Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 ${divInfo.color}`}>
                          <Icon className="w-3 h-3" />
                          {divInfo.shortName}
                        </span>

                        <div className="flex items-center gap-1">
                          {feat.roles.slice(0, 3).map(r => (
                            <span key={r} className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {feat.name}
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                        {feat.description}
                      </p>

                      {/* KILLER PITCH VALUE */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/60">
                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Nilai Solusi Sekolah:
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 italic">
                          "{feat.impact}"
                        </p>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActiveFeatureModal(feat)}
                        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail Pitch
                      </button>

                      <Link
                        to={feat.route}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-1 shadow-sm"
                      >
                        Buka Halaman <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {currentFeatures.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm">Tidak ada modul yang cocok dengan kriteria filter.</p>
              <button
                onClick={() => { setSelectedDivision('all'); setSelectedRole('all'); setSearchQuery(''); }}
                className="mt-2 text-xs font-bold text-cyan-400 underline"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </section>
        </>
      )}

      </main>

      {/* DETAIL PITCH MODAL */}
      <AnimatePresence>
        {activeFeatureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 ${DIVISIONS[activeFeatureModal.division].color}`}>
                    {DIVISIONS[activeFeatureModal.division].name}
                  </span>
                </div>
                <button
                  onClick={() => setActiveFeatureModal(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-slate-800"
                >
                  ✕ Tutup
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <h3 className="text-lg font-extrabold text-white">
                  {activeFeatureModal.name}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeFeatureModal.description}
                </p>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Mengapa Ini Sangat Berharga Bagi Manajemen Sekolah?
                  </span>
                  <p className="text-xs text-slate-200 mt-1">
                    {activeFeatureModal.impact}
                  </p>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Rute Aplikasi: </span>
                  <code className="text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {activeFeatureModal.route}
                  </code>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setActiveFeatureModal(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Kembali ke Peta
                </button>
                <Link
                  to={activeFeatureModal.route}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                >
                  Buka Halaman Langsung <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Absenta Enterprise Ecosystem • Solusi Tata Kelola Digital Sekolah Terpadu.</p>
      </footer>
    </div>
  );
};

export default EcosystemWorkflowShowcase;
