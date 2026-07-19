import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing JadwalTemplate table...');
  const deleted = await prisma.jadwalTemplate.deleteMany({});
  console.log(`Deleted ${deleted.count} rows.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
