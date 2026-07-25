import { PrismaClient } from '@prisma/client';

export async function seedCalendarPresets(prisma: PrismaClient) {
  console.log('🌱 Seeding Global Calendar Presets...');

  // Clear existing presets to ensure a clean update
  await prisma.globalCalendarPreset.deleteMany({});

  const presets = [
    // === ALL LEVELS (ALL) ===
    { jenjang: 'ALL', judul: 'Penerimaan Siswa Baru (PPDB)', jenis: 'KEGIATAN', keterangan: 'Pendaftaran dan daftar ulang siswa baru.' },
    { jenjang: 'ALL', judul: 'Masa Pengenalan Sekolah (MPLS)', jenis: 'KEGIATAN', keterangan: 'Orientasi dan adaptasi siswa baru.' },
    { jenjang: 'ALL', judul: 'STS Ganjil (Sumatif Tengah Semester)', jenis: 'PTS', keterangan: 'Evaluasi belajar tengah semester ganjil.' },
    { jenjang: 'ALL', judul: 'SAS Ganjil (Sumatif Akhir Semester)', jenis: 'PAS', keterangan: 'Evaluasi belajar akhir semester ganjil.' },
    { jenjang: 'ALL', judul: 'Pembagian Rapor Ganjil', jenis: 'KEGIATAN', keterangan: 'Pembagian laporan hasil belajar semester ganjil.' },
    { jenjang: 'ALL', judul: 'Libur Semester Ganjil', jenis: 'LIBUR_SEKOLAH', keterangan: 'Libur sekolah akhir semester ganjil.' },
    { jenjang: 'ALL', judul: 'STS Genap (Sumatif Tengah Semester)', jenis: 'PTS', keterangan: 'Evaluasi belajar tengah semester genap.' },
    { jenjang: 'ALL', judul: 'SAS Genap (Sumatif Akhir Semester)', jenis: 'PAS', keterangan: 'Evaluasi belajar akhir tahun pelajaran.' },
    { jenjang: 'ALL', judul: 'Pembagian Rapor Genap & Kenaikan Kelas', jenis: 'KEGIATAN', keterangan: 'Pembagian rapor akhir tahun & kenaikan kelas.' },
    { jenjang: 'ALL', judul: 'Libur Akhir Tahun Pelajaran', jenis: 'LIBUR_SEKOLAH', keterangan: 'Libur panjang akhir tahun pelajaran.' },

    // === SD / MI ===
    { jenjang: 'SD', judul: 'ANBK SD (Asesmen Nasional)', jenis: 'KEGIATAN', keterangan: 'Evaluasi mutu sekolah tingkat SD.' },
    { jenjang: 'SD', judul: 'Ujian Kelulusan SD (SAS Akhir)', jenis: 'PAS', keterangan: 'Ujian sekolah akhir untuk kelas 6.' },
    { jenjang: 'MI', judul: 'Asesmen Madrasah MI', jenis: 'PAS', keterangan: 'Ujian kelulusan akhir untuk kelas 6 MI.' },
    { jenjang: 'MI', judul: 'Ujian Praktik Ibadah', jenis: 'KEGIATAN', keterangan: 'Ujian praktik keagamaan kelas 6.' },
    { jenjang: 'MI', judul: 'Wisuda & Pelepasan Siswa MI', jenis: 'KEGIATAN', keterangan: 'Acara perpisahan dan kelulusan siswa.' },

    // === SMP / MTS ===
    { jenjang: 'SMP', judul: 'ANBK SMP (Asesmen Nasional)', jenis: 'KEGIATAN', keterangan: 'Evaluasi mutu sekolah tingkat SMP.' },
    { jenjang: 'SMP', judul: 'Ujian Kelulusan SMP (SAS Akhir)', jenis: 'PAS', keterangan: 'Ujian sekolah akhir untuk kelas 9.' },
    { jenjang: 'MTs', judul: 'Asesmen Madrasah MTs', jenis: 'PAS', keterangan: 'Ujian kelulusan akhir untuk kelas 9 MTs.' },
    { jenjang: 'MTs', judul: 'Khataman & Wisuda Siswa MTs', jenis: 'KEGIATAN', keterangan: 'Acara kelulusan kelas 9.' },

    // === SMA / MA ===
    { jenjang: 'SMA', judul: 'ANBK SMA (Asesmen Nasional)', jenis: 'KEGIATAN', keterangan: 'Evaluasi mutu sekolah tingkat SMA.' },
    { jenjang: 'SMA', judul: 'Ujian Kelulusan SMA (SAS Akhir)', jenis: 'PAS', keterangan: 'Ujian sekolah akhir untuk kelas 12.' },
    { jenjang: 'SMA', judul: 'Try Out & Ujian Masuk PTN', jenis: 'KEGIATAN', keterangan: 'Persiapan masuk perguruan tinggi.' },
    { jenjang: 'MA', judul: 'Asesmen Madrasah MA', jenis: 'PAS', keterangan: 'Ujian kelulusan akhir untuk kelas 12 MA.' },
    { jenjang: 'MA', judul: 'Wisuda Tahfidz MA', jenis: 'KEGIATAN', keterangan: 'Apresiasi hafalan Al-Qur\'an kelas 12.' },

    // === SMK / MAK ===
    { jenjang: 'SMK', judul: 'ANBK SMK (Asesmen Nasional)', jenis: 'KEGIATAN', keterangan: 'Evaluasi mutu sekolah tingkat SMK.' },
    { jenjang: 'SMK', judul: 'Praktik Kerja Lapangan (PKL) / Magang', jenis: 'KEGIATAN', keterangan: 'Magang kerja industri siswa SMK.' },
    { jenjang: 'SMK', judul: 'Uji Kompetensi Keahlian (UKK)', jenis: 'KEGIATAN', keterangan: 'Ujian praktik kejuruan siswa SMK.' },
    { jenjang: 'SMK', judul: 'Uji Sertifikasi LSP (BNSP)', jenis: 'KEGIATAN', keterangan: 'Ujian sertifikasi profesi resmi.' },
    { jenjang: 'SMK', judul: 'Ujian Kelulusan SMK (SAS Akhir)', jenis: 'PAS', keterangan: 'Ujian sekolah akhir untuk kelas 12.' },
    { jenjang: 'MAK', judul: 'Asesmen Madrasah MAK', jenis: 'PAS', keterangan: 'Ujian kelulusan akhir untuk MAK.' }
  ];

  for (const preset of presets) {
    await prisma.globalCalendarPreset.create({
      data: preset
    });
  }

  console.log('✅ Global Calendar Presets seeding completed.');
}
