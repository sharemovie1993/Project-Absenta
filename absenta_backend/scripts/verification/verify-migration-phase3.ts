import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- VERIFICATION PHASE 3 ---');

  // 1. Check Column Types
  const tables = ['Subscription', 'Billing', 'Invoice', 'Payment', 'User'];
  const columnsToCheck: Record<string, string[]> = {
    Subscription: ['start_date', 'end_date', 'next_billing_date', 'cancel_date'],
    Billing: ['billing_date'],
    Invoice: ['issue_date', 'due_date', 'paid_at'],
    Payment: ['paid_at', 'expired_at', 'webhook_received_at'],
    User: ['reset_token_expires']
  };

  for (const table of tables) {
    const columns = columnsToCheck[table];
    for (const column of columns) {
      const result: any[] = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = ${column}
      `;
      if (result.length > 0) {
        console.log(`[CHECK] ${table}.${column}: ${result[0].data_type}`);
        if (result[0].data_type !== 'timestamp with time zone') {
            console.error(`[ERROR] ${table}.${column} is NOT timestamptz! It is ${result[0].data_type}`);
        }
      } else {
        console.error(`[ERROR] Column ${table}.${column} not found!`);
      }
    }
  }

  // 2. Data Validation
  console.log('\n--- DATA VALIDATION (Subscription) ---');
  try {
      const subscriptions: any[] = await prisma.$queryRaw`
        SELECT id, end_date, end_date AT TIME ZONE 'UTC' as end_date_utc
        FROM "Subscription"
        LIMIT 3
      `;
      console.table(subscriptions);
  } catch (e) {
      console.error("Error querying subscription:", e);
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
