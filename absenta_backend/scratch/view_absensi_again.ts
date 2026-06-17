import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const absensi = await prisma.absensiPkl.findMany({
    orderBy: { tanggal: 'desc' }
  });
  console.log('--- Current Absensi Records ---');
  console.log(JSON.stringify(absensi, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
