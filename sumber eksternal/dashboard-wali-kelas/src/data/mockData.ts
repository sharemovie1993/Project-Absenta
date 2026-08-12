import { Student, LeaveRequest, AtRiskStudent, ViolationRecord, AchievementRecord, JournalEntry, ClassInfo, ClassHealthMetric } from '../types';

export const INITIAL_CLASS_INFO: ClassInfo = {
  className: 'XI RPL 1',
  academicYear: '2025/2026',
  semester: 'Semester Ganjil',
  homeroomTeacher: 'Drs. Budi Santoso, M.Pd.',
  nip: '19780512 200501 1 003',
  totalStudents: 36,
  maleCount: 18,
  femaleCount: 18,
  roomNumber: 'Lab Komputer 2 / Gedung B.204',
  major: 'Rekayasa Perangkat Lunak'
};

export const INITIAL_HEALTH_METRIC: ClassHealthMetric = {
  overallScore: 92,
  attendancePercentage: 94.4,
  activeRequestsCount: 3,
  atRiskCount: 2,
  totalViolationPoints: 45,
  parentResponseRate: 98.2,
  zeroSevereViolations: true
};

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's01',
    nis: '23241001',
    name: 'Achmad Fauzi',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    parentName: 'H. Suryana Fauzi',
    parentPhone: '081234567801',
    todayStatus: 'Hadir',
    todayTime: '06:48 WIB',
    attendanceRate: 98.5,
    alphaCount: 0,
    sakitCount: 1,
    izinCount: 1,
    violationPoints: 0,
    goodDeedsPoints: 85,
    academicAverage: 89.4,
    isStarStudent: true,
    starRank: 1,
    badges: [
      { id: 'b1', badgeName: '🌟 Bintang Kehadiran', icon: 'Star', category: 'Kedisiplinan', awardedBy: 'Drs. Budi Santoso', awardedAt: '01 Aug 2026', note: 'Kehadiran 100% tepat waktu bulan lalu' },
      { id: 'b2', badgeName: '🏆 Pejuang Prestasi', icon: 'Trophy', category: 'Prestasi', awardedBy: 'Drs. Budi Santoso', awardedAt: '10 Aug 2026', note: 'Juara 1 LKS Web Technologies Kota' }
    ]
  },
  {
    id: 's02',
    nis: '23241002',
    name: 'Adinda Putri Maharani',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    parentName: 'Rina Herawati',
    parentPhone: '081234567802',
    todayStatus: 'Hadir',
    todayTime: '06:52 WIB',
    attendanceRate: 97.8,
    alphaCount: 0,
    sakitCount: 2,
    izinCount: 0,
    violationPoints: 0,
    goodDeedsPoints: 92,
    academicAverage: 91.2,
    isStarStudent: true,
    starRank: 2,
    badges: [
      { id: 'b3', badgeName: '💎 Teladan Karakter', icon: 'Shield', category: 'Karakter', awardedBy: 'Drs. Budi Santoso', awardedAt: '05 Aug 2026', note: 'Aktif membantu kegiatan bakti sosial kelas' }
    ]
  },
  {
    id: 's03',
    nis: '23241003',
    name: 'Bagus Pratama Putra',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    parentName: 'Bambang Pratama',
    parentPhone: '081234567803',
    todayStatus: 'Hadir',
    todayTime: '06:55 WIB',
    attendanceRate: 96.0,
    alphaCount: 0,
    sakitCount: 1,
    izinCount: 2,
    violationPoints: 5,
    goodDeedsPoints: 78,
    academicAverage: 88.0,
    isStarStudent: true,
    starRank: 3,
    badges: [
      { id: 'b4', badgeName: '🚀 Siswa Paling Disiplin', icon: 'Zap', category: 'Kedisiplinan', awardedBy: 'Drs. Budi Santoso', awardedAt: '02 Aug 2026', note: 'Konsisten merapikan peralatan Lab Komputer' }
    ]
  },
  {
    id: 's04',
    nis: '23241004',
    name: 'Bayu Prasetyo',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    parentName: 'Agus Prasetyo',
    parentPhone: '081234567804',
    todayStatus: 'Sakit',
    todayTime: '-',
    attendanceRate: 85.0,
    alphaCount: 3,
    sakitCount: 5,
    izinCount: 1,
    violationPoints: 15,
    goodDeedsPoints: 20,
    academicAverage: 75.4,
    atRiskReason: 'Alpha 3 Hari dalam sebulan & Sakit beruntun',
    badges: []
  },
  {
    id: 's05',
    nis: '23241005',
    name: 'Citra Dewi Sartika',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    parentName: 'Dewi Lestari',
    parentPhone: '081234567805',
    todayStatus: 'Hadir',
    todayTime: '06:45 WIB',
    attendanceRate: 99.0,
    alphaCount: 0,
    sakitCount: 1,
    izinCount: 0,
    violationPoints: 0,
    goodDeedsPoints: 70,
    academicAverage: 87.5,
    badges: []
  },
  {
    id: 's06',
    nis: '23241006',
    name: 'Dimas Anggara',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    parentName: 'Heri Anggara',
    parentPhone: '081234567806',
    todayStatus: 'Izin',
    todayTime: '-',
    attendanceRate: 82.5,
    alphaCount: 4,
    sakitCount: 2,
    izinCount: 3,
    violationPoints: 25,
    goodDeedsPoints: 15,
    academicAverage: 72.8,
    atRiskReason: 'Alpha ≥ 3 hari & Poin Pelanggaran Meningkat',
    badges: []
  },
  {
    id: 's07',
    nis: '23241007',
    name: 'Eka Nurjanah',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    parentName: 'Siti Rahmah',
    parentPhone: '081234567807',
    todayStatus: 'Hadir',
    todayTime: '06:50 WIB',
    attendanceRate: 95.5,
    alphaCount: 1,
    sakitCount: 1,
    izinCount: 1,
    violationPoints: 0,
    goodDeedsPoints: 45,
    academicAverage: 84.2,
    badges: []
  },
  {
    id: 's08',
    nis: '23241008',
    name: 'Fadhil Muhammad',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    parentName: 'Iwan Ridwan',
    parentPhone: '081234567808',
    todayStatus: 'Hadir',
    todayTime: '06:58 WIB',
    attendanceRate: 94.0,
    alphaCount: 1,
    sakitCount: 2,
    izinCount: 1,
    violationPoints: 10,
    goodDeedsPoints: 30,
    academicAverage: 81.0,
    badges: []
  },
  {
    id: 's09',
    nis: '23241009',
    name: 'Gita Gutawa Rahayu',
    gender: 'P',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    parentName: 'Dr. Hendra Rahayu',
    parentPhone: '081234567809',
    todayStatus: 'Hadir',
    todayTime: '06:40 WIB',
    attendanceRate: 100.0,
    alphaCount: 0,
    sakitCount: 0,
    izinCount: 0,
    violationPoints: 0,
    goodDeedsPoints: 88,
    academicAverage: 93.1,
    badges: [
      { id: 'b5', badgeName: '🌟 Bintang Kehadiran Perfect', icon: 'Award', category: 'Kedisiplinan', awardedBy: 'Drs. Budi Santoso', awardedAt: '01 Aug 2026', note: 'Tidak pernah absen 1 hari pun' }
    ]
  },
  {
    id: 's10',
    nis: '23241010',
    name: 'Hafiz Al-Ghazali',
    gender: 'L',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    parentName: 'Ahmad Ghazali',
    parentPhone: '081234567810',
    todayStatus: 'Hadir',
    todayTime: '06:51 WIB',
    attendanceRate: 96.5,
    alphaCount: 0,
    sakitCount: 2,
    izinCount: 0,
    violationPoints: 0,
    goodDeedsPoints: 60,
    academicAverage: 86.4,
    badges: []
  },
  // Add rest of students for 36 total (summary generators fill out full roster seamlessly)
  ...Array.from({ length: 26 }, (_, i) => {
    const idx = i + 11;
    const isMale = idx % 2 === 1;
    const namesMale = ['Irfan Hakim', 'Joko Susilo', 'Kevin Sanjaya', 'Lukman Hakim', 'Muhammad Rizky', 'Naufal Azhar', 'Oki Setiawan', 'Pandu Wijaya', 'Qori Ramadhan', 'Rian Hidayat', 'Sultan Iskandar', 'Taufik Hidayat', 'Umar Faruq'];
    const namesFemale = ['Indah Permata', 'Jasmine Aurelia', 'Kartika Putri', 'Larasati Ningrum', 'Mutiara Sani', 'Nabila Syakieb', 'Olivia Zalianty', 'Priscillia Anindita', 'Qonita Zahra', 'Rania Salsabila', 'Siti Zulaikha', 'Tania Putri', 'Ulfa Safira'];
    const nameList = isMale ? namesMale : namesFemale;
    const selectedName = nameList[(idx - 11) % nameList.length] + (idx > 23 ? ` ${idx}` : '');
    
    return {
      id: `s${idx < 10 ? '0' + idx : idx}`,
      nis: `232410${idx < 10 ? '0' + idx : idx}`,
      name: selectedName,
      gender: (isMale ? 'L' : 'P') as 'L' | 'P',
      avatar: `https://i.pravatar.cc/150?img=${idx + 10}`,
      parentName: `Orang Tua dari ${selectedName.split(' ')[0]}`,
      parentPhone: `081234567${100 + idx}`,
      todayStatus: 'Hadir' as const,
      todayTime: `06:${45 + (idx % 12)} WIB`,
      attendanceRate: 95.0 + (idx % 5),
      alphaCount: (idx === 15) ? 2 : 0,
      sakitCount: idx % 3 === 0 ? 1 : 0,
      izinCount: idx % 4 === 0 ? 1 : 0,
      violationPoints: idx === 18 ? 10 : 0,
      goodDeedsPoints: 20 + (idx * 2),
      academicAverage: 80.0 + (idx % 12),
      badges: []
    };
  })
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'req-001',
    studentId: 's04',
    studentName: 'Bayu Prasetyo',
    nis: '23241004',
    studentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    parentName: 'Agus Prasetyo (Ayah)',
    parentPhone: '081234567804',
    type: 'Sakit',
    startDate: '11 Ags 2026',
    endDate: '12 Ags 2026',
    reason: 'Anak kami Bayu mendadak demam tinggi dan flu berat sejak semalam. Mohon izin tidak dapat mengikuti KBM selama 2 hari.',
    status: 'Pending',
    submittedAt: 'Hari ini, 06:15 WIB',
    attachmentUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    attachmentType: 'doctor_note',
    attachmentTitle: 'Surat Keterangan Dokter - Klinik Medika Utama',
    doctorDetails: {
      clinicName: 'Klinik Medika Utama Pratama',
      doctorName: 'dr. H. Rahmat Hidayat, Sp.A',
      diagnosis: 'Febris & Acute Upper Respiratory Infection',
      restDays: 2
    }
  },
  {
    id: 'req-002',
    studentId: 's06',
    studentName: 'Dimas Anggara',
    nis: '23241006',
    studentAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    parentName: 'Heri Anggara (Ayah)',
    parentPhone: '081234567806',
    type: 'Izin Keluarga',
    startDate: '11 Ags 2026',
    endDate: '11 Ags 2026',
    reason: 'Menghadiri acara pernikahan kakak kandung di luar kota (Bandung). Kebutuhan keluarga mendesak.',
    status: 'Pending',
    submittedAt: 'Hari ini, 06:30 WIB',
    attachmentUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80',
    attachmentType: 'family_letter',
    attachmentTitle: 'Undangan Pernikahan Keluarga & Surat Izin Ortu'
  },
  {
    id: 'req-003',
    studentId: 's08',
    studentName: 'Fadhil Muhammad',
    nis: '23241008',
    studentAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    parentName: 'Iwan Ridwan (Ayah)',
    parentPhone: '081234567808',
    type: 'Pulang Awal',
    startDate: '11 Ags 2026',
    endDate: '11 Ags 2026',
    reason: 'Ada jadwal kontrol gigi dan terapi paska operasi kecelakaan ringan pkl 12.00 WIB di RSUD.',
    status: 'Pending',
    submittedAt: 'Hari ini, 07:05 WIB',
    attachmentUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    attachmentType: 'doctor_note',
    attachmentTitle: 'Kartu Kontrol RSUD Sehat Sejahtera'
  },
  {
    id: 'req-004',
    studentId: 's01',
    studentName: 'Achmad Fauzi',
    nis: '23241001',
    studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    parentName: 'H. Suryana Fauzi (Ayah)',
    parentPhone: '081234567801',
    type: 'Dispensasi',
    startDate: '08 Ags 2026',
    endDate: '09 Ags 2026',
    reason: 'Mewakili sekolah dalam Penyisihan LKS Web Technologies Tingkat Provinsi.',
    status: 'Disetujui',
    submittedAt: '07 Ags 2026, 14:00 WIB',
    processedAt: '07 Ags 2026, 15:20 WIB'
  },
  {
    id: 'req-005',
    studentId: 's02',
    studentName: 'Adinda Putri Maharani',
    nis: '23241002',
    studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    parentName: 'Rina Herawati (Ibu)',
    parentPhone: '081234567802',
    type: 'Sakit',
    startDate: '04 Ags 2026',
    endDate: '05 Ags 2026',
    reason: 'Sakit migrain dan asam lambung kambuh.',
    status: 'Disetujui',
    submittedAt: '04 Ags 2026, 06:40 WIB',
    processedAt: '04 Ags 2026, 07:10 WIB'
  }
];

