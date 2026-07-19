import { prisma } from '../src/utils/prisma';
import { generateSessionsForTenantDirect, getTenantLocalTime } from '../src/jobs/attendanceAutoSession.job';
import { systemConfigService } from '../src/modules/system-config/services/system-config.service';

async function main() {
  const activeTenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true }
  });

  console.log(`Found ${activeTenants.length} active tenants.`);

  for (const tenant of activeTenants) {
    const cfg = await systemConfigService.getActive(tenant.id);
    const { dateStr, timeZone } = getTenantLocalTime(cfg?.timezone, new Date());
    console.log(`Generating sessions for tenant: ${tenant.name} (${tenant.id}) on ${dateStr} in ${timeZone}...`);
    const res = await generateSessionsForTenantDirect(tenant.id, dateStr, timeZone);
    console.log(`Result:`, res);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
