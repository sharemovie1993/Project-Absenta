import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectXTjkt1Students() {
  const kelas = await prisma.kelas.findFirst({
    where: { tenant_id: DEMO_ID, nama_kelas: 'X TJKT 1' }
  });

  if (!kelas) {
    console.error('Kelas X TJKT 1 tidak ditemukan!');
    return;
  }

  console.log(`📌 Kelas: ${kelas.nama_kelas} (ID: ${kelas.id})`);

  const students = await prisma.siswa.findMany({
    where: { tenant_id: DEMO_ID, kelas_id: kelas.id, status: 'AKTIF' },
    include: { User: true }
  });

  console.log(`Ditemukan ${students.length} siswa di ${kelas.nama_kelas}:`);
  students.slice(0, 10).forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.nis}] ${s.nama_siswa.padEnd(25)} | User ID: ${s.user_id || '-'} | Email: ${s.User?.email || '-'}`);
  });
}

inspectXTjkt1Students().catch(console.error).finally(() => prisma.$disconnect());
