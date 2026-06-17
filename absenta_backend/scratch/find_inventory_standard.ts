import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany({
    where: { 
      Plan: { name: { contains: 'Inventory Sekolah (Standard)' } }
    },
    include: { 
      Plan: true,
      Tenant: true
    }
  });

  console.log('--- Tenants with Inventory Sekolah (Standard) ---');
  console.log(JSON.stringify(subs.map(s => ({
      tenant_id: s.tenant_id,
      tenant_name: s.Tenant.name,
      tenant_domain: s.Tenant.domain,
      status: s.status
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
