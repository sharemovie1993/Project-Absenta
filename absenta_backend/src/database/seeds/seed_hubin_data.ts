import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHubinData() {
  console.log('🌱 Starting Robust Hubin Modul Seeder...');

  // Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' }
  });

  if (tenants.length === 0) {
    console.log('⚠️ No active tenants found.');
    return;
  }

  console.log(`📋 Found ${tenants.length} active tenants. Starting seeding for each...`);

  for (const tenant of tenants) {
    console.log(`\n🏢 Seeding Hubin for Tenant: ${tenant.name} (${tenant.domain || 'no domain'})`);

    // 1. Create Mitra Industri
    const mitrasData = [
      {
        nama: 'PT Solusi Teknologi Indonesia',
        bidang: 'Software Engineering & IT Consultant',
        alamat: 'Jl. Merdeka No. 12, Sumur Bandung, Kota Bandung',
        kontak: '022-4201234',
        mou_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        latitude: -6.917464,
        longitude: 107.619122,
        radius: 100
      },
      {
        nama: 'Astra International Tbk',
        bidang: 'Automotive & Manufacturing',
        alamat: 'Jl. Jend. Sudirman No. 84, Senayan, Jakarta Selatan',
        kontak: '021-5080123',
        mou_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        latitude: -6.220190,
        longitude: 106.806176,
        radius: 150
      },
      {
        nama: 'PT Telekomunikasi Indonesia (Telkom)',
        bidang: 'Telecommunication & Digital Network',
        alamat: 'Jl. Japati No. 1, Sadang Serang, Kota Bandung',
        kontak: '022-4521515',
        mou_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        latitude: -6.901905,
        longitude: 107.618912,
        radius: 100
      },
      {
        nama: 'PT GoTo Gojek Tokopedia Tbk',
        bidang: 'E-Commerce & On-Demand Service',
        alamat: 'Gedung Pasaraya Blok M, Kebayoran Baru, Jakarta Selatan',
        kontak: '021-29112345',
        mou_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        latitude: -6.244321,
        longitude: 106.802798,
        radius: 120
      },
      {
        nama: 'PT Google Indonesia',
        bidang: 'Cloud Technology & Advertising',
        alamat: 'Pacific Century Place, Senayan, Jakarta Selatan',
        kontak: '021-30005600',
        mou_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        latitude: -6.225678,
        longitude: 106.811263,
        radius: 100
      }
    ];

    const createdMitras = [];
    for (const m of mitrasData) {
      const mitra = await prisma.mitraIndustri.upsert({
        where: {
          id: await prisma.mitraIndustri.findFirst({
            where: { tenant_id: tenant.id, nama: m.nama }
          }).then(res => res?.id || 'non-existent-uuid')
        },
        update: {
          bidang: m.bidang,
          alamat: m.alamat,
          kontak: m.kontak,
          mou_url: m.mou_url,
          latitude: m.latitude,
          longitude: m.longitude,
          radius: m.radius
        },
        create: {
          tenant_id: tenant.id,
          nama: m.nama,
          bidang: m.bidang,
          alamat: m.alamat,
          kontak: m.kontak,
          mou_url: m.mou_url,
          latitude: m.latitude,
          longitude: m.longitude,
          radius: m.radius
        }
      });
      createdMitras.push(mitra);
    }
    console.log(`✅ Seeded ${createdMitras.length} Mitra Industri.`);

    // Get Pembimbing (Guru) from this tenant
    const pembimbing = await prisma.guru.findFirst({
      where: { tenant_id: tenant.id }
    });

    if (!pembimbing) {
      console.log('⚠️ No guru found for this tenant, skipping student placement.');
      continue;
    }

    // Get Siswa from this tenant
    const siswas = await prisma.siswa.findMany({
      where: { tenant_id: tenant.id },
      take: 10
    });

    if (siswas.length === 0) {
      console.log('⚠️ No siswa found for this tenant, skipping student placement.');
      continue;
    }

    console.log(`📋 Found ${siswas.length} siswa. Placing them in Mitra Industri...`);

    // 2. Create SiswaPkl (Penempatan) and 3. Create AbsensiPkl (Kehadiran & Logbook)
    let penempatanCount = 0;
    let absensiCount = 0;

    for (let i = 0; i < siswas.length; i++) {
      const siswa = siswas[i];
      const mitra = createdMitras[i % createdMitras.length];

      // Upsert Penempatan PKL
      const penempatan = await prisma.siswaPkl.upsert({
        where: {
          id: await prisma.siswaPkl.findFirst({
            where: { tenant_id: tenant.id, siswa_id: siswa.id }
          }).then(res => res?.id || 'non-existent-uuid')
        },
        update: {
          mitra_id: mitra.id,
          pembimbing_id: pembimbing.id,
          status: 'AKTIF'
        },
        create: {
          tenant_id: tenant.id,
          siswa_id: siswa.id,
          mitra_id: mitra.id,
          pembimbing_id: pembimbing.id,
          tanggal_mulai: new Date('2026-01-05'),
          tanggal_selesai: new Date('2026-06-30'),
          status: 'AKTIF'
        }
      });

      penempatanCount++;

      // Create AbsensiPkl history (3 days ago, 2 days ago, 1 day ago, and today!)
      const logbookActivities = [
        'Mempelajari arsitektur sistem absensi berbasis geofencing.',
        'Mendesain UI/UX dashboard premium untuk guru pembimbing.',
        'Melakukan integrasi API endpoint kesiswaan ke frontend.',
        'Menyelesaikan implementasi modul presensi siswa PKL.'
      ];

      for (let dayOffset = 3; dayOffset >= 0; dayOffset--) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - dayOffset);
        
        // Clean date for @db.Date
        const dateOnly = new Date(targetDate.toISOString().split('T')[0]);

        // Jam Masuk (07:30 - 07:50)
        const jamMasuk = new Date(targetDate);
        jamMasuk.setHours(7, Math.floor(Math.random() * 20) + 30, 0, 0);

        // Jam Pulang (16:00 - 16:30)
        const jamPulang = new Date(targetDate);
        jamPulang.setHours(16, Math.floor(Math.random() * 30), 0, 0);

        // Geolocation coordinates close to the Mitra location (plus minor noise)
        const noiseLat = (Math.random() - 0.5) * 0.0005;
        const noiseLng = (Math.random() - 0.5) * 0.0005;
        const lat = (mitra.latitude || -6.917464) + noiseLat;
        const lng = (mitra.longitude || 107.619122) + noiseLng;

        const isToday = dayOffset === 0;
        
        // Upsert Absensi
        await prisma.absensiPkl.upsert({
          where: {
            id: await prisma.absensiPkl.findFirst({
              where: { tenant_id: tenant.id, siswa_pkl_id: penempatan.id, tanggal: dateOnly }
            }).then(res => res?.id || 'non-existent-uuid')
          },
          update: {
            jam_masuk: jamMasuk,
            jam_pulang: isToday && Math.random() > 0.5 ? null : jamPulang, // Today might not have checked out yet!
            status: 'HADIR',
            kegiatan: logbookActivities[dayOffset % logbookActivities.length],
            latitude_masuk: lat,
            longitude_masuk: lng,
            latitude_pulang: isToday && Math.random() > 0.5 ? null : lat,
            longitude_pulang: isToday && Math.random() > 0.5 ? null : lng,
            is_verified: dayOffset !== 0 // Today is not verified yet, past days are!
          },
          create: {
            tenant_id: tenant.id,
            siswa_pkl_id: penempatan.id,
            tanggal: dateOnly,
            jam_masuk: jamMasuk,
            jam_pulang: isToday && Math.random() > 0.5 ? null : jamPulang,
            status: 'HADIR',
            kegiatan: logbookActivities[dayOffset % logbookActivities.length],
            latitude_masuk: lat,
            longitude_masuk: lng,
            latitude_pulang: isToday && Math.random() > 0.5 ? null : lat,
            longitude_pulang: isToday && Math.random() > 0.5 ? null : lng,
            is_verified: dayOffset !== 0
          }
        });

        absensiCount++;
      }
    }

    console.log(`✅ Placed ${penempatanCount} siswa at Mitra Industri.`);
    console.log(`✅ Generated ${absensiCount} dynamic AbsensiPkl & Logbook entries.`);
  }

  console.log('\n🏁 Hubin Modul Seeder Completed Successfully!');
}

seedHubinData()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
