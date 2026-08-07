const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function auditAllConflicts() {
  const allJadwal = await prisma.jadwalKBM.findMany({
    include: {
      Guru: true,
      Kelas: true,
      Mapel: true
    }
  });

  console.log(`TOTAL JADWAL IN DB PRODUKSI: ${allJadwal.length}`);

  const slotMap = new Map();
  for (const j of allJadwal) {
    if (!j.guru_id || !j.hari || j.slot_index == null) continue;
    const key = `${j.guru_id}_${j.hari}_${j.slot_index}`;
    if (!slotMap.has(key)) slotMap.set(key, []);
    slotMap.get(key).push(j);
  }

  let totalConflicts = 0;
  const conflictGurus = new Set();

  for (const [key, list] of slotMap.entries()) {
    if (list.length > 1) {
      totalConflicts++;
      const guruName = list[0]?.Guru?.nama_guru || list[0]?.guru_id;
      conflictGurus.add(guruName);
      console.log(`🚨 BENTROK pada ${key} (${guruName}) - ${list.length} KELAS:`);
      list.forEach(i => console.log(`   - Kelas ${i.Kelas?.nama_kelas} [Mapel: ${i.Mapel?.nama_mapel}, ID: ${i.id}, asc_id: ${i.asc_id}]`));
    }
  }

  console.log(`\n======================================================`);
  console.log(`TOTAL SLOT BENTROK NYATA DI DATABASE: ${totalConflicts}`);
  console.log(`TOTAL GURU MEMILIKI BENTROK NYATA: ${conflictGurus.size}`);
  console.log(`======================================================`);
  console.log('Daftar Guru Bentrok:', Array.from(conflictGurus));
}

auditAllConflicts().catch(console.error).finally(() => prisma.$disconnect());
