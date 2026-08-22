import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectStudentStatus() {
  console.log('🔍 [INSPEKSI STATUS SISWA: PROD VS DEMO]...\n');

  // 1. Cek Siswa di Produksi
  const prodStudents = await prisma.siswa.findMany({
    where: { tenant_id: PROD_ID },
    include: { Kelas: true }
  });

  const prodStatusCount: Record<string, number> = {};
  for (const s of prodStudents) {
    const st = (s as any).status_siswa || (s as any).status || 'UNKNOWN';
    prodStatusCount[st] = (prodStatusCount[st] || 0) + 1;
  }

  console.log(`📌 PRODUKSI (Total: ${prodStudents.length}):`);
  console.log(prodStatusCount);

  // 2. Cek Siswa di Demo
  const demoStudents = await prisma.siswa.findMany({
    where: { tenant_id: DEMO_ID },
    include: { Kelas: true }
  });

  const demoStatusCount: Record<string, number> = {};
  for (const s of demoStudents) {
    const st = (s as any).status_siswa || (s as any).status || 'UNKNOWN';
    demoStatusCount[st] = (demoStatusCount[st] || 0) + 1;
  }

  console.log(`\n📌 DEMO (Total: ${demoStudents.length}):`);
  console.log(demoStatusCount);

  // 3. Cek apakah ada kolom status lain (misal status_keaktifan di SiswaAkademik)
  const prodAkademik = await prisma.siswaAkademik.findMany({
    where: { siswa: { tenant_id: PROD_ID } }
  });
  console.log(`\n📌 SiswaAkademik PROD (Total: ${prodAkademik.length})`);
  
  const prodAkadStatus: Record<string, number> = {};
  for (const sa of prodAkademik) {
    const st = (sa as any).status || 'UNKNOWN';
    prodAkadStatus[st] = (prodAkadStatus[st] || 0) + 1;
  }
  console.log(prodAkadStatus);
}

inspectStudentStatus().catch(console.error).finally(() => prisma.$disconnect());
