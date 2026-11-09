import { prisma } from '../src/utils/prisma';
import { publicPortalService } from '../src/modules/public-portal/services/public-portal.service';

async function syncDevTenant() {
  const devTenantId = '2acb7e12-d264-4784-8262-8f7369061542'; // Dev / Demo tenant
  const masterTenantId = '8535b49c-d3fc-4598-922a-7774b49ee7c5'; // SMKN 1 Plered master

  console.log('--- SYNCING DEMO/DEV TENANT DATA ---');

  // 1. Ensure Sekolah exists for dev tenant
  const devSekolah = await prisma.sekolah.findFirst({ where: { tenant_id: devTenantId } });
  if (!devSekolah) {
    await prisma.sekolah.create({
      data: {
        tenant_id: devTenantId,
        nama: 'SMKN 1 PLERED - PURWAKARTA',
        npsn: '20229659',
        jenjang: 'SMK',
        akreditasi: 'A (Unggul)',
        kurikulum: 'MERDEKA',
        kepala_sekolah: 'Drs. H. Ujang Suherman, M.Pd.',
        nip_kepala: '19680512 199403 1 005',
        logo_url: 'https://img.icons8.com/color/120/school.png',
        telepon: '(0264) 7504001',
        email: 'info@smknegeri1plered.sch.id',
        website: 'https://smknegeri1plered.sch.id',
        alamat: 'Jl. Raya Rawasari No. 12, Plered, Purwakarta, Jawa Barat',
      },
    });
    console.log('✅ Created Sekolah for dev tenant');
  }

  // 2. Clone Web Config
  const configs = await prisma.config.findMany({ where: { tenant_id: masterTenantId } });
  for (const c of configs) {
    const ex = await prisma.config.findFirst({ where: { tenant_id: devTenantId, key: c.key } });
    if (ex) {
      await prisma.config.update({ where: { id: ex.id }, data: { value: c.value } });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: devTenantId,
          key: c.key,
          value: c.value,
        },
      });
    }
  }
  console.log('✅ Cloned Web Config to dev tenant');

  // 3. Clone Jurusan if empty
  const devJurusanCount = await prisma.jurusan.count({ where: { tenant_id: devTenantId } });
  if (devJurusanCount === 0) {
    const masterJurusans = await prisma.jurusan.findMany({ where: { tenant_id: masterTenantId } });
    for (const j of masterJurusans) {
      await prisma.jurusan.create({
        data: {
          tenant_id: devTenantId,
          nama: j.nama,
          kode: j.kode,
          singkatan: j.singkatan,
          warna: j.warna,
          logo_url: j.logo_url,
          durasi_jurusan: j.durasi_jurusan,
        },
      });
    }
    console.log(`✅ Cloned ${masterJurusans.length} Jurusan to dev tenant`);
  }

  // 4. Clone Mitra Industri
  const devMitraCount = await prisma.mitraIndustri.count({ where: { tenant_id: devTenantId } });
  if (devMitraCount === 0) {
    const masterMitras = await prisma.mitraIndustri.findMany({ where: { tenant_id: masterTenantId } });
    for (const m of masterMitras) {
      await prisma.mitraIndustri.create({
        data: {
          tenant_id: devTenantId,
          nama: m.nama,
          bidang: m.bidang,
          logo_url: m.logo_url,
          alamat: m.alamat,
          kompetensi_keahlian: m.kompetensi_keahlian,
          mou_status: 'AKTIF',
        },
      });
    }
    console.log(`✅ Cloned ${masterMitras.length} Mitra Industri to dev tenant`);
  }

  // 5. Clone Lowongan BKK
  const devLokerCount = await prisma.hubinLowongan.count({ where: { tenant_id: devTenantId } });
  if (devLokerCount === 0) {
    const masterLokers = await prisma.hubinLowongan.findMany({ where: { tenant_id: masterTenantId } });
    for (const l of masterLokers) {
      await prisma.hubinLowongan.create({
        data: {
          tenant_id: devTenantId,
          perusahaan_nama: l.perusahaan_nama,
          judul_posisi: l.judul_posisi,
          deskripsi: l.deskripsi,
          persyaratan: l.persyaratan,
          kuota: l.kuota,
          tanggal_tutup: l.tanggal_tutup,
          status: 'BUKA',
        },
      });
    }
    console.log(`✅ Cloned ${masterLokers.length} Lowongan to dev tenant`);
  }

  // 6. Clone Public Articles
  const masterArticles = await (prisma as any).publicSchoolArticle.findMany({ where: { tenant_id: masterTenantId } });
  for (const a of masterArticles) {
    const ex = await (prisma as any).publicSchoolArticle.findFirst({
      where: { tenant_id: devTenantId, slug: a.slug },
    });
    if (!ex) {
      await (prisma as any).publicSchoolArticle.create({
        data: {
          tenant_id: devTenantId,
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          content: a.content,
          cover_image: a.cover_image,
          category: a.category,
          author_name: a.author_name,
          published_at: a.published_at,
          views_count: a.views_count,
        },
      });
    }
  }
  console.log(`✅ Cloned ${masterArticles.length} Articles to dev tenant`);

  // 7. Clone sample Teachers to dev tenant if 0
  const devGuruCount = await prisma.guru.count({ where: { tenant_id: devTenantId } });
  if (devGuruCount === 0) {
    const masterGurus = await prisma.guru.findMany({ where: { tenant_id: masterTenantId }, take: 18 });
    for (const g of masterGurus) {
      // Find or create a shadow user for guru in dev tenant
      const userEmail = `guru_${g.id.slice(0, 8)}@dev.absenta.id`;
      let u = await prisma.user.findFirst({ where: { email: userEmail } });
      if (!u) {
        const role = await prisma.role.findFirst({ where: { name: 'GURU' } });
        u = await prisma.user.create({
          data: {
            tenant_id: devTenantId,
            email: userEmail,
            password: '$2b$10$abcdefghijklmnopqrstuu',
            full_name: g.nama_guru,
            role_id: role?.id || 'role-guru',
          },
        });
      }

      await prisma.guru.create({
        data: {
          tenant_id: devTenantId,
          user_id: u.id,
          nama_guru: g.nama_guru,
          nip: g.nip,
          foto: g.foto,
          jabatan: g.jabatan,
          jenis_ptk: g.jenis_ptk,
        },
      });
    }
    console.log('✅ Cloned 18 Teachers to dev tenant');
  }

  // 8. Clone Prestasi Siswa to dev tenant
  const devPrestasiCount = await prisma.prestasiSiswa.count({ where: { tenant_id: devTenantId } });
  if (devPrestasiCount === 0) {
    // Find or create sample siswa in dev tenant
    let s = await prisma.siswa.findFirst({ where: { tenant_id: devTenantId } });
    if (!s) {
      s = await prisma.siswa.create({
        data: {
          tenant_id: devTenantId,
          nis: '2026001',
          nisn: '0089123456',
          nama_siswa: 'Rifki Pratama',
          jenis_kelamin: 'L',
        },
      });
    }

    const masterPrestasis = await prisma.prestasiSiswa.findMany({ where: { tenant_id: masterTenantId } });
    for (const p of masterPrestasis) {
      await prisma.prestasiSiswa.create({
        data: {
          tenant_id: devTenantId,
          siswa_id: s.id,
          nama_prestasi: p.nama_prestasi,
          tanggal: p.tanggal,
          keterangan: p.keterangan,
          poin: p.poin,
        },
      });
    }
    console.log(`✅ Cloned ${masterPrestasis.length} Prestasi to dev tenant`);
  }

  // Invalidate both caches
  await publicPortalService.invalidateTenantCache(devTenantId);
  await publicPortalService.invalidateTenantCache(masterTenantId);
  console.log('✅ Invalidated Redis caches');

  console.log('--- ALL DEV TENANT SYNC COMPLETE ---');
  process.exit(0);
}

syncDevTenant().catch((e) => {
  console.error(e);
  process.exit(1);
});
