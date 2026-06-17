import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany({
    where: { 
      Plan: { max_user: null },
      status: 'ACTIVE'
    },
    include: { 
      Plan: true,
      Tenant: true
    }
  });

  console.log('--- Tenants with Unlimited (null) Plans ---');
  console.log(JSON.stringify(subs.map(s => ({
      tenant_name: s.Tenant.name,
      plan_name: s.Plan.name,
      service: s.service_code
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
