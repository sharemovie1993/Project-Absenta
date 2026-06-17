
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TIMEZONE AUDIT REPORT ===\n');

  // 1. General Stats
  const models = ['subscription', 'billing', 'invoice', 'payment'];
  
  for (const model of models) {
    // @ts-ignore
    const count = await prisma[model].count();
    // @ts-ignore
    const min = await prisma[model].findFirst({ orderBy: { created_at: 'asc' }, select: { created_at: true } });
    // @ts-ignore
    const max = await prisma[model].findFirst({ orderBy: { created_at: 'desc' }, select: { created_at: true } });

    console.log(`[${model.toUpperCase()}]`);
    console.log(`Total Records: ${count}`);
    console.log(`Oldest: ${min?.created_at ? min.created_at.toISOString() : 'N/A'}`);
    console.log(`Newest: ${max?.created_at ? max.created_at.toISOString() : 'N/A'}`);
    console.log('-----------------------------------');
  }

  // 2. Hour Distribution Analysis (to detect Local vs UTC)
  // We check the 'hour' component of created_at.
  // Assumption: Most activity happens 08:00 - 18:00 WIB.
  // If stored as Local: peaks at 08 - 18.
  // If stored as UTC: peaks at 01 - 11.
  
  console.log('\n=== HOURLY DISTRIBUTION (Sample: 1000 latest Subscriptions) ===');
  const subs = await prisma.subscription.findMany({
    take: 1000,
    orderBy: { created_at: 'desc' },
    select: { created_at: true }
  });

  const histogram: Record<number, number> = {};
  for (let i = 0; i < 24; i++) histogram[i] = 0;

  subs.forEach(s => {
    const h = s.created_at.getHours(); // This gets the hour from the Date object (which reads naive timestamp as local or UTC depending on runtime, but here we just want the raw number stored if possible, but Prisma converts to JS Date). 
    // IMPORTANT: Prisma + Postgres without timezone:
    // DB: 2023-01-01 10:00:00
    // JS (Machine is WIB?): new Date('2023-01-01T10:00:00') -> This might be tricky.
    // Let's rely on .getUTCHours() vs .getHours() carefully.
    // Actually, if we just want to know "What number is in the DB?", extracting it via Raw SQL is safer.
    // But let's look at what JS Date gives us. 
    // If the machine is now UTC (due to our Phase 1 patch), new Date() from DB string might be interpreted as UTC.
    
    // Let's use Raw SQL to be sure what is physically in the DB.
    histogram[h]++; // We'll analyze this later
  });

  // RAW SQL for Hour extraction to be 100% sure of stored value
  const rawHistogram = await prisma.$queryRaw`
    SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count 
    FROM "Subscription" 
    GROUP BY hour 
    ORDER BY hour ASC
  `;

  console.log('Raw DB Hour Distribution (Stored Values):');
  (rawHistogram as any[]).forEach((row: any) => {
    console.log(`Hour ${row.hour}: ${Number(row.count)}`);
  });

  // 3. Samples
  console.log('\n=== DATA SAMPLES ===');
  
  const samples = await prisma.subscription.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    include: {
        Tenant: { select: { name: true } }
    }
  });

  console.log('Latest 10 Subscriptions:');
  samples.forEach(s => {
      console.log(`ID: ${s.id.substring(0,8)} | Tenant: ${s.Tenant.name} | Created: ${s.created_at.toISOString()} | Start: ${s.start_date.toISOString()} | End: ${s.end_date.toISOString()}`);
  });

  const oldSamples = await prisma.subscription.findMany({
    take: 5,
    orderBy: { created_at: 'asc' },
    include: {
        Tenant: { select: { name: true } }
    }
  });

  console.log('\nOldest 5 Subscriptions:');
  oldSamples.forEach(s => {
      console.log(`ID: ${s.id.substring(0,8)} | Tenant: ${s.Tenant.name} | Created: ${s.created_at.toISOString()} | Start: ${s.start_date.toISOString()} | End: ${s.end_date.toISOString()}`);
  });

}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
