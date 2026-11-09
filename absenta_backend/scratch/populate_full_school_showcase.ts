import { prisma } from '../src/utils/prisma';
import { publicPortalService } from '../src/modules/public-portal/services/public-portal.service';

async function main() {
  const tenantId = '8535b49c-d3fc-4598-922a-7774b49ee7c5'; // SMKN 1 Plered
  console.log('--- POPULATING FULL RICH SHOWCASE DATA FOR SMKN 1 PLERED ---');

  // 1. Update Sekolah
  const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
  if (sekolah) {
    await prisma.sekolah.update({
      where: { id: sekolah.id },
      data: {
        kepala_sekolah: 'Drs. H. Ujang Suherman, M.Pd.',
        nip_kepala: '19680512 199403 1 005',
        akreditasi: 'A (Unggul)',
        logo_url: 'https://img.icons8.com/color/120/school.png',
        kurikulum: 'MERDEKA',
        telepon: '(0264) 7504001',
        email: 'info@smknegeri1plered.sch.id',
        website: 'https://smknegeri1plered.sch.id',
        alamat: 'Jl. Raya Rawasari No. 12, Plered, Purwakarta, Jawa Barat',
      },
    });
    console.log('✅ Sekolah profile updated with headmaster and accreditation!');
  }

  // 2. Save Web CMS Config
  await publicPortalService.saveWebConfig(tenantId, {
    web_theme_color: '#2563EB',
    web_hero_title: 'Selamat Datang di SMKN 1 Plered',
    web_hero_subtitle: 'Mewujudkan Generasi Vokasi Unggul, Berkarakter Kuat, dan Berdaya Saing Global.',
    web_hero_images: [
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80',
    ],
    web_sambutan_kepsek: 'Puji dan syukur ke hadirat Allah SWT. Selamat datang di portal resmi SMKN 1 Plered. Melalui platform digital ekosistem terpadu ini, kami berkomitmen menyelenggarakan pendidikan vokasi berkualitas prima yang terhubung erat dengan kebutuhan dunia usaha dan dunia industri (DUDI). Kami mendidik siswa-siswi kami agar tidak hanya terampil secara teknis, namun juga memiliki integritas moral, kedisiplinan tinggi, dan semangat wirausaha mandiri. Mari kita bersama-sama mewujudkan masa depan gemilang.',
    web_foto_kepsek: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
    web_visi: 'Menjadi pusat keunggulan pendidikan kejuruan yang menghasilkan insan berkarakter mulia, kompeten berstandar industri, dan berdaya saing internasional.',
    web_misi: [
      'Melaksanakan pembelajaran berbasis proyek industri (Project Based Learning) terintegrasi kurikulum merdeka.',
      'Memperluas jejaring kemitraan strategis dengan dunia usaha dan industri bertaraf nasional dan global.',
      'Membina karakter budi pekerti luhur, ketarunaan, etos kerja profesional, dan budaya mutu.',
      'Mengoptimalkan sarana prasarana bengkel praktek dan laboratorium berbasis teknologi terkini.',
    ],
    web_ppdb_active: 'true',
    web_ppdb_url: 'https://ppdb.jabarprov.go.id',
    web_ppdb_announcement: 'Penerimaan Peserta Didik Baru (PPDB) 2026/2027 Resmi Dibuka!',
    web_social_links: {
      instagram: 'https://instagram.com/smkn1plered_official',
      youtube: 'https://youtube.com/@smkn1plered_channel',
      facebook: 'https://facebook.com/smkn1plered',
    },
  });
  console.log('✅ Web CMS Config populated!');

  // 3. Populate Mitra Industri (DUDI)
  const mitras = [
    {
      tenant_id: tenantId,
      nama: 'PT Astra Honda Motor',
      bidang: 'Otomotif & Manufaktur',
      logo_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=200&q=80',
      alamat: 'Kawasan Industri MM2100, Cikarang',
      mou_status: 'AKTIF',
      kompetensi_keahlian: 'Teknik Sepeda Motor, Teknik Mesin',
    },
    {
      tenant_id: tenantId,
      nama: 'PT Telkom Indonesia Tbk',
      bidang: 'Telekomunikasi & Jaringan',
      logo_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=200&q=80',
      alamat: 'Jl. Japati No. 1, Bandung',
      mou_status: 'AKTIF',
      kompetensi_keahlian: 'Teknik Komputer dan Jaringan',
    },
    {
      tenant_id: tenantId,
      nama: 'PT Yamaha Music Manufacturing',
      bidang: 'Elektronika & Instrumentasi',
      logo_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=200&q=80',
      alamat: 'Kawasan Berikat Nusantara, Jakarta',
      mou_status: 'AKTIF',
      kompetensi_keahlian: 'Teknik Audio Video, Otomasi Industri',
    },
    {
      tenant_id: tenantId,
      nama: 'PT Indomarco Prismatama',
      bidang: 'Retail & Logistik Terpadu',
      logo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=200&q=80',
      alamat: 'Jl. Ancol Barat I No. 9-10, Jakarta',
      mou_status: 'AKTIF',
      kompetensi_keahlian: 'Akuntansi, Bisnis Daring',
    },
  ];

  for (const m of mitras) {
    const existing = await prisma.mitraIndustri.findFirst({
      where: { tenant_id: tenantId, nama: m.nama },
    });
    if (!existing) {
      await prisma.mitraIndustri.create({ data: m });
      console.log(`✅ Mitra Industri added: ${m.nama}`);
    }
  }

  // 4. Populate Lowongan BKK
  const lowonganList = [
    {
      tenant_id: tenantId,
      perusahaan_nama: 'PT Astra Honda Motor',
      judul_posisi: 'Operator Produksi & Assembly Line',
      deskripsi: 'Bertanggung jawab dalam proses perakitan komponen sepeda motor dengan mematuhi standar keselamatan dan kualitas manufaktur Jepang.',
      persyaratan: 'Lulusan SMK jurusan TSM/TKR/TP/TOI, usia 18-21 tahun, sehat jasmani dan rohani, tinggi badan min. 165 cm.',
      kuota: 45,
      tanggal_tutup: new Date(Date.now() + 86400000 * 30),
      status: 'BUKA',
    },
    {
      tenant_id: tenantId,
      perusahaan_nama: 'PT Telkom Akses',
      judul_posisi: 'Junior Fiber Optic & Network Technician',
      deskripsi: 'Melakukan instalasi jaringan kabel serat optik, konfigurasi router OLT, dan pemeliharaan sambungan internet pelanggan korporat.',
      persyaratan: 'Lulusan SMK jurusan TKJ / TAV, memahami dasar topologi FTTH dan splicing kabel optik, tidak buta warna.',
      kuota: 20,
      tanggal_tutup: new Date(Date.now() + 86400000 * 45),
      status: 'BUKA',
    },
    {
      tenant_id: tenantId,
      perusahaan_nama: 'Aston Imperial Hotel & Convention',
      judul_posisi: 'Guest Service Associate & Commis Pastry',
      deskripsi: 'Menyambut tamu hotel bintang 4 dengan keramahan standar internasional, mengelola reservasi dan persiapan sajian kuliner.',
      persyaratan: 'Lulusan SMK jurusan Perhotelan atau Kuliner, berpenampilan rapi, komunikatif, mampu berbahasa Inggris dasar.',
      kuota: 12,
      tanggal_tutup: new Date(Date.now() + 86400000 * 20),
      status: 'BUKA',
    },
  ];

  for (const l of lowonganList) {
    const existing = await prisma.hubinLowongan.findFirst({
      where: { tenant_id: tenantId, judul_posisi: l.judul_posisi },
    });
    if (!existing) {
      await prisma.hubinLowongan.create({ data: l });
      console.log(`✅ Lowongan BKK added: ${l.judul_posisi}`);
    }
  }

  // 5. Populate Prestasi Siswa
  const siswaSample = await prisma.siswa.findFirst({ where: { tenant_id: tenantId } });
  if (siswaSample) {
    const jenisPrestasi = await prisma.jenisPrestasi.findFirst({ where: { tenant_id: tenantId } }) ||
      await prisma.jenisPrestasi.create({
        data: {
          tenant_id: tenantId,
          kategori: 'Kejuruan & Vokasi',
          nama_prestasi: 'LKS Tingkat Provinsi',
          poin: 50,
        },
      });

    const prestasiList = [
      {
        tenant_id: tenantId,
        siswa_id: siswaSample.id,
        nama_prestasi: 'Juara 1 Lomba Kompetensi Siswa (LKS) Industrial Automation Jawa Barat',
        tanggal: new Date(),
        keterangan: 'Meraih medali emas dan mewakili Provinsi Jawa Barat pada seleksi LKS Nasional.',
        jenis_prestasi_id: jenisPrestasi.id,
        poin: 50,
      },
      {
        tenant_id: tenantId,
        siswa_id: siswaSample.id,
        nama_prestasi: 'Medali Emas Olimpiade Jaringan Komputer Mikrotik Nasional',
        tanggal: new Date(Date.now() - 86400000 * 15),
        keterangan: 'Skor tertinggi pada konfigurasi routing dinamis BGP dan keamanan jaringan.',
        jenis_prestasi_id: jenisPrestasi.id,
        poin: 40,
      },
      {
        tenant_id: tenantId,
        siswa_id: siswaSample.id,
        nama_prestasi: 'Juara 2 Kompetisi Masak Nusantara Cooking Battle 2026',
        tanggal: new Date(Date.now() - 86400000 * 25),
        keterangan: 'Kategori masakan tradisional kreasi inovatif berbasis bahan lokal.',
        jenis_prestasi_id: jenisPrestasi.id,
        poin: 30,
      },
    ];

    for (const p of prestasiList) {
      const existing = await prisma.prestasiSiswa.findFirst({
        where: { tenant_id: tenantId, nama_prestasi: p.nama_prestasi },
      });
      if (!existing) {
        await prisma.prestasiSiswa.create({ data: p });
        console.log(`✅ Prestasi added: ${p.nama_prestasi}`);
      }
    }
  }

  // 6. Add Teacher Avatars for the first 12 teachers
  const teachers = await prisma.guru.findMany({ where: { tenant_id: tenantId }, take: 12 });
  const samplePhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  ];

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    const photo = samplePhotos[i % samplePhotos.length];
    await prisma.guru.update({
      where: { id: t.id },
      data: {
        foto: photo,
        jabatan: i === 0 ? 'Waka Kurikulum' : i === 1 ? 'Waka Kesiswaan' : i === 2 ? 'Waka Hubin' : 'Guru Produktif',
      },
    });
  }
  console.log('✅ Updated sample teacher photos & roles!');

  // Clear redis cache for tenant
  await publicPortalService.invalidateTenantCache(tenantId);
  console.log('✅ Cleared Redis cache for tenant!');

  console.log('\n--- ALL RICH SHOWCASE DATA POPULATED SUCCESSFULLY! ---');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
