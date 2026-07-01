import { PrismaClient } from '@prisma/client';
import { getMySubscriptionOverviewQuery } from '../src/modules/billing/services/queries/subscription-overview.query';

const prisma = new PrismaClient();

async function run() {
  const tenantId = '1eb0e608-0fb1-47f7-9e9a-61faab6761b5'; // tenant 33
  const overview = await getMySubscriptionOverviewQuery(tenantId);
  console.log('--- Overview for Tenant 33 ---');
  console.log('ID:', overview?.id);
  console.log('Plan:', (overview as any)?.Plan?.name);
  console.log('Subscriptions count:', overview?.subscriptions?.length);
  overview?.subscriptions?.forEach((s: any) => {
    console.log(' - sub.id:', s.id);
    console.log('   plan_id:', s.plan_id);
    console.log('   Plan.name:', (s as any).Plan?.name);
    console.log('   Plan.size_label:', (s as any).Plan?.size_label);
    console.log('   Plan.service_code:', (s as any).Plan?.service_code);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
