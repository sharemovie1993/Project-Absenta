const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const k = await prisma.kelas.findFirst({
    where: { 
      nama_kelas: 'X TJKT 1',
      tenant_id: '44497b2b-a4f2-42c5-805b-105db58a6415'
    }
  });
  console.log('Kelas X TJKT 1:', k);
}
main().finally(() => prisma.$disconnect());
