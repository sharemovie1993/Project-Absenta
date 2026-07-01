import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 CHECKING STATUS IN DATABASE...');

  // Get all PemanggilanOrangTua records
  const summons = await prisma.pemanggilanOrangTua.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      Siswa: true
    }
  });

  console.log('\n--- Pemanggilan Orang Tua ---');
  summons.forEach((s) => {
    console.log(`ID: ${s.id} | Siswa: ${s.Siswa?.nama_siswa} (ID: ${s.siswa_id}) | Status: ${s.status} | Created: ${s.created_at}`);
  });

  // Get all SuratKeluar records
  const letters = await prisma.suratKeluar.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      Siswa: true
    }
  });

  console.log('\n--- Surat Keluar ---');
  letters.forEach((l) => {
    console.log(`ID: ${l.id} | Siswa: ${l.Siswa?.nama_siswa} (ID: ${l.siswa_id}) | Status: ${l.status} | Kategori: ${l.kategori_surat} | Created: ${l.created_at}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
