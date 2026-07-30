import { prisma } from '../../src/utils/prisma';

async function main() {
  console.log('🔄 Checking Tenants and Subscriptions...');
  const tenants = await prisma.tenant.findMany({});
  console.log(`Found ${tenants.length} tenants:`);
  for (const t of tenants) {
    console.log(` - [${t.id}] name: ${t.name}`);
  }

  const defaultPlan = await prisma.plan.findFirst({});
  if (!defaultPlan) {
    console.error('❌ No default Plan found in database!');
    return;
  }
  console.log(`Using plan [${defaultPlan.id}] (${defaultPlan.name})`);

  const serviceCodes = ['ABSENSI', 'CORE', 'KESISWAAN', 'ACADEMIC', 'HUBIN', 'SARPRAS', 'COOPERATIVE'];
  const farFuture = new Date('2030-12-31T23:59:59.000Z');

  for (const t of tenants) {
    for (const code of serviceCodes) {
      const existing = await prisma.subscription.findFirst({
        where: { tenant_id: t.id, service_code: code }
      });

      if (!existing) {
        await prisma.subscription.create({
          data: {
            tenant_id: t.id,
            plan_id: defaultPlan.id,
            service_code: code,
            status: 'ACTIVE',
            start_date: new Date(),
            end_date: farFuture,
          }
        });
        console.log(`✅ Created ACTIVE subscription [${code}] for tenant ${t.name} (${t.id})`);
      } else if (existing.status !== 'ACTIVE' || !existing.end_date || existing.end_date < new Date()) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            end_date: farFuture,
          }
        });
        console.log(`⚡ Activated subscription [${code}] for tenant ${t.name} (${t.id})`);
      } else {
        console.log(`✔ Subscription [${code}] already ACTIVE for tenant ${t.name} (${t.id})`);
      }
    }
  }

  console.log('🎉 All tenant subscriptions activated successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Error syncing subscriptions:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
