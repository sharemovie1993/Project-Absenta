import { PrismaClient } from '@prisma/client';

export async function seedJurusanPresets(prisma: PrismaClient) {
  console.log('🌱 Seeding Global Program & Jurusan Presets...');

  // Clean old presets first to prevent conflicts/duplicates
  await prisma.globalJurusanPreset.deleteMany({});
  await prisma.globalProgramPreset.deleteMany({});

  const presets = [
    // 1. Teknologi Informasi
    {
      bidang_keahlian: 'Teknologi Informasi',
      nama: 'Pengembangan Perangkat Lunak dan Gim',
      kode: 'PPLG',
      singkatan: 'PPLG',
      jurusans: [
        { nama: 'Rekayasa Perangkat Lunak', kode: 'RPL', singkatan: 'RPL' },
        { nama: 'Pengembangan Gim', kode: 'GIM', singkatan: 'GIM' }
      ]
    },
    {
      bidang_keahlian: 'Teknologi Informasi',
      nama: 'Teknik Jaringan Komputer dan Telekomunikasi',
      kode: 'TJKT',
      singkatan: 'TJKT',
      jurusans: [
        { nama: 'Teknik Komputer dan Jaringan', kode: 'TKJ', singkatan: 'TKJ' },
        { nama: 'Teknik Jaringan Akses Telekomunikasi', kode: 'TJAT', singkatan: 'TJAT' }
      ]
    },

    // 2. Seni dan Ekonomi Kreatif
    {
      bidang_keahlian: 'Seni dan Ekonomi Kreatif',
      nama: 'Desain Komunikasi Visual',
      kode: 'DKV',
      singkatan: 'DKV',
      jurusans: [
        { nama: 'Desain Komunikasi Visual', kode: 'DKV_JUR', singkatan: 'DKV' }
      ]
    },
    {
      bidang_keahlian: 'Seni dan Ekonomi Kreatif',
      nama: 'Animasi',
      kode: 'ANIM',
      singkatan: 'ANIM',
      jurusans: [
        { nama: 'Animasi', kode: 'ANIM_JUR', singkatan: 'ANIM' }
      ]
    },
    {
      bidang_keahlian: 'Seni dan Ekonomi Kreatif',
      nama: 'Broadcasting dan Perfilman',
      kode: 'BCP',
      singkatan: 'BCP',
      jurusans: [
        { nama: 'Produksi dan Siaran Program Televisi', kode: 'PSPT', singkatan: 'PSPT' },
        { nama: 'Produksi Film', kode: 'PF', singkatan: 'PF' }
      ]
    },
    {
      bidang_keahlian: 'Seni dan Ekonomi Kreatif',
      nama: 'Busana',
      kode: 'BSN',
      singkatan: 'BSN',
      jurusans: [
        { nama: 'Desain dan Pembuatan Busana', kode: 'DPB', singkatan: 'DPB' }
      ]
    },

    // 3. Teknologi Manufaktur dan Rekayasa
    {
      bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
      nama: 'Teknik Mesin',
      kode: 'TM',
      singkatan: 'TM',
      jurusans: [
        { nama: 'Teknik Pemesinan', kode: 'TPM', singkatan: 'TPM' },
        { nama: 'Teknik Pengelasan', kode: 'TPL', singkatan: 'TPL' },
        { nama: 'Teknik Fabrikasi Logam dan Manufaktur', kode: 'TFLM', singkatan: 'TFLM' }
      ]
    },
    {
      bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
      nama: 'Teknik Otomotif',
      kode: 'TO',
      singkatan: 'TO',
      jurusans: [
        { nama: 'Teknik Kendaraan Ringan', kode: 'TKR', singkatan: 'TKR' },
        { nama: 'Teknik Sepeda Motor', kode: 'TSM', singkatan: 'TSM' },
        { nama: 'Teknik Alat Berat', kode: 'TAB', singkatan: 'TAB' },
        { nama: 'Teknik Ototronik', kode: 'TOTR', singkatan: 'TOTR' },
        { nama: 'Teknik Bodi Kendaraan Ringan', kode: 'TBKR', singkatan: 'TBKR' }
      ]
    },
    {
      bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
      nama: 'Teknik Elektronika',
      kode: 'TE',
      singkatan: 'TE',
      jurusans: [
        { nama: 'Teknik Audio Video', kode: 'TAV', singkatan: 'TAV' },
        { nama: 'Teknik Elektronika Industri', kode: 'TEI', singkatan: 'TEI' },
        { nama: 'Teknik Mekatronika', kode: 'TMEK', singkatan: 'TMEK' },
        { nama: 'Teknik Otomasi Industri', kode: 'TOI', singkatan: 'TOI' }
      ]
    },
    {
      bidang_keahlian: 'Teknologi Manufaktur dan Rekayasa',
      nama: 'Teknik Ketenagalistrikan',
      kode: 'TKL',
      singkatan: 'TKL',
      jurusans: [
        { nama: 'Teknik Instalasi Tenaga Listrik', kode: 'TITL', singkatan: 'TITL' },
        { nama: 'Teknik Jaringan Tenaga Listrik', kode: 'TJTL', singkatan: 'TJTL' }
      ]
    },

    // 4. Bisnis dan Manajemen
    {
      bidang_keahlian: 'Bisnis dan Manajemen',
      nama: 'Akuntansi dan Keuangan Lembaga',
      kode: 'AKL',
      singkatan: 'AKL',
      jurusans: [
        { nama: 'Akuntansi', kode: 'AKT', singkatan: 'AKT' },
        { nama: 'Layanan Perbankan', kode: 'LPB', singkatan: 'LPB' },
        { nama: 'Layanan Perbankan Syariah', kode: 'LPS', singkatan: 'LPS' }
      ]
    },
    {
      bidang_keahlian: 'Bisnis dan Manajemen',
      nama: 'Manajemen Perkantoran dan Layanan Bisnis',
      kode: 'MPLB',
      singkatan: 'MPLB',
      jurusans: [
        { nama: 'Manajemen Perkantoran', kode: 'MP', singkatan: 'MP' },
        { nama: 'Manajemen Logistik', kode: 'MLOG', singkatan: 'MLOG' }
      ]
    },
    {
      bidang_keahlian: 'Bisnis dan Manajemen',
      nama: 'Pemasaran',
      kode: 'PMS',
      singkatan: 'PMS',
      jurusans: [
        { nama: 'Bisnis Digital', kode: 'BD', singkatan: 'BD' },
        { nama: 'Pemasaran', kode: 'PM', singkatan: 'PM' }
      ]
    },

    // 5. Pariwisata
    {
      bidang_keahlian: 'Pariwisata',
      nama: 'Kuliner',
      kode: 'KLN',
      singkatan: 'KLN',
      jurusans: [
        { nama: 'Kuliner', kode: 'KUL', singkatan: 'KUL' }
      ]
    },
    {
      bidang_keahlian: 'Pariwisata',
      nama: 'Perhotelan',
      kode: 'PHT',
      singkatan: 'PHT',
      jurusans: [
        { nama: 'Perhotelan', kode: 'HTL', singkatan: 'HTL' }
      ]
    },
    {
      bidang_keahlian: 'Pariwisata',
      nama: 'Usaha Layanan Pariwisata',
      kode: 'ULP',
      singkatan: 'ULP',
      jurusans: [
        { nama: 'Usaha Layanan Wisata', kode: 'ULW', singkatan: 'ULW' }
      ]
    },
    {
      bidang_keahlian: 'Pariwisata',
      nama: 'Kecantikan dan Spa',
      kode: 'KSP',
      singkatan: 'KSP',
      jurusans: [
        { nama: 'Tata Kecantikan Kulit dan Rambut', kode: 'TKKR', singkatan: 'TKKR' }
      ]
    },

    // 6. Kesehatan dan Pekerjaan Sosial
    {
      bidang_keahlian: 'Kesehatan dan Pekerjaan Sosial',
      nama: 'Layanan Kesehatan',
      kode: 'LK',
      singkatan: 'LK',
      jurusans: [
        { nama: 'Asisten Keperawatan dan Caregiver', kode: 'AKCG', singkatan: 'AKCG' }
      ]
    },
    {
      bidang_keahlian: 'Kesehatan dan Pekerjaan Sosial',
      nama: 'Teknologi Farmasi',
      kode: 'TF',
      singkatan: 'TF',
      jurusans: [
        { nama: 'Farmasi Klinis dan Komunitas', kode: 'FKK', singkatan: 'FKK' },
        { nama: 'Farmasi Industri', kode: 'FI', singkatan: 'FI' }
      ]
    },
    {
      bidang_keahlian: 'Kesehatan dan Pekerjaan Sosial',
      nama: 'Pekerjaan Sosial',
      kode: 'PKS',
      singkatan: 'PKS',
      jurusans: [
        { nama: 'Pekerja Sosial', kode: 'PEKS', singkatan: 'PEKS' }
      ]
    },

    // 7. Agribisnis dan Agriteknologi
    {
      bidang_keahlian: 'Agribisnis dan Agriteknologi',
      nama: 'Agribisnis Tanaman',
      kode: 'AGT',
      singkatan: 'AGT',
      jurusans: [
        { nama: 'Agribisnis Tanaman Pangan dan Hortikultura', kode: 'ATPH', singkatan: 'ATPH' },
        { nama: 'Agribisnis Tanaman Perkebunan', kode: 'ATP', singkatan: 'ATP' }
      ]
    },
    {
      bidang_keahlian: 'Agribisnis dan Agriteknologi',
      nama: 'Agribisnis Ternak',
      kode: 'AGTR',
      singkatan: 'AGTR',
      jurusans: [
        { nama: 'Agribisnis Ternak Ruminansia', kode: 'ATR', singkatan: 'ATR' },
        { nama: 'Agribisnis Ternak Unggas', kode: 'ATU', singkatan: 'ATU' }
      ]
    },
    {
      bidang_keahlian: 'Agribisnis dan Agriteknologi',
      nama: 'Agriteknologi Pengolahan Hasil Pertanian',
      kode: 'APHP',
      singkatan: 'APHP',
      jurusans: [
        { nama: 'Agribisnis Pengolahan Hasil Pertanian', kode: 'APHP_JUR', singkatan: 'APHP' }
      ]
    },

    // 8. Teknologi Konstruksi dan Bangunan
    {
      bidang_keahlian: 'Teknologi Konstruksi dan Bangunan',
      nama: 'Desain Pemodelan dan Informasi Bangunan',
      kode: 'DPIB',
      singkatan: 'DPIB',
      jurusans: [
        { nama: 'Desain Pemodelan dan Informasi Bangunan', kode: 'DPIB_JUR', singkatan: 'DPIB' }
      ]
    },
    {
      bidang_keahlian: 'Teknologi Konstruksi dan Bangunan',
      nama: 'Teknik Konstruksi dan Perumahan',
      kode: 'TKP',
      singkatan: 'TKP',
      jurusans: [
        { nama: 'Teknik Konstruksi dan Perumahan', kode: 'TKP_JUR', singkatan: 'TKP' }
      ]
    }
  ];

  for (const prog of presets) {
    const createdProgram = await prisma.globalProgramPreset.create({
      data: {
        bidang_keahlian: prog.bidang_keahlian,
        nama: prog.nama,
        kode: prog.kode,
        singkatan: prog.singkatan
      }
    });

    for (const jur of prog.jurusans) {
      await prisma.globalJurusanPreset.create({
        data: {
          program_preset_id: createdProgram.id,
          nama: jur.nama,
          kode: jur.kode,
          singkatan: jur.singkatan
        }
      });
    }
  }

  console.log('✅ Global Program & Jurusan Presets seeded successfully.');
}

if (require.main === module) {
  const p = new PrismaClient();
  seedJurusanPresets(p)
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => p.$disconnect());
}

