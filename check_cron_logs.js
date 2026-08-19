const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCronExecution() {
  console.log('=== 1. LOG EKSEKUSI QUEUE JOB (Top 20 Terbaru) ===');
  const jobLogs = await prisma.queueJobLog.findMany({
    where: {
      job_type: { contains: 'attendance', mode: 'insensitive' }
    },
    orderBy: { created_at: 'desc' },
    take: 15
  });
  console.log(JSON.stringify(jobLogs, null, 2));

  console.log('\n=== 2. SYSTEM EVENT LOG TERKAIT ATTENDANCE/CRON ===');
  const eventLogs = await prisma.systemEventLog.findMany({
    where: {
      OR: [
        { category: { contains: 'cron', mode: 'insensitive' } },
        { category: { contains: 'attendance', mode: 'insensitive' } },
        { action: { contains: 'session', mode: 'insensitive' } }
      ]
    },
    orderBy: { created_at: 'desc' },
    take: 15
  });
  console.log(JSON.stringify(eventLogs, null, 2));
}

checkCronExecution().catch(console.error).finally(() => process.exit(0));
