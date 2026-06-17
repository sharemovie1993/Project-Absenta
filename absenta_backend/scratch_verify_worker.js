const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const tenantId = '2516520d-4466-4410-a218-06eab518bfd9';
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, absensi_mode: true, status: true }
    });

    console.log('Tenant Config:', JSON.stringify(tenant, null, 2));

    const dateStr = '2026-04-16';
    
    // Check sessions for today
    const sesiGerbangToday = await prisma.sesiGerbang.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z')
        }
      }
    });
    console.log(`\nSesiGerbang for ${dateStr}: ${sesiGerbangToday.length}`);

    // Check sessions for YESTERDAY (Apr 15) to see if they exist
    const sesiGerbangYesterday = await prisma.sesiGerbang.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: {
          gte: new Date('2026-04-15T00:00:00Z'),
          lt: new Date('2026-04-15T23:59:59Z')
        }
      }
    });
    console.log(`SesiGerbang for 2026-04-15: ${sesiGerbangYesterday.length}`);

    // Check Activity Logs for CRON_EXECUTED or AutoSession in the last 12 hours
    const logs = await prisma.activityLog.findMany({
      where: {
        tenant_id: tenantId,
        event_type: 'CRON_EXECUTED',
        created_at: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000)
        }
      },
      take: 5,
      orderBy: { created_at: 'desc' }
    });
    console.log('\nRecent Cron Activity Logs:', JSON.stringify(logs, null, 2));

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
