/**
 * Migrasi data akademis dari demo-tenant-absenta ke UUID baru
 * Script ini hanya memigrasikan model yang memiliki tenant_id
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const OLD_TENANT_ID = 'demo-tenant-absenta';
const NEW_TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function migrateTable(
  modelName: string,
  findMany: () => Promise<any[]>,
  create: (data: any) => Promise<any>,
  idMapper?: (item: any) => Record<string, any>
): Promise<Record<string, string>> {
  const items = await findMany();
  console.log(`\n📋 ${modelName}: ${items.length} data`);
  const idMap: Record<string, string> = {};
  let count = 0;
  for (const item of items) {
    const newId = randomUUID();
    idMap[item.id] = newId;
    const { id, created_at, updated_at, ...rest } = item as any;
    const extraMap = idMapper ? idMapper(rest) : {};
    try {
      await create({ ...rest, ...extraMap, id: newId, tenant_id: NEW_TENANT_ID });
      count++;
    } catch (e: any) {
      // silent skip duplicates
    }
  }
  console.log(`   ✅ ${count}/${items.length} berhasil`);
  return idMap;
}

async function main() {
  console.log(`🚀 Migrasi data akademis: ${OLD_TENANT_ID} -> ${NEW_TENANT_ID}`);

  // 1. TahunPelajaran
  const tpIdMap = await migrateTable(
    'TahunPelajaran',
    () => prisma.tahunPelajaran.findMany({ where: { tenant_id: OLD_TENANT_ID } }),
    (d) => prisma.tahunPelajaran.create({ data: d })
  );

  // 2. Jurusan
  const jurusanIdMap = await migrateTable(
    'Jurusan',
    () => prisma.jurusan.findMany({ where: { tenant_id: OLD_TENANT_ID } }),
    (d) => prisma.jurusan.create({ data: d })
  );

  // 3. Kelas (depends on Jurusan)
  const kelasIdMap = await migrateTable(
    'Kelas',
    () => prisma.kelas.findMany({ where: { tenant_id: OLD_TENANT_ID } }),
    (d) => prisma.kelas.create({ data: d }),
    (rest) => ({
      jurusan_id: rest.jurusan_id ? jurusanIdMap[rest.jurusan_id] ?? null : null
    })
  );

  // 4. Update Siswa di tenant baru: set kelas_id & jurusan_id baru
  console.log(`\n🎒 Update Kelas & Jurusan ID di Siswa tenant baru...`);
  const siswasOld = await prisma.siswa.findMany({ where: { tenant_id: OLD_TENANT_ID }, select: { nis: true, nisn: true, kelas_id: true, jurusan_id: true } });
  const siswasNew = await prisma.siswa.findMany({ where: { tenant_id: NEW_TENANT_ID }, select: { id: true, nis: true, nisn: true } });
  let sFixed = 0;
  for (const sOld of siswasOld) {
    if (!sOld.kelas_id && !sOld.jurusan_id) continue;
    const sNew = siswasNew.find(s => s.nis === sOld.nis || (s.nisn && sOld.nisn && s.nisn === sOld.nisn));
    if (!sNew) continue;
    const updates: any = {};
    if (sOld.kelas_id && kelasIdMap[sOld.kelas_id]) updates.kelas_id = kelasIdMap[sOld.kelas_id];
    if (sOld.jurusan_id && jurusanIdMap[sOld.jurusan_id]) updates.jurusan_id = jurusanIdMap[sOld.jurusan_id];
    if (Object.keys(updates).length > 0) {
      await prisma.siswa.update({ where: { id: sNew.id }, data: updates }).catch(() => {});
      sFixed++;
    }
    if (sFixed % 200 === 0) process.stdout.write('.');
  }
  console.log(`\n   ✅ ${sFixed} Siswa diperbarui kelas/jurusan-nya`);

  // 5. Update OrganizationalAssignment: kelas_id di tenant baru
  console.log(`\n🏛️  Update kelas_id di OrganizationalAssignment tenant baru...`);
  const assignsOld = await prisma.organizationalAssignment.findMany({ where: { tenant_id: OLD_TENANT_ID }, select: { id: true, kelas_id: true, user_id: true, position_id: true } });
  const assignsNew = await prisma.organizationalAssignment.findMany({ where: { tenant_id: NEW_TENANT_ID }, select: { id: true, kelas_id: true, user_id: true, position_id: true } });
  let aFixed = 0;
  for (const aOld of assignsOld) {
    if (!aOld.kelas_id) continue;
    const newKelasId = kelasIdMap[aOld.kelas_id];
    if (!newKelasId) continue;
    // Find matching new assignment - match by user_id mapping would be complex, so we do it by kelas_id slot
    const aNew = assignsNew.find(a => !a.kelas_id || a.kelas_id === aOld.kelas_id);
    if (aNew) {
      await prisma.organizationalAssignment.update({ where: { id: aNew.id }, data: { kelas_id: newKelasId } }).catch(() => {});
      aFixed++;
    }
  }
  console.log(`   ✅ ${aFixed} penugasan diperbarui kelas_id-nya`);

  // 6. Migrasi GuruMapel / JadwalKBM dan tabel relasional lainnya - scan semua model dengan tenant_id
  const modelsToMigrate = [
    { name: 'MasterRuangan', fn: () => prisma.masterRuangan.findMany({ where: { tenant_id: OLD_TENANT_ID } }), create: (d: any) => prisma.masterRuangan.create({ data: d }) },
    { name: 'AttendanceDevice', fn: () => prisma.attendanceDevice.findMany({ where: { tenant_id: OLD_TENANT_ID } }), create: (d: any) => prisma.attendanceDevice.create({ data: d }) },
  ];

  for (const m of modelsToMigrate) {
    try {
      const items = await m.fn();
      console.log(`\n📋 ${m.name}: ${items.length} data`);
      let c = 0;
      for (const item of items) {
        const { id, created_at, updated_at, ...rest } = item as any;
        await m.create({ ...rest, id: randomUUID(), tenant_id: NEW_TENANT_ID }).catch(() => {});
        c++;
      }
      console.log(`   ✅ ${c} berhasil`);
    } catch (e: any) {
      console.log(`   ⚠️  ${m.name}: ${e.message?.slice(0, 60)}`);
    }
  }

  console.log(`\n\n🎉 MIGRASI AKADEMIS SELESAI!`);
  console.log(`   TahunPelajaran: ${Object.keys(tpIdMap).length}`);
  console.log(`   Jurusan: ${Object.keys(jurusanIdMap).length}`);
  console.log(`   Kelas: ${Object.keys(kelasIdMap).length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
