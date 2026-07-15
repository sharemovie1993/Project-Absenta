import { PrismaClient } from '@prisma/client';
import { seedJurusanPresets } from '../src/database/seeds/seed_jurusan_presets';

const prisma = new PrismaClient();

async function main() {
  await seedJurusanPresets(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Scratch seed completed.');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
