import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log(`Listing all active tenants and their billing data...`);

  const tenants = await prisma.tenant.findMany({
    include: {
      subscriptions: true,
    }
  });

  if (tenants.length === 0) {
    console.log('No tenants found.');
    return;
  }

  for (const tenant of tenants) {
    console.log('\n========================================');
    console.log(`TENANT: ${tenant.name} (${tenant.id})`);
    console.log(`- Subscriptions: ${tenant.subscriptions.length}`);
    
    if (tenant.subscriptions.length > 0) {
      console.log('  SUBSCRIPTIONS:');
      tenant.subscriptions.forEach((s: any) => {
        console.log(`    - [${s.id.substring(0,8)}] Service: ${s.service_code} | Status: ${s.status} | End: ${s.end_date}`);
      });
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
