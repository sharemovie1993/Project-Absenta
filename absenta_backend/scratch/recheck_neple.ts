import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = '44497b2b-a4f2-42c5-805b-105db58a6415';
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });
  console.log('--- Tenant SMKN 1 PLERED ---');
  console.log(JSON.stringify(tenant, null, 2));

  const subs = await prisma.subscription.findMany({
    where: { tenant_id: tenantId },
    include: { Plan: true }
  });
  console.log('--- Subscriptions ---');
  console.log(JSON.stringify(subs.map(s => ({
    id: s.id,
    plan_name: s.Plan.name,
    absensi_mode: (s.Plan as any).absensi_mode,
    service: s.service_code,
    status: s.status
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
