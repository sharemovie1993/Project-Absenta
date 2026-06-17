import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = '44497b2b-a4f2-42c5-805b-105db58a6415';
  console.log(`Checking tenant: ${tenantId}`);
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });
  
  if (!tenant) {
    console.log('Tenant not found!');
    return;
  }
  
  console.log('--- Tenant Info ---');
  console.log(`Name: ${tenant.name}`);
  console.log(`Domain: ${tenant.domain}`);
  console.log(`Status: ${tenant.status}`);
  console.log(`Absensi Mode: ${tenant.absensi_mode}`);

  const subscriptions = await prisma.subscription.findMany({
    where: { tenant_id: tenantId }
  });
  console.log('\n--- Subscriptions ---');
  for (const s of subscriptions) {
    console.log(`Plan ID: ${s.plan_id} | Code: ${s.service_code} | Status: ${s.status} | Start: ${s.start_date} | End: ${s.end_date}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
