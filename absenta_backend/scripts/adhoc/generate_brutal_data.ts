import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function generateBrutalData() {
  const args = process.argv.slice(2);
  const tenantId = args[0];
  const rowCount = parseInt(args[1] || '100000', 10);

  if (!tenantId) {
    console.error('Usage: ts-node generate_brutal_data.ts <tenantId> <rowCount>');
    process.exit(1);
  }

  console.log(`[GENERATOR] Generating ${rowCount} ActivityLog rows for tenant ${tenantId}`);
  
  // Create a user for the logs
  // role_id is required. We must create a role first.
  const role = await prisma.role.create({
      data: {
          tenant_id: tenantId,
          name: 'Brutal Role',
          description: 'Test'
      }
  });

  const user = await prisma.user.create({
      data: {
          tenant_id: tenantId,
          email: `brutal-${randomUUID().substring(0,8)}@test.com`,
          full_name: 'Brutal Tester',
          password: 'pwd',
          role_id: role.id
      }
  });

  const batchSize = 5000;
  let logs: any[] = [];
  
  const startTime = Date.now();

  for (let i = 0; i < rowCount; i++) {
      logs.push({
          tenant_id: tenantId,
          user_id: user.id,
          action: 'BRUTAL_TEST',
          entity: 'STRESS', 
          entity_id: `row-${i}`,
          metadata: JSON.stringify({ index: i, timestamp: Date.now(), ip: '127.0.0.1', ua: 'StressBot/1.0' }),
          // ip_address: '127.0.0.1', // Field doesn't exist
          // user_agent: 'StressBot/1.0' // Field doesn't exist
      });

      if (logs.length >= batchSize) {
          await prisma.activityLog.createMany({ data: logs });
          logs = []; // clear memory
          
          if ((i + 1) % 100000 === 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const rate = (i + 1) / elapsed;
              const mem = process.memoryUsage().heapUsed / 1024 / 1024;
              console.log(`[GENERATOR] Generated ${i + 1} rows. Rate: ${Math.round(rate)} rows/s. Heap: ${Math.round(mem)}MB`);
          }
      }
  }

  if (logs.length > 0) {
      await prisma.activityLog.createMany({ data: logs });
  }

  console.log(`[GENERATOR] Finished generating ${rowCount} rows.`);
}

generateBrutalData()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
