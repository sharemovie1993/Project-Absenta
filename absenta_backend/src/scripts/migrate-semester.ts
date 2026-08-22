/**
 * Migrasi Semester dari demo-tenant-absenta ke UUID baru
 * dengan mapping tahun_pelajaran_id yang benar
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const OLD_TENANT_ID = 'demo-tenant-absenta';
const NEW_TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function migrateSemester() {
  console.log(`🚀 Migrasi Semester: ${OLD_TENANT_ID} -> ${NEW_TENANT_ID}`);

  // Bangun peta TahunPelajaran lama -> baru berdasarkan field 'tahun'
  const tpOld = await prisma.tahunPelajaran.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  const tpNew = await prisma.tahunPelajaran.findMany({ where: { tenant_id: NEW_TENANT_ID } });

  console.log(`📅 TahunPelajaran lama: ${tpOld.length}, baru: ${tpNew.length}`);
  tpOld.forEach(tp => console.log(`   Lama: "${tp.tahun}" (${tp.id})`));
  tpNew.forEach(tp => console.log(`   Baru: "${tp.tahun}" (${tp.id})`));

  // Map by field 'tahun': id lama -> id baru
  const tpIdMap: Record<string, string> = {};
  for (const tpO of tpOld) {
    const match = tpNew.find(n => n.tahun === tpO.tahun);
    if (match) {
      tpIdMap[tpO.id] = match.id;
    }
  }
  console.log(`   Mapping TP: ${Object.keys(tpIdMap).length} pasangan`);

  // Ambil semester lama dan baru
  const semestersOld = await prisma.semester.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  const semestersNew = await prisma.semester.findMany({ where: { tenant_id: NEW_TENANT_ID } });

  console.log(`\n📆 Semester lama: ${semestersOld.length}, sudah ada di tenant baru: ${semestersNew.length}`);

  const semIdMap: Record<string, string> = {};
  let created = 0;
  let matched = 0;

  for (const semO of semestersOld) {
    // Cari padanan di tenant baru berdasarkan nama_semester
    const existing = semestersNew.find(s => s.nama_semester === semO.nama_semester);
    if (existing) {
      semIdMap[semO.id] = existing.id;
      matched++;
      console.log(`   ⚪ Sudah ada: "${semO.nama_semester}" -> ${existing.id}`);
      continue;
    }

    const newTpId = tpIdMap[semO.tahun_pelajaran_id];
    if (!newTpId) {
      console.log(`   ⚠️  Skip "${semO.nama_semester}" -> TahunPelajaran ${semO.tahun_pelajaran_id} tidak ada mapping`);
      continue;
    }

    const newSemId = randomUUID();
    semIdMap[semO.id] = newSemId;

    const { id, created_at, updated_at, ...rest } = semO as any;
    try {
      await prisma.semester.create({
        data: {
          ...rest,
          id: newSemId,
          tenant_id: NEW_TENANT_ID,
          tahun_pelajaran_id: newTpId,
        }
      });
      created++;
      console.log(`   ✅ Dibuat: "${semO.nama_semester}" (${semO.is_active ? 'AKTIF' : 'nonaktif'}) -> ${newSemId}`);
    } catch (e: any) {
      console.log(`   ❌ Gagal: ${semO.nama_semester} -> ${e.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n📊 Hasil:`);
  console.log(`   Dibuat baru  : ${created}`);
  console.log(`   Sudah ada    : ${matched}`);

  // Tampilkan semua semester tenant baru
  const finalSemesters = await prisma.semester.findMany({
    where: { tenant_id: NEW_TENANT_ID },
    include: { TahunPelajaran: true },
    orderBy: { created_at: 'asc' }
  });

  console.log(`\n📋 Daftar Semester Tenant Demo (${finalSemesters.length}):`);
  for (const s of finalSemesters) {
    console.log(`   ${s.is_active ? '🟢' : '⚪'} "${s.nama_semester}" | TP: "${s.TahunPelajaran?.tahun}" | UUID: ${s.id}`);
  }

  console.log(`\n🎉 MIGRASI SEMESTER SELESAI!`);
}

migrateSemester()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
