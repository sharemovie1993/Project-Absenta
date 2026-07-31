import { PrismaClient } from '@prisma/client';

export async function seedMapelPresets(prisma: PrismaClient) {
  console.log('🌱 Seeding Global Mapel Presets...');

  type PresetItem = { nama_mapel: string; kode_mapel: string; category: string };
  const presetData: { jenjang: string; category: string; nama_mapel: string; kode_mapel: string }[] = [];

  // =====================================================================
  // HELPER
  // =====================================================================
  function push(jenjang: string, items: PresetItem[]) {
    items.forEach(p => presetData.push({ jenjang, category: p.category, nama_mapel: p.nama_mapel, kode_mapel: p.kode_mapel }));
  }

  // Standar muatan lokal riil di Indonesia - Dasar (SD/SMP)
  const mulokDasar: PresetItem[] = [
    { category: 'MULOK', nama_mapel: 'Bahasa Sunda', kode_mapel: 'M-SUNDA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Jawa', kode_mapel: 'M-JAWA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Madura', kode_mapel: 'M-MADURA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Bali', kode_mapel: 'M-BALI' },
    { category: 'MULOK', nama_mapel: 'Pendidikan Lingkungan Hidup (PLH)', kode_mapel: 'M-PLH' },
    { category: 'MULOK', nama_mapel: 'Kepariwisataan / Kebudayaan Lokal', kode_mapel: 'M-WISATA' },
    { category: 'MULOK', nama_mapel: 'Kesenian Daerah', kode_mapel: 'M-SDR' },
  ];

  // Standar muatan lokal riil di Indonesia - Menengah Atas (SMA)
  const mulokMenengahAtas: PresetItem[] = [
    { category: 'MULOK', nama_mapel: 'Bahasa Sunda', kode_mapel: 'M-SUNDA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Jawa', kode_mapel: 'M-JAWA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Madura', kode_mapel: 'M-MADURA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Bali', kode_mapel: 'M-BALI' },
    { category: 'MULOK', nama_mapel: 'Pendidikan Lingkungan Hidup (PLH)', kode_mapel: 'M-PLH' },
    { category: 'MULOK', nama_mapel: 'Kepariwisataan / Kebudayaan Lokal', kode_mapel: 'M-WISATA' },
    { category: 'MULOK', nama_mapel: 'Kesenian Daerah', kode_mapel: 'M-SDR' },
    { category: 'MULOK', nama_mapel: 'Bahasa Jepang', kode_mapel: 'M-JPN' },
    { category: 'MULOK', nama_mapel: 'Bahasa Mandarin', kode_mapel: 'M-ZHO' },
    { category: 'MULOK', nama_mapel: 'Bahasa Jerman', kode_mapel: 'M-DEU' },
  ];

  // Standar muatan lokal riil di Indonesia - Menengah Kejuruan (SMK)
  const mulokMenengahKejuruan: PresetItem[] = [
    { category: 'MULOK', nama_mapel: 'Bahasa Sunda', kode_mapel: 'M-SUNDA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Jawa', kode_mapel: 'M-JAWA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Madura', kode_mapel: 'M-MADURA' },
    { category: 'MULOK', nama_mapel: 'Bahasa Bali', kode_mapel: 'M-BALI' },
    { category: 'MULOK', nama_mapel: 'Kesenian Daerah', kode_mapel: 'M-SDR' },
    { category: 'MULOK', nama_mapel: 'Bahasa Jepang (Penunjang Industri)', kode_mapel: 'M-JPN-IND' },
    { category: 'MULOK', nama_mapel: 'Bahasa Mandarin (Penunjang Industri)', kode_mapel: 'M-ZHO-IND' },
    { category: 'MULOK', nama_mapel: 'Bahasa Korea (Penunjang Industri)', kode_mapel: 'M-KOR-IND' },
  ];

  // Standar Mata Pelajaran Pilihan SMK (MPP per Jurusan)
  const mppPresets: PresetItem[] = [
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan (Umum)', kode_mapel: 'MAPEL-PILIHAN' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - TKJ', kode_mapel: 'MPP-TKJ' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - RPL', kode_mapel: 'MPP-RPL' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - AKL', kode_mapel: 'MPP-AKL' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - TAV', kode_mapel: 'MPP-TAV' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - TKR', kode_mapel: 'MPP-TKR' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - TBSM / TSM', kode_mapel: 'MPP-TBSM' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - TP (Teknik Pemesinan)', kode_mapel: 'MPP-TP' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - DKV', kode_mapel: 'MPP-DKV' },
    { category: 'PILIHAN_SMK', nama_mapel: 'Mata Pelajaran Pilihan - MPLB', kode_mapel: 'MPP-MPLB' },
  ];

  // Standar Konsentrasi Keahlian SMK (KK per Jurusan)
  const kkPresets: PresetItem[] = [
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian (Umum)', kode_mapel: 'KK' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - TKJ', kode_mapel: 'KK-TKJ' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - RPL', kode_mapel: 'KK-RPL' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - AKL', kode_mapel: 'KK-AKL' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - TAV', kode_mapel: 'KK-TAV' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - TKR', kode_mapel: 'KK-TKR' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - TBSM / TSM', kode_mapel: 'KK-TBSM' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - TP (Teknik Pemesinan)', kode_mapel: 'KK-TP' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - DKV', kode_mapel: 'KK-DKV' },
    { category: 'KEJURUAN', nama_mapel: 'Konsentrasi Keahlian - MPLB', kode_mapel: 'KK-MPLB' },
  ];

  // =====================================================================
  // SD / MI
  // =====================================================================
  push('SD', [
    { category: 'UMUM', nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { category: 'UMUM', nama_mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', kode_mapel: 'IPAS' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Musik', kode_mapel: 'SMUS' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Rupa', kode_mapel: 'SRPA' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Tari', kode_mapel: 'STAR' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Teater', kode_mapel: 'STER' },
    ...mulokDasar
  ]);

  push('MI', [
    { category: 'KEAGAMAAN', nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
    { category: 'KEAGAMAAN', nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { category: 'KEAGAMAAN', nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { category: 'UMUM', nama_mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', kode_mapel: 'IPAS' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Musik', kode_mapel: 'SMUS' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Rupa', kode_mapel: 'SRPA' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Tari', kode_mapel: 'STAR' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Teater', kode_mapel: 'STER' },
    ...mulokDasar
  ]);

  // =====================================================================
  // SMP / MTs
  // =====================================================================
  push('SMP', [
    { category: 'UMUM', nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { category: 'UMUM', nama_mapel: 'Ilmu Pengetahuan Alam', kode_mapel: 'IPA' },
    { category: 'UMUM', nama_mapel: 'Ilmu Pengetahuan Sosial', kode_mapel: 'IPS' },
    { category: 'UMUM', nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Musik', kode_mapel: 'SMUS' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Rupa', kode_mapel: 'SRPA' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Tari', kode_mapel: 'STAR' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Teater', kode_mapel: 'STER' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Budidaya', kode_mapel: 'PKBUD' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Kerajinan', kode_mapel: 'PKKRJ' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Rekayasa', kode_mapel: 'PKREKY' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Pengolahan', kode_mapel: 'PKPNG' },
    ...mulokDasar
  ]);

  push('MTs', [
    { category: 'KEAGAMAAN', nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
    { category: 'KEAGAMAAN', nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { category: 'KEAGAMAAN', nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { category: 'UMUM', nama_mapel: 'Ilmu Pengetahuan Alam', kode_mapel: 'IPA' },
    { category: 'UMUM', nama_mapel: 'Ilmu Pengetahuan Sosial', kode_mapel: 'IPS' },
    { category: 'UMUM', nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Musik', kode_mapel: 'SMUS' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Rupa', kode_mapel: 'SRPA' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Tari', kode_mapel: 'STAR' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Teater', kode_mapel: 'STER' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Budidaya', kode_mapel: 'PKBUD' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Kerajinan', kode_mapel: 'PKKRJ' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Rekayasa', kode_mapel: 'PKREKY' },
    { category: 'PRAKARYA_PILIHAN', nama_mapel: 'Prakarya - Pengolahan', kode_mapel: 'PKPNG' },
    ...mulokDasar
  ]);

  // =====================================================================
  // SMA / MA
  // =====================================================================
  push('SMA', [
    { category: 'UMUM', nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { category: 'UMUM', nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { category: 'UMUM_KELAS10', nama_mapel: 'Ilmu Pengetahuan Alam (Terintegrasi)', kode_mapel: 'IPA' },
    { category: 'UMUM_KELAS10', nama_mapel: 'Ilmu Pengetahuan Sosial (Terintegrasi)', kode_mapel: 'IPS' },
    { category: 'UMUM_KELAS10', nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Musik', kode_mapel: 'SMUS' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Rupa', kode_mapel: 'SRPA' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Tari', kode_mapel: 'STAR' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Teater', kode_mapel: 'STER' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Prakarya dan Kewirausahaan', kode_mapel: 'PKWU' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Fisika', kode_mapel: 'FIS' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Kimia', kode_mapel: 'KIM' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Biologi', kode_mapel: 'BIO' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Matematika Tingkat Lanjut', kode_mapel: 'MTK-L' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Informatika', kode_mapel: 'INF-L' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Ekonomi', kode_mapel: 'EKO' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Sosiologi', kode_mapel: 'SOS' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Geografi', kode_mapel: 'GEO' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Antropologi', kode_mapel: 'ANTRO' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Sejarah Tingkat Lanjut', kode_mapel: 'SEJ-L' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Indonesia Tingkat Lanjut', kode_mapel: 'IND-L' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Inggris Tingkat Lanjut', kode_mapel: 'ING-L' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Jepang', kode_mapel: 'JPN' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Mandarin', kode_mapel: 'ZHO' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Jerman', kode_mapel: 'DEU' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Perancis', kode_mapel: 'FRA' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Korea', kode_mapel: 'KOR' },
    { category: 'PILIHAN_TEKNOLOGI', nama_mapel: 'Koding dan Kecerdasan Artifisial', kode_mapel: 'KAI' },
    ...mulokMenengahAtas
  ]);

  push('MA', [
    { category: 'KEAGAMAAN', nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
    { category: 'KEAGAMAAN', nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { category: 'KEAGAMAAN', nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Matematika', kode_mapel: 'MTK' },
    { category: 'UMUM', nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { category: 'UMUM_KELAS10', nama_mapel: 'Ilmu Pengetahuan Alam (Terintegrasi)', kode_mapel: 'IPA' },
    { category: 'UMUM_KELAS10', nama_mapel: 'Ilmu Pengetahuan Sosial (Terintegrasi)', kode_mapel: 'IPS' },
    { category: 'UMUM_KELAS10', nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Musik', kode_mapel: 'SMUS' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Rupa', kode_mapel: 'SRPA' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Tari', kode_mapel: 'STAR' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Seni Teater', kode_mapel: 'STER' },
    { category: 'SENI_PILIHAN', nama_mapel: 'Prakarya dan Kewirausahaan', kode_mapel: 'PKWU' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Fisika', kode_mapel: 'FIS' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Kimia', kode_mapel: 'KIM' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Biologi', kode_mapel: 'BIO' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Matematika Tingkat Lanjut', kode_mapel: 'MTK-L' },
    { category: 'PILIHAN_MIPA', nama_mapel: 'Informatika', kode_mapel: 'INF-L' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Ekonomi', kode_mapel: 'EKO' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Sosiologi', kode_mapel: 'SOS' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Geografi', kode_mapel: 'GEO' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Antropologi', kode_mapel: 'ANTRO' },
    { category: 'PILIHAN_IPS', nama_mapel: 'Sejarah Tingkat Lanjut', kode_mapel: 'SEJ-L' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Indonesia Tingkat Lanjut', kode_mapel: 'IND-L' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Inggris Tingkat Lanjut', kode_mapel: 'ING-L' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Arab Tingkat Lanjut', kode_mapel: 'ARAB-L' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Jepang', kode_mapel: 'JPN' },
    { category: 'PILIHAN_BAHASA', nama_mapel: 'Bahasa Mandarin', kode_mapel: 'ZHO' },
    { category: 'PILIHAN_KEAGAMAAN', nama_mapel: 'Ilmu Tafsir', kode_mapel: 'TAFSIR' },
    { category: 'PILIHAN_KEAGAMAAN', nama_mapel: 'Ilmu Hadis', kode_mapel: 'HADIS' },
    { category: 'PILIHAN_KEAGAMAAN', nama_mapel: 'Ushul Fikih', kode_mapel: 'USHULFQH' },
    { category: 'PILIHAN_TEKNOLOGI', nama_mapel: 'Koding dan Kecerdasan Artifisial', kode_mapel: 'KAI' },
    ...mulokMenengahAtas
  ]);

  // =====================================================================
  // SMK / MAK
  // =====================================================================
  push('SMK', [
    // 1. Mata Pelajaran Umum (Wajib)
    { category: 'UMUM', nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Seni Budaya', kode_mapel: 'SENI' },
    { category: 'UMUM', nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { category: 'UMUM', nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial (IPAS)', kode_mapel: 'IPAS' },
    
    // 2. Mata Pelajaran Kejuruan (Matematika & B.Inggris di SMK masuk kelompok Kejuruan)
    { category: 'KEJURUAN', nama_mapel: 'Matematika (Kejuruan)', kode_mapel: 'MTK-K' },
    { category: 'KEJURUAN', nama_mapel: 'Bahasa Inggris (Kejuruan)', kode_mapel: 'ING-K' },
    { category: 'KEJURUAN', nama_mapel: 'Dasar-dasar Program Keahlian', kode_mapel: 'DDPK' },
    ...kkPresets,

    // 3. Mata Pelajaran Pilihan
    ...mppPresets,
    { category: 'PILIHAN_SMK', nama_mapel: 'Koding dan Kecerdasan Artifisial', kode_mapel: 'KAI' },
    ...mulokMenengahKejuruan
  ]);

  push('MAK', [
    // Keagamaan Wajib
    { category: 'KEAGAMAAN', nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
    { category: 'KEAGAMAAN', nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
    { category: 'KEAGAMAAN', nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
    { category: 'KEAGAMAAN', nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },

    // 1. Mata Pelajaran Umum
    { category: 'UMUM', nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
    { category: 'UMUM', nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
    { category: 'UMUM', nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
    { category: 'UMUM', nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', kode_mapel: 'PJOK' },
    { category: 'UMUM', nama_mapel: 'Seni Budaya', kode_mapel: 'SENI' },
    { category: 'UMUM', nama_mapel: 'Informatika', kode_mapel: 'INF' },
    { category: 'UMUM', nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial (IPAS)', kode_mapel: 'IPAS' },

    // 2. Mata Pelajaran Kejuruan
    { category: 'KEJURUAN', nama_mapel: 'Matematika (Kejuruan)', kode_mapel: 'MTK-K' },
    { category: 'KEJURUAN', nama_mapel: 'Bahasa Inggris (Kejuruan)', kode_mapel: 'ING-K' },
    { category: 'KEJURUAN', nama_mapel: 'Dasar-dasar Program Keahlian', kode_mapel: 'DDPK' },
    ...kkPresets,

    // 3. Mata Pelajaran Pilihan
    ...mppPresets,
    { category: 'PILIHAN_SMK', nama_mapel: 'Koding dan Kecerdasan Artifisial', kode_mapel: 'KAI' },
    ...mulokMenengahKejuruan
  ]);

  // =====================================================================
  // KEJURUAN SMK — per bidang keahlian (jenjang = kode jurusan)
  // =====================================================================
  const kejuruanPresets: Record<string, { nama_mapel: string; kode_mapel: string }[]> = {
    RPL: [
      { nama_mapel: 'Dasar-dasar Pengembangan Perangkat Lunak dan Gim', kode_mapel: 'DAS-RPL' },
      { nama_mapel: 'Konsentrasi Keahlian - Rekayasa Perangkat Lunak', kode_mapel: 'KK-RPL' },
      { nama_mapel: 'Pemrograman Web', kode_mapel: 'WEB-RPL' },
      { nama_mapel: 'Pemrograman Berorientasi Objek', kode_mapel: 'PBO-RPL' },
      { nama_mapel: 'Pemrograman Perangkat Bergerak', kode_mapel: 'MOB-RPL' },
      { nama_mapel: 'Basis Data', kode_mapel: 'DB-RPL' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-RPL' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-RPL' },
    ],
    TKJ: [
      { nama_mapel: 'Dasar-dasar Teknik Jaringan Komputer dan Telekomunikasi', kode_mapel: 'DAS-TKJ' },
      { nama_mapel: 'Konsentrasi Keahlian - Teknik Komputer dan Jaringan', kode_mapel: 'KK-TKJ' },
      { nama_mapel: 'Administrasi Infrastruktur Jaringan', kode_mapel: 'AIJ-TKJ' },
      { nama_mapel: 'Administrasi Sistem Jaringan', kode_mapel: 'ASJ-TKJ' },
      { nama_mapel: 'Teknologi Layanan Jaringan', kode_mapel: 'TLJ-TKJ' },
      { nama_mapel: 'Keamanan Jaringan', kode_mapel: 'SEC-TKJ' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TKJ' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TKJ' },
    ],
    AKL: [
      { nama_mapel: 'Dasar-dasar Akuntansi dan Keuangan Lembaga', kode_mapel: 'DAS-AKL' },
      { nama_mapel: 'Konsentrasi Keahlian - Akuntansi dan Keuangan Lembaga', kode_mapel: 'KK-AKL' },
      { nama_mapel: 'Akuntansi Keuangan', kode_mapel: 'AK-AKL' },
      { nama_mapel: 'Praktik Akuntansi Perusahaan Jasa, Dagang dan Manufaktur', kode_mapel: 'PRAK-AKL' },
      { nama_mapel: 'Komputer Akuntansi', kode_mapel: 'KOMP-AKL' },
      { nama_mapel: 'Administrasi Pajak', kode_mapel: 'PAJAK-AKL' },
      { nama_mapel: 'Akuntansi Lembaga/Instansi Pemerintah', kode_mapel: 'GOV-AKL' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-AKL' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-AKL' },
    ],
    MPLB: [
      { nama_mapel: 'Dasar-dasar Manajemen Perkantoran dan Layanan Bisnis', kode_mapel: 'DAS-MPLB' },
      { nama_mapel: 'Konsentrasi Keahlian - Manajemen Perkantoran dan Layanan Bisnis', kode_mapel: 'KK-MPLB' },
      { nama_mapel: 'Ekonomi Bisnis dan Administrasi Umum', kode_mapel: 'EKBIS-MPLB' },
      { nama_mapel: 'Pengelolaan Kearsipan', kode_mapel: 'ARSIP-MPLB' },
      { nama_mapel: 'Pengelolaan Hubungan Pelanggan', kode_mapel: 'CRM-MPLB' },
      { nama_mapel: 'Otomatisasi Tata Kelola Kepegawaian', kode_mapel: 'PEG-MPLB' },
      { nama_mapel: 'Otomatisasi Tata Kelola Keuangan', kode_mapel: 'KEU-MPLB' },
      { nama_mapel: 'Otomatisasi Tata Kelola Sarana dan Prasarana', kode_mapel: 'SARPAS-MPLB' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-MPLB' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-MPLB' },
    ],
    DKV: [
      { nama_mapel: 'Dasar-dasar Desain Komunikasi Visual', kode_mapel: 'DAS-DKV' },
      { nama_mapel: 'Konsentrasi Keahlian - Desain Komunikasi Visual', kode_mapel: 'KK-DKV' },
      { nama_mapel: 'Desain Grafis Percetakan', kode_mapel: 'GRAF-DKV' },
      { nama_mapel: 'Desain Grafis dan Ilustrasi', kode_mapel: 'ILUS-DKV' },
      { nama_mapel: 'Fotografi dan Videografi', kode_mapel: 'FOTO-DKV' },
      { nama_mapel: 'Komputer Grafis', kode_mapel: 'KOMP-DKV' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-DKV' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-DKV' },
    ],
    TBSM: [
      { nama_mapel: 'Dasar-dasar Otomotif Sepeda Motor', kode_mapel: 'DAS-TBSM' },
      { nama_mapel: 'Konsentrasi Keahlian - Teknik Sepeda Motor', kode_mapel: 'KK-TBSM' },
      { nama_mapel: 'Pemeliharaan Mesin Sepeda Motor', kode_mapel: 'MSN-TBSM' },
      { nama_mapel: 'Pemeliharaan Sasis Sepeda Motor', kode_mapel: 'SSS-TBSM' },
      { nama_mapel: 'Pemeliharaan Kelistrikan Sepeda Motor', kode_mapel: 'KLS-TBSM' },
      { nama_mapel: 'Pengelolaan Bengkel Sepeda Motor', kode_mapel: 'BKL-TBSM' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TBSM' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TBSM' },
    ],
    TKR: [
      { nama_mapel: 'Dasar-dasar Otomotif Kendaraan Ringan', kode_mapel: 'DAS-TKR' },
      { nama_mapel: 'Konsentrasi Keahlian - Teknik Kendaraan Ringan', kode_mapel: 'KK-TKR' },
      { nama_mapel: 'Pemeliharaan Mesin Kendaraan Ringan', kode_mapel: 'MSN-TKR' },
      { nama_mapel: 'Pemeliharaan Sasis dan Pemindah Tenaga Kendaraan Ringan', kode_mapel: 'SSS-TKR' },
      { nama_mapel: 'Pemeliharaan Kelistrikan Kendaraan Ringan', kode_mapel: 'KLS-TKR' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TKR' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TKR' },
    ],
    TP: [
      { nama_mapel: 'Dasar-dasar Teknik Mesin', kode_mapel: 'DAS-TP' },
      { nama_mapel: 'Konsentrasi Keahlian - Teknik Pemesinan', kode_mapel: 'KK-TP' },
      { nama_mapel: 'Gambar Teknik Manufaktur', kode_mapel: 'GTM-TP' },
      { nama_mapel: 'Teknik Pemesinan Bubut', kode_mapel: 'BUBUT-TP' },
      { nama_mapel: 'Teknik Pemesinan Frais', kode_mapel: 'FRAIS-TP' },
      { nama_mapel: 'Teknik Pemesinan Gerinda', kode_mapel: 'GERINDA-TP' },
      { nama_mapel: 'Teknik Pemesinan NC/CNC dan CAM', kode_mapel: 'CNC-TP' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TP' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TP' },
    ],
    PH: [
      { nama_mapel: 'Dasar-dasar Perhotelan', kode_mapel: 'DAS-PH' },
      { nama_mapel: 'Konsentrasi Keahlian - Perhotelan', kode_mapel: 'KK-PH' },
      { nama_mapel: 'Front Office', kode_mapel: 'FO-PH' },
      { nama_mapel: 'Housekeeping', kode_mapel: 'HK-PH' },
      { nama_mapel: 'Laundry', kode_mapel: 'LD-PH' },
      { nama_mapel: 'Food and Beverage Service', kode_mapel: 'FBS-PH' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-PH' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-PH' },
    ],
    KL: [
      { nama_mapel: 'Dasar-dasar Kuliner', kode_mapel: 'DAS-KL' },
      { nama_mapel: 'Konsentrasi Keahlian - Kuliner', kode_mapel: 'KK-KL' },
      { nama_mapel: 'Pengolahan dan Penyajian Makanan', kode_mapel: 'KUL-KL' },
      { nama_mapel: 'Tata Hidang', kode_mapel: 'HIDANG-KL' },
      { nama_mapel: 'Produk Pastry dan Bakery', kode_mapel: 'PASTRY-KL' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-KL' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-KL' },
    ],
    TB: [
      { nama_mapel: 'Dasar-dasar Busana', kode_mapel: 'DAS-TB' },
      { nama_mapel: 'Konsentrasi Keahlian - Tata Busana', kode_mapel: 'KK-TB' },
      { nama_mapel: 'Desain Busana', kode_mapel: 'DESAIN-TB' },
      { nama_mapel: 'Pembuatan Hiasan Busana', kode_mapel: 'HIAS-TB' },
      { nama_mapel: 'Pembuatan Busana Custom Made', kode_mapel: 'CUSTOM-TB' },
      { nama_mapel: 'Pembuatan Busana Industri', kode_mapel: 'IND-TB' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TB' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TB' },
    ],
    TAV: [
      { nama_mapel: 'Dasar-dasar Teknik Elektronika (TAV)', kode_mapel: 'DAS-TAV' },
      { nama_mapel: 'Konsentrasi Keahlian - Teknik Audio Video', kode_mapel: 'KK-TAV' },
      { nama_mapel: 'Penerapan Rangkaian Elektronika', kode_mapel: 'PTE-TAV' },
      { nama_mapel: 'Perencanaan dan Instalasi Sistem Audio', kode_mapel: 'AUDIO-TAV' },
      { nama_mapel: 'Perencanaan dan Instalasi Sistem Video', kode_mapel: 'VIDEO-TAV' },
      { nama_mapel: 'Pemeliharaan dan Perbaikan Peralatan Audio Video', kode_mapel: 'MAINT-TAV' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TAV' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TAV' },
    ],
    TOI: [
      { nama_mapel: 'Dasar-dasar Teknik Elektronika (TOI)', kode_mapel: 'DAS-TOI' },
      { nama_mapel: 'Konsentrasi Keahlian - Teknik Otomasi Industri', kode_mapel: 'KK-TOI' },
      { nama_mapel: 'Sistem Kontrol Elektropneumatik dan Hidrolik', kode_mapel: 'PNEU-TOI' },
      { nama_mapel: 'Piranti Sensor dan Aktuator', kode_mapel: 'SENSOR-TOI' },
      { nama_mapel: 'Sistem Kontrol Berbasis PLC dan SCADA', kode_mapel: 'PLC-TOI' },
      { nama_mapel: 'Instalasi Motor Listrik dan Kontrol Motor', kode_mapel: 'MOTOR-TOI' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TOI' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TOI' },
    ],
  };

  for (const [jenjang, list] of Object.entries(kejuruanPresets)) {
    for (const p of list) {
      presetData.push({ jenjang, category: 'KEJURUAN', nama_mapel: p.nama_mapel, kode_mapel: p.kode_mapel });
    }
  }

  // =====================================================================
  // INSERT / UPSERT
  // =====================================================================
  let count = 0;
  for (const data of presetData) {
    await prisma.globalMapelPreset.upsert({
      where: {
        jenjang_category_kode_mapel: {
          jenjang: data.jenjang,
          category: data.category,
          kode_mapel: data.kode_mapel
        }
      },
      update: { nama_mapel: data.nama_mapel },
      create: {
        jenjang: data.jenjang,
        category: data.category,
        nama_mapel: data.nama_mapel,
        kode_mapel: data.kode_mapel
      }
    });
    count++;
  }

  console.log(`✅ Seeding Global Mapel Presets selesai. Total ${count} records.`);
}

if (require.main === module) {
  const p = new PrismaClient();
  seedMapelPresets(p)
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => p.$disconnect());
}