export const INITIAL_AT_RISK: AtRiskStudent[] = [
  {
    studentId: 's04',
    studentName: 'Bayu Prasetyo',
    nis: '23241004',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    gender: 'L',
    riskCategory: 'Alpha Tinggi (≥3 Hari)',
    consecutiveDays: 3,
    totalAlphaThisMonth: 3,
    recommendation: 'Perlu Pemanggilan Ortu',
    status: 'Perlu Tindakan'
  },
  {
    studentId: 's06',
    studentName: 'Dimas Anggara',
    nis: '23241006',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    gender: 'L',
    riskCategory: 'Sakit/Izin Beruntun (≥5 Hari)',
    consecutiveDays: 5,
    totalAlphaThisMonth: 4,
    recommendation: 'Koordinasi Guru BK',
    status: 'Dalam Proses Pembinaan',
    lastIntervention: 'Konseling awal dengan Guru BK pada 08 Ags 2026'
  }
];

export const INITIAL_VIOLATIONS: ViolationRecord[] = [
  {
    id: 'v01',
    studentId: 's06',
    studentName: 'Dimas Anggara',
    nis: '23241006',
    category: 'Keterlambatan Masuk Sekolah',
    points: 15,
    severity: 'Sedang',
    date: '08 Ags 2026',
    reporter: 'Guru Piket',
    description: 'Terlambat 35 menit melebihi bel masuk (07.15 WIB) tanpa alasan sah.',
    bkStatus: 'Konseling BK',
    followUpNotes: 'Dijadwalkan pembinaan karakter dan penandatanganan komitmen tepat waktu.'
  },
  {
    id: 'v02',
    studentId: 's04',
    studentName: 'Bayu Prasetyo',
    nis: '23241004',
    category: 'Atribut Seragam Tidak Lengkap',
    points: 10,
    severity: 'Ringan',
    date: '05 Ags 2026',
    reporter: 'Guru Piket',
    description: 'Tidak memakai dasi dan sabuk resmi sekolah saat upacara hari Senin.',
    bkStatus: 'Dalam Pemantauan'
  },
  {
    id: 'v03',
    studentId: 's08',
    studentName: 'Fadhil Muhammad',
    nis: '23241008',
    category: 'Penggunaan HP Saat KBM Jam Pelajaran',
    points: 10,
    severity: 'Ringan',
    date: '02 Ags 2026',
    reporter: 'Guru Mapel',
    description: 'Bermain game online saat jam pelajaran Pemrograman Web.',
    bkStatus: 'Selesai',
    followUpNotes: 'HP ditahan sementara 1 hari dan telah dikembalikan setelah refleksi.'
  },
  {
    id: 'v04',
    studentId: 's18',
    studentName: 'Lukman Hakim',
    nis: '23241018',
    category: 'Keterlambatan Masuk Sekolah',
    points: 10,
    severity: 'Ringan',
    date: '01 Ags 2026',
    reporter: 'Guru Piket',
    description: 'Terlambat 15 menit karena kendala rantai sepeda motor putus.',
    bkStatus: 'Selesai'
  }
];

