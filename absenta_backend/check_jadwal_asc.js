const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.jadwalKBM.findMany({
    take: 10,
    select: {
      id: true,
      kelas_id: true,
      guru_id: true,
      mapel_id: true,
      hari: true,
      slot_index: true,
      asc_id: true,
      created_by_user_id: true,
    }
  });

  console.log(`Found ${items.length} sample items:`);
  console.log(JSON.stringify(items, null, 2));

  const totalWithAscId = await prisma.jadwalKBM.count({
    where: { asc_id: { not: null } }
  });
  const totalNullAscId = await prisma.jadwalKBM.count({
    where: { asc_id: null }
  });

  console.log(`\n===================================`);
  console.log(`Total dengan asc_id (XML): ${totalWithAscId}`);
  console.log(`Total NULL asc_id (MANUAL): ${totalNullAscId}`);
  console.log(`===================================\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
