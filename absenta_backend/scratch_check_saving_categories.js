const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.savingCategory.findMany({
    include: { Tenant: { select: { name: true } } }
  });
  console.log('All Saving Categories:');
  console.log(categories.map(c => ({ id: c.id, tenant: c.Tenant?.name, tenantId: c.tenantId, name: c.name, code: c.code, isActive: c.isActive })));
}

main().finally(() => prisma.$disconnect());