export const INITIAL_ACHIEVEMENTS: AchievementRecord[] = [
  {
    id: 'ach-01',
    studentId: 's01',
    studentName: 'Achmad Fauzi',
    nis: '23241001',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Juara 1 Lomba Kompetensi Siswa (LKS) Web Technologies',
    category: 'Akademik',
    level: 'Kota/Kab',
    date: '09 Ags 2026',
    points: 50,
    description: 'Meraih medali emas LKS Web Tech Kota Bandung dan melaju ke tingkat Provinsi.',
    certificateUrl: 'https://example.com/cert-lks-fauzi.pdf'
  },
  {
    id: 'ach-02',
    studentId: 's02',
    studentName: 'Adinda Putri Maharani',
    nis: '23241002',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    title: 'Juara 2 Hackathon Inovasi Digital Pelajar',
    category: 'Akademik',
    level: 'Provinsi',
    date: '03 Ags 2026',
    points: 40,
    description: 'Mengembangkan aplikasi sistem pemilah sampah pintar berbasis AI.'
  },
  {
    id: 'ach-03',
    studentId: 's03',
    studentName: 'Bagus Pratama Putra',
    nis: '23241003',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Kapten Tim Futsal - Juara 3 Turnamen Pelajar SMA/SMK',
    category: 'Non-Akademik',
    level: 'Kota/Kab',
    date: '28 Jul 2026',
    points: 30,
    description: 'Memimpin tim futsal sekolah hingga meraih juara 3 se-Kota.'
  },
  {
    id: 'ach-04',
    studentId: 's09',
    studentName: 'Gita Gutawa Rahayu',
    nis: '23241009',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    title: 'Duta Kebersihan & Lingkungan Sekolah Terbaik',
    category: 'Karakter & Sosial',
    level: 'Sekolah',
    date: '01 Ags 2026',
    points: 25,
    description: 'Penggerak utama program Zero Waste di area Lab Komputer & Kelas.'
  }
];

