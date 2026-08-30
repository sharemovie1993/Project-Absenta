const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

(async () => {
  const u = await prisma.user.findFirst({
    where: { tenant_id: DEMO_ID, email: 'kurikulum@absenta.id' },
    include: { Role: true }
  });
  if (!u) { console.log('USER NOT FOUND: kurikulum@absenta.id'); process.exit(0); }

  const assigns = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: DEMO_ID, user_id: u.id },
    include: { Position: true }
  });

  const guru = await prisma.guruProfile.findFirst({
    where: { tenant_id: DEMO_ID, user_id: u.id }
  });

  console.log('=== DIAGNOSIS AKUN: kurikulum@absenta.id ===');
  console.log('Role Dasar     :', u.Role?.name || '-');
  console.log('Capabilities   :', Array.isArray(u.capabilities) ? u.capabilities.slice(0,5).join(', ') + '...' : 'N/A (field not in select)');
  console.log('Jabatan (OrganizationalAssignment):');
  if (assigns.length === 0) {
    console.log('  ❌ KOSONG! Tidak ada jabatan yang ter-assign ke user ini.');
  } else {
    assigns.forEach(a => {
      console.log(`  - ${a.Position?.code?.padEnd(20)} | is_active: ${a.is_active}`);
    });
  }
  console.log('Guru Profile   :', guru ? `jabatan_list: [${guru.jabatan_list?.join(', ') || '-'}]` : 'NOT FOUND');

  // Cek posisi KURIKULUM ada di master
  const posKurikulum = await prisma.organizationalPosition.findFirst({
    where: { tenant_id: DEMO_ID, code: 'KURIKULUM' }
  });
  console.log('');
  console.log('=== MASTER POSISI KURIKULUM DI DEMO ===');
  console.log(posKurikulum ? `✅ Ada: id=${posKurikulum.id}, name=${posKurikulum.name}` : '❌ TIDAK ADA posisi KURIKULUM di master!');

  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
