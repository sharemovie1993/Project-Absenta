import { PrismaClient } from '@prisma/client';
import { getTenantCapabilities } from '../utils/tenant-capabilities';

const prisma = new PrismaClient();

async function main() {
  const tenantId = '44497b2b-a4f2-42c5-805b-105db58a6415';
  console.log(`Checking tenant capabilities for: ${tenantId}`);
  
  const caps = await getTenantCapabilities(tenantId);
  console.log('--- Tenant Capabilities ---');
  console.log(JSON.stringify(caps, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
