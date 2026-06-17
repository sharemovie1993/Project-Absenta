import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data Jobdesk Dasar untuk Role Utama (Global & Tenant)
const ROLE_JOBDESK_DEFAULTS = [
  {
    roleName: 'SUPERADMIN',
    description: 'Pemegang kekuasaan tertinggi di ekosistem Absenta.id yang mengawasi operasional nasional seluruh sekolah (tenant).',
    tasks: [
      'Mengelola lisensi subscription, harga paket, dan add-on platform.',
      'Mengevaluasi laporan keuangan dan analitik pendapatan nasional.',
      'Mengonfigurasi pengaturan sistem global dan integrasi API pihak ketiga (WhatsApp, payment gateway, dll.).',
      'Menganalisis performa SLA tim support, finance, dan infrastruktur.'
    ]
  },
  {
    roleName: 'PLATFORM_SUPPORT',
    description: 'Tim layanan pelanggan nasional yang bertanggung jawab atas resolusi aduan dan kepuasan sekolah.',
    tasks: [
      'Menerima, merespon, dan menyelesaikan tiket aduan masalah teknis/non-teknis dari sekolah.',
      'Mengelola basis pengetahuan (FAQ) dan balasan cepat untuk mempercepat resolusi masalah.',
      'Melakukan diagnostik awal pada sistem sekolah (tenant) yang mengalami kendala operasional.'
    ]
  },
  {
    roleName: 'PLATFORM_FINANCE',
    description: 'Tim keuangan platform yang mengelola arus kas masuk, invoice, dan penagihan lisensi sekolah.',
    tasks: [
      'Memverifikasi dan memproses persetujuan pembayaran manual/invoice sekolah.',
      'Mengaudit laporan transaksi, refund, dan tunggakan pembayaran tenant.',
      'Mengelola diskon, kupon, dan penyesuaian harga paket subscription khusus.'
    ]
  },
  {
    roleName: 'PLATFORM_INFRASTRUCTURE',
    description: 'Tim teknis infrastruktur yang bertanggung jawab atas keamanan server, database, dan integrasi perangkat keras absensi.',
    tasks: [
      'Mengelola mesin server, backup database terjadwal, dan pemulihan data (restore).',
      'Mengintegrasikan dan memantau perangkat keras absensi gerbang RFID/Face Recognition.',
      'Mengawasi status koneksi PPPoE/Mikrotik di lingkungan sekolah tenant.'
    ]
  },
  {
    roleName: 'ADMIN',
    description: 'Pengendali utama sistem Absenta.id di tingkat sekolah yang mengonfigurasi data master sekolah.',
    tasks: [
      'Mengonfigurasi jam masuk-pulang sekolah, toleransi keterlambatan, dan kalender akademik.',
      'Mengelola akun pengguna (Guru, Siswa, Orang Tua, Tata Usaha).',
      'Mengatur hak akses (capabilities) dan penugasan jabatan struktur organisasi.'
    ]
  },
  {
    roleName: 'GURU',
    description: 'Tenaga pendidik yang melakukan kegiatan belajar mengajar dan pencatatan kehadiran siswa.',
    tasks: [
      'Melakukan presensi kehadiran siswa di kelas secara real-time.',
      'Mengisi agenda kelas, materi pelajaran, dan jurnal supervisi guru.',
      'Mencatat dan memantau progres kurikulum mata pelajaran masing-masing.'
    ]
  },
  {
    roleName: 'SISWA',
    description: 'Murid terdaftar yang mengikuti kegiatan belajar mengajar di sekolah.',
    tasks: [
      'Melakukan absensi masuk/pulang di mesin gerbang atau menggunakan kartu RFID/wajah.',
      'Melihat rekap kehadiran harian, poin pelanggaran, dan jadwal kelas.',
      'Mengajukan izin keluar kelas atau izin PKL secara mandiri di aplikasi.'
    ]
  },
  {
    roleName: 'ORANG_TUA',
    description: 'Orang tua atau wali murid yang memantau rekam jejak kehadiran dan ketertiban siswa di sekolah.',
    tasks: [
      'Menerima notifikasi WhatsApp real-time kehadiran anak saat masuk dan pulang.',
      'Mengevaluasi rekap absensi berkala dan poin pelanggaran disiplin anak.',
      'Mengonfirmasi dan menandatangani surat izin sakit/keperluan anak.'
    ]
  },
  {
    roleName: 'TATA_USAHA',
    description: 'Staf administrasi sekolah yang menangani persuratan, kepegawaian, dan rekap operasional.',
    tasks: [
      'Menginput data induk kepegawaian (Guru/Staf) dan Kesiswaan.',
      'Mengelola administrasi surat masuk, surat keluar, dan arsip digital sekolah.',
      'Membantu verifikasi rekap absensi bulanan sekolah.'
    ]
  }
];

