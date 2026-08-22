import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-36b1-419b-ba2a-5a9e320f86ee';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectKaprogToolman() {
  console.log('🔍 [INSPEKSI DATA KAPROG, TOOLMAN & STRUKTUR ORGANISASI: PROD VS DEMO]...\n');

  // 1. Cek OrganizationalPosition & Assignments
  const prodPos = await prisma.organizationalPosition.findMany({ where: { tenant_id: PROD_ID } });
  const demoPos = await prisma.organizationalPosition.findMany({ where: { tenant_id: DEMO_ID } });
  console.log(`📌 OrganizationalPosition : PROD = ${prodPos.length}, DEMO = ${demoPos.length}`);

  const prodAssign = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: PROD_ID },
    include: { Position: true, User: true }
  });
  const demoAssign = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: DEMO_ID },
    include: { Position: true, User: true }
  });
  console.log(`📌 OrganizationalAssignment: PROD = ${prodAssign.length}, DEMO = ${demoAssign.length}\n`);

  console.log('--- Penugasan di Produksi SMKN 1 Plered: ---');
  prodAssign.forEach(a => {
    console.log(`- [${a.Position?.code || a.position_id}] ${a.Position?.name.padEnd(25)} -> ${a.User?.full_name} (${a.User?.email}) [Kelas: ${a.kelas_id || '-'}]`);
  });

  // 2. Cek Jurusan dan relasinya (apakah ada field kaprog, dll.)
  const prodJurusan = await prisma.jurusan.findMany({ where: { tenant_id: PROD_ID } });
  const demoJurusan = await prisma.jurusan.findMany({ where: { tenant_id: DEMO_ID } });
  console.log(`\n📌 Jurusan: PROD = ${prodJurusan.length}, DEMO = ${demoJurusan.length}`);
  console.log('Data Jurusan Prod:', prodJurusan.map(j => ({ kode: j.kode, nama: j.nama })));

  // 3. Cek apakah ada tabel lain yang menyimpan struktur (misal MasterStruktur, SK, Bengkel, Ruangan)
  const prodRuangan = await prisma.masterRuangan.findMany({ where: { tenant_id: PROD_ID } });
  const demoRuangan = await prisma.masterRuangan.findMany({ where: { tenant_id: DEMO_ID } });
  console.log(`\n📌 MasterRuangan: PROD = ${prodRuangan.length}, DEMO = ${demoRuangan.length}`);
}

inspectKaprogToolman().catch(console.error).finally(() => prisma.$disconnect());
