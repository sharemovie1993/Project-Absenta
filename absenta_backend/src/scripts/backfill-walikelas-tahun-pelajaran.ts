import { prisma } from '../utils/prisma';

async function backfillWaliKelasTahunPelajaran() {
  console.log('🔄 Memulai backfill tahun_pelajaran_id pada OrganizationalAssignment...');

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  let totalUpdated = 0;

  for (const tenant of tenants) {
    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenant.id, is_active: true },
      select: { id: true, tahun: true },
    });

    if (!activeTp) {
      console.log(`⚠️ Tenant ${tenant.name} (${tenant.id}): Tidak ada Tahun Pelajaran aktif, melewati.`);
      continue;
    }

    // Ambil semua assignment WALIKELAS atau yang memiliki kelas_id dan tahun_pelajaran_id null
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenant.id,
        tahun_pelajaran_id: null,
        kelas_id: { not: null },
      },
      select: { id: true, user_id: true, position_id: true, kelas_id: true },
    });

    if (assignments.length === 0) {
      console.log(`✅ Tenant ${tenant.name} (${tenant.id}): Tidak ada assignment dengan tahun_pelajaran_id kosong.`);
      continue;
    }

    console.log(`📌 Tenant ${tenant.name} (${tenant.id}): Menemukan ${assignments.length} assignment untuk ditautkan ke TP aktif "${activeTp.tahun}" (${activeTp.id})`);

    for (const a of assignments) {
      try {
        await prisma.organizationalAssignment.update({
          where: { id: a.id },
          data: { tahun_pelajaran_id: activeTp.id },
        });
        totalUpdated++;
      } catch (err: any) {
        console.warn(`  ⚠️ Gagal update assignment ${a.id}:`, err?.message || err);
      }
    }
  }

  console.log(`🎉 Backfill selesai! Total assignment berhasil diperbarui: ${totalUpdated}`);
  await prisma.$disconnect();
}

backfillWaliKelasTahunPelajaran().catch((e) => {
  console.error('❌ Error backfill:', e);
  process.exit(1);
});
