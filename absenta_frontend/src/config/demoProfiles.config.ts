export interface DemoRoleProfile {
  id: string;
  category: 'LEADERSHIP' | 'MANAGEMENT' | 'TEACHING' | 'END_USER';
  roleCode: string;
  title: string;
  simulatedName: string;
  email: string;
  password?: string;
  badge: string;
  badgeColor: string;
  description: string;
  iconName: string;
  gradient: string;
  border: string;
}

export const DEMO_CATEGORIES = [
  { id: 'ALL', label: 'Semua Peran' },
  { id: 'LEADERSHIP', label: '👑 Pimpinan Sekolah' },
  { id: 'MANAGEMENT', label: '💼 Manajemen & Staf' },
  { id: 'TEACHING', label: '👨‍🏫 Guru & Wali Kelas' },
  { id: 'END_USER', label: '🎒 Siswa & Ortu' },
];

export const DEMO_ROLE_PROFILES: DemoRoleProfile[] = [
  // ── 👑 PIMPINAN SEKOLAH ──────────────────────────────────────────
  {
    id: 'demo-kepsek',
    category: 'LEADERSHIP',
    roleCode: 'KEPALA_SEKOLAH',
    title: 'Kepala Sekolah',
    simulatedName: 'Dr. H. Ahmad Fauzi, M.Pd',
    email: 'kepsek@absenta.id',
    password: 'password123',
    badge: 'Pimpinan Utama',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Akses supervisi mutu, statistik presensi global, monitoring KBM & pengesahan laporan',
    iconName: 'Crown',
    gradient: 'from-amber-500 to-amber-700 text-white',
    border: 'border-amber-300 dark:border-amber-700'
  },
  {
    id: 'demo-kurikulum',
    category: 'LEADERSHIP',
    roleCode: 'KURIKULUM',
    title: 'Waka Kurikulum',
    simulatedName: 'Dra. Hj. Siti Rahma, M.Pd',
    email: 'kurikulum@absenta.id',
    password: 'password123',
    badge: 'Akademik & KBM',
    badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Penyusunan jadwal KBM, struktur mapel, beban mengajar guru, KOSP & supervisi klinis',
    iconName: 'BookOpen',
    gradient: 'from-blue-500 to-indigo-700 text-white',
    border: 'border-blue-300 dark:border-blue-700'
  },
  {
    id: 'demo-kesiswaan',
    category: 'LEADERSHIP',
    roleCode: 'KESISWAAN',
    title: 'Waka Kesiswaan',
    simulatedName: 'Budi Santoso, S.Pd',
    email: 'kesiswaan@absenta.id',
    password: 'password123',
    badge: 'Disiplin & Presensi',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Monitoring presensi real-time, izin keluar, penegakan tata tertib & deteksi pelanggaran EWS',
    iconName: 'Users',
    gradient: 'from-emerald-500 to-teal-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'demo-hubin',
    category: 'LEADERSHIP',
    roleCode: 'HUBIN',
    title: 'Waka Hubin & BKK',
    simulatedName: 'Agus Setiawan, S.T',
    email: 'hubin@absenta.id',
    password: 'password123',
    badge: 'Industri & PKL',
    badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description: 'Kemitraan DUDI, monitoring PKL siswa, tracer study alumni & bursa kerja khusus (BKK)',
    iconName: 'Briefcase',
    gradient: 'from-purple-500 to-indigo-800 text-white',
    border: 'border-purple-300 dark:border-purple-700'
  },
  {
    id: 'demo-sarpras',
    category: 'LEADERSHIP',
    roleCode: 'SARPRAS',
    title: 'Waka Sarana Prasarana',
    simulatedName: 'Ir. Hendra Gunawan',
    email: 'sarpras@absenta.id',
    password: 'password123',
    badge: 'Fasilitas & Aset',
    badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    description: 'Inventarisasi aset barcode/RFID, pengajuan logistik, pemeliharaan gedung & kalkulator RAB',
    iconName: 'Building2',
    gradient: 'from-orange-500 to-amber-700 text-white',
    border: 'border-orange-300 dark:border-orange-700'
  },

  // ── 💼 MANAJEMEN & STAF ─────────────────────────────────────────
  {
    id: 'demo-tu',
    category: 'MANAGEMENT',
    roleCode: 'TU_KEPALA',
    title: 'Koordinator Tata Usaha',
    simulatedName: 'Ahmad Hidayat, S.AP',
    email: 'tu@absenta.id',
    password: 'password123',
    badge: 'Administrasi & Surat',
    badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    description: 'Manajemen surat masuk/keluar, kepegawaian Dapodik, buku induk siswa & legalisir ijazah',
    iconName: 'FileText',
    gradient: 'from-cyan-500 to-blue-700 text-white',
    border: 'border-cyan-300 dark:border-cyan-700'
  },
  {
    id: 'demo-bpbk',
    category: 'MANAGEMENT',
    roleCode: 'BPBK',
    title: 'Koordinator BP/BK',
    simulatedName: 'Nurul Aini, S.Psi',
    email: 'bpbk@absenta.id',
    password: 'password123',
    badge: 'Konseling & EWS',
    badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'Bimbingan konseling individual/kelompok, home visit, asesmen minat bakat & rekonsiliasi kasus',
    iconName: 'HeartHandshake',
    gradient: 'from-rose-500 to-pink-700 text-white',
    border: 'border-rose-300 dark:border-rose-700'
  },
  {
    id: 'demo-kaprog',
    category: 'MANAGEMENT',
    roleCode: 'KAPROG',
    title: 'Ketua Program Keahlian',
    simulatedName: 'Indra Lesmana, M.Kom',
    email: 'kaprog@absenta.id',
    password: 'password123',
    badge: 'Kepala Jurusan',
    badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Kurikulum kejuruan, sinkronisasi industri, uji kompetensi keahlian & supervisi bengkel',
    iconName: 'Laptop',
    gradient: 'from-indigo-500 to-blue-800 text-white',
    border: 'border-indigo-300 dark:border-indigo-700'
  },
  {
    id: 'demo-koperasi',
    category: 'MANAGEMENT',
    roleCode: 'KETUA_KOPERASI',
    title: 'Pengurus Koperasi ERP',
    simulatedName: 'Siti Maryam, S.E',
    email: 'koperasi@absenta.id',
    password: 'password123',
    badge: 'ERP & POS Kasir',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Point of Sale (POS) toko, saldo e-wallet RFID siswa, unit simpan pinjam & SHU anggota',
    iconName: 'ShoppingCart',
    gradient: 'from-emerald-600 to-teal-800 text-white',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'demo-gerbang',
    category: 'MANAGEMENT',
    roleCode: 'GERBANG',
    title: 'Petugas Piket & Gerbang',
    simulatedName: 'Rudi Hermawan',
    email: 'gerbang@absenta.id',
    password: 'password123',
    badge: 'Operasional Lapangan',
    badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description: 'Scan cepat tap-in barcode/RFID gerbang masuk, dispensasi keterlambatan & buku tamu digital',
    iconName: 'ShieldCheck',
    gradient: 'from-slate-600 to-slate-800 text-white',
    border: 'border-slate-300 dark:border-slate-700'
  },

  // ── 👨‍🏫 GURU & WALI KELAS ────────────────────────────────────────
  {
    id: 'demo-walikelas',
    category: 'TEACHING',
    roleCode: 'WALIKELAS',
    title: 'Wali Kelas (XII-RPL 1)',
    simulatedName: 'Ratna Dewi, S.Pd',
    email: 'walikelas@absenta.id',
    password: 'password123',
    badge: 'Bina Kelas',
    badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    description: 'Rekap kehadiran harian kelas, leger nilai, catatan sikap, ranking, cetak e-rapor & ledger P5',
    iconName: 'UserCheck',
    gradient: 'from-teal-500 to-emerald-700 text-white',
    border: 'border-teal-300 dark:border-teal-700'
  },
  {
    id: 'demo-guru',
    category: 'TEACHING',
    roleCode: 'GURU',
    title: 'Guru Mata Pelajaran',
    simulatedName: 'Farhan Maulana, S.Pd',
    email: 'guru@absenta.id',
    password: 'password123',
    badge: 'Pendidik KBM',
    badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    description: 'Agenda KBM mengajar, input absensi per jam pelajaran, jurnal materi, tugas & bank soal CBT',
    iconName: 'GraduationCap',
    gradient: 'from-sky-500 to-blue-700 text-white',
    border: 'border-sky-300 dark:border-sky-700'
  },
  {
    id: 'demo-eskul',
    category: 'TEACHING',
    roleCode: 'PEMBINA_ESKUL',
    title: 'Pembina Ekstrakurikuler',
    simulatedName: 'Eko Prasetyo, S.Pd',
    email: 'eskul@absenta.id',
    password: 'password123',
    badge: 'Kegiatan Siswa',
    badgeColor: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    description: 'Jadwal latihan eskul, presensi kegiatan sore, pencatatan prestasi lomba & nilai non-akademik',
    iconName: 'Sparkles',
    gradient: 'from-violet-500 to-purple-800 text-white',
    border: 'border-violet-300 dark:border-violet-700'
  },

  // ── 🎒 SISWA & ORANG TUA ────────────────────────────────────────
  {
    id: 'demo-siswa',
    category: 'END_USER',
    roleCode: 'SISWA',
    title: 'Siswa / Murid',
    simulatedName: 'Muhammad Rizky Pratama',
    email: 'siswa@absenta.id',
    password: 'password123',
    badge: 'Portal Murid',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Jadwal pelajaran hari ini, riwayat presensi, saldo e-wallet kantin, nilai ulangan & e-rapor',
    iconName: 'Smartphone',
    gradient: 'from-emerald-500 to-green-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'demo-ortu',
    category: 'END_USER',
    roleCode: 'ORANG_TUA',
    title: 'Orang Tua / Wali Murid',
    simulatedName: 'Bapak Hartono',
    email: 'ortu@absenta.id',
    password: 'password123',
    badge: 'Monitoring Anak',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Notifikasi kehadiran WhatsApp, pantauan jam tiba di sekolah, tagihan SPP & konsultasi guru',
    iconName: 'HeartHandshake',
    gradient: 'from-amber-500 to-orange-700 text-white',
    border: 'border-amber-300 dark:border-amber-700'
  },
];
