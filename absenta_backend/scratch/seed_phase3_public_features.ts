import { prisma } from '../src/utils/prisma';
import { getRedisConnection } from '../src/infra/redis/redisClient';

const TENANTS = [
  { id: '8535b49c-d3fc-4598-922a-7774b49ee7c5', slug: 'smkn1pld', code: 'SMKN1PLD' },
  { id: '2acb7e12-d264-4784-8262-8f7369061542', slug: 'dev', code: 'SMKDEV' },
];

async function seedPhase3ForTenant(tenantId: string, code: string) {
  console.log(`\n=== Seeding Phase 3 Public Features for Tenant ${code} (${tenantId}) ===`);

  let tp = await prisma.tahunPelajaran.findFirst({
    where: { tenant_id: tenantId, is_active: true },
  });
  if (!tp) {
    tp = await prisma.tahunPelajaran.create({
      data: {
        tenant_id: tenantId,
        tahun: '2025/2026',
        is_active: true,
      },
    });
  }

  let sem = await prisma.semester.findFirst({
    where: { tenant_id: tenantId, tahun_pelajaran_id: tp.id, is_active: true },
  });
  if (!sem) {
    sem = await prisma.semester.create({
      data: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tp.id,
        nama_semester: 'Genap',
        is_active: true,
      },
    });
  }

  const jurusans = await prisma.jurusan.findMany({ where: { tenant_id: tenantId } });
  const user = await prisma.user.findFirst({ where: { tenant_id: tenantId } });

  // 1. Seed P5Projek (Projek Penguatan Profil Pelajar Pancasila)
  const existingP5 = await prisma.p5Projek.count({ where: { tenant_id: tenantId } });
  if (existingP5 < 3) {
    const p5List = [
      {
        judul: 'Tema Kebekerjaan: Membangun Budaya Kerja Industri 5R/5S & Etika Profesional Global',
        deskripsi:
          'Projek kolaboratif bersama praktisi HRD industri mitra untuk membentuk kesiapan mental, keselamatan kerja K3LH, komunikasi efektif, dan kedisiplinan standar manufaktur Jepang.',
      },
      {
        judul: 'Tema Rekayasa & Teknologi: Inovasi Smart Eco-School & Otomasi Hemat Energi Berbasis IoT',
        deskripsi:
          'Peserta didik merancang prototipe sensor pemantauan kualitas udara, penyiraman tanaman otomatis, dan efisiensi listrik ruang praktik berbasis mikrokontroler.',
      },
      {
        judul: 'Tema Kewirausahaan: Inkubasi Bisnis Muda Vokasi & Digital Marketing Produk Lokal',
        deskripsi:
          'Menggali potensi komoditas lokal Purwakarta & Jawa Barat melalui inovasi kemasan kreatif, produksi prototipe di Teaching Factory, dan pemasaran e-commerce.',
      },
      {
        judul: 'Tema Gaya Hidup Berkelanjutan: Sekolah Hijau Nir-Sampah Plastik (Zero Waste School)',
        deskripsi:
          'Aksi nyata pengelolaan bank sampah terpilah di lingkungan sekolah, pembuatan kompos organik, dan kampanye pengurangan jejak karbon.',
      },
    ];

    for (const p of p5List) {
      await prisma.p5Projek.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tp.id,
          semester_id: sem.id,
          judul: p.judul,
          deskripsi: p.deskripsi,
        },
      });
    }
    console.log(`+ Seeded ${p5List.length} P5Projek items`);
  }

  // 2. Seed Mapel & StrukturKurikulum
  const mapelTemplates = [
    { kode: `PAI-${code}`, nama: 'Pendidikan Agama dan Budi Pekerti', kelompok: 'UMUM', jp: 3, tingkat: 10 },
    { kode: `PPKN-${code}`, nama: 'Pendidikan Pancasila', kelompok: 'UMUM', jp: 2, tingkat: 10 },
    { kode: `BIND-${code}`, nama: 'Bahasa Indonesia', kelompok: 'UMUM', jp: 4, tingkat: 10 },
    { kode: `MTK-${code}`, nama: 'Matematika Vokasi & Terapan', kelompok: 'UMUM', jp: 4, tingkat: 10 },
    { kode: `BING-${code}`, nama: 'Bahasa Inggris Komunikasi Industri', kelompok: 'UMUM', jp: 4, tingkat: 10 },
    { kode: `INF-${code}`, nama: 'Informatika & Literasi Digital', kelompok: 'UMUM', jp: 4, tingkat: 10 },
    { kode: `IPAS-${code}`, nama: 'Projek Ilmu Pengetahuan Alam dan Sosial (IPAS)', kelompok: 'UMUM', jp: 6, tingkat: 10 },
    { kode: `DDK-${code}`, nama: 'Dasar-Dasar Program Keahlian (Produktif Fase E)', kelompok: 'KEJURUAN', jp: 12, tingkat: 10 },
    { kode: `KK11-${code}`, nama: 'Konsentrasi Keahlian Utama (Praktik Bengkel & Lab Fase F)', kelompok: 'KEJURUAN', jp: 18, tingkat: 11 },
    { kode: `PKK11-${code}`, nama: 'Projek Kreatif dan Kewirausahaan (Teaching Factory)', kelompok: 'KEJURUAN', jp: 5, tingkat: 11 },
    { kode: `MPIL-${code}`, nama: 'Mata Pelajaran Pilihan Lintas Disiplin (IoT / Bahasa Jepang)', kelompok: 'PILIHAN', jp: 4, tingkat: 11 },
    { kode: `PKL12-${code}`, nama: 'Praktik Kerja Lapangan (PKL Industri DUDIKA)', kelompok: 'KEJURUAN', jp: 24, tingkat: 12 },
    { kode: `KK12-${code}`, nama: 'Konsentrasi Keahlian Lanjut & Persiapan Sertifikasi UKK', kelompok: 'KEJURUAN', jp: 16, tingkat: 12 },
  ];

  const createdMapels: any[] = [];
  for (let i = 0; i < mapelTemplates.length; i++) {
    const m = mapelTemplates[i];
    const mapel = await prisma.mapel.upsert({
      where: {
        tenant_id_kode_mapel: {
          tenant_id: tenantId,
          kode_mapel: m.kode,
        },
      },
      update: { nama_mapel: m.nama, kelompok_mapel: m.kelompok },
      create: {
        tenant_id: tenantId,
        kode_mapel: m.kode,
        nama_mapel: m.nama,
        tingkat: m.tingkat,
        kelompok_mapel: m.kelompok,
      },
    });
    createdMapels.push({ ...mapel, jp: m.jp, tingkat_target: m.tingkat, kelompok: m.kelompok, urutan: i + 1 });
  }

  const existingStruktur = await prisma.strukturKurikulum.count({ where: { tenant_id: tenantId } });
  if (existingStruktur < 6) {
    for (const cm of createdMapels) {
      await prisma.strukturKurikulum.create({
        data: {
          tenant_id: tenantId,
          mapel_id: cm.id,
          tahun_pelajaran_id: tp.id,
          semester_id: sem.id,
          tingkat: cm.tingkat_target,
          jurusan_id: cm.kelompok === 'KEJURUAN' ? jurusans[0]?.id || null : null,
          jp_per_minggu: cm.jp,
          kelompok: cm.kelompok,
          urutan: cm.urutan,
          is_active: true,
        },
      });
    }
    console.log(`+ Seeded ${createdMapels.length} StrukturKurikulum items`);
  }

  // 3. Seed MasterRuangan & Kelas & JadwalKBM
  const roomTemplates = [
    { nama: 'Lab Komputer & Cloud Server 01', kode: 'LAB-IT-01', jenis: 'LAB', kap: 36 },
    { nama: 'Workshop / Bengkel Standar Industri A', kode: 'WS-IND-A', jenis: 'BENGKEL', kap: 36 },
    { nama: 'Ruang Teori Smart Classroom R.101', kode: 'R-101', jenis: 'TEORI', kap: 36 },
    { nama: 'Ruang Teori Smart Classroom R.102', kode: 'R-102', jenis: 'TEORI', kap: 36 },
    { nama: 'Aula Serbaguna & Technopark', kode: 'AULA-01', jenis: 'AULA', kap: 250 },
  ];

  const createdRooms: any[] = [];
  for (const r of roomTemplates) {
    const room = await prisma.masterRuangan.upsert({
      where: {
        tenant_id_nama_ruangan: {
          tenant_id: tenantId,
          nama_ruangan: r.nama,
        },
      },
      update: { kode_ruangan: r.kode, jenis_ruangan: r.jenis, kapasitas: r.kap },
      create: {
        tenant_id: tenantId,
        nama_ruangan: r.nama,
        kode_ruangan: r.kode,
        jenis_ruangan: r.jenis,
        kapasitas: r.kap,
      },
    });
    createdRooms.push(room);
  }

  let classes = await prisma.kelas.findMany({
    where: { tenant_id: tenantId, is_active: true },
    orderBy: { nama_kelas: 'asc' },
    take: 6,
  });

  if (classes.length === 0) {
    const sampleClasses = [
      { nama: 'X TKJ 1', tingkat: 10 },
      { nama: 'XI TSM 1', tingkat: 11 },
      { nama: 'XII RPL 1', tingkat: 12 },
    ];
    for (const sc of sampleClasses) {
      const k = await prisma.kelas.create({
        data: {
          tenant_id: tenantId,
          nama_kelas: sc.nama,
          tingkat: sc.tingkat,
          jurusan_id: jurusans[0]?.id || null,
          is_active: true,
        },
      });
      classes.push(k);
    }
  }

  // Seed JadwalKBM for the first 3 classes if empty
  for (const kls of classes.slice(0, 3)) {
    const countSch = await prisma.jadwalKBM.count({
      where: { tenant_id: tenantId, kelas_id: kls.id },
    });
    if (countSch === 0 && createdMapels.length >= 5) {
      const days: any[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
      for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const day = days[dIdx];
        const slots = [
          { idx: 1, mulai: '07:15', selesai: '09:30', mapel: createdMapels[dIdx % createdMapels.length], room: createdRooms[0] },
          { idx: 2, mulai: '09:45', selesai: '12:00', mapel: createdMapels[(dIdx + 2) % createdMapels.length], room: createdRooms[1] },
          { idx: 3, mulai: '12:45', selesai: '15:00', mapel: createdMapels[(dIdx + 4) % createdMapels.length], room: createdRooms[2] },
        ];
        for (const sl of slots) {
          await prisma.jadwalKBM.create({
            data: {
              tenant_id: tenantId,
              tahun_pelajaran_id: tp.id,
              semester_id: sem.id,
              kelas_id: kls.id,
              hari: day,
              slot_index: sl.idx,
              jam_mulai: sl.mulai,
              jam_selesai: sl.selesai,
              mapel_id: sl.mapel.id,
              guru_id: null,
              ruangan_id: sl.room.id,
              jenis_kegiatan: 'KBM',
            },
          }).catch(() => {});
        }
      }
      console.log(`+ Seeded weekly JadwalKBM for class ${kls.nama_kelas}`);
    }
  }

  // 4. Seed SuratKeluar Public PPID Documents
  const existingSurat = await prisma.suratKeluar.count({
    where: {
      tenant_id: tenantId,
      kategori_surat: { in: ['Edaran', 'Pengumuman', 'Pedoman', 'PPID'] },
    },
  });

  if (existingSurat < 4) {
    const ppidDocs = [
      {
        nomor_surat: `421.5/014/PPID-${code}/2026`,
        judul: 'Dokumen Kurikulum Operasional Satuan Pendidikan (KOSP) & Struktur Kurikulum Merdeka TP 2025/2026',
        kategori_surat: 'Pedoman',
        isi_ringkas:
          'Pedoman resmi penyelenggaraan akademik, struktur jam pelajaran, penilaian e-Rapor, dan penyelarasan kurikulum bersama DUDIKA.',
        dokumen_url: '#unduh-kosp',
      },
      {
        nomor_surat: `421.5/028/KESISWAAN-${code}/2026`,
        judul: 'Buku Saku Tata Tertib Peserta Didik, Budaya Positif & Pedoman Sekolah Ramah Anak (SRA)',
        kategori_surat: 'Pedoman',
        isi_ringkas:
          'Panduan etika, atribut seragam harian/praktik, sistem poin penghargaan prestasi, dan perlindungan peserta didik bebas perundungan.',
        dokumen_url: '#unduh-tatib',
      },
      {
        nomor_surat: `421.5/042/HUBIN-${code}/2026`,
        judul: 'Panduan Teknis Pelaksanaan Praktik Kerja Lapangan (PKL) & Sertifikasi Kompetensi UKK LSP-P1',
        kategori_surat: 'Edaran',
        isi_ringkas:
          'Prosedur keberangkatan PKL industri, pengisian jurnal presensi geofencing Absenta, serta skema uji sertifikasi profesi.',
        dokumen_url: '#unduh-panduan-pkl',
      },
      {
        nomor_surat: `422.1/089/PPDB-${code}/2026`,
        judul: 'Brosur Resmi & Petunjuk Teknis Penerimaan Peserta Didik Baru (PPDB) Jalur Prestasi, Afirmasi & Reguler',
        kategori_surat: 'Pengumuman',
        isi_ringkas:
          'Informasi daya tampung rombongan belajar, persyaratan berkas pendaftaran, jadwal seleksi, dan bebas biaya pendaftaran.',
        dokumen_url: '#unduh-juknis-ppdb',
      },
    ];

    for (const doc of ppidDocs) {
      await prisma.suratKeluar.create({
        data: {
          tenant_id: tenantId,
          nomor_surat: doc.nomor_surat,
          judul: doc.judul,
          tujuan_surat: 'Wali Murid, Peserta Didik & Masyarakat Umum',
          kategori_surat: doc.kategori_surat,
          isi_ringkas: doc.isi_ringkas,
          dokumen_url: doc.dokumen_url,
          status: 'DIKIRIM',
          created_by_id: user?.id || null,
        },
      });
    }
    console.log(`+ Seeded ${ppidDocs.length} Public PPID Documents (SuratKeluar)`);
  }
}

async function main() {
  for (const t of TENANTS) {
    await seedPhase3ForTenant(t.id, t.code);
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

  console.log('\n=== Phase 3 Seeding Complete! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
