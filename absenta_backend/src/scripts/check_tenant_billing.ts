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
      billing: true,
      invoices: true,
      payments: true,
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
    console.log(`- Billing Records: ${tenant.billing.length}`);
    console.log(`- Invoices: ${tenant.invoices.length}`);
    console.log(`- Payments: ${tenant.payments.length}`);
    
    if (tenant.subscriptions.length > 0) {
      console.log('  SUBSCRIPTIONS:');
      tenant.subscriptions.forEach(s => {
        console.log(`    - [${s.id.substring(0,8)}] Service: ${s.service_code} | Status: ${s.status} | End: ${s.end_date}`);
      });
    }

    if (tenant.billing.length > 0) {
      console.log('  BILLING:');
      tenant.billing.forEach(b => {
        console.log(`    - [${b.id.substring(0,8)}] Amount: ${b.amount} | Status: ${b.status} | Date: ${b.billing_date}`);
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
