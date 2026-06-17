import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { domain: 'smkn1cimahi' } });
    if (!tenant) {
      console.log('Tenant not found');
      return;
    }
    const data = await prisma.jenisKegiatanMaster.findMany({
      where: { tenant_id: tenant.id },
      select: { nama: true, tipe: true, aktif: true }
    });
    console.log('--- DATA IN DB ---');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
