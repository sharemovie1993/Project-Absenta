const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillServer2026() {
  console.log('🚀 Starting production backfill to 2026/2027 Ganjil...');
  
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log('Found tenants:', tenants.length);

  for (const t of tenants) {
    let tp2026 = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: t.id, tahun: '2026/2027' }
    });

    if (!tp2026) {
      tp2026 = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: t.id, is_active: true }
      });
    }

    if (!tp2026) {
      console.log(`[Tenant: ${t.name}] ⚠️ No Tahun Pelajaran 2026/2027 or active found. Skipping.`);
      continue;
    }

    let semGanjil = await prisma.semester.findFirst({
      where: {
        tenant_id: t.id,
        tahun_pelajaran_id: tp2026.id,
        nama_semester: { contains: 'Ganjil', mode: 'insensitive' }
      }
    });

    if (!semGanjil) {
      semGanjil = await prisma.semester.findFirst({
        where: { tenant_id: t.id, is_active: true }
      });
    }

    if (!semGanjil) {
      console.log(`[Tenant: ${t.name}] ⚠️ No Semester Ganjil found for TP ${tp2026.tahun}. Skipping.`);
      continue;
    }

    console.log(`[Tenant: ${t.name}] Target TP: ${tp2026.tahun} (${tp2026.id}), Target Semester: ${semGanjil.nama_semester} (${semGanjil.id})`);

    // 1. GuruMapel
    const r1 = await prisma.guruMapel.updateMany({
      where: {
        tenant_id: t.id,
        OR: [
          { tahun_pelajaran_id: null },
          { semester_id: null }
        ]
      },
      data: {
        tahun_pelajaran_id: tp2026.id,
        semester_id: semGanjil.id
      }
    });

    // 2. PelanggaranSiswa
    const r2 = await prisma.pelanggaranSiswa.updateMany({
      where: {
        tenant_id: t.id,
        OR: [
          { tahun_pelajaran_id: null },
          { semester_id: null }
        ]
      },
      data: {
        tahun_pelajaran_id: tp2026.id,
        semester_id: semGanjil.id
      }
    });

    // 3. SupervisiGuru
    const r3 = await prisma.supervisiGuru.updateMany({
      where: {
        tenant_id: t.id,
        OR: [
          { tahun_pelajaran_id: null },
          { semester_id: null }
        ]
      },
      data: {
        tahun_pelajaran_id: tp2026.id,
        semester_id: semGanjil.id
      }
    });

    // 4. GuruTimeOff
    const r4 = await prisma.guruTimeOff.updateMany({
      where: {
        tenant_id: t.id,
        OR: [
          { tahun_pelajaran_id: null },
          { semester_id: null }
        ]
      },
      data: {
        tahun_pelajaran_id: tp2026.id,
        semester_id: semGanjil.id
      }
    });

    // 5. JadwalKegiatan
    const r5 = await prisma.jadwalKegiatan.updateMany({
      where: {
        tenant_id: t.id,
        semester_id: null
      },
      data: {
        semester_id: semGanjil.id
      }
    });

    // 6. StrukturKurikulum
    const r6 = await prisma.strukturKurikulum.updateMany({
      where: {
        tenant_id: t.id,
        semester_id: null
      },
      data: {
        semester_id: semGanjil.id
      }
    });

    console.log(`  ✅ GuruMapel updated: ${r1.count}`);
    console.log(`  ✅ PelanggaranSiswa updated: ${r2.count}`);
    console.log(`  ✅ SupervisiGuru updated: ${r3.count}`);
    console.log(`  ✅ GuruTimeOff updated: ${r4.count}`);
    console.log(`  ✅ JadwalKegiatan updated: ${r5.count}`);
    console.log(`  ✅ StrukturKurikulum updated: ${r6.count}`);
  }

  console.log('🎉 Production backfill completed successfully!');
}

backfillServer2026()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
