import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDemoAccountsInDev() {
  const emails = [
    'admin@absenta.id',
    'kepsek@absenta.id',
    'kurikulum@absenta.id',
    'kesiswaan@absenta.id',
    'sarpras@absenta.id',
    'hubin@absenta.id',
    'bpbk@absenta.id',
    'tu@absenta.id',
    'tu.kepegawaian@absenta.id',
    'tu.persuratan@absenta.id',
    'tu.keuangan@absenta.id',
    'tu.sarpras@absenta.id',
    'koperasi.ketua@absenta.id',
    'koperasi.bendahara@absenta.id',
    'koperasi.sekretaris@absenta.id',
    'koperasi.kasir@absenta.id',
    'koperasi.pengawas@absenta.id',
    'guru.matematika@absenta.id',
    'siswa.1@absenta.id'
  ];

  console.log('🔍 [MEMERIKSA AKUN DEMO KANONIKAL DI 10.10.10.250]...\n');
  const foundUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    include: {
      Tenant: { select: { id: true, name: true } },
      Role: true,
      organizationalAssignments: {
        include: { Position: true }
      }
    }
  });

  console.log(`Ditemukan ${foundUsers.length} dari ${emails.length} akun demo kanonikal:`);
  foundUsers.forEach(u => {
    console.log(`- ${u.email} | ${u.full_name} | Role: ${u.Role?.name} | Tenant: ${u.Tenant?.name} (${u.tenant_id})`);
    console.log(`    Positions: ${u.organizationalAssignments.map(a => a.Position.code).join(', ') || '-'}`);
  });

  const missing = emails.filter(e => !foundUsers.some(u => u.email === e));
  if (missing.length > 0) {
    console.log('\n❌ Akun yang BELUM ADA di 10.10.10.250:');
    missing.forEach(m => console.log(`  - ${m}`));
  } else {
    console.log('\n✅ Semua akun demo kanonikal SUDAH LENGKAP di 10.10.10.250!');
  }
}

inspectDemoAccountsInDev()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
