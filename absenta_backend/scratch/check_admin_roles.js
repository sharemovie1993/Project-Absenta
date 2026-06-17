const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const roles = await prisma.role.findMany({ where: { name: 'ADMIN' } });
  console.log('--- ADMIN Roles ---');
  for (const role of roles) {
    const permCount = await prisma.rolePermission.count({ where: { role_id: role.id } });
    const hasJurusan = await prisma.rolePermission.findFirst({ 
      where: { role_id: role.id, permission_id: 'academic.structures.view.list' } 
    });
    console.log(`Role ID: ${role.id}, Tenant: ${role.tenant_id}, Perm Count: ${permCount}, Has Jurusan Perm: ${!!hasJurusan}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
