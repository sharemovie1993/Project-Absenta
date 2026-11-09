import { prisma } from '../src/utils/prisma';
import { getRedisConnection } from '../src/infra/redis/redisClient';

const TENANTS = [
  { id: '8535b49c-d3fc-4598-922a-7774b49ee7c5', slug: 'smkn1pld', code: 'SMKN1PLD' },
  { id: '2acb7e12-d264-4784-8262-8f7369061542', slug: 'dev', code: 'SMKDEV' },
];

async function seedPhase2ForTenant(tenantId: string, code: string) {
  console.log(`\n=== Seeding Phase 2 Public Features for Tenant ${code} (${tenantId}) ===`);

  // 1. Ensure active TahunPelajaran & Semester
  let tp = await prisma.tahunPelajaran.findFirst({
    where: { tenant_id: tenantId, is_active: true },
  });
  if (!tp) {
    tp = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });
  }
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
    sem = await prisma.semester.findFirst({ where: { tenant_id: tenantId, tahun_pelajaran_id: tp.id } });
  }
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

  // Get any admin/user for created_by
  const user = await prisma.user.findFirst({ where: { tenant_id: tenantId } });

  // 2. Seed KalenderAkademik
  const existingCalCount = await prisma.kalenderAkademik.count({ where: { tenant_id: tenantId } });
  if (existingCalCount < 4) {
    const calendarEvents = [
      {
        judul: 'Hari Pertama Masuk Sekolah & Apel Pembukaan Semester Genap',
        jenis: 'KEGIATAN_SEKOLAH',
        tanggal_mulai: new Date('2026-01-05'),
        tanggal_selesai: new Date('2026-01-05'),
        keterangan: 'Seluruh siswa dan dewan guru mengikuti apel pagi dan sosialisasi target pembelajaran vokasi.',
      },
      {
        judul: 'Pelaksanaan Praktik Kerja Lapangan (PKL) Gelombang II Industri',
        jenis: 'KEGIATAN_SEKOLAH',
        tanggal_mulai: new Date('2026-01-19'),
        tanggal_selesai: new Date('2026-04-17'),
        keterangan: 'Penerjunan siswa kelas XI/XII pada 45+ perusahaan mitra DUDIKA nasional dan multinasional.',
      },
      {
        judul: 'Asesmen Sumatif Tengah Semester (ASTS) Genap Berbasis CBT',
        jenis: 'UJIAN',
        tanggal_mulai: new Date('2026-03-09'),
        tanggal_selesai: new Date('2026-03-14'),
        keterangan: 'Evaluasi capaian pembelajaran tengah semester menggunakan platform CBT Absenta.',
      },
      {
        judul: 'Uji Kompetensi Keahlian (UKK) Mandiri & LSP-P1 Nasional',
        jenis: 'UJIAN',
        tanggal_mulai: new Date('2026-04-06'),
        tanggal_selesai: new Date('2026-04-18'),
        keterangan: 'Ujian sertifikasi keahlian siswa tingkat akhir bersama asesor eksternal industri.',
      },
      {
        judul: 'Sidang Pleno & Pengumuman Kelulusan Siswa Tingkat Akhir',
        jenis: 'PENGUMUMAN',
        tanggal_mulai: new Date('2026-05-04'),
        tanggal_selesai: new Date('2026-05-05'),
        keterangan: 'Rilis pengumuman kelulusan online melalui Amplop Digital Portal Web Sekolah.',
      },
      {
        judul: 'Gelar Karya P5, Job Fair BKK & Pameran Inovasi Teaching Factory',
        jenis: 'KEGIATAN_SEKOLAH',
        tanggal_mulai: new Date('2026-05-20'),
        tanggal_selesai: new Date('2026-05-22'),
        keterangan: 'Terbuka untuk masyarakat umum, orang tua siswa, dan rekruter HRD perusahaan mitra.',
      },
      {
        judul: 'Pembagian Rapor Kenaikan Kelas & Libur Akhir Tahun Pelajaran',
        jenis: 'LIBUR_AKADEMIK',
        tanggal_mulai: new Date('2026-06-26'),
        tanggal_selesai: new Date('2026-07-11'),
        keterangan: 'Penyerahan e-Rapor Kurikulum Merdeka dan masa jeda akhir tahun pelajaran.',
      },
    ];

    for (const ev of calendarEvents) {
      await prisma.kalenderAkademik.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tp.id,
          judul: ev.judul,
          jenis: ev.jenis,
          tanggal_mulai: ev.tanggal_mulai,
          tanggal_selesai: ev.tanggal_selesai,
          keterangan: ev.keterangan,
          created_by: user?.id || null,
        },
      });
    }
    console.log(`+ Seeded ${calendarEvents.length} KalenderAkademik events`);
  }

  // 3. Seed JenisKegiatanMaster & JadwalKegiatan (Ekskul & Pembiasaan)
  const ekskulData = [
    { nama: 'Apel Pagi & Pembiasaan Sholat Dhuha', tipe: 'PEMBIASAAN' as any, urutan: 1, hari: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'] as any, mulai: '06:45', selesai: '07:15' },
    { nama: 'Pramuka Penegak Bantara (Wajib)', tipe: 'ESKUL' as any, urutan: 2, hari: ['JUMAT'] as any, mulai: '14:00', selesai: '16:30' },
    { nama: 'Paskibra & Ketarunaan Nusantara', tipe: 'ESKUL' as any, urutan: 3, hari: ['RABU', 'SABTU'] as any, mulai: '15:30', selesai: '17:30' },
    { nama: 'Robotics, IoT & Cloud Engineering Club', tipe: 'ESKUL' as any, urutan: 4, hari: ['SELASA', 'KAMIS'] as any, mulai: '15:30', selesai: '17:30' },
    { nama: 'Japanese & English Conversation Club', tipe: 'ESKUL' as any, urutan: 5, hari: ['RABU'] as any, mulai: '15:30', selesai: '17:00' },
    { nama: 'Ikatan Remaja Masjid (IRMA / Rohis)', tipe: 'ESKUL' as any, urutan: 6, hari: ['JUMAT'] as any, mulai: '11:30', selesai: '13:00' },
    { nama: 'Futsal, Basket & E-Sports Academy', tipe: 'ESKUL' as any, urutan: 7, hari: ['KAMIS', 'SABTU'] as any, mulai: '15:30', selesai: '17:45' },
    { nama: 'Seni Tari Tradisional & Paduan Suara', tipe: 'ESKUL' as any, urutan: 8, hari: ['SELASA'] as any, mulai: '15:30', selesai: '17:00' },
  ];

  for (const ek of ekskulData) {
    await prisma.jenisKegiatanMaster.upsert({
      where: {
        tenant_id_nama: {
          tenant_id: tenantId,
          nama: ek.nama,
        },
      },
      update: { aktif: true, urutan: ek.urutan },
      create: {
        tenant_id: tenantId,
        nama: ek.nama,
        tipe: ek.tipe,
        urutan: ek.urutan,
        aktif: true,
      },
    });

    if (user) {
      const existingJadwal = await prisma.jadwalKegiatan.findFirst({
        where: { tenant_id: tenantId, nama: ek.nama },
      });
      if (!existingJadwal) {
        await prisma.jadwalKegiatan.create({
          data: {
            tenant_id: tenantId,
            nama: ek.nama,
            jenis_kegiatan: ek.nama,
            hari: ek.hari,
            waktu_mulai: ek.mulai,
            waktu_selesai: ek.selesai,
            target_semua_kelas: true,
            berlaku_mulai: new Date('2025-07-14'),
            tahun_pelajaran_id: tp.id,
            semester_id: sem.id,
            aktif: true,
            dibuat_oleh: user.id,
          },
        });
      }
    }
  }
  console.log(`+ Upserted ${ekskulData.length} JenisKegiatanMaster & JadwalKegiatan items`);

  // 4. Seed HubinTefaOrder (Etalase Produk & Jasa Teaching Factory)
  const existingTefa = await prisma.hubinTefaOrder.count({ where: { tenant_id: tenantId, deleted_at: null } });
  const mitra = await prisma.mitraIndustri.findFirst({ where: { tenant_id: tenantId } });

  if (existingTefa < 4) {
    const tefaCatalog = [
      {
        nama_proyek: 'Layanan Servis Berkala, Injeksi & Tune-Up Sepeda Motor (Bengkel Resmi TEFA TSM)',
        nilai_kontrak: 75000,
        status_proyek: 'PRODUKSI_AKTIF',
        deskripsi: 'Layanan perawatan berkala sepeda motor matic/sport standar AHASS oleh teknisi tersertifikasi. Meliputi pembersihan throttle body, cek kelistrikan, ganti oli, dan reset ECM.',
      },
      {
        nama_proyek: 'Jasa Pengembangan Website Korporat, Sistem IoT & Instalasi Jaringan Fiber Optik (TEFA RPL & TKJ)',
        nilai_kontrak: 2500000,
        status_proyek: 'PRODUKSI_AKTIF',
        deskripsi: 'Pembuatan aplikasi web instansi/UMKM, instalasi LAN/Wi-Fi gedung, penyambungan serat optik (splicing), dan perakitan perangkat otomasi Smart Building.',
      },
      {
        nama_proyek: 'Fabrikasi Komponen Presisi CNC, Las Argon & Konstruksi Besi Tempa (TEFA Teknik Pemesinan)',
        nilai_kontrak: 850000,
        status_proyek: 'PRODUKSI_AKTIF',
        deskripsi: 'Pemesanan pembuatan roda gigi (gear), sparepart mesin industri menggunakan CNC Milling/Lathe, serta pembuatan kanopi, pagar minimalis, dan rak industri.',
      },
      {
        nama_proyek: 'Paket Catering Korporat, Bakery Artisan & Coffee Corner (TEFA Kuliner & Tata Boga)',
        nilai_kontrak: 35000,
        status_proyek: 'PRODUKSI_AKTIF',
        deskripsi: 'Menerima pesanan snack box rapat dinas, roti manis artisan hangat setiap hari, kue ulang tahun premium, dan prasmanan event sekolah/instansi.',
      },
    ];

    for (const tf of tefaCatalog) {
      await prisma.hubinTefaOrder.create({
        data: {
          tenant_id: tenantId,
          mitra_id: mitra?.id || null,
          nama_proyek: tf.nama_proyek,
          nilai_kontrak: tf.nilai_kontrak,
          status_proyek: tf.status_proyek,
          tanggal_mulai: new Date('2026-01-10'),
          deskripsi: tf.deskripsi,
        },
      });
    }
    console.log(`+ Seeded ${tefaCatalog.length} HubinTefaOrder TEFA Showcase items`);
  }

  // 5. Seed Siswa Alumni / Tingkat Akhir for Tracer Study & Pengumuman Kelulusan
  const jurusan = await prisma.jurusan.findFirst({ where: { tenant_id: tenantId } });
  const kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenantId } });

  const showcaseGraduates = [
    {
      nis: `23241001-${code}`,
      nisn: code === 'SMKN1PLD' ? '0089123456' : '0089123499',
      nama_siswa: 'Aditya Pratama Putra',
      nomor_skl: `421.5/SKL-001/${code}/2026`,
      rata_rata_nilai: 91.4,
      status_kelulusan: 'LULUS',
      catatan: 'Lulus dengan Predikat Sangat Memuaskan — Terbaik 1 Kompetensi Keahlian',
      tracer: {
        tahun_lulus: 2025,
        status_alumni: 'BEKERJA',
        perusahaan_nama: 'PT Astra Honda Motor (AHM) Plant Cikarang',
        posisi: 'Production & Quality Control Engineer',
        gaji_estimasi: 'Rp 6.800.000',
      },
    },
    {
      nis: `23241002-${code}`,
      nisn: code === 'SMKN1PLD' ? '0089123457' : '0089123498',
      nama_siswa: 'Nabila Azzahra Putri',
      nomor_skl: `421.5/SKL-002/${code}/2026`,
      rata_rata_nilai: 92.8,
      status_kelulusan: 'LULUS',
      catatan: 'Lulus dengan Predikat Cumlaude — Diterima Jalur SNBP Perguruan Tinggi Negeri',
      tracer: {
        tahun_lulus: 2025,
        status_alumni: 'KULIAH',
        universitas_nama: 'Institut Teknologi Bandung (ITB) / Politeknik Negeri Bandung',
        program_studi: 'S1/D4 Teknik Informatika & Rekayasa Perangkat Lunak',
      },
    },
    {
      nis: `23241003-${code}`,
      nisn: code === 'SMKN1PLD' ? '0089123458' : '0089123497',
      nama_siswa: 'Muhammad Rizky Ramadhan',
      nomor_skl: `421.5/SKL-003/${code}/2026`,
      rata_rata_nilai: 88.6,
      status_kelulusan: 'LULUS',
      catatan: 'Lulus dengan Sertifikasi Kompetensi BNSP Predikat Kompeten Istimewa',
      tracer: {
        tahun_lulus: 2025,
        status_alumni: 'BEKERJA',
        perusahaan_nama: 'PT Telkom Akses Indonesia Regional Jawa Barat',
        posisi: 'Fiber Optic & Network Infrastructure Specialist',
        gaji_estimasi: 'Rp 5.900.000',
      },
    },
    {
      nis: `23241004-${code}`,
      nisn: code === 'SMKN1PLD' ? '0089123459' : '0089123496',
      nama_siswa: 'Siti Nurhaliza Kamila',
      nomor_skl: `421.5/SKL-004/${code}/2026`,
      rata_rata_nilai: 89.2,
      status_kelulusan: 'LULUS',
      catatan: 'Lulus — Penerima Hibah Wirausaha Muda Vokasi Jawa Barat',
      tracer: {
        tahun_lulus: 2025,
        status_alumni: 'WIRAUSAHA',
        usaha_nama: 'Kamila Digital Creative & Custom Merchandise Studio',
        usaha_bidang: 'Industri Kreatif, Sablon Digital & UI/UX Agency',
      },
    },
    {
      nis: `23241005-${code}`,
      nisn: code === 'SMKN1PLD' ? '0089123460' : '0089123495',
      nama_siswa: 'Dimas Arya Saputra',
      nomor_skl: `421.5/SKL-005/${code}/2026`,
      rata_rata_nilai: 87.9,
      status_kelulusan: 'LULUS',
      catatan: 'Lulus — Rekrutmen Jalur Ikatan Dinas Mitra Industri Jepang (Specified Skilled Worker)',
      tracer: {
        tahun_lulus: 2025,
        status_alumni: 'BEKERJA',
        perusahaan_nama: 'Yamaha Motor Co., Ltd. (Shizuoka Prefectural Plant, Japan)',
        posisi: 'Precision Machining & Assembly Associate',
        gaji_estimasi: '¥ 195.000 / Bulan',
      },
    },
    {
      nis: `23241006-${code}`,
      nisn: code === 'SMKN1PLD' ? '0089123461' : '0089123494',
      nama_siswa: 'Dewi Sartika Maharani',
      nomor_skl: `421.5/SKL-006/${code}/2026`,
      rata_rata_nilai: 90.1,
      status_kelulusan: 'LULUS',
      catatan: 'Lulus dengan Predikat Sangat Memuaskan',
      tracer: {
        tahun_lulus: 2025,
        status_alumni: 'KULIAH',
        universitas_nama: 'Universitas Pendidikan Indonesia (UPI) Bandung',
        program_studi: 'S1 Pendidikan Teknik Elektro & Otomasi Industri',
      },
    },
  ];

  for (const grad of showcaseGraduates) {
    let siswa = await prisma.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [{ nis: grad.nis }, { nisn: grad.nisn }],
      },
    });

    if (!siswa) {
      siswa = await prisma.siswa.create({
        data: {
          tenant_id: tenantId,
          nis: grad.nis,
          nisn: grad.nisn,
          nama_siswa: grad.nama_siswa,
          jenis_kelamin: grad.nama_siswa.includes('Putri') || grad.nama_siswa.includes('Siti') || grad.nama_siswa.includes('Dewi') ? 'P' : 'L',
          status: 'AKTIF',
          kelas_id: kelas?.id || null,
          jurusan_id: jurusan?.id || null,
        },
      });
    }

    // Upsert KelulusanSiswa
    const existingKel = await prisma.kelulusanSiswa.findFirst({
      where: {
        OR: [{ nomor_skl: grad.nomor_skl }, { tenant_id: tenantId, siswa_id: siswa.id }],
      },
    });

    if (!existingKel) {
      await prisma.kelulusanSiswa.create({
        data: {
          tenant_id: tenantId,
          siswa_id: siswa.id,
          nomor_skl: grad.nomor_skl,
          tanggal_lulus: new Date('2026-05-04'),
          rata_rata_nilai: grad.rata_rata_nilai,
          status_kelulusan: grad.status_kelulusan,
          catatan: grad.catatan,
        },
      });
    }

    // Upsert HubinTracerStudy
    const existingTracer = await prisma.hubinTracerStudy.findUnique({
      where: { siswa_id: siswa.id },
    });

    if (!existingTracer) {
      await prisma.hubinTracerStudy.create({
        data: {
          tenant_id: tenantId,
          siswa_id: siswa.id,
          tahun_lulus: grad.tracer.tahun_lulus,
          status_alumni: grad.tracer.status_alumni,
          perusahaan_nama: grad.tracer.perusahaan_nama || null,
          posisi: grad.tracer.posisi || null,
          gaji_estimasi: grad.tracer.gaji_estimasi || null,
          universitas_nama: grad.tracer.universitas_nama || null,
          program_studi: grad.tracer.program_studi || null,
          usaha_nama: grad.tracer.usaha_nama || null,
          usaha_bidang: grad.tracer.usaha_bidang || null,
        },
      });
    }
  }

  // Also ensure graduation announcement is enabled in Config
  const gradConfigs = [
    { key: 'web_graduation_announce_active', value: 'true' },
    { key: 'web_tefa_whatsapp', value: '6281214002500' },
  ];
  for (const gc of gradConfigs) {
    const existingCfg = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: gc.key },
    });
    if (!existingCfg) {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: gc.key,
          value: gc.value,
        },
      });
    }
  }

  console.log(`+ Seeded ${showcaseGraduates.length} KelulusanSiswa & HubinTracerStudy records`);
}

async function main() {
  for (const t of TENANTS) {
    await seedPhase2ForTenant(t.id, t.code);
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

  console.log('\n=== Phase 2 Seeding Complete! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