export const INITIAL_JOURNAL: JournalEntry[] = [
  {
    id: 'j-01',
    date: '10 Ags 2026',
    time: '14:30 WIB',
    category: 'Pembinaan Kelas',
    title: 'Pengarahan Jam Walas & Evaluasi Kedisiplinan Awal Bulan',
    content: 'Membahas komitmen jam masuk (07.00 WIB), kerapihan pakaian, dan kesiapan menghadapi Ujian Tengah Semester. Diapresiasi siswa dengan persentase kehadiran 100%.',
    author: 'Drs. Budi Santoso, M.Pd.',
    tags: ['Jam Walas', 'Disiplin', 'UTS']
  },
  {
    id: 'j-02',
    date: '08 Ags 2026',
    time: '10:00 WIB',
    category: 'Koordinasi BK',
    title: 'Koordinasi dengan Guru BK terkait Kasus Keterlambatan Dimas Anggara',
    content: 'Mengadakan rapat terbatas bersama Dra. Haryati (BK). Disepakati untuk memberikan pendampingan konseling serta memantau pola tidur dan jadwal berangkat siswa.',
    author: 'Drs. Budi Santoso, M.Pd.',
    tags: ['BK', 'Dimas Anggara', 'EWS'],
    attachedStudents: ['Dimas Anggara']
  },
  {
    id: 'j-03',
    date: '05 Ags 2026',
    time: '15:30 WIB',
    category: 'Rapat Ortu',
    title: 'Sosialisasi Program Praktik Kerja Lapangan (PKL) kepada Orang Tua',
    content: 'Rapat virtual via Zoom bersama 34 orang tua siswa XI RPL 1. Orang tua mendukung penuh pelaksanaan sertifikasi industri dan persiapan penempatan PKL.',
    author: 'Drs. Budi Santoso, M.Pd.',
    tags: ['Paguyuban Ortu', 'PKL', 'Zoom']
  },
  {
    id: 'j-04',
    date: '02 Ags 2026',
    time: '11:15 WIB',
    category: 'Kasus Teratasi',
    title: 'Penyelesaian Kesalahpahaman Pembagian Kelompok Tugas Web',
    content: 'Mediasi antara kelompok 2 dan kelompok 4 mengenai pembagian porsi pengerjaan backend. Diskusi berjalan secara kekeluargaan dan tugas disepakati bersama.',
    author: 'Drs. Budi Santoso, M.Pd.',
    tags: ['Mediasi', 'Kelompok Belajar']
  }
];

