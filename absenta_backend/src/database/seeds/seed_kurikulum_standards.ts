import { PrismaClient } from '@prisma/client';

export async function seedKurikulumStandards(prisma: PrismaClient) {
  console.log('🌱 Seeding Global Kurikulum Standards (Permendikbud 12/2024)...');

  type StandardItem = {
    jenjang: string;
    category: string;
    nama_mapel: string;
    kode_mapel: string;
    tingkat: number;
    jp_per_minggu: number;
  };

  const standardsData: StandardItem[] = [];

  // Helper to push items
  function add(
    jenjang: string,
    category: string,
    nama_mapel: string,
    kode_mapel: string,
    tingkat: number,
    jp_per_minggu: number
  ) {
    standardsData.push({ jenjang, category, nama_mapel, kode_mapel, tingkat, jp_per_minggu });
  }

  // =====================================================================
  // 1. SEKOLAH MENENGAH KEJURUAN (SMK) - PROGRAM 3 TAHUN
  // =====================================================================

  // PABP (Pendidikan Agama Islam, Kristen, Katolik, Buddha, Hindu, Khonghucu)
  // Agama has 90 JP/year in X-XI, and 32 JP/year in XII.
  const agamaNames = [
    { nama: 'Pendidikan Agama Islam dan Budi Pekerti', kode: 'PAIBP' },
    { nama: 'Pendidikan Agama Kristen dan Budi Pekerti', kode: 'PAKB' },
    { nama: 'Pendidikan Agama Katolik dan Budi Pekerti', kode: 'PAKTB' },
    { nama: 'Pendidikan Agama Hindu dan Budi Pekerti', kode: 'PAHB' },
    { nama: 'Pendidikan Agama Buddha dan Budi Pekerti', kode: 'PABB' },
    { nama: 'Pendidikan Agama Khonghucu dan Budi Pekerti', kode: 'PAKhB' },
  ];

  agamaNames.forEach(ag => {
    add('SMK', 'UMUM', ag.nama, ag.kode, 10, 3); // 90 JP / 36 weeks = 2.5 (rounded to 3)
    add('SMK', 'UMUM', ag.nama, ag.kode, 11, 3); // 90 JP / 36 weeks = 2.5 (rounded to 3)
    add('SMK', 'UMUM', ag.nama, ag.kode, 12, 2); // 32 JP / 32 weeks = 1 (often taught 2 JP in local configs)
  });

  // Pendidikan Pancasila (SMK)
  add('SMK', 'UMUM', 'Pendidikan Pancasila', 'PP', 10, 2);
  add('SMK', 'UMUM', 'Pendidikan Pancasila', 'PP', 11, 2);
  add('SMK', 'UMUM', 'Pendidikan Pancasila', 'PP', 12, 2);

  // Bahasa Indonesia (SMK)
  add('SMK', 'UMUM', 'Bahasa Indonesia', 'IND', 10, 3); // 108 / 36 = 3 JP
  add('SMK', 'UMUM', 'Bahasa Indonesia', 'IND', 11, 3); // 90 / 36 = 2.5 (rounded to 3)
  add('SMK', 'UMUM', 'Bahasa Indonesia', 'IND', 12, 2); // 32 / 16 = 2 JP (Semester basis)

  // PJOK (SMK)
  add('SMK', 'UMUM', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 'PJOK', 10, 3);
  add('SMK', 'UMUM', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 'PJOK', 11, 2);

  // Sejarah (SMK)
  add('SMK', 'UMUM', 'Sejarah', 'SEJ', 10, 2);

  // Seni Budaya (SMK)
  const seniTypes = ['Seni Musik', 'Seni Rupa', 'Seni Tari', 'Seni Teater'];
  seniTypes.forEach(seni => {
    add('SMK', 'UMUM', seni, 'SENI', 10, 2);
  });

  // Matematika (SMK)
  add('SMK', 'KEJURUAN', 'Matematika', 'MTK', 10, 3); // 108 / 36 = 3 JP
  add('SMK', 'KEJURUAN', 'Matematika', 'MTK', 11, 3); // 90 / 36 = 2.5 (rounded to 3)
  add('SMK', 'KEJURUAN', 'Matematika', 'MTK', 12, 3); // 48 / 16 = 3 JP (Semester basis)

  // Bahasa Inggris (SMK)
  add('SMK', 'KEJURUAN', 'Bahasa Inggris', 'ING', 10, 3); // 108 / 36 = 3 JP
  add('SMK', 'KEJURUAN', 'Bahasa Inggris', 'ING', 11, 3); // 108 / 36 = 3 JP
  add('SMK', 'KEJURUAN', 'Bahasa Inggris', 'ING', 12, 4); // 64 / 16 = 4 JP (Semester basis)

  // Informatika (SMK)
  add('SMK', 'KEJURUAN', 'Informatika', 'INF', 10, 3); // 108 / 36 = 3 JP

  // Projek IPAS (SMK)
  add('SMK', 'KEJURUAN', 'Projek Ilmu Pengetahuan Alam dan Sosial', 'IPAS', 10, 5); // 180 / 36 = 5 JP

  // Dasar-dasar Program Keahlian (SMK)
  add('SMK', 'KEJURUAN', 'Dasar-dasar Program Keahlian', 'DASAR-KEJURUAN', 10, 12);

  // Konsentrasi Keahlian (SMK)
  add('SMK', 'KEJURUAN', 'Konsentrasi Keahlian', 'KK', 11, 18);
  add('SMK', 'KEJURUAN', 'Konsentrasi Keahlian', 'KK', 12, 22); // 352 / 16 = 22 JP (Semester basis)

  // Projek Kreatif dan Kewirausahaan (SMK)
  add('SMK', 'KEJURUAN', 'Projek Kreatif dan Kewirausahaan', 'PKK', 11, 5);
  add('SMK', 'KEJURUAN', 'Projek Kreatif dan Kewirausahaan', 'PKK', 12, 5); // 80 / 16 = 5 JP (Semester basis)

  // Praktik Kerja Lapangan (SMK)
  add('SMK', 'KEJURUAN', 'Praktik Kerja Lapangan', 'PKL', 12, 46); // 736 / 16 = 46 JP (Semester basis)

  // Mata Pelajaran Pilihan (SMK)
  add('SMK', 'PILIHAN', 'Mata Pelajaran Pilihan', 'PILIHAN', 11, 4);
  add('SMK', 'PILIHAN', 'Mata Pelajaran Pilihan', 'PILIHAN', 12, 4); // 64 / 16 = 4 JP (Semester basis)

  // Muatan Lokal (SMK)
  add('SMK', 'MULOK', 'Muatan Lokal', 'MULOK', 10, 2);
  add('SMK', 'MULOK', 'Muatan Lokal', 'MULOK', 11, 2);
  add('SMK', 'MULOK', 'Muatan Lokal', 'MULOK', 12, 2); // 32 / 16 = 2 JP (Semester basis)


  // =====================================================================
  // 2. SEKOLAH MENENGAH ATAS (SMA)
  // =====================================================================

  agamaNames.forEach(ag => {
    add('SMA', 'UMUM', ag.nama, ag.kode, 10, 2);
    add('SMA', 'UMUM', ag.nama, ag.kode, 11, 2);
    add('SMA', 'UMUM', ag.nama, ag.kode, 12, 2);
  });

  // Pendidikan Pancasila (SMA)
  add('SMA', 'UMUM', 'Pendidikan Pancasila', 'PP', 10, 2);
  add('SMA', 'UMUM', 'Pendidikan Pancasila', 'PP', 11, 2);
  add('SMA', 'UMUM', 'Pendidikan Pancasila', 'PP', 12, 2);

  // Bahasa Indonesia (SMA)
  add('SMA', 'UMUM', 'Bahasa Indonesia', 'IND', 10, 3);
  add('SMA', 'UMUM', 'Bahasa Indonesia', 'IND', 11, 3);
  add('SMA', 'UMUM', 'Bahasa Indonesia', 'IND', 12, 3);

  // Matematika (SMA)
  add('SMA', 'UMUM', 'Matematika', 'MTK', 10, 3);
  add('SMA', 'UMUM', 'Matematika', 'MTK', 11, 3);
  add('SMA', 'UMUM', 'Matematika', 'MTK', 12, 3);

  // Bahasa Inggris (SMA)
  add('SMA', 'UMUM', 'Bahasa Inggris', 'ING', 10, 3);
  add('SMA', 'UMUM', 'Bahasa Inggris', 'ING', 11, 3);
  add('SMA', 'UMUM', 'Bahasa Inggris', 'ING', 12, 3);

  // PJOK (SMA)
  add('SMA', 'UMUM', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 'PJOK', 10, 2);
  add('SMA', 'UMUM', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 'PJOK', 11, 2);
  add('SMA', 'UMUM', 'Pendidikan Jasmani, Olahraga, dan Kesehatan', 'PJOK', 12, 2);

  // Sejarah (SMA)
  add('SMA', 'UMUM', 'Sejarah', 'SEJ', 10, 2);
  add('SMA', 'UMUM', 'Sejarah', 'SEJ', 11, 2);
  add('SMA', 'UMUM', 'Sejarah', 'SEJ', 12, 2);

  // Seni Budaya (SMA)
  seniTypes.forEach(seni => {
    add('SMA', 'UMUM', seni, 'SENI', 10, 2);
    add('SMA', 'UMUM', seni, 'SENI', 11, 2);
    add('SMA', 'UMUM', seni, 'SENI', 12, 2);
  });

  // Informatika (SMA)
  add('SMA', 'UMUM', 'Informatika', 'INF', 10, 2);

  // IPA & IPS (SMA Kelas X)
  const ipaIpsMapels = [
    { nama: 'Fisika', kode: 'FIS' },
    { nama: 'Kimia', kode: 'KIM' },
    { nama: 'Biologi', kode: 'BIO' },
    { nama: 'Sosiologi', kode: 'SOS' },
    { nama: 'Ekonomi', kode: 'EKO' },
    { nama: 'Geografi', kode: 'GEO' },
    { nama: 'Antropologi', kode: 'ANTRO' },
  ];

  ipaIpsMapels.forEach(mapel => {
    add('SMA', 'UMUM', mapel.nama, mapel.kode, 10, 2); // Typically 2 JP in X
  });

  // Mapel Pilihan (SMA Kelas XI & XII)
  ipaIpsMapels.forEach(mapel => {
    add('SMA', 'PILIHAN', mapel.nama, mapel.kode, 11, 5); // 5 JP per week in XI
    add('SMA', 'PILIHAN', mapel.nama, mapel.kode, 12, 5); // 5 JP per week in XII
  });

  // =====================================================================
  // INSERT / UPSERT TO DB
  // =====================================================================
  let count = 0;
  for (const st of standardsData) {
    await prisma.globalKurikulumStandard.upsert({
      where: {
        jenjang_kode_mapel_tingkat: {
          jenjang: st.jenjang,
          kode_mapel: st.kode_mapel,
          tingkat: st.tingkat,
        },
      },
      update: {
        nama_mapel: st.nama_mapel,
        jp_per_minggu: st.jp_per_minggu,
        category: st.category,
      },
      create: {
        jenjang: st.jenjang,
        category: st.category,
        nama_mapel: st.nama_mapel,
        kode_mapel: st.kode_mapel,
        tingkat: st.tingkat,
        jp_per_minggu: st.jp_per_minggu,
      },
    });
    count++;
  }

  console.log(`✅ Seeding Global Kurikulum Standards selesai. Total ${count} records.`);
}
