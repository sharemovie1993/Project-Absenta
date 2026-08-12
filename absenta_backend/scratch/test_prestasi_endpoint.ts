import { PrismaClient } from '../node_modules/.prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECK PRESTASI RECORD & TENANT ===");

  const tenant = await prisma.tenant.findFirst({
    where: { id: 'c2998880-ef62-43b7-8c85-2cc855a84d26' }
  });

  const prestasiList = await prisma.prestasiSiswa.findMany({
    where: { tenant_id: tenant!.id },
    include: {
      Siswa: {
        select: {
          id: true,
          nama_siswa: true,
          nis: true,
          Kelas: { select: { id: true, nama_kelas: true } }
        }
      }
    }
  });

  console.log(`Total Prestasi di Tenant ${tenant?.name}: ${prestasiList.length}`);
  prestasiList.forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.Siswa?.Kelas?.nama_kelas}] ${p.Siswa?.nama_siswa}: ${p.nama_prestasi} (poin: ${p.poin}, tanggal: ${p.tanggal})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
