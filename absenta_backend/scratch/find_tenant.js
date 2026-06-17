
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function find() {
  const t = await prisma.tenant.findFirst({ where: { slug: 'smkn1cimahi' } });
  if (t) {
    console.log('TENANT_ID:', t.id);
  } else {
    console.log('Tenant not found');
  }
}

find().finally(() => prisma.$disconnect());
