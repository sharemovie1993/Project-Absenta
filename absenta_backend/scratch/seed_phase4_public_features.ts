import { prisma } from '../src/utils/prisma';
import { getRedisConnection } from '../src/infra/redis/redisClient';

const TENANTS = [
  { id: '8535b49c-d3fc-4598-922a-7774b49ee7c5', slug: 'smkn1pld', code: 'SMKN1PLD' },
  { id: '2acb7e12-d264-4784-8262-8f7369061542', slug: 'dev', code: 'SMKDEV' },
];

async function seedPhase4ForTenant(tenantId: string, code: string) {
  console.log(`\n=== Seeding Phase 4 Public Ecosystem for Tenant ${code} (${tenantId}) ===`);

  // 1. Update Jabatan Struktural pada Guru agar Bagan Struktur Organisasi Terisi Lengkap
  const gurus = await prisma.guru.findMany({
    where: { tenant_id: tenantId },
    orderBy: { nama_guru: 'asc' },
    take: 10,
  });

  const structuralRoles = [
    'Wakasek Bidang Kurikulum & Akademik',
    'Wakasek Bidang Hubungan Industri (Hubin) & BKK',
    'Wakasek Bidang Kesiswaan & Karakter',
    'Wakasek Bidang Sarana Prasarana & K3LH',
    'Kepala Subbagian Tata Usaha (KTU)',
    'Kepala Program Keahlian (Kaprog) Teknik Otomotif',
    'Kepala Program Keahlian (Kaprog) Teknologi Informasi',
    'Kepala Bengkel (Kabeng) & Koordinator Teaching Factory',
    'Koordinator Bimbingan Konseling (BK) & Satgas SRA',
  ];

  for (let i = 0; i < Math.min(gurus.length, structuralRoles.length); i++) {
    await prisma.guru.update({
      where: { id: gurus[i].id },
      data: {
        jabatan: structuralRoles[i],
        pendidikan_terakhir: gurus[i].pendidikan_terakhir || (i < 4 ? 'S2 Magister Pendidikan' : 'S1 Pend. Vokasi'),
      },
    });
  }
  console.log(`+ Updated ${Math.min(gurus.length, structuralRoles.length)} Guru structural positions`);

  // 2. Seed DenahSpasial Interaktif Kampus / Sekolah
  const existingDenah = await prisma.denahSpasial.count({
    where: { tenant_id: tenantId, is_active: true },
  });

  if (existingDenah < 3) {
    const denahList = [
      {
        nama_denah: 'Denah Zonasi Gedung Utama Lantai 1 (Layanan Terpadu & Administrasi)',
        gedung: 'Gedung Utama A (Rektorat & Layanan Publik)',
        lantai: 1,
        elements: [
          { id: 'r1', label: 'Lobby Utama & PTSP (Pelayanan Terpadu Satu Pintu)', type: 'SERVICE', capacity: 40, color: '#0284c7', zone: 'Sayap Depan Tengah' },
          { id: 'r2', label: 'Ruang Kepala Sekolah & Ruang Rapat Pimpinan', type: 'OFFICE', capacity: 25, color: '#4f46e5', zone: 'Sayap Kanan' },
          { id: 'r3', label: 'Ruang Tata Usaha (TU) & Layanan Keuangan Komite', type: 'OFFICE', capacity: 20, color: '#0d9488', zone: 'Sayap Kiri' },
          { id: 'r4', label: 'Ruang Wakasek (Kurikulum, Kesiswaan, Hubin, Sarpras)', type: 'OFFICE', capacity: 30, color: '#6366f1', zone: 'Tengah Timur' },
          { id: 'r5', label: 'Ruang Bimbingan Konseling (BK) & Posko Satgas SRA', type: 'COUNSELING', capacity: 15, color: '#ec4899', zone: 'Sayap Barat' },
          { id: 'r6', label: 'Klinik UKS (Usaha Kesehatan Sekolah) & Ruang Laktasi', type: 'HEALTH', capacity: 12, color: '#10b981', zone: 'Sudut Barat Daya' },
          { id: 'r7', label: 'Koperasi Siswa (Kopsis) & Galeri Produk TEFA', type: 'COMMERCE', capacity: 35, color: '#f59e0b', zone: 'Plaza Depan' },
          { id: 'r8', label: 'Masjid Agung Kampus & Pusat Karakter Rohis', type: 'WORSHIP', capacity: 450, color: '#059669', zone: 'Plaza Timur' },
        ],
      },
      {
        nama_denah: 'Denah Zonasi Gedung Akademik Lantai 2 (Smart Classroom & Perpustakaan)',
        gedung: 'Gedung Akademik B (Pusat Pembelajaran & Literasi)',
        lantai: 2,
        elements: [
          { id: 'b1', label: 'Perpustakaan Digital, Ruang Baca & Pojok Literasi OER', type: 'LIBRARY', capacity: 80, color: '#2563eb', zone: 'Sayap Utama Tengah' },
          { id: 'b2', label: 'Lab Komputer, Cloud Server & Cyber Security 01', type: 'LAB', capacity: 36, color: '#7c3aed', zone: 'Sayap Timur 1' },
          { id: 'b3', label: 'Lab Multimedia, Animasi & Studio Podcast Siswa', type: 'LAB', capacity: 36, color: '#9333ea', zone: 'Sayap Timur 2' },
          { id: 'b4', label: 'Smart Classroom R.201 - R.204 (Fase E Kelas X)', type: 'CLASSROOM', capacity: 144, color: '#0284c7', zone: 'Koridor Utara' },
          { id: 'b5', label: 'Smart Classroom R.205 - R.208 (Fase F Kelas XI)', type: 'CLASSROOM', capacity: 144, color: '#0369a1', zone: 'Koridor Selatan' },
          { id: 'b6', label: 'Aula Technopark & Teater Konferensi Industri', type: 'HALL', capacity: 250, color: '#d97706', zone: 'Sayap Barat' },
        ],
      },
      {
        nama_denah: 'Denah Kompleks Workshop Kejuruan, Teaching Factory & LSP-P1',
        gedung: 'Kompleks Workshop & Industri Terpadu C',
        lantai: 1,
        elements: [
          { id: 'w1', label: 'Workshop Otomotif Standar Astra & Dyno Test Bay', type: 'WORKSHOP', capacity: 40, color: '#dc2626', zone: 'Blok Bengkel A' },
          { id: 'w2', label: 'Workshop Pemesinan CNC, Pengelasan & Fabrikasi Logam', type: 'WORKSHOP', capacity: 40, color: '#ea580c', zone: 'Blok Bengkel B' },
          { id: 'w3', label: 'Lab IoT, Mikrokontroler, Otomasi Industri & PLC', type: 'LAB', capacity: 36, color: '#0891b2', zone: 'Blok Bengkel C' },
          { id: 'w4', label: 'Sekretariat Bursa Kerja Khusus (BKK) & Ruang Rekrutmen HRD', type: 'SERVICE', capacity: 50, color: '#4f46e5', zone: 'Gedung Hubin' },
          { id: 'w5', label: 'Tempat Uji Kompetensi (TUK) Terverifikasi LSP-P1 BNSP', type: 'CERTIFICATION', capacity: 60, color: '#059669', zone: 'Gedung Sertifikasi' },
          { id: 'w6', label: 'Gudang Alat Utama (Toolman) & Pos K3LH Bengkel', type: 'SAFETY', capacity: 20, color: '#65a30d', zone: 'Sentral Workshop' },
        ],
      },
    ];

    for (const d of denahList) {
      await prisma.denahSpasial.create({
        data: {
          tenant_id: tenantId,
          nama_denah: d.nama_denah,
          tipe: 'MASTER_SARPRAS',
          gedung: d.gedung,
          lantai: d.lantai,
          canvas_width: 1200,
          canvas_height: 800,
          grid_size: 20,
          elements: d.elements,
          is_active: true,
        },
      });
    }
    console.log(`+ Seeded ${denahList.length} DenahSpasial interactive campus maps`);
  }

  // 3. Seed BahanAjarPreset (Perpustakaan Digital Terbuka / E-Library Modul Ajar)
  const existingPresets = await prisma.bahanAjarPreset.count({
    where: { status: 'PUBLISHED' },
  });

  if (existingPresets < 6) {
    const presets = [
      {
        kode_mapel_ref: 'TKJ-CLOUD-01',
        nama_mapel_ref: 'Administrasi Sistem Jaringan & Cloud Computing',
        fase: 'F',
        tingkat: 11,
        judul_modul: 'Modul Ajar Deep Learning: Arsitektur Server Container, Docker & Keamanan Jaringan Linux',
        deskripsi:
          'Panduan komprehensif instalasi server produksi, konfigurasi firewall, reverse proxy Nginx, dan manajemen container berstandar industri.',
        total_alokasi_jp: 24,
        total_pertemuan: 4,
        pendekatan: 'Project-Based Learning (PjBL) & Deep Learning',
        sumber: 'Tim Pengembang Kurikulum Vokasi & Praktisi Cloud DUDIKA',
        tags: ['Cloud Computing', 'DevOps', 'Cyber Security', 'Fase F'],
      },
      {
        kode_mapel_ref: 'OTO-EFI-02',
        nama_mapel_ref: 'Pemeliharaan Mesin & Sistem Injeksi Elektronik (EFI)',
        fase: 'F',
        tingkat: 11,
        judul_modul: 'Modul Praktikum Standar Industri: Diagnostik ECU Kendaraan Modern & Kalibrasi Sensor Injeksi',
        deskripsi:
          'Jobsheet praktik bengkel berstandar K3LH untuk pembacaan kode kerusakan (DTC) menggunakan Engine Scanner dan analisis gelombang osiloskop.',
        total_alokasi_jp: 36,
        total_pertemuan: 6,
        pendekatan: 'Teaching Factory (TEFA) Work-Based Learning',
        sumber: 'Konsorsium Instruktur Otomotif & Mitra ATPM Resmi',
        tags: ['Otomotif', 'Engine Scanner', 'K3LH Bengkel', 'Standar Industri'],
      },
      {
        kode_mapel_ref: 'RPL-FULLSTACK-03',
        nama_mapel_ref: 'Pemrograman Web & Perangkat Bergerak Modern',
        fase: 'F',
        tingkat: 12,
        judul_modul: 'E-Book & Modul Praktik: Membangun Aplikasi Enterprise Full-Stack dengan TypeScript, React & REST API',
        deskripsi:
          'Materi terbuka persiapan Uji Kompetensi Keahlian (UKK) mencakup perancangan ERD, autentikasi JWT, integrasi pembayaran, dan pengujian otomatis.',
        total_alokasi_jp: 32,
        total_pertemuan: 8,
        pendekatan: 'Problem-Based Learning & Agile Scrum',
        sumber: 'Pusat Sumber Belajar Terbuka (OER) SMK Pusat Keunggulan',
        tags: ['Full-Stack', 'TypeScript', 'Persiapan UKK', 'Rekayasa Perangkat Lunak'],
      },
      {
        kode_mapel_ref: 'PKK-TEFA-04',
        nama_mapel_ref: 'Projek Kreatif dan Kewirausahaan (Inkubator Bisnis)',
        fase: 'F',
        tingkat: 11,
        judul_modul: 'Panduan Inkubasi Startup Siswa: Business Model Canvas (BMC), HPP, HaKI & Digital Branding',
        deskripsi:
          'Modul praktis merancang produk bernilai jual tinggi, penghitungan Harga Pokok Produksi (HPP), desain kemasan, dan strategi pemasaran omnichannel.',
        total_alokasi_jp: 20,
        total_pertemuan: 5,
        pendekatan: 'Entrepreneurial Project Learning',
        sumber: 'Unit Usaha Koperasi & Inkubator Wirausaha Muda SMK',
        tags: ['Kewirausahaan', 'BMC', 'Digital Marketing', 'BMW Wirausaha'],
      },
      {
        kode_mapel_ref: 'UMUM-BING-05',
        nama_mapel_ref: 'Bahasa Inggris Komunikasi Industri & TOEIC Preparation',
        fase: 'F',
        tingkat: 12,
        judul_modul: 'Modul Job Interview, Technical Presentation & Persiapan Sertifikasi Internasional TOEIC/JLPT',
        deskripsi:
          'Latihan intensif penulisan CV berstandar ATS, simulasi wawancara kerja berbahasa asing bersama HRD multinasional, dan korespondensi bisnis.',
        total_alokasi_jp: 16,
        total_pertemuan: 4,
        pendekatan: 'Communicative Language Teaching',
        sumber: 'pusbuk.kemendikdasmen.go.id & Bahasa Industri SMK',
        tags: ['TOEIC Prep', 'Job Interview', 'Global Career', 'Bahasa Inggris Vokasi'],
      },
      {
        kode_mapel_ref: 'DASAR-K3LH-06',
        nama_mapel_ref: 'Dasar-Dasar Kejuruan: Budaya Kerja 5R/5S & K3LH Industri',
        fase: 'E',
        tingkat: 10,
        judul_modul: 'Buku Pedoman Keselamatan Kerja (K3LH), Alat Pelindung Diri (APD) & Budaya Industri 5R (Ringkas, Rapi, Resik, Rawat, Rajin)',
        deskripsi:
          'Fondasi wajib seluruh taruna/siswa kelas X sebelum memasuki laboratorium dan bengkel praktik guna menjamin Zero Accident.',
        total_alokasi_jp: 18,
        total_pertemuan: 3,
        pendekatan: 'Experiential Industrial Culture',
        sumber: 'Tim Penjaminan Mutu & K3LH Sekolah',
        tags: ['Budaya Kerja 5R', 'K3LH', 'Zero Accident', 'Fase E Kelas X'],
      },
    ];

    for (const p of presets) {
      await prisma.bahanAjarPreset.create({
        data: {
          kode_mapel_ref: p.kode_mapel_ref,
          nama_mapel_ref: p.nama_mapel_ref,
          fase: p.fase,
          tingkat: p.tingkat,
          judul_modul: p.judul_modul,
          deskripsi: p.deskripsi,
          total_alokasi_jp: p.total_alokasi_jp,
          total_pertemuan: p.total_pertemuan,
          pendekatan: p.pendekatan,
          sumber: p.sumber,
          url_sumber: 'https://buku.kemdikbud.go.id',
          tags: p.tags,
          konten_json: { bab: ['Pendahuluan & Tujuan Pembelajaran', 'Materi Inti & Jobsheet Praktik', 'Asesmen Formatif & Sumatif'] },
          status: 'PUBLISHED',
        },
      });
    }
    console.log(`+ Seeded ${presets.length} BahanAjarPreset Open E-Library items`);
  }

  // 4. Seed Koperasi Sekolah & E-Catalog Unit Usaha Siswa (ProductCategory & Product)
  const categories = [
    { code: 'SERAGAM', name: 'Atribut & Seragam Resmi Sekolah', order: 1 },
    { code: 'WEARPACK', name: 'Wearpack Praktik & APD Bengkel K3LH', order: 2 },
    { code: 'KIT-PRAKTIK', name: 'Starter Kit Praktikum & Modul Vokasi', order: 3 },
    { code: 'MERCH-TEFA', name: 'Karya Siswa & Merchandise Resmi', order: 4 },
  ];

  const catMap = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.productCategory.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: c.code,
        },
      },
      update: { name: c.name, order: c.order, isActive: true },
      create: {
        tenantId,
        code: c.code,
        name: c.name,
        order: c.order,
        isActive: true,
      },
    });
    catMap.set(c.code, cat.name);
  }

  const existingProducts = await prisma.product.count({
    where: { tenantId, showInTransaction: true },
  });

  if (existingProducts < 6) {
    const products = [
      {
        code: `KOP-SRG-01-${code}`,
        name: 'Paket Atribut Lengkap Siswa Baru (Dasi, Topi, Sabuk Berlogo, Badge Lokasi & Nama)',
        price: 85000,
        stock: 150,
        unit: 'Paket',
        category: catMap.get('SERAGAM') || 'Seragam',
        description: 'Paket atribut resmi bordir komputer presisi sesuai pedoman tata tertib peserta didik.',
      },
      {
        code: `KOP-SRG-02-${code}`,
        name: 'Kain Seragam Batik Khas Identitas Sekolah (Bahan Katun Primisima Adem 2 Meter)',
        price: 115000,
        stock: 120,
        unit: 'Potong',
        category: catMap.get('SERAGAM') || 'Seragam',
        description: 'Motif batik resmi sekolah dengan filosofi kearifan lokal dan teknologi.',
      },
      {
        code: `KOP-WPK-01-${code}`,
        name: 'Wearpack Safety Praktik Kejuruan Standar K3LH (Bahan American Drill + Scotlight)',
        price: 185000,
        stock: 95,
        unit: 'Stel',
        category: catMap.get('WEARPACK') || 'Wearpack Praktik',
        description: 'Baju kerja praktik bengkel tahan gesekan dilengkapi reflektor cahaya dan emblem K3LH.',
      },
      {
        code: `KOP-WPK-02-${code}`,
        name: 'Kacamata Safety & Sarung Tangan Pelindung Praktik Laboratorium / Workshop',
        price: 45000,
        stock: 200,
        unit: 'Set',
        category: catMap.get('WEARPACK') || 'Wearpack Praktik',
        description: 'Alat Pelindung Diri (APD) standar personal untuk praktik pengelasan, jaringan, dan otomotif.',
      },
      {
        code: `KOP-KIT-01-${code}`,
        name: 'Starter Kit Mikrokontroler ESP32 IoT, Breadboard & Paket Sensor Praktikum',
        price: 145000,
        stock: 60,
        unit: 'Box Kit',
        category: catMap.get('KIT-PRAKTIK') || 'Starter Kit Praktikum',
        description: 'Kit pembelajaran elektronika, pemrograman IoT, dan projek rekayasa teknologi P5.',
      },
      {
        code: `KOP-KIT-02-${code}`,
        name: 'Buku Jurnal Kegiatan PKL Industri & Portofolio Kompetensi Siswa (Hardcover)',
        price: 35000,
        stock: 180,
        unit: 'Eksemplar',
        category: catMap.get('KIT-PRAKTIK') || 'Starter Kit Praktikum',
        description: 'Buku log pendamping sistem jurnal PKL digital untuk tanda tangan instruktur DUDIKA.',
      },
    ];

    for (const prod of products) {
      await prisma.product.create({
        data: {
          tenantId,
          code: prod.code,
          name: prod.name,
          price: prod.price,
          costPrice: Math.round(prod.price * 0.8),
          stock: prod.stock,
          minStock: 10,
          unit: prod.unit,
          category: prod.category,
          description: prod.description,
          showInTransaction: true,
        },
      });
    }
    console.log(`+ Seeded ${products.length} Koperasi Sekolah public catalog items`);
  }

  // 5. Seed Sample Trackable Tickets (PTSP-20261109-DEMO & SRA-20261109-DEMO)
  const demoPtspCode = 'PTSP-20261109-DEMO';
  const existingPtsp = await prisma.logAksesGerbang.findFirst({
    where: { tenant_id: tenantId, token_input: demoPtspCode },
  });

  if (!existingPtsp) {
    const now = new Date();
    await prisma.logAksesGerbang.create({
      data: {
        tenant_id: tenantId,
        tanggal: now,
        tipe_orang: 'TAMU',
        nama_snapshot: 'Ir. Bambang Suryono, M.Eng.',
        nama_tamu: 'Ir. Bambang Suryono, M.Eng.',
        instansi_tamu: 'Divisi HRD & Vokasional PT Astra Otoparts Tbk',
        keperluan_tamu: 'Penandatanganan Perluasan MoU Kelas Industri & Penyerapan Lulusan 2026',
        kontak_tamu: '0812-9988-7766',
        pejabat_dituju: 'Kepala Sekolah & Wakasek Hubin / BKK',
        kategori_buku: 'UMUM',
        arah: 'MASUK',
        waktu_akses: now,
        metode_verifikasi: 'FORM_TAMU',
        token_input: demoPtspCode,
        titik_pencatat: 'TATA_USAHA',
      },
    });
    console.log(`+ Seeded demo PTSP ticket: ${demoPtspCode}`);
  }

  const demoSraCode = 'SRA-20261109-DEMO';
  const existingSra = await prisma.bullyingReport.findFirst({
    where: { tenant_id: tenantId, victim_name: { contains: demoSraCode } },
  });

  if (!existingSra) {
    await prisma.bullyingReport.create({
      data: {
        tenant_id: tenantId,
        reporter_class: 'SARAN_PUBLIK - Wali Murid / Komite',
        victim_name: `[${demoSraCode}] Pengurus Komite Orang Tua Siswa Kelas XI`,
        details:
          'Usulan penambahan petugas pengatur lalu lintas dan marka Zona Selamat Sekolah (ZoSS) pada jam pulang praktik sore hari.',
        incident_date: new Date(),
        status: 'SELESAI',
      },
    });
    console.log(`+ Seeded demo SRA/Aspirasi ticket: ${demoSraCode}`);
  }
}

async function main() {
  for (const t of TENANTS) {
    await seedPhase4ForTenant(t.id, t.code);
  }

  // Flush Redis cache
  try {
    const redis = getRedisConnection();
    if (redis) {
      const keys = await redis.keys('pub:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`\nFlushed ${keys.length} Redis pub:* cache keys.`);
      }
    }
  } catch (err) {
    console.warn('Redis flush warning:', err);
  }

  console.log('\n=== Phase 4 Seeding Complete! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