// Data Jobdesk Dasar untuk 15 Jabatan Kanonik Struktur Organisasi
const POSITION_JOBDESK_DEFAULTS: Record<string, { description: string; tasks: string[] }> = {
  KEPALA_SEKOLAH: {
    description: 'Pimpinan tertinggi sekolah yang mengawasi seluruh operasional, administrasi, dan iklim akademik sekolah.',
    tasks: [
      'Mengevaluasi laporan analitik kehadiran guru, staf, dan siswa secara keseluruhan.',
      'Melakukan supervisi akademik dan penilaian kinerja guru di kelas.',
      'Memantau performa keuangan sekolah dan status langganan aplikasi Absenta.id.'
    ]
  },
  KURIKULUM: {
    description: 'Wakil Kepala Sekolah Bidang Kurikulum yang mengelola perencanaan, pelaksanaan, dan evaluasi KBM akademik.',
    tasks: [
      'Menyusun dan membagikan jadwal pelajaran kelas, rombel, dan guru pengampu.',
      'Mengelola daftar mata pelajaran (mapel) dan pembagian jam mengajar guru.',
      'Melakukan supervisi pembelajaran dan memantau progres kurikulum guru di kelas.'
    ]
  },
  KESISWAAN: {
    description: 'Wakil Kepala Sekolah Bidang Kesiswaan yang bertanggung jawab atas kedisiplinan, kesiswaan, dan tata tertib.',
    tasks: [
      'Mengelola jenis pelanggaran, pemberian sanksi, dan akumulasi poin kedisiplinan siswa.',
      'Memonitor rekap kehadiran gerbang siswa dan mengoreksi absensi massal jika diperlukan.',
      'Menyebarkan pengumuman kesiswaan dan memantau izin keluar gerbang sekolah.'
    ]
  },
  HUBIN: {
    description: 'Wakil Kepala Sekolah Bidang Hubungan Industri yang mengelola program kemitraan dunia usaha/industri dan PKL.',
    tasks: [
      'Mengelola kemitraan industri (MOU) dan pemetaan lokasi magang/PKL siswa.',
      'Mengevaluasi rekap kehadiran magang dan memonitor jurnal harian PKL siswa.'
    ]
  },
  SARPRAS: {
    description: 'Wakil Kepala Sekolah Bidang Sarana & Prasarana yang mengelola inventarisasi, peminjaman, dan pemeliharaan fasilitas.',
    tasks: [
      'Mendata kategori, lokasi, dan aset fisik sekolah (gedung, ruang, barang).',
      'Memproses, menyetujui, dan memantau transaksi peminjaman barang inventaris.',
      'Mengelola laporan pengajuan perbaikan dan pemeliharaan berkala sarana sekolah.'
    ]
  },
  TU: {
    description: 'Kepala Tata Usaha yang mengelola administrasi perkantoran, persuratan, kepegawaian, dan billing sekolah.',
    tasks: [
      'Menginput dan mengelola data induk kepegawaian (Guru/Staf) dan Kesiswaan.',
      'Mengelola administrasi surat masuk, surat keluar, dan arsip digital sekolah.',
      'Menerbitkan invoice pembayaran tagihan bulanan dan memantau riwayat transaksi keuangan.'
    ]
  },
  KAPROG: {
    description: 'Ketua Program Keahlian (Kepala Jurusan) yang memantau dan membina KBM di tingkat jurusan masing-masing.',
    tasks: [
      'Memantau ketercapaian target kurikulum dan mengawasi progres mengajar guru di jurusannya.',
      'Memonitor kedisiplinan, kehadiran, dan pelanggaran siswa di tingkat jurusan.'
    ]
  },
  KABENG: {
    description: 'Kepala Bengkel atau Laboratorium tingkat jurusan yang mengelola fasilitas praktikum siswa.',
    tasks: [
      'Mendata dan mengelola inventaris peralatan bengkel atau laboratorium praktikum.',
      'Memantau peminjaman dan pengembalian alat praktikum oleh siswa atau guru.',
      'Melaporkan kerusakan alat dan mengajukan perbaikan sarana bengkel.'
    ]
  },
  BPBK: {
    description: 'Koordinator BP/BK yang menangani bimbingan konseling, karakter, dan pembinaan perilaku psikososial siswa.',
    tasks: [
      'Memantau rekap absensi dan poin pelanggaran siswa untuk mendeteksi dini masalah perilaku.',
      'Melakukan bimbingan konseling dan mencatat histori penanganan kedisiplinan siswa.'
    ]
  },
  BKK: {
    description: 'Ketua Bursa Kerja Khusus yang mengelola program penyaluran tamatan/alumni ke pasar kerja industri.',
    tasks: [
      'Mengelola database mitra industri penyerap tenaga kerja dan memposting lowongan kerja.',
      'Memetakan dan memantau keterserapan alumni di dunia kerja atau perguruan tinggi.'
    ]
  },
  WALIKELAS: {
    description: 'Pendidik yang ditunjuk sebagai wali kelas untuk memantau kehadiran, nilai, dan ketertiban siswa binaan kelas.',
    tasks: [
      'Memonitor rekap kehadiran harian dan bulanan siswa binaan di kelasnya.',
      'Memvalidasi pengajuan surat izin/sakit siswa dan mencatat ketidakhadiran tanpa keterangan.',
      'Memantau poin pelanggaran siswa dan mengoordinasikan pembinaan kepada orang tua.'
    ]
  },
  TOOLMAN: {
    description: 'Petugas teknis bengkel yang membantu merawat peralatan praktikum dan memproses logistik alat.',
    tasks: [
      'Melakukan pengecekan fisik, pembersihan, dan penataan alat praktikum secara harian.',
      'Melayani dan mencatat pengambilan/pengembalian alat praktikum siswa.',
      'Membantu kepala bengkel dalam melakukan audit inventaris dan perbaikan minor alat rusak.'
    ]
  },
  GERBANG: {
    description: 'Petugas piket gerbang yang mendampingi absensi tapping pagi/siang dan melakukan pencatatan manual.',
    tasks: [
      'Memantau dan mengoperasikan mesin tapping RFID atau kamera Face Recognition di gerbang.',
      'Melakukan absensi manual bagi siswa yang mengalami kendala teknis atau kartunya tertinggal.'
    ]
  },
  PETUGAS_KELAS: {
    description: 'Perwakilan siswa piket kelas yang mencatat absensi harian dan mata pelajaran reaktif di kelas.',
    tasks: [
      'Mencatat kehadiran siswa dan jurnal mengajar guru pada setiap jam pelajaran aktif.',
      'Mengirimkan data ketidakhadiran siswa kelas ke guru piket atau admin sekolah.'
    ]
  },
  BENDAHARA_KOPERASI: {
    description: 'Pengurus Koperasi yang bertanggung jawab mengelola keuangan koperasi sekolah dan tabungan siswa.',
    tasks: [
      'Mengelola pendaftaran anggota koperasi dan pencatatan simpanan (pokok, wajib, sukarela).',
      'Memproses dan mengaudit transaksi belanja toko koperasi dan kas keuangan koperasi.',
      'Mengevaluasi laporan sisa hasil usaha (SHU) harian dan bulanan koperasi.'
    ]
  }
};

