import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPEKSI SCHEMA MODEL KEY ===");

  // Sample check on Prisma Client properties
  const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log("Available models on prisma:", keys.filter(k => k.toLowerCase().includes('permohonan') || k.toLowerCase().includes('jurnal') || k.toLowerCase().includes('pelanggaran') || k.toLowerCase().includes('prestasi') || k.toLowerCase().includes('ews') || k.toLowerCase().includes('kasus') || k.toLowerCase().includes('absen')));
}

main().catch(console.error).finally(() => prisma.$disconnect());
