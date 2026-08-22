import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function checkDemoUserRoles() {
  console.log('🔍 [CEK ROLE DASAR USER DI TENANT DEMO]...\n');

  const users = await prisma.user.findMany({
    where: {
      tenant_id: DEMO_ID,
      email: {
        in: [
          'admin@absenta.id',
          'kepsek@absenta.id',
          'kurikulum@absenta.id',
          'kesiswaan@absenta.id',
          'hubin@absenta.id',
          'sarpras@absenta.id',
          'walikelas@absenta.id',
          'bpbk@absenta.id',
          'kaprog@absenta.id',
          'toolman@absenta.id',
          'gerbang@absenta.id',
          'tu@absenta.id',
          'koperasi.ketua@absenta.id',
        ]
      }
    },
    include: { Role: true }
  });

  for (const u of users) {
    const assigns = await prisma.organizationalAssignment.findMany({
      where: { tenant_id: DEMO_ID, user_id: u.id },
      include: { Position: true }
    });
    const posCodes = assigns.map(a => a.Position?.code).join(', ');
    console.log(`📌 User: ${u.email.padEnd(25)} | Role: ${u.Role?.name.padEnd(10)} | Jabatan Posisi: [${posCodes || 'TIDAK ADA'}]`);
  }
}

checkDemoUserRoles().catch(console.error).finally(() => prisma.$disconnect());
