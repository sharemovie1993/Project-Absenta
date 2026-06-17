import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.config.findMany({
    where: { key: 'HUBIN_GOOGLE_DRIVE_FOLDER_URL' }
  });
  console.log('--- Current Configs in Database ---');
  console.log(JSON.stringify(configs, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
