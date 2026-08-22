import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function checkNisMatching() {
  const prodSample = await prisma.siswa.findMany({ where: { tenant_id: PROD_ID }, take: 5 });
  const demoSample = await prisma.siswa.findMany({ where: { tenant_id: DEMO_ID }, take: 5 });

  console.log('Sample Prod:', prodSample.map(s => ({ id: s.id, nis: s.nis, nisn: s.nisn, nama: s.nama_siswa })));
  console.log('Sample Demo:', demoSample.map(s => ({ id: s.id, nis: s.nis, nisn: s.nisn, nama: s.nama_siswa })));
}

checkNisMatching().catch(console.error).finally(() => prisma.$disconnect());