export async function seedJobdesk() {
  console.log('📋 Memulai proses seeding data Jobdesk Dasar...');

  // 1. Seed Jobdesk untuk Roles
  let seededRolesCount = 0;
  for (const rDefault of ROLE_JOBDESK_DEFAULTS) {
    // Cari semua role dengan nama tersebut (baik global maupun tenant)
    const matchingRoles = await prisma.role.findMany({
      where: {
        name: {
          equals: rDefault.roleName,
          mode: 'insensitive'
        }
      }
    });

    for (const role of matchingRoles) {
      await prisma.roleJobdesk.upsert({
        where: { role_id: role.id },
        update: {
          description: rDefault.description,
          tasks: rDefault.tasks
        },
        create: {
          role_id: role.id,
          description: rDefault.description,
          tasks: rDefault.tasks
        }
      });
      seededRolesCount++;
    }
  }
  console.log(`✅ Berhasil menyelaraskan ${seededRolesCount} data RoleJobdesk.`);

  // 2. Seed Jobdesk untuk Organizational Positions
  let seededPositionsCount = 0;
  const positions = await prisma.organizationalPosition.findMany();

  for (const pos of positions) {
    const defaultData = POSITION_JOBDESK_DEFAULTS[pos.code];
    if (defaultData) {
      await prisma.positionJobdesk.upsert({
        where: { position_id: pos.id },
        update: {
          description: defaultData.description,
          tasks: defaultData.tasks
        },
        create: {
          position_id: pos.id,
          description: defaultData.description,
          tasks: defaultData.tasks
        }
      });
      seededPositionsCount++;
    }
  }
  console.log(`✅ Berhasil menyelaraskan ${seededPositionsCount} data PositionJobdesk.`);
  console.log('📋 Seeding Jobdesk Dasar Selesai 100%.');
}
