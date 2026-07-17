import { PrismaClient } from '@prisma/client';

export async function seedCalendarPresets(prisma: PrismaClient) {
  console.log('🌱 Seeding Global Calendar Presets...');

  // Clear existing presets to ensure a clean update
  await prisma.globalCalendarPreset.deleteMany({});

  const presets = [
    // === ALL LEVELS (ALL) ===
    { jenjang: 'ALL', judul: 'Penerimaan Peserta Didik Baru (PPDB)', jenis: 'KEGIATAN', keterangan: 'Proses pendaftaran, seleksi, dan registrasi siswa baru.' },
    { jenjang: 'ALL', judul: 'Masa Pengenalan Lingkungan Sekolah (MPLS)', jenis: 'KEGIATAN', keterangan: 'Kegiatan orientasi bagi siswa baru untuk mengenal lingkungan sekolah.' },
    { jenjang: 'ALL', judul: 'Penilaian Tengah Semester (PTS) Ganjil', jenis: 'PTS', keterangan: 'Ujian evaluasi tengah semester pertama/ganjil.' },
    { jenjang: 'ALL', judul: 'Penilaian Akhir Semester (PAS) Ganjil / SAS Ganjil', jenis: 'PAS', keterangan: 'Evaluasi belajar akhir semester ganjil.' },
    { jenjang: 'ALL', judul: 'Pembagian Rapor Semester Ganjil', jenis: 'KEGIATAN', keterangan: 'Penyerahan laporan hasil belajar siswa semester ganjil kepada orang tua/wali.' },
    { jenjang: 'ALL', judul: 'Libur Akhir Semester Ganjil', jenis: 'LIBUR_SEKOLAH', keterangan: 'Libur sekolah jeda semester ganjil.' },
    { jenjang: 'ALL', judul: 'Penilaian Tengah Semester (PTS) Genap', jenis: 'PTS', keterangan: 'Ujian evaluasi tengah semester kedua/genap.' },
    { jenjang: 'ALL', judul: 'Penilaian Akhir Tahun (PAT) / SAS Genap', jenis: 'PAS', keterangan: 'Evaluasi belajar akhir tahun ajaran (semester genap).' },
    { jenjang: 'ALL', judul: 'Pembagian Rapor Semester Genap & Kenaikan Kelas', jenis: 'KEGIATAN', keterangan: 'Penyerahan rapor akhir tahun ajaran dan pengumuman kenaikan kelas.' },
    { jenjang: 'ALL', judul: 'Libur Akhir Tahun Ajaran (Semester Genap)', jenis: 'LIBUR_SEKOLAH', keterangan: 'Libur sekolah akhir tahun pelajaran.' },

    // === SD / MI ===
    { jenjang: 'SD', judul: 'Asesmen Nasional Berbasis Komputer (ANBK) SD', jenis: 'KEGIATAN', keterangan: 'Asesmen mutu pendidikan tingkat Sekolah Dasar oleh Kemendikbudristek.' },
    { jenjang: 'SD', judul: 'Ujian Sekolah Akhir Jenjang SD', jenis: 'PAS', keterangan: 'Ujian sekolah penentu kelulusan siswa kelas VI.' },
    { jenjang: 'MI', judul: 'Asesmen Madrasah (AM) MI', jenis: 'PAS', keterangan: 'Ujian akhir jenjang penentu kelulusan siswa kelas VI Madrasah Ibtidaiyah.' },
    { jenjang: 'MI', judul: 'Ujian Praktik Ibadah MI', jenis: 'KEGIATAN', keterangan: 'Ujian praktik ibadah keagamaan bagi siswa kelas VI MI.' },
    { jenjang: 'MI', judul: 'Wisuda Tahfidz dan Pelepasan MI', jenis: 'KEGIATAN', keterangan: 'Acara kelulusan dan apresiasi hafalan Al-Qur\'an siswa MI.' },

    // === SMP / MTS ===
    { jenjang: 'SMP', judul: 'Asesmen Nasional Berbasis Komputer (ANBK) SMP', jenis: 'KEGIATAN', keterangan: 'Asesmen mutu pendidikan tingkat SMP oleh Kemendikbudristek.' },
    { jenjang: 'SMP', judul: 'Ujian Sekolah Akhir Jenjang SMP', jenis: 'PAS', keterangan: 'Ujian penentu kelulusan siswa kelas IX SMP.' },
    { jenjang: 'MTs', judul: 'Asesmen Madrasah (AM) MTs', jenis: 'PAS', keterangan: 'Ujian akhir jenjang penentu kelulusan siswa kelas IX Madrasah Tsanawiyah.' },
    { jenjang: 'MTs', judul: 'Khataman Al-Qur\'an dan Wisuda Tahfidz MTs', jenis: 'KEGIATAN', keterangan: 'Acara wisuda tahfidz Al-Qur\'an bagi siswa kelas IX MTs.' },

    // === SMA / MA ===
    { jenjang: 'SMA', judul: 'Asesmen Nasional Berbasis Komputer (ANBK) SMA', jenis: 'KEGIATAN', keterangan: 'Asesmen mutu pendidikan tingkat SMA oleh Kemendikbudristek.' },
    { jenjang: 'SMA', judul: 'Ujian Sekolah Akhir Jenjang SMA', jenis: 'PAS', keterangan: 'Ujian penentu kelulusan siswa kelas XII SMA.' },
    { jenjang: 'SMA', judul: 'Sosialisasi & Try Out UTBK-SNBT', jenis: 'KEGIATAN', keterangan: 'Persiapan siswa kelas XII menghadapi seleksi masuk perguruan tinggi negeri.' },
    { jenjang: 'MA', judul: 'Asesmen Madrasah (AM) MA', jenis: 'PAS', keterangan: 'Ujian akhir jenjang penentu kelulusan siswa kelas XII Madrasah Aliyah.' },
    { jenjang: 'MA', judul: 'Wisuda Tahfidz Al-Qur\'an MA', jenis: 'KEGIATAN', keterangan: 'Wisuda hafalan Al-Qur\'an bagi siswa kelas XII Madrasah Aliyah.' },

    // === SMK / MAK ===
    { jenjang: 'SMK', judul: 'Asesmen Nasional Berbasis Komputer (ANBK) SMK', jenis: 'KEGIATAN', keterangan: 'Asesmen mutu pendidikan tingkat SMK oleh Kemendikbudristek.' },
    { jenjang: 'SMK', judul: 'Praktik Kerja Lapangan (PKL) / Prakerin Industri', jenis: 'KEGIATAN', keterangan: 'Pelaksanaan praktik kerja industri bagi siswa SMK/MAK.' },
    { jenjang: 'SMK', judul: 'Uji Kompetensi Keahlian (UKK) Kejuruan', jenis: 'KEGIATAN', keterangan: 'Ujian praktik kejuruan standar nasional untuk sertifikasi kompetensi siswa SMK.' },
    { jenjang: 'SMK', judul: 'Uji Sertifikasi Kompetensi (USK) LSP-P1', jenis: 'KEGIATAN', keterangan: 'Sertifikasi kompetensi resmi berlisensi BNSP oleh LSP Pihak Kesatu Sekolah.' },
    { jenjang: 'SMK', judul: 'Asesmen Sekolah / Ujian Akhir Jenjang SMK', jenis: 'PAS', keterangan: 'Ujian kelulusan akhir jenjang sekolah kelas XII / XIII.' },
    { jenjang: 'MAK', judul: 'Asesmen Madrasah (AM) Keagamaan MAK', jenis: 'PAS', keterangan: 'Ujian kelulusan akhir jenjang untuk Madrasah Aliyah Kejuruan.' }
  ];

  for (const preset of presets) {
    await prisma.globalCalendarPreset.create({
      data: preset
    });
  }

  console.log('✅ Global Calendar Presets seeding completed.');
}
