import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function checkKepsek() {
  console.log('🔍 [MEMERIKSA AKUN KEPALA SEKOLAH DI DEMO & PRODUKSI]...\n');

  // 1. Cek di Produksi
  console.log('=== PRODUKSI ===');
  const prodKepsek = await prisma.organizationalAssignment.findMany({
    where: {
      tenant_id: PROD_ID,
      Position: { code: 'KEPALA_SEKOLAH' }
    },
    include: {
      Position: true,
      User: { select: { id: true, email: true, full_name: true } }
    }
  });
  console.log('Kepsek di Produksi:', prodKepsek);

  // 2. Cek di Demo
  console.log('\n=== DEMO ===');
  const demoKepsekUser = await prisma.user.findFirst({
    where: { tenant_id: DEMO_ID, email: 'kepsek@absenta.id' },
    include: {
      Role: true,
      organizationalAssignments: {
        include: { Position: true }
      },
      Guru: true
    }
  });
  console.log('User Kepsek Demo:', {
    id: demoKepsekUser?.id,
    email: demoKepsekUser?.email,
    full_name: demoKepsekUser?.full_name,
    role: demoKepsekUser?.Role?.name,
    positions: demoKepsekUser?.organizationalAssignments.map(a => a.Position.code),
    guru: demoKepsekUser?.Guru
  });
}

checkKepsek()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
