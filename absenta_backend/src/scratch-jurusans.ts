import { prisma } from './utils/prisma';

async function main() {
  const jurusans = await prisma.jurusan.findMany();
  console.log('Jurusans count:', jurusans.length);
  console.log('Jurusans data:', JSON.stringify(jurusans, null, 2));
}

main().catch(console.error);
