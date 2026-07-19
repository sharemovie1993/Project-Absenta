import { prisma } from './src/utils/prisma';

async function main() {
  const assigns = await prisma.organizationalAssignment.findMany({
    include: {
      Position: true
    }
  });

  console.log(`Total assignments in DB: ${assigns.length}`);
  for (const a of assigns) {
    console.log({
      id: a.id,
      position: a.Position.code,
      is_active: a.is_active,
      jenis_kegiatan_id: a.jenis_kegiatan_id
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
