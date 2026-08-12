import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== VERIFIKASI HASIL PRISMA PRESTASI & PELANGGARAN ===");

  const prestasis = await prisma.prestasiSiswa.findMany({
    take: 5,
    include: {
      Siswa: { select: { nama_siswa: true, nis: true } }
    }
  });
  console.log("Prestasi Sample:", JSON.stringify(prestasis, null, 2));

  const pelanggarans = await prisma.pelanggaranSiswa.findMany({
    take: 5,
    include: {
      Siswa: { select: { nama_siswa: true, nis: true } }
    }
  });
  console.log("Pelanggaran Sample:", JSON.stringify(pelanggarans, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
