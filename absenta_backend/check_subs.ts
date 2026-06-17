
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const tenants = await prisma.tenant.findMany({
    include: {
        subscriptions: {
            include: { Plan: true }
        }
    }
  });
  
  for (const t of tenants) {
      console.log(`Tenant: ${t.name} (${t.id})`);
      console.log(`  Subs Count: ${t.subscriptions.length}`);
      for (const s of t.subscriptions) {
          console.log(`    - Plan: ${s.Plan?.name}, Status: ${s.status}, Features: ${JSON.stringify(s.Plan?.features_json)}`);
      }
  }
}

check().finally(() => prisma.$disconnect());
