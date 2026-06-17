import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.systemConfig.findMany();
  console.log('Found', configs.length, 'configs');
  configs.forEach(c => {
    console.log(`ID: ${c.id}, Tenant: ${c.tenant_id}, Logo: ${c.logo_url}, Favicon: ${c.favicon_url}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
