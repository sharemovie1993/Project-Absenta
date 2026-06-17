import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const data = await prisma.jenisKegiatanMaster.findMany({
    where: { tenant_id: '17c66f12-715b-405f-b48e-485393fce5b4' },
    select: { id: true, nama: true, tipe: true, aktif: true }
  });
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
