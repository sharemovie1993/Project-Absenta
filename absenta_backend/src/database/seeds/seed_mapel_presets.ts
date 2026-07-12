import { PrismaClient } from '@prisma/client';

export async function seedMapelPresets(prisma: PrismaClient) {
  console.log('🌱 Seeding Global Mapel Presets...');

  const presetData: { jenjang: string; category: string; nama_mapel: string; kode_mapel: string }[] = [];

  // ==========================================
  // CATEGORY: UMUM (MAPEL WAJIB JENJANG)
  // ==========================================
  
  const umumPresets = {
    SD: [
      { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Seni dan Budaya', kode_mapel: 'SENI' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' }
    ],
    MI: [
      { nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
      { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
      { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
      { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
      { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Seni dan Budaya', kode_mapel: 'SENI' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' }
    ],
    SMP: [
      { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Ilmu Pengetahuan Alam', kode_mapel: 'IPA' },
      { nama_mapel: 'Ilmu Pengetahuan Sosial', kode_mapel: 'IPS' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Informatika', kode_mapel: 'INF' },
      { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
    ],
    MTs: [
      { nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
      { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
      { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
      { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
      { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Ilmu Pengetahuan Alam', kode_mapel: 'IPA' },
      { nama_mapel: 'Ilmu Pengetahuan Sosial', kode_mapel: 'IPS' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Informatika', kode_mapel: 'INF' },
      { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
    ],
    SMA: [
      { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
      { nama_mapel: 'Fisika', kode_mapel: 'FIS' },
      { nama_mapel: 'Kimia', kode_mapel: 'KIM' },
      { nama_mapel: 'Biologi', kode_mapel: 'BIO' },
      { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
      { nama_mapel: 'Geografi', kode_mapel: 'GEO' },
      { nama_mapel: 'Ekonomi', kode_mapel: 'EKO' },
      { nama_mapel: 'Sosiologi', kode_mapel: 'SOS' },
      { nama_mapel: 'Informatika', kode_mapel: 'INF' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
    ],
    MA: [
      { nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
      { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
      { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
      { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
      { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
      { nama_mapel: 'Fisika', kode_mapel: 'FIS' },
      { nama_mapel: 'Kimia', kode_mapel: 'KIM' },
      { nama_mapel: 'Biologi', kode_mapel: 'BIO' },
      { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
      { nama_mapel: 'Geografi', kode_mapel: 'GEO' },
      { nama_mapel: 'Ekonomi', kode_mapel: 'EKO' },
      { nama_mapel: 'Sosiologi', kode_mapel: 'SOS' },
      { nama_mapel: 'Informatika', kode_mapel: 'INF' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Seni dan Prakarya', kode_mapel: 'SENI' }
    ],
    SMK: [
      { nama_mapel: 'Pendidikan Agama dan Budi Pekerti', kode_mapel: 'PAIBP' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
      { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Informatika', kode_mapel: 'INF' },
      { nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' }
    ],
    MAK: [
      { nama_mapel: "Al-Qur'an Hadis", kode_mapel: 'QURDIS' },
      { nama_mapel: 'Akidah Akhlak', kode_mapel: 'AKIDAH' },
      { nama_mapel: 'Fikih', kode_mapel: 'FIKIH' },
      { nama_mapel: 'Sejarah Kebudayaan Islam', kode_mapel: 'SKI' },
      { nama_mapel: 'Bahasa Arab', kode_mapel: 'ARAB' },
      { nama_mapel: 'Pendidikan Pancasila', kode_mapel: 'PP' },
      { nama_mapel: 'Bahasa Indonesia', kode_mapel: 'IND' },
      { nama_mapel: 'Matematika', kode_mapel: 'MTK' },
      { nama_mapel: 'Bahasa Inggris', kode_mapel: 'ING' },
      { nama_mapel: 'Sejarah', kode_mapel: 'SEJ' },
      { nama_mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode_mapel: 'PJOK' },
      { nama_mapel: 'Informatika', kode_mapel: 'INF' },
      { nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial', kode_mapel: 'IPAS' }
    ]
  };

  for (const [jenjang, list] of Object.entries(umumPresets)) {
    for (const p of list) {
      presetData.push({
        jenjang,
        category: 'UMUM',
        nama_mapel: p.nama_mapel,
        kode_mapel: p.kode_mapel
      });
    }
  }

  // ==========================================
  // CATEGORY: KEJURUAN (MAPEL PRODUCTIVE JURUSAN)
  // ==========================================

  const kejuruanPresets = {
    RPL: [
      { nama_mapel: 'Dasar-dasar Pengembangan Perangkat Lunak dan Gim', kode_mapel: 'DAS-RPL' },
      { nama_mapel: 'Pemrograman Web', kode_mapel: 'WEB-RPL' },
      { nama_mapel: 'Pemrograman Berorientasi Objek', kode_mapel: 'PBO-RPL' },
      { nama_mapel: 'Pemrograman Perangkat Bergerak', kode_mapel: 'MOB-RPL' },
      { nama_mapel: 'Basis Data', kode_mapel: 'DB-RPL' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-RPL' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-RPL' }
    ],
    TKJ: [
      { nama_mapel: 'Dasar-dasar Teknik Jaringan Komputer dan Telekomunikasi', kode_mapel: 'DAS-TKJ' },
      { nama_mapel: 'Administrasi Infrastruktur Jaringan', kode_mapel: 'AIJ-TKJ' },
      { nama_mapel: 'Administrasi Sistem Jaringan', kode_mapel: 'ASJ-TKJ' },
      { nama_mapel: 'Teknologi Layanan Jaringan', kode_mapel: 'TLJ-TKJ' },
      { nama_mapel: 'Keamanan Jaringan', kode_mapel: 'SEC-TKJ' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TKJ' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TKJ' }
    ],
    AKL: [
      { nama_mapel: 'Dasar-dasar Akuntansi dan Keuangan Lembaga', kode_mapel: 'DAS-AKL' },
      { nama_mapel: 'Akuntansi Keuangan', kode_mapel: 'AK-AKL' },
      { nama_mapel: 'Praktik Akuntansi Perusahaan Jasa, Dagang dan Manufaktur', kode_mapel: 'PRAK-AKL' },
      { nama_mapel: 'Komputer Akuntansi', kode_mapel: 'KOMP-AKL' },
      { nama_mapel: 'Administrasi Pajak', kode_mapel: 'PAJAK-AKL' },
      { nama_mapel: 'Akuntansi Lembaga/Instansi Pemerintah', kode_mapel: 'GOV-AKL' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-AKL' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-AKL' }
    ],
    MPLB: [
      { nama_mapel: 'Dasar-dasar Manajemen Perkantoran dan Layanan Bisnis', kode_mapel: 'DAS-MPLB' },
      { nama_mapel: 'Ekonomi Bisnis dan Administrasi Umum', kode_mapel: 'EKBIS-MPLB' },
      { nama_mapel: 'Pengelolaan Kearsipan', kode_mapel: 'ARSIP-MPLB' },
      { nama_mapel: 'Pengelolaan Hubungan Pelanggan', kode_mapel: 'CRM-MPLB' },
      { nama_mapel: 'Otomatisasi Tata Kelola Kepegawaian', kode_mapel: 'PEG-MPLB' },
      { nama_mapel: 'Otomatisasi Tata Kelola Keuangan', kode_mapel: 'KEU-MPLB' },
      { nama_mapel: 'Otomatisasi Tata Kelola Sarana dan Prasarana', kode_mapel: 'SARPAS-MPLB' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-MPLB' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-MPLB' }
    ],
    DKV: [
      { nama_mapel: 'Dasar-dasar Desain Komunikasi Visual', kode_mapel: 'DAS-DKV' },
      { nama_mapel: 'Desain Grafis Percetakan', kode_mapel: 'GRAF-DKV' },
      { nama_mapel: 'Desain Grafis dan Ilustrasi', kode_mapel: 'ILUS-DKV' },
      { nama_mapel: 'Fotografi dan Videografi', kode_mapel: 'FOTO-DKV' },
      { nama_mapel: 'Komputer Grafis', kode_mapel: 'KOMP-DKV' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-DKV' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-DKV' }
    ],
    TBSM: [
      { nama_mapel: 'Dasar-dasar Otomotif Sepeda Motor', kode_mapel: 'DAS-TBSM' },
      { nama_mapel: 'Pemeliharaan Mesin Sepeda Motor', kode_mapel: 'MSN-TBSM' },
      { nama_mapel: 'Pemeliharaan Sasis Sepeda Motor', kode_mapel: 'SSS-TBSM' },
      { nama_mapel: 'Pemeliharaan Kelistrikan Sepeda Motor', kode_mapel: 'KLS-TBSM' },
      { nama_mapel: 'Pengelolaan Bengkel Sepeda Motor', kode_mapel: 'BKL-TBSM' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TBSM' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TBSM' }
    ],
    TKR: [
      { nama_mapel: 'Dasar-dasar Otomotif Kendaraan Ringan', kode_mapel: 'DAS-TKR' },
      { nama_mapel: 'Pemeliharaan Mesin Kendaraan Ringan', kode_mapel: 'MSN-TKR' },
      { nama_mapel: 'Pemeliharaan Sasis dan Pemindah Tenaga Kendaraan Ringan', kode_mapel: 'SSS-TKR' },
      { nama_mapel: 'Pemeliharaan Kelistrikan Kendaraan Ringan', kode_mapel: 'KLS-TKR' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TKR' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TKR' }
    ],
    TP: [
      { nama_mapel: 'Dasar-dasar Teknik Mesin', kode_mapel: 'DAS-TP' },
      { nama_mapel: 'Gambar Teknik Manufaktur', kode_mapel: 'GTM-TP' },
      { nama_mapel: 'Teknik Pemesinan Bubut', kode_mapel: 'BUBUT-TP' },
      { nama_mapel: 'Teknik Pemesinan Frais', kode_mapel: 'FRAIS-TP' },
      { nama_mapel: 'Teknik Pemesinan Gerinda', kode_mapel: 'GERINDA-TP' },
      { nama_mapel: 'Teknik Pemesinan NC/CNC dan CAM', kode_mapel: 'CNC-TP' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TP' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TP' }
    ],
    PH: [
      { nama_mapel: 'Dasar-dasar Perhotelan', kode_mapel: 'DAS-PH' },
      { nama_mapel: 'Front Office', kode_mapel: 'FO-PH' },
      { nama_mapel: 'Housekeeping', kode_mapel: 'HK-PH' },
      { nama_mapel: 'Laundry', kode_mapel: 'LD-PH' },
      { nama_mapel: 'Food and Beverage Service', kode_mapel: 'FBS-PH' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-PH' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-PH' }
    ],
    KL: [
      { nama_mapel: 'Dasar-dasar Kuliner', kode_mapel: 'DAS-KL' },
      { nama_mapel: 'Pengolahan dan Penyajian Makanan', kode_mapel: 'KUL-KL' },
      { nama_mapel: 'Tata Hidang', kode_mapel: 'HIDANG-KL' },
      { nama_mapel: 'Produk Pastry dan Bakery', kode_mapel: 'PASTRY-KL' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-KL' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-KL' }
    ],
    TB: [
      { nama_mapel: 'Dasar-dasar Busana', kode_mapel: 'DAS-TB' },
      { nama_mapel: 'Desain Busana', kode_mapel: 'DESAIN-TB' },
      { nama_mapel: 'Pembuatan Hiasan Busana', kode_mapel: 'HIAS-TB' },
      { nama_mapel: 'Pembuatan Busana Custom Made', kode_mapel: 'CUSTOM-TB' },
      { nama_mapel: 'Pembuatan Busana Industri', kode_mapel: 'IND-TB' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TB' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TB' }
    ],
    TAV: [
      { nama_mapel: 'Dasar-dasar Teknik Elektronika (TAV)', kode_mapel: 'DAS-TAV' },
      { nama_mapel: 'Penerapan Rangkaian Elektronika', kode_mapel: 'PTE-TAV' },
      { nama_mapel: 'Perencanaan dan Instalasi Sistem Audio', kode_mapel: 'AUDIO-TAV' },
      { nama_mapel: 'Perencanaan dan Instalasi Sistem Video', kode_mapel: 'VIDEO-TAV' },
      { nama_mapel: 'Pemeliharaan dan Perbaikan Peralatan Audio Video', kode_mapel: 'MAINT-TAV' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TAV' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TAV' }
    ],
    TOI: [
      { nama_mapel: 'Dasar-dasar Teknik Elektronika (TOI)', kode_mapel: 'DAS-TOI' },
      { nama_mapel: 'Sistem Kontrol Elektropneumatik dan Hidrolik', kode_mapel: 'PNEU-TOI' },
      { nama_mapel: 'Piranti Sensor dan Aktuator', kode_mapel: 'SENSOR-TOI' },
      { nama_mapel: 'Sistem Kontrol Berbasis PLC dan SCADA', kode_mapel: 'PLC-TOI' },
      { nama_mapel: 'Instalasi Motor Listrik dan Kontrol Motor', kode_mapel: 'MOTOR-TOI' },
      { nama_mapel: 'Projek Kreatif dan Kewirausahaan', kode_mapel: 'PKK-TOI' },
      { nama_mapel: 'Praktik Kerja Lapangan', kode_mapel: 'PKL-TOI' }
    ]
  };

  for (const [jenjang, list] of Object.entries(kejuruanPresets)) {
    for (const p of list) {
      presetData.push({
        jenjang,
        category: 'KEJURUAN',
        nama_mapel: p.nama_mapel,
        kode_mapel: p.kode_mapel
      });
    }
  }

  // Insert into database
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
      update: {
        nama_mapel: data.nama_mapel
      },
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
