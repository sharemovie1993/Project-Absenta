import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const one = await (prisma as any).jurusan.findFirst();
  console.log("Keys of Jurusan:", Object.keys(one || {}));
  console.log("Sample Jurusan:", one);
}

run().catch(console.error);
