import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';

async function findErwinTeacher() {
  console.log('🔍 [MENCARI DATA GURU ERWIN & JADWAL KBM DI PROD & DEMO]...\n');

  const prodErwins = await prisma.guru.findMany({
    where: {
      tenant_id: PROD_ID,
      nama_guru: { contains: 'Erwin', mode: 'insensitive' }
    },
    include: {
      JadwalKBM: true,
      User: true
    }
  });

  console.log(`Ditemukan ${prodErwins.length} guru bernama Erwin di Produksi:`);
  for (const g of prodErwins) {
    console.log(`📌 Nama   : ${g.nama_guru}`);
    console.log(`   ├─ NIP    : ${g.nip || '-'}`);
    console.log(`   ├─ User ID: ${g.user_id}`);
    console.log(`   └─ Total Jadwal KBM: ${g.JadwalKBM.length} Jadwal Mengajar\n`);
  }

  const demoErwins = await prisma.guru.findMany({
    where: {
      tenant_id: DEMO_ID,
      nama_guru: { contains: 'Erwin', mode: 'insensitive' }
    },
    include: {
      JadwalKBM: true,
      User: true
    }
  });

  console.log(`Ditemukan ${demoErwins.length} guru bernama Erwin di Demo:`);
  for (const g of demoErwins) {
    console.log(`📌 Nama   : ${g.nama_guru}`);
    console.log(`   ├─ NIP    : ${g.nip || '-'}`);
    console.log(`   ├─ User ID: ${g.user_id}`);
    console.log(`   └─ Total Jadwal KBM: ${g.JadwalKBM.length} Jadwal Mengajar\n`);
  }
}

findErwinTeacher().catch(console.error).finally(() => prisma.$disconnect());
