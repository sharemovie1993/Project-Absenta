const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    const dates = ['2026-04-14', '2026-04-15', '2026-04-16'];

    console.log('Comparative Session Audit for SMK Negeri 1 Cimahi:');
    
    for (const d of dates) {
      const start = new Date(d + 'T00:00:00Z');
      const end = new Date(d + 'T23:59:59Z');

      const countGerbang = await prisma.sesiGerbang.count({
        where: { tenant_id: tenantId, tanggal: { gte: start, lte: end } }
      });

      const countAbsensi = await prisma.sesiAbsensi.count({
        where: { tenant_id: tenantId, tanggal: { gte: start, lte: end } }
      });

      console.log(`- Date: ${d} | SesiGerbang: ${countGerbang} | SesiAbsensi: ${countAbsensi}`);
    }

  } catch (err) {
    console.error('Error during audit:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