// Generate 20 school days attendance matrix for table view
export const DATES_MATRIX = Array.from({ length: 20 }, (_, i) => {
  const day = i + 1;
  const dateStr = `${day < 10 ? '0' + day : day} Ags`;
  return dateStr;
});

export const GENERATE_MONTHLY_MATRIX = (students: Student[]) => {
  return students.map(s => {
    const dailyRecords: { [key: string]: 'H' | 'S' | 'I' | 'A' | 'B' | 'D' } = {};
    DATES_MATRIX.forEach((date, index) => {
      // Create predictable realistic sample data matching student attributes
      if (s.id === 's04') {
        // Bayu: sakit 5 days, alpha 3 days
        if (index >= 12 && index <= 16) dailyRecords[date] = 'S';
        else if (index === 2 || index === 7 || index === 11) dailyRecords[date] = 'A';
        else dailyRecords[date] = 'H';
      } else if (s.id === 's06') {
        // Dimas: alpha 4, izin 3
        if (index === 3 || index === 8 || index === 13 || index === 18) dailyRecords[date] = 'A';
        else if (index === 5 || index === 14 || index === 19) dailyRecords[date] = 'I';
        else dailyRecords[date] = 'H';
      } else if (s.id === 's01') {
        if (index === 5) dailyRecords[date] = 'S';
        else if (index === 10) dailyRecords[date] = 'D'; // Dispensasi LKS
        else dailyRecords[date] = 'H';
      } else if (s.id === 's02') {
        if (index === 3 || index === 4) dailyRecords[date] = 'S';
        else dailyRecords[date] = 'H';
      } else {
        // Normal distribution
        if ((index + s.name.length) % 19 === 0) dailyRecords[date] = 'I';
        else if ((index * s.name.length) % 29 === 0) dailyRecords[date] = 'S';
        else dailyRecords[date] = 'H';
      }
    });

    const counts = {
      H: Object.values(dailyRecords).filter(v => v === 'H' || v === 'D').length,
      S: Object.values(dailyRecords).filter(v => v === 'S').length,
      I: Object.values(dailyRecords).filter(v => v === 'I').length,
      A: Object.values(dailyRecords).filter(v => v === 'A').length,
      B: Object.values(dailyRecords).filter(v => v === 'B').length,
      D: Object.values(dailyRecords).filter(v => v === 'D').length,
    };

    return {
      student: s,
      dailyRecords,
      counts
    };
  });
};
