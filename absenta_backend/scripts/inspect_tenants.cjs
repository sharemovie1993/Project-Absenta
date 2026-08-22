const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const tenants = await prisma.tenant.findMany();
  console.log('All Tenants in Database:', tenants.map(t => ({ id: t.id, name: t.name, subdomain: t.subdomain, custom_domain: t.custom_domain })));
}

run().catch(console.error).finally(() => prisma.$disconnect());
