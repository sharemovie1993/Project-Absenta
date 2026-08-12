import { prisma } from '../utils/prisma';

async function checkExistingRoles() {
  console.log('====================================================');
  console.log('🔍 AUDIT ROLE DATABASE & DEFINISI SEEDER SAAT INI');
  console.log('====================================================');

  const allRolesInDb = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      tenant_id: true,
      description: true,
      is_system: true,
      _count: { select: { users: true } }
    },
    orderBy: [{ tenant_id: 'asc' }, { name: 'asc' }]
  });

  console.log(`📌 Total Record Role di Database: ${allRolesInDb.length}\n`);

  console.log('----------------------------------------------------');
  console.log('ID                                   | NAME                       | TENANT_ID                             | SYSTEM | TOTAL USER');
  console.log('----------------------------------------------------');
  allRolesInDb.forEach((r) => {
    const tId = r.tenant_id ? r.tenant_id : 'NULL (Global)';
    console.log(`${r.id} | ${r.name.padEnd(26)} | ${tId.padEnd(36)} | ${String(r.is_system).padEnd(6)} | ${r._count.users}`);
  });
  console.log('----------------------------------------------------');

  await prisma.$disconnect();
}

checkExistingRoles().catch((err) => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
