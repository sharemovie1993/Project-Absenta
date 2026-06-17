import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = '2516520d-4466-4410-a218-06eab518bfd9'; // SMKN 1 Cimahi
  const capabilities = [
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.students.view.history',
    'academic.students.create',
    'academic.students.update',
    'academic.students.delete',
    'academic.students.send.access.token'
  ];

  console.log(`--- Adding Academic Capabilities to ADMIN (SMKN 1 Cimahi) ---`);
  
  const role = await prisma.role.findFirst({
    where: { tenant_id: tenantId, name: 'ADMIN' }
  });

  if (!role) {
    console.error('Role ADMIN not found!');
    return;
  }

  for (const cap of capabilities) {
    const existing = await prisma.roleCapability.findFirst({
      where: { role_id: role.id, capability: cap }
    });

    if (!existing) {
      await prisma.roleCapability.create({
        data: {
          role_id: role.id,
          capability: cap,
          tenant_id: tenantId
        }
      });
      console.log(`+ Added: ${cap}`);
    } else {
      console.log(`Already exists: ${cap}`);
    }
  }

  console.log('--- Done ---');
  await prisma.$disconnect();
}

main().catch(console.error);
