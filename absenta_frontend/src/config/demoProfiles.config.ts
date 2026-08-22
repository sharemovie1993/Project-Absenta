export interface DemoRoleProfile {
  id: string;
  category: 'LEADERSHIP' | 'MANAGEMENT' | 'TU_STAFF' | 'COOP_STAFF' | 'TEACHING' | 'END_USER';
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
  { id: 'MANAGEMENT', label: '💼 Manajemen Unit' },
  { id: 'TU_STAFF', label: '🏛️ Staf Tata Usaha' },
  { id: 'COOP_STAFF', label: '🛒 Pengurus Koperasi' },
  { id: 'TEACHING', label: '👨‍🏫 Guru & Wali Kelas' },
  { id: 'END_USER', label: '🎒 Siswa & Ortu' },
];

export const DEMO_ROLE_PROFILES: DemoRoleProfile[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 👑 LEVEL 4 & 5: PIMPINAN EKSEKUTIF SEKOLAH
  // ═══════════════════════════════════════════════════════════════════
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
    description: 'Akses supervisi mutu, statistik presensi global, monitoring KBM, TTD digital & pengesahan laporan',
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
    title: 'Waka Hubin',
    simulatedName: 'Agus Setiawan, S.T',
    email: 'hubin@absenta.id',
    password: 'password123',
    badge: 'Industri & PKL',
    badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description: 'Kemitraan DUDI, MoU industri, monitoring PKL siswa, tracer study alumni & unit produksi TEFA',
    iconName: 'Briefcase',
    gradient: 'from-purple-500 to-indigo-800 text-white',
    border: 'border-purple-300 dark:border-purple-700'
  },
  {
    id: 'demo-sarpras',
    category: 'LEADERSHIP',
    roleCode: 'SARPRAS',
    title: 'Waka Sarpras',
    simulatedName: 'Ir. Hendra Gunawan',
    email: 'sarpras@absenta.id',
    password: 'password123',
    badge: 'Fasilitas & Aset',
    badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    description: 'Master aset barcode/RFID, approval afkir barang rusak, pemeliharaan gedung & kalkulator RAB',
    iconName: 'Building2',
    gradient: 'from-orange-500 to-amber-700 text-white',
    border: 'border-orange-300 dark:border-orange-700'
  },
  {
    id: 'demo-tu-kepala',
    category: 'LEADERSHIP',
    roleCode: 'TU_KEPALA',
    title: 'Kepala TU',
    simulatedName: 'Ahmad Hidayat, S.AP',
    email: 'tu@absenta.id',
    password: 'password123',
    badge: 'Kepala Administrasi',
    badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    description: 'Supervisi staf TU, penandatanganan dinas surat keluar, pengarsipan berkas & data induk institusi',
    iconName: 'FileText',
    gradient: 'from-cyan-500 to-blue-700 text-white',
    border: 'border-cyan-300 dark:border-cyan-700'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 💼 LEVEL 3: KOORDINATOR UNIT & JURUSAN
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'demo-bpbk',
    category: 'MANAGEMENT',
    roleCode: 'BPBK',
    title: 'Koordinator BK',
    simulatedName: 'Nurul Aini, S.Psi',
    email: 'bpbk@absenta.id',
    password: 'password123',
    badge: 'Konseling & EWS',
    badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'Bimbingan konseling individual/kelompok, catatan sensitif BK, surat panggilan ortu & home visit',
    iconName: 'HeartHandshake',
    gradient: 'from-rose-500 to-pink-700 text-white',
    border: 'border-rose-300 dark:border-rose-700'
  },
  {
    id: 'demo-bkk',
    category: 'MANAGEMENT',
    roleCode: 'BKK',
    title: 'Ketua BKK',
    simulatedName: 'Denny Ramdani, S.Pd',
    email: 'bkk@absenta.id',
    password: 'password123',
    badge: 'Karir Alumni',
    badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Bursa lowongan kerja mitra industri, rekrutmen kampus, seleksi pelamar alumni & tracer study',
    iconName: 'Briefcase',
    gradient: 'from-indigo-500 to-violet-700 text-white',
    border: 'border-indigo-300 dark:border-indigo-700'
  },
  {
    id: 'demo-kaprog',
    category: 'MANAGEMENT',
    roleCode: 'KAPROG',
    title: 'Kaprog Kejuruan',
    simulatedName: 'Indra Lesmana, M.Kom',
    email: 'kaprog@absenta.id',
    password: 'password123',
    badge: 'Kepala Jurusan',
    badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Kurikulum kejuruan jurusan, plotting draf PKL siswa, uji kompetensi (UKK) & supervisi bengkel',
    iconName: 'Laptop',
    gradient: 'from-indigo-600 to-blue-800 text-white',
    border: 'border-indigo-300 dark:border-indigo-700'
  },
  {
    id: 'demo-kabeng',
    category: 'MANAGEMENT',
    roleCode: 'KABENG',
    title: 'Kepala Bengkel',
    simulatedName: 'Mulyadi, S.T',
    email: 'kabeng@absenta.id',
    password: 'password123',
    badge: 'Kepala Lab/Bengkel',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Manajemen mesin/alat bengkel, approval afkir alat rusak & jadwal pemakaian laboratorium KBM',
    iconName: 'Building2',
    gradient: 'from-amber-600 to-orange-800 text-white',
    border: 'border-amber-300 dark:border-amber-700'
  },
  {
    id: 'demo-toolman',
    category: 'MANAGEMENT',
    roleCode: 'TOOLMAN',
    title: 'Toolman / Teknisi',
    simulatedName: 'Asep Supriatna',
    email: 'toolman@absenta.id',
    password: 'password123',
    badge: 'Teknisi Alat',
    badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description: 'Bon pinjam-kembali alat perkakas siswa, kartu stok suku cadang & servis berkala mesin bengkel',
    iconName: 'Laptop',
    gradient: 'from-slate-600 to-slate-800 text-white',
    border: 'border-slate-300 dark:border-slate-700'
  },
  {
    id: 'demo-gerbang',
    category: 'MANAGEMENT',
    roleCode: 'GERBANG',
    title: 'Petugas Gerbang',
    simulatedName: 'Rudi Hermawan',
    email: 'gerbang@absenta.id',
    password: 'password123',
    badge: 'Operasional Lapangan',
    badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description: 'Scan cepat tap-in barcode/RFID gerbang masuk, dispensasi keterlambatan & buku tamu digital',
    iconName: 'ShieldCheck',
    gradient: 'from-slate-700 to-zinc-900 text-white',
    border: 'border-slate-300 dark:border-slate-700'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 🏛️ LEVEL 2: STAF OPERASIONAL TATA USAHA (TU)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'demo-tu-persuratan',
    category: 'TU_STAFF',
    roleCode: 'TU_PERSURATAN',
    title: 'TU Persuratan',
    simulatedName: 'Fitri Handayani, S.Sos',
    email: 'tu.persuratan@absenta.id',
    password: 'password123',
    badge: 'Persuratan & Arsip',
    badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    description: 'Pencatatan surat masuk/keluar, nomor agenda dinas otomatis, disposisi & pengarsipan dokumen PDF',
    iconName: 'FileText',
    gradient: 'from-cyan-600 to-teal-700 text-white',
    border: 'border-cyan-300 dark:border-cyan-700'
  },
  {
    id: 'demo-tu-keuangan',
    category: 'TU_STAFF',
    roleCode: 'TU_KEUANGAN',
    title: 'TU Keuangan',
    simulatedName: 'Dewi Lestari, S.E',
    email: 'tu.keuangan@absenta.id',
    password: 'password123',
    badge: 'SPP & Tagihan',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Pengelolaan tagihan SPP bulanan siswa, kwitansi pembayaran tunai/gateway & laporan rekap kas',
    iconName: 'FileText',
    gradient: 'from-emerald-500 to-teal-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'demo-tu-kepegawaian',
    category: 'TU_STAFF',
    roleCode: 'TU_KEPEGAWAIAN',
    title: 'TU Kepegawaian',
    simulatedName: 'Ginanzhar Sudiarto, S.Kom',
    email: 'tu.kepegawaian@absenta.id',
    password: 'password123',
    badge: 'Dapodik & Pegawai',
    badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Buku induk siswa, data pokok guru/tendik (PTK), mutasi siswa, cetak kartu kartu pelajar & akun pengguna',
    iconName: 'Users',
    gradient: 'from-blue-600 to-indigo-800 text-white',
    border: 'border-blue-300 dark:border-blue-700'
  },
  {
    id: 'demo-tu-sarpras',
    category: 'TU_STAFF',
    roleCode: 'TU_SARPRAS',
    title: 'TU Sarpras',
    simulatedName: 'Depi Kurniawan',
    email: 'tu.sarpras@absenta.id',
    password: 'password123',
    badge: 'Inventaris Barang',
    badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    description: 'Labeling barcode Kartu Inventaris Barang (KIB), formulir serah-terima & pencatatan logistik habis pakai',
    iconName: 'Building2',
    gradient: 'from-orange-500 to-amber-700 text-white',
    border: 'border-orange-300 dark:border-orange-700'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 🛒 KOPERASI SEKOLAH (PENGURUS, PENGAWAS & KASIR)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'demo-koperasi-ketua',
    category: 'COOP_STAFF',
    roleCode: 'KETUA_KOPERASI',
    title: 'Ketua Koperasi',
    simulatedName: 'Siti Maryam, S.E',
    email: 'koperasi.ketua@absenta.id',
    password: 'password123',
    badge: 'Ketua Koperasi',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Approval pengajuan pinjaman anggota, laporan keuangan bulanan, persetujuan SHU & voucher diskon',
    iconName: 'ShoppingCart',
    gradient: 'from-emerald-600 to-teal-800 text-white',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'demo-koperasi-bendahara',
    category: 'COOP_STAFF',
    roleCode: 'BENDAHARA_KOPERASI',
    title: 'Bendahara Koperasi',
    simulatedName: 'Nur Hasanah, S.Ak',
    email: 'koperasi.bendahara@absenta.id',
    password: 'password123',
    badge: 'Kas & Simpan Pinjam',
    badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    description: 'Pencatatan simpanan wajib/sukarela, mutasi penarikan saldo, angsuran pinjaman & kalkulasi pembagian SHU',
    iconName: 'ShoppingCart',
    gradient: 'from-teal-600 to-emerald-800 text-white',
    border: 'border-teal-300 dark:border-teal-700'
  },
  {
    id: 'demo-koperasi-sekretaris',
    category: 'COOP_STAFF',
    roleCode: 'SEKRETARIS_KOPERASI',
    title: 'Sekretaris Koperasi',
    simulatedName: 'Yuni Astuti, S.Pd',
    email: 'koperasi.sekretaris@absenta.id',
    password: 'password123',
    badge: 'Keanggotaan & Tiket',
    badgeColor: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    description: 'Pendaftaran anggota baru, aktivasi/deaktivasi member koperasi, pengumuman RAT & tiket layanan',
    iconName: 'Users',
    gradient: 'from-green-600 to-teal-800 text-white',
    border: 'border-green-300 dark:border-green-700'
  },
  {
    id: 'demo-koperasi-manajer',
    category: 'COOP_STAFF',
    roleCode: 'MANAJER_TOKO_KOPERASI',
    title: 'Kasir POS Toko',
    simulatedName: 'Dadan Hamdan',
    email: 'koperasi.kasir@absenta.id',
    password: 'password123',
    badge: 'Kasir POS Toko',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Aplikasi kasir Point of Sale (POS), scan barcode barang belanjaan, pembayaran RFID siswa & stok minimarket',
    iconName: 'ShoppingCart',
    gradient: 'from-emerald-500 to-green-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'demo-koperasi-pengawas',
    category: 'COOP_STAFF',
    roleCode: 'PENGAWAS_KOPERASI',
    title: 'Pengawas Koperasi',
    simulatedName: 'Drs. H. Syarif Hidayat',
    email: 'koperasi.pengawas@absenta.id',
    password: 'password123',
    badge: 'Pengawas & Audit',
    badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    description: 'Audit neraca keuangan koperasi, monitoring transaksi kasir & transparansi pembagian SHU tahunan',
    iconName: 'ShieldCheck',
    gradient: 'from-slate-600 to-zinc-800 text-white',
    border: 'border-slate-300 dark:border-slate-700'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 👨‍🏫 GURU & WALI KELAS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'demo-walikelas',
    category: 'TEACHING',
    roleCode: 'WALIKELAS',
    title: 'Wali Kelas',
    simulatedName: 'Ai Kustiani Demo',
    email: 'walikelas@absenta.id',
    password: 'password123',
    badge: 'Wali Kelas X TJKT 1',
    badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    description: 'Rekap absensi harian kelas X TJKT 1, leger nilai, catatan sikap, ranking, cetak e-rapor & ledger P5',
    iconName: 'UserCheck',
    gradient: 'from-teal-500 to-emerald-700 text-white',
    border: 'border-teal-300 dark:border-teal-700'
  },
  {
    id: 'demo-guru',
    category: 'TEACHING',
    roleCode: 'GURU',
    title: 'Guru Mapel',
    simulatedName: 'Erwin Demo',
    email: 'guru@absenta.id',
    password: 'password123',
    badge: 'Pengajar IPAS',
    badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    description: 'Agenda KBM mengajar IPAS di X TJKT 1, buka sesi presensi jam pelajaran, jurnal materi & nilai siswa',
    iconName: 'GraduationCap',
    gradient: 'from-sky-500 to-blue-700 text-white',
    border: 'border-sky-300 dark:border-sky-700'
  },
  {
    id: 'demo-eskul',
    category: 'TEACHING',
    roleCode: 'PEMBINA_ESKUL',
    title: 'Pembina Eskul',
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

  // ═══════════════════════════════════════════════════════════════════
  // 🎒 LEVEL 1 & PENGGUNA AKHIR (SISWA, PETUGAS KELAS & ORANG TUA)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'demo-petugas-kelas',
    category: 'END_USER',
    roleCode: 'PETUGAS_KELAS',
    title: 'Petugas Absensi',
    simulatedName: 'Putri Demo (X TJKT 1)',
    email: 'petugas.kelas@absenta.id',
    password: 'password123',
    badge: 'Sekretaris X TJKT 1',
    badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Pengisian buku jurnal absensi digital kelas X TJKT 1, cek teman belum hadir & pencatatan izin guru',
    iconName: 'UserCheck',
    gradient: 'from-blue-500 to-indigo-700 text-white',
    border: 'border-blue-300 dark:border-blue-700'
  },
  {
    id: 'demo-siswa',
    category: 'END_USER',
    roleCode: 'SISWA',
    title: 'Siswa / Murid',
    simulatedName: 'Amelia Demo',
    email: 'siswa@absenta.id',
    password: 'password123',
    badge: 'Murid X TJKT 1',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Jadwal pelajaran X TJKT 1 hari ini, riwayat presensi, saldo e-wallet kantin, nilai ulangan & e-rapor',
    iconName: 'Smartphone',
    gradient: 'from-emerald-500 to-green-700 text-white',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  {
    id: 'demo-ortu',
    category: 'END_USER',
    roleCode: 'ORANG_TUA',
    title: 'Orang Tua Murid',
    simulatedName: 'Bapak Hartono Demo',
    email: 'ortu@absenta.id',
    password: 'password123',
    badge: 'Ayah dari Amelia',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Notifikasi kehadiran WhatsApp, pantauan jam tiba Amelia di kelas X TJKT 1, tagihan SPP & konsultasi guru',
    iconName: 'HeartHandshake',
    gradient: 'from-amber-500 to-orange-700 text-white',
    border: 'border-amber-300 dark:border-amber-700'
  },
];
