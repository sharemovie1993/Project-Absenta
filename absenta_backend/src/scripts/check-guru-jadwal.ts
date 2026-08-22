import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function checkGuruJadwal() {
  const emails = ['guru.matematika@absenta.id', 'guru.produktif@absenta.id'];
  for (const e of emails) {
    const u = await prisma.user.findFirst({ where: { tenant_id: DEMO_ID, email: e } });
    const g = u ? await prisma.guru.findFirst({ where: { tenant_id: DEMO_ID, user_id: u.id } }) : null;
    const count = g ? await prisma.jadwalKBM.count({ where: { tenant_id: DEMO_ID, guru_id: g.id } }) : 0;
    console.log(`${e.padEnd(30)} | Guru: ${g?.nama_guru} | Jadwal: ${count}`);
  }
}

checkGuruJadwal().catch(console.error).finally(() => prisma.$disconnect());
