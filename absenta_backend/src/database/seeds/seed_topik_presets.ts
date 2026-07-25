import { PrismaClient } from '@prisma/client';
import { topikSDData } from './topik/seed_topik_sd';
import { topikSMPData } from './topik/seed_topik_smp';
import { topikSMAData } from './topik/seed_topik_sma';
import { topikSMKData } from './topik/seed_topik_smk';
import { topikPAUDSLBData } from './topik/seed_topik_paud_slb_p5';
import { topikMadrasahData } from './topik/seed_topik_madrasah';

export async function seedTopikPresets(prisma: PrismaClient) {
  console.log('🌱 Seeding Global Topik / Materi Pokok Presets (Idempotent & Cross-Referenced Relational Mapping)...');

  // Fetch all existing GlobalMapelPreset and GlobalKurikulumStandard to build lookup maps
  const mapelPresets = await prisma.globalMapelPreset.findMany({
    select: { jenjang: true, nama_mapel: true, kode_mapel: true },
  });

  const kurikulumStandards = await prisma.globalKurikulumStandard.findMany({
    select: { jenjang: true, nama_mapel: true, kode_mapel: true },
  });

  const mapelLookupMap = new Map<string, string>();

  // Populate from GlobalMapelPreset
  for (const m of mapelPresets) {
    mapelLookupMap.set(`${m.jenjang}_${m.nama_mapel}`.toLowerCase(), m.kode_mapel);
    mapelLookupMap.set(m.nama_mapel.toLowerCase(), m.kode_mapel);
  }

  // Populate from GlobalKurikulumStandard
  for (const k of kurikulumStandards) {
    if (!mapelLookupMap.has(`${k.jenjang}_${k.nama_mapel}`.toLowerCase())) {
      mapelLookupMap.set(`${k.jenjang}_${k.nama_mapel}`.toLowerCase(), k.kode_mapel);
    }
    if (!mapelLookupMap.has(k.nama_mapel.toLowerCase())) {
      mapelLookupMap.set(k.nama_mapel.toLowerCase(), k.kode_mapel);
    }
  }

  // Known Alias Code Mappings for 100% Interconnection
  const aliasMap: Record<string, string> = {
    'matematika': 'MTK',
    'matematika tingkat lanjut': 'MTK-TL',
    'bahasa indonesia': 'IND',
    'bahasa inggris': 'ING',
    'pendidikan pancasila': 'PP',
    'ipa': 'IPA',
    'ilmu pengetahuan alam': 'IPA',
    'ips': 'IPS',
    'ilmu pengetahuan sosial': 'IPS',
    'ipas': 'IPAS',
    'pjok': 'PJOK',
    'pendidikan jasmani, olahraga, dan kesehatan': 'PJOK',
    'fisika': 'FIS',
    'biologi': 'BIO',
    'kimia': 'KIM',
    'ekonomi': 'EKO',
    'geografi': 'GEO',
    'sosiologi': 'SOS',
    'sejarah': 'SEJ',
    'informatika': 'INF',
    'rekayasa perangkat lunak': 'RPL',
    'pengembangan gim': 'GIM',
    'teknik komputer dan jaringan': 'TKJ',
    'desain komunikasi visual': 'DKV',
    'teknik kendaraan ringan': 'TKR',
    'teknik sepeda motor': 'TSM',
    'akuntansi dan keuangan lembaga': 'AKL',
    'manajemen perkantoran': 'MPLB',
    'kuliner': 'KUL',
    'usaha layanan pariwisata': 'PAR',
    'teknik pemesinan': 'TP',
    'teknik instalasi tenaga listrik': 'TITL',
    'al-qur\'an hadis': 'QURHAD',
    'akidah akhlak': 'AKIDAH',
    'fikih': 'FIKIH',
    'sejarah kebudayaan islam': 'SKI',
    'bahasa arab': 'ARAB',
    'ushul fikih': 'USHUL',
    'p5': 'P5',
    'bahasa sunda': 'M-SUNDA',
    'bahasa jawa': 'M-JAWA',
    'bahasa bali': 'M-BALI',
  };

  // Resolver Helper
  function resolveKodeMapel(jenjang: string, namaMapel: string): string {
    const keyExact = `${jenjang}_${namaMapel}`.toLowerCase();
    if (mapelLookupMap.has(keyExact)) return mapelLookupMap.get(keyExact)!;

    const keyGeneric = namaMapel.toLowerCase();
    if (mapelLookupMap.has(keyGeneric)) return mapelLookupMap.get(keyGeneric)!;

    if (aliasMap[keyGeneric]) return aliasMap[keyGeneric];

    // Default fallback generator
    return namaMapel.substring(0, 5).toUpperCase().replace(/\s+/g, '');
  }

  // Combine all modular datasets
  const rawTopics = [
    ...topikSDData,
    ...topikSMPData,
    ...topikSMAData,
    ...topikSMKData,
    ...topikPAUDSLBData,
    ...topikMadrasahData,
  ];

  // Deduplicate in memory by (jenjang + nama_mapel + judul_topik)
  const uniqueMap = new Map<string, typeof rawTopics[0]>();
  for (const item of rawTopics) {
    const key = `${item.jenjang}_${item.nama_mapel}_${item.judul_topik}`.toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }
  const topicsData = Array.from(uniqueMap.values());

  // Idempotent UPSERT into GlobalTopikPreset + Interconnected Kode Mapel Linking
  let count = 0;
  for (const topic of topicsData) {
    const kodeMapel = resolveKodeMapel(topic.jenjang, topic.nama_mapel);

    await prisma.globalTopikPreset.upsert({
      where: {
        jenjang_nama_mapel_judul_topik: {
          jenjang: topic.jenjang,
          nama_mapel: topic.nama_mapel,
          judul_topik: topic.judul_topik,
        },
      },
      update: {
        kode_mapel: kodeMapel,
        fase: topic.fase || null,
        tingkat: topic.tingkat || null,
        deskripsi: topic.deskripsi || null,
        kategori: topic.kategori || 'UMUM',
      },
      create: {
        jenjang: topic.jenjang,
        nama_mapel: topic.nama_mapel,
        kode_mapel: kodeMapel,
        fase: topic.fase || null,
        tingkat: topic.tingkat || null,
        judul_topik: topic.judul_topik,
        deskripsi: topic.deskripsi || null,
        kategori: topic.kategori || 'UMUM',
      },
    });
    count++;
  }

  console.log(`✅ Berhasil [Idempotent Upsert] ${count} Global Topik Presets! (100% Saling Terhubung dengan Kode Mapel Master)`);

  // Seeding Bank Perangkat Ajar Global Platform Library Templates (Idempotent)
  const libraryTemplates = [
    {
      jenjang: 'SMK',
      nama_mapel: 'Rekayasa Perangkat Lunak',
      kode_mapel: 'RPL',
      tingkat: 11,
      fase: 'F',
      jenis: 'MODUL_AJAR',
      judul: 'Modul Ajar Pemrograman Web & RESTful API Frontend (React/Tailwind)',
      topik: 'Pemrograman Web Frontend Sisi Klien (HTML5, CSS3, JavaScript ES6, React/Tailwind)',
      file_url: 'templates/modul_ajar_rpl_web_react.pdf',
      downloads_count: 42,
    },
    {
      jenjang: 'SMK',
      nama_mapel: 'Rekayasa Perangkat Lunak',
      kode_mapel: 'RPL',
      tingkat: 11,
      fase: 'F',
      jenis: 'ATP',
      judul: 'Alur Tujuan Pembelajaran (ATP) Konsentrasi Kejuruan RPL Kelas XI',
      topik: 'Pemrograman Berorientasi Objek (OOP) — Class, Object, Inheritance, Polymorphism',
      file_url: 'templates/atp_rpl_kelas_xi.pdf',
      downloads_count: 38,
    },
    {
      jenjang: 'SMA',
      nama_mapel: 'Matematika',
      kode_mapel: 'MTK',
      tingkat: 10,
      fase: 'E',
      jenis: 'MODUL_AJAR',
      judul: 'Modul Ajar Matematika Kelas X — Eksponen, Logaritma, dan Trigonometri Dasar',
      topik: 'Eksponen dan Logaritma — Sifat-Sifat dan Persamaan',
      file_url: 'templates/modul_ajar_matematika_x.pdf',
      downloads_count: 65,
    },
    {
      jenjang: 'SMA',
      nama_mapel: 'Fisika',
      kode_mapel: 'FIS',
      tingkat: 11,
      fase: 'F',
      jenis: 'MODUL_AJAR',
      judul: 'Modul Ajar Fisika Kelas XI — Kinematika & Dinamika Gerak Newton',
      topik: 'Kinematika Gerak Lurus, Gerak Parabola, dan Gerak Melingkar',
      file_url: 'templates/modul_ajar_fisika_xi.pdf',
      downloads_count: 29,
    },
    {
      jenjang: 'SMP',
      nama_mapel: 'Informatika',
      kode_mapel: 'INF',
      tingkat: 7,
      fase: 'D',
      jenis: 'MODUL_AJAR',
      judul: 'Modul Ajar Informatika Kelas VII — Berpikir Komputasional & Scratch',
      topik: 'Berpikir Komputasional — Algoritma Sederhana dan Decomposisi Problem',
      file_url: 'templates/modul_ajar_informatika_vii.pdf',
      downloads_count: 51,
    },
    {
      jenjang: 'SD',
      nama_mapel: 'IPAS',
      kode_mapel: 'IPAS',
      tingkat: 4,
      fase: 'B',
      jenis: 'MODUL_AJAR',
      judul: 'Modul Ajar IPAS Kelas IV — Ekosistem & Rantai Makanan Makhluk Hidup',
      topik: 'Ekosistem, Rantai Makanan, dan Jaring-Jaring Makanan',
      file_url: 'templates/modul_ajar_ipas_iv.pdf',
      downloads_count: 73,
    },
    {
      jenjang: 'ALL',
      nama_mapel: 'P5',
      kode_mapel: 'P5',
      fase: 'ALL',
      jenis: 'MODUL_PROJEK',
      judul: 'Modul Projek P5 — Gaya Hidup Berkelanjutan: Pengelolaan Sampah Organik Sekolah',
      topik: 'Gaya Hidup Berkelanjutan — Pengelolaan Sampah Organik dan Anorganik di Sekolah',
      file_url: 'templates/modul_p5_gaya_hidup_berkelanjutan.pdf',
      downloads_count: 88,
    },
    {
      jenjang: 'ALL',
      nama_mapel: 'P5',
      kode_mapel: 'P5',
      fase: 'ALL',
      jenis: 'MODUL_PROJEK',
      judul: 'Modul Projek P5 — Suara Demokrasi: Simulasi Pemilu Pelajar & OSIS',
      topik: 'Suara Demokrasi — Pemilihan Ketua OSIS dan Simulasi Pemilu Sekolah',
      file_url: 'templates/modul_p5_suara_demokrasi.pdf',
      downloads_count: 95,
    },
  ];

  for (const lib of libraryTemplates) {
    const existing = await prisma.globalPerangkatAjarLibrary.findFirst({
      where: {
        jenjang: lib.jenjang,
        nama_mapel: lib.nama_mapel,
        jenis: lib.jenis,
        judul: lib.judul,
      },
    });

    if (!existing) {
      await prisma.globalPerangkatAjarLibrary.create({
        data: lib,
      });
    }
  }

  console.log(`✅ Berhasil [Idempotent Seed] ${libraryTemplates.length} Bank Perangkat Ajar Platform Library Templates!`);
}
