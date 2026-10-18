const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const tenantId = '2acb7e12-d264-4784-8262-8f7369061542';
  const sheets = await prisma.raporStagingSheet.findMany({
    where: { tenant_id: tenantId, nama_kelas: { contains: 'TJKT 1', mode: 'insensitive' } }
  });
  console.log('Sheets found:', sheets.length);
  sheets.forEach(s => {
    console.log({
      id: s.id,
      nama_kelas: s.nama_kelas,
      tp_nama: s.tahun_pelajaran_nama,
      tp_id: s.tahun_pelajaran_id,
      semester: s.semester,
      status: s.status,
      last_synced: s.last_synced_at,
      sync_logs: s.sync_logs
    });
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
